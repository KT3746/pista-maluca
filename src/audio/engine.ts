export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private squeal: OscillatorNode | null = null;
  private squealGain: GainNode | null = null;
  muted = false;
  unlocked = false;

  async unlock(): Promise<void> {
    if (this.unlocked && this.ctx?.state === "running") return;
    if (!this.ctx) this.build();
    if (!this.ctx) return;
    await this.ctx.resume();
    this.unlocked = true;
  }

  private build(): void {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.22;
    this.master.connect(this.ctx.destination);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 420;
    this.oscA = this.ctx.createOscillator();
    this.oscB = this.ctx.createOscillator();
    this.oscA.type = "sawtooth";
    this.oscB.type = "triangle";
    this.oscA.frequency.value = 70;
    this.oscB.frequency.value = 73;
    this.oscA.connect(this.filter);
    this.oscB.connect(this.filter);
    this.filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.oscA.start();
    this.oscB.start();

    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = this.ctx.createBufferSource();
    this.noise.buffer = buffer;
    this.noise.loop = true;
    this.noiseFilter = this.ctx.createBiquadFilter();
    this.noiseFilter.type = "bandpass";
    this.noiseFilter.frequency.value = 900;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.04;
    this.noise.connect(this.noiseFilter);
    this.noiseFilter.connect(ng);
    ng.connect(this.master);
    this.noise.start();

    this.squeal = this.ctx.createOscillator();
    this.squeal.type = "sawtooth";
    this.squeal.frequency.value = 380;
    this.squealGain = this.ctx.createGain();
    this.squealGain.gain.value = 0;
    const sqf = this.ctx.createBiquadFilter();
    sqf.type = "bandpass";
    sqf.frequency.value = 1100;
    this.squeal.connect(sqf);
    sqf.connect(this.squealGain);
    this.squealGain.connect(this.master);
    this.squeal.start();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.22;
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  engine(rpm: number, throttle: number, boost: boolean): void {
    if (!this.ctx || !this.oscA || !this.oscB || !this.filter || !this.engineGain) return;
    const f = 62 + rpm * 86 + (boost ? 18 : 0);
    this.oscA.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
    this.oscB.frequency.setTargetAtTime(f * 1.04, this.ctx.currentTime, 0.05);
    this.filter.frequency.setTargetAtTime(360 + throttle * 1400 + (boost ? 400 : 0), this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.02 + throttle * 0.12 + rpm * 0.05, this.ctx.currentTime, 0.06);
  }

  drift(amount: number): void {
    if (!this.ctx || !this.squealGain || !this.squeal) return;
    this.squeal.frequency.setTargetAtTime(340 + amount * 220, this.ctx.currentTime, 0.04);
    this.squealGain.gain.setTargetAtTime(amount * 0.045, this.ctx.currentTime, 0.05);
  }

  blip(freq: number, dur = 0.12, type: OscillatorType = "triangle"): void {
    if (!this.ctx || !this.master || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.02);
  }

  whoosh(): void {
    if (!this.ctx || !this.master || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.28);
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.1, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    o.connect(f);
    f.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(this.ctx.currentTime + 0.32);
  }

  finish(): void {
    this.blip(392, 0.16);
    setTimeout(() => this.blip(494, 0.16), 140);
    setTimeout(() => this.blip(588, 0.28), 280);
  }

  countdown(n: number): void {
    if (n <= 0) this.blip(660, 0.22, "square");
    else this.blip(220 + n * 40, 0.12);
  }

  item(): void {
    this.blip(520, 0.08);
    setTimeout(() => this.blip(720, 0.1), 70);
  }

  hit(): void {
    this.blip(90, 0.18, "sawtooth");
  }

  pauseHum(on: boolean): void {
    if (!this.engineGain || !this.ctx) return;
    if (on) this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
  }

  silence(): void {
    if (!this.ctx || !this.engineGain) return;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
    this.drift(0);
  }
}
