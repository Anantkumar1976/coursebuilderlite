/**
 * Course player runtime shared by SCORM 1.2, SCORM 2004, and standalone HTML
 * exports. Expects CBL_CONFIG and CBL_LMS (lms-*.js) to be defined first.
 */
(function () {
  var config = window.CBL_CONFIG || {};
  var lms = window.CBL_LMS;

  /** Mastery threshold (0–100). */
  var PASSING_SCORE =
    typeof config.passingScore === "number" ? config.passingScore : 70;
  /** Max assessment submissions; null = unlimited (retake + explicit exit). */
  var ASSESSMENT_ATTEMPTS_LIMIT =
    typeof config.assessmentAttemptsLimit === "number"
      ? config.assessmentAttemptsLimit
      : null;
  var FLOW =
    config.navigationFlow === "linear" || config.navigationFlow === "website"
      ? config.navigationFlow
      : "open";
  var IS_WEBSITE = FLOW === "website";
  var DESKTOP_QUERY = "(min-width: 1024px)";

  var currentPage = 0;
  var pageEls = [];
  var totalPages = 0;
  /** Flat page index -> true once the learner has seen that page. */
  var visited = {};
  var started = false;
  var menuOpen = false;
  /** Website mode: section chosen from the outline, kept active until its scroll settles. */
  var pinnedSection = -1;
  var assessmentTotal = 0;
  var assessmentCorrect = 0;
  /** Times the learner submitted the final score (Mark complete on last page). */
  var assessmentSubmitCount = 0;
  /** Snapshot outerHTML of each assessment block before learners interact. */
  var assessmentHtmlOriginals = [];
  var postSubmitOverlayVisible = false;

  function $(id) {
    return document.getElementById(id);
  }

  /* ---------- Assessments ---------- */

  function countAssessments() {
    return document.querySelectorAll(".cb-mcq, .cb-mrq, .cb-tf").length;
  }

  function captureAssessmentHtml() {
    assessmentHtmlOriginals = [];
    document.querySelectorAll(".cb-mcq, .cb-mrq, .cb-tf").forEach(function (el) {
      assessmentHtmlOriginals.push(el.outerHTML);
    });
  }

  function resetAssessmentFromOriginals() {
    var nodes = document.querySelectorAll(".cb-mcq, .cb-mrq, .cb-tf");
    nodes.forEach(function (el, i) {
      var html = assessmentHtmlOriginals[i];
      if (!html || !el.parentNode) return;
      var wrap = document.createElement("div");
      wrap.innerHTML = html.trim();
      var fresh = wrap.firstElementChild;
      if (fresh) el.parentNode.replaceChild(fresh, el);
    });
    assessmentCorrect = 0;
    initAssessments();
  }

  function isKcFeedback(el) {
    return el.getAttribute("data-kc-feedback") === "true";
  }

  function showKcFeedback(el, ok) {
    var fb = el.querySelector(".cb-feedback");
    var src = el.querySelector(".cb-kc-feedback-src");
    if (!fb) return;
    var html = "";
    if (src) {
      var node = src.querySelector(ok ? ".cb-kc-correct" : ".cb-kc-incorrect");
      if (node) html = node.innerHTML;
    }
    if (html) fb.innerHTML = html;
    else fb.textContent = ok ? "Correct." : "Incorrect.";
    fb.hidden = false;
    fb.classList.remove("correct", "incorrect");
    fb.classList.add(ok ? "correct" : "incorrect");
    var audioSrc = ok
      ? el.getAttribute("data-correct-audio") || ""
      : el.getAttribute("data-incorrect-audio") || "";
    if (audioSrc) {
      var a = el._kcAudio;
      if (!a) {
        a = document.createElement("audio");
        el._kcAudio = a;
      }
      a.src = audioSrc;
      a.currentTime = 0;
      a.play().catch(function () {});
    }
  }

  function initMcq(el) {
    var correct = parseInt(el.getAttribute("data-correct-index"), 10);
    var fb = el.querySelector(".cb-feedback");
    var kc = isKcFeedback(el);
    var done = false;
    var picked = null;
    function grade(idx) {
      el.querySelectorAll(".cb-opt").forEach(function (b) {
        b.classList.remove("correct", "wrong", "picked");
      });
      if (idx === correct) {
        el.querySelectorAll(".cb-opt").forEach(function (b, bi) {
          if (bi === idx) b.classList.add("correct");
        });
        if (kc) showKcFeedback(el, true);
        else if (fb) {
          fb.textContent = "Correct.";
          fb.hidden = false;
        }
        assessmentCorrect += 1;
      } else {
        el.querySelectorAll(".cb-opt").forEach(function (b, bi) {
          if (bi === idx) b.classList.add("wrong");
          if (bi === correct) b.classList.add("correct");
        });
        if (kc) showKcFeedback(el, false);
        else if (fb) {
          fb.textContent = "Incorrect.";
          fb.hidden = false;
        }
      }
    }
    el.querySelectorAll(".cb-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (done) return;
        var idx = parseInt(btn.getAttribute("data-index"), 10);
        if (kc) {
          picked = idx;
          el.querySelectorAll(".cb-opt").forEach(function (b) {
            b.classList.remove("picked");
          });
          btn.classList.add("picked");
          return;
        }
        done = true;
        grade(idx);
      });
    });
    var submitBtn = el.querySelector(".cb-submit-btn");
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        if (done || picked === null) return;
        done = true;
        grade(picked);
      });
    }
  }

  function initMrq(el) {
    var raw = el.getAttribute("data-correct-indices") || "[]";
    var correctArr = [];
    try {
      correctArr = JSON.parse(raw);
    } catch {
      correctArr = [];
    }
    var correctSet = {};
    correctArr.forEach(function (i) {
      correctSet[i] = true;
    });
    var fb = el.querySelector(".cb-feedback");
    var done = false;
    var checkBtn = el.querySelector(".cb-check-btn");
    if (checkBtn) {
      checkBtn.addEventListener("click", function () {
        if (done) return;
        var selected = {};
        var count = 0;
        el.querySelectorAll(".cb-mrq-cb").forEach(function (cb) {
          var idx = parseInt(cb.getAttribute("data-index"), 10);
          if (cb.checked) {
            selected[idx] = true;
            count += 1;
          }
        });
        var ok =
          count === Object.keys(correctSet).length &&
          Object.keys(correctSet).every(function (k) {
            return selected[k];
          }) &&
          Object.keys(selected).every(function (k) {
            return correctSet[k];
          });
        done = true;
        el.querySelectorAll(".cb-mrq-cb").forEach(function (cb) {
          var idx = parseInt(cb.getAttribute("data-index"), 10);
          var should = !!correctSet[idx];
          var on = cb.checked;
          var row = cb.closest("li");
          if (row) {
            if (should && on) row.style.background = "#f0fdf4";
            else if (should && !on) row.style.background = "#fffbeb";
            else if (!should && on) row.style.background = "#fef2f2";
          }
        });
        if (fb) {
          if (isKcFeedback(el)) showKcFeedback(el, ok);
          else {
            fb.textContent = ok
              ? "Correct — all right choices selected."
              : "Not quite — review the highlighted options.";
            fb.hidden = false;
          }
        }
        if (ok) assessmentCorrect += 1;
      });
    }
  }

  function initTf(el) {
    var correct = el.getAttribute("data-correct") === "true";
    var fb = el.querySelector(".cb-feedback");
    var kc = isKcFeedback(el);
    var done = false;
    var picked = null;
    function grade(val) {
      el.querySelectorAll(".cb-tf-btn").forEach(function (b) {
        b.classList.remove("correct", "wrong", "picked");
      });
      if (val === correct) {
        el.querySelectorAll(".cb-tf-btn").forEach(function (b) {
          if ((b.getAttribute("data-val") === "true") === correct)
            b.classList.add("correct");
        });
        if (kc) showKcFeedback(el, true);
        else if (fb) {
          fb.textContent = "Correct.";
          fb.hidden = false;
        }
        assessmentCorrect += 1;
      } else {
        el.querySelectorAll(".cb-tf-btn").forEach(function (b) {
          if (b.getAttribute("data-val") === String(val)) b.classList.add("wrong");
          if ((b.getAttribute("data-val") === "true") === correct)
            b.classList.add("correct");
        });
        if (kc) showKcFeedback(el, false);
        else if (fb) {
          fb.textContent = "Incorrect.";
          fb.hidden = false;
        }
      }
    }
    el.querySelectorAll(".cb-tf-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (done) return;
        var val = btn.getAttribute("data-val") === "true";
        if (kc) {
          picked = val;
          el.querySelectorAll(".cb-tf-btn").forEach(function (b) {
            b.classList.remove("picked");
          });
          btn.classList.add("picked");
          return;
        }
        done = true;
        grade(val);
      });
    });
    var submitBtn = el.querySelector(".cb-submit-btn");
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        if (done || picked === null) return;
        done = true;
        grade(picked);
      });
    }
  }

  function initAssessments() {
    assessmentTotal = countAssessments();
    document.querySelectorAll(".cb-mcq").forEach(initMcq);
    document.querySelectorAll(".cb-mrq").forEach(initMrq);
    document.querySelectorAll(".cb-tf").forEach(initTf);
  }

  /* ---------- Interactive templates ---------- */

  function initTabs(root) {
    var btns = root.querySelectorAll(".cb-tab-btn");
    var panels = root.querySelectorAll(".cb-tab-panel");
    btns.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        btns.forEach(function (b, j) {
          b.setAttribute("aria-selected", j === i ? "true" : "false");
        });
        panels.forEach(function (p, j) {
          if (j === i) p.removeAttribute("hidden");
          else p.setAttribute("hidden", "");
        });
      });
    });
  }

  function initClickReveal(root) {
    var dialog = root.querySelector(".cb-cr-dialog");
    if (!dialog) return;
    var panels = root.querySelectorAll(".cb-cr-panel");
    var cards = root.querySelectorAll(".cb-cr-card");
    var revealAudio = null;
    function stopRevealAudio() {
      if (!revealAudio) return;
      revealAudio.pause();
      revealAudio.currentTime = 0;
    }
    function playPanelAudio(panel) {
      stopRevealAudio();
      var src = panel.getAttribute("data-cr-audio-src");
      if (!src) return;
      if (!revealAudio) {
        revealAudio = document.createElement("audio");
        revealAudio.setAttribute("preload", "auto");
      }
      revealAudio.src = src;
      revealAudio.currentTime = 0;
      revealAudio.play().catch(function () {});
    }
    function closeDialog() {
      stopRevealAudio();
      dialog.hidden = true;
      dialog.setAttribute("aria-hidden", "true");
      panels.forEach(function (p) {
        p.hidden = true;
      });
    }
    function openPanel(index) {
      var visible = null;
      panels.forEach(function (p) {
        var show = p.getAttribute("data-cr-panel") === String(index);
        p.hidden = !show;
        if (show) visible = p;
      });
      if (visible) playPanelAudio(visible);
      dialog.hidden = false;
      dialog.setAttribute("aria-hidden", "false");
    }
    cards.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(btn.getAttribute("data-cr-index") || "", 10);
        if (isNaN(idx)) return;
        btn.classList.add("is-visited");
        openPanel(idx);
      });
    });
    dialog.querySelectorAll(".cb-cr-back").forEach(function (backBtn) {
      backBtn.addEventListener("click", closeDialog);
    });
    var backdrop = dialog.querySelector(".cb-cr-dialog-backdrop");
    if (backdrop) backdrop.addEventListener("click", closeDialog);
  }

  function initImageGridLinks() {
    document.querySelectorAll(".cb-grid-card").forEach(function (el) {
      el.addEventListener("click", function () {
        var kind = el.getAttribute("data-link-kind");
        if (kind === "page") {
          var idx = parseInt(el.getAttribute("data-jump-index") || "", 10);
          if (!isNaN(idx)) goTo(idx);
          return;
        }
        if (kind === "external") {
          var href = el.getAttribute("data-link-url");
          if (href) window.open(href, "_blank", "noopener,noreferrer");
        }
      });
    });
  }

  function initCarousel(root) {
    var slides = root.querySelectorAll(".cb-carousel-slide");
    if (!slides.length) return;
    var prev = root.querySelector(".cb-carousel-prev");
    var next = root.querySelector(".cb-carousel-next");
    var active = 0;
    function paint() {
      slides.forEach(function (el, i) {
        if (i === active) el.classList.add("is-active");
        else el.classList.remove("is-active");
      });
      if (prev) prev.disabled = active === 0;
      if (next) next.disabled = active === slides.length - 1;
    }
    if (prev) {
      prev.addEventListener("click", function () {
        active = Math.max(0, active - 1);
        paint();
      });
    }
    if (next) {
      next.addEventListener("click", function () {
        active = Math.min(slides.length - 1, active + 1);
        paint();
      });
    }
    paint();
  }

  /* ---------- Page narration ---------- */

  var activePageAudio = null;
  var pageAudioToken = 0;

  function stopPageAudio() {
    pageAudioToken += 1;
    if (!activePageAudio) return;
    try {
      activePageAudio.pause();
      activePageAudio.currentTime = 0;
    } catch {
      /* media element already torn down */
    }
    activePageAudio = null;
  }

  function waitForElementLoad(el) {
    return new Promise(function (resolve) {
      if (el.tagName === "IMG") {
        if (el.complete) {
          resolve();
          return;
        }
        el.addEventListener("load", resolve, { once: true });
        el.addEventListener("error", resolve, { once: true });
        return;
      }
      if (el.tagName === "IFRAME") {
        el.addEventListener("load", resolve, { once: true });
        setTimeout(resolve, 4000);
        return;
      }
      if (el.tagName === "VIDEO") {
        if (el.readyState >= 2) {
          resolve();
          return;
        }
        el.addEventListener("loadeddata", resolve, { once: true });
        el.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 4000);
        return;
      }
      resolve();
    });
  }

  function waitForPageAssets(pageEl) {
    var list = [].slice.call(pageEl.querySelectorAll("img, iframe, video"));
    if (!list.length) return Promise.resolve();
    return Promise.all(list.map(waitForElementLoad));
  }

  function playPageAudio(pageEl) {
    stopPageAudio();
    var src = pageEl.getAttribute("data-audio-src");
    if (!src) return;
    var token = pageAudioToken;
    waitForPageAssets(pageEl).then(function () {
      if (token !== pageAudioToken) return;
      var audio = document.createElement("audio");
      audio.src = src;
      audio.preload = "auto";
      audio.setAttribute("aria-label", "Page narration");
      activePageAudio = audio;
      audio.play().catch(function () {});
    });
  }

  /* ---------- Navigation rules ---------- */

  function isCompletionPage(i) {
    return !!pageEls[i] && pageEls[i].hasAttribute("data-completion");
  }

  function requiredPageCount() {
    var n = 0;
    for (var i = 0; i < totalPages; i += 1) if (!isCompletionPage(i)) n += 1;
    return n;
  }

  function visitedRequiredCount() {
    var n = 0;
    for (var i = 0; i < totalPages; i += 1) {
      if (!isCompletionPage(i) && visited[i]) n += 1;
    }
    return n;
  }

  function allRequiredVisited() {
    return visitedRequiredCount() >= requiredPageCount();
  }

  function firstUnvisited() {
    for (var i = 0; i < totalPages; i += 1) if (!visited[i]) return i;
    return -1;
  }

  function canNavigate(i) {
    if (i < 0 || i >= totalPages) return false;
    if (isCompletionPage(i) && !allRequiredVisited()) return false;
    if (FLOW !== "linear") return true;
    var first = firstUnvisited();
    return first === -1 || i <= first;
  }

  function markVisited(i) {
    if (i < 0 || i >= totalPages || visited[i]) return false;
    visited[i] = true;
    return true;
  }

  function goTo(i) {
    if (!canNavigate(i)) return;
    if (IS_WEBSITE) {
      pinnedSection = i;
      currentPage = i;
      refreshChrome();
      scrollToSection(i, true);
    } else {
      showPage(i);
    }
    if (!isDesktop()) setMenuOpen(false);
  }

  /* ---------- Chrome: sidebar, header, footer ---------- */

  function isDesktop() {
    return !!window.matchMedia && window.matchMedia(DESKTOP_QUERY).matches;
  }

  function setMenuOpen(open) {
    menuOpen = open;
    var shell = $("sco-shell");
    if (shell) shell.classList.toggle("menu-open", open);
    var toggle = $("sco-menu-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var noun = IS_WEBSITE ? "contents" : "course menu";
      toggle.setAttribute("aria-label", (open ? "Hide " : "Show ") + noun);
    }
  }

  function setLessonExpanded(lessonEl, expanded) {
    var btn = lessonEl.querySelector(".sco-lesson-toggle");
    var list = lessonEl.querySelector(".sco-lesson-pages");
    if (btn) btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (list) list.hidden = !expanded;
  }

  function updateSidebar() {
    document.querySelectorAll(".sco-nav-page").forEach(function (btn) {
      var idx = parseInt(btn.getAttribute("data-page-index"), 10);
      var active = idx === currentPage;
      btn.classList.toggle("is-active", active);
      btn.classList.toggle("is-visited", !!visited[idx]);
      btn.disabled = !canNavigate(idx);
      if (active) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
      var tick = btn.querySelector(".sco-tick");
      if (tick) tick.setAttribute("aria-label", visited[idx] ? "Visited" : "Not visited");
    });
    var activePage = pageEls[currentPage];
    if (activePage) {
      var lessonEl = document.querySelector(
        '.sco-lesson[data-lesson-index="' +
          activePage.getAttribute("data-lesson-index") +
          '"]',
      );
      if (lessonEl) setLessonExpanded(lessonEl, true);
    }
    var required = requiredPageCount();
    var pct = required > 0 ? Math.round((100 * visitedRequiredCount()) / required) : 0;
    var fill = $("sco-progress-fill");
    if (fill) fill.style.width = pct + "%";
    var bar = $("sco-progress");
    if (bar) bar.setAttribute("aria-valuenow", String(pct));
    var label = $("sco-progress-label");
    if (label) label.textContent = pct + "% " + (IS_WEBSITE ? "read" : "complete");
  }

  function updateHeader() {
    var page = pageEls[currentPage];
    var lessonLine = $("sco-lesson-label");
    var pageLine = $("sco-lesson-sub");
    if (!page || !lessonLine || !pageLine || IS_WEBSITE) return;
    var lessonIndex = parseInt(page.getAttribute("data-lesson-index"), 10);
    var lessonEl = document.querySelector(
      '.sco-lesson[data-lesson-index="' + lessonIndex + '"]',
    );
    var lessonTitle =
      (lessonEl && lessonEl.getAttribute("data-lesson-title")) || "Untitled lesson";
    var pagesInLesson = lessonEl
      ? lessonEl.querySelectorAll(".sco-nav-page").length
      : 0;
    var pageInLesson = parseInt(page.getAttribute("data-page-in-lesson"), 10) + 1;
    lessonLine.textContent = "Lesson " + (lessonIndex + 1) + ": " + lessonTitle;
    pageLine.textContent =
      "Page " + pageInLesson + " of " + pagesInLesson + " in this lesson";
  }

  function assessmentSubmitBlocked() {
    return (
      assessmentTotal > 0 &&
      (postSubmitOverlayVisible ||
        (ASSESSMENT_ATTEMPTS_LIMIT != null &&
          assessmentSubmitCount >= ASSESSMENT_ATTEMPTS_LIMIT))
    );
  }

  function updateFooterNav() {
    var prev = $("sco-prev");
    var next = $("sco-next");
    var hint = $("sco-foot-hint");
    var hintText = IS_WEBSITE ? "" : "Keyboard: ← → to move between pages";
    var onLast = IS_WEBSITE || currentPage >= totalPages - 1;

    if (prev) {
      prev.hidden = IS_WEBSITE;
      prev.disabled = currentPage === 0;
    }
    if (next) {
      if (onLast) {
        next.textContent = "Mark complete";
        next.disabled = !allRequiredVisited() || assessmentSubmitBlocked();
        if (!allRequiredVisited()) {
          hintText = IS_WEBSITE
            ? "Scroll through every topic to finish."
            : "Visit every page in the outline to complete this course.";
        }
      } else {
        next.textContent = "Next";
        next.disabled = !canNavigate(currentPage + 1);
        if (next.disabled) {
          hintText = "Visit every page in the outline to unlock the next page.";
        }
      }
    }
    if (hint) hint.textContent = hintText;
  }

  function refreshChrome() {
    updateSidebar();
    updateHeader();
    updateFooterNav();
  }

  /* ---------- Paged modes (linear / open) ---------- */

  function showPage(i) {
    if (i < 0 || i >= totalPages) return;
    currentPage = i;
    markVisited(i);
    pageEls.forEach(function (el, j) {
      if (j === i) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
    var scroller = $("sco-scroll");
    if (scroller) scroller.scrollTop = 0;
    refreshChrome();
    saveSuspend();
    playPageAudio(pageEls[i]);
  }

  /* ---------- Website mode (single scroll) ---------- */

  var saveTimer = 0;

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = 0;
      saveSuspend();
    }, 800);
  }

  function syncCompletionSections() {
    var unlocked = allRequiredVisited();
    pageEls.forEach(function (el, i) {
      if (!isCompletionPage(i)) return;
      if (unlocked) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
  }

  function scrollToSection(i, smooth) {
    var el = pageEls[i];
    if (!el || el.hidden) return;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  function initWebsiteMode() {
    pageEls.forEach(function (el) {
      el.removeAttribute("hidden");
    });
    syncCompletionSections();
    var scroller = $("sco-scroll");
    if (!scroller || !("IntersectionObserver" in window)) {
      pageEls.forEach(function (_el, i) {
        visited[i] = true;
      });
      return;
    }
    var onScreen = {};

    function activeOnScreen() {
      var atBottom =
        scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      var pick = -1;
      Object.keys(onScreen).forEach(function (k) {
        var n = parseInt(k, 10);
        if (pick === -1 || (atBottom ? n > pick : n < pick)) pick = n;
      });
      return pick;
    }

    function syncActive(changed) {
      var pick = pinnedSection !== -1 ? pinnedSection : activeOnScreen();
      if (pick !== -1 && pick !== currentPage) {
        currentPage = pick;
        changed = true;
        if (started) playPageAudio(pageEls[pick]);
      }
      if (changed) {
        syncCompletionSections();
        refreshChrome();
        scheduleSave();
      }
    }

    var observer = new IntersectionObserver(
      function (entries) {
        var changed = false;
        entries.forEach(function (entry) {
          var idx = parseInt(entry.target.getAttribute("data-page-index"), 10);
          if (entry.isIntersecting) {
            onScreen[idx] = true;
            if (markVisited(idx)) changed = true;
          } else {
            delete onScreen[idx];
          }
        });
        syncActive(changed);
      },
      { root: scroller, threshold: 0.15 },
    );
    pageEls.forEach(function (el) {
      observer.observe(el);
    });

    var scrollQueued = false;
    var pinTimer = null;
    scroller.addEventListener(
      "scroll",
      function () {
        if (pinnedSection !== -1) {
          if (pinTimer) window.clearTimeout(pinTimer);
          pinTimer = window.setTimeout(function () {
            pinnedSection = -1;
          }, 200);
        }
        if (scrollQueued) return;
        scrollQueued = true;
        window.requestAnimationFrame(function () {
          scrollQueued = false;
          syncActive(false);
        });
      },
      { passive: true },
    );
  }

  /* ---------- LMS persistence and scoring ---------- */

  function scorePercent() {
    if (assessmentTotal === 0) return 100;
    return Math.round((100 * assessmentCorrect) / assessmentTotal);
  }

  function isPassing() {
    return assessmentTotal === 0 || scorePercent() >= PASSING_SCORE;
  }

  function visitedList() {
    var out = [];
    for (var i = 0; i < totalPages; i += 1) if (visited[i]) out.push(i);
    return out;
  }

  function saveSuspend() {
    var payload = JSON.stringify({
      page: currentPage,
      c: assessmentCorrect,
      t: assessmentTotal,
      s: assessmentSubmitCount,
      vis: visitedList(),
      v: 3,
    });
    lms.saveProgress(payload, currentPage);
  }

  function restoreSuspend() {
    var raw = lms.getSuspendData();
    try {
      var o = raw ? JSON.parse(raw) : {};
      if (typeof o.page === "number" && o.page >= 0 && o.page < totalPages) {
        currentPage = o.page;
      }
      if (typeof o.c === "number" && o.c >= 0) assessmentCorrect = o.c;
      if (typeof o.s === "number" && o.s >= 0) {
        assessmentSubmitCount = Math.floor(o.s);
      }
      if (Array.isArray(o.vis)) {
        o.vis.forEach(function (i) {
          if (typeof i === "number") markVisited(i);
        });
      } else {
        /* v2 payloads had no visited list; everything up to the saved page was seen. */
        for (var i = 0; i <= currentPage; i += 1) markVisited(i);
      }
    } catch {
      /* ignore bad suspend payload */
    }
  }

  function hasSavedProgress() {
    return currentPage > 0 || visitedList().length > 1;
  }

  function hideAssessmentOverlay() {
    var ov = $("sco-assessment-overlay");
    if (ov) ov.hidden = true;
    postSubmitOverlayVisible = false;
    updateFooterNav();
  }

  function showAssessmentOverlay() {
    var scoreEl = $("sco-assessment-score-line");
    var metaEl = $("sco-assessment-attempts-line");
    if (scoreEl) {
      scoreEl.textContent =
        "Your score: " +
        scorePercent() +
        "% (" +
        (isPassing() ? "passed" : "not passed") +
        ").";
    }
    if (metaEl) {
      metaEl.textContent =
        "Submitted attempts: " +
        assessmentSubmitCount +
        (ASSESSMENT_ATTEMPTS_LIMIT != null
          ? " of " + ASSESSMENT_ATTEMPTS_LIMIT + " allowed."
          : " (unlimited).");
    }
    var ov = $("sco-assessment-overlay");
    if (ov) ov.hidden = false;
    postSubmitOverlayVisible = true;
    updateFooterNav();
  }

  function onRetakeAssessment() {
    hideAssessmentOverlay();
    resetAssessmentFromOriginals();
    lms.resetForRetake();
    if (IS_WEBSITE) {
      currentPage = 0;
      scrollToSection(0, false);
      saveSuspend();
    } else {
      showPage(0);
    }
  }

  function onExitLms() {
    hideAssessmentOverlay();
    lms.finish();
  }

  function handleMarkComplete() {
    if (!allRequiredVisited()) return;
    if (assessmentTotal === 0) {
      lms.writeResult(scorePercent(), true);
      lms.finish();
      return;
    }
    if (assessmentSubmitBlocked()) return;
    assessmentSubmitCount += 1;
    lms.writeResult(scorePercent(), isPassing());
    saveSuspend();
    var exhausted =
      ASSESSMENT_ATTEMPTS_LIMIT != null &&
      assessmentSubmitCount >= ASSESSMENT_ATTEMPTS_LIMIT;
    if (exhausted) lms.finish();
    else showAssessmentOverlay();
  }

  function onNext() {
    if (IS_WEBSITE || currentPage >= totalPages - 1) {
      handleMarkComplete();
      return;
    }
    goTo(currentPage + 1);
  }

  function onPrev() {
    goTo(currentPage - 1);
  }

  /* ---------- Launch screen, menu, references ---------- */

  function startCourse(fromBeginning) {
    var launch = $("sco-launch");
    if (launch) launch.hidden = true;
    started = true;
    if (fromBeginning) currentPage = 0;
    if (IS_WEBSITE) {
      refreshChrome();
      scrollToSection(currentPage, false);
      playPageAudio(pageEls[currentPage]);
      saveSuspend();
    } else {
      showPage(currentPage);
    }
    var main = $("sco-scroll");
    if (main) main.focus({ preventScroll: true });
  }

  function initLaunch() {
    var launch = $("sco-launch");
    var startBtn = $("sco-start");
    var restartBtn = $("sco-restart");
    if (!launch || !startBtn || totalPages === 0) {
      started = true;
      if (launch) launch.hidden = true;
      return;
    }
    var resume = hasSavedProgress();
    startBtn.textContent = resume
      ? "Resume"
      : IS_WEBSITE
        ? "Open manual"
        : "Start course";
    startBtn.addEventListener("click", function () {
      startCourse(false);
    });
    if (restartBtn) {
      restartBtn.hidden = !resume;
      restartBtn.addEventListener("click", function () {
        startCourse(true);
      });
    }
    launch.hidden = false;
    startBtn.focus();
  }

  function initMenu() {
    var toggle = $("sco-menu-toggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        setMenuOpen(!menuOpen);
      });
    }
    var backdrop = $("sco-menu-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setMenuOpen(false);
      });
    }
    document.querySelectorAll(".sco-lesson").forEach(function (lessonEl) {
      var btn = lessonEl.querySelector(".sco-lesson-toggle");
      if (!btn) return;
      btn.addEventListener("click", function () {
        setLessonExpanded(lessonEl, btn.getAttribute("aria-expanded") !== "true");
      });
    });
    document.querySelectorAll(".sco-nav-page").forEach(function (btn) {
      btn.addEventListener("click", function () {
        goTo(parseInt(btn.getAttribute("data-page-index"), 10));
      });
    });
    setMenuOpen(isDesktop());
  }

  function initReferences() {
    var openBtn = $("sco-ref-open");
    var dialog = $("sco-ref-dialog");
    if (!openBtn || !dialog) return;
    function close() {
      dialog.hidden = true;
      openBtn.focus();
    }
    openBtn.addEventListener("click", function () {
      dialog.hidden = false;
      var closeBtn = dialog.querySelector(".sco-ref-close");
      if (closeBtn) closeBtn.focus();
    });
    dialog.querySelectorAll("[data-ref-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !dialog.hidden) close();
    });
  }

  function onKey(e) {
    if (!started || IS_WEBSITE) return;
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    var refDialog = $("sco-ref-dialog");
    if (refDialog && !refDialog.hidden) return;
    var next = $("sco-next");
    if (e.key === "ArrowRight" && next && !next.disabled) {
      e.preventDefault();
      onNext();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPrev();
    }
  }

  function boot() {
    lms.init();
    pageEls = [].slice.call(document.querySelectorAll(".sco-page"));
    totalPages = pageEls.length;
    document.body.classList.add("sco-flow-" + FLOW);
    document.querySelectorAll(".cb-tabs").forEach(initTabs);
    document.querySelectorAll(".cb-click-reveal").forEach(initClickReveal);
    initImageGridLinks();
    document.querySelectorAll(".cb-carousel").forEach(initCarousel);
    captureAssessmentHtml();
    initAssessments();
    restoreSuspend();
    initMenu();
    initReferences();
    if (IS_WEBSITE) initWebsiteMode();
    else markVisited(currentPage);
    var prev = $("sco-prev");
    var next = $("sco-next");
    if (prev) prev.addEventListener("click", onPrev);
    if (next) next.addEventListener("click", onNext);
    var retake = $("sco-retake-assessment");
    var exitBtn = $("sco-exit-lms");
    if (retake) retake.addEventListener("click", onRetakeAssessment);
    if (exitBtn) exitBtn.addEventListener("click", onExitLms);
    window.addEventListener("keydown", onKey);
    refreshChrome();
    lms.markIncomplete();
    saveSuspend();
    initLaunch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
