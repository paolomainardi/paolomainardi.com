// Check audio fixture behavior against the engine and shipped fixtures.
export class AudioParam {
  constructor(value = 1) {
    this.value = value;
    this.calls = [];
  }
  cancelScheduledValues(time) {
    this.calls.push(["cancel", time]);
  }
  setValueAtTime(value, time) {
    this.calls.push(["set", value, time]);
    this.value = value;
  }
  linearRampToValueAtTime(value, time) {
    this.calls.push(["linear", value, time]);
  }
  exponentialRampToValueAtTime(value, time) {
    this.calls.push(["exponential", value, time]);
  }
}
class AudioNode {
  constructor(context) {
    this.context = context;
    this.gain = new AudioParam();
    this.pan = new AudioParam(0);
    this.frequency = new AudioParam(350);
    this.Q = new AudioParam(1);
    this.playbackRate = new AudioParam();
    this.connections = [];
  }
  connect(node) {
    this.connections.push(node);
    return node;
  }
  disconnect() {
    this.disconnected = true;
  }
  start() {
    this.started = true;
  }
  stop(time = this.context.currentTime) {
    this.stopTime = time;
  }
}
export class AudioContext {
  static instances = [];
  constructor() {
    AudioContext.instances.push(this);
    this.currentTime = 0;
    this.sampleRate = 1000;
    this.destination = {};
    this.nodes = [];
    this.state = "suspended";
    this.decoded = 0;
  }
  node() {
    const node = new AudioNode(this);
    this.nodes.push(node);
    return node;
  }
  createGain() {
    return this.node();
  }
  createStereoPanner() {
    return this.node();
  }
  createBufferSource() {
    return this.node();
  }
  createBiquadFilter() {
    return this.node();
  }
  createBuffer(channels, length, rate) {
    const data = new Float32Array(length);
    return { duration: length / rate, getChannelData: () => data };
  }
  async decodeAudioData() {
    this.decoded++;
    return this.createBuffer(1, 2000, this.sampleRate);
  }
  async resume() {
    this.state = "running";
  }
  async suspend() {
    this.state = "suspended";
  }
  async close() {
    this.closeCalls = (this.closeCalls || 0) + 1;
    this.state = "closed";
  }
}
