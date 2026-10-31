// Animated covers. A cover built by scripts/cover-engine is redrawn on a WebGL
// canvas laid over the image. The shader bends the picture (plants sway, lamps
// swing, water rolls, things float, clouds drift, leaves fall) and reads every
// pixel from the drawings Codex made of the same scene: lit, unlit, during a
// lightning flash. Lights breathe or switch on a pattern, the light comes in
// when the cover is first shown, and the reader can switch the lamps.
//
// The shader is assembled from the effects a cover uses, listed in its
// motion.json; each effect below brings its own shader code, its settings and
// its update on every frame. docs/cover-engine.md describes how to add one.
//
// The image underneath stays the page's image, so nothing changes when the
// reader asks for reduced motion, WebGL is missing, or the script fails.
(function () {
  "use strict";

  var img = document.querySelector("img[data-motion-map]");
  if (!img) return;
  var root = document.documentElement;
  // The cover waits hidden for its unlit drawing when its light comes in; whatever
  // happens next, it is shown again.
  function release() {
    root.classList.remove("motion-wait");
  }
  // Why the cover is still, for whoever is looking at the page's markup.
  function state(s) {
    img.setAttribute("data-motion-state", s);
  }
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return release(), state("reduced motion");
  if (!window.WebGLRenderingContext) return release(), state("no WebGL");

  var data;
  try {
    data = JSON.parse(img.getAttribute("data-motion"));
  } catch (e) {
    return release(), state("no motion data");
  }

  var W = data.size[0], H = data.size[1];
  var on = {};
  (data.effects || []).forEach(function (e) { on[e] = true; });
  var list = {
    swing: data.swing || [], float: data.float || [], fall: data.fall || [], light: data.lights || [],
    twinkle: data.twinkle || [], beam: data.beam || []
  };
  // GLSL arrays need a size of at least one; the counts below say how many are used.
  function size(name) { return Math.max(list[name].length, 1); }
  function flat(items, pick) {
    var out = [];
    items.forEach(function (x, i) { out.push.apply(out, pick(x, i)); });
    return out;
  }
  // a setting, or its default when it is absent; an explicit 0 stays 0
  function opt(v, d) { return v === undefined || v === null ? d : v; }
  function rnd(i, n) { var x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return x - Math.floor(x); }
  function smooth(x) { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }

  // Timings of the light: it comes in after HOLD seconds, over ENTRY seconds.
  var HOLD = 0.6, ENTRY = 2;
  var entry = data.entry;
  var lightsK = data.lightsK || {}, rainK = data.rainK || {}, flashK = data.flashK || {};

  // ---------------------------------------------------------------------------
  // Effects. displace runs before the picture is read and moves src, the point
  // the pixel is read from; color runs after and changes col. They run in the
  // order of this list.
  var EFFECTS = [
    {
      name: "water",
      displace: "src += n.r * vec2(1.6 * sin(t * 0.9 + px.y * 0.06), 4.0 * sin(t * 1.1 - px.x * 0.022 + px.y * 0.035) + 1.2 * sin(t * 2.3 - px.x * 0.07));"
    },
    {
      name: "drift",
      // the clouds slide one way, then back, over about fifty seconds
      displace: "src.x -= n.b * 22.0 * sin(t * 0.125);"
    },
    {
      name: "float",
      decl: function () { return "uniform vec4 floatA[" + size("float") + "]; uniform vec4 floatBox[" + size("float") + "];"; },
      displace: [
        "for (int i = 0; i < " + size("float") + "; i++) {",
        "  vec4 b = floatBox[i]; vec2 c = floatA[i].xy; float f = float(i);",
        "  float inside = step(b.x - 16.0, px.x) * step(px.x, b.z + 16.0) * step(b.y - 16.0, px.y) * step(px.y, b.w + 16.0);",
        "  float bob = floatA[i].z * 6.0 * sin(t * 0.9 + f * 1.9);",
        "  float rock = floatA[i].z * 0.05 * sin(t * 0.7 + f);",
        "  src = mix(src, c + rot(px - vec2(0.0, bob) - c, -rock), n.g * inside);",
        "}"
      ].join("\n"),
      setup: function (c) {
        c.gl.uniform4fv(c.u("floatA"), flat(list.float, function (f) { return [f.center[0], f.center[1], f.amp, 0]; }));
        c.gl.uniform4fv(c.u("floatBox"), flat(list.float, function (f) { return f.box; }));
      }
    },
    {
      name: "wind",
      // sideways, in two slow waves under a gust
      displace: [
        "float gust = 0.6 + 0.4 * sin(t * 0.35);",
        "src.x -= m.g * gust * (2.4 * sin(t * 1.4 + px.y * 0.025) + 0.8 * sin(t * 3.1 + px.y * 0.07 + px.x * 0.03));"
      ].join("\n")
    },
    {
      name: "turn",
      // lamps and tools swing about their hook; limbs make small, irregular moves
      displace: [
        "for (int i = 0; i < " + size("swing") + "; i++) {",
        "  vec4 b = swingBox[i];",
        "  float inside = step(b.x - 12.0, px.x) * step(px.x, b.z + 12.0) * step(b.y - 4.0, px.y) * step(px.y, b.w + 12.0);",
        "  src = mix(src, swingA[i].xy + rot(px - swingA[i].xy, -swing(i)), m.b * inside);",
        "}"
      ].join("\n")
    },
    {
      name: "glass",
      // drops on the glass slide slowly down and bend the view through them
      decl: function () { return "uniform sampler2D dropsImg; uniform float dropsOn;"; },
      displace: [
        "float drop = 0.0;",
        "if (dropsOn > 0.5 && glass > 0.0) {",
        "  vec2 dq = fract(uv * vec2(3.0, 2.0) + vec2(0.0, -t * 0.018));",
        "  vec2 e = vec2(1.5 / 512.0, 0.0);",
        "  drop = texture2D(dropsImg, dq).r;",
        "  src += vec2(texture2D(dropsImg, dq + e.xy).r - texture2D(dropsImg, dq - e.xy).r,",
        "              texture2D(dropsImg, dq + e.yx).r - texture2D(dropsImg, dq - e.yx).r) * 14.0 * glass;",
        "}"
      ].join("\n"),
      color: "col = mix(col + drop * 0.22 * glass * (1.0 - col), col + drop * 0.3 * glass * (1.0 - col), night);",
      textures: [{ unit: 5, name: "dropsImg", attr: "data-motion-drops", ready: "dropsOn" }]
    },
    {
      name: "lights",
      // A light lets its unlit drawing in around it as it goes out (level 1), and a big
      // light adds a warm glow when fully lit; under the pointer a lamp brightens.
      // The light entry is the same unlit drawing, swept away by a soft band.
      decl: function () {
        return "uniform sampler2D unlit; uniform float edge; uniform vec2 entryDir;" +
          "uniform vec4 lightA[" + size("light") + "]; uniform vec4 lightB[" + size("light") + "]; uniform int nLight;";
      },
      color: [
        "vec3 off = texture2D(unlit, suv).rgb;",
        "float len = abs(size.x * entryDir.x) + abs(size.y * entryDir.y);",
        "float dark = 1.0 - smoothstep(edge - 0.45, edge, dot(px - size * 0.5, entryDir) / len + 0.5);",
        "vec3 glow = vec3(0.0); float hov = 0.0;",
        "for (int i = 0; i < " + size("light") + "; i++) {",
        "  if (i >= nLight) break;",
        "  vec4 B = lightB[i];",
        "  float big = mod(B.y, 2.0), hover = floor(B.y / 2.0);",
        "  vec2 pc = follow(lightA[i].xy, B.z);",
        "  float r = length((px - pc) / lightA[i].zw);",
        "  float fall = big > 0.5 ? mix(1.0, 0.55, smoothstep(0.0, 0.45, r)) * (1.0 - smoothstep(0.45, 1.0, r)) : 1.0 - smoothstep(0.7, 1.0, r);",
        "  dark = max(dark, B.x * fall);",
        "  glow += big * (1.0 - B.x) * (1.0 - smoothstep(0.0, 0.9, r)) * B.w * mix(vec3(0.0, 0.07, 0.24), vec3(0.55, 0.37, 0.2), night);",
        "  hov += hover * (1.0 - smoothstep(0.0, 1.0, length((px - pc) / max(lightA[i].zw * 0.7, vec2(40.0)))));",
        "}",
        "col = mix(col, off, clamp(dark, 0.0, 1.0));",
        "col = mix(col * (1.0 - glow), 1.0 - (1.0 - col) * (1.0 - glow), night);",
        "col = 1.0 - (1.0 - col) * (1.0 - clamp(hov, 0.0, 1.0) * vec3(0.55, 0.42, 0.22));"
      ].join("\n"),
      textures: [{ unit: 2, name: "unlit", attr: "data-motion-unlit", scheme: true, first: true }],
      setup: function (c) {
        c.gl.uniform1i(c.u("nLight"), list.light.length);
        var a = opt(entry && entry.from, 28) * Math.PI / 180;
        c.gl.uniform2f(c.u("entryDir"), Math.cos(a), -Math.sin(a));
        c.gl.uniform4fv(c.u("lightA"), flat(list.light, function (l) { return l.pool; }));
      },
      frame: function (c, s) {
        var k = Math.min(1, Math.max(0, (s - HOLD) / ENTRY));
        var ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        c.gl.uniform1f(c.u("edge"), entry ? 1.4 - ease * 1.85 : -1);
        if (list.light.length) {
          var fade = entry ? Math.min(1, Math.max(0, (s - HOLD - ENTRY) / 1.5)) : 1;
          var glowK = opt(lightsK.glow, 1) * fade * (c.night ? 0.95 : 0.6);
          c.gl.uniform4fv(c.u("lightB"), flat(list.light, function (l, i) {
            return [level(i, s, fade), (l.big ? 1 : 0) + (switches[i].hover ? 2 : 0), l.swing, glowK];
          }));
        }
      }
    },
    {
      name: "flash",
      // a lightning flash: the flash drawing shows for a double flicker, then fades
      decl: function () { return "uniform sampler2D flashImg; uniform float flash;"; },
      color: "if (flash > 0.0) col = mix(col, texture2D(flashImg, suv).rgb, flash);",
      textures: [{ unit: 3, name: "flashImg", attr: "data-motion-flash", scheme: true, ready: "flashOn" }],
      frame: function (c, s) {
        c.gl.uniform1f(c.u("flash"), c.ready.flashOn ? lightning(s) : 0);
      }
    },
    {
      name: "rain",
      // rain falls in the sky of the storm, darker streaks by day, light ones by night
      decl: function () { return "uniform sampler2D rainImg; uniform vec2 rainAt; uniform float rainOp, rainScale;"; },
      color: [
        "if (sky > 0.0) {",
        "  float rn = texture2D(rainImg, fract(uv * rainScale + rainAt)).r;",
        "  col = mix(col * (1.0 - rn * 0.9 * rainOp * sky), col + rn * rainOp * sky * (1.0 - col), night);",
        "}"
      ].join("\n"),
      textures: [{ unit: 4, name: "rainImg", attr: "data-motion-rain", ready: "rainOn" }],
      setup: function (c) {
        c.gl.uniform1f(c.u("rainScale"), opt(rainK.scale, 2));
      },
      frame: function (c, s) {
        var sp = opt(rainK.speed, 1);
        c.gl.uniform1f(c.u("rainOp"), c.ready.rainOn ? opt(rainK.opacity, c.night ? 0.5 : 0.45) : 0);
        c.gl.uniform2f(c.u("rainAt"), (s * 0.21 * sp) % 1, -(s * 1.17 * sp) % 1);
      }
    },
    {
      name: "twinkle",
      // at night the lit windows outside go dark and come back, one at a time
      decl: function () { return "uniform vec4 twinkle[" + size("twinkle") + "];"; },
      color: [
        "for (int i = 0; i < " + size("twinkle") + "; i++) {",
        "  vec4 w = twinkle[i];",
        "  float cyc = t * 0.05 + w.w * 7.0, ph = fract(cyc);",
        "  float gone = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.25, 0.28, ph)) * step(0.5, fract(sin(floor(cyc) * 12.9898 + w.w * 78.2) * 43758.5));",
        "  float near = 1.0 - smoothstep(w.z * 0.5, w.z, length(px - w.xy));",
        "  float lit = smoothstep(0.35, 0.6, dot(col, vec3(0.3, 0.59, 0.11)));",
        "  col = mix(col, col * vec3(0.3, 0.32, 0.45), gone * near * lit * night);",
        "}"
      ].join("\n"),
      setup: function (c) { c.gl.uniform4fv(c.u("twinkle"), flat(list.twinkle, function (w) { return w; })); }
    },
    {
      name: "beam",
      // seen from the side, a beam reaches furthest when it points sideways and flashes
      // when it turns towards the reader
      decl: function () { return "uniform vec4 beam[" + size("beam") + "];"; },
      color: [
        "for (int i = 0; i < " + size("beam") + "; i++) {",
        "  vec4 bm = beam[i];",
        "  float th = t * 0.55 + bm.w * 6.2832;",
        "  vec2 d = px - bm.xy;",
        "  float along = d.x * sign(cos(th));",
        "  float reach = bm.z * abs(cos(th)) + 20.0;",
        "  float spread = 2.0 + max(along, 0.0) * 0.06;",
        "  float cone = smoothstep(0.0, 14.0, along) * (1.0 - smoothstep(spread * 0.5, spread, abs(d.y))) * exp(-max(along, 0.0) / reach);",
        "  float fl = pow(max(sin(th), 0.0), 12.0) * exp(-dot(d, d) / 500.0);",
        "  vec3 day = mix(col, col * vec3(1.04, 1.0, 0.9) + vec3(0.06, 0.05, 0.02), cone * 0.45) + fl * vec3(0.25, 0.22, 0.15);",
        "  col = mix(day, col + (cone * 0.4 + fl * 0.9) * vec3(1.0, 0.85, 0.55), night);",
        "}"
      ].join("\n"),
      setup: function (c) { c.gl.uniform4fv(c.u("beam"), flat(list.beam, function (b) { return b; })); }
    },
    {
      name: "pulse",
      // a light runs along the threads, away from where they start
      color: [
        "float wave = fract(m.r * 2.5 + t * 0.22);",
        "float pl = smoothstep(0.0, 0.08, wave) * (1.0 - smoothstep(0.08, 0.22, wave));",
        "col = mix(col, mix(vec3(1.0, 0.82, 0.86), vec3(1.0, 0.65, 0.75), night), step(1.5 / 255.0, m.r) * pl * 0.75);"
      ].join("\n")
    },
    {
      name: "fall",
      // a leaf drifts down from its branch, turning, and fades on the floor
      decl: function () { return "uniform vec4 fallSprite[" + size("fall") + "]; uniform vec4 fallPath[" + size("fall") + "];"; },
      color: [
        "for (int i = 0; i < " + size("fall") + "; i++) {",
        "  vec4 sp = fallSprite[i]; vec4 path = fallPath[i];",
        "  float ph = fract(t * 0.06 + float(i) * 0.37);",
        "  vec2 pos = vec2(path.x + path.w * sin(ph * 5.0 + float(i) * 2.0) + ph * 40.0, mix(path.y, path.z, ph));",
        "  vec2 q = (sp.xy + sp.zw) * 0.5 + rot(px - pos, -0.8 * sin(ph * 7.0 + float(i)));",
        "  if (q.x > sp.x && q.x < sp.z && q.y > sp.y && q.y < sp.w) {",
        "    vec3 s = texture2D(lit, q / size).rgb;",
        "    vec3 bg = texture2D(lit, vec2(sp.x, sp.w) / size).rgb;",
        "    col = mix(col, s, smoothstep(0.06, 0.2, length(s - bg)) * smoothstep(0.0, 0.06, ph) * (1.0 - smoothstep(0.88, 1.0, ph)));",
        "  }",
        "}"
      ].join("\n"),
      setup: function (c) {
        c.gl.uniform4fv(c.u("fallSprite"), flat(list.fall, function (f) { return f.sprite; }));
        c.gl.uniform4fv(c.u("fallPath"), flat(list.fall, function (f) { return [f.from[0], f.from[1], f.floor, f.drift || 20]; }));
      }
    }
  ].filter(function (e) { return on[e.name]; });

  function part(key) {
    return EFFECTS.map(function (e) { return typeof e[key] === "function" ? e[key]() : e[key] || ""; }).join("\n");
  }

  var VS = "attribute vec2 p; varying vec2 uv;" +
    "void main(){ uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }";

  var FS = [
    // Phone GPUs run mediump at half precision, too coarse for pixel positions.
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 uv;",
    "uniform sampler2D lit, map;",
    "uniform float t, night;",
    "uniform vec2 size;",
    "uniform vec4 swingA[" + size("swing") + "]; uniform vec4 swingBox[" + size("swing") + "];",
    "vec2 rot(vec2 v, float a){ float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }",
    "float swing(int i){",
    "  vec4 s = vec4(0.0);",
    "  for (int j = 0; j < " + size("swing") + "; j++) { if (j == i) s = swingA[j]; }",
    "  float f = float(i);",
    "  float sw = 0.055 * sin(t * (1.1 + 0.15 * f) + f * 2.1) * (0.7 + 0.3 * sin(t * 0.23 + f));",
    // a limb moves now and then, small and irregular
    "  float idle = 0.055 * (0.6 * sin(t * 0.7 + f * 1.3) + 0.4 * sin(t * 1.9 + f * 2.7)) * smoothstep(-0.2, 0.6, sin(t * 0.21 + f));",
    "  return s.z * mix(sw, idle, s.w);",
    "}",
    // a light hung from a lamp follows its swing
    "vec2 follow(vec2 at, float lamp){",
    "  for (int j = 0; j < " + size("swing") + "; j++) { if (float(j) == lamp) at = swingA[j].xy + rot(at - swingA[j].xy, swing(j)); }",
    "  return at;",
    "}",
    part("decl"),
    "void main(){",
    "  vec2 px = uv * size;",
    // the map is three bands: thread, wind, turn; water, float, drift; sky, glass
    "  vec3 m = texture2D(map, vec2(uv.x, uv.y / 3.0)).rgb;",
    "  vec3 n = texture2D(map, vec2(uv.x, (1.0 + uv.y) / 3.0)).rgb;",
    "  vec2 b3 = texture2D(map, vec2(uv.x, (2.0 + uv.y) / 3.0)).rg;",
    "  float sky = b3.x, glass = b3.y;",
    "  vec2 src = px;",
    part("displace"),
    "  vec2 suv = src / size;",
    "  vec3 col = texture2D(lit, suv).rgb;",
    part("color"),
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");

  // ---------------------------------------------------------------------------
  // Lights: how dark each one is (0 lit, 1 off) at time s in seconds.
  var speed = opt(lightsK.breathe, 1);
  // each lamp remembers the cycle it is in, so the work per frame stays the same
  var cycles = {};
  function calls(i, s) {
    s += rnd(i, 0) * 30;
    var c = cycles[i];
    if (!c || s < c.at) c = cycles[i] = { n: 0, at: 0 };
    var lit, off;
    for (;;) {
      lit = 3 + 6 * rnd(i, c.n + 1); off = 1 + 2 * rnd(i, c.n + 2);
      if (s < c.at + lit + off) break;
      c.at += lit + off; c.n++;
    }
    var at = c.at;
    var u = s - at;
    if (u < lit) return 0;
    var back = off - (u - lit);
    if (back < 0.45) return back > 0.3 || (back > 0.1 && back < 0.2) ? 1 : 0;
    return smooth((u - lit) / 0.12);
  }
  var PATTERNS = {
    // on for 3 to 9 s, off for 1 to 3 s, back with a double blink
    calls: function (l, i, s) { return calls(i, s); },
    // the lamps go out in turn across the picture every 7 s
    wave: function (l, i, s) { var ph = ((s / 7 - l.pool[0] / W * 0.7) % 1 + 1) % 1; return ph < 0.12 ? smooth(ph / 0.03) * smooth((0.12 - ph) / 0.03) : 0; },
    breathe: function (l, i, s) { return 0.5 + 0.5 * Math.sin(s * speed * (1.6 + 0.3 * (i % 4)) + i * 1.7); }
  };
  // a big lamp breathes slowly with a faint flicker
  function big(i, s) { return 0.6 * (0.5 + 0.5 * Math.sin(s * speed * 1.1 + i * 2.3)) + 0.08 * Math.max(0, Math.sin(s * 13 + i)); }

  var switches = list.light.map(function () { return { ov: null, ovAt: 0, hover: false, buttons: [] }; });
  var clock = 0;
  function level(i, s, fade) {
    var st = switches[i], l = list.light[i];
    var auto = (l.big ? big(i, s) : (PATTERNS[(lightsK.pattern || {})[l.kind]] || PATTERNS.calls)(l, i, s)) * fade;
    if (st.ov === null) {
      // the wink: once the light is in, each lamp the reader can switch flickers off and on, in turn
      var w = s - HOLD - ENTRY - 1 - i * 0.22;
      if (w > 0 && w < 0.36) return Math.floor(w / 0.09) % 2 ? 0 : 1;
      return st.hover ? 0 : Math.min(1, auto);
    }
    // the reader's choice comes first
    var target = st.ov === "off" ? 1 : 0, uu = s - st.ovAt;
    if (uu < 0.36) return Math.floor(uu / 0.06) % 2 ? target : 1 - target;
    if (st.ov === "on" && l.big) return Math.min(1, auto);
    return target;
  }
  // The pendant switches off and on; a small lamp leaves its pattern for the state the
  // reader chose, and a second click hands it back.
  function toggle(i) {
    // a big lamp breathes, so it is on unless the reader switched it off
    var st = switches[i], l = list.light[i], lit = l.big ? st.ov !== "off" : level(i, clock, 1) < 0.5;
    if (!l.big && st.ov !== null) st.ov = null;
    else st.ov = lit ? "off" : "on";
    // paused, the lamp takes its new state at once, without the flicker
    st.ovAt = paused ? clock - 1 : clock;
    var now = st.ov === null || st.ov === "on";
    st.buttons.forEach(function (b) { b.setAttribute("aria-pressed", now ? "true" : "false"); });
    redraw();
  }

  // A lightning flash every [min, max] seconds: a double flicker that fades.
  var storm = null;
  function lightning(s) {
    var every = opt(flashK.every, [8, 15]), fd = opt(flashK.fade, 0.38);
    if (s < 2) return 0;
    if (!storm || s < storm.at) storm = { n: 0, at: 2 };
    for (;;) { var gap = every[0] + (every[1] - every[0]) * rnd(99, storm.n); if (s < storm.at + gap) break; storm.at += gap; storm.n++; }
    var u = s - storm.at;
    return opt(flashK.strength, 1) * (u < 0.07 ? 1 : u < 0.14 ? 0.25 : u < 0.22 ? 0.85 : u < 0.22 + fd ? 0.85 * (1 - smooth((u - 0.22) / fd)) : 0);
  }

  // ---------------------------------------------------------------------------
  // The stage holds the canvas and the switches; it covers the cover on the page,
  // and moves over the enlarged picture when the reader zooms.
  var stage = document.createElement("div");
  stage.className = "motion-stage";
  if (img.closest("picture") && img.closest("picture").querySelector("source.night")) stage.classList.add("has-night");
  var canvas = document.createElement("canvas");
  stage.appendChild(canvas);
  var gl = canvas.getContext("webgl", { alpha: false, antialias: false, premultipliedAlpha: false });
  if (!gl) return release(), state("no WebGL context");
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
  if (!vs || !fs) return release();
  // The motion map is three times the cover's height; a GPU that cannot hold it keeps the still cover.
  if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < Math.max(W, H * 3)) return release(), state("texture too large for this GPU");
  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return release(), state("link: " + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  var uniforms = {};
  function u(name) {
    if (!(name in uniforms)) uniforms[name] = gl.getUniformLocation(prog, name);
    return uniforms[name];
  }
  var ctx = { gl: gl, u: u, night: false, ready: {} };

  // One texture per unit, made once and refilled: a scheme swap or the zoom never
  // leaves an old texture behind on the GPU.
  var units = {};
  function upload(unit, source) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    if (!units[unit]) {
      units[unit] = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, units[unit]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, units[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, source);
  }
  function fetchImage(src, done) {
    var im = new Image();
    im.onload = function () { done(im); };
    im.onerror = function () { done(null); };
    im.src = src;
  }

  gl.uniform1i(u("lit"), 0);
  gl.uniform1i(u("map"), 1);
  gl.uniform2f(u("size"), W, H);
  if (list.swing.length) {
    gl.uniform4fv(u("swingA"), flat(list.swing, function (s) { return [s.anchor[0], s.anchor[1], s.amp, s.idle ? 1 : 0]; }));
    gl.uniform4fv(u("swingBox"), flat(list.swing, function (s) { return s.box; }));
  }
  var textures = [];
  EFFECTS.forEach(function (e) {
    if (e.setup) e.setup(ctx);
    (e.textures || []).forEach(function (tx) {
      gl.uniform1i(u(tx.name), tx.unit);
      if (tx.ready) gl.uniform1f(u(tx.ready), 0);
      textures.push(tx);
    });
  });

  // The drawings of the current scheme: the page's own picture, then the state
  // drawings. Those the first frame needs are loaded before it; the rest after.
  function textureURL(tx) {
    var url = img.getAttribute(tx.attr + (tx.scheme && ctx.night ? "-night" : ""));
    return url || img.getAttribute(tx.attr);
  }
  // Each load of the scheme's drawings has a number; a drawing that arrives after a
  // newer load started belongs to the old scheme and is dropped.
  var generation = 0;
  function picture(done) {
    var gen = ++generation;
    var src = img.currentSrc || img.src;
    ctx.night = /-night/.test(src);
    gl.uniform1f(u("night"), ctx.night ? 1 : 0);
    var first = textures.filter(function (tx) { return tx.first; });
    var left = first.length + 1, missing = [], picture0 = null;
    // a state drawing that cannot be loaded is replaced by the picture itself: no state, no harm
    function one() {
      if (gen !== generation || --left) return;
      // without its own picture the canvas would cover the image with nothing
      if (!picture0) return stop("no picture");
      missing.forEach(function (unit) { upload(unit, picture0); });
      if (zoom && started) zoomPicture();
      redraw();
      if (done) done();
    }
    fetchImage(src, function (im) { if (gen === generation && im) { picture0 = im; upload(0, im); } one(); });
    first.forEach(function (tx) {
      var url = textureURL(tx);
      if (!url) { missing.push(tx.unit); return one(); }
      fetchImage(url, function (im) {
        if (gen !== generation) return;
        if (im) upload(tx.unit, im); else missing.push(tx.unit);
        one();
      });
    });
    // a drawing of the old scheme is not used until the new one arrives
    textures.forEach(function (tx) {
      if (tx.scheme && tx.ready) { ctx.ready[tx.ready] = false; gl.uniform1f(u(tx.ready), 0); }
    });
    // the drawings the first frame does not need; a texture shared by both schemes loads once
    textures.filter(function (tx) { return !tx.first && !(tx.loaded && !tx.scheme); }).forEach(function (tx) {
      var url = textureURL(tx);
      if (!url) return;
      tx.loaded = true;
      fetchImage(url, function (im) {
        if (!im || (tx.scheme && gen !== generation)) return;
        upload(tx.unit, im);
        if (tx.ready) { ctx.ready[tx.ready] = true; gl.uniform1f(u(tx.ready), 1); }
        redraw();
      });
    });
  }

  // The switches: one button over each light, from the object sheet. Nothing is drawn
  // over the picture; the lamp itself answers the pointer, and the focus ring shows
  // only for the keyboard.
  var layer = document.createElement("div");
  layer.className = "motion-switches";
  if (list.light.length) stage.appendChild(layer);
  list.light.forEach(function (l, i) {
    var b = l.hit, btn = document.createElement("button");
    btn.type = "button";
    btn.className = "switch" + (l.big ? " big" : " small");
    btn.setAttribute("aria-label", l.label);
    btn.setAttribute("aria-pressed", "true");
    btn.dataset.box = b.join(",");
    btn.addEventListener("click", function (ev) { ev.stopPropagation(); toggle(i); });
    btn.addEventListener("pointerenter", function () { switches[i].hover = true; });
    btn.addEventListener("pointerleave", function () { switches[i].hover = false; });
    btn.addEventListener("focus", function () { switches[i].hover = true; });
    btn.addEventListener("blur", function () { switches[i].hover = false; });
    switches[i].buttons.push(btn);
    layer.appendChild(btn);
  });

  // The stage covers the image inside its border, at the size it is drawn: the cover
  // on the page, or the enlarged picture while the reader zooms.
  var zoom = null;
  function place() {
    var target = zoom ? zoom.image : img, w = target.clientWidth, h = target.clientHeight;
    if (zoom) {
      var r = target.getBoundingClientRect(), d = zoom.dialog.getBoundingClientRect();
      stage.style.left = r.left - d.left - zoom.dialog.clientLeft + "px";
      stage.style.top = r.top - d.top - zoom.dialog.clientTop + "px";
    } else {
      stage.style.left = img.offsetLeft + img.clientLeft + "px";
      stage.style.top = img.offsetTop + img.clientTop + "px";
    }
    stage.style.width = w + "px";
    stage.style.height = h + "px";
    // at least 44 pixels to aim at, whatever the size of the lamp
    var min = 44 * W / Math.max(w, 1);
    layer.childNodes.forEach(function (btn) {
      var b = btn.dataset.box.split(",").map(Number);
      var px = Math.max(btn.classList.contains("big") ? 0 : 10, (min - (b[2] - b[0])) / 2);
      var py = Math.max(btn.classList.contains("big") ? 0 : 10, (min - (b[3] - b[1])) / 2);
      btn.style.left = (b[0] - px) / W * 100 + "%";
      btn.style.top = (b[1] - py) / H * 100 + "%";
      btn.style.width = (b[2] - b[0] + 2 * px) / W * 100 + "%";
      btn.style.height = (b[3] - b[1] + 2 * py) / H * 100 + "%";
    });
    var scale = Math.min(window.devicePixelRatio || 1, 2);
    var bw = Math.min(Math.round(w * scale), W);
    var bh = Math.round(bw * H / W);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
      gl.viewport(0, 0, bw, bh);
      redraw();
    }
  }

  // The reader can pause the motion: a small button in the corner of the cover,
  // seen when the pointer is over the cover or the button has focus.
  var paused = false;
  var pause = document.createElement("button");
  pause.type = "button";
  pause.className = "motion-pause";
  pause.setAttribute("aria-label", "Pause the cover animation");
  pause.setAttribute("aria-pressed", "false");
  pause.addEventListener("click", function (ev) {
    ev.stopPropagation();
    paused = !paused;
    pause.setAttribute("aria-pressed", paused ? "true" : "false");
    if (!paused) start();
  });
  stage.appendChild(pause);

  // The cover goes back to the still image for good when the GPU drops the canvas or
  // the reader asks for reduced motion after the page has loaded.
  var gone = false;
  function stop(why) {
    gone = true;
    if (stage.parentNode) stage.parentNode.removeChild(stage);
    release();
    state(why);
  }
  canvas.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); stop("WebGL context lost"); });
  if (window.matchMedia) {
    var reduce = matchMedia("(prefers-reduced-motion: reduce)");
    var onReduce = function () { if (reduce.matches) stop("reduced motion"); };
    if (reduce.addEventListener) reduce.addEventListener("change", onReduce);
    else if (reduce.addListener) reduce.addListener(onReduce);
  }

  var visible = true, running = false, last = 0, shown = false;
  function draw() {
    gl.uniform1f(u("t"), clock);
    EFFECTS.forEach(function (e) { if (e.frame) e.frame(ctx, clock); });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  // A paused or hidden cover is drawn again, at the same moment, whenever its size
  // or its drawings change: resizing the canvas clears it.
  function redraw() {
    if (shown && !running && !gone) draw();
  }
  function frame(now) {
    if (gone || paused || (!visible && !zoom) || document.hidden) {
      running = false;
      return;
    }
    requestAnimationFrame(frame);
    // Thirty frames a second is plenty for this motion, and halves the work.
    if (last && now - last < 32) return;
    clock += Math.min(now - (last || now), 100) / 1000;
    last = now;
    draw();
    if (!shown) {
      shown = true;
      stage.classList.add("on");
      release();
      state("running");
    }
  }
  function start() {
    if (gone || paused || running || (!visible && !zoom) || document.hidden) return;
    running = true;
    last = 0;
    requestAnimationFrame(frame);
  }

  // The cover follows the colour scheme: when scheme.js swaps it, the canvas takes
  // the new picture and its state drawings, also while the first ones still load.
  var started = false;

  // The animation goes with the reader into the zoom, at full size, and comes back.
  // A zoom opened before the cover is ready is joined when it is.
  var zoomLoad = 0;
  // the full-size picture of the current scheme, for the zoom
  function zoomPicture() {
    var z = ++zoomLoad;
    var url = (ctx.night && img.getAttribute("data-zoom-night")) || img.getAttribute("data-zoom") || zoom.full;
    fetchImage(url, function (im) { if (im && zoom && z === zoomLoad) { upload(0, im); redraw(); } });
  }
  function enterZoom() {
    zoom.dialog.appendChild(stage);
    stage.classList.add("in-zoom");
    zoomPicture();
    zoom.image.addEventListener("load", place);
    // the overlay scales in: measure again once it has settled
    zoom.dialog.addEventListener("animationend", place, { once: true });
    setTimeout(place, 400);
    place();
    start();
  }
  img.addEventListener("zoom:open", function (ev) {
    if (gone) return;
    zoom = ev.detail;
    if (started) enterZoom();
  });
  img.addEventListener("zoom:close", function () {
    if (gone || !zoom) return;
    zoom.image.removeEventListener("load", place);
    zoom = null;
    zoomLoad++;
    stage.classList.remove("in-zoom");
    if (!started) return;
    img.parentNode.insertBefore(stage, img.nextSibling);
    picture();
    place();
  });

  function begin() {
    img.addEventListener("load", function () { if (started && !gone) picture(); });
    fetchImage(img.getAttribute("data-motion-map"), function (map) {
      if (gone) return;
      if (!map) return release(), state("no motion map");
      upload(1, map);
      var first = img.currentSrc || img.src;
      picture(function () {
        if (gone) return;
        started = true;
        if ((img.currentSrc || img.src) !== first) picture();
        if (zoom) enterZoom();
        else img.parentNode.insertBefore(stage, img.nextSibling);
        place();
        window.addEventListener("resize", place);
        document.addEventListener("visibilitychange", start);
        if ("IntersectionObserver" in window) {
          new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            start();
          }).observe(img);
        }
        start();
      });
    });
  }

  if (img.complete) begin();
  else img.addEventListener("load", begin, { once: true });
})();
