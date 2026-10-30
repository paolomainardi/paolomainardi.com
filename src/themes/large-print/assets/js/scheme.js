// Colour scheme toggle.
//
// The stored choice is applied before the first paint by scheme-init.js. This
// script only handles the toggle: it flips between light and dark and stores
// the choice in localStorage under "colorscheme", the only use of browser
// storage on the site. A stored choice wins over the system setting.
(function () {
  "use strict";

  var body = document.body;
  var media = window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

  // A cover drawn for the dark scheme follows the system setting by default.
  // A choice made with the toggle overrides it.
  function syncCovers() {
    var forced = body.classList.contains("colorscheme-dark")
      ? "all"
      : body.classList.contains("colorscheme-light")
      ? "not all"
      : "(prefers-color-scheme: dark)";
    Array.prototype.forEach.call(
      document.querySelectorAll("source.night"),
      function (source) {
        source.media = forced;
      }
    );
  }

  // The cover for a scheme, decoded off screen. Switching to a version that
  // is not loaded yet blanked the cover until it arrived, so the toggle warms
  // the other version on hover and swaps only once it is ready.
  function coverFor(scheme) {
    var ready = [];
    Array.prototype.forEach.call(
      document.querySelectorAll("source.night"),
      function (source) {
        var shown = source.parentNode.querySelector("img");
        var from = scheme === "dark" ? source : shown;
        var copy = new Image();
        copy.sizes = from.sizes;
        copy.srcset = from.srcset || from.src;
        if (copy.decode) {
          ready.push(copy.decode().catch(function () {}));
        }
      }
    );
    return Promise.all(ready);
  }

  syncCovers();

  var toggle = document.getElementById("dark-mode-toggle");
  if (!toggle) {
    return;
  }

  function current() {
    if (body.classList.contains("colorscheme-dark")) {
      return "dark";
    }
    if (body.classList.contains("colorscheme-light")) {
      return "light";
    }
    return media && media.matches ? "dark" : "light";
  }

  function warm() {
    if (window.Promise) {
      coverFor(current() === "dark" ? "light" : "dark");
    }
  }

  toggle.addEventListener("pointerenter", warm);
  toggle.addEventListener("focus", warm);

  toggle.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    body.classList.remove("colorscheme-auto", "colorscheme-light", "colorscheme-dark");
    body.classList.add("colorscheme-" + next);
    document.documentElement.style.colorScheme = next;
    if (window.Promise) {
      coverFor(next).then(syncCovers);
    } else {
      syncCovers();
    }
    try {
      window.localStorage.setItem("colorscheme", next);
    } catch (e) {}
  });
})();
