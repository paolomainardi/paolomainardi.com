// Image comparison.
//
// The compare shortcode stacks two images and lays a range input over them.
// Moving the input moves the split: the first image shows to the left of it,
// the second to the right. The value is also read out as the share of each.
(function () {
  "use strict";

  var ranges = document.querySelectorAll(".compare-range");
  if (!ranges.length) {
    return;
  }

  function bind(range) {
    var stage = range.parentNode;
    function update() {
      var v = Number(range.value);
      stage.style.setProperty("--split", v);
      range.setAttribute("aria-valuetext",
        range.getAttribute("data-before") + " " + v + "%, " + range.getAttribute("data-after") + " " + (100 - v) + "%");
    }
    range.disabled = false;
    range.addEventListener("input", update);
    update();
  }

  for (var i = 0; i < ranges.length; i++) {
    bind(ranges[i]);
  }
})();
