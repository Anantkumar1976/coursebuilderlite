"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type RefObject,
} from "react";

import { PageAudioTranscriptButton } from "./page-audio-transcript-button";

function waitForElementLoad(el: Element): Promise<void> {
  if (el instanceof HTMLImageElement) {
    if (el.complete) return Promise.resolve();
    return new Promise((resolve) => {
      el.addEventListener("load", () => resolve(), { once: true });
      el.addEventListener("error", () => resolve(), { once: true });
    });
  }

  if (el instanceof HTMLIFrameElement) {
    return new Promise((resolve) => {
      const done = () => resolve();
      el.addEventListener("load", done, { once: true });
      window.setTimeout(done, 4000);
    });
  }

  if (el instanceof HTMLVideoElement) {
    if (el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const done = () => resolve();
      el.addEventListener("loadeddata", done, { once: true });
      el.addEventListener("error", done, { once: true });
      window.setTimeout(done, 4000);
    });
  }

  return Promise.resolve();
}

async function waitForPageAssets(container: HTMLElement | null): Promise<void> {
  if (!container) return;
  const media = container.querySelectorAll("img, iframe, video");
  await Promise.all([...media].map((el) => waitForElementLoad(el)));
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
      <path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />
    </svg>
  );
}

type Props = {
  src: string;
  pageKey: string;
  contentRootRef: RefObject<HTMLElement | null>;
  /** When false, playback pauses (e.g. section scrolled out of view). */
  active?: boolean;
  transcript?: string;
  pageTitle?: string;
  highlightColor?: string;
};

/** Compact narration controls: play/pause, progress, optional transcript. */
export function PageAudioPanel({
  src,
  pageKey,
  contentRootRef,
  active = true,
  transcript = "",
  pageTitle,
  highlightColor = "#18181b",
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const syncTime = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onPlay() {
      setIsPlaying(true);
    }
    function onPause() {
      setIsPlaying(false);
    }
    function onEnded() {
      setIsPlaying(false);
      setCurrentTime(audio?.duration || 0);
    }

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", syncTime);
    audio.addEventListener("durationchange", syncTime);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", syncTime);
      audio.removeEventListener("durationchange", syncTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [syncTime, src, pageKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !active) {
      audio?.pause();
      return;
    }

    let cancelled = false;

    void (async () => {
      await waitForPageAssets(contentRootRef.current);
      if (cancelled || !active) return;
      try {
        await audio.play();
      } catch {
        // Autoplay may be blocked until the learner interacts with the page.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, src, pageKey, contentRootRef]);

  useEffect(() => {
    if (active) return;
    audioRef.current?.pause();
  }, [active]);

  function togglePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  }

  function handleSeek(e: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Number(e.target.value);
    audio.currentTime = next;
    setCurrentTime(next);
  }

  const hasTranscript = transcript.trim().length > 0;
  const maxDuration = duration > 0 ? duration : 0;
  const progressPercent =
    maxDuration > 0 ? Math.round((currentTime / maxDuration) * 100) : 0;

  return (
    <div
      className="flex w-[min(100%,11rem)] shrink-0 items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 shadow-sm sm:w-48 dark:border-zinc-700 dark:bg-zinc-900/60"
      aria-label="Page narration"
    >
      <button
        type="button"
        onClick={togglePlayPause}
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: highlightColor }}
        aria-label={isPlaying ? "Pause narration" : "Play narration"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      <div className="flex h-7 min-w-0 flex-1 items-center">
        <input
          type="range"
          min={0}
          max={maxDuration || 1}
          step={0.1}
          value={maxDuration > 0 ? currentTime : 0}
          onChange={handleSeek}
          disabled={maxDuration <= 0}
          className="m-0 block h-7 w-full cursor-pointer appearance-none bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 dark:[&::-moz-range-track]:bg-zinc-700 dark:[&::-webkit-slider-runnable-track]:bg-zinc-700 [&::-moz-range-thumb]:h-2.5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-200 [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-zinc-200 [&::-webkit-slider-thumb]:mt-[-3px] [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          style={{ accentColor: highlightColor }}
          aria-label="Narration progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
        />
      </div>

      {hasTranscript ? (
        <PageAudioTranscriptButton
          transcript={transcript}
          pageTitle={pageTitle}
          variant="icon"
          compact
        />
      ) : null}

      <audio ref={audioRef} src={src} preload="auto" className="sr-only" />
    </div>
  );
}
