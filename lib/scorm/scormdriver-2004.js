/**
 * SCORM 2004 single-SCO runtime: navigation, suspend_data, completion, score.
 * Works in an LMS (API_1484_11) or standalone (mock API).
 */
(function () {
  var api = null;
  var currentPage = 0;
  var pageEls = [];
  var totalPages = 0;
  var assessmentTotal = 0;
  var assessmentCorrect = 0;
  var assessmentSubmitCount = 0;
  var assessmentHtmlOriginals = [];
  var postSubmitOverlayVisible = false;

  function findAPI(win) {
    var w = win || window;
    var n = 0;
    while (w && n < 32) {
      if (w.API_1484_11) return w.API_1484_11;
      if (w.parent && w.parent !== w) {
        w = w.parent;
      } else if (w.opener && w.opener !== w) {
        w = w.opener;
      } else {
        break;
      }
      n += 1;
    }
    return null;
  }

  function mockAPI() {
    var store = {};
    return {
      Initialize: function () {
        return "true";
      },
      Terminate: function () {
        return "true";
      },
      GetValue: function (k) {
        return store[k] != null ? String(store[k]) : "";
      },
      SetValue: function (k, v) {
        store[k] = v;
        return "true";
      },
      Commit: function () {
        return "true";
      },
      GetLastError: function () {
        return "0";
      },
      GetErrorString: function () {
        return "";
      },
      GetDiagnostic: function () {
        return "";
      },
    };
  }

  function callAPI(method, a, b) {
    if (!api) return "false";
    try {
      return api[method](a, b);
    } catch {
      return "false";
    }
  }

  function countAssessments() {
    var n = 0;
    document.querySelectorAll(".cb-mcq, .cb-mrq, .cb-tf").forEach(function () {
      n += 1;
    });
    return n;
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

  function initAllTabs() {
    document.querySelectorAll(".cb-tabs").forEach(initTabs);
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
        var raw = btn.getAttribute("data-cr-index");
        var idx = parseInt(raw || "", 10);
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

  function initAllClickReveal() {
    document.querySelectorAll(".cb-click-reveal").forEach(initClickReveal);
  }

  function initImageGridLinks() {
    document.querySelectorAll(".cb-grid-card").forEach(function (el) {
      el.addEventListener("click", function () {
        var kind = el.getAttribute("data-link-kind");
        if (kind === "page") {
          var raw = el.getAttribute("data-jump-index");
          var idx = parseInt(raw || "", 10);
          if (!isNaN(idx)) {
            showPage(idx);
          }
          return;
        }
        if (kind === "external") {
          var href = el.getAttribute("data-link-url");
          if (href) {
            window.open(href, "_blank", "noopener,noreferrer");
          }
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

  function updateFooterNav() {
    var prev = document.getElementById("sco-prev");
    var next = document.getElementById("sco-next");
    if (prev) prev.disabled = currentPage === 0;
    if (next) {
      if (currentPage >= totalPages - 1) {
        next.textContent = "Mark complete";
        next.classList.add("primary");
        next.disabled =
          assessmentTotal > 0 &&
          (postSubmitOverlayVisible ||
            (ASSESSMENT_ATTEMPTS_LIMIT != null &&
              assessmentSubmitCount >= ASSESSMENT_ATTEMPTS_LIMIT));
      } else {
        next.textContent = "Next";
        next.classList.add("primary");
        next.disabled = false;
      }
    }
  }

  function updateFooterNav() {
    var prev = document.getElementById("sco-prev");
    var next = document.getElementById("sco-next");
    if (prev) prev.disabled = currentPage === 0;
    if (next) {
      if (currentPage >= totalPages - 1) {
        next.textContent = "Mark complete";
        next.classList.add("primary");
        next.disabled =
          assessmentTotal > 0 &&
          (postSubmitOverlayVisible ||
            (ASSESSMENT_ATTEMPTS_LIMIT != null &&
              assessmentSubmitCount >= ASSESSMENT_ATTEMPTS_LIMIT));
      } else {
        next.textContent = "Next";
        next.classList.add("primary");
        next.disabled = false;
      }
    }
  }

  var activePageAudio = null;
  var pageAudioToken = 0;

  function stopPageAudio() {
    if (!activePageAudio) return;
    try {
      activePageAudio.pause();
      activePageAudio.currentTime = 0;
    } catch (_err) {}
    activePageAudio = null;
  }

  function waitForElementLoad(el) {
    return new Promise(function (resolve) {
      if (el.tagName === "IMG") {
        if (el.complete) {
          resolve();
          return;
        }
        el.addEventListener(
          "load",
          function () {
            resolve();
          },
          { once: true },
        );
        el.addEventListener(
          "error",
          function () {
            resolve();
          },
          { once: true },
        );
        return;
      }
      if (el.tagName === "IFRAME") {
        el.addEventListener(
          "load",
          function () {
            resolve();
          },
          { once: true },
        );
        setTimeout(resolve, 4000);
        return;
      }
      if (el.tagName === "VIDEO") {
        if (el.readyState >= 2) {
          resolve();
          return;
        }
        el.addEventListener(
          "loadeddata",
          function () {
            resolve();
          },
          { once: true },
        );
        el.addEventListener(
          "error",
          function () {
            resolve();
          },
          { once: true },
        );
        setTimeout(resolve, 4000);
        return;
      }
      resolve();
    });
  }

  function waitForPageAssets(pageEl) {
    var nodes = pageEl.querySelectorAll("img, iframe, video");
    var list = [].slice.call(nodes);
    if (!list.length) return Promise.resolve();
    return Promise.all(list.map(waitForElementLoad));
  }

  function playPageAudio(pageEl) {
    stopPageAudio();
    var src = pageEl.getAttribute("data-audio-src");
    if (!src) return;
    var token = ++pageAudioToken;
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

  function showPage(i) {
    if (i < 0 || i >= totalPages) return;
    currentPage = i;
    pageEls.forEach(function (el, j) {
      if (j === i) el.removeAttribute("hidden");
      else el.setAttribute("hidden", "");
    });
    var num = document.getElementById("sco-num");
    if (num) num.textContent = String(i + 1);
    var bar = document.getElementById("sco-pbar");
    if (bar) bar.style.width = ((100 * (i + 1)) / totalPages || 0) + "%";
    var pwrap = document.getElementById("sco-pbar-wrap");
    if (pwrap) pwrap.setAttribute("aria-valuenow", String(i + 1));
    updateFooterNav();
    saveSuspend();
    var visible = pageEls[i];
    if (visible) playPageAudio(visible);
  }

  function scorePercent() {
    if (assessmentTotal === 0) return 100;
    return Math.round((100 * assessmentCorrect) / assessmentTotal);
  }

  function saveSuspend() {
    var payload = JSON.stringify({
      page: currentPage,
      c: assessmentCorrect,
      t: assessmentTotal,
      s: assessmentSubmitCount,
      v: 2,
    });
    callAPI("SetValue", "cmi.suspend_data", payload);
    callAPI("SetValue", "cmi.location", String(currentPage));
    callAPI("Commit", "");
  }

  var PASSING_SCORE = 70;
  var ASSESSMENT_ATTEMPTS_LIMIT = null;

  function successStatusForMastery() {
    var pct = scorePercent();
    if (assessmentTotal === 0) {
      return "passed";
    }
    return pct >= PASSING_SCORE ? "passed" : "failed";
  }

  function writeScoreCommit() {
    var pct = scorePercent();
    var success = successStatusForMastery();
    callAPI("SetValue", "cmi.completion_status", "completed");
    callAPI("SetValue", "cmi.success_status", success);
    callAPI("SetValue", "cmi.score.min", "0");
    callAPI("SetValue", "cmi.score.max", "100");
    callAPI("SetValue", "cmi.score.raw", String(pct));
    callAPI("SetValue", "cmi.score.scaled", String((pct / 100).toFixed(4)));
    callAPI("Commit", "");
  }

  function finishLms() {
    callAPI("Terminate", "");
  }

  function hideAssessmentOverlay() {
    var ov = document.getElementById("sco-assessment-overlay");
    if (ov) ov.hidden = true;
    postSubmitOverlayVisible = false;
    updateFooterNav();
  }

  function showAssessmentOverlay() {
    var ov = document.getElementById("sco-assessment-overlay");
    var scoreEl = document.getElementById("sco-assessment-score-line");
    var metaEl = document.getElementById("sco-assessment-attempts-line");
    var pct = scorePercent();
    var passed = successStatusForMastery() === "passed";
    if (scoreEl) {
      scoreEl.textContent =
        "Your score: " +
        pct +
        "% (" +
        (passed ? "passed" : "not passed") +
        ").";
    }
    if (metaEl) {
      var meta =
        "Submitted attempts: " +
        assessmentSubmitCount +
        (ASSESSMENT_ATTEMPTS_LIMIT != null
          ? " of " + ASSESSMENT_ATTEMPTS_LIMIT + " allowed."
          : " (unlimited).");
      metaEl.textContent = meta;
    }
    if (ov) ov.hidden = false;
    postSubmitOverlayVisible = true;
    updateFooterNav();
  }

  function onRetakeAssessment() {
    hideAssessmentOverlay();
    resetAssessmentFromOriginals();
    showPage(0);
    callAPI("SetValue", "cmi.completion_status", "incomplete");
    callAPI("SetValue", "cmi.success_status", "unknown");
    saveSuspend();
  }

  function onExitLms() {
    hideAssessmentOverlay();
    finishLms();
  }

  function wireAssessmentOverlay() {
    var retake = document.getElementById("sco-retake-assessment");
    var exitBtn = document.getElementById("sco-exit-lms");
    if (retake) retake.addEventListener("click", onRetakeAssessment);
    if (exitBtn) exitBtn.addEventListener("click", onExitLms);
  }

  function restoreSuspend() {
    var raw = callAPI("GetValue", "cmi.suspend_data");
    try {
      var o = raw ? JSON.parse(raw) : {};
      if (typeof o.page === "number" && o.page >= 0 && o.page < totalPages) {
        currentPage = o.page;
      }
      if (typeof o.c === "number" && o.c >= 0) {
        assessmentCorrect = o.c;
      }
      if (typeof o.s === "number" && o.s >= 0) {
        assessmentSubmitCount = Math.floor(o.s);
      }
    } catch {}
  }

  function handleLastPageComplete() {
    if (assessmentTotal === 0) {
      writeScoreCommit();
      finishLms();
      return;
    }
    if (postSubmitOverlayVisible) return;
    if (
      ASSESSMENT_ATTEMPTS_LIMIT != null &&
      assessmentSubmitCount >= ASSESSMENT_ATTEMPTS_LIMIT
    ) {
      return;
    }
    assessmentSubmitCount += 1;
    writeScoreCommit();
    saveSuspend();
    var limited = ASSESSMENT_ATTEMPTS_LIMIT != null;
    var exhausted =
      limited && assessmentSubmitCount >= ASSESSMENT_ATTEMPTS_LIMIT;
    if (exhausted) {
      finishLms();
    } else {
      showAssessmentOverlay();
    }
  }

  function onNext() {
    if (currentPage >= totalPages - 1) {
      handleLastPageComplete();
      return;
    }
    showPage(currentPage + 1);
  }

  function onPrev() {
    showPage(currentPage - 1);
  }

  function onKey(e) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      onNext();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onPrev();
    }
  }

  function boot() {
    api = findAPI(window) || mockAPI();
    callAPI("Initialize", "");
    pageEls = [].slice.call(document.querySelectorAll(".sco-page"));
    totalPages = pageEls.length;
    initAllTabs();
    initAllClickReveal();
    initImageGridLinks();
    document.querySelectorAll(".cb-carousel").forEach(initCarousel);
    captureAssessmentHtml();
    initAssessments();
    restoreSuspend();
    showPage(currentPage);
    var prev = document.getElementById("sco-prev");
    var next = document.getElementById("sco-next");
    if (prev) prev.addEventListener("click", onPrev);
    if (next) next.addEventListener("click", onNext);
    wireAssessmentOverlay();
    window.addEventListener("keydown", onKey);
    callAPI("SetValue", "cmi.completion_status", "incomplete");
    saveSuspend();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

