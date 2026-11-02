// Sound definitions and event bindings belong to the world, never to room logic.
const presets = {
  surf: { frequency: 650, duration: 4, level: 0.32 },
  wind: { frequency: 280, duration: 4, level: 0.22 },
  crackle: { frequency: 1800, duration: 4, level: 0.09 },
  step: { frequency: 900, duration: 0.09, level: 1 },
  page: { frequency: 2400, duration: 0.32, level: 0.3 },
  click: { frequency: 1400, duration: 0.035, level: 0.25 },
  creak: { frequency: 380, duration: 0.65, level: 0.28 },
  whoosh: { frequency: 700, duration: 0.5, level: 0.25 },
};

export function soundPosition(room, actor, entry) {
  const item = room.items.find((item) => item.id === entry.at);
  const position = item?.position;
  const distance = position
    ? Math.hypot(actor.x - position[0], actor.y - position[1]) / room.size[0]
    : 0;
  return {
    gain: 1 / (1 + 2 * distance),
    pan: position
      ? Math.max(-1, Math.min(1, (position[0] - actor.x) / (room.size[0] / 2)))
      : 0,
  };
}

// Both feet contact once per cycle, independent of frame rate and walking speed.
export function footContacts(before, after) {
  return Math.max(0, Math.floor(after * 2) - Math.floor(before * 2));
}

export class SoundEngine {
  constructor(
    world,
    url,
    Context = globalThis.AudioContext || globalThis.webkitAudioContext,
  ) {
    this.world = world;
    this.url = url;
    this.Context = Context;
    this.context = null;
    this.muted = false;
    this.ducked = false;
    this.disposed = false;
    this.buffers = new Map();
    this.reported = new Set();
    this.voices = new Set();
    this.loops = [];
    this.selection = null;
  }

  warn(key, error) {
    if (this.reported.has(key)) return;
    this.reported.add(key);
    console.warn(`Sound skipped: ${key}`, error);
  }

  start() {
    if (this.disposed || !this.Context) return;
    if (!this.context) {
      this.context = new this.Context();
      const c = this.context;
      this.master = c.createGain();
      this.duck = c.createGain();
      this.ambience = c.createGain();
      this.effects = c.createGain();
      this.master.gain.value = this.world.mix?.master ?? 0.5;
      this.ambience.gain.value = this.world.mix?.ambience ?? 0.8;
      this.effects.gain.value = this.world.mix?.effects ?? 1;
      this.duck.gain.value = this.ducked ? 0.25 : 1;
      this.master.gain.value *= this.muted ? 0 : 1;
      this.ambience.connect(this.duck);
      this.effects.connect(this.duck);
      this.duck.connect(this.master);
      this.master.connect(c.destination);
    }
    this.visibility(false);
  }

  visibility(hidden) {
    if (!this.context || this.disposed) return;
    const result = hidden ? this.context.suspend() : this.context.resume();
    result?.catch((error) => this.warn("audio context", error));
  }

