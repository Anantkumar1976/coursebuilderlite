type PaypalTokenResponse = {
  access_token?: string;
};

export function getPaypalBaseUrl() {
  const mode = process.env.PAYPAL_MODE?.toLowerCase();
  return mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function getPaypalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_SECRET.");
  }
  return { clientId, secret };
}

export async function fetchPaypalAccessToken() {
  const { clientId, secret } = getPaypalCredentials();
  const tokenResponse = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    throw new Error(`PayPal token request failed (${tokenResponse.status}).`);
  }

  const tokenData = (await tokenResponse.json()) as PaypalTokenResponse;
  if (!tokenData.access_token) {
    throw new Error("PayPal token response did not include access_token.");
  }
  return tokenData.access_token;
}
