(function () {
  var overlay = document.getElementById("guide-window");
  var teaser = document.querySelector(".howto-teaser");
  var closeBtn = overlay && overlay.querySelector(".close");
  var guide = overlay && overlay.querySelector(".howto-guide");
  if (!overlay || !teaser || !closeBtn || !guide) return;

  function isOpen() {
    return overlay.classList.contains("is-open");
  }

  function openGuide() {
    overlay.hidden = false;
    overlay.classList.add("is-open");
    guide.scrollTop = 0;
    closeBtn.focus();
    if (location.hash !== "#guide") {
      history.pushState({ guide: true }, "", "#guide");
    }
  }

  function closeGuide() {
    overlay.classList.remove("is-open");
    overlay.hidden = true;
    teaser.focus();
    if (location.hash === "#guide") {
      history.pushState({ guide: false }, "", location.pathname + location.search);
    }
  }

  function syncFromHash() {
    if (location.hash === "#guide") {
      overlay.hidden = false;
      overlay.classList.add("is-open");
    } else if (isOpen()) {
      overlay.classList.remove("is-open");
      overlay.hidden = true;
    }
  }

  teaser.addEventListener("click", function (event) {
    event.preventDefault();
    if (!isOpen()) openGuide();
  });

  closeBtn.addEventListener("click", function () {
    closeGuide();
  });

  overlay.addEventListener(
    "wheel",
    function (event) {
      if (event.target.closest(".howto-guide")) return;
      event.preventDefault();
      guide.scrollTop += event.deltaY;
    },
    { passive: false }
  );

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isOpen()) closeGuide();
  });

  window.addEventListener("popstate", syncFromHash);
  window.addEventListener("hashchange", syncFromHash);
  syncFromHash();
})();
