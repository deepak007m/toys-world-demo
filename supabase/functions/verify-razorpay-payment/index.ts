import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROVIDER = "razorpay";
const RAZORPAY_PAYMENTS_URL = "https://api.razorpay.com/v1/payments";

type PaymentAttempt = {
  id: string;
  order_id: string;
  provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  amount: string | number;
  currency: string;
  status: string;
};

type Order = {
  id: string;
  user_id: string;
  total_amount: string | number;
  currency: string;
  status: string;
  payment_status: string;
};

type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorResponse(message: string, status = 400, code = "PAYMENT_VERIFICATION_FAILED") {
  return jsonResponse({ error: { code, message } }, status);
}

function getBearerToken(req: Request): string | null {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function getRpcErrorCode(message: string, fallback: string): string {
  const match = /^([A-Z][A-Z0-9_]*):/.exec(message);
  return match?.[1] ?? fallback;
}

function parsePaise(amount: string | number): number {
  const value = String(amount).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error("PAYMENT_AMOUNT_MISMATCH");

  const rupees = BigInt(match[1]);
  const paise = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const total = rupees * 100n + paise;

  if (total <= 0n || total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("PAYMENT_AMOUNT_MISMATCH");
  }

  return Number(total);
}

function decodeHex(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function createSignature(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function verifySignature(
  secret: string,
  orderId: string,
  paymentId: string,
  signature: string,
): Promise<boolean> {
  const expected = await createSignature(secret, `${orderId}|${paymentId}`);
  const supplied = decodeHex(signature);
  return supplied !== null && constantTimeEqual(expected, supplied);
}

function parseProviderPayment(body: unknown): RazorpayPayment | null {
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (
    typeof value.id !== "string"
    || typeof value.order_id !== "string"
    || typeof value.amount !== "number"
    || typeof value.currency !== "string"
    || typeof value.status !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    order_id: value.order_id,
    amount: value.amount,
    currency: value.currency,
    status: value.status,
  };
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
    return errorResponse("Authentication is required.", 401, "PAYMENT_NOT_AUTHENTICATED");
  }

  let payload: {
    order_id?: unknown;
    payment_attempt_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_order_id?: unknown;
    razorpay_signature?: unknown;
  };

  try {
    payload = await req.json();
  } catch {
    return errorResponse("The request body is invalid.", 400, "INVALID_REQUEST");
  }

  const orderId = typeof payload.order_id === "string" ? payload.order_id.trim() : "";
  const paymentAttemptId = typeof payload.payment_attempt_id === "string"
    ? payload.payment_attempt_id.trim()
    : "";
  const razorpayPaymentId = typeof payload.razorpay_payment_id === "string"
    ? payload.razorpay_payment_id.trim()
    : "";
  const razorpayOrderId = typeof payload.razorpay_order_id === "string"
    ? payload.razorpay_order_id.trim()
    : "";
  const razorpaySignature = typeof payload.razorpay_signature === "string"
    ? payload.razorpay_signature.trim()
    : "";

  if (!orderId || !paymentAttemptId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return errorResponse("The payment verification fields are required.", 400, "INVALID_REQUEST");
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
    return errorResponse("Authentication is required.", 401, "PAYMENT_NOT_AUTHENTICATED");
  }

  const { data: attemptData, error: attemptError } = await supabase
    .from("payment_attempts")
    .select("id, order_id, provider, provider_order_id, provider_payment_id, amount, currency, status")
    .eq("id", paymentAttemptId)
    .eq("order_id", orderId)
    .maybeSingle();

  if (attemptError || !attemptData) {
    return errorResponse("The payment attempt could not be found.", 404, "PAYMENT_ATTEMPT_NOT_FOUND");
  }

  const paymentAttempt = attemptData as PaymentAttempt;
  if (paymentAttempt.provider !== PROVIDER) {
    return errorResponse("The payment attempt does not belong to Razorpay.", 409, "PAYMENT_ATTEMPT_MISMATCH");
  }

  if (paymentAttempt.provider_order_id !== razorpayOrderId) {
    return errorResponse("The Razorpay order does not match the payment attempt.", 400, "PAYMENT_ORDER_MISMATCH");
  }

  if (paymentAttempt.status !== "PENDING" && paymentAttempt.status !== "SUCCEEDED") {
    return errorResponse("The payment attempt is not available for verification.", 409, "PAYMENT_ATTEMPT_MISMATCH");
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, user_id, total_amount, currency, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !orderData) {
    return errorResponse("The order could not be found.", 404, "ORDER_NOT_FOUND");
  }

  const order = orderData as Order;
  if (order.user_id !== userData.user.id) {
    return errorResponse("The order could not be found.", 404, "ORDER_NOT_FOUND");
  }

  const attemptAmountPaise = (() => {
    try {
      return parsePaise(paymentAttempt.amount);
    } catch {
      return null;
    }
  })();
  const orderAmountPaise = (() => {
    try {
      return parsePaise(order.total_amount);
    } catch {
      return null;
    }
  })();

  if (
    attemptAmountPaise === null
    || orderAmountPaise === null
    || attemptAmountPaise !== orderAmountPaise
    || paymentAttempt.currency !== order.currency
  ) {
    return errorResponse("The payment amount or currency does not match the order.", 400, "PAYMENT_AMOUNT_MISMATCH");
  }

  if (!(await verifySignature(razorpayKeySecret, razorpayOrderId, razorpayPaymentId, razorpaySignature))) {
    return errorResponse("The payment signature is invalid.", 400, "PAYMENT_SIGNATURE_INVALID");
  }

  let response: Response;
  try {
    response = await fetch(
      `${RAZORPAY_PAYMENTS_URL}/${encodeURIComponent(razorpayPaymentId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
      },
    );
  } catch (error) {
    console.error("Razorpay payment lookup failed:", error);
    return errorResponse("The payment could not be verified right now. Please try again.", 503, "PAYMENT_PROVIDER_UNAVAILABLE");
  }

  let providerBody: unknown = null;
  try {
    providerBody = await response.json();
  } catch {
    console.error("Razorpay payment lookup returned a non-JSON response.");
  }

  if (response.status === 404) {
    return errorResponse("The payment could not be found.", 400, "PAYMENT_NOT_FOUND");
  }

  if (!response.ok) {
    console.error("Razorpay payment lookup failed:", response.status);
    return errorResponse("The payment could not be verified right now. Please try again.", 502, "PAYMENT_PROVIDER_ERROR");
  }

  const payment = parseProviderPayment(providerBody);
  if (!payment || payment.id !== razorpayPaymentId) {
    return errorResponse("The payment response is invalid.", 400, "PAYMENT_NOT_FOUND");
  }

  if (payment.order_id !== razorpayOrderId) {
    return errorResponse("The payment belongs to a different Razorpay order.", 400, "PAYMENT_ORDER_MISMATCH");
  }

  if (payment.amount !== attemptAmountPaise) {
    return errorResponse("The payment amount does not match the order.", 400, "PAYMENT_AMOUNT_MISMATCH");
  }

  if (payment.currency !== order.currency) {
    return errorResponse("The payment currency does not match the order.", 400, "PAYMENT_CURRENCY_MISMATCH");
  }

  if (payment.status !== "captured") {
    return errorResponse("The payment has not been captured.", 400, "PAYMENT_NOT_CAPTURED");
  }

  const { data: completedData, error: completionError } = await supabase.rpc("complete_razorpay_payment", {
    p_order_id: orderId,
    p_payment_attempt_id: paymentAttemptId,
    p_provider_payment_id: razorpayPaymentId,
  });

  if (completionError || !completedData?.[0]) {
    const message = completionError?.message ?? "The payment could not be finalized.";
    console.error("complete_razorpay_payment failed:", message);
    return errorResponse(
      "The payment was verified but could not be finalized. Please contact support.",
      409,
      getRpcErrorCode(message, "PAYMENT_FINALIZATION_FAILED"),
    );
  }

  return jsonResponse({
    order_id: completedData[0].order_id,
    order_number: completedData[0].order_number,
    status: completedData[0].order_status,
    payment_status: completedData[0].payment_status,
    payment_attempt_id: completedData[0].payment_attempt_id,
    payment_attempt_status: completedData[0].payment_attempt_status,
    provider_payment_id: completedData[0].provider_payment_id,
    paid_at: completedData[0].paid_at,
  });
});
