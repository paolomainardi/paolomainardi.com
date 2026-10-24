// Applies the reader's stored colour scheme before the page is first painted.
// Inlined at the top of the body. Without a stored choice it does nothing, and
// the stylesheet follows the system setting.
(function () {
  "use strict";
  try {
    var scheme = window.localStorage.getItem("colorscheme");
    if (scheme === "light" || scheme === "dark") {
      var body = document.body;
      body.classList.remove("colorscheme-auto", "colorscheme-light", "colorscheme-dark");
      body.classList.add("colorscheme-" + scheme);
      document.documentElement.style.colorScheme = scheme;
    }
  } catch (e) {}
})();
