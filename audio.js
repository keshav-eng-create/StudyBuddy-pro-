// Web Audio API sound generator for sound effects and ambient study sounds
// Works 100% offline without external audio files!

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.ambientNodes = {};
    this.soundEnabled = true;
    this.ambientType = 'none'; // 'none', 'rain', 'whitenoise', 'binaural', 'stream'
    this.ambientGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play a pleasant chime for timer completion
  playTimerBell() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 2.0);
    });
  }

  // Soft click / tick sound
  playClick() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  // Card flip whoosh
  playCardFlip() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  // Quiz correct fanfare
  playSuccess() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880]; // D5, F#5, A5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.7);
    });
  }

  // Quiz wrong buzz
  playError() {
    if (!this.soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // Ambient sound player (Synthesizes Rain, Pink Noise, Binaural Beats, Forest Stream)
  setAmbientSound(type, volume = 0.5) {
    this.init();
    if (!this.ctx) return;

    this.stopAmbientSound();
    this.ambientType = type;

    if (type === 'none') return;

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(volume * 0.15, this.ctx.currentTime);
    this.ambientGain.connect(this.ctx.destination);

    if (type === 'whitenoise' || type === 'rain') {
      // Noise buffer (5 seconds looped)
      const bufferSize = this.ctx.sampleRate * 5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
          // Pink/brownish noise filtered for soothing rain
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        } else {
          // Gentle white/pink noise
          lastOut = (lastOut + 0.05 * white) / 1.05;
          data[i] = lastOut * 2.5;
        }
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 800 : 650, this.ctx.currentTime);
      filter.Q.setValueAtTime(type === 'rain' ? 1.0 : 0.5, this.ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(this.ambientGain);
      noiseSource.start();

      this.ambientNodes.source = noiseSource;
      this.ambientNodes.filter = filter;
    } else if (type === 'binaural') {
      // 40Hz Gamma wave / Alpha wave binaural carrier: 200Hz left, 214Hz right
      const oscL = this.ctx.createOscillator();
      const oscR = this.ctx.createOscillator();
      const merger = this.ctx.createChannelMerger(2);

      oscL.type = 'sine';
      oscL.frequency.setValueAtTime(210, this.ctx.currentTime);

      oscR.type = 'sine';
      oscR.frequency.setValueAtTime(224, this.ctx.currentTime); // 14Hz Alpha focus

      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);
      merger.connect(this.ambientGain);

      oscL.start();
      oscR.start();

      this.ambientNodes.oscL = oscL;
      this.ambientNodes.oscR = oscR;
    }
  }

  setAmbientVolume(vol) {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
    }
  }

  stopAmbientSound() {
    if (this.ambientNodes.source) {
      try { this.ambientNodes.source.stop(); } catch (e) {}
    }
    if (this.ambientNodes.oscL) {
      try { this.ambientNodes.oscL.stop(); } catch (e) {}
    }
    if (this.ambientNodes.oscR) {
      try { this.ambientNodes.oscR.stop(); } catch (e) {}
    }
    this.ambientNodes = {};
    this.ambientType = 'none';
  }
}

window.soundEngine = new SoundEngine();
