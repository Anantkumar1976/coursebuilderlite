type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function getEmailFromAddress() {
  const configured = process.env.RESEND_FROM?.trim();
  if (configured) return configured;
  return "Course Builder Light <onboarding@resend.dev>";
}

export async function sendEmail(input: SendEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false as const, skipped: true as const, error: "Email is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
    };
    return {
      ok: false as const,
      skipped: false as const,
      error: payload.message ?? `Email provider returned ${response.status}.`,
    };
  }

  return { ok: true as const };
}
