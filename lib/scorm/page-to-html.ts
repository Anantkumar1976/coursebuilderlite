import { videoEmbedUrl } from "@/lib/course-player/embed-url";
import { TEMPLATE_LABELS, type PageContentV1 } from "@/lib/page-builder";

import { escapeAttr, escapeHtml } from "./html-escape";

function bodyParagraphs(text: string): string {
  if (!text.trim()) {
    return '<p class="cb-muted">No content yet.</p>';
  }
  return text
    .split(/\n\n+/)
    .filter(Boolean)
    .map(
      (para) =>
        `<p class="cb-body">${escapeHtml(para).replace(/\n/g, "<br/>")}</p>`,
    )
    .join("\n");
}

function videoHtml(url: string): string {
  const u = url.trim();
  if (!u) return '<p class="cb-muted">No video URL set.</p>';
  const embed = videoEmbedUrl(u);
  if (embed) {
    return `<div class="cb-video"><iframe title="Video" src="${escapeAttr(embed)}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"></iframe></div>`;
  }
  return `<p><a href="${escapeAttr(u)}" target="_blank" rel="noopener noreferrer">Open video link</a></p>`;
}

export function pageContentToHtml(content: PageContentV1): string {
  const label = TEMPLATE_LABELS[content.template];
  const badge = `<p class="cb-template-label">${escapeHtml(label)}</p>`;

  switch (content.template) {
    case "text":
      return `${badge}<div class="cb-block">${bodyParagraphs(content.body)}</div>`;

    case "text_image": {
      const img = content.imageUrl
        ? `<figure class="cb-figure"><img src="${escapeAttr(content.imageUrl)}" alt="${escapeAttr(content.imageAlt || "")}" loading="lazy"/>${content.imageAlt ? `<figcaption>${escapeHtml(content.imageAlt)}</figcaption>` : ""}</figure>`
        : '<p class="cb-muted">No image URL set.</p>';
      return `${badge}<div class="cb-block">${bodyParagraphs(content.body)}</div>${img}`;
    }

    case "text_video":
      return `${badge}<div class="cb-block">${bodyParagraphs(content.body)}</div>${videoHtml(content.videoUrl)}`;

    case "two_column":
      return `${badge}<div class="cb-two-col"><section><h3 class="cb-h3">Column A</h3>${bodyParagraphs(content.left)}</section><section><h3 class="cb-h3">Column B</h3>${bodyParagraphs(content.right)}</section></div>`;

    case "tabs": {
      const tabs = content.tabs.length
        ? content.tabs
        : [{ id: "t", label: "Tab", body: "" }];
      const labels = tabs
        .map(
          (t, i) =>
            `<button type="button" class="cb-tab-btn" role="tab" data-tab="${i}"${i === 0 ? ' aria-selected="true"' : ""}>${escapeHtml(t.label || `Tab ${i + 1}`)}</button>`,
        )
        .join("");
      const panels = tabs
        .map(
          (t, i) =>
            `<div class="cb-tab-panel" role="tabpanel" data-panel="${i}"${i === 0 ? "" : ' hidden'}><div class="cb-block">${bodyParagraphs(t.body)}</div></div>`,
        )
        .join("");
      return `${badge}<div class="cb-tabs" data-interactive="tabs"><div class="cb-tab-labels" role="tablist">${labels}</div><div class="cb-tab-panels">${panels}</div></div>`;
    }

    case "accordion": {
      const items = content.items.length
        ? content.items
        : [{ id: "a", title: "Section", body: "" }];
      return `${badge}${items
        .map(
          (it) =>
            `<details class="cb-details"><summary class="cb-summary">${escapeHtml(it.title || "Section")}</summary><div class="cb-details-body">${bodyParagraphs(it.body)}</div></details>`,
        )
        .join("")}`;
    }

    case "mcq": {
      const opts = content.options
        .map(
          (opt, idx) =>
            `<li><button type="button" class="cb-opt" data-index="${idx}">${escapeHtml(opt || `Option ${idx + 1}`)}</button></li>`,
        )
        .join("");
      return `${badge}<div class="cb-assess cb-mcq" data-correct-index="${content.correctIndex}"><p class="cb-q">${escapeHtml(content.question || "Question")}</p><ul class="cb-opt-list">${opts}</ul><p class="cb-feedback" hidden></p></div>`;
    }

    case "mrq": {
      const correctJson = escapeAttr(JSON.stringify(content.correctIndices));
      const opts = content.options
        .map(
          (opt, idx) =>
            `<li><label class="cb-mrq-label"><input type="checkbox" class="cb-mrq-cb" data-index="${idx}"/> <span>${escapeHtml(opt || `Option ${idx + 1}`)}</span></label></li>`,
        )
        .join("");
      return `${badge}<div class="cb-assess cb-mrq" data-correct-indices="${correctJson}"><p class="cb-q">${escapeHtml(content.question || "Question")}</p><ul class="cb-opt-list">${opts}</ul><button type="button" class="cb-check-btn">Check answer</button><p class="cb-feedback" hidden></p></div>`;
    }

    case "true_false":
      return `${badge}<div class="cb-assess cb-tf" data-correct="${content.correct ? "true" : "false"}"><p class="cb-q">${escapeHtml(content.question || "Statement")}</p><div class="cb-tf-btns"><button type="button" class="cb-tf-btn" data-val="true">True</button><button type="button" class="cb-tf-btn" data-val="false">False</button></div><p class="cb-feedback" hidden></p></div>`;

    case "final_quiz":
      return `${badge}<div class="cb-final"><div class="cb-block">${bodyParagraphs(content.intro)}</div><div class="cb-final-grid"><div class="cb-final-card cb-pass"><p class="cb-final-h">Pass</p><p>${escapeHtml(content.passMessage || "—")}</p></div><div class="cb-final-card cb-fail"><p class="cb-final-h">Fail</p><p>${escapeHtml(content.failMessage || "—")}</p></div></div><p class="cb-note">Completion is recorded when you finish this course in the LMS.</p></div>`;
  }
}
