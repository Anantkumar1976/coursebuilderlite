import Image from "next/image";
import Link from "next/link";

import { ContactForm } from "@/components/marketing/contact-form";
import {
  CONTACT_EMAIL,
  HEADER_PRODUCT_LABEL,
  PRODUCT_LOGO_SRC,
  PRODUCT_NAME,
} from "@/lib/branding/site";

const FEATURE_PILLARS = [
  {
    title: "Fast authoring, no clutter",
    description:
      "Build structured learning content quickly with a template-led builder and clean workflows.",
  },
  {
    title: "Modern learner experience",
    description:
      "Deliver in open, linear, or website/manual mode with responsive layouts and themed branding.",
  },
  {
    title: "Assessment + completion controls",
    description:
      "Track attempts, enforce pass thresholds, issue completion pages, and print branded certificates.",
  },
  {
    title: "Export-ready outputs",
    description:
      "Ship SCORM 1.2, SCORM 2004, or standalone HTML packages for broad LMS compatibility.",
  },
] as const;

const TEMPLATE_METRICS = [
  { label: "Core templates", value: "15" },
  { label: "Template variations", value: "23+" },
  { label: "Content modes available", value: "38+" },
  { label: "Course capabilities", value: "20+" },
] as const;

const OPEN_SOURCE_COMPARISON = [
  {
    strong: "Cleaner modern UX",
    detail: "Faster onboarding and less authoring friction for business teams.",
  },
  {
    strong: "Manual/website mode",
    detail: "Single-page reading experiences are uncommon in many open source stacks.",
  },
  {
    strong: "Flexible export mix",
    detail: "SCORM 1.2 + 2004 + standalone HTML out of one workflow.",
  },
  {
    strong: "Focused build path",
    detail: "Opinionated defaults help teams launch courses faster.",
  },
] as const;

const PRICING = [
  {
    plan: "Starter",
    key: "starter",
    price: "$29/mo",
    subtitle: "For solo creators and small teams",
    points: [
      "Up to 2 authors",
      "10 exports/month",
      "Template-driven course builder",
      "Email support",
    ],
  },
  {
    plan: "Pro",
    key: "pro",
    price: "$99/mo",
    subtitle: "For growing enablement teams",
    points: [
      "Up to 5 authors",
      "50 exports/month",
      "SCORM 1.2 + 2004 + standalone",
      "Priority support",
    ],
  },
] as const;

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-[#f6f9fc] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-[#0f2745]"
            aria-label={PRODUCT_NAME}
          >
            <Image
              src={PRODUCT_LOGO_SRC}
              alt=""
              width={140}
              height={40}
              className="h-8 w-auto shrink-0 object-contain object-left"
              priority
            />
            <span className="hidden min-w-0 truncate text-sm font-semibold tracking-tight sm:inline">
              {HEADER_PRODUCT_LABEL}
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm text-slate-600" aria-label="Primary">
            <a href="#capabilities" className="transition-colors hover:text-[#0f2745]">
              Capabilities
            </a>
            <a href="#comparison" className="transition-colors hover:text-[#0f2745]">
              Why us
            </a>
            <a href="#pricing" className="transition-colors hover:text-[#0f2745]">
              Pricing
            </a>
            <a href="#contact" className="transition-colors hover:text-[#0f2745]">
              Contact
            </a>
            <Link
              href="/login"
              className="font-semibold text-[#0f2745] transition-colors hover:text-[#12335b]"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section id="get-started" className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-18">
          <p className="text-sm font-medium text-teal-700">Empowering Digital Learning Growth</p>
          <h1 id="hero-heading" className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-[#0f2745] sm:text-5xl">
            Accelerate course creation with modern templates, assessments, and export-ready delivery.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            {PRODUCT_NAME} helps L&D teams, consultants, and content creators build structured learning
            experiences quickly — from authoring to branded learner delivery and SCORM packaging.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-[#0f2745] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#12335b]"
            >
              Get started
            </Link>
            <a
              href="#contact"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50"
            >
              Talk to sales
            </a>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <img
              src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80"
              alt="Team planning digital learning strategy"
              className="h-56 w-full rounded-xl object-cover shadow-sm"
            />
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
              alt="Product and content collaboration workspace"
              className="h-56 w-full rounded-xl object-cover shadow-sm"
            />
          </div>
        </section>

        <section id="capabilities" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f2745]">Platform capabilities</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Purpose-built for organizations that need practical course authoring with clean learner
              experiences, reliable exports, and predictable implementation speed.
            </p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {FEATURE_PILLARS.map((item) => (
                <li
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-[#f8fbff] p-5"
                >
                  <h3 className="text-base font-semibold text-[#0f2745]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10 grid gap-3 sm:grid-cols-4">
              {TEMPLATE_METRICS.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-slate-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold text-[#0f2745]">{metric.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="comparison" className="border-t border-slate-200 bg-[#f3f8ff] py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f2745]">
              How we compare with open-source authoring stacks
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              We focus on speed to launch, cleaner experiences, and practical controls. It is a strong fit
              for teams that value simplicity over plugin-heavy complexity.
            </p>
            <ul className="mt-8 space-y-3">
              {OPEN_SOURCE_COMPARISON.map((item) => (
                <li key={item.strong} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="font-semibold text-[#0f2745]">{item.strong}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="pricing" className="border-t border-slate-200 bg-white py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#0f2745]">Subscription model</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Built on a seat + capability model so teams can start lean and scale with governance and support.
            </p>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {PRICING.map((tier) => (
                <article key={tier.plan} className="rounded-xl border border-slate-200 bg-[#f8fbff] p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{tier.plan}</p>
                  <p className="mt-2 text-3xl font-bold text-[#0f2745]">{tier.price}</p>
                  <p className="mt-1 text-sm text-slate-600">{tier.subtitle}</p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {tier.points.map((point) => (
                      <li key={point}>• {point}</li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?plan=${tier.key}`}
                    className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-[#0f2745] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#12335b]"
                  >
                    Choose {tier.plan}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="border-t border-slate-200 bg-[#eaf3fb] py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-teal-700">Contact us</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0f2745]">
                Let&apos;s discuss your use case
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Share your requirements and our team will respond with a suitable plan. We handle sales
                enquiries, licensing questions, feature requests, bug reports, and general product queries.
                You can also email{" "}
                <a
                  className="font-medium text-[#0f2745] underline decoration-[#FF8C55] underline-offset-2 hover:text-[#12335b]"
                  href={`mailto:${CONTACT_EMAIL}`}
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"
                alt="Discussion around product planning"
                className="mt-6 h-52 w-full rounded-xl object-cover shadow-sm"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <p>© {new Date().getFullYear()} {PRODUCT_NAME}</p>
          <p className="text-slate-400">
            Auth, player data, and inquiries powered by Supabase.
          </p>
        </div>
      </footer>
    </div>
  );
}