  ramp(param, value, seconds = 0.08) {
    const now = this.context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.context)
      this.ramp(
        this.master.gain,
        this.muted ? 0 : (this.world.mix?.master ?? 0.5),
      );
  }

  setReader(open) {
    if (this.ducked === open) return;
    this.ducked = open;
    if (this.context) this.ramp(this.duck.gain, open ? 0.25 : 1, 0.15);
  }

  buffer(src) {
    const url = new URL(src, this.url).href;
    if (!this.buffers.has(url)) {
      this.buffers.set(
        url,
        fetch(url)
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.arrayBuffer();
          })
          .then((bytes) => this.context.decodeAudioData(bytes))
          .catch((error) => {
            this.warn(url, error);
            return null;
          }),
      );
    }
    return this.buffers.get(url);
  }

  async play(id, bus, volume = 1) {
    if (!this.context || this.disposed || !id) return null;
    const definition = this.world.sounds?.[id];
    if (!definition) {
      this.warn(id, "Unknown sound");
      return null;
    }
    const preset = Object.hasOwn(presets, definition.synth)
      ? presets[definition.synth]
      : null;
    if (!definition.src && !preset) {
      this.warn(id, `Unknown synth: ${definition.synth}`);
      return null;
    }
    const c = this.context;
    // A list of files plays one at random, so repeated sounds differ.
    const src = Array.isArray(definition.src)
      ? definition.src[Math.floor(Math.random() * definition.src.length)]
      : definition.src;
    const buffer = src ? await this.buffer(src) : null;
    if (this.disposed || (definition.src && !buffer)) return null;
    const output = c.createGain(),
      pan = c.createStereoPanner();
    const envelope = c.createGain(),
      fade = c.createGain();
    const source = c.createBufferSource();
    const nodes = [source, envelope, fade, output, pan];
    const loop = !!definition.loop;
    const params = definition.params || {};
    const duration = Math.max(0.02, params.duration ?? preset?.duration ?? 1);
    const now = c.currentTime;
    output.gain.value = (definition.volume ?? 1) * volume;
    source.loop = loop;
    envelope.connect(fade);
    fade.connect(output);
    output.connect(pan);
    pan.connect(bus);
    if (buffer) {
      source.buffer = buffer;
      source.connect(envelope);
    } else {
      // Long, independently generated noise beds plus random envelopes avoid a fixed wave loop.
      source.buffer = c.createBuffer(
        1,
        Math.ceil(c.sampleRate * (loop ? 8 : duration)),
        c.sampleRate,
      );
      const data = source.buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      const filter = c.createBiquadFilter();
      nodes.push(filter);
      filter.type = ["surf"].includes(definition.synth)
        ? "lowpass"
        : "bandpass";
      filter.frequency.value = params.frequency ?? preset.frequency;
      filter.Q.value =
        definition.synth === "creak" ? 14 : definition.synth === "step" ? 1.4 : 0.7;
      source.playbackRate.value = 0.9 + Math.random() * 0.2;
      source.connect(filter);
      filter.connect(envelope);
      if (loop) {
        envelope.gain.value = preset.level;
      } else {
        const level = preset.level * (0.8 + Math.random() * 0.2);
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(level, now + duration * 0.12);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(
            30,
            filter.frequency.value * (definition.synth === "page" ? 0.15 : 0.6),
          ),
          now + duration,
        );
      }
      source.filter = filter;
    }
    const voice = {
      output,
      pan,
      envelope,
      fade,
      source,
      definition,
      nodes,
      next: now,
      level: (definition.volume ?? 1) * volume,
      stopAt: Infinity,
    };
    this.voices.add(voice);
    source.onended = () => {
      nodes.forEach((node) => node.disconnect());
      this.voices.delete(voice);
    };
    source.start();
    if (!loop) source.stop(now + (buffer ? buffer.duration : duration) + 0.02);
    return voice;
  }

  event(name, volume = 1) {
    return this.play(this.world.events?.[name], this.effects, volume);
  }

  update(game) {
    if (!this.context || this.disposed) return;
    const c = this.context;
    if (
      this.selection?.room !== game.room ||
      this.selection?.time !== game.time
    ) {
      for (const slot of this.loops) {
        slot.retired = true;
        if (slot.voice) {
          this.ramp(slot.voice.fade.gain, 0, 1);
          slot.voice.source.stop(c.currentTime + 1);
          slot.voice.stopAt = c.currentTime + 1;
        }
      }
      this.selection = { room: game.room, time: game.time };
      this.loops = (game.room.config.ambience?.[game.time] || []).map(
        (entry) => {
          const slot = { entry, voice: null, retired: false };
          // Start silently, including files whose decode finishes after a room change.
          this.play(entry.sound, this.ambience, 0).then((voice) => {
            if (!voice) return;
            if (slot.retired || this.disposed) {
              voice.source.stop();
              return;
            }
            slot.voice = voice;
            voice.fade.gain.value = 0;
            this.ramp(voice.fade.gain, 1, 1);
            voice.level = voice.definition.volume ?? 1;
            this.position(slot, game);
          });
          return slot;
        },
      );
    }
    for (const slot of this.loops) if (slot.voice) this.position(slot, game);
    for (const voice of this.voices) {
      const synth = voice.definition.synth;
      if (
        !voice.definition.loop ||
        !presets[synth] ||
        voice.next > c.currentTime ||
        voice.stopAt <= c.currentTime + 0.8
      )
        continue;
      const now = c.currentTime;
      const seconds =
        synth === "surf" ? 1.5 + Math.random() * 2 : 0.3 + Math.random() * 0.5;
      const level = presets[synth].level;
      voice.envelope.gain.linearRampToValueAtTime(
        level * (0.25 + Math.random()),
        now + seconds,
      );
      voice.source.filter.frequency.linearRampToValueAtTime(
        (voice.definition.params?.frequency ?? presets[synth].frequency) *
          (0.7 + Math.random() * 0.6),
        now + seconds,
      );
      if (synth === "surf" && Math.random() < 0.3) {
        const crest = now + seconds * 0.6;
        voice.envelope.gain.linearRampToValueAtTime(level * 1.4, crest);
        voice.envelope.gain.linearRampToValueAtTime(level * 0.4, crest + 0.3);
      }
      if (synth === "crackle") {
        const pop = now + Math.random() * seconds;
        voice.envelope.gain.setValueAtTime(level, pop);
        voice.envelope.gain.linearRampToValueAtTime(
          level * (2 + Math.random() * 2),
          pop + 0.004,
        );
        voice.envelope.gain.exponentialRampToValueAtTime(
          level * 0.5,
          pop + 0.045,
        );
      }
      voice.next = now + seconds;
    }
  }

  position(slot, game, seconds = 0.08) {
    const { entry, voice } = slot;
    const spatial = soundPosition(game.room, game.actor, entry);
    const lamp = entry.light
      ? (game.room.lights.find((light) => light.id === entry.light)?.level ?? 0)
      : 1;
    // Do not restart the one-second fade on every render frame.
    const target = voice.level * spatial.gain * lamp;
    if (slot.target !== target) {
      this.ramp(voice.output.gain, target, seconds);
      slot.target = target;
    }
    if (slot.pan !== spatial.pan) {
      this.ramp(voice.pan.pan, spatial.pan);
      slot.pan = spatial.pan;
    }
  }

  destroy() {
    this.disposed = true;
    this.loops.forEach((slot) => {
      slot.retired = true;
    });
    for (const voice of this.voices) {
      voice.source.stop();
      voice.nodes.forEach((node) => node.disconnect());
    }
    this.voices.clear();
    this.context?.close().catch((error) => this.warn("audio context", error));
  }
}
