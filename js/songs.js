// ===== Song Data & Beatmap Generator =====

const Songs = [
  {
    id: 'twinkle',
    name: '小星星',
    emoji: '⭐',
    difficulty: '★',
    bpm: 90,
    // Twinkle Twinkle Little Star - C C G G A A G | F F E E D D C
    melody: [
      // 一閃一閃亮晶晶
      {note:'C4',dur:1},{note:'C4',dur:1},{note:'G4',dur:1},{note:'G4',dur:1},
      {note:'A4',dur:1},{note:'A4',dur:1},{note:'G4',dur:2},
      // 滿天都是小星星
      {note:'F4',dur:1},{note:'F4',dur:1},{note:'E4',dur:1},{note:'E4',dur:1},
      {note:'D4',dur:1},{note:'D4',dur:1},{note:'C4',dur:2},
      // 掛在天空放光明
      {note:'G4',dur:1},{note:'G4',dur:1},{note:'F4',dur:1},{note:'F4',dur:1},
      {note:'E4',dur:1},{note:'E4',dur:1},{note:'D4',dur:2},
      // 好像許多小眼睛
      {note:'G4',dur:1},{note:'G4',dur:1},{note:'F4',dur:1},{note:'F4',dur:1},
      {note:'E4',dur:1},{note:'E4',dur:1},{note:'D4',dur:2},
      // 一閃一閃亮晶晶 (repeat)
      {note:'C4',dur:1},{note:'C4',dur:1},{note:'G4',dur:1},{note:'G4',dur:1},
      {note:'A4',dur:1},{note:'A4',dur:1},{note:'G4',dur:2},
      // 滿天都是小星星
      {note:'F4',dur:1},{note:'F4',dur:1},{note:'E4',dur:1},{note:'E4',dur:1},
      {note:'D4',dur:1},{note:'D4',dur:1},{note:'C4',dur:2},
    ]
  },
  {
    id: 'chiikawa1',
    name: '睡衣派對之歌',
    emoji: '🐹',
    difficulty: '★★',
    bpm: 112,
    mp3: 'Pajama Parties Song.mp3',
    melody: [] // not used for MP3 songs
  },
  {
    id: 'chiikawa2',
    name: '自言自語',
    emoji: '🐰',
    difficulty: '★★',
    bpm: 108,
    mp3: 'Hitorigoto.mp3',
    melody: [] // not used for MP3 songs
  },
  {
    id: 'bee',
    name: '小蜜蜂',
    emoji: '🐝',
    difficulty: '★',
    bpm: 90,
    // 小蜜蜂 - G E E- | F D D- | C D E F | G G G-
    melody: [
      // 嗡嗡嗡 嗡嗡嗡
      {note:'G4',dur:1},{note:'E4',dur:1},{note:'E4',dur:2},
      {note:'F4',dur:1},{note:'D4',dur:1},{note:'D4',dur:2},
      // 大家一起勤做工
      {note:'C4',dur:1},{note:'D4',dur:1},{note:'E4',dur:1},{note:'F4',dur:1},
      {note:'G4',dur:1},{note:'G4',dur:1},{note:'G4',dur:2},
      // 來匆匆 去匆匆
      {note:'G4',dur:1},{note:'E4',dur:1},{note:'E4',dur:2},
      {note:'F4',dur:1},{note:'D4',dur:1},{note:'D4',dur:2},
      // 做工興味濃
      {note:'C4',dur:1},{note:'E4',dur:1},{note:'G4',dur:1},{note:'G4',dur:1},
      {note:'E4',dur:1},{note:'E4',dur:1},{note:'E4',dur:2},
      // 天暖花好不做工
      {note:'D4',dur:1},{note:'D4',dur:1},{note:'D4',dur:1},{note:'D4',dur:1},
      {note:'D4',dur:1},{note:'E4',dur:1},{note:'F4',dur:2},
      // 將來哪裡好過冬
      {note:'E4',dur:1},{note:'E4',dur:1},{note:'E4',dur:1},{note:'E4',dur:1},
      {note:'E4',dur:1},{note:'F4',dur:1},{note:'G4',dur:2},
      // 嗡嗡嗡 嗡嗡嗡
      {note:'G4',dur:1},{note:'E4',dur:1},{note:'E4',dur:2},
      {note:'F4',dur:1},{note:'D4',dur:1},{note:'D4',dur:2},
      // 別學懶惰蟲
      {note:'C4',dur:1},{note:'E4',dur:1},{note:'G4',dur:1},{note:'G4',dur:1},
      {note:'C4',dur:1},{note:'C4',dur:1},{note:'C4',dur:2},
    ]
  },
  {
    id: 'tiger',
    name: '兩隻老虎',
    emoji: '🐯',
    difficulty: '★',
    bpm: 100,
    // 兩隻老虎 - C D E C | C D E C | E F G- | E F G-
    melody: [
      // 兩隻老虎 兩隻老虎
      {note:'C4',dur:1},{note:'D4',dur:1},{note:'E4',dur:1},{note:'C4',dur:1},
      {note:'C4',dur:1},{note:'D4',dur:1},{note:'E4',dur:1},{note:'C4',dur:1},
      // 跑得快 跑得快
      {note:'E4',dur:1},{note:'F4',dur:1},{note:'G4',dur:2},
      {note:'E4',dur:1},{note:'F4',dur:1},{note:'G4',dur:2},
      // 一隻沒有眼睛
      {note:'G4',dur:0.5},{note:'A4',dur:0.5},{note:'G4',dur:0.5},{note:'F4',dur:0.5},
      {note:'E4',dur:1},{note:'C4',dur:1},
      // 一隻沒有尾巴
      {note:'G4',dur:0.5},{note:'A4',dur:0.5},{note:'G4',dur:0.5},{note:'F4',dur:0.5},
      {note:'E4',dur:1},{note:'C4',dur:1},
      // 真奇怪 真奇怪
      {note:'C4',dur:1},{note:'G4',dur:1},{note:'C4',dur:2},
      {note:'C4',dur:1},{note:'G4',dur:1},{note:'C4',dur:2},
    ]
  }
];

// Generate beatmap from melody (for synth songs)
function generateBeatmap(song) {
  const beatDur = 60 / song.bpm;
  const notes = [];
  let beatOffset = 0;

  for (const item of song.melody) {
    if (item.note !== 'REST') {
      const lane = notes.length % 2;
      notes.push({
        time: beatOffset * beatDur,
        lane: lane
      });
    }
    beatOffset += item.dur;
  }

  return {
    song: song.name,
    bpm: song.bpm,
    duration: beatOffset * beatDur,
    notes: notes
  };
}

// Generate beatmap from detected beat timestamps (for MP3 songs)
// Caps at ~60 seconds of gameplay to keep it kid-friendly
function generateBeatmapFromBeats(song, beats, duration) {
  const MAX_DURATION = 65; // seconds — keep songs short and fun
  const notes = [];
  for (let i = 0; i < beats.length; i++) {
    if (beats[i] > MAX_DURATION) break;
    notes.push({
      time: beats[i],
      lane: i % 2
    });
  }
  const cappedDuration = Math.min(duration, MAX_DURATION);
  return {
    song: song.name,
    bpm: song.bpm,
    duration: cappedDuration,
    notes: notes
  };
}
