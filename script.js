(function () {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  var clockPaused = false;
  var SHIP_DEFAULTS = window.__ERRORMADE_DEFAULTS__ || {};

  function shipDefault(key, fallback) {
    if (Object.prototype.hasOwnProperty.call(SHIP_DEFAULTS, key)) {
      return String(SHIP_DEFAULTS[key]);
    }
    return fallback;
  }

  function readParam(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      if (value != null) return value;
    } catch (error) {}
    return shipDefault(key, fallback);
  }

  // --- Shared params (dev-params.json) — desktop + phone stay in sync via local server ---
  var sharedParamsTimer = 0;
  var sharedParamsSilent = false;
  function collectSharedParams() {
    var data = { __stamp: String(Date.now()) };
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf("errormade-") === 0) {
          data[key] = localStorage.getItem(key);
        }
      }
    } catch (error) {}
    return data;
  }
  function pushSharedParams() {
    sharedParamsTimer = 0;
    if (sharedParamsSilent) return;
    try {
      fetch("dev-params.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collectSharedParams()),
      }).catch(function () {});
    } catch (error) {}
  }
  function scheduleSharedParamsPush() {
    if (sharedParamsSilent) return;
    window.clearTimeout(sharedParamsTimer);
    sharedParamsTimer = window.setTimeout(pushSharedParams, 280);
  }
  function saveSharedParamsAsDefault(btn) {
    window.clearTimeout(sharedParamsTimer);
    sharedParamsTimer = 0;
    var data = collectSharedParams();
    data.__replace__ = true;
    try {
      localStorage.setItem("errormade-dev-params-stamp", String(data.__stamp));
    } catch (error) {}
    Object.keys(data).forEach(function (key) {
      if (key.indexOf("errormade-") === 0) {
        SHIP_DEFAULTS[key] = String(data[key]);
      }
    });
    SHIP_DEFAULTS.__stamp = String(data.__stamp);
    window.__ERRORMADE_DEFAULTS__ = SHIP_DEFAULTS;

    var label = btn ? btn.textContent : "";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "saving…";
    }
    return fetch("dev-params.json", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("save failed");
        if (btn) btn.textContent = "saved";
      })
      .catch(function () {
        if (btn) btn.textContent = "save failed";
      })
      .then(function () {
        if (!btn) return;
        window.setTimeout(function () {
          btn.disabled = false;
          btn.textContent = label || "save as default";
        }, 1200);
      });
  }
  function wireParamsSaveButtons() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-params-save]"), function (btn) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        saveSharedParamsAsDefault(btn);
      });
    });
  }
  try {
    var nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      nativeSetItem.call(this, key, value);
      if (String(key).indexOf("errormade-") === 0) scheduleSharedParamsPush();
    };
  } catch (error) {}

  function tickClock() {
    if (clockPaused) return;
    var clock = document.getElementById("live-clock");
    if (!clock) return;
    var now = new Date();
    clock.textContent =
      pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }

  tickClock();
  setInterval(tickClock, 1000);

  // Intro via rAF + !important inline styles.
  // iOS: parent zoom() kills descendant filter:blur — no cluster zoom during intro.
  // iOS: avoid permanent DOM wraps (they ate link underlines).
  var COMPACT_MQ =
    "(max-width: 1280px), (pointer: coarse), (any-pointer: coarse), (hover: none)";
  var homeClusterZoom = "";

  function unwrapIntroBlurInner(root) {
    if (!root) return;
    var inners = root.querySelectorAll ? root.querySelectorAll(".intro-blur-inner") : [];
    Array.prototype.forEach.call(inners, function (inner) {
      var parent = inner.parentNode;
      if (!parent) return;
      while (inner.firstChild) parent.insertBefore(inner.firstChild, inner);
      parent.removeChild(inner);
    });
  }

  function introBlurNodes(el) {
    if (!el) return [];
    if (el.classList.contains("logo")) {
      var img = el.querySelector("img");
      return img ? [img] : [];
    }
    if (el.classList.contains("howto-teaser")) {
      var nodes = [];
      var image = el.querySelector(".howto-teaser-image");
      var text = el.querySelector(".howto-teaser-text");
      if (image) nodes.push(image);
      if (text) nodes.push(text);
      return nodes.length ? nodes : [el];
    }
    if (el.classList.contains("uiworks-scrub-wrap") || el.classList.contains("uiworks-column-wrap")) {
      var child = el.firstElementChild;
      return child ? [child] : [el];
    }
    // Links / clock / params — blur on the element (desktop-identical).
    return [el];
  }

  function clearIntroBlur(el) {
    introBlurNodes(el).forEach(function (node) {
      node.style.removeProperty("filter");
      node.style.removeProperty("-webkit-filter");
    });
    if (el) {
      el.style.removeProperty("filter");
      el.style.removeProperty("-webkit-filter");
    }
  }

  function clearIntroInline(el) {
    if (!el) return;
    unwrapIntroBlurInner(el);
    el.style.removeProperty("opacity");
    el.style.removeProperty("filter");
    el.style.removeProperty("-webkit-filter");
    el.style.removeProperty("transform");
    el.style.removeProperty("transform-origin");
    el.style.removeProperty("transition");
    el.style.removeProperty("will-change");
    el.style.removeProperty("pointer-events");
    el.style.removeProperty("mix-blend-mode");
    el.style.removeProperty("margin-top");
    el.style.removeProperty("zoom");
    el.style.removeProperty("font-size");
    clearIntroBlur(el);
  }

  function setIntroBlur(el, blur) {
    var value = blur > 0.05 ? "blur(" + blur + "px)" : "";
    var nodes = introBlurNodes(el);
    var blurOnChildOnly = nodes.length > 0 && nodes.indexOf(el) === -1;
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (value) {
        node.style.setProperty("filter", value, "important");
        node.style.setProperty("-webkit-filter", value, "important");
      } else {
        node.style.removeProperty("filter");
        node.style.removeProperty("-webkit-filter");
      }
    }
    if (blurOnChildOnly) {
      el.style.removeProperty("filter");
      el.style.removeProperty("-webkit-filter");
    }
  }

  function setIntroPaint(el, opacity, blur, rise, scale, origin) {
    el.style.setProperty("transition", "none", "important");
    el.style.setProperty("opacity", String(opacity), "important");
    el.style.setProperty("mix-blend-mode", "normal", "important");
    el.style.setProperty("pointer-events", "none", "important");
    el.style.removeProperty("margin-top");
    el.style.removeProperty("zoom");
    el.style.removeProperty("font-size");
    if (origin) el.style.setProperty("transform-origin", origin, "important");
    el.style.setProperty(
      "transform",
      "translate3d(0, " + rise + "px, 0) scale(" + scale + ")",
      "important"
    );
    setIntroBlur(el, blur);
  }

  function setIntroFrom(el, from, origin) {
    var rise = from && from.rise != null ? Number(from.rise) : 0;
    var scale = from && from.scale != null ? Number(from.scale) : 1;
    var blur = from && from.blur != null ? Number(from.blur) : 0;
    if (!isFinite(rise)) rise = 0;
    if (!isFinite(scale)) scale = 1;
    if (!isFinite(blur)) blur = 0;
    setIntroPaint(el, 0, blur, rise, scale, origin || (from && from.origin) || "center center");
  }

  function animateIntroEl(el, from, durationMs, isCancelled) {
    return new Promise(function (resolve) {
      if (!el) {
        resolve();
        return;
      }
      var rise = from && from.rise != null ? Number(from.rise) : 0;
      var scale = from && from.scale != null ? Number(from.scale) : 1;
      var blur = from && from.blur != null ? Number(from.blur) : 0;
      if (!isFinite(rise)) rise = 0;
      if (!isFinite(scale)) scale = 1;
      if (!isFinite(blur)) blur = 0;
      if (!(durationMs > 0)) durationMs = 180;
      var origin = (from && from.origin) || "center center";

      setIntroFrom(el, { blur: blur, rise: rise, scale: scale, origin: origin }, origin);
      void el.offsetWidth;

      var start = performance.now();
      var settled = false;
      var raf = 0;
      function settle() {
        if (settled) return;
        settled = true;
        if (raf) cancelAnimationFrame(raf);
        window.clearTimeout(failsafe);
        setIntroPaint(el, 1, 0, 0, 1, origin);
        el.style.removeProperty("pointer-events");
        resolve();
      }
      var failsafe = window.setTimeout(settle, durationMs + 200);

      function frame(now) {
        if (settled) return;
        if (isCancelled && isCancelled()) {
          settle();
          return;
        }
        var t = Math.min(1, (now - start) / durationMs);
        var e = 1 - Math.pow(1 - t, 3);
        setIntroPaint(el, e, blur * (1 - e), rise * (1 - e), scale + (1 - scale) * e, origin);
        if (t < 1) raf = requestAnimationFrame(frame);
        else settle();
      }
      raf = requestAnimationFrame(frame);
    });
  }

  function syncHomeClusterScale() {
    var cluster = document.querySelector(".home-cluster");
    if (!cluster) return;
    // Never zoom the cluster — parent zoom kills filter:blur on iOS Safari.
    // Mobile artboard is already 393px; center it and let narrow phones overflow slightly.
    homeClusterZoom = "";
    cluster.style.removeProperty("zoom");
    document.documentElement.style.removeProperty("--home-fit");
  }

  var compactHomeMq = window.matchMedia(COMPACT_MQ);
  function homeOverlayOpen() {
    return !!document.querySelector(
      ".uiworks-window.is-open, .howto-window.is-open, .params-modal.is-open"
    );
  }
  document.addEventListener(
    "touchmove",
    function (event) {
      if (!compactHomeMq.matches || homeOverlayOpen()) return;
      if (event.target && event.target.closest) {
        if (event.target.closest(".params-panel, .params-modal, .howto-guide, .uiworks-column")) {
          return;
        }
      }
      event.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener(
    "scroll",
    function () {
      if (!compactHomeMq.matches || homeOverlayOpen()) return;
      if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    },
    { passive: true }
  );

  var overlays = {
    "#guide": {
      el: document.getElementById("guide-window"),
      trigger: document.querySelector(".howto-teaser"),
      onOpen: function (overlay) {
        var guide = overlay.querySelector(".howto-guide");
        if (guide) guide.scrollTop = 0;
      },
    },
    "#ui-works": {
      el: document.getElementById("uiworks-window"),
      trigger: document.querySelector(".link-ui-works"),
    },
    "#graphic-works": {
      el: document.getElementById("graphicworks-window"),
      trigger: document.querySelector(".link-graphic-works"),
    },
  };

  function isOpen(overlay) {
    return overlay.classList.contains("is-open");
  }

  function closeAllParams() {
    document.querySelectorAll(".params-modal").forEach(function (modal) {
      modal.classList.remove("is-open");
      modal.hidden = true;
    });
    document.body.classList.remove("is-params-open");
  }

  var settleHomeIntro = function () {};
  var playHomeIntro = function () {};

  function closeAll(push) {
    closeAllParams();
    var anyWasOpen = false;
    Object.keys(overlays).forEach(function (hash) {
      var item = overlays[hash];
      if (!item.el) return;
      var wasOpen = isOpen(item.el);
      item.el.classList.remove("is-open");
      item.el.hidden = true;
      if (wasOpen && item.onClose) item.onClose(item.el);
      if (wasOpen) anyWasOpen = true;
    });
    if (anyWasOpen) playHomeIntro();
    if (push && location.hash) {
      history.pushState({ overlay: false }, "", location.pathname + location.search);
    }
  }

  function openOverlay(hash, push) {
    settleHomeIntro();
    Object.keys(overlays).forEach(function (key) {
      var item = overlays[key];
      if (!item.el) return;
      if (key === hash) {
        item.el.hidden = false;
        item.el.classList.add("is-open");
        if (item.onOpen) item.onOpen(item.el);
        var closeBtn = item.el.querySelector(".howto-stage > .close, .uiworks-stage > .close");
        if (closeBtn) closeBtn.focus();
      } else {
        var wasOpen = isOpen(item.el);
        item.el.classList.remove("is-open");
        item.el.hidden = true;
        if (wasOpen && item.onClose) item.onClose(item.el);
      }
    });
    closeAllParams();
    if (push && location.hash !== hash) {
      history.pushState({ overlay: hash }, "", hash);
    }
  }

  function syncFromHash() {
    var hash = location.hash;
    if (overlays[hash] && overlays[hash].el) {
      openOverlay(hash, false);
    } else {
      closeAll(false);
    }
  }

  Object.keys(overlays).forEach(function (hash) {
    var item = overlays[hash];
    if (!item.el || !item.trigger) return;

    item.trigger.addEventListener("click", function (event) {
      event.preventDefault();
      if (!isOpen(item.el)) openOverlay(hash, true);
    });

    var closeBtn = item.el.querySelector(".howto-stage > .close, .uiworks-stage > .close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        closeAll(true);
      });
    }
  });

  var guideOverlay = overlays["#guide"].el;
  var guide = guideOverlay && guideOverlay.querySelector(".howto-guide");
  if (guideOverlay && guide) {
    guideOverlay.addEventListener(
      "wheel",
      function (event) {
        if (event.target.closest(".howto-guide")) return;
        event.preventDefault();
        guide.scrollTop += event.deltaY;
      },
      { passive: false }
    );
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var openParamsModal = document.querySelector(".params-modal.is-open");
    if (openParamsModal) {
      openParamsModal.classList.remove("is-open");
      openParamsModal.hidden = true;
      if (!document.querySelector(".params-modal.is-open")) {
        document.body.classList.remove("is-params-open");
      }
      var paramsWin = openParamsModal.closest(".uiworks-window");
      var paramsBtn =
        (paramsWin && paramsWin.querySelector(".uiworks-params")) ||
        document.getElementById(openParamsModal.id.replace("-params-modal", "-params-open"));
      if (paramsBtn) paramsBtn.focus();
      return;
    }
    closeAll(true);
  });

  window.addEventListener("popstate", syncFromHash);
  window.addEventListener("hashchange", syncFromHash);

  initHomeParams();
  initHomeSpray();
  wireParamsSaveButtons();
  syncHomeClusterScale();
  window.addEventListener("resize", syncHomeClusterScale);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", syncHomeClusterScale);
  }
  if (compactHomeMq.addEventListener) {
    compactHomeMq.addEventListener("change", syncHomeClusterScale);
  } else if (compactHomeMq.addListener) {
    compactHomeMq.addListener(syncHomeClusterScale);
  }

  var WORKS_LAYOUT_PREFIX = "errormade-graphicworks";
  var worksLayoutListeners = [];

  function publishWorksLayout(originId) {
    worksLayoutListeners.forEach(function (entry) {
      if (!entry || entry.id === originId || typeof entry.reload !== "function") return;
      entry.reload();
    });
  }

  initWorksPanel({
    prefix: "uiworks",
    dbName: "errormade-internal",
    store: "uiworks-media",
    keyPrefix: WORKS_LAYOUT_PREFIX,
    hash: "#ui-works",
    manifest: "assets/works/ui.json",
    manifestId: "uiworks-manifest",
  });
  initWorksPanel({
    prefix: "graphicworks",
    dbName: "errormade-graphicworks",
    store: "media",
    keyPrefix: WORKS_LAYOUT_PREFIX,
    hash: "#graphic-works",
    manifest: "assets/works/graphic.json",
    manifestId: "graphicworks-manifest",
  });

  syncFromHash();

  function initHomeParams() {
    var openBtn = document.getElementById("home-params-open");
    var closeBtn = document.getElementById("home-params-close");
    var paramsModal = document.getElementById("home-params-modal");
    var toggle = document.getElementById("home-hover-blur-toggle");
    var fields = document.getElementById("home-hover-fields");
    var blurRange = document.getElementById("home-hover-blur");
    var blurNumber = document.getElementById("home-hover-blur-number");
    var speedRange = document.getElementById("home-hover-speed");
    var speedNumber = document.getElementById("home-hover-speed-number");
    var hoverScaleRange = document.getElementById("home-hover-scale");
    var hoverScaleNumber = document.getElementById("home-hover-scale-number");
    var othersScaleRange = document.getElementById("home-others-scale");
    var othersScaleNumber = document.getElementById("home-others-scale-number");
    var hideCursor = document.getElementById("home-hover-hide-cursor");
    var followToggle = document.getElementById("home-hover-follow");
    var followField = document.getElementById("home-hover-follow-field");
    var followRange = document.getElementById("home-hover-follow-amount");
    var followNumber = document.getElementById("home-hover-follow-amount-number");
    var blendToggle = document.getElementById("home-blend-difference");
    if (
      !openBtn ||
      !closeBtn ||
      !paramsModal ||
      !toggle ||
      !fields ||
      !blurRange ||
      !blurNumber ||
      !speedRange ||
      !speedNumber ||
      !hoverScaleRange ||
      !hoverScaleNumber ||
      !othersScaleRange ||
      !othersScaleNumber ||
      !hideCursor ||
      !followToggle ||
      !followField ||
      !followRange ||
      !followNumber ||
      !blendToggle
    ) {
      return;
    }

    var ON_KEY = "errormade-home-hover-blur-on";
    var BLUR_KEY = "errormade-home-hover-blur";
    var SPEED_KEY = "errormade-home-hover-speed";
    var HOVER_SCALE_KEY = "errormade-home-hover-scale";
    var OTHERS_SCALE_KEY = "errormade-home-others-scale";
    var HIDE_CURSOR_KEY = "errormade-home-hover-hide-cursor";
    var FOLLOW_KEY = "errormade-home-hover-follow";
    var FOLLOW_AMOUNT_KEY = "errormade-home-hover-follow-amount";
    var BLEND_KEY = "errormade-home-blend-difference";
    var followTarget = null;
    var followOrigin = null;
    var followAmount = 10;
    var followOn = false;

    function readStorage(key, fallback) {
      return readParam(key, fallback);
    }

    function writeStorage(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {}
    }

    function clamp(value, min, max, fallback, decimals) {
      var factor = Math.pow(10, decimals);
      var next = Math.round(Number(value) * factor) / factor;
      if (!isFinite(next)) return fallback;
      if (next < min) return min;
      if (next > max) return max;
      return next;
    }

    function bindNumber(rangeEl, numberEl, options) {
      function apply(value, persist) {
        var next = clamp(value, options.min, options.max, options.fallback, options.decimals);
        rangeEl.value = String(next);
        numberEl.value = String(next);
        if (options.cssVar) {
          document.body.style.setProperty(options.cssVar, next + (options.unit || ""));
        }
        if (options.onApply) options.onApply(next);
        if (persist) writeStorage(options.key, String(next));
        return next;
      }
      rangeEl.addEventListener("input", function () {
        apply(rangeEl.value, true);
      });
      numberEl.addEventListener("input", function () {
        apply(numberEl.value, true);
      });
      apply(readStorage(options.key, String(options.fallback)), false);
    }

    function applyEnabled(on, persist) {
      toggle.checked = on;
      fields.hidden = !on;
      document.body.classList.toggle("is-hover-blur", on);
      if (!on) clearHovered();
      if (persist) writeStorage(ON_KEY, on ? "1" : "0");
    }

    function applyHideCursor(on, persist) {
      hideCursor.checked = on;
      document.body.classList.toggle("is-hover-hide-cursor", on);
      if (persist) writeStorage(HIDE_CURSOR_KEY, on ? "1" : "0");
    }

    function applyBlendDifference(on, persist) {
      // Difference blend is broken on iPhone/Safari touch — never enable there.
      if (window.matchMedia(COMPACT_MQ).matches) on = false;
      blendToggle.checked = on;
      document.body.classList.toggle("is-blend-difference", on);
      if (persist) writeStorage(BLEND_KEY, on ? "1" : "0");
    }

    function applyFollowEnabled(on, persist) {
      followOn = on;
      followToggle.checked = on;
      followField.hidden = !on;
      if (!on) resetFollow(followTarget);
      if (persist) writeStorage(FOLLOW_KEY, on ? "1" : "0");
    }

    function resetFollow(el) {
      if (!el) return;
      el.style.removeProperty("--home-hover-x");
      el.style.removeProperty("--home-hover-y");
    }

    function captureFollowOrigin(el) {
      var rect = el.getBoundingClientRect();
      followTarget = el;
      followOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        hw: Math.max(rect.width / 2, 1),
        hh: Math.max(rect.height / 2, 1),
      };
    }

    function applyFollow(event) {
      if (!followOn || !followTarget || !followOrigin || !event) return;
      var nx = (event.clientX - followOrigin.x) / followOrigin.hw;
      var ny = (event.clientY - followOrigin.y) / followOrigin.hh;
      if (nx > 1.5) nx = 1.5;
      if (nx < -1.5) nx = -1.5;
      if (ny > 1.5) ny = 1.5;
      if (ny < -1.5) ny = -1.5;
      followTarget.style.setProperty("--home-hover-x", nx * followAmount + "px");
      followTarget.style.setProperty("--home-hover-y", ny * followAmount + "px");
    }

    function clearHovered() {
      resetFollow(followTarget);
      followTarget = null;
      followOrigin = null;
      document.body.classList.remove("is-home-hovering");
      Array.prototype.forEach.call(document.querySelectorAll(".home-hover-target.is-hovered"), function (node) {
        node.classList.remove("is-hovered");
      });
    }

    function setHovered(target, event) {
      if (!document.body.classList.contains("is-hover-blur") || !target) {
        clearHovered();
        return;
      }
      var prev = document.querySelector(".home-hover-target.is-hovered");
      if (prev && prev !== target) resetFollow(prev);
      Array.prototype.forEach.call(document.querySelectorAll(".home-hover-target"), function (node) {
        node.classList.toggle("is-hovered", node === target);
      });
      document.body.classList.add("is-home-hovering");
      captureFollowOrigin(target);
      applyFollow(event);
    }

    Array.prototype.forEach.call(document.querySelectorAll(".home-hover-target"), function (el) {
      el.addEventListener("pointerenter", function (event) {
        setHovered(el, event);
      });
      el.addEventListener("pointerleave", function (event) {
        var next = event.relatedTarget && event.relatedTarget.closest
          ? event.relatedTarget.closest(".home-hover-target")
          : null;
        if (next) return;
        clearHovered();
      });
    });

    document.addEventListener(
      "pointermove",
      function (event) {
        applyFollow(event);
      },
      { passive: true }
    );

    function openParams() {
      paramsModal.hidden = false;
      paramsModal.classList.add("is-open");
      document.body.classList.add("is-params-open");
    }

    function closeParams() {
      paramsModal.classList.remove("is-open");
      paramsModal.hidden = true;
      document.body.classList.remove("is-params-open");
    }

    openBtn.addEventListener("click", openParams);

    closeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeParams();
      openBtn.focus();
    });

    paramsModal.addEventListener("click", function (event) {
      if (event.target === paramsModal) closeParams();
    });

    toggle.addEventListener("change", function () {
      applyEnabled(toggle.checked, true);
    });

    hideCursor.addEventListener("change", function () {
      applyHideCursor(hideCursor.checked, true);
    });

    blendToggle.addEventListener("change", function () {
      applyBlendDifference(blendToggle.checked, true);
    });

    followToggle.addEventListener("change", function () {
      applyFollowEnabled(followToggle.checked, true);
    });

    bindNumber(blurRange, blurNumber, {
      key: BLUR_KEY,
      min: 0,
      max: 24,
      fallback: 8,
      decimals: 1,
      cssVar: "--home-hover-blur",
      unit: "px",
    });
    bindNumber(speedRange, speedNumber, {
      key: SPEED_KEY,
      min: 0,
      max: 2,
      fallback: 0.1,
      decimals: 2,
      cssVar: "--home-hover-speed",
      unit: "s",
    });
    bindNumber(hoverScaleRange, hoverScaleNumber, {
      key: HOVER_SCALE_KEY,
      min: -3,
      max: 3,
      fallback: 1,
      decimals: 2,
      cssVar: "--home-hover-scale",
      unit: "",
    });
    bindNumber(othersScaleRange, othersScaleNumber, {
      key: OTHERS_SCALE_KEY,
      min: -3,
      max: 3,
      fallback: 1,
      decimals: 2,
      cssVar: "--home-others-scale",
      unit: "",
    });
    bindNumber(followRange, followNumber, {
      key: FOLLOW_AMOUNT_KEY,
      min: 0,
      max: 40,
      fallback: 10,
      decimals: 0,
      onApply: function (next) {
        followAmount = next;
      },
    });

    applyFollowEnabled(readStorage(FOLLOW_KEY, "1") === "1", false);
    applyHideCursor(readStorage(HIDE_CURSOR_KEY, "0") === "1", false);
    applyBlendDifference(readStorage(BLEND_KEY, "1") === "1", false);
    applyEnabled(readStorage(ON_KEY, "1") === "1", false);
    if (compactHomeMq && compactHomeMq.addEventListener) {
      compactHomeMq.addEventListener("change", function () {
        applyBlendDifference(readStorage(BLEND_KEY, "1") === "1", false);
      });
    }

    initHomeIntro({
      logoBlurRange: document.getElementById("home-intro-logo-blur"),
      logoBlurNumber: document.getElementById("home-intro-logo-blur-number"),
      restBlurRange: document.getElementById("home-intro-rest-blur"),
      restBlurNumber: document.getElementById("home-intro-rest-blur-number"),
      speedRange: document.getElementById("home-intro-speed"),
      speedNumber: document.getElementById("home-intro-speed-number"),
      delayRange: document.getElementById("home-intro-delay"),
      delayNumber: document.getElementById("home-intro-delay-number"),
      logoScaleRange: document.getElementById("home-intro-logo-scale"),
      logoScaleNumber: document.getElementById("home-intro-logo-scale-number"),
      logoRiseRange: document.getElementById("home-intro-logo-rise"),
      logoRiseNumber: document.getElementById("home-intro-logo-rise-number"),
      restScaleRange: document.getElementById("home-intro-rest-scale"),
      restScaleNumber: document.getElementById("home-intro-rest-scale-number"),
      restRiseRange: document.getElementById("home-intro-rest-rise"),
      restRiseNumber: document.getElementById("home-intro-rest-rise-number"),
      restRiseRandomToggle: document.getElementById("home-intro-rest-rise-random"),
      scrambleToggle: document.getElementById("home-intro-scramble"),
      randomizeToggle: document.getElementById("home-intro-randomize"),
      replayBtn: document.getElementById("home-intro-replay"),
      bindNumber: bindNumber,
      writeStorage: writeStorage,
      readStorage: readStorage,
      clamp: clamp,
    });
  }

  function initHomeIntro(opts) {
    var logoBlurRange = opts.logoBlurRange;
    var logoBlurNumber = opts.logoBlurNumber;
    var restBlurRange = opts.restBlurRange;
    var restBlurNumber = opts.restBlurNumber;
    var speedRange = opts.speedRange;
    var speedNumber = opts.speedNumber;
    var delayRange = opts.delayRange;
    var delayNumber = opts.delayNumber;
    var logoScaleRange = opts.logoScaleRange;
    var logoScaleNumber = opts.logoScaleNumber;
    var logoRiseRange = opts.logoRiseRange;
    var logoRiseNumber = opts.logoRiseNumber;
    var restScaleRange = opts.restScaleRange;
    var restScaleNumber = opts.restScaleNumber;
    var restRiseRange = opts.restRiseRange;
    var restRiseNumber = opts.restRiseNumber;
    var restRiseRandomToggle = opts.restRiseRandomToggle;
    var scrambleToggle = opts.scrambleToggle;
    var randomizeToggle = opts.randomizeToggle;
    var replayBtn = opts.replayBtn;
    if (
      !logoBlurRange ||
      !logoBlurNumber ||
      !restBlurRange ||
      !restBlurNumber ||
      !speedRange ||
      !speedNumber ||
      !delayRange ||
      !delayNumber ||
      !logoScaleRange ||
      !logoScaleNumber ||
      !logoRiseRange ||
      !logoRiseNumber ||
      !restScaleRange ||
      !restScaleNumber ||
      !restRiseRange ||
      !restRiseNumber ||
      !restRiseRandomToggle ||
      !scrambleToggle ||
      !randomizeToggle ||
      !replayBtn
    ) {
      return;
    }

    var INTRO_LOGO_BLUR_KEY = "errormade-home-intro-logo-blur";
    var INTRO_REST_BLUR_KEY = "errormade-home-intro-rest-blur";
    var INTRO_SPEED_KEY = "errormade-home-intro-speed";
    var INTRO_DELAY_KEY = "errormade-home-intro-delay";
    var INTRO_LOGO_SCALE_KEY = "errormade-home-intro-logo-scale";
    var INTRO_LOGO_RISE_KEY = "errormade-home-intro-logo-rise";
    var INTRO_REST_SCALE_KEY = "errormade-home-intro-rest-scale";
    var INTRO_REST_RISE_KEY = "errormade-home-intro-rest-rise";
    var INTRO_REST_RISE_RANDOM_KEY = "errormade-home-intro-rest-rise-random";
    var INTRO_SCRAMBLE_KEY = "errormade-home-intro-scramble";
    var INTRO_RANDOMIZE_KEY = "errormade-home-intro-randomize";
    var SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var introToken = 0;
    var introSavedHoverBlur = false;
    var introSavedBlendDifference = false;
    var scrambleOn = false;
    var randomizeOn = false;
    var restRiseRandomOn = false;
    var speedSec = 0.55;
    var delaySec = 0.25;
    var restRisePx = 40;
    var restBlurPx = 0;
    var restScale = 0.85;
    var logoBlurPx = 0;
    var logoScale = 1;
    var logoRisePx = 0;

    function introItems() {
      return Array.prototype.slice.call(document.querySelectorAll(".home-intro-item"));
    }

    function scrambleTarget(el) {
      if (!el || el.getAttribute("data-intro") === "logo") return null;
      if (el.classList.contains("howto-teaser")) {
        return el.querySelector(".howto-teaser-text") || null;
      }
      return el;
    }

    function storeOriginalText(el) {
      var target = scrambleTarget(el);
      if (!target) return;
      if (target.dataset.introText == null) {
        target.dataset.introText = target.textContent;
      }
    }

    function restoreOriginalText(el) {
      var target = scrambleTarget(el);
      if (!target || target.dataset.introText == null) return;
      target.textContent = target.dataset.introText;
    }

    function scrambleElement(el, durationMs, token) {
      var target = scrambleTarget(el);
      if (!target) return Promise.resolve();
      unwrapIntroBlurInner(el);
      storeOriginalText(el);
      var original = target.dataset.introText || target.textContent;
      if (!original) return Promise.resolve();
      target.dataset.introText = original;

      return new Promise(function (resolve) {
        var start = performance.now();
        var done = false;
        var raf = 0;
        function finish() {
          if (done) return;
          done = true;
          if (raf) cancelAnimationFrame(raf);
          if (token === introToken) target.textContent = original;
          resolve();
        }
        function tick(now) {
          if (token !== introToken) {
            finish();
            return;
          }
          var t = Math.min(1, (now - start) / Math.max(durationMs, 1));
          var reveal = Math.floor(t * original.length);
          var out = "";
          for (var i = 0; i < original.length; i++) {
            var ch = original.charAt(i);
            if (ch === " " || ch === "\n" || ch === "\r" || ch === "\t") {
              out += ch;
            } else if (i < reveal) {
              out += ch;
            } else {
              out += SCRAMBLE_CHARS.charAt(Math.floor(Math.random() * SCRAMBLE_CHARS.length));
            }
          }
          target.textContent = out;
          if (t >= 1) {
            finish();
            return;
          }
          raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
      });
    }

    function wait(ms, token) {
      if (!(ms > 0)) return Promise.resolve();
      return waitUntil(performance.now() + ms, token);
    }

    function waitUntil(deadline, token) {
      return new Promise(function (resolve) {
        function tick(now) {
          if (token != null && token !== introToken) {
            resolve();
            return;
          }
          if (now >= deadline) {
            resolve();
            return;
          }
          requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }

    function nextFrame() {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });
    }

    function shuffle(list) {
      var arr = list.slice();
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
      return arr;
    }

    function clearIntroHover() {
      document.body.classList.remove("is-home-hovering");
      Array.prototype.forEach.call(document.querySelectorAll(".home-hover-target.is-hovered"), function (node) {
        node.classList.remove("is-hovered");
        node.style.removeProperty("--home-hover-x");
        node.style.removeProperty("--home-hover-y");
      });
    }

    function applyIntroScramble(on, persist) {
      scrambleOn = on;
      scrambleToggle.checked = on;
      if (persist) opts.writeStorage(INTRO_SCRAMBLE_KEY, on ? "1" : "0");
    }

    function applyIntroRandomize(on, persist) {
      randomizeOn = on;
      randomizeToggle.checked = on;
      if (persist) opts.writeStorage(INTRO_RANDOMIZE_KEY, on ? "1" : "0");
    }

    function applyIntroRestRiseRandom(on, persist) {
      restRiseRandomOn = on;
      restRiseRandomToggle.checked = on;
      if (persist) opts.writeStorage(INTRO_REST_RISE_RANDOM_KEY, on ? "1" : "0");
    }

    function applyIntroSpeed(next) {
      speedSec = next;
      document.body.style.setProperty("--home-intro-speed", next + "s");
    }

    function applyIntroDelay(next) {
      delaySec = next;
    }

    function applyIntroLogoBlur(next) {
      logoBlurPx = next;
      document.body.style.setProperty("--home-intro-logo-blur", next + "px");
      syncLogoIntroSkip();
    }

    function applyIntroRestBlur(next) {
      restBlurPx = next;
      document.body.style.setProperty("--home-intro-rest-blur", next + "px");
    }

    function applyIntroLogoScale(next) {
      logoScale = next;
      document.body.style.setProperty("--home-intro-logo-scale", String(next));
      syncLogoIntroSkip();
    }

    function applyIntroLogoRise(next) {
      logoRisePx = next;
      document.body.style.setProperty("--home-intro-logo-rise", next + "px");
      syncLogoIntroSkip();
    }

    function logoIntroIdle() {
      return logoBlurPx <= 0 && logoRisePx <= 0 && Math.abs(logoScale - 1) < 0.001;
    }

    function syncLogoIntroSkip() {
      var skip = logoIntroIdle();
      document.documentElement.classList.toggle("is-logo-intro-skip", skip);
      document.body.classList.toggle("is-logo-intro-skip", skip);
    }

    function applyIntroRestScale(next) {
      restScale = next;
      document.body.style.setProperty("--home-intro-rest-scale", String(next));
    }

    function applyIntroRestRise(next) {
      restRisePx = next;
      document.body.style.setProperty("--home-intro-rest-rise", next + "px");
    }

    function clearItemRise(el) {
      el.style.removeProperty("--home-intro-item-rise");
    }

    function assignRestRises(rest) {
      rest.forEach(function (el) {
        if (!restRiseRandomOn || restRisePx <= 0) {
          clearItemRise(el);
          return;
        }
        var rise = Math.round(Math.random() * restRisePx);
        el.style.setProperty("--home-intro-item-rise", rise + "px");
      });
    }

    function introFromFor(el) {
      if (el.getAttribute("data-intro") === "logo") {
        return { blur: logoBlurPx, rise: logoRisePx, scale: logoScale, origin: "center center" };
      }
      var rise = restRisePx;
      var custom = el.style.getPropertyValue("--home-intro-item-rise");
      if (custom) {
        var parsed = parseFloat(custom);
        if (!isNaN(parsed)) rise = parsed;
      }
      return { blur: restBlurPx, rise: rise, scale: restScale, origin: "center center" };
    }

    function restoreIntroBodyFlags() {
      if (introSavedHoverBlur) document.body.classList.add("is-hover-blur");
      introSavedHoverBlur = false;
      if (introSavedBlendDifference) document.body.classList.add("is-blend-difference");
      introSavedBlendDifference = false;
    }

    function finishIntro(token) {
      if (token !== introToken) return;
      clockPaused = false;
      document.body.classList.remove("is-home-intro");
      restoreIntroBodyFlags();
      introItems().forEach(function (el) {
        el.classList.remove("is-intro-visible");
        clearIntroInline(el);
        restoreOriginalText(el);
        clearItemRise(el);
      });
      syncHomeClusterScale();
      tickClock();
    }

    function settleIntro() {
      // Stop in-progress intro without replaying (e.g. when opening an overlay).
      introToken += 1;
      clockPaused = false;
      document.body.classList.remove("is-home-intro");
      restoreIntroBodyFlags();
      introItems().forEach(function (el) {
        el.classList.remove("is-intro-visible");
        clearIntroInline(el);
        restoreOriginalText(el);
        clearItemRise(el);
      });
      syncHomeClusterScale();
      tickClock();
    }

    // playIntro is a function declaration below — hoisted in this scope.
    settleHomeIntro = settleIntro;
    playHomeIntro = playIntro;

    function revealItem(el, token) {
      if (token !== introToken) return Promise.resolve();
      el.classList.remove("is-intro-visible");
      var durationMs = Math.max(180, speedSec * 1000);
      var motion = animateIntroEl(el, introFromFor(el), durationMs, function () {
        return token !== introToken;
      }).then(function () {
        if (token !== introToken) return;
        el.classList.add("is-intro-visible");
        clearIntroInline(el);
      });
      if (!scrambleOn) return motion;
      return Promise.all([motion, scrambleElement(el, durationMs, token)]);
    }

    function randomizeGapSec(staggerSec, count) {
      var n = Math.max(1, count || 1);
      // Explicit delay: use as-is (absolute schedule below keeps mobile ≈ desktop).
      if (staggerSec != null && staggerSec > 0) return staggerSec;
      // delay 0: dense cascade — total span capped near one intro speed.
      var gapSec = Math.max(0.02, speedSec * 0.12);
      if (n > 1) {
        var maxSpan = Math.max(0.06, speedSec * 0.7);
        var span = gapSec * (n - 1);
        if (span > maxSpan) gapSec = maxSpan / (n - 1);
      }
      return gapSec;
    }

    function revealRest(rest, token, staggerSec) {
      var list = randomizeOn ? shuffle(rest) : rest.slice();
      if (!randomizeOn) {
        return Promise.all(
          list.map(function (el) {
            return revealItem(el, token);
          })
        );
      }

      var gapMs = randomizeGapSec(staggerSec, list.length) * 1000;
      var t0 = performance.now();
      return Promise.all(
        list.map(function (el, i) {
          return waitUntil(t0 + gapMs * i, token).then(function () {
            if (token !== introToken) return;
            return revealItem(el, token);
          });
        })
      );
    }

    function introStaggerSec() {
      return delaySec > 0 ? delaySec : 0;
    }

    function playIntro() {
      var token = ++introToken;
      var items = introItems();
      var logo = items.filter(function (el) {
        return el.getAttribute("data-intro") === "logo";
      });
      var rest = items.filter(function (el) {
        return el.getAttribute("data-intro") !== "logo";
      });
      var skipLogo = logoIntroIdle();
      syncLogoIntroSkip();

      clockPaused = true;
      clearIntroHover();
      // Hover-blur + difference blend both break intro paint on iOS Safari.
      introSavedHoverBlur = document.body.classList.contains("is-hover-blur");
      introSavedBlendDifference = document.body.classList.contains("is-blend-difference");
      document.body.classList.remove("is-hover-blur");
      document.body.classList.remove("is-blend-difference");
      document.body.classList.add("is-home-intro");
      syncHomeClusterScale();
      items.forEach(function (el) {
        el.classList.remove("is-intro-visible");
        clearIntroInline(el);
        storeOriginalText(el);
        restoreOriginalText(el);
        clearItemRise(el);
      });
      assignRestRises(rest);
      items.forEach(function (el) {
        if (skipLogo && el.getAttribute("data-intro") === "logo") return;
        setIntroFrom(el, introFromFor(el));
      });
      void document.body.offsetWidth;

      nextFrame()
        .then(function () {
          if (token !== introToken) return;

          var staggerSec = introStaggerSec();

          if (skipLogo) {
            return revealRest(rest, token, staggerSec);
          }

          // delay 0: logo + rest start together; randomize still staggers rest internally
          if (staggerSec <= 0) {
            return Promise.all([
              Promise.all(
                logo.map(function (el) {
                  return revealItem(el, token);
                })
              ),
              revealRest(rest, token, staggerSec),
            ]);
          }

          return Promise.all(
            logo.map(function (el) {
              return revealItem(el, token);
            })
          )
            .then(function () {
              if (token !== introToken) return;
              return wait(staggerSec * 1000, token);
            })
            .then(function () {
              if (token !== introToken) return;
              return revealRest(rest, token, staggerSec);
            });
        })
        .then(function () {
          finishIntro(token);
        });
    }

    function storedNumber(key, fallback) {
      var value = Number(opts.readStorage(key, String(fallback)));
      return isFinite(value) ? value : fallback;
    }

    // migrate old intro-blur checkbox → rest blur only (logo stays sharp by default)
    if (
      opts.readStorage("errormade-home-intro-blur", null) === "1" &&
      opts.readStorage(INTRO_LOGO_BLUR_KEY, null) == null &&
      opts.readStorage(INTRO_REST_BLUR_KEY, null) == null
    ) {
      opts.writeStorage(INTRO_LOGO_BLUR_KEY, "0");
      opts.writeStorage(INTRO_REST_BLUR_KEY, "14");
    }

    opts.bindNumber(logoBlurRange, logoBlurNumber, {
      key: INTRO_LOGO_BLUR_KEY,
      min: 0,
      max: 24,
      fallback: storedNumber(INTRO_LOGO_BLUR_KEY, 0),
      decimals: 1,
      onApply: applyIntroLogoBlur,
    });
    opts.bindNumber(restBlurRange, restBlurNumber, {
      key: INTRO_REST_BLUR_KEY,
      min: 0,
      max: 40,
      fallback: storedNumber(INTRO_REST_BLUR_KEY, 24),
      decimals: 1,
      onApply: applyIntroRestBlur,
    });
    opts.bindNumber(speedRange, speedNumber, {
      key: INTRO_SPEED_KEY,
      min: 0.1,
      max: 2,
      fallback: storedNumber(INTRO_SPEED_KEY, 0.5),
      decimals: 2,
      onApply: applyIntroSpeed,
    });
    opts.bindNumber(delayRange, delayNumber, {
      key: INTRO_DELAY_KEY,
      min: 0,
      max: 2,
      fallback: storedNumber(INTRO_DELAY_KEY, 0),
      decimals: 2,
      onApply: applyIntroDelay,
    });
    opts.bindNumber(logoScaleRange, logoScaleNumber, {
      key: INTRO_LOGO_SCALE_KEY,
      min: 0.2,
      max: 2,
      fallback: storedNumber(INTRO_LOGO_SCALE_KEY, 1),
      decimals: 2,
      onApply: applyIntroLogoScale,
    });
    opts.bindNumber(logoRiseRange, logoRiseNumber, {
      key: INTRO_LOGO_RISE_KEY,
      min: 0,
      max: 200,
      fallback: storedNumber(INTRO_LOGO_RISE_KEY, 0),
      decimals: 0,
      onApply: applyIntroLogoRise,
    });
    opts.bindNumber(restScaleRange, restScaleNumber, {
      key: INTRO_REST_SCALE_KEY,
      min: 0.2,
      max: 2,
      fallback: storedNumber(INTRO_REST_SCALE_KEY, 0.5),
      decimals: 2,
      onApply: applyIntroRestScale,
    });
    opts.bindNumber(restRiseRange, restRiseNumber, {
      key: INTRO_REST_RISE_KEY,
      min: 0,
      max: 200,
      fallback: storedNumber(INTRO_REST_RISE_KEY, 20),
      decimals: 0,
      onApply: applyIntroRestRise,
    });

    scrambleToggle.addEventListener("change", function () {
      applyIntroScramble(scrambleToggle.checked, true);
    });
    randomizeToggle.addEventListener("change", function () {
      applyIntroRandomize(randomizeToggle.checked, true);
    });
    restRiseRandomToggle.addEventListener("change", function () {
      applyIntroRestRiseRandom(restRiseRandomToggle.checked, true);
    });
    replayBtn.addEventListener("click", function () {
      playIntro();
    });

    applyIntroScramble(opts.readStorage(INTRO_SCRAMBLE_KEY, "1") === "1", false);
    applyIntroRandomize(opts.readStorage(INTRO_RANDOMIZE_KEY, "1") === "1", false);
    applyIntroRestRiseRandom(opts.readStorage(INTRO_REST_RISE_RANDOM_KEY, "0") === "1", false);
    introItems().forEach(function (el) {
      unwrapIntroBlurInner(el);
    });
    syncHomeClusterScale();
    playIntro();
  }

  function initHomeSpray() {
    var canvas = document.getElementById("home-spray");
    var cursor = document.getElementById("home-spray-cursor");
    var toggle = document.getElementById("home-spray-toggle");
    var fields = document.getElementById("home-spray-fields");
    var sizeRange = document.getElementById("home-spray-size");
    var sizeNumber = document.getElementById("home-spray-size-number");
    var particleRange = document.getElementById("home-spray-particles");
    var particleNumber = document.getElementById("home-spray-particles-number");
    var particleSizeRange = document.getElementById("home-spray-particle-size");
    var particleSizeNumber = document.getElementById("home-spray-particle-size-number");
    var intensityRange = document.getElementById("home-spray-intensity");
    var intensityNumber = document.getElementById("home-spray-intensity-number");
    var clusterRange = document.getElementById("home-spray-cluster");
    var clusterNumber = document.getElementById("home-spray-cluster-number");
    var liquidRange = document.getElementById("home-spray-liquid");
    var liquidNumber = document.getElementById("home-spray-liquid-number");
    var dripsRange = document.getElementById("home-spray-drips");
    var dripsNumber = document.getElementById("home-spray-drips-number");
    var clearBtn = document.getElementById("home-spray-clear");
    if (
      !canvas ||
      !cursor ||
      !toggle ||
      !fields ||
      !sizeRange ||
      !sizeNumber ||
      !particleRange ||
      !particleNumber ||
      !particleSizeRange ||
      !particleSizeNumber ||
      !intensityRange ||
      !intensityNumber ||
      !clusterRange ||
      !clusterNumber ||
      !liquidRange ||
      !liquidNumber ||
      !dripsRange ||
      !dripsNumber ||
      !clearBtn
    ) {
      return;
    }

    var ctx =
      canvas.getContext("2d", { alpha: false, desynchronized: true }) || canvas.getContext("2d");
    var sprayOn = false;
    var painting = false;
    var pointerId = null;
    var lastX = 0;
    var lastY = 0;
    var brushSize = 70;
    var particleCount = 22;
    var particleSize = 1.5;
    var intensity = 80;
    var cluster = 23;
    var liquidity = 45;
    var drips = 8;
    var dripParticles = [];
    var dripRaf = 0;
    var strokePts = [];
    var paintRaf = 0;
    var canvasReady = false;
    var randnSpare = null;
    var ON_KEY = "errormade-home-spray-on";
    var SIZE_KEY = "errormade-home-spray-size";
    var PARTICLES_KEY = "errormade-home-spray-particles";
    var PARTICLE_SIZE_KEY = "errormade-home-spray-particle-size";
    var INTENSITY_KEY = "errormade-home-spray-intensity";
    var CLUSTER_KEY = "errormade-home-spray-cluster";
    var LIQUID_KEY = "errormade-home-spray-liquid";
    var DRIPS_KEY = "errormade-home-spray-drips";

    function readStorage(key, fallback) {
      return readParam(key, fallback);
    }

    function writeStorage(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {}
    }

    function clamp(value, min, max, fallback, decimals) {
      var factor = Math.pow(10, decimals || 0);
      var next = Math.round(Number(value) * factor) / factor;
      if (!isFinite(next)) return fallback;
      if (next < min) return min;
      if (next > max) return max;
      return next;
    }

    function bindNumber(rangeEl, numberEl, key, min, max, fallback, onApply, decimals) {
      function apply(value, persist) {
        var next = clamp(value, min, max, fallback, decimals);
        rangeEl.value = String(next);
        numberEl.value = String(next);
        onApply(next);
        if (persist) writeStorage(key, String(next));
        return next;
      }
      rangeEl.addEventListener("input", function () {
        apply(rangeEl.value, true);
      });
      numberEl.addEventListener("input", function () {
        apply(numberEl.value, true);
      });
      apply(readStorage(key, String(fallback)), false);
      return apply;
    }

    function overlayOpen() {
      return !!(
        document.querySelector(".uiworks-window.is-open") ||
        document.querySelector(".howto-window.is-open")
      );
    }

    function eventEl(target) {
      if (!target) return null;
      if (target.nodeType === 3) return target.parentElement;
      return target;
    }

    function canSpray(event) {
      if (!sprayOn || overlayOpen()) return false;
      var target = eventEl(event.target);
      if (!target || !target.closest) return true;
      return !target.closest("a, button, input, .params-panel, .howto-teaser, .home-hover-target");
    }

    function resizeCanvas() {
      var dpr = window.devicePixelRatio || 1;
      var w = window.innerWidth;
      var h = window.innerHeight;
      var copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      if (copy.width && copy.height) {
        copy.getContext("2d").drawImage(canvas, 0, 0);
      }
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
      if (canvasReady && copy.width && copy.height) {
        ctx.drawImage(copy, 0, 0, w, h);
      }
      canvasReady = true;
    }

    function randn() {
      if (randnSpare != null) {
        var reuse = randnSpare;
        randnSpare = null;
        return reuse;
      }
      var u = 1 - Math.random();
      var v = Math.random();
      var mag = Math.sqrt(-2 * Math.log(u));
      var ang = Math.PI * 2 * v;
      randnSpare = mag * Math.sin(ang);
      return mag * Math.cos(ang);
    }

    function speck(x, y, grain, alpha) {
      ctx.globalAlpha = alpha;
      if (grain < 1.2) {
        ctx.fillRect(x, y, grain, grain);
        return;
      }
      var specks = Math.min(6, 1 + Math.round(grain));
      var s;
      for (s = 0; s < specks; s++) {
        var sr = Math.max(0.45, grain * (0.14 + Math.random() * 0.3));
        ctx.fillRect(
          x + (Math.random() - 0.5) * grain,
          y + (Math.random() - 0.5) * grain,
          sr,
          sr
        );
      }
    }

    function isMobileSpray() {
      return window.matchMedia(COMPACT_MQ).matches;
    }

    function liveBrushSize() {
      var size = brushSize;
      if (isMobileSpray()) size = size / 3;
      return Math.max(4, size);
    }

    function sprayAt(x, y) {
      var size = liveBrushSize();
      var wet = liquidity / 100;
      var tightness = cluster / 100;
      var sigma = size * (0.18 + (1 - tightness) * 0.42 + wet * 0.12);
      var areaScale = Math.max(1, (size / 28) * (size / 28));
      var targetDots = particleCount * (0.45 + intensity / 50) * areaScale;
      var dots = Math.max(1, Math.min(720, Math.round(targetDots)));
      var fill = Math.min(2.5, Math.sqrt(targetDots / dots));
      var coreCount = Math.round(dots * (0.38 + intensity / 450));
      var coreSigma = sigma * (0.22 + (1 - tightness) * 0.16);
      ctx.fillStyle = "#000";
      var i;
      for (i = 0; i < dots; i++) {
        var spread = i < coreCount ? coreSigma : sigma;
        var gx = randn() * spread;
        var gy = randn() * spread;
        if (i >= coreCount && Math.random() < 0.14) {
          gx *= 1.6 + Math.random() * 2.4;
          gy *= 1.6 + Math.random() * 2.4;
        }
        var dist = Math.hypot(gx, gy) / Math.max(sigma, 0.001);
        var falloff = Math.exp(-dist * dist * (0.55 + tightness * 0.7));
        var grain = particleSize * (0.35 + Math.random() * 0.85);
        if (Math.random() < 0.65) grain *= 0.35 + Math.random() * 0.4;
        var alpha = (0.1 + Math.random() * 0.5) * (0.25 + falloff * 0.75);
        alpha *= (1 - wet * 0.22) * fill;
        speck(x + gx, y + gy, grain, alpha);
      }
      ctx.globalAlpha = 1;
      maybeSpawnDrip(x, y, size, wet, sigma);
    }

    function sprayLine(x0, y0, x1, y1) {
      var dx = x1 - x0;
      var dy = y1 - y0;
      var dist = Math.hypot(dx, dy);
      var step = Math.max(0.55, Math.min(4.2, liveBrushSize() * 0.055 + 0.35) * (1.15 - intensity / 280));
      var n = Math.max(1, Math.ceil(dist / step));
      var i;
      for (i = 0; i <= n; i++) {
        sprayAt(x0 + (dx * i) / n, y0 + (dy * i) / n);
      }
    }

    function flushStroke() {
      paintRaf = 0;
      var pts = strokePts;
      strokePts = [];
      if (!pts.length) return;
      var x0 = lastX;
      var y0 = lastY;
      var i;
      for (i = 0; i < pts.length; i += 2) {
        sprayLine(x0, y0, pts[i], pts[i + 1]);
        x0 = pts[i];
        y0 = pts[i + 1];
      }
      lastX = x0;
      lastY = y0;
    }

    function pickDripKind(wet) {
      var r = Math.random();
      if (r < 0.2 + (1 - wet) * 0.1) return "hair";
      if (r < 0.4 + wet * 0.08) return "fat";
      if (r < 0.56) return "wander";
      if (r < 0.7) return "taper";
      if (r < 0.82) return "break";
      if (r < 0.92) return "glob";
      return "split";
    }

    function maybeSpawnDrip(x, y, size, wet, sigma, kind) {
      if (drips <= 0) return;
      if (!kind) {
        var chance = (drips / 40) * (0.01 + wet * 0.045);
        if (Math.random() > chance) return;
      }
      if (dripParticles.length > 36) return;
      kind = kind || pickDripKind(wet);
      var ox = x + randn() * sigma * (0.12 + Math.random() * 0.22);
      var oy = y + sigma * (0.2 + Math.random() * 0.55);
      var drip = {
        kind: kind,
        x: ox,
        y: oy,
        prevX: ox,
        prevY: oy,
        phase: Math.random() * Math.PI * 2,
        split: 0,
        skipped: 0,
      };
      if (kind === "hair") {
        drip.mass = particleSize * (0.25 + Math.random() * 0.4) + 0.35;
        drip.vy = 0.9 + wet * 2.4 + Math.random() * 1.4;
        drip.gravity = 0.045 + wet * 0.05 + Math.random() * 0.03;
        drip.drag = 0.993 + Math.random() * 0.004;
        drip.life = Math.round(36 + Math.random() * 110 + wet * 50);
        drip.wobble = (Math.random() - 0.5) * 0.1;
        drip.wobbleFreq = 0.025 + Math.random() * 0.05;
        drip.lean = (Math.random() - 0.5) * 0.22;
        drip.pulse = Math.random() * 0.25;
        drip.blob = 0.25 + Math.random() * 0.45;
      } else if (kind === "fat") {
        drip.mass = particleSize * (1.4 + Math.random() * 2.2) + 1.4 + wet * 1.6;
        drip.vy = 0.22 + wet * 0.9 + Math.random() * 0.35;
        drip.gravity = 0.028 + wet * 0.04;
        drip.drag = 0.978 + Math.random() * 0.01;
        drip.life = Math.round(18 + Math.random() * 42 + wet * 28);
        drip.wobble = (Math.random() - 0.5) * 0.22;
        drip.wobbleFreq = 0.02 + Math.random() * 0.03;
        drip.lean = (Math.random() - 0.5) * 0.12;
        drip.pulse = 0.15 + Math.random() * 0.4;
        drip.blob = 1.1 + Math.random() * 1.4;
      } else if (kind === "wander") {
        drip.mass = particleSize * (0.7 + Math.random() * 1.1) + 0.8;
        drip.vy = 0.45 + wet * 1.5 + Math.random() * 0.8;
        drip.gravity = 0.03 + wet * 0.055;
        drip.drag = 0.986 + Math.random() * 0.008;
        drip.life = Math.round(30 + Math.random() * 80 + wet * 40);
        drip.wobble = (Math.random() - 0.5) * (0.35 + wet * 0.5);
        drip.wobbleFreq = 0.04 + Math.random() * 0.08;
        drip.lean = (Math.random() - 0.5) * 0.45;
        drip.pulse = 0.3 + Math.random() * 0.5;
        drip.blob = 0.7 + Math.random() * 0.8;
      } else if (kind === "taper") {
        drip.mass = particleSize * (0.8 + Math.random() * 1.3) + 0.9;
        drip.vy = 0.55 + wet * 1.7 + Math.random() * 0.7;
        drip.gravity = 0.04 + wet * 0.05;
        drip.drag = 0.99 + Math.random() * 0.004;
        drip.life = Math.round(22 + Math.random() * 55 + wet * 30);
        drip.wobble = (Math.random() - 0.5) * 0.16;
        drip.wobbleFreq = 0.03 + Math.random() * 0.04;
        drip.lean = (Math.random() - 0.5) * 0.18;
        drip.pulse = 0.05;
        drip.blob = 0;
      } else if (kind === "break") {
        drip.mass = particleSize * (0.45 + Math.random() * 0.7) + 0.5;
        drip.vy = 0.7 + wet * 1.8 + Math.random() * 0.9;
        drip.gravity = 0.038 + wet * 0.05;
        drip.drag = 0.991;
        drip.life = Math.round(28 + Math.random() * 70 + wet * 35);
        drip.wobble = (Math.random() - 0.5) * 0.2;
        drip.wobbleFreq = 0.05 + Math.random() * 0.06;
        drip.lean = (Math.random() - 0.5) * 0.2;
        drip.pulse = 0.2;
        drip.blob = 0.2 + Math.random() * 0.4;
        drip.skipEvery = 2 + Math.floor(Math.random() * 4);
      } else if (kind === "glob") {
        drip.mass = particleSize * (1.8 + Math.random() * 2.6) + 2 + wet * 2;
        drip.vy = 0.12 + wet * 0.45 + Math.random() * 0.2;
        drip.gravity = 0.02 + wet * 0.03;
        drip.drag = 0.96 + Math.random() * 0.015;
        drip.life = Math.round(10 + Math.random() * 22 + wet * 16);
        drip.wobble = (Math.random() - 0.5) * 0.08;
        drip.wobbleFreq = 0.02;
        drip.lean = (Math.random() - 0.5) * 0.08;
        drip.pulse = 0.1;
        drip.blob = 1.6 + Math.random() * 1.8;
      } else {
        drip.mass = particleSize * (0.7 + Math.random() * 1.2) + 0.9;
        drip.vy = 0.5 + wet * 1.6 + Math.random() * 0.6;
        drip.gravity = 0.034 + wet * 0.05;
        drip.drag = 0.987;
        drip.life = Math.round(32 + Math.random() * 70 + wet * 36);
        drip.wobble = (Math.random() - 0.5) * 0.18;
        drip.wobbleFreq = 0.035 + Math.random() * 0.04;
        drip.lean = (Math.random() - 0.5) * 0.16;
        drip.pulse = 0.2;
        drip.blob = 0.6 + Math.random() * 0.7;
        drip.split = 0.35 + Math.random() * 0.4;
      }
      drip.maxLife = drip.life;
      dripParticles.push(drip);
      ensureDripLoop();
    }

    function paintDrips() {
      var wet = liquidity / 100;
      ctx.fillStyle = "#000";
      var i;
      for (i = dripParticles.length - 1; i >= 0; i--) {
        var drip = dripParticles[i];
        drip.prevX = drip.x;
        drip.prevY = drip.y;
        drip.vy += drip.gravity;
        drip.vy *= drip.drag;
        drip.y += drip.vy;
        drip.x +=
          Math.sin(drip.y * drip.wobbleFreq + drip.phase) * drip.wobble +
          drip.lean +
          randn() * (0.04 + (drip.kind === "wander" ? 0.14 : 0.05));
        drip.life -= 1;
        var t = Math.max(0, drip.life / drip.maxLife);
        if (drip.kind === "split" && drip.split && t < drip.split && t > drip.split - 0.08) {
          drip.split = 0;
          maybeSpawnDrip(drip.x + (Math.random() - 0.5) * 6, drip.y, liveBrushSize(), wet, drip.mass, "hair");
        }
        drip.skipped += 1;
        var broken = drip.kind === "break" && drip.skipEvery && drip.skipped % drip.skipEvery === 0;
        var drying = drip.vy < 0.38 || t < 0.14;
        var width = drip.mass * (0.5 + t * 0.75);
        if (drip.kind === "taper") width = drip.mass * Math.pow(t, 1.35) * 1.1;
        if (drip.pulse) width *= 0.75 + Math.sin(drip.y * 0.12 + drip.phase) * drip.pulse;
        if (drying && drip.blob) width = drip.mass * drip.blob * (1.05 + (0.14 - Math.min(t, 0.14)) * 3.2);
        if (!broken) {
          var dist = Math.hypot(drip.x - drip.prevX, drip.y - drip.prevY);
          var steps = Math.max(1, Math.ceil(dist / (drip.kind === "fat" || drip.kind === "glob" ? 0.9 : 1.35)));
          var k;
          for (k = 0; k <= steps; k++) {
            var u = k / steps;
            var px = drip.prevX + (drip.x - drip.prevX) * u;
            var py = drip.prevY + (drip.y - drip.prevY) * u;
            var spread = Math.max(0.35, width * (drip.kind === "hair" ? 0.22 : 0.4));
            var grains = Math.max(2, Math.round((drip.kind === "hair" ? 2 : 4) + width * 1.5));
            var g;
            for (g = 0; g < grains; g++) {
              var grain = particleSize * (0.25 + Math.random() * 0.75);
              if (Math.random() < 0.55) grain *= 0.42;
              speck(
                px + randn() * spread,
                py + randn() * spread * 0.5,
                grain,
                (0.12 + Math.random() * 0.42) * (0.35 + t * 0.6)
              );
            }
          }
        }
        if (drying && drip.blob > 0.3) {
          var blob = Math.max(4, Math.round(5 + width * 2.4 * drip.blob));
          var b;
          for (b = 0; b < blob; b++) {
            speck(
              drip.x + randn() * width * 0.6,
              drip.y + randn() * width * 0.32 + Math.abs(randn()) * width * 0.22,
              particleSize * (0.35 + Math.random() * 0.9),
              0.18 + Math.random() * 0.38
            );
          }
        }
        if (drip.life <= 0 || drip.y > window.innerHeight + 24 || drip.vy < 0.12) {
          dripParticles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
    }

    function ensureDripLoop() {
      if (dripRaf) return;
      function frame() {
        dripRaf = 0;
        if (!dripParticles.length) return;
        paintDrips();
        dripRaf = requestAnimationFrame(frame);
      }
      dripRaf = requestAnimationFrame(frame);
    }

    function clearCanvas() {
      dripParticles = [];
      if (dripRaf) {
        cancelAnimationFrame(dripRaf);
        dripRaf = 0;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      var dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#000";
    }

    function applyEnabled(on, persist) {
      sprayOn = on;
      toggle.checked = on;
      fields.hidden = !on;
      document.body.classList.toggle("is-spray", on);
      if (!on) {
        stopPaint();
        hideCursor();
      } else {
        updateCursorSize();
      }
      if (persist) writeStorage(ON_KEY, on ? "1" : "0");
    }

    function stopPaint() {
      if (paintRaf) {
        cancelAnimationFrame(paintRaf);
        paintRaf = 0;
        flushStroke();
      }
      painting = false;
      pointerId = null;
    }

    function overSprayUi(target) {
      var el = eventEl(target);
      if (!el || !el.closest) return false;
      return !!el.closest("a, button, input, .params-panel, .howto-teaser, .home-hover-target");
    }

    function updateCursorSize() {
      var size = Math.max(8, liveBrushSize());
      cursor.style.width = size + "px";
      cursor.style.height = size + "px";
    }

    function hideCursor() {
      cursor.classList.remove("is-visible");
    }

    function syncCursor(event) {
      if (!sprayOn || overlayOpen() || overSprayUi(event.target)) {
        hideCursor();
        return;
      }
      cursor.style.transform =
        "translate3d(" + event.clientX + "px, " + event.clientY + "px, 0) translate(-50%, -50%)";
      cursor.classList.add("is-visible");
    }

    window.addEventListener("resize", function () {
      resizeCanvas();
      updateCursorSize();
    });

    document.addEventListener("pointerdown", function (event) {
      if (event.button != null && event.button !== 0) return;
      if (!canSpray(event)) return;
      painting = true;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      sprayAt(lastX, lastY);
      event.preventDefault();
    });

    document.addEventListener("pointermove", function (event) {
      syncCursor(event);
      if (!painting || (pointerId != null && event.pointerId !== pointerId)) return;
      strokePts.push(event.clientX, event.clientY);
      if (!paintRaf) paintRaf = requestAnimationFrame(flushStroke);
    });

    document.addEventListener("pointerup", stopPaint);
    document.addEventListener("pointercancel", stopPaint);
    window.addEventListener("blur", function () {
      stopPaint();
      hideCursor();
    });
    document.documentElement.addEventListener("mouseleave", hideCursor);

    document.addEventListener(
      "wheel",
      function (event) {
        if (!sprayOn || overlayOpen() || overSprayUi(event.target)) return;
        var pixels = event.deltaY;
        if (!pixels) return;
        if (event.deltaMode === 1) pixels *= 16;
        if (event.deltaMode === 2) pixels *= 80;
        event.preventDefault();
        var step = Math.max(1, Math.round(Math.abs(pixels) / 24));
        applySize(brushSize + (pixels < 0 ? step : -step), false);
      },
      { passive: false }
    );

    toggle.addEventListener("change", function () {
      applyEnabled(toggle.checked, true);
    });

    clearBtn.addEventListener("click", function () {
      clearCanvas();
    });

    var applySize = bindNumber(sizeRange, sizeNumber, SIZE_KEY, 4, 80, 70, function (next) {
      brushSize = next;
      updateCursorSize();
    });
    bindNumber(particleRange, particleNumber, PARTICLES_KEY, 1, 150, 22, function (next) {
      particleCount = next;
    });
    bindNumber(
      particleSizeRange,
      particleSizeNumber,
      PARTICLE_SIZE_KEY,
      0.5,
      12,
      1.5,
      function (next) {
        particleSize = next;
      },
      1
    );
    bindNumber(intensityRange, intensityNumber, INTENSITY_KEY, 1, 200, 80, function (next) {
      intensity = next;
    });
    bindNumber(clusterRange, clusterNumber, CLUSTER_KEY, 0, 100, 23, function (next) {
      cluster = next;
    });
    bindNumber(liquidRange, liquidNumber, LIQUID_KEY, 0, 100, 45, function (next) {
      liquidity = next;
    });
    bindNumber(dripsRange, dripsNumber, DRIPS_KEY, 0, 40, 8, function (next) {
      drips = next;
    });

    resizeCanvas();
    applyEnabled(readStorage(ON_KEY, "1") === "1", false);
  }

  function initWorksPanel(options) {
    var prefix = options.prefix;
    function byId(name) {
      return document.getElementById(prefix + "-" + name);
    }
    var openBtn = byId("params-open");
    var closeBtn = byId("params-close");
    var uploadBtn = byId("upload");
    var fileInput = byId("file");
    var listEl = byId("params-list");
    var column = byId("column");
    var widthRange = byId("width");
    var widthNumber = byId("width-number");
    var mainWidthRange = byId("main-width");
    var mainWidthNumber = byId("main-width-number");
    var mainAlignSelect = byId("main-align");
    var mediaFitSelect = byId("media-fit");
    var scrubOrderSelect = byId("scrub-order");
    var previewEl = byId("preview");
    var scrubWrap = byId("scrub-wrap");
    var scrubColumnEl = byId("scrub-column");
    var sensRange = byId("scroll-sens");
    var sensNumber = byId("scroll-sens-number");
    var smoothRange = byId("scroll-smooth");
    var smoothNumber = byId("scroll-smooth-number");
    var introSmallBlurRange = byId("intro-small-blur");
    var introSmallBlurNumber = byId("intro-small-blur-number");
    var introLargeBlurRange = byId("intro-large-blur");
    var introLargeBlurNumber = byId("intro-large-blur-number");
    var introSpeedRange = byId("intro-speed");
    var introSpeedNumber = byId("intro-speed-number");
    var introDelayRange = byId("intro-delay");
    var introDelayNumber = byId("intro-delay-number");
    var introSmallScaleRange = byId("intro-small-scale");
    var introSmallScaleNumber = byId("intro-small-scale-number");
    var introSmallRiseRange = byId("intro-small-rise");
    var introSmallRiseNumber = byId("intro-small-rise-number");
    var introLargeScaleRange = byId("intro-large-scale");
    var introLargeScaleNumber = byId("intro-large-scale-number");
    var introLargeRiseRange = byId("intro-large-rise");
    var introLargeRiseNumber = byId("intro-large-rise-number");
    var introLargeRiseRandom = byId("intro-large-rise-random");
    var introRandomize = byId("intro-randomize");
    var introReplayBtn = byId("intro-replay");
    var paramsModal = byId("params-modal");
    if (
      !openBtn ||
      !paramsModal ||
      !closeBtn ||
      !uploadBtn ||
      !fileInput ||
      !listEl ||
      !column ||
      !widthRange ||
      !widthNumber ||
      !mainWidthRange ||
      !mainWidthNumber ||
      !mainAlignSelect ||
      !mediaFitSelect ||
      !scrubOrderSelect ||
      !previewEl ||
      !sensRange ||
      !sensNumber ||
      !smoothRange ||
      !smoothNumber ||
      !introSmallBlurRange ||
      !introSmallBlurNumber ||
      !introLargeBlurRange ||
      !introLargeBlurNumber ||
      !introSpeedRange ||
      !introSpeedNumber ||
      !introDelayRange ||
      !introDelayNumber ||
      !introSmallScaleRange ||
      !introSmallScaleNumber ||
      !introSmallRiseRange ||
      !introSmallRiseNumber ||
      !introLargeScaleRange ||
      !introLargeScaleNumber ||
      !introLargeRiseRange ||
      !introLargeRiseNumber ||
      !introLargeRiseRandom ||
      !introRandomize ||
      !introReplayBtn
    ) {
      return;
    }

    var DB_NAME = options.dbName;
    var STORE = options.store;
    var WIDTH_KEY = options.keyPrefix + "-column-width";
    var WIDTH_MIN = 64;
    var WIDTH_MAX = 800;
    var WIDTH_DEFAULT = 520;
    var MAIN_WIDTH_KEY = options.keyPrefix + "-main-column-width";
    var MAIN_WIDTH_LEGACY_KEY = options.keyPrefix + "-preview-width";
    var MAIN_WIDTH_MIN = 160;
    var MAIN_WIDTH_MAX = 1600;
    var MAIN_WIDTH_DEFAULT = 400;
    var MAIN_ALIGN_KEY = options.keyPrefix + "-main-column-align";
    var MAIN_ALIGN_DEFAULT = "left";
    var MEDIA_FIT_KEY = options.keyPrefix + "-media-fit";
    var MEDIA_FIT_DEFAULT = "width";
    var SCRUB_ORDER_KEY = options.keyPrefix + "-scrub-order";
    var SCRUB_ORDER_DEFAULT = "normal";
    var INTRO_SMALL_BLUR_KEY = options.keyPrefix + "-intro-small-blur";
    var INTRO_LARGE_BLUR_KEY = options.keyPrefix + "-intro-large-blur";
    var INTRO_SPEED_KEY = options.keyPrefix + "-intro-speed";
    var INTRO_DELAY_KEY = options.keyPrefix + "-intro-delay";
    var INTRO_SMALL_SCALE_KEY = options.keyPrefix + "-intro-small-scale";
    var INTRO_SMALL_RISE_KEY = options.keyPrefix + "-intro-small-rise";
    var INTRO_LARGE_SCALE_KEY = options.keyPrefix + "-intro-large-scale";
    var INTRO_LARGE_RISE_KEY = options.keyPrefix + "-intro-large-rise";
    var INTRO_LARGE_RISE_RANDOM_KEY = options.keyPrefix + "-intro-large-rise-random";
    var INTRO_RANDOMIZE_KEY = options.keyPrefix + "-intro-randomize";
    var SENS_KEY = options.keyPrefix + "-scroll-sens";
    var SMOOTH_KEY = options.keyPrefix + "-scroll-smooth";
    var SENS_MIN = 0.1;
    var SENS_MAX = 4;
    var SENS_DEFAULT = 2;
    var SMOOTH_MIN = 0;
    var SMOOTH_MAX = 90;
    var SMOOTH_DEFAULT = 90;
    var COLUMN_FIT_MIN = 64;
    var MAIN_FIT_MIN = 160;
    var PREVIEW_MAX_EDGE = 960;
    var items = [];
    var urls = {};
    var previewUrls = {};
    var previewMediaUrls = {};
    var previewPending = {};
    var dragId = null;
    var dbPromise = null;
    var windowEl = column.closest(".uiworks-window");
    var activePreviewId = null;
    var previewVideo = null;
    var previewImg = null;
    var preferredColumnWidth = WIDTH_DEFAULT;
    var preferredMainWidth = MAIN_WIDTH_DEFAULT;
    var mainAlign = MAIN_ALIGN_DEFAULT;
    var mediaFit = MEDIA_FIT_DEFAULT;
    var scrubOrder = SCRUB_ORDER_DEFAULT;
    var introSmallBlur = 0;
    var introLargeBlur = 0;
    var introSpeed = 0.55;
    var introDelay = 0.25;
    var introSmallScale = 1;
    var introSmallRise = 0;
    var introLargeScale = 0.85;
    var introLargeRise = 40;
    var introLargeRiseRandomOn = false;
    var introRandomizeOn = false;
    var columnIntroToken = 0;
    var scrollSensitivity = SENS_DEFAULT;
    var scrollSmoothness = SMOOTH_DEFAULT / 100;
    var scrollTarget = null;
    var scrollRaf = 0;
    var scrollEl = null;
    var closeEl = windowEl && windowEl.querySelector(".uiworks-stage > .close");
    var compactMq = window.matchMedia(COMPACT_MQ);
    var mediaReady = null;
    var listDirty = true;
    var previewRaf = 0;
    var columnEnterRaf = 0;
    var mediaObserver = null;
    var previewImageToken = 0;
    var prefetchWarm = {};
    var scrollDriver = null;
    var scrubFromMainRaf = 0;
    var mainFromScrubRaf = 0;

    function clamp(value, min, max, fallback) {
      var next = Math.round(Number(value));
      if (!isFinite(next)) return fallback;
      if (next < min) return min;
      if (next > max) return max;
      return next;
    }

    function isCompactView() {
      return compactMq.matches;
    }

    function isPreviewOn() {
      return !!(windowEl && windowEl.classList.contains("is-preview"));
    }

    function usesDualScrub() {
      return !!scrubColumnEl;
    }

    function scrubColumn() {
      return usesDualScrub() ? scrubColumnEl : column;
    }

    function isPanelOpen() {
      return !!(windowEl && windowEl.classList.contains("is-open"));
    }

    function playPreviewVideo() {
      if (!previewVideo || !previewVideo.isConnected) return;
      if (!previewVideo.src && !previewVideo.getAttribute("src")) return;
      previewVideo.muted = true;
      previewVideo.defaultMuted = true;
      previewVideo.loop = true;
      previewVideo.playsInline = true;
      var play = previewVideo.play();
      if (play && play.catch) play.catch(function () {});
    }

    function markPreviewVideoReady() {
      if (!previewVideo) return;
      previewVideo.classList.remove("is-loading");
      playPreviewVideo();
    }

    function ensurePreviewVideo() {
      if (previewVideo && previewVideo.isConnected) return previewVideo;
      previewVideo = document.createElement("video");
      previewVideo.muted = true;
      previewVideo.defaultMuted = true;
      previewVideo.autoplay = true;
      previewVideo.loop = true;
      previewVideo.playsInline = true;
      previewVideo.preload = "auto";
      previewVideo.setAttribute("muted", "");
      previewVideo.setAttribute("autoplay", "");
      previewVideo.setAttribute("loop", "");
      previewVideo.setAttribute("playsinline", "");
      previewVideo.setAttribute("webkit-playsinline", "");
      previewVideo.addEventListener("canplay", markPreviewVideoReady);
      previewVideo.addEventListener("loadeddata", markPreviewVideoReady);
      return previewVideo;
    }

    function requestSyncPreview() {
      if (previewRaf) return;
      previewRaf = requestAnimationFrame(function () {
        previewRaf = 0;
        syncPreview();
      });
    }

    function itemById(id) {
      return items.find(function (entry) {
        return entry.id === id;
      });
    }

    function pauseColumnVideo(itemEl) {
      if (!itemEl) return;
      var video = itemEl.querySelector("video");
      itemEl.classList.remove("is-playing");
      if (video) video.pause();
    }

    function unloadColumnVideo(itemEl) {
      if (!itemEl) return;
      var video = itemEl.querySelector("video");
      itemEl.classList.remove("is-playing");
      if (!video) return;
      video.pause();
      video.removeAttribute("src");
      try {
        video.load();
      } catch (error) {}
      video.remove();
    }

    function hydrateColumnThumb(itemEl) {
      var img = itemEl && itemEl.querySelector("img");
      if (!img || img.getAttribute("src")) return;
      var src = img.getAttribute("data-src");
      if (src) img.src = src;
    }

    function ensureColumnVideo(itemEl) {
      var item = itemById(itemEl && itemEl.dataset.id);
      if (!item || mediaKind(item) !== "video") return null;
      var video = itemEl.querySelector("video");
      if (video) return video;
      video = document.createElement("video");
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.setAttribute("muted", "");
      video.setAttribute("loop", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      var poster = urlForThumb(item);
      if (poster) video.poster = poster;
      video.src = urlFor(item);
      video.addEventListener("loadedmetadata", requestSyncPreview);
      itemEl.appendChild(video);
      return video;
    }

    function playColumnVideo(itemEl) {
      var video = ensureColumnVideo(itemEl);
      if (!video) return;
      itemEl.classList.add("is-playing");
      video.play().catch(function () {});
    }

    function pausePanelMedia() {
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), pauseColumnVideo);
    }

    function unloadPanelMedia() {
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), unloadColumnVideo);
    }

    function observeColumnMedia() {
      if (mediaObserver) {
        mediaObserver.disconnect();
        mediaObserver = null;
      }
      if (!isPanelOpen()) {
        pausePanelMedia();
        return;
      }
      if (isPreviewOn() && !usesDualScrub()) {
        pausePanelMedia();
        return;
      }
      if (typeof IntersectionObserver === "undefined") {
        Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), hydrateColumnThumb);
        Array.prototype.forEach.call(column.querySelectorAll('.uiworks-item[data-kind="video"]'), playColumnVideo);
        return;
      }
      mediaObserver = new IntersectionObserver(
        function (entries) {
          if (!isPanelOpen() || (isPreviewOn() && !usesDualScrub())) return;
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              hydrateColumnThumb(entry.target);
              playColumnVideo(entry.target);
            } else {
              pauseColumnVideo(entry.target);
            }
          });
        },
        { root: column, rootMargin: "120% 0px", threshold: 0.01 }
      );
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), function (itemEl) {
        mediaObserver.observe(itemEl);
      });
    }

    function sleepPanel() {
      unloadPanelMedia();
      if (mediaObserver) {
        mediaObserver.disconnect();
        mediaObserver = null;
      }
      clearPreview();
      activePreviewId = null;
      setScrubVisible(false);
      finishColumnIntro(++columnIntroToken);
      if (columnEnterRaf) {
        cancelAnimationFrame(columnEnterRaf);
        columnEnterRaf = 0;
      }
    }

    function syncColumnIntroVars() {
      if (!windowEl) return;
      windowEl.style.setProperty("--works-intro-speed", introSpeed + "s");
      windowEl.style.setProperty("--works-intro-small-blur", introSmallBlur + "px");
      windowEl.style.setProperty("--works-intro-large-blur", introLargeBlur + "px");
      windowEl.style.setProperty("--works-intro-small-scale", String(introSmallScale));
      windowEl.style.setProperty("--works-intro-small-rise", introSmallRise + "px");
      windowEl.style.setProperty("--works-intro-large-scale", String(introLargeScale));
      var rise = introLargeRise;
      if (introLargeRiseRandomOn) rise = Math.round(Math.random() * introLargeRise);
      windowEl.style.setProperty("--works-intro-large-rise", rise + "px");
    }

    function finishColumnIntro(token) {
      if (token !== columnIntroToken) return;
      if (!windowEl) return;
      windowEl.classList.remove("is-column-intro");
      if (scrubWrap) {
        scrubWrap.classList.remove("is-intro-visible");
        clearIntroInline(scrubWrap);
      }
      var mainWrap = column && column.closest(".uiworks-column-wrap");
      if (mainWrap) {
        mainWrap.classList.remove("is-intro-visible");
        clearIntroInline(mainWrap);
      }
      void windowEl.offsetWidth;
    }

    function columnIntroFrom(kind) {
      if (kind === "small") {
        return {
          blur: introSmallBlur,
          rise: introSmallRise,
          scale: introSmallScale,
          origin: "left center",
        };
      }
      var rise = introLargeRise;
      if (introLargeRiseRandomOn) rise = Math.round(Math.random() * introLargeRise);
      return {
        blur: introLargeBlur,
        rise: rise,
        scale: introLargeScale,
        origin: "left center",
      };
    }

    function revealColumnIntroEl(el, token, kind) {
      if (!el || token !== columnIntroToken) return Promise.resolve();
      el.classList.remove("is-intro-visible");
      return animateIntroEl(el, columnIntroFrom(kind), Math.max(180, introSpeed * 1000), function () {
        return token !== columnIntroToken;
      }).then(function () {
        if (token !== columnIntroToken) return;
        el.classList.add("is-intro-visible");
        clearIntroInline(el);
      });
    }

    function nextIntroFrame() {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () {
          requestAnimationFrame(resolve);
        });
      });
    }

    function playColumnIntro() {
      if (!windowEl || !isPanelOpen()) return;
      var mainWrap = column && column.closest(".uiworks-column-wrap");
      var smallEl = scrubWrap && !scrubWrap.hidden ? scrubWrap : null;
      var largeEl = mainWrap || null;
      if (!smallEl && !largeEl) return;

      var token = ++columnIntroToken;
      syncColumnIntroVars();
      windowEl.classList.add("is-column-intro");
      if (smallEl) {
        smallEl.classList.remove("is-intro-visible");
        setIntroFrom(smallEl, columnIntroFrom("small"));
      }
      if (largeEl) {
        largeEl.classList.remove("is-intro-visible");
        setIntroFrom(largeEl, columnIntroFrom("large"));
      }
      void windowEl.offsetWidth;

      function wait(ms) {
        return new Promise(function (resolve) {
          window.setTimeout(function () {
            if (token !== columnIntroToken) return;
            resolve();
          }, ms);
        });
      }

      nextIntroFrame().then(function () {
        if (token !== columnIntroToken) return;

        var first = smallEl || largeEl;
        var firstKind = smallEl ? "small" : "large";
        var second = smallEl && largeEl ? largeEl : null;
        var secondKind = "large";
        if (introRandomizeOn && smallEl && largeEl && Math.random() < 0.5) {
          first = largeEl;
          firstKind = "large";
          second = smallEl;
          secondKind = "small";
        }

        if (introDelay <= 0) {
          var batch = [];
          if (first) batch.push(revealColumnIntroEl(first, token, firstKind));
          if (second) batch.push(revealColumnIntroEl(second, token, secondKind));
          Promise.all(batch).then(function () {
            finishColumnIntro(token);
          });
          return;
        }

        revealColumnIntroEl(first, token, firstKind)
          .then(function () {
            if (token !== columnIntroToken || !second) return;
            return wait(introDelay * 1000).then(function () {
              return revealColumnIntroEl(second, token, secondKind);
            });
          })
          .then(function () {
            finishColumnIntro(token);
          });
      });
    }

    function wakePanel() {
      ensureMedia().then(function () {
        if (!isPanelOpen()) return;
        layoutPreview();
        setScrubVisible(usesDualScrub());
        observeColumnMedia();
        syncPreview();
        playPreviewVideo();
        requestAnimationFrame(function () {
          playColumnIntro();
        });
      });
    }

    function ensureMedia() {
      if (mediaReady) return mediaReady;
      mediaReady = loadItems()
        .then(function () {
          render();
        })
        .catch(function () {
          items = [];
          render();
        });
      return mediaReady;
    }

    function layoutPreview() {
      if (!windowEl) return;
      var scrubW = isCompactView() ? 64 : preferredColumnWidth;
      var mainW = preferredMainWidth;
      var viewport = window.innerWidth;
      if (scrubW + mainW > viewport) {
        var overflow = scrubW + mainW - viewport;
        var mainCut = Math.min(overflow, Math.max(0, mainW - MAIN_FIT_MIN));
        mainW -= mainCut;
        overflow -= mainCut;
        if (overflow > 0 && !isCompactView()) {
          scrubW = Math.max(COLUMN_FIT_MIN, scrubW - overflow);
        } else if (overflow > 0) {
          mainW = Math.max(MAIN_FIT_MIN, viewport - scrubW);
        }
      }
      var rest = Math.max(0, viewport - scrubW);
      var mainLeft = scrubW;
      if (mainAlign === "right") {
        mainLeft = Math.max(scrubW, viewport - mainW);
      } else if (mainAlign === "center") {
        mainLeft = scrubW + Math.max(0, Math.round((rest - mainW) / 2));
      }
      windowEl.style.setProperty("--uiworks-scrub-width", Math.round(scrubW) + "px");
      windowEl.style.setProperty("--uiworks-main-width", Math.round(mainW) + "px");
      windowEl.style.setProperty("--uiworks-main-left", Math.round(mainLeft) + "px");
      windowEl.style.setProperty("--uiworks-column-width", "100%");
      windowEl.classList.toggle("is-scrub-reverse", scrubOrder === "reverse");
      setScrubVisible(usesDualScrub() && isPanelOpen());
    }

    function persistLayoutValue(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {}
      publishWorksLayout(prefix);
    }

    function applyColumnWidth(value, persist) {
      var next = clamp(value, WIDTH_MIN, WIDTH_MAX, WIDTH_DEFAULT);
      preferredColumnWidth = next;
      widthRange.value = String(next);
      widthNumber.value = String(next);
      if (persist) persistLayoutValue(WIDTH_KEY, String(next));
      layoutPreview();
      syncPreview();
      return next;
    }

    function applyScrollSens(value, persist) {
      var next = clamp(Number(value) * 10, SENS_MIN * 10, SENS_MAX * 10, SENS_DEFAULT * 10) / 10;
      scrollSensitivity = next;
      sensRange.value = String(next);
      sensNumber.value = String(next);
      if (persist) persistLayoutValue(SENS_KEY, String(next));
      return next;
    }

    function applyScrollSmooth(value, persist) {
      var next = clamp(value, SMOOTH_MIN, SMOOTH_MAX, SMOOTH_DEFAULT);
      scrollSmoothness = next / 100;
      smoothRange.value = String(next);
      smoothNumber.value = String(next);
      if (persist) persistLayoutValue(SMOOTH_KEY, String(next));
      return next;
    }

    function wheelDelta(event) {
      var delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= column.clientHeight;
      return delta;
    }

    function scrollMax(el) {
      el = el || scrollSource();
      return Math.max(0, el.scrollHeight - el.clientHeight);
    }

    function scrollSource() {
      return usesDualScrub() && scrubColumnEl ? scrubColumnEl : column;
    }

    function tickScroll() {
      scrollRaf = 0;
      if (scrollTarget == null) return;
      var el = scrollEl || scrollSource();
      var max = scrollMax(el);
      if (scrollTarget < 0) scrollTarget = 0;
      if (scrollTarget > max) scrollTarget = max;
      var current = el.scrollTop;
      var ease = 1 - scrollSmoothness;
      function afterScroll() {
        if (usesDualScrub()) {
          if (el === scrubColumnEl) syncMainFromScrub();
          else syncScrubFromMain();
        } else {
          requestSyncPreview();
        }
      }
      if (ease >= 0.999) {
        el.scrollTop = scrollTarget;
        scrollTarget = null;
        scrollEl = null;
        afterScroll();
        return;
      }
      var next = current + (scrollTarget - current) * Math.max(ease, 0.08);
      el.scrollTop = next;
      afterScroll();
      if (Math.abs(scrollTarget - next) < 0.5) {
        el.scrollTop = scrollTarget;
        scrollTarget = null;
        scrollEl = null;
        afterScroll();
        return;
      }
      scrollRaf = requestAnimationFrame(tickScroll);
    }

    function applyScrollDelta(delta, el) {
      el = el || scrollSource();
      if (scrubOrder === "reverse" && el === scrubColumnEl) delta = -delta;
      if (scrollEl && scrollEl !== el) {
        seizeScrollDriver(el === scrubColumnEl ? "scrub" : "main");
      }
      scrollEl = el;
      if (scrollTarget == null) scrollTarget = el.scrollTop;
      scrollTarget += delta * scrollSensitivity;
      var max = scrollMax(el);
      if (scrollTarget < 0) scrollTarget = 0;
      if (scrollTarget > max) scrollTarget = max;
      if (!scrollRaf) scrollRaf = requestAnimationFrame(tickScroll);
    }

    function seizeScrollDriver(driver) {
      scrollDriver = driver;
      if (scrollRaf) {
        cancelAnimationFrame(scrollRaf);
        scrollRaf = 0;
      }
      scrollTarget = null;
      scrollEl = null;
      if (scrubFromMainRaf) {
        cancelAnimationFrame(scrubFromMainRaf);
        scrubFromMainRaf = 0;
      }
      if (mainFromScrubRaf) {
        cancelAnimationFrame(mainFromScrubRaf);
        mainFromScrubRaf = 0;
      }
    }

    function applyMainWidth(value, persist) {
      var next = clamp(value, MAIN_WIDTH_MIN, MAIN_WIDTH_MAX, MAIN_WIDTH_DEFAULT);
      preferredMainWidth = next;
      mainWidthRange.value = String(next);
      mainWidthNumber.value = String(next);
      if (persist) persistLayoutValue(MAIN_WIDTH_KEY, String(next));
      layoutPreview();
      return next;
    }

    function applyMainAlign(value, persist) {
      var next = value === "left" || value === "right" || value === "center" ? value : MAIN_ALIGN_DEFAULT;
      mainAlign = next;
      mainAlignSelect.value = next;
      if (windowEl) {
        windowEl.classList.toggle("is-main-align-left", next === "left");
        windowEl.classList.toggle("is-main-align-center", next === "center");
        windowEl.classList.toggle("is-main-align-right", next === "right");
      }
      if (persist) persistLayoutValue(MAIN_ALIGN_KEY, next);
      layoutPreview();
      return next;
    }

    function applyMediaFit(value, persist) {
      var next = value === "height" ? "height" : "width";
      mediaFit = next;
      mediaFitSelect.value = next;
      if (windowEl) {
        windowEl.classList.toggle("is-media-fit-width", next === "width");
        windowEl.classList.toggle("is-media-fit-height", next === "height");
      }
      if (persist) persistLayoutValue(MEDIA_FIT_KEY, next);
      layoutPreview();
      requestSyncPreview();
      return next;
    }

    function applyScrubOrder(value, persist) {
      var next = value === "reverse" ? "reverse" : "normal";
      var changed = next !== scrubOrder;
      scrubOrder = next;
      scrubOrderSelect.value = next;
      if (windowEl) {
        windowEl.classList.toggle("is-scrub-reverse", next === "reverse");
      }
      if (persist) persistLayoutValue(SCRUB_ORDER_KEY, next);
      if (changed && scrubColumnEl) {
        renderScrubColumn();
        requestAnimationFrame(function () {
          resetScrubScrollToStart();
          syncScrubFromMain();
          markActiveFromScrub();
        });
      }
      return next;
    }

    function applyIntroSmallBlur(value, persist) {
      var next = clamp(Number(value) * 10, 0, 240, 0) / 10;
      introSmallBlur = next;
      introSmallBlurRange.value = String(next);
      introSmallBlurNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_SMALL_BLUR_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroLargeBlur(value, persist) {
      var next = clamp(Number(value) * 10, 0, 240, 0) / 10;
      introLargeBlur = next;
      introLargeBlurRange.value = String(next);
      introLargeBlurNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_LARGE_BLUR_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroSpeed(value, persist) {
      var next = clamp(Number(value) * 100, 10, 200, 55) / 100;
      introSpeed = next;
      introSpeedRange.value = String(next);
      introSpeedNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_SPEED_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroDelay(value, persist) {
      var next = clamp(Number(value) * 100, 0, 200, 25) / 100;
      introDelay = next;
      introDelayRange.value = String(next);
      introDelayNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_DELAY_KEY, String(next));
      return next;
    }

    function applyIntroSmallScale(value, persist) {
      var next = clamp(Number(value) * 100, 20, 200, 100) / 100;
      introSmallScale = next;
      introSmallScaleRange.value = String(next);
      introSmallScaleNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_SMALL_SCALE_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroSmallRise(value, persist) {
      var next = clamp(value, 0, 200, 0);
      introSmallRise = next;
      introSmallRiseRange.value = String(next);
      introSmallRiseNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_SMALL_RISE_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroLargeScale(value, persist) {
      var next = clamp(Number(value) * 100, 20, 200, 85) / 100;
      introLargeScale = next;
      introLargeScaleRange.value = String(next);
      introLargeScaleNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_LARGE_SCALE_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroLargeRise(value, persist) {
      var next = clamp(value, 0, 200, 40);
      introLargeRise = next;
      introLargeRiseRange.value = String(next);
      introLargeRiseNumber.value = String(next);
      if (persist) persistLayoutValue(INTRO_LARGE_RISE_KEY, String(next));
      syncColumnIntroVars();
      return next;
    }

    function applyIntroLargeRiseRandom(on, persist) {
      introLargeRiseRandomOn = !!on;
      introLargeRiseRandom.checked = introLargeRiseRandomOn;
      if (persist) persistLayoutValue(INTRO_LARGE_RISE_RANDOM_KEY, introLargeRiseRandomOn ? "1" : "0");
      return introLargeRiseRandomOn;
    }

    function applyIntroRandomize(on, persist) {
      introRandomizeOn = !!on;
      introRandomize.checked = introRandomizeOn;
      if (persist) persistLayoutValue(INTRO_RANDOMIZE_KEY, introRandomizeOn ? "1" : "0");
      return introRandomizeOn;
    }

    function resetScrubScrollToStart() {
      if (!scrubColumnEl) return;
      function apply() {
        if (!scrubColumnEl) return;
        scrubColumnEl.scrollTop = scrubOrder === "reverse" ? scrollMax(scrubColumnEl) : 0;
      }
      apply();
      // Mobile: thumbs load async and grow scrollHeight — pin start again after layout.
      requestAnimationFrame(apply);
    }

    function mapScrubProgressToMain(progress) {
      return scrubOrder === "reverse" ? 1 - progress : progress;
    }

    function mapMainProgressToScrub(progress) {
      return scrubOrder === "reverse" ? 1 - progress : progress;
    }

    function readStorage(key, fallback) {
      return readParam(key, fallback);
    }

    function setScrubVisible(on) {
      if (!scrubWrap) return;
      scrubWrap.hidden = !on;
      if (windowEl) {
        windowEl.classList.toggle("is-dual-scrub", on);
        windowEl.classList.toggle("is-scrub-reverse", on && scrubOrder === "reverse");
      }
      if (on) {
        if (windowEl) windowEl.classList.add("is-preview");
        renderScrubColumn();
        requestAnimationFrame(function () {
          if (!scrubColumnEl) return;
          column.scrollTop = 0;
          resetScrubScrollToStart();
          syncScrubFromMain();
          markActiveFromScrub();
        });
      }
    }

    function getScrollProgress(el) {
      if (!el) return 0;
      var max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (max <= 0) return 0;
      var progress = el.scrollTop / max;
      if (progress < 0) return 0;
      if (progress > 1) return 1;
      return progress;
    }

    function setScrollProgress(el, progress) {
      if (!el) return;
      var max = Math.max(0, el.scrollHeight - el.clientHeight);
      if (progress < 0) progress = 0;
      if (progress > 1) progress = 1;
      el.scrollTop = progress * max;
    }

    function markActive(id) {
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), function (node) {
        node.classList.toggle("is-active", !!(id && node.dataset.id === id));
      });
      if (scrubColumnEl) {
        Array.prototype.forEach.call(scrubColumnEl.querySelectorAll(".uiworks-item"), function (node) {
          node.classList.toggle("is-active", !!(id && node.dataset.id === id));
        });
      }
    }

    function markActiveFromScrub() {
      if (!scrubColumnEl) return;
      var active = itemAtScrubIn(scrubColumnEl);
      markActive(active && active.dataset.id);
    }

    function syncMainFromScrub() {
      if (!usesDualScrub() || !scrubColumnEl) return;
      if (scrollDriver === "main") return;
      setScrollProgress(column, mapScrubProgressToMain(getScrollProgress(scrubColumnEl)));
      markActiveFromScrub();
    }

    function syncScrubFromMain() {
      if (!usesDualScrub() || !scrubColumnEl) return;
      if (scrollDriver === "scrub") return;
      setScrollProgress(scrubColumnEl, mapMainProgressToScrub(getScrollProgress(column)));
      markActiveFromScrub();
    }

    function requestSyncScrubFromMain() {
      if (!usesDualScrub()) return;
      if (scrollDriver === "scrub") return;
      if (scrubFromMainRaf) return;
      scrubFromMainRaf = requestAnimationFrame(function () {
        scrubFromMainRaf = 0;
        syncScrubFromMain();
      });
    }

    function requestSyncMainFromScrub() {
      if (!usesDualScrub()) return;
      if (scrollDriver === "main") return;
      if (mainFromScrubRaf) return;
      mainFromScrubRaf = requestAnimationFrame(function () {
        mainFromScrubRaf = 0;
        syncMainFromScrub();
      });
    }

    function itemAtScrubIn(source) {
      var nodes = source.querySelectorAll(".uiworks-item");
      if (!nodes.length) return null;
      var lineY;
      var scrub = source.querySelector(":scope > .uiworks-scrub") || source.querySelector(".uiworks-scrub");
      if (scrub) {
        var scrubRect = scrub.getBoundingClientRect();
        if (scrubRect.height > 0) lineY = scrubRect.top + scrubRect.height / 2;
      }
      if (lineY == null) {
        var bounds = source.getBoundingClientRect();
        lineY = bounds.top + bounds.height / 2;
      }
      var closest = null;
      var closestDist = Infinity;
      for (var i = 0; i < nodes.length; i++) {
        var rect = nodes[i].getBoundingClientRect();
        if (rect.top <= lineY && rect.bottom > lineY) return nodes[i];
        var dist = Math.abs((rect.top + rect.bottom) / 2 - lineY);
        if (dist < closestDist) {
          closestDist = dist;
          closest = nodes[i];
        }
      }
      return closest;
    }

    function itemAtScrub() {
      return itemAtScrubIn(scrubColumn());
    }

    function warmUrl(url) {
      if (!url || prefetchWarm[url]) return;
      prefetchWarm[url] = true;
      var img = new Image();
      img.decoding = "async";
      img.src = url;
    }

    function prefetchAround(id) {
      var index = items.findIndex(function (entry) {
        return entry.id === id;
      });
      if (index < 0) return;
      for (var offset = -4; offset <= 4; offset++) {
        var item = items[index + offset];
        if (!item) continue;
        var thumb = urlForThumb(item);
        if (thumb) warmUrl(thumb);
        if (mediaKind(item) === "image") warmUrl(urlFor(item));
      }
    }

    function setPreviewBackdrop(thumb) {
      if (thumb) {
        previewEl.style.backgroundImage = 'url("' + thumb.replace(/"/g, '\\"') + '")';
      } else {
        previewEl.style.backgroundImage = "";
      }
    }

    function showPreview(id) {
      var item = items.find(function (entry) {
        return entry.id === id;
      });
      if (!item) {
        clearPreview();
        return;
      }
      previewEl.hidden = false;
      previewEl.classList.add("is-visible");
      var current = previewEl.getAttribute("data-preview-id");
      var kind = mediaKind(item);
      var thumb = urlForThumb(item);
      setPreviewBackdrop(thumb);
      prefetchAround(id);
      if (current === id) {
        if (kind === "video") playPreviewVideo();
        return;
      }
      previewEl.setAttribute("data-preview-id", id);
      if (kind === "video") {
        previewImageToken += 1;
        if (previewImg) {
          previewImg.remove();
          previewImg = null;
        }
        var video = ensurePreviewVideo();
        if (video.parentNode !== previewEl) previewEl.appendChild(video);
        previewEl.classList.add("has-video");
        var src = urlForPreview(item);
        if (thumb) video.poster = thumb;
        if (video.getAttribute("src") !== src && video.src !== src) {
          video.classList.add("is-loading");
          video.pause();
          video.src = src;
        } else {
          video.classList.remove("is-loading");
        }
        playPreviewVideo();
        return;
      }
      previewEl.classList.remove("has-video");
      if (previewVideo) {
        previewVideo.pause();
        // Keep element/src warm only while browsing videos; drop when showing stills
        // so a single decoder stays free for the next video scrub.
        previewVideo.removeAttribute("src");
        try {
          previewVideo.load();
        } catch (error) {}
        previewVideo.remove();
        previewVideo = null;
      }
      if (!previewImg || !previewImg.isConnected) {
        previewImg = document.createElement("img");
        previewImg.alt = "";
        previewEl.appendChild(previewImg);
      }
      var full = urlFor(item);
      if (thumb && thumb !== full) {
        previewImg.src = thumb;
        previewImageToken += 1;
        var token = previewImageToken;
        var loader = new Image();
        loader.decoding = "async";
        loader.onload = function () {
          if (token !== previewImageToken) return;
          if (previewEl.getAttribute("data-preview-id") !== id) return;
          if (previewImg) previewImg.src = full;
        };
        loader.src = full;
      } else {
        previewImg.src = full;
      }
    }

    function clearPreview() {
      previewImageToken += 1;
      releasePreviewMedia();
      setPreviewBackdrop("");
      previewEl.removeAttribute("data-preview-id");
      previewEl.classList.remove("has-video");
      previewEl.hidden = true;
      previewEl.classList.remove("is-visible");
    }

    function releasePreviewMedia() {
      if (previewVideo) {
        previewVideo.pause();
        previewVideo.removeAttribute("src");
        previewVideo.remove();
        previewVideo = null;
      }
      if (previewImg) {
        previewImg.remove();
        previewImg = null;
      }
      previewEl.innerHTML = "";
    }

    function compressPreview(item) {
      if (previewUrls[item.id]) return Promise.resolve(previewUrls[item.id]);
      if (!item.blob) return Promise.resolve(urlFor(item));
      if (previewPending[item.id]) return previewPending[item.id];
      previewPending[item.id] = compressImageBlob(item.blob, PREVIEW_MAX_EDGE)
        .then(function (blob) {
          previewUrls[item.id] = URL.createObjectURL(blob);
          delete previewPending[item.id];
          return previewUrls[item.id];
        })
        .catch(function () {
          delete previewPending[item.id];
          return urlFor(item);
        });
      return previewPending[item.id];
    }

    function compressImageBlob(blob, maxEdge) {
      var load = window.createImageBitmap
        ? createImageBitmap(blob)
        : new Promise(function (resolve, reject) {
            var img = new Image();
            var url = URL.createObjectURL(blob);
            img.onload = function () {
              URL.revokeObjectURL(url);
              resolve(img);
            };
            img.onerror = function () {
              URL.revokeObjectURL(url);
              reject(new Error("image"));
            };
            img.src = url;
          });
      return load.then(function (bitmap) {
        var w = bitmap.width || bitmap.naturalWidth;
        var h = bitmap.height || bitmap.naturalHeight;
        var scale = Math.min(1, maxEdge / Math.max(w, h));
        if (scale >= 1 && (blob.type === "image/jpeg" || blob.type === "image/webp")) {
          if (bitmap.close) bitmap.close();
          return blob;
        }
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(bitmap, 0, 0, cw, ch);
        if (bitmap.close) bitmap.close();
        return new Promise(function (resolve, reject) {
          canvas.toBlob(
            function (out) {
              if (out) resolve(out);
              else reject(new Error("blob"));
            },
            "image/jpeg",
            0.74
          );
        });
      });
    }

    function syncPreview() {
      if (!isPanelOpen() || !items.length) {
        clearPreview();
        activePreviewId = null;
        return;
      }
      clearPreview();
      if (usesDualScrub()) requestSyncScrubFromMain();
    }

    function seedMissingKeys() {
      // Shared layout keys live under graphicworks prefix (canonical).
      // If a shared key is empty, fall back once from legacy uiworks keys.
      var suffixes = [
        "column-width",
        "main-column-width",
        "main-column-align",
        "media-fit",
        "scrub-order",
        "intro-small-blur",
        "intro-large-blur",
        "intro-speed",
        "intro-delay",
        "intro-small-scale",
        "intro-small-rise",
        "intro-large-scale",
        "intro-large-rise",
        "intro-large-rise-random",
        "intro-randomize",
        "scroll-sens",
        "scroll-smooth",
        "preview-width",
      ];
      suffixes.forEach(function (suffix) {
        try {
          var sharedKey = WORKS_LAYOUT_PREFIX + "-" + suffix;
          if (localStorage.getItem(sharedKey) != null) return;
          var legacy = localStorage.getItem("errormade-uiworks-" + suffix);
          if (legacy != null) localStorage.setItem(sharedKey, legacy);
        } catch (error) {}
      });
    }

    function loadStoredWidths() {
      var scrub = readStorage(WIDTH_KEY, String(WIDTH_DEFAULT));
      var main = readStorage(MAIN_WIDTH_KEY, null);
      if (main == null) main = readStorage(MAIN_WIDTH_LEGACY_KEY, String(MAIN_WIDTH_DEFAULT));
      applyColumnWidth(scrub, false);
      applyMainWidth(main, false);
    }

    function loadLayout() {
      seedMissingKeys();
      loadStoredWidths();
      applyMainAlign(readStorage(MAIN_ALIGN_KEY, MAIN_ALIGN_DEFAULT), false);
      applyMediaFit(readStorage(MEDIA_FIT_KEY, MEDIA_FIT_DEFAULT), false);
      applyScrubOrder(readStorage(SCRUB_ORDER_KEY, SCRUB_ORDER_DEFAULT), false);
      applyIntroSmallBlur(readStorage(INTRO_SMALL_BLUR_KEY, "12.5"), false);
      applyIntroLargeBlur(readStorage(INTRO_LARGE_BLUR_KEY, "12"), false);
      applyIntroSpeed(readStorage(INTRO_SPEED_KEY, "0.55"), false);
      applyIntroDelay(readStorage(INTRO_DELAY_KEY, "0"), false);
      applyIntroSmallScale(readStorage(INTRO_SMALL_SCALE_KEY, "1"), false);
      applyIntroSmallRise(readStorage(INTRO_SMALL_RISE_KEY, "20"), false);
      applyIntroLargeScale(readStorage(INTRO_LARGE_SCALE_KEY, "1"), false);
      applyIntroLargeRise(readStorage(INTRO_LARGE_RISE_KEY, "20"), false);
      applyIntroLargeRiseRandom(readStorage(INTRO_LARGE_RISE_RANDOM_KEY, "0") === "1", false);
      applyIntroRandomize(readStorage(INTRO_RANDOMIZE_KEY, "0") === "1", false);
      applyScrollSens(readStorage(SENS_KEY, String(SENS_DEFAULT)), false);
      applyScrollSmooth(readStorage(SMOOTH_KEY, String(SMOOTH_DEFAULT)), false);
      if (windowEl) windowEl.classList.add("is-preview");
      layoutPreview();
    }

    worksLayoutListeners.push({
      id: prefix,
      reload: function () {
        loadLayout();
      },
    });

    function getDb() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (resolve, reject) {
        var request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = function () {
          var db = request.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: "id" });
          }
        };
        request.onsuccess = function () {
          resolve(request.result);
        };
        request.onerror = function () {
          reject(request.error);
        };
      });
      return dbPromise;
    }

    function applyManifest(list) {
      items = (list || []).slice().sort(function (a, b) {
        return (a.sort || 0) - (b.sort || 0);
      });
      return items;
    }

    function loadItemsFromDb() {
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, "readonly");
          var request = tx.objectStore(STORE).getAll();
          request.onsuccess = function () {
            items = (request.result || []).slice().sort(function (a, b) {
              return a.sort - b.sort;
            });
            resolve(items);
          };
          request.onerror = function () {
            reject(request.error);
          };
        });
      });
    }

    function loadItems() {
      if (options.manifestId) {
        var embedded = document.getElementById(options.manifestId);
        if (embedded && embedded.textContent.trim()) {
          try {
            return Promise.resolve(applyManifest(JSON.parse(embedded.textContent)));
          } catch (error) {}
        }
      }
      if (options.manifest) {
        return fetch(options.manifest, { cache: "no-cache" })
          .then(function (res) {
            if (!res.ok) throw new Error("manifest");
            return res.json();
          })
          .then(applyManifest)
          .catch(function () {
            return loadItemsFromDb();
          });
      }
      return loadItemsFromDb();
    }

    function applyDomOrder(nodeList) {
      var ids = Array.prototype.map.call(nodeList, function (node) {
        return node.dataset.id;
      });
      items.sort(function (a, b) {
        return ids.indexOf(a.id) - ids.indexOf(b.id);
      });
      persistAll().then(render);
    }

    function persistAll() {
      if (options.manifest) return Promise.resolve();
      return getDb().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, "readwrite");
          var store = tx.objectStore(STORE);
          store.clear();
          items.forEach(function (item, index) {
            item.sort = index;
            store.put(item);
          });
          tx.oncomplete = function () {
            resolve();
          };
          tx.onerror = function () {
            reject(tx.error);
          };
        });
      });
    }

    function revokeAll() {
      Object.keys(urls).forEach(function (id) {
        URL.revokeObjectURL(urls[id]);
      });
      Object.keys(previewUrls).forEach(function (id) {
        URL.revokeObjectURL(previewUrls[id]);
      });
      Object.keys(previewMediaUrls).forEach(function (id) {
        URL.revokeObjectURL(previewMediaUrls[id]);
      });
      urls = {};
      previewUrls = {};
      previewMediaUrls = {};
      previewPending = {};
    }

    function isMediaFile(file) {
      if (!file) return false;
      if (file.type && (file.type.indexOf("image/") === 0 || file.type.indexOf("video/") === 0)) {
        return true;
      }
      return /\.(png|jpe?g|gif|webp|avif|bmp|svg|mp4|webm|mov|m4v|ogg)$/i.test(file.name || "");
    }

    function newId() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }

    function mediaKind(item) {
      var type = (item.mime || (item.blob && item.blob.type) || "").toLowerCase();
      if (type.indexOf("video/") === 0) return "video";
      if (/\.(mp4|webm|mov|m4v|ogg)$/i.test(item.src || item.name || "")) return "video";
      return "image";
    }

    function urlFor(item) {
      if (item.src) return item.src;
      if (!urls[item.id]) urls[item.id] = URL.createObjectURL(item.blob);
      return urls[item.id];
    }

    function urlForThumb(item) {
      if (item.thumb) return item.thumb;
      if (mediaKind(item) === "image") return urlFor(item);
      return "";
    }

    function urlForPreview(item) {
      if (item.blob) {
        if (!previewMediaUrls[item.id]) {
          var blob = item.blob;
          if (!blob.type || blob.type.indexOf("video/") !== 0) {
            blob = new Blob([blob], { type: item.mime || "video/mp4" });
          }
          previewMediaUrls[item.id] = URL.createObjectURL(blob);
        }
        return previewMediaUrls[item.id];
      }
      if (!item.src) return urlFor(item);
      try {
        var url = new URL(item.src, document.baseURI);
        if (url.protocol === "file:") {
          url.hash = "em-preview";
        } else {
          url.searchParams.set("em-preview", "1");
        }
        return url.href;
      } catch (error) {
        return item.src;
      }
    }

    function attachScrub() {
      var scrub = column.querySelector(".uiworks-scrub");
      if (!scrub) {
        scrub = document.createElement("div");
        scrub.className = "uiworks-scrub";
        scrub.setAttribute("aria-hidden", "true");
      }
      column.insertBefore(scrub, column.firstChild);
    }

    function renderScrubColumn() {
      if (!scrubColumnEl) return;
      var scrub = scrubColumnEl.querySelector(".uiworks-scrub");
      scrubColumnEl.innerHTML = "";
      if (!scrub) {
        scrub = document.createElement("div");
        scrub.className = "uiworks-scrub";
        scrub.setAttribute("aria-hidden", "true");
      }
      scrubColumnEl.appendChild(scrub);
      if (!items.length) {
        scrubColumnEl.classList.remove("has-media");
        return;
      }
      scrubColumnEl.classList.add("has-media");
      var scrubItems = scrubOrder === "reverse" ? items.slice().reverse() : items;
      scrubItems.forEach(function (item, index) {
        var kind = mediaKind(item);
        var thumb = urlForThumb(item) || (kind === "image" ? urlFor(item) : "");
        var node = document.createElement("div");
        node.className = "uiworks-item";
        node.dataset.id = item.id;
        node.dataset.kind = kind;
        if (thumb) {
          var img = document.createElement("img");
          img.alt = "";
          img.decoding = "async";
          img.loading = index < 12 ? "eager" : "lazy";
          img.width = item.thumbW || preferredColumnWidth;
          img.height =
            item.thumbH ||
            Math.round((item.thumbW || preferredColumnWidth) * 1.25);
          img.src = thumb;
          node.appendChild(img);
        }
        scrubColumnEl.appendChild(node);
      });
    }

    function renderColumn() {
      var placeholders =
        '<div class="uiworks-block uiworks-block-1"></div>' +
        '<div class="uiworks-block uiworks-block-2"></div>';
      if (!items.length) {
        column.classList.remove("has-media");
        column.innerHTML = placeholders;
        attachScrub();
        renderScrubColumn();
        return;
      }
      column.classList.add("has-media");
      column.innerHTML = items
        .map(function (item, index) {
          var kind = mediaKind(item);
          var thumb = urlForThumb(item) || (kind === "image" ? urlFor(item) : "");
          var w = item.thumbW || 1400;
          var h = item.thumbH || 1050;
          return (
            '<div class="uiworks-item" draggable="true" data-id="' +
            item.id +
            '" data-kind="' +
            kind +
            '">' +
            (thumb
              ? '<img alt="" decoding="async" width="' +
                w +
                '" height="' +
                h +
                '" src="' +
                thumb +
                '"' +
                (index < 8 ? ' fetchpriority="high"' : "") +
                ' loading="eager">'
              : "") +
            "</div>"
          );
        })
        .join("");
      attachScrub();
      renderScrubColumn();
      items.forEach(function (item) {
        var thumb = urlForThumb(item);
        if (thumb) warmUrl(thumb);
      });
      if (isPreviewOn() && items[0]) prefetchAround(items[0].id);
    }

    function bindAction(button, handler) {
      button.addEventListener("pointerdown", function (event) {
        event.stopPropagation();
      });
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        handler();
      });
    }

    function renderList() {
      listEl.innerHTML = "";
      if (!items.length) {
        var empty = document.createElement("li");
        empty.className = "params-empty";
        empty.textContent = "no media";
        listEl.appendChild(empty);
        return;
      }
      items.forEach(function (item, index) {
        var row = document.createElement("li");
        row.className = "params-row";
        row.dataset.id = item.id;

        var handle = document.createElement("span");
        handle.className = "params-handle";
        handle.draggable = true;
        handle.textContent = ":::";
        handle.title = "drag to reorder";

        var thumb = document.createElement("div");
        thumb.className = "params-thumb";
        if (mediaKind(item) === "video") {
          var video = document.createElement("video");
          video.muted = true;
          video.playsInline = true;
          video.preload = "none";
          video.setAttribute("data-src", urlFor(item));
          thumb.appendChild(video);
        } else {
          var img = document.createElement("img");
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          thumb.appendChild(img);
          compressPreview(item).then(function (src) {
            img.src = src;
          });
        }

        var name = document.createElement("span");
        name.className = "params-name";
        name.textContent = item.name;
        name.title = item.name;

        var actions = document.createElement("div");
        actions.className = "params-actions";

        var up = document.createElement("button");
        up.type = "button";
        up.textContent = "up";
        up.disabled = index === 0;
        bindAction(up, function () {
          moveItem(item.id, -1);
        });

        var down = document.createElement("button");
        down.type = "button";
        down.textContent = "down";
        down.disabled = index === items.length - 1;
        bindAction(down, function () {
          moveItem(item.id, 1);
        });

        var del = document.createElement("button");
        del.type = "button";
        del.textContent = "delete";
        bindAction(del, function () {
          removeItem(item.id);
        });

        actions.appendChild(up);
        actions.appendChild(down);
        actions.appendChild(del);
        row.appendChild(handle);
        row.appendChild(thumb);
        row.appendChild(name);
        row.appendChild(actions);
        listEl.appendChild(row);
      });
    }

    function render() {
      activePreviewId = null;
      renderColumn();
      listDirty = true;
      if (isThisParamsOpen()) {
        renderList();
        listDirty = false;
      }
      Array.prototype.forEach.call(column.querySelectorAll("img, video"), function (media) {
        media.addEventListener("load", requestSyncPreview);
        media.addEventListener("loadedmetadata", requestSyncPreview);
      });
      if (isPanelOpen()) observeColumnMedia();
      requestSyncPreview();
    }

    function moveItem(id, delta) {
      var index = items.findIndex(function (item) {
        return item.id === id;
      });
      var next = index + delta;
      if (index < 0 || next < 0 || next >= items.length) return;
      var current = items[index];
      items.splice(index, 1);
      items.splice(next, 0, current);
      render();
      persistAll();
    }

    function removeItem(id) {
      items = items.filter(function (item) {
        return item.id !== id;
      });
      if (urls[id]) {
        URL.revokeObjectURL(urls[id]);
        delete urls[id];
      }
      if (previewUrls[id]) {
        URL.revokeObjectURL(previewUrls[id]);
        delete previewUrls[id];
      }
      if (previewMediaUrls[id]) {
        URL.revokeObjectURL(previewMediaUrls[id]);
        delete previewMediaUrls[id];
      }
      delete previewPending[id];
      render();
      persistAll();
    }

    function addFiles(fileList) {
      var files = Array.prototype.slice.call(fileList || []).filter(isMediaFile);
      if (!files.length) return Promise.resolve();
      files.forEach(function (file) {
        items.push({
          id: newId(),
          name: file.name,
          mime: file.type || "",
          blob: file,
          sort: items.length,
        });
      });
      return persistAll().then(render);
    }

    function openParams() {
      if (listDirty) {
        renderList();
        listDirty = false;
      }
      paramsModal.hidden = false;
      paramsModal.classList.add("is-open");
      document.body.classList.add("is-params-open");
    }

    function closeThisParams() {
      paramsModal.classList.remove("is-open");
      paramsModal.hidden = true;
      if (!document.querySelector(".params-modal.is-open")) {
        document.body.classList.remove("is-params-open");
      }
    }

    function isThisParamsOpen() {
      return paramsModal.classList.contains("is-open");
    }

    openBtn.addEventListener("click", openParams);

    closeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeThisParams();
      openBtn.focus();
    });

    paramsModal.addEventListener("click", function (event) {
      if (event.target === paramsModal) closeThisParams();
    });

    uploadBtn.addEventListener("click", function () {
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      addFiles(fileInput.files).then(function () {
        fileInput.value = "";
      });
    });

    var panel = paramsModal.querySelector(".params-panel");
    if (panel) {
      panel.addEventListener("dragover", function (event) {
        event.preventDefault();
      });
      panel.addEventListener("drop", function (event) {
        if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
        event.preventDefault();
        addFiles(event.dataTransfer.files);
      });
    }

    listEl.addEventListener("dragstart", function (event) {
      var handle = event.target.closest(".params-handle");
      var row = event.target.closest(".params-row");
      if (!handle || !row) {
        event.preventDefault();
        return;
      }
      dragId = row.dataset.id;
      row.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragId);
    });

    listEl.addEventListener("dragend", function () {
      dragId = null;
      Array.prototype.forEach.call(listEl.querySelectorAll(".params-row"), function (row) {
        row.classList.remove("is-dragging");
      });
    });

    listEl.addEventListener("dragover", function (event) {
      event.preventDefault();
      var row = event.target.closest(".params-row");
      var dragging = listEl.querySelector(".is-dragging");
      if (!row || !dragging || row === dragging) return;
      var rect = row.getBoundingClientRect();
      if (event.clientY > rect.top + rect.height / 2) {
        row.after(dragging);
      } else {
        row.before(dragging);
      }
    });

    listEl.addEventListener("drop", function (event) {
      event.preventDefault();
      event.stopPropagation();
      applyDomOrder(listEl.querySelectorAll(".params-row"));
    });

    column.addEventListener("dragstart", function (event) {
      var item = event.target.closest(".uiworks-item");
      if (!item) return;
      dragId = item.dataset.id;
      item.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", dragId);
    });

    column.addEventListener("dragend", function () {
      dragId = null;
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), function (item) {
        item.classList.remove("is-dragging");
      });
    });

    column.addEventListener("dragover", function (event) {
      event.preventDefault();
      var item = event.target.closest(".uiworks-item");
      var dragging = column.querySelector(".is-dragging");
      if (!item || !dragging || item === dragging) return;
      var rect = item.getBoundingClientRect();
      if (event.clientY > rect.top + rect.height / 2) {
        item.after(dragging);
      } else {
        item.before(dragging);
      }
    });

    column.addEventListener("drop", function (event) {
      event.preventDefault();
      applyDomOrder(column.querySelectorAll(".uiworks-item"));
    });

    widthRange.addEventListener("input", function () {
      applyColumnWidth(widthRange.value, false);
    });
    widthRange.addEventListener("change", function () {
      applyColumnWidth(widthRange.value, true);
    });
    widthNumber.addEventListener("input", function () {
      applyColumnWidth(widthNumber.value, false);
    });
    widthNumber.addEventListener("change", function () {
      applyColumnWidth(widthNumber.value, true);
    });
    mainWidthRange.addEventListener("input", function () {
      applyMainWidth(mainWidthRange.value, false);
    });
    mainWidthRange.addEventListener("change", function () {
      applyMainWidth(mainWidthRange.value, true);
    });
    mainWidthNumber.addEventListener("input", function () {
      applyMainWidth(mainWidthNumber.value, false);
    });
    mainWidthNumber.addEventListener("change", function () {
      applyMainWidth(mainWidthNumber.value, true);
    });
    mainAlignSelect.addEventListener("change", function () {
      applyMainAlign(mainAlignSelect.value, true);
    });
    mediaFitSelect.addEventListener("change", function () {
      applyMediaFit(mediaFitSelect.value, true);
    });
    scrubOrderSelect.addEventListener("change", function () {
      applyScrubOrder(scrubOrderSelect.value, true);
    });
    function bindIntroPair(rangeEl, numberEl, applyFn) {
      rangeEl.addEventListener("input", function () {
        applyFn(rangeEl.value, false);
      });
      rangeEl.addEventListener("change", function () {
        applyFn(rangeEl.value, true);
      });
      numberEl.addEventListener("input", function () {
        applyFn(numberEl.value, false);
      });
      numberEl.addEventListener("change", function () {
        applyFn(numberEl.value, true);
      });
    }
    bindIntroPair(introSmallBlurRange, introSmallBlurNumber, applyIntroSmallBlur);
    bindIntroPair(introLargeBlurRange, introLargeBlurNumber, applyIntroLargeBlur);
    bindIntroPair(introSpeedRange, introSpeedNumber, applyIntroSpeed);
    bindIntroPair(introDelayRange, introDelayNumber, applyIntroDelay);
    bindIntroPair(introSmallScaleRange, introSmallScaleNumber, applyIntroSmallScale);
    bindIntroPair(introSmallRiseRange, introSmallRiseNumber, applyIntroSmallRise);
    bindIntroPair(introLargeScaleRange, introLargeScaleNumber, applyIntroLargeScale);
    bindIntroPair(introLargeRiseRange, introLargeRiseNumber, applyIntroLargeRise);
    introLargeRiseRandom.addEventListener("change", function () {
      applyIntroLargeRiseRandom(introLargeRiseRandom.checked, true);
    });
    introRandomize.addEventListener("change", function () {
      applyIntroRandomize(introRandomize.checked, true);
    });
    introReplayBtn.addEventListener("click", function () {
      if (isPanelOpen()) playColumnIntro();
    });
    sensRange.addEventListener("input", function () {
      applyScrollSens(sensRange.value, false);
    });
    sensRange.addEventListener("change", function () {
      applyScrollSens(sensRange.value, true);
    });
    sensNumber.addEventListener("input", function () {
      applyScrollSens(sensNumber.value, false);
    });
    sensNumber.addEventListener("change", function () {
      applyScrollSens(sensNumber.value, true);
    });
    smoothRange.addEventListener("input", function () {
      applyScrollSmooth(smoothRange.value, false);
    });
    smoothRange.addEventListener("change", function () {
      applyScrollSmooth(smoothRange.value, true);
    });
    smoothNumber.addEventListener("input", function () {
      applyScrollSmooth(smoothNumber.value, false);
    });
    smoothNumber.addEventListener("change", function () {
      applyScrollSmooth(smoothNumber.value, true);
    });
    windowEl.addEventListener(
      "wheel",
      function (event) {
        if (event.target.closest(".params-panel")) return;
        event.preventDefault();
        var el = column;
        var driver = "main";
        if (usesDualScrub() && scrubColumnEl) {
          // Only the small scrub strip drives scrub; empty stage + large column → main.
          if (event.target.closest(".uiworks-scrub-wrap")) {
            el = scrubColumnEl;
            driver = "scrub";
          } else {
            el = column;
            driver = "main";
          }
          if (scrollDriver !== driver) seizeScrollDriver(driver);
          else scrollDriver = driver;
        }
        applyScrollDelta(wheelDelta(event), el);
        playPreviewVideo();
      },
      { passive: false }
    );
    windowEl.addEventListener("pointerdown", function (event) {
      playPreviewVideo();
      if (!usesDualScrub()) return;
      if (event.target.closest(".params-panel")) return;
      if (event.target.closest(".uiworks-scrub-wrap")) {
        seizeScrollDriver("scrub");
      } else {
        seizeScrollDriver("main");
      }
    });

    // Touch scrolling for both dual-scrub columns (native pan fails under home touch-action:none on iOS).
    var touchScroll = null;
    windowEl.addEventListener(
      "touchstart",
      function (event) {
        if (!usesDualScrub() || !event.touches.length) return;
        if (event.target.closest(".params-panel")) {
          touchScroll = null;
          return;
        }
        if (event.target.closest(".uiworks-column-wrap .uiworks-column")) {
          seizeScrollDriver("main");
          touchScroll = { y: event.touches[0].clientY, el: column };
          return;
        }
        if (event.target.closest(".uiworks-scrub-wrap")) {
          // Own scrub gestures (incl. reverse order) — never leave to native scroll.
          seizeScrollDriver("scrub");
          touchScroll = { y: event.touches[0].clientY, el: scrubColumnEl };
          return;
        }
        var touch = event.touches[0];
        var overScrub = false;
        if (scrubWrap && !scrubWrap.hidden) {
          var rect = scrubWrap.getBoundingClientRect();
          overScrub =
            touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom;
        }
        var driver = overScrub ? "scrub" : "main";
        var el = overScrub ? scrubColumnEl : column;
        seizeScrollDriver(driver);
        touchScroll = { y: touch.clientY, el: el };
      },
      { passive: true }
    );
    windowEl.addEventListener(
      "touchmove",
      function (event) {
        if (!touchScroll || !event.touches.length) return;
        event.preventDefault();
        var touch = event.touches[0];
        var dy = touchScroll.y - touch.clientY;
        touchScroll.y = touch.clientY;
        if (dy) applyScrollDelta(dy, touchScroll.el);
      },
      { passive: false }
    );
    windowEl.addEventListener(
      "touchend",
      function () {
        touchScroll = null;
      },
      { passive: true }
    );
    windowEl.addEventListener(
      "touchcancel",
      function () {
        touchScroll = null;
      },
      { passive: true }
    );
    column.addEventListener("scroll", function () {
      if (usesDualScrub()) {
        if (scrollDriver === "scrub") return;
        requestSyncScrubFromMain();
      } else {
        requestSyncPreview();
      }
    }, { passive: true });
    if (scrubColumnEl) {
      scrubColumnEl.addEventListener(
        "scroll",
        function () {
          if (!usesDualScrub()) return;
          if (scrollDriver === "main") return;
          requestSyncMainFromScrub();
        },
        { passive: true }
      );
    }
    window.addEventListener("resize", function () {
      layoutPreview();
      requestSyncPreview();
    });
    if (compactMq.addEventListener) {
      compactMq.addEventListener("change", function () {
        layoutPreview();
        requestSyncPreview();
        if (isPanelOpen()) observeColumnMedia();
      });
    } else if (compactMq.addListener) {
      compactMq.addListener(function () {
        layoutPreview();
        requestSyncPreview();
        if (isPanelOpen()) observeColumnMedia();
      });
    }

    loadLayout();

    if (options.hash && overlays[options.hash]) {
      overlays[options.hash].onOpen = wakePanel;
      overlays[options.hash].onClose = sleepPanel;
    }
  }
})();
