// Animated covers. A cover with a motion map is redrawn on a WebGL canvas laid
// over the image: plants sway, lamps swing and glow, a light runs along
// threads, leaves fall, and at night the windows outside go dark and come back.
// The image underneath stays the page's image, so nothing changes when the
// reader asks for reduced motion, WebGL is missing, or the script fails.
//
// The map is built by scripts/motion-map from the cover: G is wind, B the parts
// that swing, R the distance along a thread. data-motion holds the rest.
(function () {
  "use strict";

  var img = document.querySelector("img[data-motion-map]");
  if (!img || !window.WebGLRenderingContext) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var MAX = { swing: 4, glow: 6, fall: 4, twinkle: 12 };

  var VS =
    "attribute vec2 p; varying vec2 uv;" +
    "void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }";

  var FS = [
    "precision mediump float;",
    "varying vec2 uv;",
    "uniform sampler2D img, map;",
    "uniform float t, night;",
    "uniform vec2 size;",
    "uniform int nSwing, nGlow, nFall, nTwinkle;",
    "uniform vec2 swingAnchor[" + MAX.swing + "];",
    "uniform vec4 swingBox[" + MAX.swing + "];",
    "uniform float swingAmp[" + MAX.swing + "];",
    "uniform vec4 glowA[" + MAX.glow + "];",
    "uniform float glowSwing[" + MAX.glow + "];",
    "uniform vec4 fallSprite[" + MAX.fall + "];",
    "uniform vec4 fallPath[" + MAX.fall + "];",
    "uniform vec4 twinkle[" + MAX.twinkle + "];",
    "vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }",
    "float swing(int i){",
    "  float a = 0.0;",
    "  for (int j = 0; j < " + MAX.swing + "; j++) { if (j == i) a = swingAmp[j]; }",
    "  float f = float(i);",
    "  return a * 0.055 * sin(t * (1.1 + 0.15 * f) + f * 2.1) * (0.7 + 0.3 * sin(t * 0.23 + f));",
    "}",
    "void main(){",
    "  vec2 px = uv * size;",
    "  vec3 m = texture2D(map, uv).rgb;",
    "  vec2 src = px;",
    // Wind: sideways, in two slow waves under a gust.
    "  float gust = 0.6 + 0.4 * sin(t * 0.35);",
    "  src.x -= m.g * gust * (2.4 * sin(t * 1.4 + px.y * 0.025) + 0.8 * sin(t * 3.1 + px.y * 0.07 + px.x * 0.03));",
    // Swinging parts turn about their anchor.
    "  for (int i = 0; i < " + MAX.swing + "; i++) {",
    "    if (i >= nSwing) break;",
    "    vec4 b = swingBox[i];",
    "    float inside = step(b.x - 12.0, px.x) * step(px.x, b.z + 12.0) * step(b.y - 4.0, px.y) * step(px.y, b.w + 12.0);",
    "    src = mix(src, swingAnchor[i] + rot(px - swingAnchor[i], -swing(i)), m.b * inside);",
    "  }",
    "  vec3 col = texture2D(img, src / size).rgb;",
    // A light runs along the threads towards the point where they meet.
    "  float wave = fract(m.r * 2.5 + t * 0.22);",
    "  float pulse = smoothstep(0.0, 0.08, wave) * (1.0 - smoothstep(0.08, 0.22, wave));",
    "  col = mix(col, mix(vec3(1.0, 0.82, 0.86), vec3(1.0, 0.65, 0.75), night), step(1.5 / 255.0, m.r) * pulse * 0.75);",
    // Lights breathe: by day a warm tint, by night added light.
    "  for (int i = 0; i < " + MAX.glow + "; i++) {",
    "    if (i >= nGlow) break;",
    "    vec2 at = glowA[i].xy;",
    "    for (int j = 0; j < " + MAX.swing + "; j++) {",
    "      if (float(j) == glowSwing[i]) at = swingAnchor[j] + rot(at - swingAnchor[j], swing(j));",
    "    }",
    "    vec2 d = px - at;",
    "    float r = length(d * vec2(1.0, 0.8));",
    "    float glow = exp(-r * r / (glowA[i].z * glowA[i].z)) * smoothstep(-0.25, 0.2, d.y / glowA[i].z);",
    "    float k = glowA[i].w * (0.7 + 0.2 * sin(t * 0.9 + float(i) * 1.3) + 0.03 * sin(t * 11.0 + float(i) * 7.0));",
    "    float spot = exp(-dot(d, d) / 60.0);",
    "    vec3 day = mix(col, col * vec3(1.08, 0.96, 0.74) + vec3(0.07, 0.045, 0.0), glow * k * 0.7) + spot * k * vec3(0.2, 0.16, 0.07);",
    "    vec3 dark = col + (glow * 0.14 + spot * 0.3) * k * vec3(1.0, 0.72, 0.35);",
    "    col = mix(day, dark, night);",
    "  }",
    // At night the lit windows outside go dark and come back, one at a time.
    "  for (int i = 0; i < " + MAX.twinkle + "; i++) {",
    "    if (i >= nTwinkle) break;",
    "    vec4 w = twinkle[i];",
    "    float cyc = t * 0.05 + w.w * 7.0;",
    "    float ph = fract(cyc);",
    "    float off = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.25, 0.28, ph)) * step(0.5, fract(sin(floor(cyc) * 12.9898 + w.w * 78.2) * 43758.5));",
    "    float near = 1.0 - smoothstep(w.z * 0.6, w.z * 1.4, length(px - w.xy));",
    "    col = mix(col, col * vec3(0.3, 0.32, 0.45), off * near * night);",
    "  }",
    // Leaves fall: a copy of one leaf drifts down, turning, and fades on the floor.
    "  for (int i = 0; i < " + MAX.fall + "; i++) {",
    "    if (i >= nFall) break;",
    "    vec4 sp = fallSprite[i];",
    "    vec4 path = fallPath[i];",
    "    float ph = fract(t * 0.06 + float(i) * 0.37);",
    "    vec2 pos = vec2(path.x + path.w * sin(ph * 5.0 + float(i) * 2.0) + ph * 40.0, mix(path.y, path.z, ph));",
    "    vec2 q = (sp.xy + sp.zw) * 0.5 + rot(px - pos, -0.8 * sin(ph * 7.0 + float(i)));",
    "    if (q.x > sp.x && q.x < sp.z && q.y > sp.y && q.y < sp.w) {",
    "      vec3 s = texture2D(img, q / size).rgb;",
    "      vec3 bg = texture2D(img, vec2(sp.x, sp.w) / size).rgb;",
    "      float a = smoothstep(0.06, 0.2, length(s - bg)) * smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.88, 1.0, ph));",
    "      col = mix(col, s, a);",
    "    }",
    "  }",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  var data;
  try {
    data = JSON.parse(img.getAttribute("data-motion"));
  } catch (e) {
    return;
  }

  var canvas = document.createElement("canvas");
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return;
  canvas.className = "motion";
  canvas.setAttribute("aria-hidden", "true");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var vs = shader(gl.VERTEX_SHADER, VS);
  var fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  function u(name) {
    return gl.getUniformLocation(prog, name);
  }
  function flat(list, pick) {
    var out = [];
    list.forEach(function (item) {
      out.push.apply(out, pick(item));
    });
    return out;
  }
  function set(kind, count, uniforms) {
    gl.uniform1i(u("n" + kind), count);
    if (!count) return;
    uniforms.forEach(function (x) {
      gl["uniform" + x[0]](u(x[1]), x[2]);
    });
  }

  var swing = data.swing || [], glow = data.glow || [], fall = data.fall || [], twinkle = data.twinkle || [];
  gl.uniform2f(u("size"), data.size[0], data.size[1]);
  set("Swing", swing.length, [
    ["2fv", "swingAnchor", flat(swing, function (s) { return s.anchor; })],
    ["4fv", "swingBox", flat(swing, function (s) { return s.box; })],
    ["1fv", "swingAmp", flat(swing, function (s) { return [s.amp]; })]
  ]);
  set("Glow", glow.length, [
    ["4fv", "glowA", flat(glow, function (g) { return [g.at[0], g.at[1], g.radius, g.strength]; })],
    ["1fv", "glowSwing", flat(glow, function (g) { return [g.swing]; })]
  ]);
  set("Fall", fall.length, [
    ["4fv", "fallSprite", flat(fall, function (f) { return f.sprite; })],
    ["4fv", "fallPath", flat(fall, function (f) { return [f.from[0], f.from[1], f.floor, f.drift || 20]; })]
  ]);
  set("Twinkle", twinkle.length, [["4fv", "twinkle", flat(twinkle, function (w) { return w; })]]);
  gl.uniform1i(u("img"), 0);
  gl.uniform1i(u("map"), 1);

  function upload(unit, source) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  // The canvas covers the image inside its border, at the size it is drawn.
  function place() {
    var w = img.clientWidth, h = img.clientHeight;
    canvas.style.left = img.offsetLeft + img.clientLeft + "px";
    canvas.style.top = img.offsetTop + img.clientTop + "px";
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    var scale = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.min(Math.round(w * scale), data.size[0]);
    var bh = Math.round(bw * data.size[1] / data.size[0]);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
    }
  }

  // The cover follows the colour scheme. When scheme.js swaps it, the canvas
  // takes the new picture.
  function picture(done) {
    var copy = new Image();
    copy.onload = function () {
      upload(0, copy);
      gl.uniform1f(u("night"), /-night/.test(copy.src) ? 1 : 0);
      if (done) done();
    };
    copy.src = img.currentSrc || img.src;
  }

  var visible = true, running = false, t = 0, last = 0, shown = false;
  function frame(now) {
    if (!visible) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
    // Thirty frames a second is plenty for this motion, and halves the work.
    if (last && now - last < 32) return;
    t += Math.min(now - (last || now), 100) / 1000;
    last = now;
    gl.uniform1f(u("t"), t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!shown) {
      shown = true;
      canvas.classList.add("on");
    }
  }
  function start() {
    if (running || !visible) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  function begin() {
    var map = new Image();
    map.onload = function () {
      upload(1, map);
      picture(function () {
        img.parentNode.insertBefore(canvas, img.nextSibling);
        place();
        window.addEventListener("resize", place);
        img.addEventListener("load", function () {
          picture();
        });
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            start();
          }).observe(img);
        }
        start();
      });
    };
    map.src = img.getAttribute("data-motion-map");
  }

  if (img.complete) begin();
  else img.addEventListener("load", begin, { once: true });
})();
