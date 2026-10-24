// Copy to clipboard for the numbered listings.
//
// Each listing carries a button over its code block. Pressing it copies the
// text of the listing and shows a Copied state for a moment. No dependencies,
// no storage.
//
// The Clipboard API only exists in a secure context, so the button reports
// "Cannot copy" when the site is served over plain HTTP, which includes the
// local development host.
(function () {
  "use strict";

  var RESET_DELAY = 2000;

  function listingText(listing) {
    var pre = listing.querySelector("pre");
    return pre ? pre.textContent.replace(/\n+$/, "") : "";
  }

  function flash(button, label) {
    button.textContent = label;
    window.setTimeout(function () {
      button.textContent = "Copy";
      button.removeAttribute("data-copied");
    }, RESET_DELAY);
  }

  function copy(button) {
    var listing = button.closest(".listing");
    if (!listing) {
      return;
    }

    var text = listingText(listing);
    if (!text) {
      return;
    }

    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      flash(button, "Cannot copy");
      return;
    }

    navigator.clipboard.writeText(text).then(
      function () {
        button.setAttribute("data-copied", "true");
        flash(button, "Copied");
      },
      function () {
        flash(button, "Cannot copy");
      }
    );
  }

  document.addEventListener("click", function (event) {
    var button = event.target.closest(".listing .copy");
    if (button) {
      copy(button);
    }
  });
})();
