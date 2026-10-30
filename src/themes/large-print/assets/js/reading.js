// Reading aids for a post: the section rail, and the contents disclosure.
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

  // Measured on the next frame, not during load, so the first paint does not
  // wait for a layout of the whole post.
  schedule();
})();

// The contents block is open on a wide screen, where it is two columns and
// compact, and closed on a narrow one, where a single column of section links
// filled most of the first screen before the reader reached a word of the post.
//
// This cannot be done in CSS: open is an attribute, not a style. Without
// JavaScript the block stays closed everywhere, which is a usable fallback.
(function () {
  "use strict";

  var toc = document.querySelector(".toc");
  if (!toc || toc.tagName !== "DETAILS") {
    return;
  }

  var wide = window.matchMedia("(min-width: 900px)");

  function sync(mq) {
    toc.open = mq.matches;
  }

  sync(wide);

  if (wide.addEventListener) {
    wide.addEventListener("change", sync);
  } else if (wide.addListener) {
    wide.addListener(sync);
  }
})();

// The back to top link, shown once the reader is a screen into the post.
(function () {
  "use strict";

  var link = document.querySelector(".to-top");
  if (!link) {
    return;
  }

  var queued = false;

  function update() {
    queued = false;
    link.hidden = window.scrollY < window.innerHeight;
  }

  function schedule() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
})();

// Copy as Markdown: copies the post's Markdown version, so a reader can paste
// the whole post into an LLM. The link opens that version instead when the
// browser cannot copy. ClipboardItem takes a promise, which keeps the write
// inside the click for Safari while the file is still being fetched.
(function () {
  "use strict";

  var link = document.querySelector(".copy-md");
  if (!link || !navigator.clipboard) {
    return;
  }

  var label = link.textContent;

  function text() {
    return window.fetch(link.href).then(function (response) {
      if (!response.ok) {
        throw new Error(response.status);
      }
      return response.text();
    });
  }

  function write() {
    if (window.ClipboardItem && navigator.clipboard.write) {
      return navigator.clipboard.write([
        new window.ClipboardItem({
          "text/plain": text().then(function (t) {
            return new Blob([t], { type: "text/plain" });
          }),
        }),
      ]);
    }
    return text().then(function (t) {
      return navigator.clipboard.writeText(t);
    });
  }

  link.addEventListener("click", function (event) {
    event.preventDefault();
    write().then(
      function () {
        link.textContent = "Copied";
        window.setTimeout(function () {
          link.textContent = label;
        }, 2000);
      },
      function () {
        window.location.href = link.href;
      }
    );
  });
})();

// The reading bar on narrow screens: the current section, a way back to the
// contents, and to the top. It comes up when the reader scrolls up, the usual
// gesture for looking for something, and gets out of the way on scroll down.
(function () {
  "use strict";

  var bar = document.querySelector(".readbar");
  if (!bar || !window.matchMedia) {
    return;
  }

  var narrow = window.matchMedia("(max-width: 899px)");
  var current = bar.querySelector(".readbar-current");
  var title = current.textContent;
  var headings = Array.prototype.slice.call(
    document.querySelectorAll(".text h2[id]")
  );
  var names = headings.map(function (heading) {
    var copy = heading.cloneNode(true);
    var link = copy.querySelector(".heading-link");
    if (link) {
      link.parentNode.removeChild(link);
    }
    return copy.textContent.trim();
  });

  var lastY = window.scrollY;
  var lastHeight = document.documentElement.scrollHeight;
  var queued = false;

  function show(on) {
    if (on) {
      bar.setAttribute("data-shown", "true");
    } else {
      bar.removeAttribute("data-shown");
    }
  }

  function update() {
    queued = false;
    var y = window.scrollY;
    var height = document.documentElement.scrollHeight;
    // A scroll that comes with a change in page height is the browser keeping
    // the text in place while images load, not the reader, so it moves nothing.
    if (!narrow.matches || y < window.innerHeight) {
      show(false);
    } else if (height === lastHeight && y < lastY - 4) {
      show(true);
    } else if (height === lastHeight && y > lastY + 4) {
      show(false);
    }
    lastY = y;
    lastHeight = height;

    var band = window.innerHeight * 0.2;
    var name = title;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= band) {
        name = names[i];
      } else {
        break;
      }
    }
    if (current.textContent !== name) {
      current.textContent = name;
    }
  }

  function schedule() {
    if (!queued) {
      queued = true;
      window.requestAnimationFrame(update);
    }
  }

  // Jumping to the contents opens them, since they start closed on a phone.
  var toContents = bar.querySelector('a[href="#contents"]');
  if (toContents) {
    toContents.addEventListener("click", function () {
      var toc = document.getElementById("contents");
      if (toc) {
        toc.open = true;
      }
    });
  }

  bar.hidden = false;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  schedule();
})();
