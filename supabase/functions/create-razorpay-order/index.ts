import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROVIDER = "razorpay";
const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(message: string, status = 400, code = "PAYMENT_PROVIDER_ERROR") {
  return jsonResponse({ error: { code, message } }, status);
}

function parsePaise(amount: string | number): number {
  const value = String(amount).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);

  if (!match) {
    throw new Error("INVALID_ORDER_AMOUNT");
  }

  const rupees = BigInt(match[1]);
  const paisePart = (match[2] ?? "").padEnd(2, "0");
  const paise = BigInt(paisePart || "0");
  const total = rupees * 100n + paise;

  if (total <= 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("INVALID_ORDER_AMOUNT");
  }

  return Number(total);
}

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Only POST requests are supported.", 405, "METHOD_NOT_ALLOWED");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

  if (!supabaseUrl || !supabaseAnonKey || !razorpayKeyId || !razorpayKeySecret) {
    console.error("Missing required server configuration.");
    return errorResponse("Payment service is not configured.", 503, "PAYMENT_PROVIDER_NOT_CONFIGURED");
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return errorResponse("Authentication is required.", 401, "AUTH_REQUIRED");
  }

  let payload: { order_id?: unknown; idempotency_key?: unknown };

  try {
    payload = await req.json();
  } catch {
    return errorResponse("The request body is invalid.", 400, "INVALID_REQUEST");
  }

  const orderId = typeof payload.order_id === "string" ? payload.order_id.trim() : "";
  const idempotencyKey = typeof payload.idempotency_key === "string"
    ? payload.idempotency_key.trim()
    : "";

  if (!orderId || !idempotencyKey) {
    return errorResponse("order_id and idempotency_key are required.", 400, "INVALID_REQUEST");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return errorResponse("Authentication is required.", 401, "AUTH_REQUIRED");
  }

  let paymentAttempt;

  const { data: attemptData, error: attemptError } = await supabase.rpc("create_payment_attempt", {
    p_order_id: orderId,
    p_idempotency_key: idempotencyKey,
    p_provider: PROVIDER,
  });

  if (attemptError || !attemptData?.[0]) {
    const message = attemptError?.message ?? "The payment attempt could not be created.";
    console.error("create_payment_attempt failed:", message);
    return errorResponse(message, 400, "PAYMENT_ATTEMPT_FAILED");
  }

  paymentAttempt = attemptData[0];

  if (paymentAttempt.provider !== PROVIDER) {
    return errorResponse("The payment provider does not match the payment attempt.", 409, "PROVIDER_MISMATCH");
  }

  if (paymentAttempt.provider_order_id) {
    return jsonResponse({
      payment_attempt_id: paymentAttempt.id,
      razorpay_order_id: paymentAttempt.provider_order_id,
      amount: paymentAttempt.amount,
      currency: paymentAttempt.currency,
      key_id: razorpayKeyId,
    });
  }

  let amountPaise: number;

  try {
    amountPaise = parsePaise(paymentAttempt.amount);
  } catch {
    return errorResponse("The order amount is invalid.", 400, "INVALID_ORDER_AMOUNT");
  }

  const receipt = `TW-${paymentAttempt.id}`;
  const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

  let razorpayResponse: Response;

  try {
    razorpayResponse = await fetch(RAZORPAY_ORDERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${razorpayAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: paymentAttempt.currency,
        receipt,
      }),
    });
  } catch (error) {
    console.error("Razorpay request failed:", error);
    return errorResponse("Payment provider could not be reached. Please try again.", 502, "RAZORPAY_UNAVAILABLE");
  }

  let razorpayBody: Record<string, unknown> = {};

  try {
    razorpayBody = await razorpayResponse.json();
  } catch {
    console.error("Razorpay returned a non-JSON response.");
  }

  if (!razorpayResponse.ok) {
    console.error("Razorpay order creation failed:", razorpayResponse.status, razorpayBody);
    return errorResponse("Payment provider rejected the order request. Please try again.", 502, "RAZORPAY_ORDER_FAILED");
  }

  const razorpayOrderId = typeof razorpayBody.id === "string" ? razorpayBody.id : "";
  const razorpayAmount = typeof razorpayBody.amount === "number" ? razorpayBody.amount : null;
  const razorpayCurrency = typeof razorpayBody.currency === "string" ? razorpayBody.currency : "";

  if (!razorpayOrderId || razorpayAmount !== amountPaise || razorpayCurrency !== paymentAttempt.currency) {
    console.error("Razorpay returned an unexpected order payload.");
    return errorResponse("Payment provider returned an invalid order response.", 502, "RAZORPAY_ORDER_INVALID");
  }

  const { data: attachedData, error: attachError } = await supabase.rpc("attach_payment_provider_order", {
    p_payment_attempt_id: paymentAttempt.id,
    p_provider: PROVIDER,
    p_provider_order_id: razorpayOrderId,
  });

  if (attachError || !attachedData?.[0]) {
    console.error("Failed to attach Razorpay order:", attachError?.message ?? "No attachment returned");
    return errorResponse(
      "The payment order was created but could not be finalized locally. Please contact support before retrying.",
      503,
      "PAYMENT_ORDER_ATTACH_FAILED",
    );
  }

  const attachedAttempt = attachedData[0];

  return jsonResponse({
    payment_attempt_id: attachedAttempt.id,
    razorpay_order_id: attachedAttempt.provider_order_id,
    amount: attachedAttempt.amount,
    currency: attachedAttempt.currency,
    key_id: razorpayKeyId,
  });
});
