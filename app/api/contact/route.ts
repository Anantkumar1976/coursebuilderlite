import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const INQUIRY_TYPES = new Set([
  "sales",
  "licensing",
  "feature_request",
  "bug_report",
  "other",
]);

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: unknown;
      email?: unknown;
      company?: unknown;
      inquiryType?: unknown;
      message?: unknown;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const company =
      typeof body.company === "string" ? body.company.trim() : null;
    const inquiryType =
      typeof body.inquiryType === "string" ? body.inquiryType.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!name || !email || !inquiryType || !message) {
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 },
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }
    if (!INQUIRY_TYPES.has(inquiryType)) {
      return NextResponse.json(
        { error: "Please choose a valid inquiry type." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("contact_inquiries" as never)
      .insert({
        name,
        email,
        company,
        inquiry_type: inquiryType,
        message,
      } as never);
    if (error) {
      return NextResponse.json(
        {
          error:
            "Could not submit your inquiry right now. Please try again shortly.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }
}
