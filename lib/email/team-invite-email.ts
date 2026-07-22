import { getSiteUrl } from "@/lib/auth/site-url";
import { CONTACT_EMAIL, PRODUCT_NAME } from "@/lib/branding/site";

import { sendEmail } from "./resend";

type TeamInviteEmailInput = {
  inviteeEmail: string;
  inviterEmail: string;
  planLabel: string;
  token: string;
  expiresAt: string;
};

function formatExpiryDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    dateStyle: "long",
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendTeamInviteEmail(input: TeamInviteEmailInput) {
  const siteUrl = getSiteUrl();
  const signupUrl = `${siteUrl}/signup?invite_token=${encodeURIComponent(input.token)}`;
  const acceptUrl = `${siteUrl}/team/accept/${encodeURIComponent(input.token)}`;
  const loginUrl = `${siteUrl}/login?next=${encodeURIComponent(`/team/accept/${input.token}`)}`;
  const expiryLabel = formatExpiryDate(input.expiresAt);
  const inviter = input.inviterEmail.trim() || "A teammate";

  const subject = `You're invited to ${PRODUCT_NAME}`;

  const text = [
    `${inviter} invited you to join their ${PRODUCT_NAME} team (${input.planLabel} plan).`,
    "",
    "Create your account:",
    signupUrl,
    "",
    "Already have an account? Sign in, then accept the invite:",
    loginUrl,
    "",
    "Or open this link after signing in:",
    acceptUrl,
    "",
    `This invite expires on ${expiryLabel}.`,
    "",
    `Questions? Contact ${CONTACT_EMAIL}`,
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.5;color:#18181b;max-width:560px">
      <p style="font-size:18px;font-weight:600;margin:0 0 12px">${escapeHtml(PRODUCT_NAME)} team invite</p>
      <p style="margin:0 0 16px">
        <strong>${escapeHtml(inviter)}</strong> invited you to join their team on the
        <strong>${escapeHtml(input.planLabel)}</strong> plan.
      </p>
      <p style="margin:0 0 20px">
        <a href="${signupUrl}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
          Create account &amp; join team
        </a>
      </p>
      <p style="margin:0 0 8px;font-size:14px;color:#52525b">
        Already have an account?
        <a href="${loginUrl}" style="color:#18181b">Sign in and accept the invite</a>.
      </p>
      <p style="margin:0 0 20px;font-size:13px;color:#71717a;word-break:break-all">
        Accept link (after sign-in): ${escapeHtml(acceptUrl)}
      </p>
      <p style="margin:0;font-size:13px;color:#71717a">
        Expires ${escapeHtml(expiryLabel)}. Questions? ${escapeHtml(CONTACT_EMAIL)}
      </p>
    </div>
  `.trim();

  return sendEmail({
    to: input.inviteeEmail,
    subject,
    html,
    text,
  });
}
