export const PAYPAL_PLAN_CONFIG = {
  starter: {
    label: "Starter",
    envKey: "PAYPAL_PLAN_ID_STARTER",
    priceLabel: "$29/mo",
    authorsLimit: 2,
    monthlyExportsLimit: 10,
  },
  pro: {
    label: "Pro",
    envKey: "PAYPAL_PLAN_ID_PRO",
    priceLabel: "$99/mo",
    authorsLimit: 5,
    monthlyExportsLimit: 50,
  },
} as const;

export type PaypalPlanKey = keyof typeof PAYPAL_PLAN_CONFIG;

export function isPaypalPlanKey(value: string): value is PaypalPlanKey {
  return Object.hasOwn(PAYPAL_PLAN_CONFIG, value);
}

export function getPaypalPlanId(plan: PaypalPlanKey): string | null {
  const envName = PAYPAL_PLAN_CONFIG[plan].envKey;
  const raw = process.env[envName];
  const trimmed = raw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function getPlanKeyFromPaypalPlanId(
  paypalPlanId: string | null | undefined,
): PaypalPlanKey | null {
  if (!paypalPlanId) return null;
  const entry = (Object.keys(PAYPAL_PLAN_CONFIG) as PaypalPlanKey[]).find(
    (key) => getPaypalPlanId(key) === paypalPlanId,
  );
  return entry ?? null;
}
