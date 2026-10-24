// Image overlay.
//
// A post image that would show noticeably larger on its own opens in a modal
// dialog when clicked, or on Enter or Space when focused. The overlay loads
// the larger copy named in data-zoom and shows the clicked image until it
// arrives. Esc, a click anywhere, or the back gesture closes it. Images that
// already show at full size are left alone.
(function () {
  "use strict";

  var images = document.querySelectorAll("img[data-zoom]");
  if (!images.length || typeof HTMLDialogElement !== "function") {
    return;
  }

  // Worth opening only when the overlay shows the image at least this much
  // wider than the page does.
  var GAIN = 1.15;
  var dialog, big, caption, pending;

  // Width the overlay would show the image at: its own width, capped by the
  // viewport, keeping the aspect ratio inside the available height.
  function overlayWidth(img) {
    var w = Number(img.getAttribute("data-zoom-width"));
    var ratio = img.getAttribute("height") / img.getAttribute("width") || 1;
    return Math.min(w, window.innerWidth * 0.94, (window.innerHeight * 0.86) / ratio);
  }

  // Reads every width first and writes after, so the page lays out once.
  function mark() {
    var gains = [];
    var i;
    for (i = 0; i < images.length; i++) {
      gains.push(images[i].clientWidth > 0 && overlayWidth(images[i]) > images[i].clientWidth * GAIN);
    }
    for (i = 0; i < images.length; i++) {
      var img = images[i];
      if (gains[i] && !img.closest("a")) {
        img.classList.add("zoomable");
        img.setAttribute("tabindex", "0");
        img.setAttribute("role", "button");
        img.setAttribute("aria-label", "Enlarge image" + (img.alt ? ": " + img.alt : ""));
      } else if (img.classList.contains("zoomable")) {
        img.classList.remove("zoomable");
        img.removeAttribute("tabindex");
        img.removeAttribute("role");
        img.removeAttribute("aria-label");
      }
    }
  }

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "zoom";
    dialog.setAttribute("aria-label", "Enlarged image");
    big = document.createElement("img");
    caption = document.createElement("p");
    caption.className = "zoom-caption";
    dialog.appendChild(big);
    dialog.appendChild(caption);
    dialog.addEventListener("click", function () {
      dialog.close();
    });
    document.body.appendChild(dialog);
  }

  function open(img) {
    if (!dialog) {
      build();
    }
    var figure = img.closest("figure");
    var text = figure && figure.querySelector("figcaption");
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    caption.textContent = text ? text.textContent.trim() : "";
    caption.hidden = !caption.textContent;

    var full = new Image();
    pending = full;
    full.onload = function () {
      if (pending === full) {
        big.src = full.src;
      }
    };
    full.src = img.getAttribute("data-zoom");
    dialog.showModal();
  }

  document.addEventListener("click", function (event) {
    var img = event.target.closest("img.zoomable");
    if (img) {
      open(img);
    }
  });

  document.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches("img.zoomable")) {
      event.preventDefault();
      open(event.target);
    }
  });

  var queued = false;
  function schedule() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        mark();
      });
    }
  }

  schedule();
  window.addEventListener("resize", schedule);
})();
