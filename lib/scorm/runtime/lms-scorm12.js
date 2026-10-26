/**
 * SCORM 1.2 adapter for player.js. Falls back to a localStorage-backed mock
 * when no LMS API is found (standalone HTML export, local preview).
 */
window.CBL_LMS = (function () {
  var api = null;

  function findAPI(win) {
    var w = win;
    var n = 0;
    while (w && n < 32) {
      if (w.API) return w.API;
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
    var storageKey = "cbl-scorm:" + document.title;
    var store = {};
    try {
      store = JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
    } catch {
      store = {};
    }
    function persist() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(store));
      } catch {
        /* storage unavailable (private mode, file://) */
      }
    }
    return {
      LMSInitialize: function () {
        return "true";
      },
      LMSFinish: function () {
        persist();
        return "true";
      },
      LMSGetValue: function (k) {
        return store[k] != null ? String(store[k]) : "";
      },
      LMSSetValue: function (k, v) {
        store[k] = v;
        return "true";
      },
      LMSCommit: function () {
        persist();
        return "true";
      },
      LMSGetLastError: function () {
        return "0";
      },
      LMSGetErrorString: function () {
        return "";
      },
      LMSGetDiagnostic: function () {
        return "";
      },
    };
  }

  function call(method, a, b) {
    if (!api) return "";
    try {
      return api[method](a, b);
    } catch {
      return "";
    }
  }

  function set(key, value) {
    call("LMSSetValue", key, value);
  }

  return {
    init: function () {
      api = findAPI(window) || mockAPI();
      call("LMSInitialize", "");
    },
    getSuspendData: function () {
      return call("LMSGetValue", "cmi.suspend_data");
    },
    saveProgress: function (suspendData, location) {
      set("cmi.suspend_data", suspendData);
      set("cmi.core.lesson_location", String(location));
      call("LMSCommit", "");
    },
    markIncomplete: function () {
      set("cmi.core.lesson_status", "incomplete");
    },
    resetForRetake: function () {
      set("cmi.core.lesson_status", "incomplete");
    },
    /** SCORM Cloud maps Success from passed/failed, not "completed". */
    writeResult: function (scorePercent, passed) {
      set("cmi.core.lesson_status", passed ? "passed" : "failed");
      set("cmi.core.score.min", "0");
      set("cmi.core.score.max", "100");
      set("cmi.core.score.raw", String(scorePercent));
      call("LMSCommit", "");
    },
    finish: function () {
      call("LMSFinish", "");
    },
  };
})();
