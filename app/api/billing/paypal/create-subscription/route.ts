import { NextResponse } from "next/server";

import { fetchPaypalAccessToken, getPaypalBaseUrl } from "@/lib/paypal/api";
import {
  getPaypalPlanId,
  isPaypalPlanKey,
  type PaypalPlanKey,
} from "@/lib/paypal/subscriptions";

type PaypalCreateSubscriptionResponse = {
  id?: string;
  links?: Array<{ rel?: string; href?: string }>;
  name?: string;
  message?: string;
  details?: unknown;
  debug_id?: string;
};

function summarizePaypalApiError(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const name = typeof o.name === "string" ? o.name : "";
  const message = typeof o.message === "string" ? o.message : "";
  const details = o.details;
  let detailSuffix = "";
  if (Array.isArray(details) && details[0] && typeof details[0] === "object") {
    const d0 = details[0] as Record<string, unknown>;
    const desc = typeof d0.description === "string" ? d0.description : "";
    const issue = typeof d0.issue === "string" ? d0.issue : "";
    if (desc) detailSuffix = ` ${desc}`;
    else if (issue) detailSuffix = ` (${issue})`;
  }
  const core = [message, name].filter(Boolean).join(" · ");
  if (!core && !detailSuffix.trim()) return null;
  return `${core}${detailSuffix}`.trim();
}

function getRequestOrigin(request: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (site) return site;
  const vercel = process.env.VERCEL_URL?.trim().replace(/\/$/, "");
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "");
    return `https://${host}`;
  }
  return new URL(request.url).origin;
}

function getSignupReturnUrls(origin: string, plan: PaypalPlanKey) {
  const returnUrl = new URL("/signup", origin);
  returnUrl.searchParams.set("paypal", "approved");
  returnUrl.searchParams.set("plan", plan);

  const cancelUrl = new URL("/signup", origin);
  cancelUrl.searchParams.set("paypal", "cancelled");
  cancelUrl.searchParams.set("plan", plan);

  return { returnUrl: returnUrl.toString(), cancelUrl: cancelUrl.toString() };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { plan?: string };
    if (!body.plan || !isPaypalPlanKey(body.plan)) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const plan = body.plan;
    const planId = getPaypalPlanId(plan);
    if (!planId) {
      return NextResponse.json(
        { error: `Missing ${plan.toUpperCase()} PayPal plan environment variable.` },
        { status: 500 },
      );
    }

    const token = await fetchPaypalAccessToken();
    const { returnUrl, cancelUrl } = getSignupReturnUrls(getRequestOrigin(request), plan);
    const createResponse = await fetch(`${getPaypalBaseUrl()}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        application_context: {
          brand_name: "CourseBuilderLite",
          user_action: "SUBSCRIBE_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
      cache: "no-store",
    });

    const subscriptionData =
      (await createResponse.json().catch(() => ({}))) as PaypalCreateSubscriptionResponse;
    if (!createResponse.ok) {
      const paypalHint = summarizePaypalApiError(subscriptionData);
      console.warn(
        "[paypal create-subscription]",
        createResponse.status,
        paypalHint ?? subscriptionData,
      );
      return NextResponse.json(
        {
          error: paypalHint
            ? `PayPal could not start the subscription: ${paypalHint}`
            : "Unable to create PayPal subscription.",
          details: subscriptionData,
        },
        { status: 502 },
      );
    }

    const approvalLink = subscriptionData.links?.find((link) => link.rel === "approve")?.href;
    if (!approvalLink || !subscriptionData.id) {
      return NextResponse.json(
        { error: "PayPal did not return an approval URL." },
        { status: 502 },
      );
    }

    const signupUrl = new URL(returnUrl);
    signupUrl.searchParams.set("subscription_id", subscriptionData.id);

    return NextResponse.json({
      approvalUrl: approvalLink,
      subscriptionId: subscriptionData.id,
      signupUrl: signupUrl.toString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 },
    );
  }
}
