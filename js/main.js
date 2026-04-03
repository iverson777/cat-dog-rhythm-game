// ===== Main Game Flow =====

// Page switching
function switchPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
}

// ===== Coin Page =====
let coins = 0;

function addCoin() {
  coins++;
  document.getElementById('coin-count').textContent = coins;
  document.getElementById('btn-start').disabled = coins < 1;
  AudioManager.resume();
  AudioManager.playCoin();
  const reminder = document.getElementById('sound-reminder');
  if (reminder) reminder.classList.add('hidden');

  const fly = document.createElement('span');
  fly.className = 'coin-fly';
  fly.textContent = '🪙';
  fly.style.left = '50%';
  fly.style.top = '50%';
  document.body.appendChild(fly);
  setTimeout(() => fly.remove(), 500);
}

document.getElementById('btn-make-coin').addEventListener('click', addCoin);

document.getElementById('btn-start').addEventListener('click', () => {
  if (coins < 1) return;
  coins--;
  document.getElementById('coin-count').textContent = coins;
  document.getElementById('btn-start').disabled = coins < 1;
  initSelectPage();
  switchPage('select-page');
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && document.getElementById('coin-page').classList.contains('active')) {
    e.preventDefault();
    addCoin();
  }
  if (e.code === 'Enter' && document.getElementById('coin-page').classList.contains('active')) {
    e.preventDefault();
    document.getElementById('btn-start').click();
  }
});

// ===== Song Select Page =====
let selectedIndex = 0;

function initSelectPage() {
  selectedIndex = 0;
  renderSongCarousel();
  AudioManager.playPreview(Songs[selectedIndex]);
}

function renderSongCarousel() {
  const container = document.getElementById('song-carousel');
  container.innerHTML = '';

  Songs.forEach((song, i) => {
    const card = document.createElement('div');
    card.className = 'song-card' + (i === selectedIndex ? ' selected' : '');
    card.innerHTML = `
      <div class="song-emoji">${song.emoji}</div>
      <div class="song-name">${song.name}</div>
      <div class="song-difficulty">${song.difficulty}</div>
    `;
    card.addEventListener('click', () => {
      selectedIndex = i;
      renderSongCarousel();
      AudioManager.playPreview(Songs[selectedIndex]);
    });
    container.appendChild(card);
  });

  // Center the selected card
  // Each card is 180px wide + 20px gap = 200px per card
  // Offset so selected card lands in the middle of the wrapper
  requestAnimationFrame(() => {
    const wrapper = document.querySelector('.song-carousel-wrapper');
    const wrapperWidth = wrapper.offsetWidth;
    const cardWidth = 200; // 180px card + 20px gap
    const selectedCardCenter = selectedIndex * cardWidth + 90; // center of selected card
    const offset = (wrapperWidth / 2) - selectedCardCenter;
    container.style.transform = `translateX(${offset}px)`;
  });
}

function selectMove(dir) {
  selectedIndex = (selectedIndex + dir + Songs.length) % Songs.length;
  renderSongCarousel();
  AudioManager.playPreview(Songs[selectedIndex]);
}

document.getElementById('btn-song-prev').addEventListener('click', () => selectMove(-1));
document.getElementById('btn-song-next').addEventListener('click', () => selectMove(1));
document.getElementById('btn-confirm-song').addEventListener('click', () => {
  AudioManager.stopPreview();
  startGameWithSong(Songs[selectedIndex]);
});

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('select-page').classList.contains('active')) return;

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    selectMove(-1);
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    selectMove(1);
  } else if (e.code === 'Enter') {
    e.preventDefault();
    AudioManager.stopPreview();
    startGameWithSong(Songs[selectedIndex]);
  }
});

// Swipe support for song carousel
(function() {
  const wrapper = document.querySelector('.song-carousel-wrapper');
  let touchStartX = 0;
  wrapper.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  });
  wrapper.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      selectMove(dx > 0 ? -1 : 1);
    }
  });
})();

// ===== Game =====
let currentSong = null;

async function startGameWithSong(song) {
  currentSong = song;
  switchPage('game-page');

  // For MP3 songs, show loading while detecting beats
  const overlay = document.getElementById('countdown-overlay');
  const text = document.getElementById('countdown-text');
  if (song.mp3) {
    overlay.classList.add('show');
    text.textContent = '分析節奏中...';
  }

  await GameEngine.init(song);

  // Start notes falling immediately during countdown
  GameEngine.startFalling();

  // Countdown overlay
  overlay.classList.add('show');

  let count = 3;
  text.textContent = count;
  AudioManager.playCountdown(false);

  const countInterval = setInterval(() => {
    count--;
    if (count > 0) {
      text.textContent = count;
      text.style.animation = 'none';
      void text.offsetWidth;
      text.style.animation = '';
      AudioManager.playCountdown(false);
    } else if (count === 0) {
      text.textContent = 'GO!';
      text.style.animation = 'none';
      void text.offsetWidth;
      text.style.animation = '';
      AudioManager.playCountdown(true);
    } else {
      clearInterval(countInterval);
      overlay.classList.remove('show');
      // Now start music and enable hitting
      GameEngine.startMusic();
    }
  }, 800);
}

// Quit button — exit game and go back to song select
document.getElementById('btn-quit').addEventListener('click', () => {
  GameEngine.stop();
  SpriteManager.stopAll();
  initSelectPage();
  switchPage('select-page');
});

// Game key handling — Left/Right arrow keys
document.addEventListener('keydown', (e) => {
  if (!document.getElementById('game-page').classList.contains('active')) return;

  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    GameEngine.handleKey(0); // Cat lane
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    GameEngine.handleKey(1); // Dog lane
  }
});

// Touch controls for mobile
document.getElementById('touch-left').addEventListener('touchstart', (e) => {
  e.preventDefault();
  AudioManager.resume();
  GameEngine.handleKey(0);
});
document.getElementById('touch-right').addEventListener('touchstart', (e) => {
  e.preventDefault();
  AudioManager.resume();
  GameEngine.handleKey(1);
});

// ===== Result Page =====
document.getElementById('btn-retry').addEventListener('click', () => {
  if (currentSong) {
    startGameWithSong(currentSong);
  }
});

document.getElementById('btn-back-select').addEventListener('click', () => {
  initSelectPage();
  switchPage('select-page');
});

document.addEventListener('keydown', (e) => {
  if (!document.getElementById('result-page').classList.contains('active')) return;

  if (e.code === 'Enter') {
    e.preventDefault();
    initSelectPage();
    switchPage('select-page');
  }
});

// ===== Mobile: disable pinch zoom & double-tap zoom =====
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// ===== Mobile: move characters out of flex layout =====
(function() {
  if (window.innerWidth > 768) return;
  const gamePage = document.getElementById('game-page');
  const cat = document.getElementById('char-cat');
  const dog = document.getElementById('char-dog');
  if (cat && gamePage) {
    gamePage.appendChild(cat);
    cat.classList.add('mobile-moved');
  }
  if (dog && gamePage) {
    gamePage.appendChild(dog);
    dog.classList.add('mobile-moved');
  }
})();
