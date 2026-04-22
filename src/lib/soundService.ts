/**
 * Sound Service for Mafia Noir
 * Uses Web Audio API for synthetic sounds or external assets
 */

class SoundService {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playRoleReveal() {
    this.playTone(220, 'sawtooth', 0.5, 0.1);
    setTimeout(() => this.playTone(440, 'sawtooth', 0.8, 0.1), 100);
  }

  playNightTransition() {
    this.playTone(110, 'sine', 1.5, 0.2);
  }

  playDayTransition() {
    this.playTone(550, 'sine', 1.0, 0.1);
  }

  playActionSuccess() {
    this.playTone(880, 'triangle', 0.2, 0.1);
  }

  playKillSuccess() {
    this.playTone(150, 'sawtooth', 0.4, 0.15);
    setTimeout(() => this.playTone(100, 'sawtooth', 0.6, 0.1), 200);
  }

  playSaveSuccess() {
    this.playTone(660, 'sine', 0.2, 0.1);
    setTimeout(() => this.playTone(880, 'sine', 0.4, 0.1), 100);
  }

  playInvestigationSuccess() {
    this.playTone(440, 'triangle', 0.1, 0.1);
    this.playTone(550, 'triangle', 0.1, 0.1);
    this.playTone(660, 'triangle', 0.1, 0.1);
  }

  playVoteCast() {
    this.playTone(330, 'square', 0.05, 0.05);
  }

  playElimination() {
    this.playTone(150, 'sawtooth', 1.0, 0.15);
    this.playTone(75, 'sawtooth', 1.0, 0.15);
  }
}

export const soundService = new SoundService();
