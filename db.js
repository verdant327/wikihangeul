const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let db = null;
let useJsonFallback = false;
const DB_PATH = path.join(__dirname, 'battle_data.db');
const JSON_PATH = path.join(__dirname, 'battle_data.json');

// Tier definition
function getTierInfo(rp) {
  if (rp >= 1400) {
    return { name: '맞춤법 제왕', rank: 'MASTER', badge: '👑', color: '#8b5cf6', min: 1400, max: 2000 };
  } else if (rp >= 900) {
    return { name: '번개 물대포', rank: 'DIAMOND', badge: '⚡', color: '#06b6d4', min: 900, max: 1399 };
  } else if (rp >= 500) {
    return { name: '파도 전사', rank: 'GOLD', badge: '🌊', color: '#eab308', min: 500, max: 899 };
  } else if (rp >= 200) {
    return { name: '꼬마 물풍선', rank: 'SILVER', badge: '🎈', color: '#3b82f6', min: 200, max: 499 };
  } else {
    return { name: '물방울', rank: 'BRONZE', badge: '💧', color: '#10b981', min: 0, max: 199 };
  }
}

// In-Memory / JSON Store state
let jsonStore = {
  users: [],
  matches: [],
  wrong_answers: []
};

function loadJsonStore() {
  if (fs.existsSync(JSON_PATH)) {
    try {
      jsonStore = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    } catch (e) {
      console.error('[DB-JSON] Load error, initializing empty store:', e);
    }
  }
}

function saveJsonStore() {
  try {
    fs.writeFileSync(JSON_PATH, JSON.stringify(jsonStore, null, 2), 'utf8');
  } catch (e) {
    console.error('[DB-JSON] Save error:', e);
  }
}

