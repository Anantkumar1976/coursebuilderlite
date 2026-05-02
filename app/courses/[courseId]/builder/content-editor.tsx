"use client";

import { useCallback } from "react";

import {
  TextImageImagePanel,
  type CourseAssetLite,
} from "@/components/media/text-image-media";
import { PdfMediaPanel } from "@/components/media/pdf-media";
import { RichTextEditor } from "@/components/rich-text/rich-text-editor";
import {
  IMAGE_CAROUSEL_CAPTION_MODE_LABELS,
  IMAGE_GRID_CAPTION_MODE_LABELS,
  IMAGE_GRID_LAYOUT_LABELS,
  IMAGE_GRID_ROW_MODE_LABELS,
  TAB_LAYOUT_LABELS,
  TAB_LAYOUTS,
  TEXT_IMAGE_LAYOUTS,
  TEXT_IMAGE_LAYOUT_LABELS,
  TEXT_VIDEO_LAYOUTS,
  TEXT_VIDEO_LAYOUT_LABELS,
  blockCountForLayout,
  emptyTextImageBlock,
  isColumnsLayout,
  newBlockId,
  normalizeImageGridItems,
  normalizeImageCarouselItems,
  normalizeTextImageContent,
  templateDisplayLabel,
  type ImageCarouselCaptionMode,
  type ImageGridCaptionMode,
  type ImageGridLayout,
  type ImageGridRowMode,
  type PageContentV1,
  type TabLayout,
  type TextImageBlockItem,
  type TextImageLayout,
  type TextVideoLayout,
} from "@/lib/page-builder";

function fieldClass() {
  return "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
}

function labelClass() {
  return "text-xs font-medium text-zinc-600 dark:text-zinc-400";
}

type Props = {
  content: PageContentV1;
  onChange: (next: PageContentV1) => void;
  courseId: string;
  courseAssets: CourseAssetLite[];
  availablePages: { id: string; title: string }[];
  onAssetsUpdated: () => void;
};

