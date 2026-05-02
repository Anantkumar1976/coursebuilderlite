import { NextResponse } from "next/server";

import { fetchPaypalAccessToken, getPaypalBaseUrl } from "@/lib/paypal/api";
import { getPlanKeyFromPaypalPlanId } from "@/lib/paypal/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

type PaypalWebhookEvent = {
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    plan_id?: string;
  };
};

type PaypalVerifyWebhookResponse = {
  verification_status?: "SUCCESS" | "FAILURE";
};

function getWebhookId() {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    throw new Error("Missing PAYPAL_WEBHOOK_ID.");
  }
  return webhookId;
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
    return false;
  }
  const verification = (await response.json()) as PaypalVerifyWebhookResponse;
  return verification.verification_status === "SUCCESS";
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = JSON.parse(rawBody) as PaypalWebhookEvent;
    const isValid = await verifyWebhookSignature(request, rawBody);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const eventType = event.event_type ?? "";
    const subscriptionId = event.resource?.id;
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
    const status = mapPaypalStatusToInternal(event.resource?.status ?? undefined);
    const nowIso = new Date().toISOString();
    const resolvedPlanKey = getPlanKeyFromPaypalPlanId(event.resource?.plan_id);
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
