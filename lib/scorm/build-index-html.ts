import { escapeHtml } from "./html-escape";

const SCORM_CSS = `
:root { --bg:#f4f4f5; --card:#fff; --text:#18181b; --muted:#71717a; --border:#e4e4e7; --accent:#18181b; }
* { box-sizing: border-box; }
body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:var(--bg); color:var(--text); line-height:1.6; }
#sco-shell { min-height:100vh; display:flex; flex-direction:column; max-width:42rem; margin:0 auto; }
.sco-top { padding:0.75rem 1rem; border-bottom:1px solid var(--border); background:var(--card); }
.sco-top h1 { font-size:0.875rem; font-weight:600; margin:0; }
.sco-top .sub { font-size:0.75rem; color:var(--muted); margin:0.25rem 0 0; }
.sco-progress { height:4px; background:#e4e4e7; }
.sco-progress > div { height:100%; background:var(--accent); width:0%; transition:width .25s ease; }
#sco-main { flex:1; padding:1.5rem 1rem 5rem; }
.sco-page-title { font-size:1.5rem; font-weight:600; margin:0 0 1rem; letter-spacing:-0.02em; }
.sco-card { background:var(--card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; box-shadow:0 1px 2px rgba(0,0,0,.04); }
.cb-template-label { font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color:var(--muted); margin:0 0 1rem; }
.cb-body { margin:0 0 0.75rem; white-space:pre-wrap; }
.cb-muted { color:var(--muted); font-size:0.875rem; font-style:italic; }
.cb-figure { margin:1rem 0; border:1px solid var(--border); border-radius:0.5rem; overflow:hidden; background:#fafafa; }
.cb-figure img { display:block; max-width:100%; height:auto; margin:0 auto; max-height:min(70vh, 560px); object-fit:contain; }
.cb-figure figcaption { padding:0.5rem; text-align:center; font-size:0.75rem; color:var(--muted); }
.cb-video { position:relative; aspect-ratio:16/9; border-radius:0.5rem; overflow:hidden; border:1px solid var(--border); background:#000; }
.cb-video iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.cb-two-col { display:grid; gap:2rem; }
@media (min-width:640px) { .cb-two-col { grid-template-columns:1fr 1fr; } }
.cb-h3 { font-size:0.875rem; font-weight:600; margin:0 0 0.5rem; }
.cb-tabs { border:1px solid var(--border); border-radius:0.5rem; overflow:hidden; background:var(--card); }
.cb-tab-labels { display:flex; flex-wrap:wrap; gap:0.25rem; border-bottom:1px solid var(--border); padding:0.25rem; }
.cb-tab-btn { border:0; background:transparent; padding:0.5rem 0.75rem; font-size:0.875rem; font-weight:500; cursor:pointer; border-radius:0.375rem; color:var(--muted); }
.cb-tab-btn[aria-selected="true"] { background:#f4f4f5; color:var(--text); }
.cb-tab-panel { padding:1rem; }
.cb-tab-panel[hidden] { display:none !important; }
.cb-details { border:1px solid var(--border); border-radius:0.5rem; margin-bottom:0.5rem; background:var(--card); }
.cb-summary { padding:0.75rem 1rem; font-weight:500; cursor:pointer; list-style:none; }
.cb-summary::-webkit-details-marker { display:none; }
.cb-details-body { padding:0 1rem 1rem; border-top:1px solid var(--border); }
.cb-q { font-size:1.125rem; font-weight:500; margin:0 0 1rem; }
.cb-opt-list { list-style:none; margin:0; padding:0; }
.cb-opt-list li { margin-bottom:0.5rem; }
.cb-opt, .cb-tf-btn, .cb-check-btn { width:100%; text-align:left; padding:0.75rem 1rem; border:1px solid var(--border); border-radius:0.5rem; background:var(--card); font-size:0.875rem; cursor:pointer; }
.cb-opt:hover, .cb-tf-btn:hover { border-color:#a1a1aa; }
.cb-opt.correct { border-color:#22c55e; background:#f0fdf4; }
.cb-opt.wrong { border-color:#ef4444; background:#fef2f2; }
.cb-mrq-label { display:flex; align-items:flex-start; gap:0.5rem; font-size:0.875rem; cursor:pointer; }
.cb-tf-btns { display:flex; gap:0.75rem; flex-wrap:wrap; }
.cb-tf-btn { width:auto; min-width:6rem; text-align:center; }
.cb-tf-btn.correct { border-color:#22c55e; background:#f0fdf4; }
.cb-tf-btn.wrong { border-color:#ef4444; background:#fef2f2; }
.cb-feedback { font-size:0.875rem; color:var(--muted); margin-top:0.75rem; }
.cb-final { border:1px solid #fde68a; border-radius:0.75rem; padding:1.25rem; background:#fffbeb; }
.cb-final-grid { display:grid; gap:1rem; margin-top:1rem; }
@media (min-width:480px) { .cb-final-grid { grid-template-columns:1fr 1fr; } }
.cb-final-card { border:1px solid var(--border); border-radius:0.5rem; padding:1rem; background:var(--card); font-size:0.875rem; }
.cb-final-h { font-size:0.65rem; font-weight:700; text-transform:uppercase; margin:0 0 0.5rem; }
.cb-pass .cb-final-h { color:#15803d; }
.cb-fail .cb-final-h { color:#b91c1c; }
.cb-note { font-size:0.75rem; color:var(--muted); margin-top:1rem; }
.sco-foot { position:sticky; bottom:0; display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem; border-top:1px solid var(--border); background:rgba(255,255,255,.95); backdrop-filter:blur(8px); }
.sco-foot button { padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; border-radius:0.5rem; border:1px solid var(--border); background:var(--card); cursor:pointer; }
.sco-foot .primary { background:var(--accent); color:#fff; border-color:var(--accent); }
.sco-foot button:disabled { opacity:0.4; cursor:not-allowed; }
.sco-hint { font-size:0.75rem; color:var(--muted); }
`;

export function buildScormIndexHtml(
  courseTitle: string,
  pages: { title: string; innerHtml: string }[],
): string {
  const sections = pages
    .map(
      (p, i) => `
<section class="sco-page" data-page-index="${i}"${i === 0 ? "" : ' hidden'}>
  <h2 class="sco-page-title">${escapeHtml(p.title)}</h2>
  <div class="sco-card">${p.innerHtml}</div>
</section>`,
    )
    .join("\n");

  const total = pages.length;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(courseTitle)}</title>
<style>${SCORM_CSS}</style>
</head>
<body>
<div id="sco-shell">
  <div class="sco-top">
    <h1>${escapeHtml(courseTitle)}</h1>
    <p class="sub" id="sco-sub">Page <span id="sco-num">1</span> of ${total}</p>
  </div>
  <div class="sco-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="1" id="sco-pbar-wrap">
    <div id="sco-pbar"></div>
  </div>
  <main id="sco-main">
    ${sections}
  </main>
  <footer class="sco-foot">
    <button type="button" id="sco-prev">Previous</button>
    <span class="sco-hint">← →</span>
    <button type="button" class="primary" id="sco-next">Next</button>
  </footer>
</div>
<script src="scormdriver.js"></script>
</body>
</html>`;
}
