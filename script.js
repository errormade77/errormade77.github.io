(function () {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function tickClock() {
    var clock = document.getElementById("live-clock");
    if (!clock) return;
    var now = new Date();
    clock.textContent =
      pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
  }

  tickClock();
  setInterval(tickClock, 1000);

  var compactHomeMq = window.matchMedia("(max-width: 720px)");
  function homeOverlayOpen() {
    return !!document.querySelector(".uiworks-window.is-open, .howto-window.is-open");
  }
  document.addEventListener(
    "touchmove",
    function (event) {
      if (!compactHomeMq.matches || homeOverlayOpen()) return;
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
  }

  function closeAll(push) {
    closeAllParams();
    Object.keys(overlays).forEach(function (hash) {
      var item = overlays[hash];
      if (!item.el) return;
      var wasOpen = isOpen(item.el);
      item.el.classList.remove("is-open");
      item.el.hidden = true;
      if (wasOpen && item.onClose) item.onClose(item.el);
    });
    if (push && location.hash) {
      history.pushState({ overlay: false }, "", location.pathname + location.search);
    }
  }

  function openOverlay(hash, push) {
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
        item.trigger.focus();
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

  initWorksPanel({
    prefix: "uiworks",
    dbName: "errormade-internal",
    store: "uiworks-media",
    keyPrefix: "errormade-uiworks",
    hash: "#ui-works",
    manifest: "assets/works/ui.json",
    manifestId: "uiworks-manifest",
  });
  initWorksPanel({
    prefix: "graphicworks",
    dbName: "errormade-graphicworks",
    store: "media",
    keyPrefix: "errormade-graphicworks",
    seedFrom: "errormade-uiworks",
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
      try {
        var value = localStorage.getItem(key);
        return value == null ? fallback : value;
      } catch (error) {
        return fallback;
      }
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
      apply(options.fallback, false);
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
    }

    function closeParams() {
      paramsModal.classList.remove("is-open");
      paramsModal.hidden = true;
    }

    closeBtn.addEventListener("click", function () {
      closeParams();
      openBtn.focus();
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
      fallback: 12,
      decimals: 1,
      cssVar: "--home-hover-blur",
      unit: "px",
    });
    bindNumber(speedRange, speedNumber, {
      key: SPEED_KEY,
      min: 0,
      max: 2,
      fallback: 0.23,
      decimals: 2,
      cssVar: "--home-hover-speed",
      unit: "s",
    });
    bindNumber(hoverScaleRange, hoverScaleNumber, {
      key: HOVER_SCALE_KEY,
      min: -3,
      max: 3,
      fallback: 1.5,
      decimals: 2,
      cssVar: "--home-hover-scale",
      unit: "",
    });
    bindNumber(othersScaleRange, othersScaleNumber, {
      key: OTHERS_SCALE_KEY,
      min: -3,
      max: 3,
      fallback: 0.85,
      decimals: 2,
      cssVar: "--home-others-scale",
      unit: "",
    });
    bindNumber(followRange, followNumber, {
      key: FOLLOW_AMOUNT_KEY,
      min: 0,
      max: 40,
      fallback: 11,
      decimals: 0,
      onApply: function (next) {
        followAmount = next;
      },
    });

    applyFollowEnabled(true, false);
    applyHideCursor(false, false);
    applyBlendDifference(true, false);
    applyEnabled(true, false);
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
    var brushSize = 80;
    var particleCount = 150;
    var particleSize = 2.6;
    var intensity = 200;
    var cluster = 23;
    var liquidity = 20;
    var drips = 21;
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
      try {
        var value = localStorage.getItem(key);
        return value == null ? fallback : value;
      } catch (error) {
        return fallback;
      }
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
      apply(fallback, false);
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
      return window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
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

    var applySize = bindNumber(sizeRange, sizeNumber, SIZE_KEY, 4, 80, 80, function (next) {
      brushSize = next;
      updateCursorSize();
    });
    bindNumber(particleRange, particleNumber, PARTICLES_KEY, 1, 150, 150, function (next) {
      particleCount = next;
    });
    bindNumber(
      particleSizeRange,
      particleSizeNumber,
      PARTICLE_SIZE_KEY,
      0.5,
      12,
      2.6,
      function (next) {
        particleSize = next;
      },
      1
    );
    bindNumber(intensityRange, intensityNumber, INTENSITY_KEY, 1, 200, 200, function (next) {
      intensity = next;
    });
    bindNumber(clusterRange, clusterNumber, CLUSTER_KEY, 0, 100, 23, function (next) {
      cluster = next;
    });
    bindNumber(liquidRange, liquidNumber, LIQUID_KEY, 0, 100, 20, function (next) {
      liquidity = next;
    });
    bindNumber(dripsRange, dripsNumber, DRIPS_KEY, 0, 40, 21, function (next) {
      drips = next;
    });

    resizeCanvas();
    applyEnabled(true, false);
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
    var previewToggle = byId("preview-toggle");
    var previewFill = byId("preview-fill");
    var previewFillField = byId("preview-fill-field");
    var previewWidthField = byId("preview-width-field");
    var previewWidthRange = byId("preview-width");
    var previewWidthNumber = byId("preview-width-number");
    var previewWidthLabel = byId("preview-width-label");
    var previewEl = byId("preview");
    var sensRange = byId("scroll-sens");
    var sensNumber = byId("scroll-sens-number");
    var smoothRange = byId("scroll-smooth");
    var smoothNumber = byId("scroll-smooth-number");
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
      !previewToggle ||
      !previewFill ||
      !previewFillField ||
      !previewWidthField ||
      !previewWidthRange ||
      !previewWidthNumber ||
      !previewWidthLabel ||
      !previewEl ||
      !sensRange ||
      !sensNumber ||
      !smoothRange ||
      !smoothNumber
    ) {
      return;
    }

    var DB_NAME = options.dbName;
    var STORE = options.store;
    var WIDTH_KEY = options.keyPrefix + "-column-width";
    var WIDTH_MIN = 120;
    var WIDTH_MAX = 1400;
    var WIDTH_DEFAULT = 310;
    var PREVIEW_KEY = options.keyPrefix + "-scroll-preview";
    var PREVIEW_WIDTH_KEY = options.keyPrefix + "-preview-width";
    var PREVIEW_WIDTH_MIN = 200;
    var PREVIEW_WIDTH_MAX = 1600;
    var PREVIEW_WIDTH_DEFAULT = 1065;
    var PREVIEW_FILL_KEY = options.keyPrefix + "-preview-fill-height";
    var SENS_KEY = options.keyPrefix + "-scroll-sens";
    var SMOOTH_KEY = options.keyPrefix + "-scroll-smooth";
    var SENS_MIN = 0.1;
    var SENS_MAX = 4;
    var SENS_DEFAULT = 1.1;
    var SMOOTH_MIN = 0;
    var SMOOTH_MAX = 90;
    var SMOOTH_DEFAULT = 90;
    var PREVIEW_GAP = 16;
    var COLUMN_FIT_MIN = 64;
    var PREVIEW_FIT_MIN = 160;
    var PREVIEW_MAX_EDGE = 960;
    var COMPACT_QUERY = "(max-width: 720px)";
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
    var preferredPreviewWidth = PREVIEW_WIDTH_DEFAULT;
    var scrollSensitivity = SENS_DEFAULT;
    var scrollSmoothness = SMOOTH_DEFAULT / 100;
    var scrollTarget = null;
    var scrollRaf = 0;
    var closeEl = windowEl && windowEl.querySelector(".uiworks-stage > .close");
    var compactMq = window.matchMedia(COMPACT_QUERY);
    var mediaReady = null;
    var listDirty = true;
    var previewRaf = 0;
    var mediaObserver = null;
    var previewImageToken = 0;

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
      return !!(windowEl && windowEl.classList.contains("is-preview") && !isCompactView());
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
      previewVideo.addEventListener("canplay", playPreviewVideo);
      previewVideo.addEventListener("loadeddata", playPreviewVideo);
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

    function hydrateColumnVideo(itemEl) {
      var item = itemById(itemEl && itemEl.dataset.id);
      if (!item || mediaKind(item) !== "video") return;
      var video = itemEl.querySelector("video");
      if (!video) {
        video = document.createElement("video");
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        video.setAttribute("muted", "");
        video.setAttribute("loop", "");
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        var poster = urlForThumb(item);
        if (poster) video.poster = poster;
        video.src = urlFor(item);
        video.addEventListener("loadedmetadata", requestSyncPreview);
        itemEl.appendChild(video);
      }
      itemEl.classList.add("is-playing");
      video.play().catch(function () {});
    }

    function pausePanelMedia() {
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
      if (isPreviewOn()) pausePanelMedia();
      if (typeof IntersectionObserver === "undefined") {
        Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), hydrateColumnThumb);
        if (!isPreviewOn()) {
          Array.prototype.forEach.call(column.querySelectorAll('.uiworks-item[data-kind="video"]'), hydrateColumnVideo);
        }
        return;
      }
      mediaObserver = new IntersectionObserver(
        function (entries) {
          if (!isPanelOpen()) return;
          var previewOn = isPreviewOn();
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              hydrateColumnThumb(entry.target);
              if (!previewOn) hydrateColumnVideo(entry.target);
            } else if (!previewOn) {
              unloadColumnVideo(entry.target);
            }
          });
        },
        { root: column, rootMargin: "240px 0px", threshold: 0.01 }
      );
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), function (itemEl) {
        mediaObserver.observe(itemEl);
      });
    }

    function sleepPanel() {
      pausePanelMedia();
      if (mediaObserver) {
        mediaObserver.disconnect();
        mediaObserver = null;
      }
      clearPreview();
      activePreviewId = null;
    }

    function wakePanel() {
      ensureMedia().then(function () {
        if (!isPanelOpen()) return;
        observeColumnMedia();
        syncPreview();
        playPreviewVideo();
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
      if (isCompactView()) {
        windowEl.style.setProperty("--uiworks-column-width", "100%");
        windowEl.style.setProperty("--uiworks-preview-fit-width", preferredPreviewWidth + "px");
        return;
      }
      windowEl.style.setProperty("--uiworks-column-width", preferredColumnWidth + "px");
      if (!windowEl.classList.contains("is-preview")) {
        windowEl.style.setProperty("--uiworks-preview-fit-width", preferredPreviewWidth + "px");
        return;
      }

      var closeW = closeEl ? Math.ceil(closeEl.getBoundingClientRect().width) : 50;
      var reserved = closeW + PREVIEW_GAP * 2;
      var viewport = window.innerWidth;
      var displayColumn = preferredColumnWidth;
      var spaceForPreview = viewport - displayColumn - reserved;
      if (spaceForPreview < PREVIEW_FIT_MIN) {
        displayColumn = Math.max(COLUMN_FIT_MIN, viewport - PREVIEW_FIT_MIN - reserved);
        spaceForPreview = viewport - displayColumn - reserved;
      }
      var displayPreview = Math.min(
        preferredPreviewWidth,
        Math.max(PREVIEW_FIT_MIN, spaceForPreview)
      );

      windowEl.style.setProperty("--uiworks-column-width", Math.round(displayColumn) + "px");
      windowEl.style.setProperty("--uiworks-preview-fit-width", Math.round(displayPreview) + "px");
    }

    function applyColumnWidth(value, persist) {
      var next = clamp(value, WIDTH_MIN, WIDTH_MAX, WIDTH_DEFAULT);
      preferredColumnWidth = next;
      widthRange.value = String(next);
      widthNumber.value = String(next);
      if (persist) {
        try {
          localStorage.setItem(WIDTH_KEY, String(next));
        } catch (error) {}
      }
      layoutPreview();
      syncPreview();
      return next;
    }

    function applyScrollSens(value, persist) {
      var next = clamp(Number(value) * 10, SENS_MIN * 10, SENS_MAX * 10, SENS_DEFAULT * 10) / 10;
      scrollSensitivity = next;
      sensRange.value = String(next);
      sensNumber.value = String(next);
      if (persist) {
        try {
          localStorage.setItem(SENS_KEY, String(next));
        } catch (error) {}
      }
      return next;
    }

    function applyScrollSmooth(value, persist) {
      var next = clamp(value, SMOOTH_MIN, SMOOTH_MAX, SMOOTH_DEFAULT);
      scrollSmoothness = next / 100;
      smoothRange.value = String(next);
      smoothNumber.value = String(next);
      if (persist) {
        try {
          localStorage.setItem(SMOOTH_KEY, String(next));
        } catch (error) {}
      }
      return next;
    }

    function wheelDelta(event) {
      var delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      if (event.deltaMode === 2) delta *= column.clientHeight;
      return delta;
    }

    function scrollMax() {
      return Math.max(0, column.scrollHeight - column.clientHeight);
    }

    function tickScroll() {
      scrollRaf = 0;
      if (scrollTarget == null) return;
      var max = scrollMax();
      if (scrollTarget < 0) scrollTarget = 0;
      if (scrollTarget > max) scrollTarget = max;
      var current = column.scrollTop;
      var ease = 1 - scrollSmoothness;
      if (ease >= 0.999) {
        column.scrollTop = scrollTarget;
        scrollTarget = null;
        return;
      }
      var next = current + (scrollTarget - current) * Math.max(ease, 0.08);
      column.scrollTop = next;
      if (Math.abs(scrollTarget - next) < 0.5) {
        column.scrollTop = scrollTarget;
        scrollTarget = null;
        return;
      }
      scrollRaf = requestAnimationFrame(tickScroll);
    }

    function applyScrollDelta(delta) {
      if (scrollTarget == null) scrollTarget = column.scrollTop;
      scrollTarget += delta * scrollSensitivity;
      var max = scrollMax();
      if (scrollTarget < 0) scrollTarget = 0;
      if (scrollTarget > max) scrollTarget = max;
      if (!scrollRaf) scrollRaf = requestAnimationFrame(tickScroll);
    }

    function applyPreviewWidth(value, persist) {
      var next = clamp(value, PREVIEW_WIDTH_MIN, PREVIEW_WIDTH_MAX, PREVIEW_WIDTH_DEFAULT);
      preferredPreviewWidth = next;
      if (windowEl) windowEl.style.setProperty("--uiworks-preview-width", next + "px");
      previewWidthRange.value = String(next);
      previewWidthNumber.value = String(next);
      if (persist) {
        try {
          localStorage.setItem(PREVIEW_WIDTH_KEY, String(next));
        } catch (error) {}
      }
      layoutPreview();
      return next;
    }

    function readStorage(key, fallback) {
      try {
        return localStorage.getItem(key) || fallback;
      } catch (error) {
        return fallback;
      }
    }

    function updatePreviewFields() {
      var previewOn = isPreviewOn();
      var fillOn = windowEl && windowEl.classList.contains("is-preview-fill");
      previewFillField.hidden = !previewOn;
      previewWidthField.hidden = !previewOn;
      previewWidthLabel.textContent = fillOn ? "max width" : "preview width";
    }

    function applyFillHeight(on, persist) {
      if (windowEl) windowEl.classList.toggle("is-preview-fill", on);
      previewFill.checked = on;
      updatePreviewFields();
      layoutPreview();
      if (persist) {
        try {
          localStorage.setItem(PREVIEW_FILL_KEY, on ? "1" : "0");
        } catch (error) {}
      }
    }

    function applyPreviewMode(on, persist) {
      if (windowEl) windowEl.classList.toggle("is-preview", on);
      previewToggle.checked = on;
      updatePreviewFields();
      if (!on) {
        clearPreview();
        activePreviewId = null;
        Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), function (node) {
          node.classList.remove("is-active");
        });
      } else {
        requestAnimationFrame(syncPreview);
      }
      if (isPanelOpen()) observeColumnMedia();
      layoutPreview();
      if (persist) {
        try {
          localStorage.setItem(PREVIEW_KEY, on ? "1" : "0");
        } catch (error) {}
      }
    }

    function itemAtScrub() {
      var nodes = column.querySelectorAll(".uiworks-item");
      if (!nodes.length) return null;
      var bounds = column.getBoundingClientRect();
      var lineY = bounds.top + bounds.height / 2;
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
      if (current === id) {
        if (kind === "video") playPreviewVideo();
        return;
      }
      previewEl.setAttribute("data-preview-id", id);
      var thumb = urlForThumb(item);
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
          video.src = src;
        }
        playPreviewVideo();
        return;
      }
      previewEl.classList.remove("has-video");
      if (previewVideo) {
        previewVideo.pause();
        previewVideo.removeAttribute("src");
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
      if (!isPanelOpen() || !isPreviewOn() || !items.length) {
        clearPreview();
        activePreviewId = null;
        return;
      }
      var active = itemAtScrub();
      Array.prototype.forEach.call(column.querySelectorAll(".uiworks-item"), function (node) {
        node.classList.toggle("is-active", node === active);
      });
      var id = active && active.dataset.id;
      if (!id || id === activePreviewId) return;
      activePreviewId = id;
      showPreview(id);
    }

    function seedMissingKeys() {
      if (!options.seedFrom) return;
      [WIDTH_KEY, PREVIEW_WIDTH_KEY, SENS_KEY, SMOOTH_KEY, PREVIEW_FILL_KEY, PREVIEW_KEY].forEach(
        function (key) {
          try {
            if (localStorage.getItem(key) != null) return;
            var seeded = localStorage.getItem(key.replace(options.keyPrefix, options.seedFrom));
            if (seeded != null) localStorage.setItem(key, seeded);
          } catch (error) {}
        }
      );
    }

    function loadLayout() {
      seedMissingKeys();
      applyColumnWidth(WIDTH_DEFAULT, false);
      applyPreviewWidth(PREVIEW_WIDTH_DEFAULT, false);
      applyScrollSens(SENS_DEFAULT, false);
      applyScrollSmooth(SMOOTH_DEFAULT, false);
      applyFillHeight(true, false);
      applyPreviewMode(true, false);
    }

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

    function renderColumn() {
      var placeholders =
        '<div class="uiworks-block uiworks-block-1"></div>' +
        '<div class="uiworks-block uiworks-block-2"></div>';
      if (!items.length) {
        column.classList.remove("has-media");
        column.innerHTML = placeholders;
        attachScrub();
        return;
      }
      column.classList.add("has-media");
      column.innerHTML = items
        .map(function (item, index) {
          var kind = mediaKind(item);
          var thumb = urlForThumb(item) || (kind === "image" ? urlFor(item) : "");
          var eager = index < 3;
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
                '" data-src="' +
                thumb +
                '"' +
                (eager
                  ? ' src="' + thumb + '" fetchpriority="high" loading="eager"'
                  : ' loading="lazy"') +
                ">"
              : "") +
            "</div>"
          );
        })
        .join("");
      attachScrub();
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
    }

    function closeThisParams() {
      paramsModal.classList.remove("is-open");
      paramsModal.hidden = true;
    }

    function isThisParamsOpen() {
      return paramsModal.classList.contains("is-open");
    }

    closeBtn.addEventListener("click", function () {
      closeThisParams();
      openBtn.focus();
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
    previewWidthRange.addEventListener("input", function () {
      applyPreviewWidth(previewWidthRange.value, false);
    });
    previewWidthRange.addEventListener("change", function () {
      applyPreviewWidth(previewWidthRange.value, true);
    });
    previewWidthNumber.addEventListener("input", function () {
      applyPreviewWidth(previewWidthNumber.value, false);
    });
    previewWidthNumber.addEventListener("change", function () {
      applyPreviewWidth(previewWidthNumber.value, true);
    });
    previewToggle.addEventListener("change", function () {
      applyPreviewMode(previewToggle.checked, true);
    });
    previewFill.addEventListener("change", function () {
      applyFillHeight(previewFill.checked, true);
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
        applyScrollDelta(wheelDelta(event));
        playPreviewVideo();
      },
      { passive: false }
    );
    windowEl.addEventListener("pointerdown", playPreviewVideo);
    column.addEventListener("scroll", requestSyncPreview, { passive: true });
    window.addEventListener("resize", function () {
      layoutPreview();
      requestSyncPreview();
    });
    if (compactMq.addEventListener) {
      compactMq.addEventListener("change", function () {
        updatePreviewFields();
        layoutPreview();
        requestSyncPreview();
        if (isPanelOpen()) observeColumnMedia();
      });
    } else if (compactMq.addListener) {
      compactMq.addListener(function () {
        updatePreviewFields();
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
