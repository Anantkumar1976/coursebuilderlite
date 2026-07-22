import { NextResponse } from "next/server";

import { fetchPaypalAccessToken, getPaypalBaseUrl } from "@/lib/paypal/api";
import { getPlanKeyFromPaypalPlanId } from "@/lib/paypal/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PaypalWebhookResource = {
  id?: string;
  status?: string;
  plan_id?: string;
};

type PaypalWebhookEvent = {
  event_type?: string;
  resource?: PaypalWebhookResource | string;
};

type PaypalVerifyWebhookResponse = {
  verification_status?: "SUCCESS" | "FAILURE";
};

function getWebhookId() {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId) {
    throw new Error("Missing PAYPAL_WEBHOOK_ID.");
  }
  return webhookId;
}

function getSubscriptionResource(
  event: PaypalWebhookEvent,
): PaypalWebhookResource | null {
  const raw = event.resource;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as PaypalWebhookResource;
  }
  return null;
}

function mapPaypalStatusToInternal(status: string | undefined) {
  const value = (status ?? "").toUpperCase();
  if (value === "ACTIVE") return "active";
  if (value === "CANCELLED") return "cancelled";
  if (value === "SUSPENDED") return "suspended";
  if (value === "EXPIRED") return "expired";
  if (value === "APPROVAL_PENDING") return "pending_activation";
  return "pending_activation";
}

async function verifyWebhookSignature(
  request: Request,
  rawBody: string,
) {
  const authAlgo = request.headers.get("paypal-auth-algo");
  const certUrl = request.headers.get("paypal-cert-url");
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    return false;
  }

  const token = await fetchPaypalAccessToken();
  const response = await fetch(
    `${getPaypalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: getWebhookId(),
        webhook_event: JSON.parse(rawBody),
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.warn("[paypal-webhook] verify HTTP", response.status, detail.slice(0, 500));
    return false;
  }
  const verification = (await response.json()) as PaypalVerifyWebhookResponse;
  if (verification.verification_status !== "SUCCESS") {
    console.warn("[paypal-webhook] verify not SUCCESS", verification);
  }
  return verification.verification_status === "SUCCESS";
}

export function GET() {
  return new NextResponse(
    "PayPal billing webhooks: POST JSON events to this URL. Configure PAYPAL_WEBHOOK_ID and matching PAYPAL_MODE (sandbox|live).",
    { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let event: PaypalWebhookEvent;
    try {
      event = JSON.parse(rawBody) as PaypalWebhookEvent;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    let isValid: boolean;
    try {
      isValid = await verifyWebhookSignature(request, rawBody);
    } catch (verifyErr) {
      console.error("[paypal-webhook] verify threw", verifyErr);
      return NextResponse.json(
        {
          error:
            verifyErr instanceof Error ? verifyErr.message : "Webhook verification failed.",
        },
        { status: 503 },
      );
    }
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const eventType = event.event_type ?? "";
    const resource = getSubscriptionResource(event);
    const subscriptionId = resource?.id;
    if (!subscriptionId) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    if (
      eventType !== "BILLING.SUBSCRIPTION.ACTIVATED" &&
      eventType !== "BILLING.SUBSCRIPTION.CANCELLED" &&
      eventType !== "BILLING.SUBSCRIPTION.SUSPENDED" &&
      eventType !== "BILLING.SUBSCRIPTION.EXPIRED"
    ) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const supabase = createAdminClient();
    const status = mapPaypalStatusToInternal(resource?.status ?? undefined);
    const nowIso = new Date().toISOString();
    const resolvedPlanKey = getPlanKeyFromPaypalPlanId(resource?.plan_id);
    const updatePayload = {
      status,
      last_event_type: eventType,
      plan_key: resolvedPlanKey ?? null,
      activated_at: status === "active" ? nowIso : null,
      cancelled_at:
        status === "cancelled" || status === "expired" ? nowIso : null,
    };

    const { error } = await supabase
      .from("billing_subscriptions")
      .upsert(
        {
          subscription_id: subscriptionId,
          provider: "paypal",
          ...updatePayload,
        },
        { onConflict: "subscription_id" },
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected webhook error." },
      { status: 500 },
    );
  }
}
