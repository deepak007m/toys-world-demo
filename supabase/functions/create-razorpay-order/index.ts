import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PROVIDER = "razorpay";
const RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

type PaymentAttempt = {
  id: string;
  provider: string;
  provider_order_id: string | null;
  amount: string | number;
  currency: string;
  status: string;
};

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
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

function getRpcErrorCode(message: string, fallback: string): string {
  const match = /^([A-Z][A-Z0-9_]*):/.exec(message);
  return match?.[1] ?? fallback;
}

function getRazorpayOrder(body: unknown, expectedReceipt: string, expectedAmount: number, expectedCurrency: string): RazorpayOrder | null {
  if (!body || typeof body !== "object") return null;

  const candidate = body as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : "";
  const amount = typeof candidate.amount === "number" ? candidate.amount : null;
  const currency = typeof candidate.currency === "string" ? candidate.currency : "";
  const receipt = typeof candidate.receipt === "string" ? candidate.receipt : "";

  if (
    !id
    || amount !== expectedAmount
    || currency !== expectedCurrency
    || receipt !== expectedReceipt
  ) {
    return null;
  }

  return { id, amount, currency, receipt };
}

async function findRazorpayOrderByReceipt(
  razorpayAuth: string,
  receipt: string,
  expectedAmount: number,
  expectedCurrency: string,
): Promise<{ order: RazorpayOrder | null; providerUnavailable: boolean }> {
  const url = `${RAZORPAY_ORDERS_URL}?count=100&receipt=${encodeURIComponent(receipt)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${razorpayAuth}`,
      },
    });
  } catch (error) {
    console.error("Razorpay reconciliation request failed:", error);
    return { order: null, providerUnavailable: true };
  }

  let body: Record<string, unknown> = {};
  try {
    body = await response.json();
  } catch {
    console.error("Razorpay reconciliation returned a non-JSON response.");
    return { order: null, providerUnavailable: true };
  }

  if (!response.ok) {
    console.error("Razorpay reconciliation failed:", response.status, body);
    return { order: null, providerUnavailable: true };
  }

  const items = Array.isArray(body.items) ? body.items : [];
  const matches = items
    .map(item => getRazorpayOrder(item, receipt, expectedAmount, expectedCurrency))
    .filter((item): item is RazorpayOrder => item !== null);

  if (matches.length > 1) {
    console.error("Multiple Razorpay orders matched the deterministic receipt.");
    return { order: null, providerUnavailable: true };
  }

  return { order: matches[0] ?? null, providerUnavailable: false };
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

  const { data: attemptData, error: attemptError } = await supabase.rpc("create_payment_attempt", {
    p_order_id: orderId,
    p_idempotency_key: idempotencyKey,
    p_provider: PROVIDER,
  });

  if (attemptError || !attemptData?.[0]) {
    const message = attemptError?.message ?? "The payment attempt could not be created.";
    console.error("create_payment_attempt failed:", message);
    return errorResponse(message, 400, getRpcErrorCode(message, "PAYMENT_ATTEMPT_FAILED"));
  }

  const paymentAttempt = attemptData[0] as PaymentAttempt;

  if (paymentAttempt.provider !== PROVIDER) {
    return errorResponse("The payment provider does not match the payment attempt.", 409, "PROVIDER_MISMATCH");
  }

  const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
  const amountPaise = (() => {
    try {
      return parsePaise(paymentAttempt.amount);
    } catch {
      return null;
    }
  })();

  if (amountPaise === null) {
    return errorResponse("The order amount is invalid.", 400, "INVALID_ORDER_AMOUNT");
  }

  if (!paymentAttempt.currency.trim()) {
    return errorResponse("The order currency is invalid.", 400, "INVALID_ORDER_CURRENCY");
  }

  const receipt = `TW-${paymentAttempt.id}`;

  if (paymentAttempt.provider_order_id) {
    return jsonResponse({
      payment_attempt_id: paymentAttempt.id,
      razorpay_order_id: paymentAttempt.provider_order_id,
      amount: paymentAttempt.amount,
      currency: paymentAttempt.currency,
      key_id: razorpayKeyId,
    });
  }

  const reconcile = async (attempt: PaymentAttempt) => {
    const result = await findRazorpayOrderByReceipt(
      razorpayAuth,
      receipt,
      amountPaise,
      attempt.currency,
    );

    if (!result.order) {
      return result;
    }

    const { data: attachedData, error: attachError } = await supabase.rpc("attach_payment_provider_order", {
      p_payment_attempt_id: attempt.id,
      p_provider: PROVIDER,
      p_provider_order_id: result.order.id,
    });

    if (attachError || !attachedData?.[0]) {
      console.error("Failed to attach reconciled Razorpay order:", attachError?.message ?? "No attachment returned");
      return { order: result.order, providerUnavailable: true };
    }

    return { order: result.order, providerUnavailable: false };
  };

  const { data: preparedData, error: prepareError } = await supabase.rpc("prepare_payment_provider_order", {
    p_payment_attempt_id: paymentAttempt.id,
    p_provider: PROVIDER,
  });

  const prepareErrorMessage = prepareError?.message ?? "";
  const preparationNeedsReconciliation = prepareErrorMessage.startsWith("PAYMENT_PROVIDER_ORDER_PENDING:");

  if (preparationNeedsReconciliation) {
    const reconciliation = await reconcile(paymentAttempt);

    if (reconciliation.order && !reconciliation.providerUnavailable) {
      return jsonResponse({
        payment_attempt_id: paymentAttempt.id,
        razorpay_order_id: reconciliation.order.id,
        amount: paymentAttempt.amount,
        currency: paymentAttempt.currency,
        key_id: razorpayKeyId,
        reconciled: true,
      });
    }

    return errorResponse(
      "The payment provider order could not be reconciled safely. Do not retry by creating another provider order; please retry reconciliation or contact support.",
      503,
      "PAYMENT_ORDER_UNRECONCILED",
    );
  }

  if (prepareError || !preparedData?.[0]) {
    const message = prepareError?.message ?? "The payment attempt could not be prepared.";
    console.error("prepare_payment_provider_order failed:", message);
    return errorResponse(message, 409, getRpcErrorCode(message, "PAYMENT_PROVIDER_PREPARE_FAILED"));
  }

  const preparedAttempt = preparedData[0] as PaymentAttempt;

  if (preparedAttempt.provider_order_id) {
    return jsonResponse({
      payment_attempt_id: preparedAttempt.id,
      razorpay_order_id: preparedAttempt.provider_order_id,
      amount: preparedAttempt.amount,
      currency: preparedAttempt.currency,
      key_id: razorpayKeyId,
    });
  }

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
        currency: preparedAttempt.currency,
        receipt,
      }),
    });
  } catch (error) {
    console.error("Razorpay request failed:", error);
    const reconciliation = await reconcile(preparedAttempt);

    if (reconciliation.order && !reconciliation.providerUnavailable) {
      return jsonResponse({
        payment_attempt_id: preparedAttempt.id,
        razorpay_order_id: reconciliation.order.id,
        amount: preparedAttempt.amount,
        currency: preparedAttempt.currency,
        key_id: razorpayKeyId,
        reconciled: true,
      });
    }

    return errorResponse(
      "The provider request outcome is unknown. The payment attempt remains pending for safe reconciliation; do not create another provider order.",
      503,
      "PAYMENT_ORDER_UNRECONCILED",
    );
  }

  let razorpayBody: Record<string, unknown> = {};

  try {
    razorpayBody = await razorpayResponse.json();
  } catch {
    console.error("Razorpay returned a non-JSON response.");
  }

  if (!razorpayResponse.ok) {
    console.error("Razorpay order creation failed:", razorpayResponse.status, razorpayBody);
    const { error: failError } = await supabase.rpc("fail_payment_provider_order", {
      p_payment_attempt_id: preparedAttempt.id,
      p_provider: PROVIDER,
      p_failure_code: `RAZORPAY_HTTP_${razorpayResponse.status}`,
      p_failure_message: "Razorpay rejected the provider-order request.",
    });

    if (failError) {
      console.error("Failed to mark rejected Razorpay order attempt failed:", failError.message);
      return errorResponse(
        "Razorpay rejected the order, but the payment attempt could not be finalized locally. Please contact support before retrying.",
        503,
        "PAYMENT_ATTEMPT_RECOVERY_FAILED",
      );
    }

    return errorResponse("Payment provider rejected the order request. Please try again.", 502, "RAZORPAY_ORDER_FAILED");
  }

  const razorpayOrder = getRazorpayOrder(
    razorpayBody,
    receipt,
    amountPaise,
    preparedAttempt.currency,
  );

  if (!razorpayOrder) {
    console.error("Razorpay returned an unexpected order payload.");
    const reconciliation = await reconcile(preparedAttempt);

    if (reconciliation.order && !reconciliation.providerUnavailable) {
      return jsonResponse({
        payment_attempt_id: preparedAttempt.id,
        razorpay_order_id: reconciliation.order.id,
        amount: preparedAttempt.amount,
        currency: preparedAttempt.currency,
        key_id: razorpayKeyId,
        reconciled: true,
      });
    }

    return errorResponse(
      "The provider returned an ambiguous order response. The payment attempt remains pending for safe reconciliation; do not create another provider order.",
      503,
      "PAYMENT_ORDER_UNRECONCILED",
    );
  }

  const { data: attachedData, error: attachError } = await supabase.rpc("attach_payment_provider_order", {
    p_payment_attempt_id: preparedAttempt.id,
    p_provider: PROVIDER,
    p_provider_order_id: razorpayOrder.id,
  });

  if (attachError || !attachedData?.[0]) {
    console.error("Failed to attach Razorpay order:", attachError?.message ?? "No attachment returned");
    const reconciliation = await reconcile(preparedAttempt);

    if (reconciliation.order && !reconciliation.providerUnavailable) {
      return jsonResponse({
        payment_attempt_id: preparedAttempt.id,
        razorpay_order_id: reconciliation.order.id,
        amount: preparedAttempt.amount,
        currency: preparedAttempt.currency,
        key_id: razorpayKeyId,
        reconciled: true,
      });
    }

    return errorResponse(
      "The provider order was created but could not be reconciled locally. Do not create another provider order; please retry reconciliation or contact support.",
      503,
      "PAYMENT_ORDER_UNRECONCILED",
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
