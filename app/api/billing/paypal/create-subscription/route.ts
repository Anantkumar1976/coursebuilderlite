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
};

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
    const { returnUrl, cancelUrl } = getSignupReturnUrls(new URL(request.url).origin, plan);
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
      return NextResponse.json(
        { error: "Unable to create PayPal subscription.", details: subscriptionData },
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
