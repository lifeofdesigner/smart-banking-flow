let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const windowWithWebkit = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextClass = windowWithWebkit.AudioContext || windowWithWebkit.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {
      console.log("Audio not available");
    });
  }

  return audioContext;
};

export const playNewMessageSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const playBeep = (startTime: number, freq: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(1.0, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.15);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    };

    playBeep(ctx.currentTime, 880);
    playBeep(ctx.currentTime + 0.18, 1100);
  } catch {
    console.log("Audio not available");
  }
};

export const playTypingSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 600;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  } catch {
    console.log("Audio not available");
  }
};

export const playAgentJoinSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const playTone = (startTime: number, freq: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.2);
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.2);
    };

    playTone(ctx.currentTime, 523);
    playTone(ctx.currentTime + 0.22, 659);
    playTone(ctx.currentTime + 0.44, 784);
  } catch {
    console.log("Audio not available");
  }
};

export const playSendSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = 440;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  } catch {
    console.log("Audio not available");
  }
};
