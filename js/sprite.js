// ===== Sprite Animation System =====

const SpriteManager = (() => {
  const FRAME_COUNT = 8;
  const FRAME_INTERVAL = 120; // ms per frame

  // Frame paths
  const SPRITES = {
    cat: {
      sway:     i => `cat_A_frames/catA_sway_F0${i}.png`,
      nod:      i => `cat_A_frames/catA_nod_F0${i}.png`,
      thumbsup: i => `cat_A_frames/catA_thumbsup_F0${i}.png`,
    },
    dog: {
      sway:     i => `cat_B_frames/catB_sway_F0${i}.png`,
      nod:      i => `cat_B_frames/catB_nod_F0${i}.png`,
      thumbsup: i => `cat_B_frames/catB_thumbsup_F0${i}.png`,
    }
  };

  // State per character
  const state = {
    cat: { anim: 'sway', frame: 1, timer: null, reacting: false },
    dog: { anim: 'sway', frame: 1, timer: null, reacting: false },
  };

  // Preload all images
  function preload() {
    for (const char of ['cat', 'dog']) {
      for (const anim of ['sway', 'nod', 'thumbsup']) {
        for (let i = 1; i <= FRAME_COUNT; i++) {
          const img = new Image();
          img.src = SPRITES[char][anim](i);
        }
      }
    }
  }

  function getEl(char) {
    return document.getElementById('sprite-' + char);
  }

  function getEffectEl(char) {
    return document.getElementById('effect-' + char);
  }

  // Start idle (sway) animation loop for a character
  function startIdle(char) {
    stopAnim(char);
    state[char].anim = 'sway';
    state[char].frame = 1;
    state[char].reacting = false;
    loopAnim(char, true);
  }

  // Play a one-shot reaction animation, then return to idle
  function playReaction(char, type) {
    // type: 'perfect', 'great', 'good'
    const anim = type === 'perfect' ? 'thumbsup' : 'nod';

    stopAnim(char);
    state[char].anim = anim;
    state[char].frame = 1;
    state[char].reacting = true;

    // Bounce the sprite
    const spriteEl = getEl(char);
    if (spriteEl) {
      spriteEl.classList.remove('bounce');
      void spriteEl.offsetWidth;
      spriteEl.classList.add('bounce');
      setTimeout(() => spriteEl.classList.remove('bounce'), 400);
    }

    // Show particle effects
    showEffect(char, type);

    // Play through once, then back to idle
    loopAnim(char, false);
  }

  function loopAnim(char, loop) {
    const s = state[char];
    const el = getEl(char);
    if (!el) return;

    el.src = SPRITES[char][s.anim](s.frame);

    s.timer = setInterval(() => {
      s.frame++;
      if (s.frame > FRAME_COUNT) {
        if (loop) {
          s.frame = 1;
        } else {
          // One-shot done, return to idle
          clearInterval(s.timer);
          s.timer = null;
          startIdle(char);
          return;
        }
      }
      el.src = SPRITES[char][s.anim](s.frame);
    }, FRAME_INTERVAL);
  }

  function stopAnim(char) {
    if (state[char].timer) {
      clearInterval(state[char].timer);
      state[char].timer = null;
    }
  }

  function showEffect(char, type) {
    // Get character element as anchor for particles
    const charEl = document.getElementById('char-' + char);
    if (!charEl) return;

    // Choose emojis and particle count based on judge type
    let emojis, count;
    if (type === 'perfect') {
      emojis = char === 'cat' ? ['👍','⭐','🌟','✨','💛'] : ['❤️','💖','💕','💗','✨'];
      count = 8;
    } else if (type === 'great') {
      emojis = ['✨','⭐','💫','🌟'];
      count = 5;
    } else {
      emojis = ['✨','💫'];
      count = 3;
    }

    // Spawn particles
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'particle';
      p.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      // Random direction and distance
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const dist = 40 + Math.random() * 60;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 30; // bias upward
      const delay = Math.random() * 100;
      const size = 0.8 + Math.random() * 0.8;

      p.style.cssText = `
        --dx: ${dx}px;
        --dy: ${dy}px;
        --size: ${size};
        animation-delay: ${delay}ms;
      `;

      charEl.appendChild(p);
      setTimeout(() => p.remove(), 800 + delay);
    }
  }

  // Start both characters idle
  function startAll() {
    preload();
    startIdle('cat');
    startIdle('dog');
  }

  // Stop all animations
  function stopAll() {
    stopAnim('cat');
    stopAnim('dog');
  }

  return { startAll, stopAll, startIdle, playReaction, preload };
})();
