// Validate and time the optional opening credits independently of room loading.
export function validateIntro(world) {
  const intro = world.intro;
  if (intro === undefined) return;
  if (!intro || !Array.isArray(intro.shots) || !intro.shots.length)
    throw new Error("Intro requires a non-empty shots array.");
  if (intro.music !== undefined) {
    const sound = world.sounds?.[intro.music];
    if (
      typeof intro.music !== "string" ||
      !sound ||
      typeof sound.src !== "string" ||
      !sound.src ||
      sound.loop
    )
      throw new Error("Intro music must name a non-looping sound file.");
  }
  if (
    world.mix?.music !== undefined &&
    (!Number.isFinite(world.mix.music) || world.mix.music < 0)
  )
    throw new Error("Music mix must be a non-negative number.");
  for (const shot of intro.shots) {
    if (
      !shot ||
      !Object.hasOwn(world.rooms, shot.room) ||
      !["night", "dusk"].includes(shot.time) ||
      !Number.isFinite(shot.seconds) ||
      shot.seconds <= 0 ||
      !Array.isArray(shot.lines) ||
      !shot.lines.every((line) => typeof line === "string") ||
      (shot.title !== undefined && typeof shot.title !== "boolean") ||
      (shot.sounds !== undefined &&
        (!Array.isArray(shot.sounds) ||
          !shot.sounds.every(
            (cue) =>
              Object.hasOwn(world.sounds || {}, cue?.sound) &&
              Number.isFinite(cue.at) &&
              cue.at >= 0 &&
              cue.at < shot.seconds &&
              (cue.volume === undefined ||
                (Number.isFinite(cue.volume) && cue.volume >= 0)),
          )))
    )
      throw new Error(
        "Invalid intro shot: room, time, positive seconds and text lines are required.",
      );
  }
}

export class Intro {
  constructor(config) {
    this.config = config;
    this.index = 0;
    this.elapsed = 0;
  }
  get shot() {
    return this.config.shots[this.index];
  }
  update(dt) {
    const before = this.elapsed;
    this.elapsed += dt;
    // Sound cues whose time falls within this step, played by the session.
    this.due = (this.shot.sounds || []).filter(
      (cue) => cue.at >= before && cue.at < this.elapsed,
    );
    return (
      this.elapsed >= this.shot.seconds &&
      this.index < this.config.shots.length - 1
    );
  }
  next() {
    this.index++;
    this.elapsed = 0;
  }
  text(title, reduced = false) {
    const values = this.shot.title
      ? [title, ...this.shot.lines]
      : this.shot.lines;
    const duration = this.shot.seconds / Math.max(1, values.length);
    const index = Math.min(
      values.length - 1,
      Math.floor(this.elapsed / duration),
    );
    if (index < 0) return null;
    const local = this.elapsed - index * duration;
    const hold =
      this.index === this.config.shots.length - 1 &&
      index === values.length - 1;
    const fade = Math.min(0.8, duration / 3);
    return {
      value: values[index],
      title: !!this.shot.title && index === 0,
      alpha: reduced
        ? 1
        : Math.max(
            0,
            Math.min(1, local / fade, hold ? 1 : (duration - local) / fade),
          ),
    };
  }
}
