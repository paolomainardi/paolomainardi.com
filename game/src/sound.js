// Mix world-defined ambience and effects, and manage their audio-context lifetime.
import { resolve } from "./assets.js";
const presets = {
  purr: { frequency: 320, duration: 2.6, level: 0.22 },
  surf: { frequency: 650, duration: 4, level: 0.32 },
  wind: { frequency: 280, duration: 4, level: 0.22 },
  crackle: { frequency: 1800, duration: 4, level: 0.09 },
  step: { frequency: 900, duration: 0.09, level: 1 },
  page: { frequency: 2400, duration: 0.32, level: 0.3 },
  click: { frequency: 1400, duration: 0.035, level: 0.25 },
  creak: { frequency: 380, duration: 0.65, level: 0.28 },
  whoosh: { frequency: 700, duration: 0.5, level: 0.25 },
};

export function soundPosition(room, actor, entry, result = {}) {
  const item = room.items.find((item) => item.id === entry.at);
  const position = item?.position;
  const distance = position
    ? Math.hypot(actor.x - position[0], actor.y - position[1]) / room.size[0]
    : 0;
  result.gain = 1 / (1 + 2 * distance);
  result.pan = position
    ? Math.max(-1, Math.min(1, (position[0] - actor.x) / (room.size[0] / 2)))
    : 0;
  return result;
}

// Both feet contact once per cycle, independent of frame rate and walking speed.
export function footContacts(before, after) {
  return Math.max(0, Math.floor(after * 2) - Math.floor(before * 2));
}

export class SoundEngine {
  constructor(world, url, context) {
    this.world = world;
    this.url = url;
    this.context = null;
    this.startContext = context;
    this.muted = false;
    this.ducked = false;
    this.disposed = false;
    this.buffers = new Map();
    this.reported = new Set();
    this.voices = new Set();
    this.loops = [];
    this.selection = null;
    this.spoken = null;
  }

  warn(key, error) {
    if (this.reported.has(key)) return;
    this.reported.add(key);
    console.warn(`Sound skipped: ${key}`, error);
  }

  start() {
    if (this.disposed || !this.startContext) return;
    if (!this.context) {
      this.context = this.startContext;
      const c = this.context;
      this.master = c.createGain();
      this.duck = c.createGain();
      this.ambience = c.createGain();
      this.effects = c.createGain();
      this.music = c.createGain();
      this.music.gain.value = this.world.mix?.music ?? 0.7;
      this.music.connect(this.binaural(c) || this.master);
      this.voice = c.createGain();
      this.voice.gain.value = this.world.mix?.voice ?? 1;
      this.voice.connect(this.master);
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

  // Two virtual speakers before the listener, drifting slowly: binaural on headphones.
  binaural(c) {
    if (!c.createPanner || !c.createChannelSplitter || !c.createOscillator)
      return null;
    const split = c.createChannelSplitter(2);
    [-1, 1].forEach((side, channel) => {
      const panner = c.createPanner();
      panner.panningModel = "HRTF";
      panner.positionX.value = side * Math.sin(0.7);
      panner.positionZ.value = -Math.cos(0.7);
      const drift = c.createOscillator(),
        depth = c.createGain();
      drift.frequency.value = 0.04;
      depth.gain.value = side * 0.25;
      drift.connect(depth);
      depth.connect(panner.positionX);
      drift.start();
      split.connect(panner, channel);
      panner.connect(this.master);
    });
    return split;
  }

  // iOS interrupts audio on lock or calls and only resumes it from a gesture.
  wake() {
    if (this.context && !this.disposed && this.context.state !== "running")
      this.visibility(false);
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
    this.updateDuck();
  }

  updateDuck() {
    if (this.context)
      this.ramp(
        this.duck.gain,
        (this.ducked ? 0.25 : 1) * (this.spoken?.source ? 0.5 : 1),
        0.15,
      );
  }

  stopVoice() {
    const spoken = this.spoken;
    this.spoken = null;
    if (spoken?.source) {
      spoken.source.onended = null;
      spoken.source.stop();
      spoken.source.disconnect();
    }
    this.updateDuck();
  }

  async playVoice(id, ended) {
    this.stopVoice();
    const definition = this.world.voices?.[id];
    if (!definition?.src || !this.context || this.disposed) return false;
    const spoken = (this.spoken = {});
    const buffer = await this.buffer(definition.src);
    if (this.spoken !== spoken || this.disposed) return false;
    if (!buffer) {
      this.spoken = null;
      return false;
    }
    try {
      const source = this.context.createBufferSource();
      spoken.source = source;
      source.buffer = buffer;
      source.connect(this.voice);
      source.onended = () => {
        if (this.spoken !== spoken) return;
        this.spoken = null;
        source.disconnect();
        this.updateDuck();
        ended();
      };
      source.start();
      this.updateDuck();
      return true;
    } catch (error) {
      this.warn(`voice:${id}`, error);
      this.stopVoice();
      return false;
    }
  }

  async playMusic(id) {
    const token = (this.musicToken = {});
    const voice = await this.play(id, this.music, 1, true);
    if (this.musicToken !== token || this.disposed) {
      voice?.source.stop();
      return;
    }
    this.musicVoice = voice;
  }

  stopMusic() {
    this.musicToken = null;
    if (!this.musicVoice || this.disposed) return;
    this.ramp(this.musicVoice.fade.gain, 0, 1);
    this.musicVoice.source.stop(this.context.currentTime + 1);
    this.musicVoice = null;
  }

  buffer(src, quiet = false) {
    let url;
    try {
      url = resolve(src, this.url);
    } catch (error) {
      this.warn(String(src), error);
      return Promise.resolve(null);
    }
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
            if (!quiet) this.warn(url, error);
            return null;
          }),
      );
    }
    return this.buffers.get(url);
  }

  async play(id, bus, volume = 1, quiet = false) {
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
    const buffer = src ? await this.buffer(src, quiet) : null;
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
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        if (definition.synth === "purr") {
          last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04;
          const t = i / c.sampleRate;
          const breath =
            0.35 + 0.65 * Math.sin((Math.PI * (t % 1.3)) / 1.3) ** 2;
          data[i] =
            last * 3.5 * (0.5 + 0.5 * Math.sin(t * 24 * Math.PI * 2)) * breath;
        } else data[i] = Math.random() * 2 - 1;
      }
      const filter = c.createBiquadFilter();
      nodes.push(filter);
      filter.type = ["surf", "purr"].includes(definition.synth)
        ? "lowpass"
        : "bandpass";
      filter.frequency.value = params.frequency ?? preset.frequency;
      filter.Q.value =
        definition.synth === "creak"
          ? 14
          : definition.synth === "step"
            ? 1.4
            : 0.7;
      source.playbackRate.value =
        definition.synth === "purr" ? 1 : 0.9 + Math.random() * 0.2;
      source.connect(filter);
      filter.connect(envelope);
      if (definition.synth === "purr" && !loop) {
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(preset.level, now + 0.15);
        envelope.gain.setValueAtTime(preset.level, now + duration - 0.15);
        envelope.gain.linearRampToValueAtTime(0, now + duration);
      } else if (loop) {
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
    if (this.disposed) return;
    this.disposed = true;
    this.stopVoice();
    this.loops.forEach((slot) => {
      slot.retired = true;
    });
    for (const voice of this.voices) {
      voice.source.stop();
      voice.nodes.forEach((node) => node.disconnect());
    }
    this.voices.clear();
    (this.context || this.startContext)
      ?.close()
      .catch((error) => this.warn("audio context", error));
  }
}