// Try initializing SQLite or fallback
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  initTables();
  console.log('[DB] node:sqlite database initialized successfully at', DB_PATH);
} catch (err) {
  console.warn('[DB] node:sqlite not available on this environment. Switching to persistent JSON store:', err.message);
  useJsonFallback = true;
  loadJsonStore();
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rp INTEGER DEFAULT 100,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      draws INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      opponent_name TEXT NOT NULL,
      is_bot INTEGER DEFAULT 0,
      result TEXT NOT NULL,
      player_score INTEGER DEFAULT 0,
      opponent_score INTEGER DEFAULT 0,
      rp_change INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wrong_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      quiz_id INTEGER NOT NULL,
      user_answer TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function createUser(nickname, password) {
  const trimmed = nickname.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 12) {
    throw new Error('닉네임은 2자 이상 12자 이하로 입력해주세요.');
  }
  if (!password || password.length < 2) {
    throw new Error('비밀번호를 입력해주세요.');
  }

  const existing = getUserByNickname(trimmed);
  if (existing) {
    throw new Error('이미 사용 중인 닉네임입니다.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (useJsonFallback) {
    const user = {
      id,
      nickname: trimmed,
      password,
      rp: 100,
      wins: 0,
      losses: 0,
      draws: 0,
      created_at: now
    };
    jsonStore.users.push(user);
    saveJsonStore();
    return getUserById(id);
  }

  const stmt = db.prepare(`
    INSERT INTO users (id, nickname, password, rp, wins, losses, draws, created_at)
    VALUES (?, ?, ?, 100, 0, 0, 0, datetime('now', 'localtime'))
  `);
  stmt.run(id, trimmed, password);

  return getUserById(id);
}

function getUserByNickname(nickname) {
  const trimmed = nickname.trim().toLowerCase();
  if (useJsonFallback) {
    const user = jsonStore.users.find(u => u.nickname.toLowerCase() === trimmed);
    if (user) {
      return { ...user, tier: getTierInfo(user.rp) };
    }
    return null;
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE LOWER(nickname) = LOWER(?)`);
  const user = stmt.get(nickname.trim());
  if (user) {
    user.tier = getTierInfo(user.rp);
  }
  return user;
}

function getUserById(id) {
  if (useJsonFallback) {
    const user = jsonStore.users.find(u => u.id === id);
    if (user) {
      return { ...user, tier: getTierInfo(user.rp) };
    }
    return null;
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const user = stmt.get(id);
  if (user) {
    user.tier = getTierInfo(user.rp);
  }
  return user;
}

function updateUserStats(userId, result, rpDelta) {
  const user = getUserById(userId);
  if (!user) return null;

  let wins = user.wins;
  let losses = user.losses;
  let draws = user.draws;
  let newRp = Math.max(0, user.rp + rpDelta);

  if (result === 'WIN') wins++;
  else if (result === 'LOSE') losses++;
  else if (result === 'DRAW') draws++;

  if (useJsonFallback) {
    const idx = jsonStore.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      jsonStore.users[idx].rp = newRp;
      jsonStore.users[idx].wins = wins;
      jsonStore.users[idx].losses = losses;
      jsonStore.users[idx].draws = draws;
      saveJsonStore();
    }
    return getUserById(userId);
  }

  const stmt = db.prepare(`
    UPDATE users SET rp = ?, wins = ?, losses = ?, draws = ? WHERE id = ?
  `);
  stmt.run(newRp, wins, losses, draws, userId);

  return getUserById(userId);
}

function saveMatch(userId, opponentName, isBot, result, playerScore, opponentScore, rpChange) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  if (useJsonFallback) {
    jsonStore.matches.push({
      id,
      user_id: userId,
      opponent_name: opponentName,
      is_bot: isBot ? 1 : 0,
      result,
      player_score: playerScore,
      opponent_score: opponentScore,
      rp_change: rpChange,
      created_at: now
    });
    saveJsonStore();
    return id;
  }

  const stmt = db.prepare(`
    INSERT INTO matches (id, user_id, opponent_name, is_bot, result, player_score, opponent_score, rp_change, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  stmt.run(id, userId, opponentName, isBot ? 1 : 0, result, playerScore, opponentScore, rpChange);
  return id;
}

function getMatchHistory(userId, limit = 10) {
  if (useJsonFallback) {
    return jsonStore.matches
      .filter(m => m.user_id === userId)
      .slice(-limit)
      .reverse();
  }

  const stmt = db.prepare(`
    SELECT * FROM matches WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(userId, limit);
}

function getLeaderboard(limit = 10) {
  if (useJsonFallback) {
    const sorted = [...jsonStore.users].sort((a, b) => {
      if (b.rp !== a.rp) return b.rp - a.rp;
      return b.wins - a.wins;
    }).slice(0, limit);

    return sorted.map(u => {
      const total = u.wins + u.losses;
      const rate = total > 0 ? ((u.wins / total) * 100).toFixed(1) : '0.0';
      return {
        id: u.id,
        nickname: u.nickname,
        rp: u.rp,
        wins: u.wins,
        losses: u.losses,
        draws: u.draws,
        win_rate: rate,
        tier: getTierInfo(u.rp)
      };
    });
  }

  const stmt = db.prepare(`
    SELECT id, nickname, rp, wins, losses, draws,
           ROUND(CAST(wins AS FLOAT) / MAX(1, wins + losses) * 100, 1) as win_rate
    FROM users
    ORDER BY rp DESC, wins DESC
    LIMIT ?
  `);
  const list = stmt.all(limit);
  return list.map(item => ({
    ...item,
    tier: getTierInfo(item.rp)
  }));
}

function recordWrongAnswer(userId, quizId, userAnswer, correctAnswer) {
  const now = new Date().toISOString();
  if (useJsonFallback) {
    jsonStore.wrong_answers.push({
      id: jsonStore.wrong_answers.length + 1,
      user_id: userId,
      quiz_id: quizId,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      created_at: now
    });
    saveJsonStore();
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO wrong_answers (user_id, quiz_id, user_answer, correct_answer, created_at)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
  `);
  stmt.run(userId, quizId, userAnswer, correctAnswer);
}

function getWrongAnswers(userId, limit = 20) {
  if (useJsonFallback) {
    return jsonStore.wrong_answers
      .filter(w => w.user_id === userId)
      .slice(-limit)
      .reverse();
  }

  const stmt = db.prepare(`
    SELECT * FROM wrong_answers WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(userId, limit);
}

module.exports = {
  createUser,
  getUserByNickname,
  getUserById,
  updateUserStats,
  saveMatch,
  getMatchHistory,
  getLeaderboard,
  recordWrongAnswer,
  getWrongAnswers,
  getTierInfo
};
