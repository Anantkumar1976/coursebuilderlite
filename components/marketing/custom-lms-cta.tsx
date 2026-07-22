"use client";

/** Same-page CTA that prefills the ContactForm inquiry type and scrolls to it. */
export function CustomLmsCta() {
  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("cbl-set-inquiry", { detail: "custom_lms" }),
    );
    const section = document.getElementById("contact");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = "contact";
    }
  }

  return (
    <a
      href="#contact"
      onClick={handleClick}
      className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-white px-7 text-base font-semibold text-[#0f2745] shadow-sm transition-colors hover:bg-slate-100"
    >
      Enquire about Custom LMS
    </a>
  );
}
