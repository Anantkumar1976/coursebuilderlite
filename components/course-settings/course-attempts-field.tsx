"use client";

import { useId, useState } from "react";

type Props = {
  initialLimit: number | null;
};

export function CourseAttemptsField({ initialLimit }: Props) {
  const initialMode: "unlimited" | "count" =
    initialLimit == null ? "unlimited" : "count";
  const [mode, setMode] = useState<"unlimited" | "count">(initialMode);
  const [count, setCount] = useState<string>(
    initialLimit == null ? "3" : String(initialLimit),
  );

  const unlimitedId = useId();
  const countId = useId();
  const countInputId = useId();

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Course attempts
      </legend>
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Limit how many times a learner can start this course. After the last
        attempt is used the course is locked with a clear message on the launch
        screen.
      </p>

      <label
        htmlFor={unlimitedId}
        className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
      >
        <input
          id={unlimitedId}
          type="radio"
          name="attempts_mode"
          value="unlimited"
          checked={mode === "unlimited"}
          onChange={() => setMode("unlimited")}
          className="h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
        />
        Unlimited attempts (default)
      </label>

      <label
        htmlFor={countId}
        className="flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
      >
        <input
          id={countId}
          type="radio"
          name="attempts_mode"
          value="count"
          checked={mode === "count"}
          onChange={() => setMode("count")}
          className="h-4 w-4 accent-zinc-900 dark:accent-zinc-50"
        />
        Limit to
        <input
          id={countInputId}
          type="number"
          name="attempts_limit"
          min={1}
          step={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          onFocus={() => setMode("count")}
          disabled={mode !== "count"}
          className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          aria-label="Maximum number of attempts"
        />
        attempt{count === "1" ? "" : "s"}
      </label>
    </fieldset>
  );
}
