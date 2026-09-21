// Procedural Web Audio API Sound Generator
// Zero external assets required! 100% reliable and instantaneous.

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[Audio] Init ignored:', e.message);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  // 1. Water balloon throw whoosh (휙!)
  playThrow() {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, t);

      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.36);
    } catch (e) {}
  }

  // 2. Water balloon hit & splash explosion (펑! 콰광!)
  playSplash(isCritical = false) {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const duration = isCritical ? 0.6 : 0.45;

      // White noise for water splash
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(isCritical ? 1400 : 900, t);
      noiseFilter.frequency.exponentialRampToValueAtTime(200, t + duration);
      noiseFilter.Q.setValueAtTime(2, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(isCritical ? 0.9 : 0.65, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);

      // Deep sub-bass punch impact
      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(isCritical ? 180 : 130, t);
      punchOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);

      punchGain.gain.setValueAtTime(isCritical ? 0.8 : 0.5, t);
      punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      punchOsc.connect(punchGain);
      punchGain.connect(this.ctx.destination);

      noise.start(t);
      punchOsc.start(t);
      punchOsc.stop(t + 0.31);
    } catch (e) {}
  }

  // 3. Ding-Dong Correct Sound (딩동댕!)
  playCorrect() {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const t = this.ctx.currentTime;

      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);

        gain.gain.setValueAtTime(0.001, t + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.3, t + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.45);
      });
    } catch (e) {}
  }

  // 4. Buzzer Wrong Sound (삐-익!)
  playWrong() {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';

      osc1.frequency.setValueAtTime(140, t);
      osc2.frequency.setValueAtTime(147, t); // dissonant dissonance

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.36);
      osc2.stop(t + 0.36);
    } catch (e) {}
  }

  // 5. Timer tick
  playTick() {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // 6. Match Victory Fanfare
  playVictory() {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const chords = [
        { notes: [523.25, 659.25], time: 0, dur: 0.18 },
        { notes: [523.25, 659.25], time: 0.2, dur: 0.18 },
        { notes: [523.25, 659.25], time: 0.4, dur: 0.18 },
        { notes: [659.25, 783.99, 1046.50], time: 0.65, dur: 0.8 }
      ];

      chords.forEach(c => {
        c.notes.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t + c.time);

          gain.gain.setValueAtTime(0.01, t + c.time);
          gain.gain.linearRampToValueAtTime(0.25, t + c.time + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t + c.time);
          osc.stop(t + c.time + c.dur + 0.05);
        });
      });
    } catch (e) {}
  }

  // 7. Defeat Sad sound
  playDefeat() {
    try {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [440, 415.3, 392, 349.2];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t + i * 0.25);

        gain.gain.setValueAtTime(0.18, t + i * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + i * 0.25);
        osc.stop(t + i * 0.25 + 0.3);
      });
    } catch (e) {}
  }
}

window.soundFX = new SoundFX();
