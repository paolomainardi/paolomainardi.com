import { fontPixels, wrap } from "./font.js";
import { buildPaletteLookup, PALETTE_STEPS } from "./palette.js";

const vertex = `#version 300 es
out vec2 uv;
void main(){
  vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
  uv=p; gl_Position=vec4(p*2.-1.,0.,1.);
}`;
const common = `
precision highp float;
precision highp sampler2DArray;
in vec2 uv;
out vec4 color;
uniform sampler2D uUnlit,uAlbedo,uForeground,uData;
uniform sampler2DArray uLights,uMasks;
uniform int uCount;
uniform vec3 uLantern;
uniform vec2 uSize;
uniform float uLanternRadius;
const float bayer[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
float threshold(vec2 p){ivec2 q=ivec2(floor(p))%4;return (bayer[q.y*4+q.x]+.5)/16.;}
vec3 linearColour(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
vec3 screenColour(vec3 c){c=clamp(c,0.,1.);return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
float lantern(vec2 p){return (1.-smoothstep(0.,1.,distance(p,uLantern.xy)/uLanternRadius))*uLantern.z;}
vec3 drawing(vec2 p){
 vec3 base=linearColour(texture(uUnlit,p/uSize).rgb);
 for(int i=0;i<uCount;i++){
   vec4 info=texelFetch(uData,ivec2(i,0),0);
   vec2 drift=texelFetch(uData,ivec2(i,2),0).xy;
   vec2 at=(p+drift)/uSize;
   base+=info.z*(linearColour(texture(uLights,vec3(at,float(i))).rgb)-linearColour(texture(uUnlit,at).rgb));
 }
 base+=linearColour(texture(uAlbedo,p/uSize).rgb)*vec3(1.,.7,.32)*lantern(p);
 return screenColour(base);
}`;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = (this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: true,
    }));
    if (!gl)
      throw new Error(
        "This game needs WebGL2. Try a browser with hardware acceleration enabled.",
      );
    gl.bindVertexArray(gl.createVertexArray());
    this.programs = {};
    this.programs.room = this.program(
      common +
        `uniform bool uFront;void main(){vec2 p=vec2(uv.x,1.-uv.y)*uSize;if(uFront&&texture(uForeground,p/uSize).a<.5)discard;color=vec4(drawing(p),1.);}`,
    );
    this.programs.sprite = this.program(`#version 300 es
precision highp float;
in vec2 uv;out vec4 color;
uniform sampler2D uImage,uSpriteGlow,uForeground;
uniform vec4 uRect,uSource,uTint;
uniform vec2 uImageSize,uSize;
uniform float uMirror,uRim,uFlame,uHandRadius;
uniform vec2 uHand;
uniform bool uCharacter,uEmission;
void main(){
 vec2 p=vec2(uv.x,1.-uv.y)*uSize,q=(p-uRect.xy)/uRect.zw;
 if(any(lessThan(q,vec2(0)))||any(greaterThanEqual(q,vec2(1))))discard;
 if(uMirror>.5)q.x=1.-q.x;
 vec2 tex=(uSource.xy+floor(q*uSource.zw)+.5)/uImageSize;
 vec4 c=texture(uImage,tex);if(c.a<.01)discard;
 vec2 delta=vec2(sign(uRim)*(uMirror>.5?-1.:1.)/uImageSize.x,0);
 float edge=1.-texture(uImage,tex+delta).a;
 vec3 rgb=c.rgb*uTint.rgb+vec3(.42,.24,.07)*edge*abs(uRim);
 if(uCharacter){
   float glow=texture(uSpriteGlow,tex).r*texture(uSpriteGlow,tex).a;
   float hand=(1.-smoothstep(0.,uHandRadius,distance(p,uHand)))*uFlame;
   rgb+=c.rgb*vec3(.18,.10,.025)*hand;
   rgb=mix(rgb,mix(c.rgb*.25,vec3(1.,.8,.4)*(1.+uFlame*.35),step(.01,uFlame)),glow);
   if(uEmission){if(texture(uForeground,p/uSize).a>.5)discard; color=vec4(vec3(1.,.7,.32)*glow*uFlame,c.a);return;}
 }
 color=vec4(rgb,c.a*uTint.a);
}`);
    this.programs.shadow = this.program(`#version 300 es
${common}
uniform vec4 uShadow;
uniform vec2 uShadowSize;
void main(){vec2 p=vec2(uv.x,1.-uv.y)*uSize;vec2 d=p-uShadow.xy;
 float t=clamp(dot(d,uShadow.zw)/max(dot(uShadow.zw,uShadow.zw),1.),0.,1.);
 float r=length((d-uShadow.zw*t)/uShadowSize);
 float a=max(0.,1.-r)*(.28-.16*t);if(a<threshold(p)*.5)discard;color=vec4(0.,0.,0.,.26);
}`);
    this.programs.glow = this.program(`#version 300 es
${common}
void main(){vec2 p=vec2(uv.x,1.-uv.y)*uSize;vec3 c=vec3(0);
 for(int i=0;i<uCount;i++){vec4 info=texelFetch(uData,ivec2(i,0),0);vec3 tint=texelFetch(uData,ivec2(i,1),0).rgb;
 vec3 warm=mix(tint/max(max(tint.r,tint.g),max(tint.b,.001)),vec3(1.,.7,.32),.25);
 c+=texture(uMasks,vec3(p/uSize,float(i))).r*info.z*warm;}
 c+=vec3(1.,.7,.32)*max(0.,1.-distance(p,uLantern.xy)/(uSize.y/45.))*uLantern.z;
 color=vec4(c,1.);
}`);
    this.programs.blur = this.program(`#version 300 es
precision highp float;in vec2 uv;out vec4 color;uniform sampler2D uImage;uniform vec2 uStep;
void main(){color=texture(uImage,uv)*.227027;for(int i=1;i<=4;i++){float w=i==1?.1945946:i==2?.1216216:i==3?.054054:.016216;color+=(texture(uImage,uv+uStep*float(i))+texture(uImage,uv-uStep*float(i)))*w;}}`);
    this.programs.present = this.program(`#version 300 es
precision highp float;precision highp sampler3D;in vec2 uv;out vec4 color;
uniform sampler2D uImage,uGlow,uGlowCore;uniform sampler3D uPalette;uniform float uBloom,uDither,uScale;
const float bayer[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
void main(){ivec2 q=ivec2(floor(gl_FragCoord.xy/uScale))%4;vec3 c=clamp(texture(uImage,uv).rgb+uDither*((bayer[q.y*4+q.x]+.5)/16.-.5)/255.,0.,1.);vec3 mapped=texture(uPalette,(floor(c*${PALETTE_STEPS - 1}.+.5)+.5)/${PALETTE_STEPS}.).rgb;color=vec4(mapped+(texture(uGlow,uv).rgb*.45+texture(uGlowCore,uv).rgb*.12)*uBloom,1.);}`);

    this.black = this.texture(new Uint8Array([0, 0, 0, 0]), 1, 1);
    this.white = this.texture(new Uint8Array([255, 255, 255, 255]), 1, 1);
    this.font = this.texture(fontPixels(), 96, 48);
  }
  program(fragment) {
    const gl = this.gl;
    const compile = (type, source) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram(),
      v = compile(gl.VERTEX_SHADER, vertex),
      f = compile(
        gl.FRAGMENT_SHADER,
        fragment.startsWith("#version")
          ? fragment
          : "#version 300 es\n" + fragment,
      );
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p));
    const uniforms = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const u = gl.getActiveUniform(p, i);
      uniforms[u.name] = gl.getUniformLocation(p, u.name);
    }
    return { p, uniforms };
  }
  use(program) {
    this.active = program;
    this.gl.useProgram(program.p);
    if (this.size) this.uniform("uSize", this.size);
  }
  uniform(name, value) {
    const gl = this.gl,
      loc = this.active.uniforms[name];
    if (loc === undefined) return;
    if (Array.isArray(value) || ArrayBuffer.isView(value))
      gl[`uniform${value.length}fv`](loc, value);
    else gl.uniform1f(loc, value);
  }
  integer(name, value) {
    const loc = this.active.uniforms[name];
    if (loc !== undefined) this.gl.uniform1i(loc, value);
  }
  bind(name, texture, unit = 0, target = this.gl.TEXTURE_2D) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(target, texture);
    this.integer(name, unit);
  }
  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
  }
  texture(source, width, height) {
    const gl = this.gl,
      t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (width)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    else
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source,
      );
    return t;
  }
  target(width, height) {
    const gl = this.gl,
      texture = this.texture(null, width, height),
      fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("Incomplete render target");
    return { texture, fbo, width, height };
  }
  into(target) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo || null);
    gl.viewport(
      0,
      0,
      target?.width || this.canvas.width,
      target?.height || this.canvas.height,
    );
  }
  pixels(image) {
    const gl = this.gl,
      t = this.texture(image),
      fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      t,
      0,
    );
    const result = new Uint8Array(image.width * image.height * 4);
    gl.readPixels(
      0,
      0,
      image.width,
      image.height,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      result,
    );
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(t);
    return result;
  }
  palette(image) {
    if (image.width < 1 || image.width > 256 || image.height !== 1)
      throw new Error("Palette must be N by 1, with 1 to 256 colours.");
    const lut = buildPaletteLookup(this.pixels(image));
    const gl = this.gl,
      t = (this.lut = gl.createTexture());
    gl.bindTexture(gl.TEXTURE_3D, t);
    for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_3D, key, gl.NEAREST);
    for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R])
      gl.texParameteri(gl.TEXTURE_3D, key, gl.CLAMP_TO_EDGE);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA8,
      PALETTE_STEPS,
      PALETTE_STEPS,
      PALETTE_STEPS,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      lut,
    );
  }
  setRoom(room) {
    const gl = this.gl;
    const [width, height] = room.size;
    this.size = room.size;
    if (this.scene) {
      gl.deleteTexture(this.scene.texture);
      gl.deleteFramebuffer(this.scene.fbo);
    }
    this.scene = this.target(width, height);
    if (this.roomTextures) {
      this.roomTextures.forEach((t) => gl.deleteTexture(t));
    }
    this.roomTextures = [];
    const keep = (t) => {
      this.roomTextures.push(t);
      return t;
    };
    const count = Math.max(1, room.lights.length);
    if (count > gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS))
      throw new Error("Too many lamp drawings for this GPU.");
    const array = (pixels) => {
      const texture = keep(gl.createTexture());
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, key, gl.NEAREST);
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T])
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, key, gl.CLAMP_TO_EDGE);
      gl.texImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        gl.RGBA8,
        width,
        height,
        count,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        pixels,
      );
      return texture;
    };
    this.states = Object.fromEntries(
      Object.entries(room.states).map(([key, state]) => {
        const pixels = new Uint8Array(width * height * 4 * count);
        room.lights.forEach((light, layer) =>
          pixels.set(state.lightPixels[light.id], layer * width * height * 4),
        );
        return [
          key,
          { unlit: keep(this.texture(state.unlit)), lights: array(pixels) },
        ];
      }),
    );
    this.albedo = keep(this.texture(room.albedo));
    this.foreground = keep(this.texture(room.foreground, width, height));
    const masks = new Uint8Array(width * height * 4 * count);
    room.lights.forEach((light, layer) => {
      const id = room.items.findIndex((item) => item.id === light.id);
      for (let i = 0; i < width * height; i++) {
        const offset = (layer * width * height + i) * 4;
        masks[offset] = room.ids[i] === id ? 255 : 0;
        masks[offset + 3] = 255;
      }
    });
    this.masks = array(masks);
    this.data = keep(gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D, this.data);
    for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER])
      gl.texParameteri(gl.TEXTURE_2D, key, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.lightData = new Float32Array(count * 3 * 4);
  }
  lights(game) {
    const gl = this.gl,
      room = game.room,
      count = Math.max(1, room.lights.length);
    room.lights.forEach((light, i) => {
      this.lightData.set([...light.position, light.strength, 0], i * 4);
      this.lightData.set(
        [...(light.drift || [0, 0]), 0, 0],
        (count * 2 + i) * 4,
      );
      this.lightData.set(
        [
          ...light.tint
            .slice(1)
            .match(/../g)
            .map((v) => parseInt(v, 16) / 255),
          1,
        ],
        (count + i) * 4,
      );
    });
    gl.activeTexture(gl.TEXTURE0 + 7);
    gl.bindTexture(gl.TEXTURE_2D, this.data);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32F,
      count,
      3,
      0,
      gl.RGBA,
      gl.FLOAT,
      this.lightData,
    );
  }
  lighting(game) {
    const gl = this.gl,
      state = this.states[game.time];
    this.bind("uAlbedo", this.albedo, 0);
    this.bind("uUnlit", state.unlit, 1);
    this.bind("uForeground", this.foreground, 2);
    this.bind("uLights", state.lights, 3, gl.TEXTURE_2D_ARRAY);
    this.bind("uMasks", this.masks, 5, gl.TEXTURE_2D_ARRAY);
    this.bind("uData", this.data, 4);
    this.integer("uCount", game.room.lights.length);
    this.uniform("uLanternRadius", game.lanternRadius);
    this.uniform("uLantern", [
      ...game.lanternPosition(),
      game.lanternStrength(),
    ]);
  }
  sprite(
    texture,
    size,
    rect,
    source = [0, 0, ...size],
    tint = [1, 1, 1, 1],
    mirror = false,
    rim = 0,
    character = null,
  ) {
    this.use(this.programs.sprite);
    this.bind("uImage", texture);
    this.integer("uCharacter", character ? 1 : 0);
    this.integer("uEmission", character?.emission ? 1 : 0);
    if (character) {
      this.bind(
        "uSpriteGlow",
        character.game.character.glowTexture || this.black,
        1,
      );
      this.bind("uForeground", this.foreground, 2);
      this.uniform("uFlame", character.game.lanternStrength());
      this.uniform("uHand", character.game.lanternPosition());
      this.uniform("uHandRadius", character.game.lanternRadius);
    }
    this.uniform("uRect", rect);
    this.uniform("uSource", source);
    this.uniform("uImageSize", size);
    this.uniform("uTint", tint);
    this.uniform("uMirror", mirror ? 1 : 0);
    this.uniform("uRim", rim);
    this.draw();
  }
  rect(x, y, w, h, tint) {
    this.sprite(this.white, [1, 1], [x, y, w, h], undefined, tint);
  }
  text(text, x, y, tint = [0.96, 0.89, 0.72, 1], scale = 1) {
    for (const char of String(text)) {
      const code = char.charCodeAt(0),
        c = char === "…" ? 127 : code >= 32 && code < 128 ? code : 63;
      this.sprite(
        this.font,
        [96, 48],
        [Math.round(x), Math.round(y), 6 * scale, 8 * scale],
        [((c - 32) % 16) * 6, Math.floor((c - 32) / 16) * 8, 6, 8],
        tint,
      );
      x += 6 * scale;
    }
  }
  resize(width, height) {
    const [frameWidth, frameHeight] = this.size;
    const scale = Math.max(
        1,
        Math.floor(Math.min(width / frameWidth, height / frameHeight)),
      ),
      w = frameWidth * scale,
      h = frameHeight * scale;
    // Keep integer render pixels; fit the canvas on displays smaller than a frame.
    const fit = Math.min(1, width / w, height / h);
    this.canvas.style.width = `${w * fit}px`;
    this.canvas.style.height = `${h * fit}px`;
    if (this.canvas.width === w && this.canvas.height === h && this.glow)
      return;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.glow)
      for (const target of this.glow) {
        this.gl.deleteTexture(target.texture);
        this.gl.deleteFramebuffer(target.fbo);
      }
    this.glow = [this.target(w, h), this.target(w, h), this.target(w, h)];
    this.scale = scale;
  }
  render(game) {
    const gl = this.gl;
    gl.disable(gl.BLEND);
    this.lights(game);
    this.into(this.scene);
    this.use(this.programs.room);
    this.lighting(game);
    this.integer("uFront", 0);
    this.draw();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const item of game.objects) {
      const object = item.sprite,
        light = game.lightAt(...item.position);
      this.sprite(
        object.texture,
        object.size,
        [
          item.position[0] - object.size[0] / 2,
          item.position[1] - object.size[1] + 1,
          ...object.size,
        ],
        undefined,
        [0.5 + light * 0.5, 0.48 + light * 0.52, 0.48 + light * 0.5, 1],
      );
    }
    const actor = game.actor,
      scale = game.depth(),
      lamp = game.nearestLamp();
    const dx = lamp ? actor.x - lamp.position[0] : 10,
      dy = lamp ? actor.y - lamp.position[1] : 8,
      len = Math.hypot(dx, dy) || 1;
    this.use(this.programs.shadow);
    this.uniform("uShadow", [
      actor.x,
      actor.y,
      (dx / len) * game.character.frame[0] * 0.7 * scale,
      (dy / len) * game.character.frame[1] * 0.2 * scale,
    ]);
    this.uniform("uShadowSize", [
      game.character.frame[0] * 0.28 * scale,
      game.character.frame[1] * 0.06 * scale,
    ]);
    this.draw();
    const animation = game.character.animations[actor.animation],
      frame = Math.floor(actor.clock * animation.fps) % animation.frames;
    const sources = game.lightSourcesAt(actor.x, actor.y),
      brightest = sources.reduce(
        (best, light) =>
          light.strength > (best?.strength || 0) ? light : best,
        null,
      ),
      tint = [0, 1, 2].map(
        (channel) =>
          0.7 +
          0.3 *
            Math.min(
              1,
              sources.reduce(
                (sum, light) =>
                  sum +
                  (light.strength * light.tint[channel]) /
                    Math.max(...light.tint, 0.001),
                0,
              ),
            ),
      ),
      rect = [
        Math.round(
          actor.x -
            (actor.mirror
              ? game.character.frame[0] - game.character.anchor[0]
              : game.character.anchor[0]) *
              scale,
        ),
        Math.round(actor.y - game.character.anchor[1] * scale),
        Math.round(game.character.frame[0] * scale),
        Math.round(game.character.frame[1] * scale),
      ];
    this.sprite(
      game.character.texture,
      game.character.size,
      rect,
      [
        frame * game.character.frame[0],
        animation.row * game.character.frame[1],
        ...game.character.frame,
      ],
      [...tint, 1],
      actor.mirror,
      brightest
        ? Math.sign(brightest.position[0] - actor.x) *
            Math.min(1, brightest.strength * 1.5)
        : 0,
      { game },
    );
    this.use(this.programs.room);
    this.lighting(game);
    this.integer("uFront", 1);
    this.draw();
    const [width, height] = game.room.size;
    const ui = game.uiScale,
      margin = width / 80,
      sentenceY = height / 30;
    const sentences = wrap(
      game.sentence(),
      Math.max(1, Math.floor((width - margin * 2) / (6 * ui))),
      2,
    );
    sentences.forEach((sentence, i) => {
      for (let y = -1; y <= 1; y++)
        for (let x = -1; x <= 1; x++)
          if (x || y)
            this.text(
              sentence,
              margin + x * ui,
              sentenceY + (i * 9 + y) * ui,
              [0.025, 0.03, 0.05, 1],
              ui,
            );
      this.text(sentence, margin, sentenceY + i * 9 * ui, undefined, ui);
    });
    this.rect(
      0,
      game.verbTop,
      width,
      height - game.verbTop,
      [0.025, 0.03, 0.05, 0.55],
    );
    for (const verb of game.verbRects) {
      const selected = game.verb === verb.label;
      this.text(
        verb.label,
        verb.x,
        verb.y,
        selected ? [1, 0.72, 0.35, 1] : [0.82, 0.83, 0.84, 1],
        game.verbScale,
      );
    }
    if (game.speech && game.speechUntil > game.elapsed) {
      const lines = game.speechLines,
        top = Math.max(
          sentenceY + (sentences.length * 9 + 8) * ui,
          rect[1] - (lines.length * 9 + 8) * ui,
        );
      lines.forEach((line, i) => {
        const x = Math.max(
          margin,
          Math.min(
            width - margin - line.length * 6 * ui,
            actor.x - line.length * 3 * ui,
          ),
        );
        this.rect(
          x - 2 * ui,
          top + (i * 9 - 1) * ui,
          (line.length * 6 + 4) * ui,
          9 * ui,
          [0.025, 0.03, 0.05, 0.85],
        );
        this.text(line, x, top + i * 9 * ui, undefined, ui);
      });
    }
    gl.disable(gl.BLEND);
    this.into(this.glow[2]);
    this.use(this.programs.glow);
    this.lighting(game);
    this.draw();
    if (game.character.glowTexture) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      this.sprite(
        game.character.texture,
        game.character.size,
        rect,
        [
          frame * game.character.frame[0],
          animation.row * game.character.frame[1],
          ...game.character.frame,
        ],
        [1, 1, 1, 1],
        actor.mirror,
        0,
        { game, emission: true },
      );
      gl.disable(gl.BLEND);
    }
    this.use(this.programs.blur);
    for (let i = 0; i < 4; i++) {
      this.into(this.glow[(i + 1) % 2]);
      this.bind("uImage", this.glow[i === 0 ? 2 : i % 2].texture);
      const radius = (i < 2 ? height / 90 : height / 36) * this.scale;
      this.uniform(
        "uStep",
        i % 2
          ? [0, radius / this.canvas.height]
          : [radius / this.canvas.width, 0],
      );
      this.draw();
    }
    this.into(null);
    this.use(this.programs.present);
    this.bind("uImage", this.scene.texture);
    this.bind("uGlow", this.glow[0].texture, 1);
    this.bind("uPalette", this.lut, 2, gl.TEXTURE_3D);
    this.bind("uGlowCore", this.glow[2].texture, 3);
    this.uniform("uBloom", game.bloom ? 1 : 0);
    this.uniform("uDither", game.world?.dither === true ? 1 : 0);
    this.uniform("uScale", this.scale);
    this.draw();
  }
  destroy() {
    const gl = this.gl;
    const extension = gl.getExtension("WEBGL_lose_context");
    extension?.loseContext();
  }
}
