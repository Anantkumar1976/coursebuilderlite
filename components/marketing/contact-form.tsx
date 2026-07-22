"use client";

import { useEffect, useState } from "react";

import { CONTACT_EMAIL } from "@/lib/branding/site";

type InquiryType =
  | "sales"
  | "licensing"
  | "custom_lms"
  | "feature_request"
  | "bug_report"
  | "other";

type FormState = {
  name: string;
  email: string;
  company: string;
  inquiryType: InquiryType;
  message: string;
};

const INQUIRY_TYPE_VALUES: readonly InquiryType[] = [
  "sales",
  "licensing",
  "custom_lms",
  "feature_request",
  "bug_report",
  "other",
];

function isInquiryType(v: string): v is InquiryType {
  return (INQUIRY_TYPE_VALUES as readonly string[]).includes(v);
}

/** Reads ?enquiry= (or ?inquiry=) from either the query string or the hash. */
function readInquiryTypeFromLocation(): InquiryType | null {
  if (typeof window === "undefined") return null;
  const candidates: string[] = [];
  const search = new URLSearchParams(window.location.search);
  const fromSearch = search.get("enquiry") ?? search.get("inquiry");
  if (fromSearch) candidates.push(fromSearch);

  // Also support "#contact?enquiry=custom_lms" (used from same-page hash links).
  const hash = window.location.hash;
  const q = hash.indexOf("?");
  if (q !== -1) {
    const hashParams = new URLSearchParams(hash.slice(q + 1));
    const fromHash =
      hashParams.get("enquiry") ?? hashParams.get("inquiry");
    if (fromHash) candidates.push(fromHash);
  }

  for (const c of candidates) {
    if (isInquiryType(c)) return c;
  }
  return null;
}

const INITIAL: FormState = {
  name: "",
  email: "",
  company: "",
  inquiryType: "sales",
  message: "",
};

export function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  // Prefill inquiry type from ?enquiry= (search or hash) on initial mount,
  // and scroll the contact section into view when a deep link lands here.
  useEffect(() => {
    const prefill = readInquiryTypeFromLocation();
    if (!prefill) return;
    setForm((s) => ({ ...s, inquiryType: prefill }));
    const section = document.getElementById("contact");
    if (section) {
      requestAnimationFrame(() =>
        section.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }, []);

  // Same-page CTAs (e.g. Custom LMS banner) dispatch this event to preselect a type.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === "string" && isInquiryType(detail)) {
        setForm((s) => ({ ...s, inquiryType: detail }));
      }
    }
    window.addEventListener("cbl-set-inquiry", handler);
    return () => window.removeEventListener("cbl-set-inquiry", handler);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus({
          ok: false,
          text: json.error ?? "Could not submit your inquiry.",
        });
        return;
      }
      setStatus({
        ok: true,
        text: "Thanks — we received your message and will get back soon.",
      });
      setForm(INITIAL);
    } catch {
      setStatus({
        ok: false,
        text: "Network issue while submitting. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-800">Name *</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-teal-500/60 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-800">Email *</span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-teal-500/60 focus:ring-2"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-800">Company</span>
          <input
            type="text"
            value={form.company}
            onChange={(e) =>
              setForm((s) => ({ ...s, company: e.target.value }))
            }
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-teal-500/60 focus:ring-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-800">
            Inquiry type *
          </span>
          <select
            required
            value={form.inquiryType}
            onChange={(e) => {
              const next = e.target.value;
              if (isInquiryType(next)) {
                setForm((s) => ({ ...s, inquiryType: next }));
              }
            }}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-teal-500/60 focus:ring-2"
          >
            <option value="sales">Sales enquiry</option>
            <option value="licensing">Licensing enquiry</option>
            <option value="custom_lms">Custom LMS</option>
            <option value="feature_request">Feature request</option>
            <option value="bug_report">Bug report</option>
            <option value="other">Other query</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-800">Message *</span>
        <textarea
          required
          rows={6}
          value={form.message}
          onChange={(e) => setForm((s) => ({ ...s, message: e.target.value }))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-teal-500/60 focus:ring-2"
          placeholder="Tell us about your team, use-case, and timeline."
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0f2745] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#12335b] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit enquiry"}
        </button>
        {status ? (
          <p
            className={`text-sm ${status.ok ? "text-emerald-700" : "text-red-600"}`}
            role={status.ok ? "status" : "alert"}
          >
            {status.text}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        Prefer email?{" "}
        <a
          className="font-medium text-[#0f2745] underline decoration-[#FF8C55] underline-offset-2 hover:text-[#12335b]"
          href={`mailto:${CONTACT_EMAIL}`}
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  );
}
