"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { PageAudioPanel } from "./page-audio-panel";

type PageAudioContextValue = {
  src: string | null;
  pageKey: string;
  active: boolean;
  contentRootRef: RefObject<HTMLElement | null>;
  transcript: string;
  pageTitle?: string;
  highlightColor?: string;
};

const PageAudioContext = createContext<PageAudioContextValue | null>(null);

function usePageAudioContext() {
  return useContext(PageAudioContext);
}

type Props = {
  src: string | null;
  pageKey: string;
  playWhenVisible?: boolean;
  transcript?: string;
  pageTitle?: string;
  highlightColor?: string;
  children: ReactNode;
};

/**
 * Wraps page content and provides optional narration controls via PageAudioControls.
 * In website (scroll) mode, audio auto-plays when the section enters the viewport.
 */
export function PageAudioHost({
  src,
  pageKey,
  playWhenVisible = false,
  transcript = "",
  pageTitle,
  highlightColor,
  children,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!playWhenVisible || !src) return;
    const el = hostRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [playWhenVisible, src, pageKey]);

  const active = Boolean(src) && (playWhenVisible ? visible : true);

  return (
    <PageAudioContext.Provider
      value={{
        src,
        pageKey,
        active,
        contentRootRef: contentRef,
        transcript,
        pageTitle,
        highlightColor,
      }}
    >
      <div ref={hostRef}>
        <div ref={contentRef}>{children}</div>
      </div>
    </PageAudioContext.Provider>
  );
}

/** Compact narration bar — place beside the page title in the header. */
export function PageAudioControls() {
  const ctx = usePageAudioContext();
  if (!ctx?.src) return null;

  return (
    <PageAudioPanel
      key={ctx.pageKey}
      src={ctx.src}
      pageKey={ctx.pageKey}
      contentRootRef={ctx.contentRootRef}
      active={ctx.active}
      transcript={ctx.transcript}
      pageTitle={ctx.pageTitle}
      highlightColor={ctx.highlightColor}
    />
  );
}
