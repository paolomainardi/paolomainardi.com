// Animated covers. A cover with a motion map is redrawn on a WebGL canvas laid
// over the image: plants sway, lamps swing and glow, a light runs along
// threads, leaves fall, water ripples, floating things bob, clouds drift,
// lighthouse beams sweep, and at night the windows outside go dark and come back.
// The image underneath stays the page's image, so nothing changes when the
// reader asks for reduced motion, WebGL is missing, or the script fails.
//
// The map is built by scripts/motion-map from the cover, twice its height. Top
// half: R the distance along a thread, G wind, B the parts that swing. Bottom
// half: R water, G floating things, B drift. data-motion holds the rest.
(function () {
  "use strict";

  var img = document.querySelector("img[data-motion-map]");
  if (!img) return;
  // Why the cover is still, for whoever is looking at the page's markup.
  function state(s) {
    img.setAttribute("data-motion-state", s);
  }
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return state("reduced motion");
  if (!window.WebGLRenderingContext) return state("no WebGL");

  var MAX = { swing: 4, glow: 6, fall: 4, twinkle: 12, float: 3, beam: 4 };

  var VS =
    "attribute vec2 p; varying vec2 uv;" +
    "void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }";

  var FS = [
    // Phone GPUs run mediump at half precision, too coarse for pixel positions.
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 uv;",
    "uniform sampler2D img, map;",
    "uniform float t, night, halo;",
    "uniform vec2 size;",
    "uniform int nSwing, nGlow, nFall, nTwinkle, nFloat, nBeam;",
    "uniform vec4 beam[" + MAX.beam + "];",
    "uniform vec4 floatA[" + MAX.float + "];",
    "uniform vec4 floatBox[" + MAX.float + "];",
    // Packed four to a slot: some phones allow few uniform slots.
    "uniform vec4 swingA[" + MAX.swing + "];",
    "uniform vec4 swingBox[" + MAX.swing + "];",
    "uniform vec4 glowA[" + MAX.glow + "];",
    "uniform vec4 fallSprite[" + MAX.fall + "];",
    "uniform vec4 fallPath[" + MAX.fall + "];",
    "uniform vec4 twinkle[" + MAX.twinkle + "];",
    "vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }",
    "float swing(int i){",
    "  float a = 0.0;",
    "  for (int j = 0; j < " + MAX.swing + "; j++) { if (j == i) a = swingA[j].z; }",
    "  float f = float(i);",
    "  return a * 0.055 * sin(t * (1.1 + 0.15 * f) + f * 2.1) * (0.7 + 0.3 * sin(t * 0.23 + f));",
    "}",
    "void main(){",
    "  vec2 px = uv * size;",
    "  vec3 m = texture2D(map, vec2(uv.x, uv.y * 0.5)).rgb;",
    "  vec3 n = texture2D(map, vec2(uv.x, 0.5 + uv.y * 0.5)).rgb;",
    "  vec2 src = px;",
    // Water: swells rolling across, mostly up and down, with a little chop.
    "  src += n.r * vec2(1.6 * sin(t * 0.9 + px.y * 0.06), 4.0 * sin(t * 1.1 - px.x * 0.022 + px.y * 0.035) + 1.2 * sin(t * 2.3 - px.x * 0.07));",
    // Drift: the clouds slide one way, then back, over about fifty seconds.
    "  src.x -= n.b * 22.0 * sin(t * 0.125);",
    // Floating things bob and rock about their middle.
    "  for (int i = 0; i < " + MAX.float + "; i++) {",
    "    if (i >= nFloat) break;",
    "    vec4 b = floatBox[i];",
    "    vec2 c = floatA[i].xy;",
    "    float f = float(i);",
    "    float inside = step(b.x - 16.0, px.x) * step(px.x, b.z + 16.0) * step(b.y - 16.0, px.y) * step(px.y, b.w + 16.0);",
    "    float bob = floatA[i].z * 6.0 * sin(t * 0.9 + f * 1.9);",
    "    float rock = floatA[i].z * 0.05 * sin(t * 0.7 + f);",
    "    src = mix(src, c + rot(px - vec2(0.0, bob) - c, -rock), n.g * inside);",
    "  }",
    // Wind: sideways, in two slow waves under a gust.
    "  float gust = 0.6 + 0.4 * sin(t * 0.35);",
    "  src.x -= m.g * gust * (2.4 * sin(t * 1.4 + px.y * 0.025) + 0.8 * sin(t * 3.1 + px.y * 0.07 + px.x * 0.03));",
    // Swinging parts turn about their anchor.
    "  for (int i = 0; i < " + MAX.swing + "; i++) {",
    "    if (i >= nSwing) break;",
    "    vec4 b = swingBox[i];",
    "    float inside = step(b.x - 12.0, px.x) * step(px.x, b.z + 12.0) * step(b.y - 4.0, px.y) * step(px.y, b.w + 12.0);",
    "    src = mix(src, swingA[i].xy + rot(px - swingA[i].xy, -swing(i)), m.b * inside);",
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
    // w holds the lamp the light hangs from, plus one, times ten, plus the strength.
    "    float lamp = floor(glowA[i].w / 10.0) - 1.0;",
    "    for (int j = 0; j < " + MAX.swing + "; j++) {",
    "      if (float(j) == lamp) at = swingA[j].xy + rot(at - swingA[j].xy, swing(j));",
    "    }",
    "    vec2 d = px - at;",
    "    float r = length(d * vec2(1.0, 0.8));",
    // A halo light that does not swing shines all round and breathes deeper.
    "    float allRound = halo * step(lamp, -0.5);",
    "    float glow = exp(-r * r / (glowA[i].z * glowA[i].z)) * mix(smoothstep(-0.25, 0.2, d.y / glowA[i].z), 1.0, allRound);",
    "    float k = mod(glowA[i].w, 10.0) * (mix(0.7, 0.6, allRound) + mix(0.2, 0.4, allRound) * sin(t * 0.9 + float(i) * 1.3) + 0.03 * sin(t * 11.0 + float(i) * 7.0));",
    "    float spot = exp(-dot(d, d) / 60.0);",
    "    vec3 day = mix(col, col * vec3(1.08, 0.96, 0.74) + vec3(0.07, 0.045, 0.0), min(glow * k * 0.7, 1.0)) + spot * k * vec3(0.2, 0.16, 0.07);",
    "    vec3 dark = col + (glow * 0.14 + spot * 0.3) * k * vec3(1.0, 0.72, 0.35);",
    "    col = mix(day, dark, night);",
    "  }",
    // Lighthouse beams sweep round: seen from the side, a beam reaches furthest
    // when it points sideways and flashes when it turns towards the reader.
    "  for (int i = 0; i < " + MAX.beam + "; i++) {",
    "    if (i >= nBeam) break;",
    "    vec4 bm = beam[i];",
    "    float th = t * 0.55 + bm.w * 6.2832;",
    "    vec2 d = px - bm.xy;",
    "    float along = d.x * sign(cos(th));",
    "    float reach = bm.z * abs(cos(th)) + 20.0;",
    "    float spread = 2.0 + max(along, 0.0) * 0.06;",
    "    float cone = smoothstep(0.0, 14.0, along) * (1.0 - smoothstep(spread * 0.5, spread, abs(d.y))) * exp(-max(along, 0.0) / reach);",
    "    float flash = pow(max(sin(th), 0.0), 12.0) * exp(-dot(d, d) / 500.0);",
    "    vec3 day = mix(col, col * vec3(1.04, 1.0, 0.9) + vec3(0.06, 0.05, 0.02), cone * 0.45) + flash * vec3(0.25, 0.22, 0.15);",
    "    vec3 dark = col + (cone * 0.4 + flash * 0.9) * vec3(1.0, 0.85, 0.55);",
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
  if (!gl) return state("no WebGL context");
  canvas.className = "motion";
  canvas.setAttribute("aria-hidden", "true");

  function shader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
    state("shader: " + gl.getShaderInfoLog(s));
    return null;
  }
  var vs = shader(gl.VERTEX_SHADER, VS);
  var fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return state("link: " + gl.getProgramInfoLog(prog));
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
  gl.uniform1f(u("halo"), data.halo ? 1 : 0);
  set("Swing", swing.length, [
    ["4fv", "swingA", flat(swing, function (s) { return [s.anchor[0], s.anchor[1], s.amp, 0]; })],
    ["4fv", "swingBox", flat(swing, function (s) { return s.box; })]
  ]);
  set("Glow", glow.length, [
    ["4fv", "glowA", flat(glow, function (g) {
      return [g.at[0], g.at[1], g.radius, 10 * (g.swing + 1) + Math.min(g.strength, 9.99)];
    })]
  ]);
  set("Fall", fall.length, [
    ["4fv", "fallSprite", flat(fall, function (f) { return f.sprite; })],
    ["4fv", "fallPath", flat(fall, function (f) { return [f.from[0], f.from[1], f.floor, f.drift || 20]; })]
  ]);
  set("Twinkle", twinkle.length, [["4fv", "twinkle", flat(twinkle, function (w) { return w; })]]);
  var beams = data.beam || [];
  set("Beam", beams.length, [["4fv", "beam", flat(beams, function (b) { return b; })]]);
  var floating = data.float || [];
  set("Float", floating.length, [
    ["4fv", "floatA", flat(floating, function (f) { return [f.center[0], f.center[1], f.amp, 0]; })],
    ["4fv", "floatBox", flat(floating, function (f) { return f.box; })]
  ]);
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
      state("running");
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
