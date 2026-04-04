// ===== Game Engine =====

const GameEngine = (() => {
  // Config
  const HIT_LINE_BOTTOM = 60; // px from bottom (matches CSS)
  const NOTE_TRAVEL_TIME = 2.5; // seconds for note to travel from top to hit line
  const JUDGE_PERFECT = 50;  // ms
  const JUDGE_GREAT = 100;
  const JUDGE_GOOD = 150;
  const COUNTDOWN_DURATION = 3.2; // seconds of countdown before music starts
  const FIRST_NOTE_DELAY = 1.5; // seconds after GO before first note reaches hit line

  // State
  let beatmap = null;
  let songData = null;
  let melodyPlayer = null;
  let startTime = 0; // when notes start falling (countdown begin)
  let musicStartTime = 0; // when music actually starts (after countdown)
  let gameRunning = false;
  let canHit = false; // can player hit notes?
  let animFrameId = null;

  // Notes state
  let activeNotes = []; // { time, lane, el, judged }

  // Score state
  let score = 0;
  let combo = 0;
  let maxCombo = 0;
  let counts = { perfect: 0, great: 0, good: 0, miss: 0 };

  async function init(song) {
    songData = song;
    score = 0;
    combo = 0;
    maxCombo = 0;
    counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    activeNotes = [];
    gameRunning = false;
    canHit = false;
    melodyPlayer = null;

    // Generate beatmap: detect beats from MP3 or use melody
    if (song.mp3) {
      const result = await AudioManager.detectBeats(song.mp3);
      beatmap = generateBeatmapFromBeats(song, result.beats, result.duration);
    } else {
      beatmap = generateBeatmap(song);
    }

    // Update HUD
    document.getElementById('hud-song-name').textContent = song.name;
    document.getElementById('hud-score').textContent = '0';
    document.getElementById('hud-combo').textContent = '';
    document.getElementById('hud-time').textContent = '0:00 / ' + formatTime(beatmap.duration);

    // Clear lanes
    for (let i = 0; i < 2; i++) {
      const lane = document.getElementById('lane-' + i);
      lane.querySelectorAll('.note').forEach(n => n.remove());
    }

    // Start sprite idle animations
    SpriteManager.startAll();
  }

  // Start notes falling immediately (during countdown).
  // Music and hit detection begin after COUNTDOWN_DURATION.
  function startFalling() {
    gameRunning = true;
    canHit = false;
    startTime = performance.now() / 1000;

    // Create all note elements.
    // Note times are relative to music start (= startTime + COUNTDOWN_DURATION).
    for (let i = 0; i < beatmap.notes.length; i++) {
      const n = beatmap.notes[i];
      const el = document.createElement('div');
      el.className = 'note ' + (n.lane === 0 ? 'lane-cat' : 'lane-dog');
      el.style.top = '-30px';
      document.getElementById('lane-' + n.lane).appendChild(el);
      activeNotes.push({ ...n, time: n.time + FIRST_NOTE_DELAY, el, judged: false });
    }

    update();
  }

  // Called when countdown finishes — start music and enable hitting.
  function startMusic() {
    musicStartTime = performance.now() / 1000;
    canHit = true;
    if (songData.mp3) {
      melodyPlayer = AudioManager.playMP3(songData.mp3, FIRST_NOTE_DELAY);
    } else {
      melodyPlayer = AudioManager.playMelody(songData.melody, songData.bpm, FIRST_NOTE_DELAY);
    }
  }

  function update() {
    if (!gameRunning) return;

    const now = performance.now() / 1000;
    // Elapsed since music start (can be negative during countdown)
    const musicElapsed = now - startTime - COUNTDOWN_DURATION;

    // Update time display (clamp to 0)
    if (musicElapsed >= 0) {
      document.getElementById('hud-time').textContent =
        formatTime(Math.min(musicElapsed, beatmap.duration)) + ' / ' + formatTime(beatmap.duration);
    }

    // Update note positions
    const laneEls = [document.getElementById('lane-0'), document.getElementById('lane-1')];

    for (const note of activeNotes) {
      if (note.judged) continue;

      const laneHeight = laneEls[note.lane].offsetHeight;
      const hitLineY = laneHeight - HIT_LINE_BOTTOM;

      // Time until note should be at hit line (relative to music time)
      const timeDiff = note.time - musicElapsed;
      const progress = 1 - (timeDiff / NOTE_TRAVEL_TIME);
      const y = progress * hitLineY;

      note.el.style.top = y + 'px';

      // Auto-miss: note passed too far below (only after music started)
      if (canHit && timeDiff < -0.18) {
        note.judged = true;
        note.el.style.display = 'none';
        counts.miss++;
        combo = 0;
        updateCombo();
      }
    }

    // Check if song is over
    if (canHit) {
      const allDone = activeNotes.every(n => n.judged);
      if (allDone || musicElapsed > beatmap.duration + FIRST_NOTE_DELAY + 1) {
        endGame();
        return;
      }
    }

    animFrameId = requestAnimationFrame(update);
  }

  function handleKey(lane) {
    if (!gameRunning || !canHit) return;

    const now = performance.now() / 1000;
    const musicElapsed = now - startTime - COUNTDOWN_DURATION;

    // Flash key indicator
    const keyEl = document.getElementById('lane-' + lane).querySelector('.key-indicator');
    keyEl.classList.add('pressed');
    setTimeout(() => keyEl.classList.remove('pressed'), 100);

    // Find closest unjudged note in this lane
    let closest = null;
    let closestDiff = Infinity;

    for (const note of activeNotes) {
      if (note.judged || note.lane !== lane) continue;
      const diff = Math.abs(note.time - musicElapsed) * 1000; // to ms
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = note;
      }
    }

    if (!closest || closestDiff > JUDGE_GOOD) return;

    // Judge
    let judgeType;
    if (closestDiff <= JUDGE_PERFECT) {
      judgeType = 'perfect';
      score += 100;
    } else if (closestDiff <= JUDGE_GREAT) {
      judgeType = 'great';
      score += 70;
    } else {
      judgeType = 'good';
      score += 40;
    }

    // Combo multiplier
    combo++;
    if (combo >= 50) score += Math.floor(score * 0.02);
    else if (combo >= 30) score += Math.floor(score * 0.01);
    else if (combo >= 10) score += Math.floor(score * 0.005);

    if (combo > maxCombo) maxCombo = combo;
    counts[judgeType]++;

    // Mark note as hit
    closest.judged = true;
    closest.el.classList.add('hit');
    setTimeout(() => { if (closest.el.parentNode) closest.el.remove(); }, 300);

    // Audio
    AudioManager.playHit(judgeType);

    // Show judge text
    showJudge(lane, judgeType);

    // Hit feedback effects
    hitFeedback(lane, judgeType);

    // Character reaction
    reactCharacter(lane, judgeType);

    // Update HUD
    document.getElementById('hud-score').textContent = score;
    updateCombo();
  }

  function hitFeedback(lane, type) {
    const laneEl = document.getElementById('lane-' + lane);

    // Lane flash
    const flash = document.createElement('div');
    flash.className = 'lane-flash ' + (lane === 0 ? 'flash-cat' : 'flash-dog');
    laneEl.appendChild(flash);
    setTimeout(() => flash.remove(), 300);

    // Hit line pulse
    const hitLine = laneEl.querySelector('.hit-line');
    hitLine.classList.remove('pulse');
    void hitLine.offsetWidth;
    hitLine.classList.add('pulse');
    setTimeout(() => hitLine.classList.remove('pulse'), 300);

    // Screen shake on Perfect
    if (type === 'perfect') {
      const area = document.querySelector('.game-area');
      area.classList.remove('shake');
      void area.offsetWidth;
      area.classList.add('shake');
      setTimeout(() => area.classList.remove('shake'), 150);
    }
  }

  function showJudge(lane, type) {
    const el = document.getElementById('judge-' + lane);
    el.textContent = type.charAt(0).toUpperCase() + type.slice(1);
    el.className = 'judge-text ' + type + ' show';
    el.addEventListener('animationend', () => {
      el.className = 'judge-text';
    }, { once: true });
  }

  function reactCharacter(lane, type) {
    const char = lane === 0 ? 'cat' : 'dog';
    SpriteManager.playReaction(char, type);
  }

  function updateCombo() {
    const el = document.getElementById('hud-combo');
    if (combo >= 3) {
      el.textContent = combo + ' COMBO';
      el.classList.remove('combo-pop');
      void el.offsetWidth;
      el.classList.add('combo-pop');
    } else {
      el.textContent = '';
    }
  }

  function endGame() {
    gameRunning = false;
    canHit = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (melodyPlayer) melodyPlayer.stop();
    SpriteManager.stopAll();

    setTimeout(() => {
      showResults();
    }, 500);
  }

  function showResults() {
    const total = counts.perfect + counts.great + counts.good + counts.miss;
    const perfectRate = total > 0 ? counts.perfect / total : 0;
    const goodRate = total > 0 ? (counts.perfect + counts.great) / total : 0;

    let grade = 'C';
    if (perfectRate >= 0.9) grade = 'S';
    else if (goodRate >= 0.8) grade = 'A';
    else if (goodRate >= 0.6) grade = 'B';

    document.getElementById('result-song').textContent = songData.name;
    document.getElementById('result-grade').textContent = grade;
    document.getElementById('result-score-num').textContent = score.toLocaleString();
    document.getElementById('result-perfect').textContent = counts.perfect;
    document.getElementById('result-great').textContent = counts.great;
    document.getElementById('result-good').textContent = counts.good;
    document.getElementById('result-max-combo').textContent = maxCombo;

    // Check if score qualifies for leaderboard
    const qualifies = isTopScore(songData.id, score);
    if (qualifies) {
      showNameInput(songData.id, score, grade);
    } else {
      saveScore(songData.id, score, grade, '---');
      renderLeaderboard(songData.id);
    }

    switchPage('result-page');
  }

  // ===== Leaderboard (localStorage) =====
  function getLeaderboard(songId) {
    try {
      return JSON.parse(localStorage.getItem('lb_' + songId)) || [];
    } catch(e) { return []; }
  }

  function isTopScore(songId, newScore) {
    const lb = getLeaderboard(songId);
    if (lb.length < 10) return true;
    return newScore > lb[lb.length - 1].score;
  }

  function saveScore(songId, score, grade, name) {
    const lb = getLeaderboard(songId);
    const now = new Date();
    const dateStr = (now.getMonth()+1) + '/' + now.getDate() + ' ' +
      now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0');
    lb.push({ score, grade, date: dateStr, name: name || '---' });
    lb.sort((a, b) => b.score - a.score);
    if (lb.length > 10) lb.length = 10;
    localStorage.setItem('lb_' + songId, JSON.stringify(lb));
  }

  function showNameInput(songId, newScore, grade) {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    container.innerHTML = '';

    const prompt = document.createElement('div');
    prompt.className = 'lb-name-prompt';
    prompt.innerHTML = `
      <div class="lb-congrats">🎉 恭喜上榜！</div>
      <div class="lb-name-form">
        <input type="text" id="lb-name-input" class="lb-name-input" placeholder="輸入你的名字" maxlength="8" autocomplete="off">
        <button id="lb-name-submit" class="btn btn-confirm lb-name-btn">確認</button>
      </div>
    `;
    container.appendChild(prompt);

    const input = document.getElementById('lb-name-input');
    const submitBtn = document.getElementById('lb-name-submit');
    input.focus();

    function submit() {
      const name = input.value.trim() || '???';
      saveScore(songId, newScore, grade, name);
      renderLeaderboard(songId);
    }

    submitBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') submit();
    });
  }

  function renderLeaderboard(songId) {
    const lb = getLeaderboard(songId);
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    container.innerHTML = '';
    if (lb.length === 0) {
      container.innerHTML = '<div class="lb-empty">還沒有紀錄</div>';
      return;
    }
    lb.forEach((entry, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (entry.score === score ? ' lb-current' : '');
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1);
      row.innerHTML = `
        <span class="lb-rank">${medal}</span>
        <span class="lb-name">${entry.name || '---'}</span>
        <span class="lb-score">${entry.score.toLocaleString()}</span>
        <span class="lb-grade">${entry.grade}</span>
      `;
      container.appendChild(row);
    });
  }

  function stop() {
    gameRunning = false;
    canHit = false;
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (melodyPlayer) melodyPlayer.stop();
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  return { init, startFalling, startMusic, handleKey, stop };
})();
