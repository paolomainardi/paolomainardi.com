// Colour scheme toggle.
//
// The stored choice is applied before the first paint by scheme-init.js. This
// script only handles the toggle: it flips between light and dark and stores
// the choice in localStorage under "colorscheme", the only use of browser
// storage on the site. A stored choice wins over the system setting.
(function () {
  "use strict";

  var toggle = document.getElementById("dark-mode-toggle");
  if (!toggle) {
    return;
  }

  var body = document.body;
  var media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  function current() {
    if (body.classList.contains("colorscheme-dark")) {
      return "dark";
    }
    if (body.classList.contains("colorscheme-light")) {
      return "light";
    }
    return media && media.matches ? "dark" : "light";
  }

  toggle.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    body.classList.remove("colorscheme-auto", "colorscheme-light", "colorscheme-dark");
    body.classList.add("colorscheme-" + next);
    document.documentElement.style.colorScheme = next;
    try {
      window.localStorage.setItem("colorscheme", next);
    } catch (e) {}
  });
})();
