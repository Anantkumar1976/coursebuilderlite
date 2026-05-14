"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { acceptTeamInvite } from "@/lib/actions/team";
import {
  PAYPAL_PLAN_CONFIG,
  type PaypalPlanKey,
} from "@/lib/paypal/subscriptions";
import { createClient } from "@/lib/supabase/client";

export type SignupTeamInvite = {
  token: string;
  email_normalized: string;
  plan_key: string;
  authors_limit: number;
  monthly_exports_limit: number;
  subscription_id: string;
};

export function SignupForm({ invite }: { invite?: SignupTeamInvite | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);
  const [plan, setPlan] = useState<PaypalPlanKey>("starter");
  const invitePlanConfig =
    invite && Object.hasOwn(PAYPAL_PLAN_CONFIG, invite.plan_key)
      ? PAYPAL_PLAN_CONFIG[invite.plan_key as PaypalPlanKey]
      : null;
  const [paypalPending, setPaypalPending] = useState(false);
  const [paypalApproved, setPaypalApproved] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (invite) return;
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const selectedPlan = params.get("plan");
    const paypalState = params.get("paypal");
    const paypalSubscriptionId = params.get("subscription_id");
    if (selectedPlan && Object.hasOwn(PAYPAL_PLAN_CONFIG, selectedPlan)) {
      setPlan(selectedPlan as PaypalPlanKey);
    }
    if (paypalState === "approved" && paypalSubscriptionId) {
      setPaypalApproved(true);
      setSubscriptionId(paypalSubscriptionId);
      setInfo(
        "PayPal subscription approved. Complete account creation below to activate access.",
      );
      return;
    }
    if (paypalState === "cancelled") {
      setInfo("PayPal checkout was cancelled. You can try again anytime.");
    }
  }, [invite]);

  async function handlePaypalSubscribe() {
    setError(null);
    setInfo(null);
    setPaypalPending(true);
    try {
      const response = await fetch("/api/billing/paypal/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        approvalUrl?: string;
        error?: string;
      };
      if (!response.ok || !data.approvalUrl) {
        setError(data.error ?? "Could not start PayPal subscription.");
        setPaypalPending(false);
        return;
      }
      window.location.href = data.approvalUrl;
    } catch {
      setError("Could not connect to PayPal. Please try again.");
      setPaypalPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (accountCreated) return;
    setError(null);
    setInfo(null);
    if (!invite && (!paypalApproved || !subscriptionId)) {
      setError("Please approve your PayPal subscription before creating an account.");
      return;
    }
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const email = (fd.get("email") as string)?.trim();
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;
    if (!email || !password) {
      setError("Enter email and password.");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setPending(false);
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for the password.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    if (invite) {
      if (email.trim().toLowerCase() !== invite.email_normalized) {
        setError("Use the same email address as on the invite.");
        setPending(false);
        return;
      }
    }

    const selectedPlan = invite
      ? (Object.hasOwn(PAYPAL_PLAN_CONFIG, invite.plan_key)
          ? PAYPAL_PLAN_CONFIG[invite.plan_key as PaypalPlanKey]
          : null)
      : PAYPAL_PLAN_CONFIG[plan];

    const meta = invite
      ? {
          subscription_provider: "paypal",
          subscription_plan: invite.plan_key,
          subscription_plan_label: selectedPlan?.label ?? invite.plan_key,
          subscription_price_monthly: selectedPlan?.priceLabel ?? "",
          authors_limit: invite.authors_limit,
          monthly_exports_limit: invite.monthly_exports_limit,
          paypal_subscription_id: invite.subscription_id,
          subscription_status: "pending_activation" as const,
        }
      : {
          subscription_provider: "paypal",
          subscription_plan: plan,
          subscription_plan_label: PAYPAL_PLAN_CONFIG[plan].label,
          subscription_price_monthly: PAYPAL_PLAN_CONFIG[plan].priceLabel,
          authors_limit: PAYPAL_PLAN_CONFIG[plan].authorsLimit,
          monthly_exports_limit: PAYPAL_PLAN_CONFIG[plan].monthlyExportsLimit,
          paypal_subscription_id: subscriptionId!,
          subscription_status: "pending_activation" as const,
        };

    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
      },
    });
    setPending(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    if (data.session) {
      if (invite) {
        try {
          await acceptTeamInvite(invite.token);
        } catch (acceptErr) {
          setError(
            acceptErr instanceof Error
              ? acceptErr.message
              : "Account created but joining the team failed. Open your invite link again.",
          );
          return;
        }
      }
      router.push("/courses");
      router.refresh();
      return;
    }
    setAccountCreated(true);
    setInfo(
      "Check your email to confirm your account, then sign in. (You can disable email confirmation in Supabase Auth settings for local development.)",
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-sm flex-col gap-4"
    >
      {invite ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
          <p className="font-medium">Team invite</p>
          <p className="mt-1 text-xs opacity-90">
            Plan: {invitePlanConfig?.label ?? invite.plan_key} · {invite.authors_limit} authors ·{" "}
            {invite.monthly_exports_limit} exports/month (shared subscription).
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="plan" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Plan
            </label>
            <select
              id="plan"
              name="plan"
              value={plan}
              disabled={accountCreated}
              onChange={(event) => {
                setPlan(event.target.value as PaypalPlanKey);
                setPaypalApproved(false);
                setSubscriptionId(null);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {Object.entries(PAYPAL_PLAN_CONFIG).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label} ({item.priceLabel}) - {item.authorsLimit} authors,{" "}
                  {item.monthlyExportsLimit} exports/month
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={paypalPending || accountCreated}
            onClick={handlePaypalSubscribe}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
          >
            {paypalPending ? "Opening PayPal…" : "Subscribe with PayPal"}
          </button>
          {paypalApproved ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
              Subscription approved for {PAYPAL_PLAN_CONFIG[plan].label}.
            </p>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
              Step 1: subscribe with PayPal. Step 2: create your account.
            </p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Includes {PAYPAL_PLAN_CONFIG[plan].authorsLimit} authors and{" "}
            {PAYPAL_PLAN_CONFIG[plan].monthlyExportsLimit} exports/month.
          </p>
        </>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          readOnly={Boolean(invite) || accountCreated}
          defaultValue={invite?.email_normalized ?? undefined}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 read-only:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:read-only:bg-zinc-900"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          readOnly={accountCreated}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirm"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          readOnly={accountCreated}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
          {info}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || accountCreated || (!invite && !paypalApproved)}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Creating account…" : accountCreated ? "Account created" : "Create account"}
      </button>
      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
