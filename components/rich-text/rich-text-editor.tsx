"use client";

import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { plainTextToTipTapHtml } from "@/lib/rich-text/legacy-plain-to-html";
import {
  TextAlign,
  type TextAlignValue,
} from "@/lib/rich-text/text-align";

const FONT_SIZE_OPTIONS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "28px", value: "28px" },
  { label: "32px", value: "32px" },
];

const PRESET_COLORS: { label: string; value: string }[] = [
  { label: "Default", value: "" },
  { label: "Black", value: "#18181b" },
  { label: "Slate", value: "#475569" },
  { label: "Red", value: "#b91c1c" },
  { label: "Orange", value: "#c2410c" },
  { label: "Amber", value: "#b45309" },
  { label: "Green", value: "#15803d" },
  { label: "Teal", value: "#0f766e" },
  { label: "Blue", value: "#1d4ed8" },
  { label: "Indigo", value: "#4338ca" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#be185d" },
];

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHexColor(raw: string): string | null {
  const trimmed = raw.trim();
  if (!HEX_COLOR_RE.test(trimmed)) return null;
  if (trimmed.length === 4) {
    // Expand #abc → #aabbcc
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

type Props = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  "aria-label"?: string;
  minHeight?: string;
};

export function RichTextEditor({
  id,
  value,
  onChange,
  "aria-label": ariaLabel,
  minHeight = "min-h-[200px]",
}: Props) {
  const lastEmitted = useRef<string | null>(null);
  const [hexDraft, setHexDraft] = useState("");

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: {
            rel: "noopener noreferrer",
            target: "_blank",
            class: "underline",
          },
        },
      }),
      Underline,
      TextStyle,
      FontSize.configure({ types: ["textStyle"] }),
      Color.configure({ types: ["textStyle"] }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
        defaultAlignment: "left",
      }),
    ],
    content: plainTextToTipTapHtml(value),
    editorProps: {
      attributes: {
        class: `cb-rte-body focus:outline-none ${minHeight} px-0 py-1 text-sm text-zinc-900 dark:text-zinc-50`,
        "aria-label": ariaLabel ?? "Rich text body",
        ...(id ? { id } : {}),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (lastEmitted.current === value) return;
    editor.commands.setContent(plainTextToTipTapHtml(value), {
      emitUpdate: false,
    });
    lastEmitted.current = editor.getHTML();
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    const syncHex = () => {
      const color = String(editor.getAttributes("textStyle").color ?? "");
      setHexDraft(color);
    };
    syncHex();
    editor.on("selectionUpdate", syncHex);
    editor.on("transaction", syncHex);
    return () => {
      editor.off("selectionUpdate", syncHex);
      editor.off("transaction", syncHex);
    };
  }, [editor]);

  if (!editor) {
    return (
      <div
        className={`rounded-lg border border-zinc-200 bg-zinc-50 ${minHeight} dark:border-zinc-700 dark:bg-zinc-900/50`}
        aria-hidden
      />
    );
  }

  const ed = editor;

  const fontSizeAttr = String(ed.getAttributes("textStyle").fontSize ?? "");
  const presetSizeVals = FONT_SIZE_OPTIONS.map((o) => o.value).filter(Boolean);
  const hasCustomFontSize =
    Boolean(fontSizeAttr) && !presetSizeVals.includes(fontSizeAttr);
  const fontSizeSelectOptions = hasCustomFontSize
    ? [
        FONT_SIZE_OPTIONS[0],
        { label: `${fontSizeAttr} (custom)`, value: fontSizeAttr },
        ...FONT_SIZE_OPTIONS.slice(1),
      ]
    : FONT_SIZE_OPTIONS;

  const currentColor = String(ed.getAttributes("textStyle").color ?? "");

  function setLink() {
    const prev = ed.getAttributes("link").href as string | undefined;
    const next = window.prompt(
      "Link URL (leave empty to remove)",
      prev ?? "https://",
    );
    if (next === null) return;
    const trimmed = next.trim();
    if (trimmed === "") {
      ed.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    let url = trimmed;
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
      url = `https://${url}`;
    }
    ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function applyHexColor() {
    const normalized = normalizeHexColor(hexDraft);
    if (!normalized) return;
    ed.chain().focus().setColor(normalized).run();
    setHexDraft(normalized);
  }

  function setAlign(alignment: TextAlignValue) {
    ed.chain().focus().setTextAlign(alignment).run();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
      <div
        className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900/80"
        role="toolbar"
        aria-label="Text formatting"
      >
        <ToolbarButton
          title="Bold"
          active={ed.isActive("bold")}
          onClick={() => ed.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={ed.isActive("italic")}
          onClick={() => ed.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={ed.isActive("underline")}
          onClick={() => ed.chain().focus().toggleUnderline().run()}
        >
          U
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={ed.isActive("strike")}
          onClick={() => ed.chain().focus().toggleStrike().run()}
        >
          S
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        <label className="sr-only" htmlFor="rte-font-size">
          Font size
        </label>
        <select
          id="rte-font-size"
          title="Font size"
          className="max-w-[9rem] rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          value={fontSizeAttr}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) {
              ed.chain().focus().unsetFontSize().run();
            } else {
              ed.chain().focus().setFontSize(v).run();
            }
          }}
        >
          {fontSizeSelectOptions.map((o) => (
            <option key={o.value || "default"} value={o.value}>
              {o.label === "Default" ? "Size" : o.label}
            </option>
          ))}
        </select>
        <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        <ToolbarButton
          title="Align left"
          active={ed.isActive({ textAlign: "left" })}
          onClick={() => setAlign("left")}
        >
          Left
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={ed.isActive({ textAlign: "center" })}
          onClick={() => setAlign("center")}
        >
          Center
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={ed.isActive({ textAlign: "right" })}
          onClick={() => setAlign("right")}
        >
          Right
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        <ToolbarButton
          title="Heading 2"
          active={ed.isActive("heading", { level: 2 })}
          onClick={() =>
            ed.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={ed.isActive("heading", { level: 3 })}
          onClick={() =>
            ed.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        <ToolbarButton
          title="Bullet list"
          active={ed.isActive("bulletList")}
          onClick={() => ed.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={ed.isActive("orderedList")}
          onClick={() => ed.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        <ToolbarButton title="Link" onClick={setLink}>
          Link
        </ToolbarButton>
        <span className="mx-1 h-4 w-px bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Color
        </span>
        <ToolbarButton
          title="Default color"
          active={!currentColor}
          onClick={() => {
            ed.chain().focus().unsetColor().run();
            setHexDraft("");
          }}
        >
          Auto
        </ToolbarButton>
        {PRESET_COLORS.filter((c) => c.value).map((c) => (
          <button
            key={c.value}
            type="button"
            title={`${c.label} text`}
            onClick={() => {
              ed.chain().focus().setColor(c.value).run();
              setHexDraft(c.value);
            }}
            className={`h-6 w-6 shrink-0 rounded border border-zinc-300 ring-offset-1 hover:ring-2 hover:ring-zinc-400 dark:border-zinc-600 ${
              currentColor.toLowerCase() === c.value.toLowerCase()
                ? "ring-2 ring-zinc-500"
                : ""
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
        <label className="sr-only" htmlFor="rte-hex-color">
          Custom hex color
        </label>
        <input
          id="rte-hex-color"
          type="text"
          inputMode="text"
          spellCheck={false}
          placeholder="#1d4ed8"
          title="Custom hex color (e.g. #1d4ed8)"
          value={hexDraft}
          onChange={(e) => setHexDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyHexColor();
            }
          }}
          onBlur={applyHexColor}
          className="w-[5.5rem] rounded border border-zinc-200 bg-white px-1.5 py-1 font-mono text-xs text-zinc-800 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <button
          type="button"
          title="Apply hex color"
          onClick={applyHexColor}
          disabled={!normalizeHexColor(hexDraft)}
          className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-200 disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          Apply
        </button>
      </div>
      <EditorContent
        editor={ed}
        className={`cb-rte bg-white px-3 py-2 dark:bg-zinc-950 [&_.ProseMirror]:outline-none ${minHeight}`}
      />
    </div>
  );
}
