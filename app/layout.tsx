import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

// Body / UI font — modern neo-grotesque, in the spirit of Graphik.
const interSans = Inter({
  variable: "--font-sans-body",
  subsets: ["latin"],
  display: "swap",
});

// Display / headings font — warm rounded geometric, in the spirit of GT Walsheim.
const jakartaDisplay = Plus_Jakarta_Sans({
  variable: "--font-sans-display",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Akhila Course Builder Light",
  description:
    "Akhila Course Builder Light — author responsive courses with structured templates, assessments, and SCORM-ready export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interSans.variable} ${jakartaDisplay.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: extensions (e.g. ColorZilla) may inject attrs on <body> */}
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
