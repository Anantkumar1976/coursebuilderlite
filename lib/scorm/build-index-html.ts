import type { NavigationFlow } from "@/lib/course-player/navigation-flow";
import {
  readableTextOn,
  type ThemeColors,
  type ThemeFonts,
} from "@/lib/course-theme/theme";

import { escapeAttr, escapeHtml } from "./html-escape";

const SCORM_CSS = `
:root { --bg:#f4f4f5; --card:#fff; --text:#18181b; --muted:#71717a; --border:#e4e4e7; --accent:#18181b; --on-accent:#fff; --highlight:#27272a; --on-highlight:#fff; }
* { box-sizing: border-box; }
html, body { height:100%; }
body { margin:0; font-family:var(--font-content, system-ui, sans-serif); font-size:var(--size-content, 16px); background:var(--card); color:var(--text); line-height:1.6; }
button { font:inherit; color:inherit; }
[hidden] { display:none !important; }
#sco-shell { display:flex; height:100vh; height:100dvh; overflow:hidden; background:var(--bg); }
.sco-sidebar { width:18rem; flex:0 0 18rem; display:flex; flex-direction:column; min-height:0; background:#fafafa; border-right:1px solid var(--border); }
.sco-backdrop { display:none; }
@media (min-width:1024px) { #sco-shell:not(.menu-open) .sco-sidebar { display:none; } }
@media (max-width:1023px) {
  .sco-sidebar { position:fixed; top:0; bottom:0; left:0; z-index:50; transform:translateX(-100%); transition:transform .2s ease; }
  #sco-shell.menu-open .sco-sidebar { transform:none; box-shadow:0 10px 30px rgba(0,0,0,.2); }
  #sco-shell.menu-open .sco-backdrop { display:block; position:fixed; inset:0; z-index:40; background:rgba(0,0,0,.4); border:0; }
}
.sco-side-banner { position:relative; height:8rem; flex:0 0 auto; overflow:hidden; background:linear-gradient(135deg,#52525b,#18181b); }
.sco-side-banner img { width:100%; height:100%; object-fit:cover; display:block; }
.sco-side-banner::after { content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.8), rgba(0,0,0,.1)); }
.sco-side-title { position:absolute; left:0; right:0; bottom:0; z-index:1; margin:0; padding:2rem .75rem .75rem; color:#fff; font-family:var(--font-course-title); font-size:var(--size-course-title); font-weight:600; line-height:1.3; text-shadow:0 1px 2px rgba(0,0,0,.4); }
.sco-side-progress { padding:.5rem .75rem; border-bottom:1px solid var(--border); }
.sco-progress { height:6px; border-radius:999px; background:var(--border); overflow:hidden; }
.sco-progress-fill { height:100%; width:0; background:var(--highlight); border-radius:999px; transition:width .3s ease; }
.sco-progress-label { margin:.4rem 0 0; font-size:10px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); }
.sco-progress-hint { margin:.15rem 0 0; font-size:10px; line-height:1.4; color:#a1a1aa; }
.sco-outline { flex:1; min-height:0; overflow-y:auto; padding:.5rem; }
.sco-outline ul { list-style:none; margin:0; padding:0; }
.sco-lesson-toggle { display:flex; align-items:center; gap:.35rem; width:100%; padding:.4rem .5rem; border:0; border-radius:.375rem; background:transparent; text-align:left; font-size:.875rem; font-weight:600; cursor:pointer; }
.sco-lesson-toggle:hover { background:rgba(228,228,231,.8); }
.sco-caret { display:inline-block; color:#a1a1aa; transition:transform .15s ease; }
.sco-lesson-toggle[aria-expanded="false"] .sco-caret { transform:rotate(-90deg); }
.sco-lesson-name, .sco-nav-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sco-outline .sco-lesson-pages { margin:0 0 .25rem 1rem; padding-left:.5rem; border-left:1px solid var(--border); }
.sco-nav-page { display:flex; align-items:center; gap:.5rem; width:100%; padding:.4rem .5rem; border:0; border-radius:.375rem; background:transparent; text-align:left; font-size:.875rem; color:#3f3f46; cursor:pointer; }
.sco-nav-page:hover:not(:disabled) { background:rgba(228,228,231,.7); }
.sco-nav-page.is-active, .sco-nav-page.is-active:hover:not(:disabled) { background:var(--highlight); color:var(--on-highlight); font-weight:500; }
.sco-nav-page:disabled { opacity:.5; cursor:not-allowed; }
.sco-tick { flex:0 0 auto; width:1.25rem; height:1.25rem; border-radius:999px; border:2px solid #d4d4d8; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; }
.sco-nav-page.is-visited .sco-tick { border-color:transparent; background:var(--highlight); color:var(--on-highlight); }
.sco-nav-page.is-visited .sco-tick::before { content:"\\2713"; }
.sco-nav-page.is-active.is-visited .sco-tick { border-color:var(--on-highlight); }
.sco-flow-website .sco-tick { display:none; }
.sco-main { flex:1; min-width:0; display:flex; flex-direction:column; background:var(--card); }
.sco-header { display:flex; align-items:center; gap:.75rem; padding:.75rem 1rem; border-bottom:1px solid var(--border); background:var(--card); }
.sco-icon-btn { flex:0 0 auto; width:2.5rem; height:2.5rem; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border:1px solid var(--border); border-radius:.5rem; background:var(--card); cursor:pointer; }
.sco-icon-btn span { display:block; width:1.25rem; height:2px; border-radius:2px; background:currentColor; }
.sco-header-center { flex:1; min-width:0; text-align:center; }
#sco-lesson-label { margin:0; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#sco-lesson-sub { margin:.1rem 0 0; font-size:.75rem; color:var(--muted); }
.sco-header-right { flex:0 0 auto; min-width:2.5rem; display:flex; justify-content:flex-end; }
.sco-ref-btn { padding:.5rem .75rem; border:1px solid var(--highlight); border-radius:.5rem; background:var(--card); font-size:.875rem; font-weight:500; cursor:pointer; }
#sco-scroll { flex:1; min-height:0; overflow-y:auto; padding:1.5rem 1.25rem 2rem; outline:none; }
@media (min-width:640px) { #sco-scroll { padding:1.5rem 2rem 2rem; } }
@media (min-width:1024px) { #sco-scroll { padding:1.5rem 3.5rem 2rem; } }
.sco-pages { max-width:60rem; margin:0 auto; }
.sco-page-head { margin-bottom:1.5rem; }
.sco-page-title { margin:0; font-family:var(--font-page-title); font-size:var(--size-page-title); font-weight:700; letter-spacing:-0.02em; line-height:1.2; }
.sco-title-bar { margin-top:.75rem; width:4rem; height:4px; border-radius:999px; background:var(--highlight); }
.sco-flow-website .sco-page { scroll-margin-top:1rem; padding-bottom:4rem; margin-bottom:4rem; border-bottom:1px solid #f4f4f5; }
.sco-flow-website .sco-page:last-child { border-bottom:0; margin-bottom:0; }
.sco-launch { position:fixed; inset:0; z-index:70; overflow-y:auto; background:var(--card); }
.sco-launch-hero { position:relative; height:14rem; overflow:hidden; background:linear-gradient(135deg,#3f3f46,#18181b); }
@media (min-width:640px) { .sco-launch-hero { height:18rem; } }
.sco-launch-hero img { width:100%; height:100%; object-fit:cover; display:block; }
.sco-launch-hero::after { content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.2) 50%, transparent); }
.sco-launch-hero-text { position:absolute; left:0; right:0; bottom:0; z-index:1; padding:3rem 1rem 2rem; }
@media (min-width:640px) { .sco-launch-hero-text { padding:3rem 2rem 2rem; } }
.sco-launch-kicker { margin:0; font-size:.75rem; font-weight:500; letter-spacing:.05em; text-transform:uppercase; color:rgba(255,255,255,.8); }
.sco-launch-title { margin:.5rem 0 0; color:#fff; font-family:var(--font-course-title); font-size:var(--size-course-title); font-weight:700; letter-spacing:-0.02em; line-height:1.2; }
.sco-launch-body { max-width:42rem; margin:0 auto; padding:2.5rem 1rem; }
.sco-launch-meta { display:flex; flex-wrap:wrap; align-items:center; gap:.75rem; font-size:.875rem; color:#52525b; }
.sco-chip { padding:.25rem .75rem; border:1px solid var(--border); border-radius:999px; background:#fafafa; }
.sco-launch-desc { margin:1.5rem 0 0; color:#3f3f46; white-space:pre-line; }
.sco-launch-actions { display:flex; flex-wrap:wrap; gap:.75rem; margin-top:2.5rem; }
.sco-btn { padding:.75rem 1.5rem; min-width:12rem; font-size:.875rem; font-weight:600; border-radius:.75rem; border:1px solid var(--border); background:var(--card); cursor:pointer; }
.sco-btn.primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); }
.sco-ref { position:fixed; inset:0; z-index:60; display:flex; align-items:flex-start; justify-content:center; padding:5rem 1rem 1rem; }
@media (min-width:640px) { .sco-ref { justify-content:flex-end; padding-top:6rem; } }
.sco-ref-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.5); border:0; cursor:pointer; }
.sco-ref-panel { position:relative; width:100%; max-width:24rem; padding:1rem; border:1px solid var(--border); border-radius:.75rem; background:var(--card); box-shadow:0 20px 50px rgba(0,0,0,.25); }
.sco-ref-head { display:flex; align-items:flex-start; justify-content:space-between; gap:.5rem; }
.sco-ref-head h2 { margin:0; font-size:1rem; font-weight:600; }
.sco-ref-close { border:0; background:transparent; padding:.25rem .5rem; border-radius:.25rem; color:var(--muted); cursor:pointer; }
.sco-ref-list { list-style:none; margin:1rem 0 0; padding:0; display:grid; gap:.5rem; }
.sco-ref-list a { color:var(--highlight); font-size:.875rem; font-weight:500; text-underline-offset:4px; }
.cb-body { margin:0 0 0.75rem; white-space:pre-wrap; }
.cb-rich { font-size:1rem; line-height:1.6; }
.cb-rich p { margin:0 0 0.75rem; }
.cb-rich p:last-child { margin-bottom:0; }
.cb-rich h2 { font-size:1.25rem; font-weight:600; margin:0 0 0.5rem; }
.cb-rich h3 { font-size:1.1rem; font-weight:600; margin:0 0 0.5rem; }
.cb-rich ul, .cb-rich ol { margin:0 0 0.75rem; padding-left:1.5rem; }
.cb-rich ul { list-style-type:disc; }
.cb-rich ol { list-style-type:decimal; }
.cb-rich li { margin:0.15rem 0; }
.cb-rich a { color:#1d4ed8; text-decoration:underline; }
.cb-rich u { text-decoration:underline; }
.cb-ti-row { display:flex; flex-direction:column; gap:1.5rem; }
@media (min-width:640px) {
  .cb-ti-row.cb-ti-image-left { flex-direction:row; align-items:flex-start; }
  .cb-ti-row.cb-ti-image-left .cb-figure { flex:0 0 45%; max-width:45%; }
  .cb-ti-row.cb-ti-image-left .cb-block { flex:1; min-width:0; }
  .cb-ti-row.cb-ti-image-right { flex-direction:row; align-items:flex-start; }
  .cb-ti-row.cb-ti-image-right .cb-block { flex:1; min-width:0; order:1; }
  .cb-ti-row.cb-ti-image-right .cb-figure { flex:0 0 45%; max-width:45%; order:2; }
}
.cb-ti-stack { display:flex; flex-direction:column; gap:1.5rem; }
.cb-ti-columns { display:grid; grid-template-columns:1fr; gap:1.25rem; }
@media (min-width:640px) {
  .cb-ti-columns.cb-ti-cols-2 { grid-template-columns:repeat(2, minmax(0, 1fr)); }
  .cb-ti-columns.cb-ti-cols-3 { grid-template-columns:repeat(3, minmax(0, 1fr)); }
  .cb-ti-columns.cb-ti-cols-4 { grid-template-columns:repeat(4, minmax(0, 1fr)); }
}
.cb-ti-block { display:flex; flex-direction:column; gap:1rem; min-width:0; }
.cb-muted { color:var(--muted); font-size:0.875rem; font-style:italic; }
.cb-figure { margin:1rem 0; border:1px solid var(--border); border-radius:0.5rem; overflow:hidden; background:#fafafa; }
.cb-figure img { display:block; max-width:100%; height:auto; margin:0 auto; max-height:min(70vh, 560px); object-fit:contain; }
.cb-figure figcaption { padding:0.5rem; text-align:center; font-size:0.75rem; color:var(--muted); }
.cb-video { position:relative; aspect-ratio:16/9; border-radius:0.5rem; overflow:hidden; border:1px solid var(--border); background:#000; }
.cb-video iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }
.cb-tv-stack { display:flex; flex-direction:column; gap:1.5rem; }
.cb-tv-row { display:flex; flex-direction:column; gap:1.5rem; }
@media (min-width:640px) {
  .cb-tv-row.cb-tv-video-left { flex-direction:row; align-items:flex-start; }
  .cb-tv-row.cb-tv-video-left .cb-video { flex:0 0 50%; max-width:50%; }
  .cb-tv-row.cb-tv-video-left .cb-block { flex:1; min-width:0; }
  .cb-tv-row.cb-tv-video-right { flex-direction:row; align-items:flex-start; }
  .cb-tv-row.cb-tv-video-right .cb-block { flex:1; min-width:0; order:1; }
  .cb-tv-row.cb-tv-video-right .cb-video { flex:0 0 50%; max-width:50%; order:2; }
}
.cb-two-col { display:grid; gap:2rem; }
@media (min-width:640px) { .cb-two-col { grid-template-columns:1fr 1fr; } }
.cb-pdf-wrap { border:1px solid var(--border); border-radius:0.5rem; overflow:hidden; background:var(--card); }
.cb-pdf-wrap iframe { width:100%; height:70vh; min-height:420px; border:0; display:block; }
.cb-carousel { position:relative; border:1px solid var(--border); border-radius:0.75rem; overflow:hidden; background:var(--card); }
.cb-carousel-track { width:100%; }
.cb-carousel-slide { display:none; }
.cb-carousel-slide.is-active { display:block; }
.cb-carousel-media { position:relative; aspect-ratio:16/9; background:#fafafa; }
.cb-carousel-media img { width:100%; height:100%; object-fit:cover; display:block; }
.cb-carousel-no-image { display:flex; width:100%; height:100%; align-items:center; justify-content:center; font-size:0.8rem; color:var(--muted); }
.cb-carousel-overlay { position:absolute; inset:auto 0 0 0; background:rgba(0,0,0,.62); color:#fff; padding:0.65rem; font-size:0.78rem; }
.cb-carousel-below { padding:0.65rem; font-size:0.78rem; color:var(--muted); }
.cb-carousel-nav { position:absolute; top:50%; transform:translateY(-50%); border:1px solid var(--border); background:rgba(255,255,255,.95); color:var(--text); width:2rem; height:2rem; border-radius:999px; cursor:pointer; z-index:2; }
.cb-carousel-prev { left:0.5rem; }
.cb-carousel-next { right:0.5rem; }
.cb-carousel-nav:disabled { opacity:.35; cursor:not-allowed; }
.cb-grid { display:grid; gap:1rem; }
.cb-grid.cb-grid-cols-1 { grid-template-columns:repeat(1, minmax(0,1fr)); }
.cb-grid.cb-grid-cols-2 { grid-template-columns:repeat(2, minmax(0,1fr)); } /* legacy */
.cb-grid.cb-grid-cols-3 { grid-template-columns:repeat(3, minmax(0,1fr)); } /* legacy */
.cb-grid.cb-grid-cols-4 { grid-template-columns:repeat(4, minmax(0,1fr)); }
.cb-grid.cb-grid-cols-5 { grid-template-columns:repeat(5, minmax(0,1fr)); }
.cb-grid.cb-grid-cols-6 { grid-template-columns:repeat(6, minmax(0,1fr)); }
.cb-grid.cb-grid-cols-7 { grid-template-columns:repeat(7, minmax(0,1fr)); }
.cb-grid.cb-grid-cols-8 { grid-template-columns:repeat(8, minmax(0,1fr)); }
.cb-grid-card { width:100%; border:1px solid var(--border); border-radius:0.5rem; overflow:hidden; background:var(--card); padding:0; cursor:pointer; text-align:left; }
.cb-grid-card[data-link-kind="none"] { cursor:default; }
.cb-grid-media { position:relative; aspect-ratio:1/1; background:#fafafa; }
.cb-grid-media img { width:100%; height:100%; object-fit:cover; display:block; }
.cb-grid-no-image { display:flex; align-items:center; justify-content:center; width:100%; height:100%; font-size:0.75rem; color:var(--muted); }
.cb-grid-hover { position:absolute; inset:auto 0 0 0; background:rgba(0,0,0,.62); color:#fff; padding:0.5rem; opacity:0; transition:opacity .2s ease; font-size:0.75rem; }
.cb-grid-card:hover .cb-grid-hover { opacity:1; }
.cb-grid-below { padding:0.5rem; font-size:0.75rem; color:var(--muted); }
.cb-grid-title { margin:0 0 0.2rem; font-weight:600; color:inherit; font-size:0.78rem; }
.cb-h3 { font-size:0.875rem; font-weight:600; margin:0 0 0.5rem; }
.cb-tabs { border:1px solid var(--border); border-radius:0.5rem; overflow:hidden; background:var(--card); }
.cb-tab-labels { display:flex; flex-wrap:wrap; gap:0.25rem; border-bottom:1px solid var(--border); padding:0.25rem; }
.cb-tab-btn { border:0; background:transparent; padding:0.5rem 0.75rem; font-size:0.875rem; font-weight:500; cursor:pointer; border-radius:0.375rem; color:var(--muted); }
.cb-tab-btn[aria-selected="true"] { background:#f4f4f5; color:var(--text); }
.cb-tab-panel { padding:1rem; }
.cb-tab-panel[hidden] { display:none !important; }
.cb-tab-media-row { display:grid; gap:1rem; }
@media (min-width:640px) { .cb-tab-media-row { grid-template-columns:220px minmax(0,1fr); align-items:start; } }
.cb-tab-image-wrap .cb-figure { margin:0; }
.cb-tabs.cb-tabs-vertical { display:grid; grid-template-columns:220px minmax(0, 1fr); }
.cb-tabs.cb-tabs-vertical .cb-tab-labels { border-bottom:0; border-right:1px solid var(--border); flex-direction:column; align-items:stretch; }
.cb-tabs.cb-tabs-vertical .cb-tab-btn { text-align:left; width:100%; }
.cb-details { border:1px solid var(--border); border-radius:0.5rem; margin-bottom:0.5rem; background:var(--card); }
.cb-summary { padding:0.75rem 1rem; font-weight:500; cursor:pointer; list-style:none; }
.cb-summary::-webkit-details-marker { display:none; }
.cb-details-body { padding:0 1rem 1rem; border-top:1px solid var(--border); }
.cb-click-reveal { margin-top:1rem; }
.cb-cr-grid { display:grid; gap:1rem; width:100%; }
.cb-cr-grid.cb-cr-grid-cols-1 { display:flex; justify-content:center; }
.cb-cr-grid.cb-cr-grid-cols-1 .cb-cr-card { width:100%; max-width:20rem; }
.cb-cr-grid.cb-cr-grid-cols-2 { grid-template-columns:repeat(2, minmax(0,1fr)); }
.cb-cr-grid.cb-cr-grid-cols-3 { grid-template-columns:repeat(3, minmax(0,1fr)); }
.cb-cr-grid.cb-cr-grid-cols-4 { grid-template-columns:repeat(4, minmax(0,1fr)); }
.cb-cr-grid.cb-cr-grid-multi { grid-template-columns:repeat(2, minmax(0,1fr)); }
@media (min-width:768px) {
  .cb-cr-grid.cb-cr-grid-multi { grid-template-columns:repeat(3, minmax(0,1fr)); }
}
@media (min-width:1024px) {
  .cb-cr-grid.cb-cr-grid-multi { grid-template-columns:repeat(4, minmax(0,1fr)); }
}
@media (max-width:639px) {
  .cb-cr-grid.cb-cr-grid-cols-2,
  .cb-cr-grid.cb-cr-grid-cols-3,
  .cb-cr-grid.cb-cr-grid-cols-4 { grid-template-columns:minmax(0,1fr); }
  .cb-cr-grid.cb-cr-grid-cols-4 { grid-template-columns:repeat(2, minmax(0,1fr)); }
}
@media (min-width:640px) and (max-width:1023px) {
  .cb-cr-grid.cb-cr-grid-cols-4 { grid-template-columns:repeat(2, minmax(0,1fr)); }
}
.cb-cr-card { width:100%; border:1px solid var(--border); border-radius:0.75rem; overflow:hidden; background:var(--card); padding:0; cursor:pointer; text-align:left; box-shadow:0 1px 2px rgba(0,0,0,.04); }
.cb-cr-card.is-visited { border-color:var(--accent); box-shadow:0 0 0 2px var(--accent); }
.cb-cr-media img { display:block; width:100%; aspect-ratio:4/3; object-fit:cover; }
.cb-cr-card-body { padding:1rem; display:flex; flex-direction:column; gap:0.5rem; }
.cb-cr-title { margin:0; font-weight:600; font-size:0.95rem; }
.cb-cr-teaser { font-size:0.8rem; color:var(--muted); }
.cb-cr-cta { margin-top:auto; font-size:0.75rem; font-weight:600; color:var(--accent); }
.cb-cr-dialog { position:fixed; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; padding:1rem; }
.cb-cr-dialog[hidden] { display:none !important; }
.cb-cr-dialog-backdrop { position:absolute; inset:0; background:rgba(0,0,0,.45); }
.cb-cr-dialog-shell { position:relative; z-index:1; width:min(42rem,100%); max-height:min(36rem,90vh); overflow:hidden; border-radius:0.75rem; border:1px solid var(--border); background:var(--card); box-shadow:0 12px 40px rgba(0,0,0,.18); display:flex; flex-direction:column; }
.cb-cr-dialog-inner { overflow-y:auto; }
.cb-cr-panel[hidden] { display:none !important; }
.cb-cr-panel:not([hidden]) { display:block; }
.cb-cr-dialog-img { display:block; width:100%; max-height:14rem; object-fit:cover; }
.cb-cr-panel-body { padding:1rem 1.25rem 1.25rem; }
.cb-cr-dialog-title { margin:0 0 0.75rem; font-size:1.125rem; font-weight:600; }
.cb-cr-back { margin-top:1rem; padding:0.5rem 1rem; border:0; border-radius:9999px; background:var(--accent); color:var(--on-accent); font-size:0.875rem; font-weight:500; cursor:pointer; }
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
.cb-feedback.correct, .cb-feedback.incorrect { min-height:3.75rem; margin-top:1rem; padding:1rem 1.25rem; border-radius:0.5rem; border:2px solid; line-height:1.5; }
.cb-feedback.correct { border-color:#22c55e; background:#f0fdf4; color:#065f46; }
.cb-feedback.incorrect { border-color:#ef4444; background:#fef2f2; color:#991b1b; }
.cb-final { border:1px solid #fde68a; border-radius:0.75rem; padding:1.25rem; background:#fffbeb; }
.cb-final-grid { display:grid; gap:1rem; margin-top:1rem; }
@media (min-width:480px) { .cb-final-grid { grid-template-columns:1fr 1fr; } }
.cb-final-card { border:1px solid var(--border); border-radius:0.5rem; padding:1rem; background:var(--card); font-size:0.875rem; }
.cb-final-h { font-size:0.65rem; font-weight:700; text-transform:uppercase; margin:0 0 0.5rem; }
.cb-pass .cb-final-h { color:#15803d; }
.cb-fail .cb-final-h { color:#b91c1c; }
.cb-note { font-size:0.75rem; color:var(--muted); margin-top:1rem; }
.sco-foot { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.75rem 1rem; border-top:1px solid var(--border); background:var(--card); }
.sco-foot button { padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; border-radius:0.5rem; border:1px solid var(--border); background:var(--card); cursor:pointer; }
.sco-foot .primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); }
.sco-foot button:disabled { opacity:0.4; cursor:not-allowed; }
.sco-hint { flex:1; text-align:center; font-size:0.75rem; color:var(--muted); }
.sco-assessment-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); display:flex; align-items:flex-end; justify-content:center; z-index:30; padding:1rem; }
.sco-assessment-overlay[hidden] { display:none !important; }
.sco-assessment-panel { background:var(--card); border:1px solid var(--border); border-radius:0.75rem; padding:1.25rem; max-width:28rem; width:100%; margin-bottom:5.5rem; box-shadow:0 8px 30px rgba(0,0,0,.15); }
.sco-assessment-score { font-size:1rem; font-weight:600; margin:0 0 0.5rem; }
.sco-assessment-meta { font-size:0.8rem; color:var(--muted); margin:0 0 1rem; }
.sco-assessment-actions { display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:flex-end; }
.sco-assessment-actions button { padding:0.5rem 1rem; font-size:0.875rem; font-weight:500; border-radius:0.5rem; border:1px solid var(--border); background:var(--card); cursor:pointer; }
.sco-assessment-actions .primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); }
`;