export function ContentEditor({
  content,
  onChange,
  courseId,
  courseAssets,
  availablePages,
  onAssetsUpdated,
}: Props) {
  const template = content.template;
  const badge = templateDisplayLabel(content);

  const handleTextImageLayout = useCallback(
    (nextLayout: TextImageLayout) => {
      if (content.template !== "text_image") return;
      const cur = content.layout;
      if (nextLayout === cur) return;

      if (!isColumnsLayout(nextLayout) && isColumnsLayout(cur)) {
        const b = content.blocks?.[0];
        onChange(
          normalizeTextImageContent({
            ...content,
            layout: nextLayout,
            body: b?.body ?? content.body,
            imageAssetId: b?.imageAssetId ?? null,
            imageUrl: b?.imageUrl ?? "",
            imageAlt: b?.imageAlt ?? "",
            blocks: undefined,
          }),
        );
        return;
      }

      if (isColumnsLayout(nextLayout) && !isColumnsLayout(cur)) {
        const n = blockCountForLayout(nextLayout);
        const first: TextImageBlockItem = {
          id: newBlockId(),
          body: content.body,
          imageAssetId: content.imageAssetId ?? null,
          imageUrl: content.imageUrl,
          imageAlt: content.imageAlt,
        };
        const rest: TextImageBlockItem[] = [];
        for (let i = 1; i < n; i++) {
          rest.push(emptyTextImageBlock());
        }
        onChange(
          normalizeTextImageContent({
            ...content,
            layout: nextLayout,
            blocks: [first, ...rest],
          }),
        );
        return;
      }

      if (isColumnsLayout(nextLayout) && isColumnsLayout(cur)) {
        const n = blockCountForLayout(nextLayout);
        const prev = content.blocks ?? [];
        const blocks: TextImageBlockItem[] = [];
        for (let i = 0; i < n; i++) {
          blocks.push(prev[i] ?? emptyTextImageBlock());
        }
        onChange(
          normalizeTextImageContent({
            ...content,
            layout: nextLayout,
            blocks,
          }),
        );
        return;
      }

      onChange(
        normalizeTextImageContent({
          ...content,
          layout: nextLayout,
        }),
      );
    },
    [content, onChange],
  );

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
          <p className={labelClass()} id="body-text-label">
            Body
          </p>
          <div className="mt-1">
            <RichTextEditor
              aria-labelledby="body-text-label"
              minHeight="min-h-[200px]"
              value={content.body}
              onChange={(html) => onChange({ ...content, body: html })}
            />
          </div>
        </div>
      ) : null}

      {template === "text_image" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="ti-layout">
              Layout
            </label>
            <select
              id="ti-layout"
              className={fieldClass()}
              value={content.layout}
              onChange={(e) =>
                handleTextImageLayout(e.target.value as TextImageLayout)
              }
            >
              {TEXT_IMAGE_LAYOUTS.map((id) => (
                <option key={id} value={id}>
                  {TEXT_IMAGE_LAYOUT_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          {isColumnsLayout(content.layout) ? (
            <div
              className={
                content.layout === "columns_2"
                  ? "grid grid-cols-1 gap-4 md:grid-cols-2"
                  : content.layout === "columns_3"
                    ? "grid grid-cols-1 gap-4 md:grid-cols-3"
                    : "grid grid-cols-1 gap-4 md:grid-cols-4"
              }
            >
            {(normalizeTextImageContent(content).blocks ?? []).map(
              (block, idx) => (
                <div
                  key={block.id}
                  className="space-y-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Column {idx + 1} · image top, text below
                  </p>
                  <TextImageImagePanel
                    courseId={courseId}
                    idPrefix={`ti-b${idx}`}
                    value={{
                      imageAssetId: block.imageAssetId,
                      imageUrl: block.imageUrl,
                      imageAlt: block.imageAlt,
                    }}
                    onChange={(v) => {
                      const blocks = [
                        ...(normalizeTextImageContent(content).blocks ??
                          []),
                      ];
                      blocks[idx] = { ...block, ...v };
                      onChange({ ...content, blocks });
                    }}
                    courseAssets={courseAssets}
                    onAssetsUpdated={onAssetsUpdated}
                  />
                  <div>
                    <p
                      className={labelClass()}
                      id={`ti-b${idx}-body-label`}
                    >
                      Text
                    </p>
                    <div className="mt-1">
                      <RichTextEditor
                        aria-labelledby={`ti-b${idx}-body-label`}
                        minHeight="min-h-[140px]"
                        value={block.body}
                        onChange={(html) => {
                          const blocks = [
                            ...(normalizeTextImageContent(content).blocks ??
                              []),
                          ];
                          blocks[idx] = { ...block, body: html };
                          onChange({ ...content, blocks });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ),
            )}
            </div>
          ) : content.layout === "image_top_full" ? (
            <>
              <TextImageImagePanel
                courseId={courseId}
                idPrefix="ti"
                value={{
                  imageAssetId: content.imageAssetId,
                  imageUrl: content.imageUrl,
                  imageAlt: content.imageAlt,
                }}
                onChange={(v) => onChange({ ...content, ...v })}
                courseAssets={courseAssets}
                onAssetsUpdated={onAssetsUpdated}
              />
              <div>
                <p className={labelClass()} id="ti-body-label">
                  Body
                </p>
                <div className="mt-1">
                  <RichTextEditor
                    aria-labelledby="ti-body-label"
                    minHeight="min-h-[160px]"
                    value={content.body}
                    onChange={(html) =>
                      onChange({ ...content, body: html })
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className={labelClass()} id="ti-body-label">
                  Body
                </p>
                <div className="mt-1">
                  <RichTextEditor
                    aria-labelledby="ti-body-label"
                    minHeight="min-h-[160px]"
                    value={content.body}
                    onChange={(html) =>
                      onChange({ ...content, body: html })
                    }
                  />
                </div>
              </div>
              <TextImageImagePanel
                courseId={courseId}
                idPrefix="ti"
                value={{
                  imageAssetId: content.imageAssetId,
                  imageUrl: content.imageUrl,
                  imageAlt: content.imageAlt,
                }}
                onChange={(v) => onChange({ ...content, ...v })}
                courseAssets={courseAssets}
                onAssetsUpdated={onAssetsUpdated}
              />
            </>
          )}
        </div>
      ) : null}

      {template === "text_video" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="tv-layout">
              Layout
            </label>
            <select
              id="tv-layout"
              className={fieldClass()}
              value={content.layout}
              onChange={(e) =>
                onChange({
                  ...content,
                  layout: e.target.value as TextVideoLayout,
                })
              }
            >
              {TEXT_VIDEO_LAYOUTS.map((id) => (
                <option key={id} value={id}>
                  {TEXT_VIDEO_LAYOUT_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          {content.layout !== "video_only" ? (
            <div>
              <p className={labelClass()} id="tv-body-label">
                Body
              </p>
              <div className="mt-1">
                <RichTextEditor
                  aria-labelledby="tv-body-label"
                  minHeight="min-h-[160px]"
                  value={content.body}
                  onChange={(html) => onChange({ ...content, body: html })}
                />
              </div>
            </div>
          ) : null}

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
            <p className={labelClass()} id="tc-left-label">
              Left column
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="tc-left-label"
                minHeight="min-h-[200px]"
                value={content.left}
                onChange={(html) => onChange({ ...content, left: html })}
              />
            </div>
          </div>
          <div>
            <p className={labelClass()} id="tc-right-label">
              Right column
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="tc-right-label"
                minHeight="min-h-[200px]"
                value={content.right}
                onChange={(html) => onChange({ ...content, right: html })}
              />
            </div>
          </div>
        </div>
      ) : null}

      {template === "embed_pdf" ? (
        <div className="space-y-4">
          <div>
            <p className={labelClass()} id="pdf-intro-label">
              Intro / instructions (shown above PDF)
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="pdf-intro-label"
                minHeight="min-h-[120px]"
                value={content.intro}
                onChange={(html) => onChange({ ...content, intro: html })}
              />
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Ensure the PDF is publicly available or accessible from your
            corporate network. If learners cannot reach the URL or file, the
            embedded viewer will not load.
          </div>
          <PdfMediaPanel
            courseId={courseId}
            value={{ pdfAssetId: content.pdfAssetId, pdfUrl: content.pdfUrl }}
            onChange={(v) => onChange({ ...content, ...v })}
            courseAssets={courseAssets}
            onAssetsUpdated={onAssetsUpdated}
            idPrefix="pdf"
          />
        </div>
      ) : null}

      {template === "image_carousel" ? (
        <div className="space-y-4">
          <div>
            <p className={labelClass()} id="ic-intro-label">
              Intro / instructions (shown above carousel)
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="ic-intro-label"
                minHeight="min-h-[120px]"
                value={content.intro}
                onChange={(html) => onChange({ ...content, intro: html })}
              />
            </div>
          </div>
          <div>
            <label className={labelClass()} htmlFor="ic-caption-mode">
              Caption display
            </label>
            <select
              id="ic-caption-mode"
              className={fieldClass()}
              value={content.captionMode}
              onChange={(e) =>
                onChange({
                  ...content,
                  captionMode: e.target.value as ImageCarouselCaptionMode,
                })
              }
            >
              {Object.entries(IMAGE_CAROUSEL_CAPTION_MODE_LABELS).map(
                ([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          {normalizeImageCarouselItems(content.items).map((item, idx) => (
            <div
              key={item.id}
              className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Slide {idx + 1}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  className={`${fieldClass()} max-w-sm`}
                  value={item.title}
                  onChange={(e) => {
                    const items = normalizeImageCarouselItems(content.items);
                    items[idx] = { ...item, title: e.target.value };
                    onChange({ ...content, items });
                  }}
                  placeholder={`Slide ${idx + 1} title`}
                />
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline dark:text-red-400"
                  onClick={() => {
                    if (content.items.length <= 1) return;
                    const items = content.items.filter((s) => s.id !== item.id);
                    onChange({ ...content, items });
                  }}
                >
                  Remove slide
                </button>
              </div>

              <TextImageImagePanel
                courseId={courseId}
                idPrefix={`ic-${idx}`}
                value={{
                  imageAssetId: item.imageAssetId,
                  imageUrl: item.imageUrl,
                  imageAlt: item.imageAlt,
                }}
                onChange={(v) => {
                  const items = normalizeImageCarouselItems(content.items);
                  items[idx] = { ...item, ...v };
                  onChange({ ...content, items });
                }}
                courseAssets={courseAssets}
                onAssetsUpdated={onAssetsUpdated}
              />

              <textarea
                rows={3}
                className={fieldClass()}
                value={item.caption}
                onChange={(e) => {
                  const items = normalizeImageCarouselItems(content.items);
                  items[idx] = { ...item, caption: e.target.value };
                  onChange({ ...content, items });
                }}
                placeholder="Caption text"
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
                  : `ic-${Date.now()}`;
              onChange({
                ...content,
                items: [
                  ...content.items,
                  {
                    id,
                    title: `Slide ${content.items.length + 1}`,
                    caption: "",
                    imageAssetId: null,
                    imageUrl: "",
                    imageAlt: "",
                  },
                ],
              });
            }}
          >
            + Add slide
          </button>
        </div>
      ) : null}

      {template === "image_grid" ? (
        <div className="space-y-4">
          <div>
            <p className={labelClass()} id="ig-intro-label">
              Intro / instructions (shown above grid)
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="ig-intro-label"
                minHeight="min-h-[120px]"
                value={content.intro}
                onChange={(html) => onChange({ ...content, intro: html })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass()} htmlFor="ig-layout">
                Grid layout
              </label>
              <select
                id="ig-layout"
                className={fieldClass()}
                value={content.layout}
                onChange={(e) => {
                  const layout = e.target.value as ImageGridLayout;
                  onChange({
                    ...content,
                    layout,
                    items: normalizeImageGridItems(
                      layout,
                      content.rowMode,
                      content.items,
                    ),
                  });
                }}
              >
                {Object.entries(IMAGE_GRID_LAYOUT_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass()} htmlFor="ig-row-mode">
                Rows
              </label>
              <select
                id="ig-row-mode"
                className={fieldClass()}
                value={content.rowMode}
                onChange={(e) => {
                  const rowMode = e.target.value as ImageGridRowMode;
                  onChange({
                    ...content,
                    rowMode,
                    items: normalizeImageGridItems(
                      content.layout,
                      rowMode,
                      content.items,
                    ),
                  });
                }}
              >
                {Object.entries(IMAGE_GRID_ROW_MODE_LABELS).map(
                  ([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <label className={labelClass()} htmlFor="ig-caption-mode">
                Caption display
              </label>
              <select
                id="ig-caption-mode"
                className={fieldClass()}
                value={content.captionMode}
                onChange={(e) =>
                  onChange({
                    ...content,
                    captionMode: e.target.value as ImageGridCaptionMode,
                  })
                }
              >
                {Object.entries(IMAGE_GRID_CAPTION_MODE_LABELS).map(
                  ([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {normalizeImageGridItems(content.layout, content.rowMode, content.items).map(
              (item, idx) => (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Tile {idx + 1}
                  </p>
                  <input
                    type="text"
                    className={fieldClass()}
                    value={item.title}
                    onChange={(e) => {
                      const items = normalizeImageGridItems(
                        content.layout,
                        content.rowMode,
                        content.items,
                      );
                      items[idx] = { ...item, title: e.target.value };
                      onChange({ ...content, items });
                    }}
                    placeholder={`Tile ${idx + 1} title`}
                    aria-label={`Tile ${idx + 1} title`}
                  />
                  <TextImageImagePanel
                    courseId={courseId}
                    idPrefix={`ig-${idx}`}
                    value={{
                      imageAssetId: item.imageAssetId,
                      imageUrl: item.imageUrl,
                      imageAlt: item.imageAlt,
                    }}
                    onChange={(v) => {
                      const items = normalizeImageGridItems(
                        content.layout,
                        content.rowMode,
                        content.items,
                      );
                      items[idx] = { ...item, ...v };
                      onChange({ ...content, items });
                    }}
                    courseAssets={courseAssets}
                    onAssetsUpdated={onAssetsUpdated}
                  />
                  <textarea
                    rows={3}
                    className={fieldClass()}
                    value={item.caption}
                    onChange={(e) => {
                      const items = normalizeImageGridItems(
                        content.layout,
                        content.rowMode,
                        content.items,
                      );
                      items[idx] = { ...item, caption: e.target.value };
                      onChange({ ...content, items });
                    }}
                    placeholder="Caption / supporting text"
                    aria-label={`Tile ${idx + 1} caption`}
                  />

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass()} htmlFor={`ig-link-kind-${idx}`}>
                        Click action
                      </label>
                      <select
                        id={`ig-link-kind-${idx}`}
                        className={fieldClass()}
                        value={item.linkKind}
                        onChange={(e) => {
                          const kind = e.target.value as
                            | "none"
                            | "page"
                            | "external";
                          const items = normalizeImageGridItems(
                            content.layout,
                            content.rowMode,
                            content.items,
                          );
                          items[idx] = {
                            ...item,
                            linkKind: kind,
                            targetPageId:
                              kind === "page" ? item.targetPageId : null,
                            externalUrl:
                              kind === "external" ? item.externalUrl : "",
                          };
                          onChange({ ...content, items });
                        }}
                      >
                        <option value="none">No link</option>
                        <option value="page">Jump to course page</option>
                        <option value="external">Open external URL</option>
                      </select>
                    </div>

                    {item.linkKind === "page" ? (
                      <div className="sm:col-span-2">
                        <label className={labelClass()} htmlFor={`ig-page-${idx}`}>
                          Target page
                        </label>
                        <select
                          id={`ig-page-${idx}`}
                          className={fieldClass()}
                          value={item.targetPageId ?? ""}
                          onChange={(e) => {
                            const items = normalizeImageGridItems(
                              content.layout,
                              content.rowMode,
                              content.items,
                            );
                            items[idx] = {
                              ...item,
                              targetPageId: e.target.value || null,
                            };
                            onChange({ ...content, items });
                          }}
                        >
                          <option value="">Select page</option>
                          {availablePages.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {item.linkKind === "external" ? (
                      <div className="sm:col-span-2">
                        <label className={labelClass()} htmlFor={`ig-url-${idx}`}>
                          External URL
                        </label>
                        <input
                          id={`ig-url-${idx}`}
                          type="url"
                          className={fieldClass()}
                          value={item.externalUrl}
                          onChange={(e) => {
                            const items = normalizeImageGridItems(
                              content.layout,
                              content.rowMode,
                              content.items,
                            );
                            items[idx] = {
                              ...item,
                              externalUrl: e.target.value,
                            };
                            onChange({ ...content, items });
                          }}
                          placeholder="https://example.com"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {template === "tabs" ? (
        <div className="space-y-4">
          <div>
            <label className={labelClass()} htmlFor="tabs-layout">
              Layout
            </label>
            <select
              id="tabs-layout"
              className={fieldClass()}
              value={content.layout}
              onChange={(e) =>
                onChange({
                  ...content,
                  layout: e.target.value as TabLayout,
                })
              }
            >
              {TAB_LAYOUTS.map((id) => (
                <option key={id} value={id}>
                  {TAB_LAYOUT_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
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
              <div className="mt-3">
                <TextImageImagePanel
                  courseId={courseId}
                  idPrefix={`tab-${idx}`}
                  value={{
                    imageAssetId: tab.imageAssetId,
                    imageUrl: tab.imageUrl,
                    imageAlt: tab.imageAlt,
                  }}
                  onChange={(v) => {
                    const tabs = [...content.tabs];
                    tabs[idx] = { ...tab, ...v };
                    onChange({ ...content, tabs });
                  }}
                  courseAssets={courseAssets}
                  onAssetsUpdated={onAssetsUpdated}
                />
              </div>
              <RichTextEditor
                aria-label={`Tab ${idx + 1} content`}
                minHeight="min-h-[140px]"
                value={tab.body}
                onChange={(html) => {
                  const tabs = [...content.tabs];
                  tabs[idx] = { ...tab, body: html };
                  onChange({ ...content, tabs });
                }}
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
                  {
                    id,
                    label: `Tab ${content.tabs.length + 1}`,
                    body: "",
                    imageAssetId: null,
                    imageUrl: "",
                    imageAlt: "",
                  },
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
              <RichTextEditor
                aria-label={`Section ${idx + 1} body`}
                minHeight="min-h-[140px]"
                value={item.body}
                onChange={(html) => {
                  const items = [...content.items];
                  items[idx] = { ...item, body: html };
                  onChange({ ...content, items });
                }}
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

      {template === "course_completion" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
            This page is learner-facing only after course completion (and passing
            the final assessment when one exists). Use the page title for the
            completion heading.
          </div>
          <div>
            <p className={labelClass()} id="cc-summary-label">
              Course summary / next steps
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="cc-summary-label"
                minHeight="min-h-[180px]"
                value={content.summary}
                onChange={(html) => onChange({ ...content, summary: html })}
              />
            </div>
          </div>
          <div>
            <p className={labelClass()}>Company logo (optional)</p>
            <div className="mt-1">
              <TextImageImagePanel
                courseId={courseId}
                idPrefix="cc-logo"
                value={{
                  imageAssetId: content.logoAssetId,
                  imageUrl: content.logoUrl,
                  imageAlt: content.logoAlt,
                }}
                onChange={(v) =>
                  onChange({
                    ...content,
                    logoAssetId: v.imageAssetId ?? null,
                    logoUrl: v.imageUrl,
                    logoAlt: v.imageAlt,
                  })
                }
                courseAssets={courseAssets}
                onAssetsUpdated={onAssetsUpdated}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={content.showPrintCertificate !== false}
              onChange={(e) =>
                onChange({
                  ...content,
                  showPrintCertificate: e.target.checked,
                })
              }
            />
            Enable "Print Certificate" button on the completion page
          </label>
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
            <p className={labelClass()} id="fq-intro-label">
              Quiz intro / instructions
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="fq-intro-label"
                minHeight="min-h-[220px]"
                value={content.intro}
                onChange={(html) => onChange({ ...content, intro: html })}
              />
            </div>
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              <p>
                <strong className="text-zinc-700 dark:text-zinc-300">
                  Lesson structure:
                </strong>{" "}
                In the same lesson, add separate pages for each question (use
                the MCQ, MRQ, or True/False templates), then add a &quot;Quiz
                results&quot; page at the end. The player automatically rolls up
                scores from those question pages — no separate submit step.
              </p>
              <p>
                You can reuse this pattern for a pre-assessment (e.g. first
                lesson) or a final exam (last lesson). Only the{" "}
                <strong className="text-zinc-700 dark:text-zinc-300">
                  last lesson&apos;s
                </strong>{" "}
                quiz score is stored for LMS export; earlier lesson quizzes
                stay in the browser for that lesson only.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {template === "quiz_results" ? (
        <div className="space-y-4">
          <div>
            <p className={labelClass()} id="qr-intro-label">
              Intro (optional)
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="qr-intro-label"
                minHeight="min-h-[100px]"
                value={content.intro}
                onChange={(html) => onChange({ ...content, intro: html })}
              />
            </div>
          </div>
          <div>
            <p className={labelClass()} id="qr-pass-label">
              Pass message
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="qr-pass-label"
                minHeight="min-h-[120px]"
                value={content.passMessage}
                onChange={(html) =>
                  onChange({ ...content, passMessage: html })
                }
              />
            </div>
          </div>
          <div>
            <p className={labelClass()} id="qr-fail-label">
              Fail message
            </p>
            <div className="mt-1">
              <RichTextEditor
                aria-labelledby="qr-fail-label"
                minHeight="min-h-[120px]"
                value={content.failMessage}
                onChange={(html) =>
                  onChange({ ...content, failMessage: html })
                }
              />
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            Place this page after the question pages in the same lesson. The
            player automatically averages scores from every MCQ, MRQ, and
            True/False page in that lesson — no submit button. Only the last
            lesson&apos;s quiz can feed the LMS export score.
          </p>
        </div>
      ) : null}
    </div>
  );
}
