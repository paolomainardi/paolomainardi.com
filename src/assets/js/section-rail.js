// Marks the current section in the rail at the left edge of a post.
//
// The current section is the last heading that has passed the top fifth of the
// viewport. Recomputed on scroll and resize, throttled to one animation frame,
// so a jump from an anchor link or a restored scroll position lands correctly
// as well. No dependency, no storage.
(function () {
  "use strict";

  var rail = document.querySelector(".rail");
  if (!rail) {
    return;
  }

  var links = [];
  var headings = [];

  Array.prototype.forEach.call(
    rail.querySelectorAll("[data-section]"),
    function (link) {
      var heading = document.getElementById(link.getAttribute("data-section"));
      if (heading) {
        links.push(link);
        headings.push(heading);
      }
    }
  );

  if (!headings.length) {
    return;
  }

  var currentIndex = -1;
  var queued = false;

  function setCurrent(index) {
    if (index === currentIndex) {
      return;
    }
    currentIndex = index;
    links.forEach(function (link, i) {
      if (i === index) {
        link.setAttribute("data-active", "true");
      } else {
        link.removeAttribute("data-active");
      }
    });
  }

  function update() {
    queued = false;
    var band = window.innerHeight * 0.2;
    var index = 0;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= band) {
        index = i;
      } else {
        break;
      }
    }
    setCurrent(index);
  }

  function schedule() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("hashchange", schedule);

  update();
})();
