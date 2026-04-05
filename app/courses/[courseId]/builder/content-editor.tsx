"use client";

import { TEMPLATE_LABELS, type PageContentV1 } from "@/lib/page-builder";

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
}

function labelClass() {
  return "text-xs font-medium text-zinc-600 dark:text-zinc-400";
}

type Props = {
  content: PageContentV1;
  onChange: (next: PageContentV1) => void;
};

export function ContentEditor({ content, onChange }: Props) {
  const template = content.template;
  const badge = TEMPLATE_LABELS[template];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
          Template
        </span>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {badge}
        </span>
      </div>

      {template === "text" ? (
        <div>
          <label className={labelClass()} htmlFor="body-text">
            Body
          </label>
          <textarea
            id="body-text"
            rows={10}
            className={fieldClass()}
            value={content.body}
            onChange={(e) =>
              onChange({ ...content, body: e.target.value })
            }
          />
        </div>
      ) : null}

      {template === "text_image" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="ti-body">
              Body
            </label>
            <textarea
              id="ti-body"
              rows={6}
              className={fieldClass()}
              value={content.body}
              onChange={(e) =>
                onChange({ ...content, body: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="ti-url">
              Image URL
            </label>
            <input
              id="ti-url"
              type="url"
              className={fieldClass()}
              value={content.imageUrl}
              onChange={(e) =>
                onChange({ ...content, imageUrl: e.target.value })
              }
              placeholder="https://"
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="ti-alt">
              Alt text
            </label>
            <input
              id="ti-alt"
              type="text"
              className={fieldClass()}
              value={content.imageAlt}
              onChange={(e) =>
                onChange({ ...content, imageAlt: e.target.value })
              }
            />
          </div>
        </div>
      ) : null}

      {template === "text_video" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="tv-body">
              Body
            </label>
            <textarea
              id="tv-body"
              rows={6}
              className={fieldClass()}
              value={content.body}
              onChange={(e) =>
                onChange({ ...content, body: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="tv-url">
              Video URL
            </label>
            <input
              id="tv-url"
              type="url"
              className={fieldClass()}
              value={content.videoUrl}
              onChange={(e) =>
                onChange({ ...content, videoUrl: e.target.value })
              }
              placeholder="https://youtube.com/... or hosted file"
            />
          </div>
        </div>
      ) : null}

      {template === "two_column" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass()} htmlFor="tc-left">
              Left column
            </label>
            <textarea
              id="tc-left"
              rows={10}
              className={fieldClass()}
              value={content.left}
              onChange={(e) =>
                onChange({ ...content, left: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="tc-right">
              Right column
            </label>
            <textarea
              id="tc-right"
              rows={10}
              className={fieldClass()}
              value={content.right}
              onChange={(e) =>
                onChange({ ...content, right: e.target.value })
              }
            />
          </div>
        </div>
      ) : null}

      {template === "tabs" ? (
        <div className="space-y-4">
          {content.tabs.map((tab, idx) => (
            <div
              key={tab.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  className={`${fieldClass()} max-w-xs`}
                  value={tab.label}
                  onChange={(e) => {
                    const tabs = [...content.tabs];
                    tabs[idx] = { ...tab, label: e.target.value };
                    onChange({ ...content, tabs });
                  }}
                  aria-label={`Tab ${idx + 1} label`}
                />
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => {
                    if (content.tabs.length <= 1) return;
                    const tabs = content.tabs.filter((t) => t.id !== tab.id);
                    onChange({ ...content, tabs });
                  }}
                >
                  Remove tab
                </button>
              </div>
              <textarea
                rows={4}
                className={fieldClass()}
                value={tab.body}
                onChange={(e) => {
                  const tabs = [...content.tabs];
                  tabs[idx] = { ...tab, body: e.target.value };
                  onChange({ ...content, tabs });
                }}
                aria-label={`Tab ${idx + 1} content`}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            onClick={() => {
              const id =
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `t-${Date.now()}`;
              onChange({
                ...content,
                tabs: [
                  ...content.tabs,
                  { id, label: `Tab ${content.tabs.length + 1}`, body: "" },
                ],
              });
            }}
          >
            + Add tab
          </button>
        </div>
      ) : null}

      {template === "accordion" ? (
        <div className="space-y-4">
          {content.items.map((item, idx) => (
            <div
              key={item.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  className={`${fieldClass()} max-w-md`}
                  value={item.title}
                  onChange={(e) => {
                    const items = [...content.items];
                    items[idx] = { ...item, title: e.target.value };
                    onChange({ ...content, items });
                  }}
                  aria-label={`Section ${idx + 1} title`}
                />
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => {
                    if (content.items.length <= 1) return;
                    const items = content.items.filter((i) => i.id !== item.id);
                    onChange({ ...content, items });
                  }}
                >
                  Remove
                </button>
              </div>
              <textarea
                rows={4}
                className={fieldClass()}
                value={item.body}
                onChange={(e) => {
                  const items = [...content.items];
                  items[idx] = { ...item, body: e.target.value };
                  onChange({ ...content, items });
                }}
                aria-label={`Section ${idx + 1} body`}
              />
            </div>
          ))}
          <button
            type="button"
            className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            onClick={() => {
              const id =
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `a-${Date.now()}`;
              onChange({
                ...content,
                items: [
                  ...content.items,
                  {
                    id,
                    title: `Section ${content.items.length + 1}`,
                    body: "",
                  },
                ],
              });
            }}
          >
            + Add section
          </button>
        </div>
      ) : null}

      {template === "mcq" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="mcq-q">
              Question
            </label>
            <textarea
              id="mcq-q"
              rows={3}
              className={fieldClass()}
              value={content.question}
              onChange={(e) =>
                onChange({ ...content, question: e.target.value })
              }
            />
          </div>
          <p className={labelClass()}>Options (select correct)</p>
          <ul className="space-y-2">
            {content.options.map((opt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <input
                  type="radio"
                  name="mcq-correct"
                  className="mt-2"
                  checked={content.correctIndex === idx}
                  onChange={() => onChange({ ...content, correctIndex: idx })}
                  aria-label={`Correct answer option ${idx + 1}`}
                />
                <input
                  type="text"
                  className={fieldClass()}
                  value={opt}
                  onChange={(e) => {
                    const options = [...content.options];
                    options[idx] = e.target.value;
                    onChange({ ...content, options });
                  }}
                  aria-label={`Option ${idx + 1}`}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {template === "mrq" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="mrq-q">
              Question
            </label>
            <textarea
              id="mrq-q"
              rows={3}
              className={fieldClass()}
              value={content.question}
              onChange={(e) =>
                onChange({ ...content, question: e.target.value })
              }
            />
          </div>
          <p className={labelClass()}>Options (check all correct)</p>
          <ul className="space-y-2">
            {content.options.map((opt, idx) => {
              const checked = content.correctIndices.includes(idx);
              return (
                <li key={idx} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-2"
                    checked={checked}
                    onChange={() => {
                      const set = new Set(content.correctIndices);
                      if (checked) set.delete(idx);
                      else set.add(idx);
                      onChange({
                        ...content,
                        correctIndices: [...set].sort((a, b) => a - b),
                      });
                    }}
                    aria-label={`Correct option ${idx + 1}`}
                  />
                  <input
                    type="text"
                    className={fieldClass()}
                    value={opt}
                    onChange={(e) => {
                      const options = [...content.options];
                      options[idx] = e.target.value;
                      onChange({ ...content, options });
                    }}
                  />
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            onClick={() =>
              onChange({
                ...content,
                options: [...content.options, ""],
              })
            }
          >
            + Add option
          </button>
        </div>
      ) : null}

      {template === "true_false" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="tf-q">
              Statement
            </label>
            <textarea
              id="tf-q"
              rows={3}
              className={fieldClass()}
              value={content.question}
              onChange={(e) =>
                onChange({ ...content, question: e.target.value })
              }
            />
          </div>
          <fieldset>
            <legend className={labelClass()}>Correct answer</legend>
            <div className="mt-2 flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tf-correct"
                  checked={content.correct === true}
                  onChange={() => onChange({ ...content, correct: true })}
                />
                True
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="tf-correct"
                  checked={content.correct === false}
                  onChange={() => onChange({ ...content, correct: false })}
                />
                False
              </label>
            </div>
          </fieldset>
        </div>
      ) : null}

      {template === "final_quiz" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="fq-intro">
              Intro / instructions
            </label>
            <textarea
              id="fq-intro"
              rows={4}
              className={fieldClass()}
              value={content.intro}
              onChange={(e) =>
                onChange({ ...content, intro: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="fq-pass">
              Pass message
            </label>
            <textarea
              id="fq-pass"
              rows={2}
              className={fieldClass()}
              value={content.passMessage}
              onChange={(e) =>
                onChange({ ...content, passMessage: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass()} htmlFor="fq-fail">
              Fail message
            </label>
            <textarea
              id="fq-fail"
              rows={2}
              className={fieldClass()}
              value={content.failMessage}
              onChange={(e) =>
                onChange({ ...content, failMessage: e.target.value })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
