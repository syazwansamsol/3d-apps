// Procedural Web Audio API sound effects + Bahasa Melayu Web Speech TTS

let audioCtx: AudioContext | null = null;
let isMuted = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
  if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function getSoundMuted(): boolean {
  return isMuted;
}

export function playTone(
  freq: number,
  duration = 0.12,
  type: OscillatorType = 'sine',
  gainVal = 0.12,
  delay = 0
) {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const startTime = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainVal, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  } catch {
    // Ignore audio context restrictions
  }
}

export function playUiClick() {
  playTone(540, 0.06, 'triangle', 0.08);
}

export function playJumpSound() {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.16);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  } catch {}
}

export function playTokenCollectSound() {
  playTone(587.33, 0.1, 'triangle', 0.12, 0);
  playTone(880, 0.18, 'triangle', 0.14, 0.07);
}

export function playStationUnlockSound() {
  playTone(523.25, 0.12, 'sine', 0.12, 0);
  playTone(659.25, 0.12, 'sine', 0.12, 0.09);
  playTone(783.99, 0.14, 'sine', 0.14, 0.18);
  playTone(1046.5, 0.28, 'triangle', 0.15, 0.27);
}

export function playBlindBoxShakeSound() {
  playTone(320, 0.07, 'square', 0.06, 0);
  playTone(380, 0.07, 'square', 0.06, 0.12);
  playTone(440, 0.07, 'square', 0.07, 0.24);
  playTone(520, 0.08, 'square', 0.08, 0.36);
  playTone(620, 0.09, 'square', 0.09, 0.48);
}

export function playVictoryFanfare() {
  playTone(523.25, 0.14, 'triangle', 0.14, 0);
  playTone(659.25, 0.14, 'triangle', 0.14, 0.11);
  playTone(783.99, 0.14, 'triangle', 0.14, 0.22);
  playTone(1046.5, 0.35, 'triangle', 0.18, 0.33);
}

export function speakMalayText(
  text: string,
  onWordIndex?: (wordIndex: number) => void,
  onComplete?: () => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || isMuted) {
    onComplete?.();
    return () => {};
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ms-MY';
  utterance.rate = 0.92;
  utterance.pitch = 1.05;

  const voices = window.speechSynthesis.getVoices();
  const malayOrIndoVoice = voices.find(
    (v) => v.lang.toLowerCase().includes('ms') || v.lang.toLowerCase().includes('id')
  );
  if (malayOrIndoVoice) {
    utterance.voice = malayOrIndoVoice;
  }

  const words = text.split(/\s+/);
  let fallbackInterval: number | null = null;
  let currentWord = 0;

  utterance.onboundary = (event) => {
    if (event.name === 'word' && onWordIndex) {
      // Calculate approximate word index from charIndex
      const prefix = text.slice(0, event.charIndex);
      const idx = prefix.trim() ? prefix.trim().split(/\s+/).length : 0;
      onWordIndex(Math.min(words.length - 1, idx));
    }
  };

  // Fallback timer in case browser TTS doesn't fire 'word' boundary events
  if (onWordIndex) {
    onWordIndex(0);
    fallbackInterval = window.setInterval(() => {
      currentWord += 1;
      if (currentWord < words.length) {
        onWordIndex(currentWord);
      } else if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    }, 360);
  }

  utterance.onend = () => {
    if (fallbackInterval) clearInterval(fallbackInterval);
    onComplete?.();
  };

  utterance.onerror = () => {
    if (fallbackInterval) clearInterval(fallbackInterval);
    onComplete?.();
  };

  window.speechSynthesis.speak(utterance);

  return () => {
    if (fallbackInterval) clearInterval(fallbackInterval);
    window.speechSynthesis.cancel();
  };
}
