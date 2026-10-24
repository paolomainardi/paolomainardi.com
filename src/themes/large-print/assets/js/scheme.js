// Colour scheme toggle.
//
// The body starts with the scheme from the site config. "auto" follows the
// system preference. Pressing the toggle flips between light and dark and
// remembers the choice in localStorage under "colorscheme", the same key the
// previous theme used, so a reader's choice survives the change. This is the
// only script on the site that uses browser storage: without it the choice
// would reset on every page.
(function () {
  "use strict";

  var body = document.body;
  var KEY = "colorscheme";
  var media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function stored() {
    try {
      return window.localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }

  function remember(scheme) {
    try {
      window.localStorage.setItem(KEY, scheme);
    } catch (e) {}
  }

  function set(scheme) {
    body.classList.remove("colorscheme-auto");
    body.classList.remove(
      scheme === "dark" ? "colorscheme-light" : "colorscheme-dark"
    );
    body.classList.add("colorscheme-" + scheme);
    document.documentElement.style.colorScheme = scheme;
  }

  var saved = stored();
  if (saved === "light" || saved === "dark") {
    set(saved);
  } else if (body.classList.contains("colorscheme-dark")) {
    set("dark");
  } else if (body.classList.contains("colorscheme-light")) {
    set("light");
  } else {
    set(media && media.matches ? "dark" : "light");
  }

  var toggle = document.getElementById("dark-mode-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = body.classList.contains("colorscheme-dark") ? "light" : "dark";
      set(next);
      remember(next);
    });
  }

  if (media) {
    var follow = function (event) {
      set(event.matches ? "dark" : "light");
    };
    if (media.addEventListener) {
      media.addEventListener("change", follow);
    } else if (media.addListener) {
      media.addListener(follow);
    }
  }
})();
