(() => {
  const RELEASE_SECONDS = 0.08;
  let audioContext;
  let activeNodes = [];

  const midiToFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

  const getAudioContext = async () => {
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio is not supported in this browser.');
      }

      audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    return audioContext;
  };

  const releaseNode = (entry) => {
    entry.oscillator.disconnect();
    entry.gainNode.disconnect();
    activeNodes = activeNodes.filter((node) => node !== entry);
  };

  const registerNode = (entry) => {
    entry.oscillator.onended = () => releaseNode(entry);
    activeNodes.push(entry);
  };

  const stopAll = () => {
    if (!audioContext) {
      return;
    }

    const stopAt = audioContext.currentTime + 0.01;

    [...activeNodes].forEach((entry) => {
      try {
        entry.gainNode.gain.cancelScheduledValues(stopAt);
        entry.gainNode.gain.setValueAtTime(Math.max(entry.gainNode.gain.value, 0.0001), stopAt);
        entry.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt + RELEASE_SECONDS);
        entry.oscillator.stop(stopAt + RELEASE_SECONDS);
      } catch (error) {
        releaseNode(entry);
      }
    });
  };

  const playChord = async (midis, options = {}) => {
    const context = await getAudioContext();
    const notes = Array.isArray(midis) ? midis.filter((midi) => Number.isFinite(midi)) : [];

    if (notes.length === 0) {
      return 0;
    }

    const startTime = context.currentTime + 0.02;
    const duration = Math.max(options.duration ?? 0.42, 0.08);
    const attack = Math.max(options.attack ?? 0.01, 0.001);
    const release = Math.max(options.release ?? RELEASE_SECONDS, 0.02);
    const voiceLevel = (options.volume ?? 0.16) / notes.length;

    notes.forEach((midi) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const attackEnd = startTime + attack;
      const releaseStart = Math.max(startTime + duration - release, attackEnd + 0.01);
      const stopAt = releaseStart + release;
      const entry = { oscillator, gainNode };

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(midiToFrequency(midi), startTime);

      gainNode.gain.setValueAtTime(0.0001, startTime);
      gainNode.gain.linearRampToValueAtTime(voiceLevel, attackEnd);
      gainNode.gain.exponentialRampToValueAtTime(Math.max(voiceLevel * 0.55, 0.0001), releaseStart);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, stopAt);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(startTime);
      oscillator.stop(stopAt);
      registerNode(entry);
    });

    return duration + release + 0.02;
  };

  window.LickAudio = {
    RELEASE_SECONDS,
    getAudioContext,
    midiToFrequency,
    playChord,
    registerNode,
    stopAll,
  };
})();