export interface IndexHtmlPage {
  title: string;
  innerHtml: string;
  pageAudioSrc: string | null;
  /** Course completion pages unlock only after every other page is visited. */
  isCompletion: boolean;
}

export interface IndexHtmlLesson {
  title: string;
  pages: IndexHtmlPage[];
}

export interface IndexHtmlReference {
  label: string;
  href: string;
}

export interface IndexHtmlOptions {
  lang: string;
  customCss: string | null;
  description: string | null;
  estimatedDurationMinutes: number | null;
  /** Package-relative banner image path. */
  bannerSrc: string | null;
  references: IndexHtmlReference[];
  themeFonts: ThemeFonts;
  themeColors: ThemeColors;
  navigationFlow: NavigationFlow;
}

const PROGRESS_HINTS: Record<NavigationFlow, string> = {
  linear: "Pages unlock in order",
  open: "Open any page from the outline",
  website: "Scroll to read each topic",
};

/** Theme values are author-entered; keep them from escaping the CSS declaration. */
function cssValue(value: string): string {
  return value.replace(/[;{}<>\\]/g, "").trim();
}

function themeCss(fonts: ThemeFonts, colors: ThemeColors): string {
  return `:root {
  --accent:${cssValue(colors.button)}; --on-accent:${readableTextOn(colors.button)};
  --highlight:${cssValue(colors.highlight)}; --on-highlight:${readableTextOn(colors.highlight)};
  --font-course-title:${cssValue(fonts.courseTitle)}; --size-course-title:${cssValue(fonts.courseTitleSize)};
  --font-page-title:${cssValue(fonts.pageTitle)}; --size-page-title:${cssValue(fonts.pageTitleSize)};
  --font-content:${cssValue(fonts.pageContent)}; --size-content:${cssValue(fonts.pageContentSize)};
}`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function bannerImg(src: string | null): string {
  return src ? `<img src="${escapeAttr(src)}" alt=""/>` : "";
}

function launchHtml(
  courseTitle: string,
  lessons: IndexHtmlLesson[],
  pageCount: number,
  options: IndexHtmlOptions,
): string {
  const isManual = options.navigationFlow === "website";
  const minutes = options.estimatedDurationMinutes;
  const counts =
    lessons.length > 0
      ? plural(lessons.length, isManual ? "section" : "lesson") +
        (pageCount > 0 ? ` · ${plural(pageCount, isManual ? "topic" : "page")}` : "")
      : "";
  const description = options.description?.trim();
  return `<div id="sco-launch" class="sco-launch">
  <div class="sco-launch-hero">
    ${bannerImg(options.bannerSrc)}
    <div class="sco-launch-hero-text">
      <p class="sco-launch-kicker">${isManual ? "Manual" : "Course"}</p>
      <h1 class="sco-launch-title">${escapeHtml(courseTitle)}</h1>
    </div>
  </div>
  <div class="sco-launch-body">
    <div class="sco-launch-meta">
      ${minutes != null && minutes > 0 ? `<span class="sco-chip">~${minutes} min</span>` : ""}
      ${counts ? `<span>${escapeHtml(counts)}</span>` : ""}
    </div>
    ${description ? `<p class="sco-launch-desc">${escapeHtml(description)}</p>` : ""}
    <div class="sco-launch-actions">
      <button type="button" id="sco-start" class="sco-btn primary">${isManual ? "Open manual" : "Start course"}</button>
      <button type="button" id="sco-restart" class="sco-btn" hidden>Start from the beginning</button>
    </div>
  </div>
</div>`;
}

function sidebarHtml(
  courseTitle: string,
  lessons: IndexHtmlLesson[],
  options: IndexHtmlOptions,
): string {
  const isManual = options.navigationFlow === "website";
  let flatIndex = 0;
  const outline = lessons
    .map((lesson, li) => {
      const pages = lesson.pages
        .map((page) => {
          const idx = flatIndex;
          flatIndex += 1;
          return `<li><button type="button" class="sco-nav-page" data-page-index="${idx}"><span class="sco-nav-title">${escapeHtml(page.title || "Untitled page")}</span><span class="sco-tick" aria-hidden="true"></span></button></li>`;
        })
        .join("");
      return `<li class="sco-lesson" data-lesson-index="${li}" data-lesson-title="${escapeAttr(lesson.title || "Untitled lesson")}">
        <button type="button" class="sco-lesson-toggle" aria-expanded="true" aria-controls="sco-lesson-${li}-pages"><span class="sco-caret" aria-hidden="true">&#9662;</span><span class="sco-lesson-name">${escapeHtml(lesson.title || "Untitled lesson")}</span></button>
        <ul id="sco-lesson-${li}-pages" class="sco-lesson-pages">${pages}</ul>
      </li>`;
    })
    .join("\n");

  return `<aside id="sco-sidebar" class="sco-sidebar" aria-label="${isManual ? "Manual contents" : "Course menu"}">
    <div class="sco-side-banner">
      ${bannerImg(options.bannerSrc)}
      <p class="sco-side-title">${escapeHtml(courseTitle)}</p>
    </div>
    <div class="sco-side-progress">
      <div id="sco-progress" class="sco-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="${isManual ? "Manual reading progress" : "Course progress"}">
        <div id="sco-progress-fill" class="sco-progress-fill"></div>
      </div>
      <p id="sco-progress-label" class="sco-progress-label">0% ${isManual ? "read" : "complete"}</p>
      <p class="sco-progress-hint">${PROGRESS_HINTS[options.navigationFlow]}</p>
    </div>
    <nav class="sco-outline" aria-label="${isManual ? "Manual contents" : "Course outline"}">
      <ul>${outline}</ul>
    </nav>
  </aside>`;
}

function referencesDialogHtml(references: IndexHtmlReference[]): string {
  if (references.length === 0) return "";
  const items = references
    .map(
      (ref) =>
        `<li><a href="${escapeAttr(ref.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ref.label)}</a></li>`,
    )
    .join("");
  return `<div id="sco-ref-dialog" class="sco-ref" hidden>
  <button type="button" class="sco-ref-backdrop" data-ref-close aria-label="Close reference panel" tabindex="-1"></button>
  <div class="sco-ref-panel" role="dialog" aria-modal="true" aria-labelledby="sco-ref-title">
    <div class="sco-ref-head">
      <h2 id="sco-ref-title">Reference materials</h2>
      <button type="button" class="sco-ref-close" data-ref-close aria-label="Close">&#10005;</button>
    </div>
    <ul class="sco-ref-list">${items}</ul>
  </div>
</div>`;
}

export function buildScormIndexHtml(
  courseTitle: string,
  lessons: IndexHtmlLesson[],
  options: IndexHtmlOptions,
): string {
  const lang = options.lang.trim() || "en";
  const customCss = options.customCss?.trim() ?? "";
  const isManual = options.navigationFlow === "website";

  let flatIndex = 0;
  const sections = lessons
    .flatMap((lesson, li) =>
      lesson.pages.map((page, pi) => {
        const idx = flatIndex;
        flatIndex += 1;
        const attrs = [
          `id="sco-page-${idx}"`,
          `data-page-index="${idx}"`,
          `data-lesson-index="${li}"`,
          `data-page-in-lesson="${pi}"`,
          page.isCompletion ? "data-completion" : "",
          page.pageAudioSrc ? `data-audio-src="${escapeAttr(page.pageAudioSrc)}"` : "",
          idx === 0 ? "" : "hidden",
        ]
          .filter(Boolean)
          .join(" ");
        return `<section class="sco-page" ${attrs}>
  <header class="sco-page-head">
    <h2 class="sco-page-title">${escapeHtml(page.title || "Untitled page")}</h2>
    <div class="sco-title-bar" aria-hidden="true"></div>
  </header>
  <div class="sco-card">${page.innerHtml}</div>
</section>`;
      }),
    )
    .join("\n");
  const pageCount = flatIndex;

  const referenceButton =
    options.references.length > 0
      ? `<button type="button" id="sco-ref-open" class="sco-ref-btn">Reference</button>`
      : "";

  return `<!DOCTYPE html>
<html lang="${escapeAttr(lang)}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escapeHtml(courseTitle)}</title>
<style>${SCORM_CSS}</style>
<style>${themeCss(options.themeFonts, options.themeColors)}</style>
${customCss ? `<style>${customCss}</style>` : ""}
</head>
<body>
${launchHtml(courseTitle, lessons, pageCount, options)}
<div id="sco-shell">
  <button type="button" id="sco-menu-backdrop" class="sco-backdrop" aria-label="Close menu" tabindex="-1"></button>
  ${sidebarHtml(courseTitle, lessons, options)}
  <div class="sco-main">
    <header class="sco-header">
      <button type="button" id="sco-menu-toggle" class="sco-icon-btn" aria-controls="sco-sidebar" aria-expanded="true" aria-label="Hide ${isManual ? "contents" : "course menu"}"><span></span><span></span><span></span></button>
      <div class="sco-header-center">
        <p id="sco-lesson-label"></p>
        <p id="sco-lesson-sub"></p>
      </div>
      <div class="sco-header-right">${referenceButton}</div>
    </header>
    <main id="sco-scroll" tabindex="-1">
      <div class="sco-pages">
${sections}
      </div>
    </main>
    <footer class="sco-foot">
      <button type="button" id="sco-prev">Previous</button>
      <span id="sco-foot-hint" class="sco-hint"></span>
      <button type="button" class="primary" id="sco-next">Next</button>
    </footer>
  </div>
</div>
${referencesDialogHtml(options.references)}
<div id="sco-assessment-overlay" class="sco-assessment-overlay" hidden>
  <div class="sco-assessment-panel" role="dialog" aria-labelledby="sco-assessment-score-line">
    <p id="sco-assessment-score-line" class="sco-assessment-score"></p>
    <p id="sco-assessment-attempts-line" class="sco-assessment-meta"></p>
    <div class="sco-assessment-actions">
      <button type="button" id="sco-retake-assessment">Retake assessment</button>
      <button type="button" class="primary" id="sco-exit-lms">Save score and exit</button>
    </div>
  </div>
</div>
<script src="scormdriver.js"></script>
</body>
</html>`;
}
