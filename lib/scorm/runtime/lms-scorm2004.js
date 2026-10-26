/**
 * SCORM 2004 adapter for player.js. Falls back to a localStorage-backed mock
 * when no LMS API is found (local preview).
 */
window.CBL_LMS = (function () {
  var api = null;

  function findAPI(win) {
    var w = win;
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
    var storageKey = "cbl-scorm2004:" + document.title;
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
      Initialize: function () {
        return "true";
      },
      Terminate: function () {
        persist();
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
        persist();
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

  function call(method, a, b) {
    if (!api) return "";
    try {
      return api[method](a, b);
    } catch {
      return "";
    }
  }

  function set(key, value) {
    call("SetValue", key, value);
  }

  return {
    init: function () {
      api = findAPI(window) || mockAPI();
      call("Initialize", "");
    },
    getSuspendData: function () {
      return call("GetValue", "cmi.suspend_data");
    },
    saveProgress: function (suspendData, location) {
      set("cmi.suspend_data", suspendData);
      set("cmi.location", String(location));
      call("Commit", "");
    },
    markIncomplete: function () {
      set("cmi.completion_status", "incomplete");
    },
    resetForRetake: function () {
      set("cmi.completion_status", "incomplete");
      set("cmi.success_status", "unknown");
    },
    writeResult: function (scorePercent, passed) {
      set("cmi.completion_status", "completed");
      set("cmi.success_status", passed ? "passed" : "failed");
      set("cmi.score.min", "0");
      set("cmi.score.max", "100");
      set("cmi.score.raw", String(scorePercent));
      set("cmi.score.scaled", (scorePercent / 100).toFixed(4));
      call("Commit", "");
    },
    finish: function () {
      call("Terminate", "");
    },
  };
})();
