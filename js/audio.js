// ===== Audio Manager =====
// Supports both synth melodies and MP3 playback with beat detection

const AudioManager = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
  }

  // Play a punchy hit sound
  function playHit(type) {
    resume();
    const c = getCtx();

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    if (type === 'perfect') {
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.2);
    } else if (type === 'great') {
      osc.frequency.value = 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.15);
    } else {
      osc.frequency.value = 440;
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.25, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
      osc.start(c.currentTime);
      osc.stop(c.currentTime + 0.12);
    }

    const noise = c.createOscillator();
    const noiseGain = c.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(c.destination);
    noise.type = 'square';
    noise.frequency.value = type === 'perfect' ? 1200 : 800;
    noiseGain.gain.setValueAtTime(0.15, c.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
    noise.start(c.currentTime);
    noise.stop(c.currentTime + 0.04);
  }

  function playCoin() {
    resume();
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.3);
  }

  function playCountdown(isGo) {
    resume();
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'square';
    osc.frequency.value = isGo ? 880 : 440;
    gain.gain.setValueAtTime(0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.2);
  }

  // Play synth melody (for non-MP3 songs)
  function playMelody(melody, bpm, delay) {
    delay = delay || 0;
    resume();
    const c = getCtx();
    const beatDur = 60 / bpm;
    let oscillators = [];
    let stopped = false;

    const noteFreq = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
      'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99,
      'A5': 880.00, 'B5': 987.77, 'C6': 1046.50,
      'REST': 0
    };

    let beatOffset = 0;
    const startTime = c.currentTime + 0.05 + delay;

    for (const item of melody) {
      const freq = noteFreq[item.note] || 0;
      const dur = item.dur * beatDur;

      if (freq > 0 && !stopped) {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.connect(gain);
        gain.connect(c.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;

        const noteStart = startTime + beatOffset;
        const noteEnd = noteStart + dur * 0.9;

        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.02);
        gain.gain.setValueAtTime(0.18, noteEnd - 0.02);
        gain.gain.linearRampToValueAtTime(0, noteEnd);

        osc.start(noteStart);
        osc.stop(noteEnd + 0.01);
        oscillators.push(osc);
      }

      beatOffset += dur;
    }

    return {
      duration: beatOffset,
      stop() {
        stopped = true;
        oscillators.forEach(o => { try { o.stop(); } catch(e) {} });
        oscillators = [];
      }
    };
  }

  // ===== MP3 Playback =====
  let currentAudio = null;

  function playMP3(src, delay) {
    delay = delay || 0;
    resume();
    const audio = new Audio(src);
    audio.volume = 0.8;
    currentAudio = audio;

    if (delay > 0) {
      setTimeout(() => {
        if (currentAudio === audio) audio.play();
      }, delay * 1000);
    } else {
      audio.play();
    }

    return {
      duration: 0, // will be determined by audio
      stop() {
        audio.pause();
        audio.currentTime = 0;
        if (currentAudio === audio) currentAudio = null;
      }
    };
  }

  // ===== Beat Detection =====
  // Analyzes an MP3 file and returns an array of beat timestamps (in seconds)
  async function detectBeats(src) {
    resume();
    const c = getCtx();

    // Fetch and decode the audio
    const response = await fetch(src);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await c.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    const rawData = audioBuffer.getChannelData(0); // mono

    // Downsample for analysis: take energy in windows
    const windowSize = Math.floor(sampleRate * 0.02); // 20ms windows
    const hopSize = Math.floor(sampleRate * 0.01);    // 10ms hop
    const energies = [];

    for (let i = 0; i < rawData.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += rawData[i + j] * rawData[i + j];
      }
      energies.push(sum / windowSize);
    }

    // Onset detection: find peaks in the energy difference
    const beats = [];
    const smoothWindow = 10;
    const threshold = 1.5; // must be this many times above local average
    const minGap = 0.2;   // minimum gap between beats (seconds)
    const minGapFrames = Math.floor(minGap / 0.01);

    let lastBeatIdx = -minGapFrames;

    for (let i = smoothWindow; i < energies.length - 1; i++) {
      // Local average energy
      let localAvg = 0;
      for (let j = i - smoothWindow; j < i; j++) {
        localAvg += energies[j];
      }
      localAvg /= smoothWindow;

      // Is this a peak?
      if (energies[i] > localAvg * threshold &&
          energies[i] > energies[i - 1] &&
          energies[i] >= energies[i + 1] &&
          (i - lastBeatIdx) >= minGapFrames) {
        const timeSec = i * 0.01;
        beats.push(timeSec);
        lastBeatIdx = i;
      }
    }

    return {
      beats: beats,
      duration: audioBuffer.duration
    };
  }

  return { playHit, playCoin, playCountdown, playMelody, playMP3, detectBeats, resume, getCtx };
})();
