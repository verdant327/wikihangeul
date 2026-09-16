// =============================================================
// 워터팡! 초등 맞춤법 퀴즈 배틀 - Standalone Server
// Made with ❤️ for Elementary Korean Education
// =============================================================

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');

// =============================================================
// Embedded Database Engine (SQLite + JSON Fallback, Zero Stale)
// =============================================================
const db = (() => {
// =============================================================
// 워터팡! 초등 맞춤법 퀴즈 배틀 - Persistent Database Engine (Season 2)
// Multi-device synchronization, Anti-downgrade shield & Season 1 Archive
// =============================================================

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

let db = null;
let useJsonFallback = false;
const DB_PATH = path.join(__dirname, 'battle_data.db');
const JSON_PATH = path.join(__dirname, 'battle_data.json');
const SEED_PATH = path.join(__dirname, 'season2_seed.json');

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

// Prohibited word dictionary (Profanity, slurs, family insults)
const PROHIBITED_KEYWORDS = [
  'ㅄ', 'ㅂㅅ', '병신', '븅신', '등신',
  '엄마', '아빠', '느금', '애미', '애비', '어미', '아비', '모친', '부친', '패드립',
  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '시바', '씨바', '시팔', '씨팔', '씹', '썅',
  '개새', '새끼', 'ㅅㄲ', '개년',
  '좆', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ',
  '미친', 'ㅁㅊ', '꺼져', '닥쳐',
  '보지', '자지', '섹스', '쎅스', '자위', '딸딸이', '성관계',
  'ㅗ', 'fuck', 'shit', 'bitch', '법규',
  '엠창', '창녀', '걸레',
  '자살', '뒈져', '죽어',
  '일베', '노무현', '운지', '메갈', '한남', '한녀', '틀딱', '맘충'
];

function isProhibitedNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') return { prohibited: false };
  const clean = nickname.replace(/[\s_\-\.\,\~\!\@\#\$\%\^\&\*\(\)\=\+\/\\\|\?\:\;\'\"\[\]\{\}\<\>]/g, '').toLowerCase();
  for (const word of PROHIBITED_KEYWORDS) {
    if (clean.includes(word.toLowerCase())) {
      return { prohibited: true, matched: word };
    }
  }
  return { prohibited: false };
}

// In-Memory / JSON Store state
let jsonStore = {
  users: [],
  matches: [],
  wrong_answers: [],
  season1_archive: []
};

function loadJsonStore() {
  if (fs.existsSync(JSON_PATH)) {
    try {
      jsonStore = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
      if (!jsonStore.season1_archive) jsonStore.season1_archive = [];
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

function deleteUser(userId) {
  if (!userId) return false;
  try {
    if (useJsonFallback) {
      jsonStore.users = (jsonStore.users || []).filter(u => u.id !== userId);
      jsonStore.matches = (jsonStore.matches || []).filter(m => m.user_id !== userId);
      jsonStore.wrong_answers = (jsonStore.wrong_answers || []).filter(w => w.user_id !== userId);
      saveJsonStore();
      return true;
    }

    db.prepare('DELETE FROM matches WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM wrong_answers WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    return true;
  } catch (e) {
    console.error('[DB] Delete user error:', e.message);
    return false;
  }
}

function sanitizeProhibitedUsers() {
  let purgedCount = 0;
  try {
    let allUsers = [];
    if (useJsonFallback) {
      allUsers = [...(jsonStore.users || [])];
    } else {
      allUsers = db.prepare('SELECT id, nickname FROM users').all();
    }

    for (const u of allUsers) {
      if (u && u.nickname && isProhibitedNickname(u.nickname).prohibited) {
        console.log(`[DB-Sanitize] 🚫 Deleting prohibited account: "${u.nickname}" (${u.id})`);
        deleteUser(u.id);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      console.log(`[DB-Sanitize] ✅ Purged ${purgedCount} prohibited account(s).`);
    }
  } catch (e) {
    console.error('[DB-Sanitize] Error during prohibited user sweep:', e.message);
  }
  return purgedCount;
}

// -------------------------------------------------------------
// Database Initialization & Season 2 Seeding
// -------------------------------------------------------------
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
      season INTEGER DEFAULT 2,
      season1_rp INTEGER DEFAULT 100,
      season1_rank INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS season1_archive (
      id TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      season1_rank INTEGER NOT NULL,
      season1_rp INTEGER NOT NULL,
      season1_wins INTEGER DEFAULT 0,
      season1_losses INTEGER DEFAULT 0,
      season1_draws INTEGER DEFAULT 0,
      tier_name TEXT,
      tier_badge TEXT,
      tier_color TEXT
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

    CREATE TABLE IF NOT EXISTS season_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Safe ALTER TABLE migrations for existing databases
  try { db.exec(`ALTER TABLE users ADD COLUMN season INTEGER DEFAULT 2`); } catch (e) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN season1_rp INTEGER DEFAULT 100`); } catch (e) {}
  try { db.exec(`ALTER TABLE users ADD COLUMN season1_rank INTEGER DEFAULT 0`); } catch (e) {}
}

const EMBEDDED_SEED_GZ = "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";

function getSeason2SeedData() {
  if (fs.existsSync(SEED_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
    } catch (e) {}
  }
  if (typeof EMBEDDED_SEED_GZ !== 'undefined' && EMBEDDED_SEED_GZ) {
    try {
      const z = require('node:zlib');
      const buf = Buffer.from(EMBEDDED_SEED_GZ, 'base64');
      const unzipped = z.gunzipSync(buf).toString('utf8');
      try {
        if (!fs.existsSync(SEED_PATH)) {
          fs.writeFileSync(SEED_PATH, unzipped, 'utf8');
        }
      } catch (err) {}
      return JSON.parse(unzipped);
    } catch (e) {
      console.error('[DB] Failed to decompress embedded seed:', e);
    }
  }
  return null;
}

function initSeason2Data() {
  try {
    const seed = getSeason2SeedData();
    if (!seed) {
      console.log('[DB] No seed data found.');
      return;
    }

    // 1. Populate season1_archive
    if (useJsonFallback) {
      if (!jsonStore.season1_archive || jsonStore.season1_archive.length === 0) {
        jsonStore.season1_archive = seed.season1Archive || [];
        saveJsonStore();
      }
    } else {
      const archCheck = db.prepare('SELECT count(*) as count FROM season1_archive').get();
      if (archCheck && archCheck.count === 0 && Array.isArray(seed.season1Archive)) {
        console.log(`[DB] Archiving ${seed.season1Archive.length} Season 1 records...`);
        db.exec('BEGIN TRANSACTION');
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO season1_archive 
          (id, nickname, season1_rank, season1_rp, season1_wins, season1_losses, season1_draws, tier_name, tier_badge, tier_color)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const item of seed.season1Archive) {
          stmt.run(
            item.id,
            item.nickname,
            item.season1_rank,
            item.season1_rp,
            item.season1_wins,
            item.season1_losses,
            item.season1_draws,
            item.season1_tier?.name || '물방울',
            item.season1_tier?.badge || '💧',
            item.season1_tier?.color || '#10b981'
          );
        }
        db.exec('COMMIT');
        console.log('[DB] ✅ Season 1 Hall of Fame archived successfully!');
      }
    }

    // 2. Pre-seed users for Season 2 so new devices instantly find their account
    if (useJsonFallback) {
      if (!jsonStore.users) jsonStore.users = [];
      // Transition existing users to Season 2
      jsonStore.users.forEach(u => {
        if (u.season !== 2) {
          u.season1_rp = u.rp || 100;
          u.rp = 100;
          u.wins = 0;
          u.losses = 0;
          u.draws = 0;
          u.season = 2;
        }
      });
      // Pre-seed any missing users
      if (Array.isArray(seed.season2SeedUsers)) {
        for (const u of seed.season2SeedUsers) {
          if (!jsonStore.users.some(x => x.nickname === u.nickname)) {
            jsonStore.users.push({
              id: u.id,
              nickname: u.nickname,
              password: u.password || '1234',
              rp: 100,
              wins: 0,
              losses: 0,
              draws: 0,
              season: 2,
              season1_rp: u.season1_rp || 100,
              season1_rank: u.season1_rank || 0,
              created_at: new Date().toISOString()
            });
          }
        }
      }
      saveJsonStore();
    } else {
      if (Array.isArray(seed.season2SeedUsers)) {
        console.log(`[DB] Pre-seeding user accounts for Season 2...`);
        db.exec('BEGIN TRANSACTION');
        const stmt = db.prepare(`
          INSERT OR IGNORE INTO users 
          (id, nickname, password, rp, wins, losses, draws, season, season1_rp, season1_rank, created_at)
          VALUES (?, ?, ?, 100, 0, 0, 0, 2, ?, ?, datetime('now', 'localtime'))
        `);
        for (const u of seed.season2SeedUsers) {
          stmt.run(u.id, u.nickname, u.password || '1234', u.season1_rp || 100, u.season1_rank || 0);
        }
        db.exec('COMMIT');
        console.log(`[DB] ✅ Pre-seeded ${seed.season2SeedUsers.length} user accounts for Season 2!`);
      }

      // Guarantee Season 2 reset is executed exactly once
      const metaRow = db.prepare("SELECT value FROM season_metadata WHERE key = 'season_reset_v2'").get();
      if (!metaRow) {
        console.log('[DB] Performing Season 2 reset on all existing users...');
        db.exec(`
          UPDATE users 
          SET season1_rp = CASE WHEN season1_rp IS NULL OR season1_rp = 100 THEN rp ELSE season1_rp END,
              rp = 100,
              wins = 0,
              losses = 0,
              draws = 0,
              season = 2;
          INSERT OR REPLACE INTO season_metadata (key, value) VALUES ('season_reset_v2', 'done');
        `);
        console.log('[DB] ✅ All existing users successfully reset to Season 2 (100 RP baseline)!');
      }
    }
  } catch (e) {
    console.error('[DB] Season 2 initialization error:', e.message);
  }
}

// Try initializing SQLite or fallback
try {
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(DB_PATH);
  initTables();
  initSeason2Data();
  sanitizeProhibitedUsers();
  console.log('[DB] node:sqlite database initialized successfully at', DB_PATH);
} catch (err) {
  console.warn('[DB] node:sqlite not available. Switching to persistent JSON store:', err.message);
  useJsonFallback = true;
  loadJsonStore();
  initSeason2Data();
  sanitizeProhibitedUsers();
}

// -------------------------------------------------------------
// Core CRUD & Game State Management
// -------------------------------------------------------------
function createUser(nickname, password) {
  const trimmed = nickname.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 12) {
    throw new Error('닉네임은 2자 이상 12자 이하로 입력해주세요.');
  }
  if (!password || password.length < 2) {
    throw new Error('비밀번호는 2자 이상 입력해주세요.');
  }

  const prohibitedCheck = isProhibitedNickname(trimmed);
  if (prohibitedCheck.prohibited) {
    throw new Error('❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 사용할 수 없습니다. 바르고 고운 닉네임을 사용해주세요!');
  }

  const existing = getUserByNickname(trimmed);
  if (existing) {
    throw new Error('❌ 이미 사용 중인 닉네임(아이디)입니다! [기존 아이디 로그인] 탭에서 로그인해주세요.');
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
      season: 2,
      created_at: now
    };
    jsonStore.users.push(user);
    saveJsonStore();
    return getUserById(id);
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, created_at)
      VALUES (?, ?, ?, 100, 0, 0, 0, 2, datetime('now', 'localtime'))
    `);
    stmt.run(id, trimmed, password);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      throw new Error('❌ 이미 사용 중인 닉네임(아이디)입니다! [기존 아이디 로그인] 탭에서 로그인해주세요.');
    }
    throw e;
  }

  return getUserById(id);
}

function getUserByNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') return null;
  const clean = nickname.trim();
  if (useJsonFallback) {
    const user = jsonStore.users.find(u => u.nickname.trim().toLowerCase() === clean.toLowerCase());
    if (user) {
      return { ...user, tier: getTierInfo(user.rp), season: user.season || 2 };
    }
    return null;
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE TRIM(nickname) = ? COLLATE NOCASE`);
  const user = stmt.get(clean);
  if (user) {
    user.tier = getTierInfo(user.rp);
    user.season = user.season || 2;
  }
  return user;
}

function getUserById(id) {
  if (!id) return null;
  if (useJsonFallback) {
    const user = jsonStore.users.find(u => u.id === id);
    if (user) {
      return { ...user, tier: getTierInfo(user.rp), season: user.season || 2 };
    }
    return null;
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const user = stmt.get(id);
  if (user) {
    user.tier = getTierInfo(user.rp);
    user.season = user.season || 2;
  }
  return user;
}

function updateUserPassword(userId, newPassword) {
  if (!userId || !newPassword) return false;
  if (useJsonFallback) {
    const idx = jsonStore.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      jsonStore.users[idx].password = newPassword;
      saveJsonStore();
      return true;
    }
    return false;
  }
  try {
    const stmt = db.prepare(`UPDATE users SET password = ? WHERE id = ?`);
    stmt.run(newPassword, userId);
    return true;
  } catch (e) {
    console.error('[DB] Update password error:', e.message);
    return false;
  }
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
      jsonStore.users[idx].season = 2;
      saveJsonStore();
    }
    return getUserById(userId);
  }

  const stmt = db.prepare(`
    UPDATE users
    SET rp = ?, wins = ?, losses = ?, draws = ?, season = 2
    WHERE id = ?
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
    return (jsonStore.matches || [])
      .filter(m => m.user_id === userId)
      .slice(-limit)
      .reverse();
  }

  const stmt = db.prepare(`
    SELECT * FROM matches WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
  `);
  return stmt.all(userId, limit);
}

// Season 2 Leaderboard (Active)
function getLeaderboard(limit = null) {
  if (useJsonFallback) {
    const validUsers = (jsonStore.users || []).filter(u => u && u.nickname && !isProhibitedNickname(u.nickname).prohibited && (u.season === 2 || !u.season));
    const sorted = [...validUsers].sort((a, b) => {
      if (b.rp !== a.rp) return b.rp - a.rp;
      return b.wins - a.wins;
    });
    const list = (limit && limit > 0) ? sorted.slice(0, limit) : sorted;

    return list.map(u => {
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
        tier: getTierInfo(u.rp),
        season: 2
      };
    });
  }

  const query = (limit && limit > 0)
    ? `SELECT id, nickname, rp, wins, losses, draws,
              ROUND(CAST(wins AS FLOAT) / MAX(1, wins + losses) * 100, 1) as win_rate
       FROM users
       WHERE season = 2 OR season IS NULL
       ORDER BY rp DESC, wins DESC
       LIMIT ?`
    : `SELECT id, nickname, rp, wins, losses, draws,
              ROUND(CAST(wins AS FLOAT) / MAX(1, wins + losses) * 100, 1) as win_rate
       FROM users
       WHERE season = 2 OR season IS NULL
       ORDER BY rp DESC, wins DESC`;

  const stmt = db.prepare(query);
  const list = (limit && limit > 0) ? stmt.all(limit) : stmt.all();
  return list
    .filter(item => item && item.nickname && !isProhibitedNickname(item.nickname).prohibited)
    .map(item => ({
      ...item,
      tier: getTierInfo(item.rp),
      season: 2
    }));
}

// Season 1 Hall of Fame (Archived)
function getSeason1HallOfFame() {
  if (useJsonFallback) {
    return (jsonStore.season1_archive || []).map(u => ({
      ...u,
      tier: u.tier_name ? { name: u.tier_name, badge: u.tier_badge, color: u.tier_color } : getTierInfo(u.season1_rp)
    }));
  }

  try {
    const rows = db.prepare(`
      SELECT id, nickname, season1_rank, season1_rp, season1_wins, season1_losses, season1_draws, tier_name, tier_badge, tier_color
      FROM season1_archive
      ORDER BY season1_rank ASC
    `).all();
    return rows.map(r => ({
      id: r.id,
      nickname: r.nickname,
      rank: r.season1_rank,
      rp: r.season1_rp,
      wins: r.season1_wins,
      losses: r.season1_losses,
      draws: r.season1_draws,
      tier: {
        name: r.tier_name || '물방울',
        badge: r.tier_badge || '💧',
        color: r.tier_color || '#10b981'
      }
    }));
  } catch (e) {
    console.error('[DB] Hall of fame query error:', e.message);
    return [];
  }
}

function resetToSeason2() {
  if (useJsonFallback) {
    (jsonStore.users || []).forEach(u => {
      if (!u.season1_rp || u.season1_rp === 100) u.season1_rp = u.rp;
      u.rp = 100;
      u.wins = 0;
      u.losses = 0;
      u.draws = 0;
      u.season = 2;
    });
    saveJsonStore();
  } else {
    db.exec(`
      UPDATE users 
      SET season1_rp = CASE WHEN season1_rp IS NULL OR season1_rp = 100 THEN rp ELSE season1_rp END,
          rp = 100,
          wins = 0,
          losses = 0,
          draws = 0,
          season = 2
    `);
  }
  console.log('[DB] Reset all users to Season 2 baseline.');
}

function recordWrongAnswer(userId, quizId, userAnswer, correctAnswer) {
  const now = new Date().toISOString();
  if (useJsonFallback) {
    const existingIdx = jsonStore.wrong_answers.findIndex(w => w.user_id === userId && w.quiz_id === quizId);
    if (existingIdx !== -1) {
      jsonStore.wrong_answers.splice(existingIdx, 1);
    }
    jsonStore.wrong_answers.unshift({
      id: Date.now() + Math.random(),
      user_id: userId,
      quiz_id: quizId,
      user_answer: userAnswer,
      correct_answer: correctAnswer,
      created_at: now
    });
    if (jsonStore.wrong_answers.length > 500) {
      jsonStore.wrong_answers = jsonStore.wrong_answers.slice(0, 500);
    }
    saveJsonStore();
    return true;
  }

  try {
    db.prepare('DELETE FROM wrong_answers WHERE user_id = ? AND quiz_id = ?').run(userId, quizId);
    const stmt = db.prepare(`
      INSERT INTO wrong_answers (user_id, quiz_id, user_answer, correct_answer, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
    `);
    stmt.run(userId, quizId, userAnswer, correctAnswer);
    return true;
  } catch (e) {
    console.error('[DB] Wrong answer record error:', e.message);
    return false;
  }
}

function getWrongAnswers(userId, limit = 50) {
  if (useJsonFallback) {
    return (jsonStore.wrong_answers || [])
      .filter(w => w.user_id === userId)
      .slice(0, limit);
  }

  const stmt = db.prepare(`
    SELECT id, user_id, quiz_id, user_answer, correct_answer, created_at
    FROM wrong_answers
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit);
}

// -------------------------------------------------------------
// Cross-Device Synchronization & Anti-Downgrade Preservation
// -------------------------------------------------------------
function restoreOrSyncUser(userData, leaderboardSnapshot) {
  if (!userData || !userData.nickname) return null;
  const cleanNick = userData.nickname.trim();
  if (isProhibitedNickname(cleanNick).prohibited) {
    return null;
  }

  let existing = getUserByNickname(cleanNick);

  if (existing) {
    let needsUpdate = false;
    let newRp = existing.rp;
    let newWins = existing.wins;
    let newLosses = existing.losses;
    let newDraws = existing.draws;

    // Only allow Season 2 points to update Season 2 users!
    // Never let old Season 1 2000 RP overwrite Season 2 baseline, and NEVER downgrade!
    const isSeason2 = (userData.season === 2);

    if (isSeason2) {
      if (typeof userData.rp === 'number' && userData.rp > existing.rp) {
        newRp = userData.rp;
        needsUpdate = true;
      }
      if (typeof userData.wins === 'number' && userData.wins > existing.wins) {
        newWins = userData.wins;
        needsUpdate = true;
      }
      if (typeof userData.losses === 'number' && userData.losses > existing.losses) {
        newLosses = userData.losses;
        needsUpdate = true;
      }
      if (typeof userData.draws === 'number' && userData.draws > existing.draws) {
        newDraws = userData.draws;
        needsUpdate = true;
      }
    }

    if (needsUpdate || (existing.password === 'saved_user' && userData.password && userData.password !== 'saved_user')) {
      const updatePass = (existing.password === 'saved_user' && userData.password && userData.password !== 'saved_user') ? userData.password : existing.password;
      if (useJsonFallback) {
        const idx = jsonStore.users.findIndex(u => u.id === existing.id);
        if (idx !== -1) {
          jsonStore.users[idx].rp = newRp;
          jsonStore.users[idx].wins = newWins;
          jsonStore.users[idx].losses = newLosses;
          jsonStore.users[idx].draws = newDraws;
          jsonStore.users[idx].password = updatePass;
          jsonStore.users[idx].season = 2;
          saveJsonStore();
        }
      } else {
        const stmt = db.prepare(`UPDATE users SET rp = ?, wins = ?, losses = ?, draws = ?, password = ?, season = 2 WHERE id = ?`);
        stmt.run(newRp, newWins, newLosses, newDraws, updatePass, existing.id);
      }
    }
  } else {
    const id = userData.id || crypto.randomUUID();
    const password = userData.password || '1234';
    // If incoming user is from Season 1 without season=2, start Season 2 at 100 RP!
    const rp = (userData.season === 2 && typeof userData.rp === 'number') ? userData.rp : 100;
    const wins = (userData.season === 2 && typeof userData.wins === 'number') ? userData.wins : 0;
    const losses = (userData.season === 2 && typeof userData.losses === 'number') ? userData.losses : 0;
    const draws = (userData.season === 2 && typeof userData.draws === 'number') ? userData.draws : 0;
    const createdAt = userData.created_at || new Date().toISOString();

    if (useJsonFallback) {
      jsonStore.users.push({
        id,
        nickname: cleanNick,
        password,
        rp,
        wins,
        losses,
        draws,
        season: 2,
        created_at: createdAt
      });
      saveJsonStore();
    } else {
      try {
        const stmt = db.prepare(`
          INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 2, datetime('now', 'localtime'))
        `);
        stmt.run(id, cleanNick, password, rp, wins, losses, draws);
      } catch (e) {
        console.error('[DB] Resurrect error:', e.message);
      }
    }
  }

  // Restore cached leaderboard peers with Absolute Highest-Value Preservation (Never Downgrade!)
  if (Array.isArray(leaderboardSnapshot)) {
    for (const item of leaderboardSnapshot) {
      if (item && item.nickname) {
        const nick = item.nickname.trim();
        if (isProhibitedNickname(nick).prohibited) continue;

        const isItemS2 = (item.season === 2);
        const peerRp = (isItemS2 && typeof item.rp === 'number') ? item.rp : 100;
        const peerWins = (isItemS2 && typeof item.wins === 'number') ? item.wins : 0;
        const peerLosses = (isItemS2 && typeof item.losses === 'number') ? item.losses : 0;
        const peerDraws = (isItemS2 && typeof item.draws === 'number') ? item.draws : 0;

        const found = getUserByNickname(nick);
        if (!found) {
          const lId = item.id || crypto.randomUUID();
          if (useJsonFallback) {
            jsonStore.users.push({
              id: lId,
              nickname: nick,
              password: 'saved_user',
              rp: peerRp,
              wins: peerWins,
              losses: peerLosses,
              draws: peerDraws,
              season: 2,
              created_at: new Date().toISOString()
            });
          } else {
            try {
              const stmt = db.prepare(`
                INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 2, datetime('now', 'localtime'))
              `);
              stmt.run(lId, nick, 'saved_user', peerRp, peerWins, peerLosses, peerDraws);
            } catch (e) {}
          }
        } else if (isItemS2) {
          // Absolute Max Merge: Never allow older snapshot to downgrade a peer's RP!
          const higherRp = Math.max(found.rp, peerRp);
          const higherWins = Math.max(found.wins, peerWins);
          const higherLosses = Math.max(found.losses, peerLosses);
          const higherDraws = Math.max(found.draws, peerDraws);

          if (higherRp > found.rp || higherWins > found.wins) {
            if (useJsonFallback) {
              const idx = jsonStore.users.findIndex(u => u.id === found.id);
              if (idx !== -1) {
                jsonStore.users[idx].rp = higherRp;
                jsonStore.users[idx].wins = higherWins;
                jsonStore.users[idx].losses = higherLosses;
                jsonStore.users[idx].draws = higherDraws;
                jsonStore.users[idx].season = 2;
              }
            } else {
              try {
                db.prepare(`
                  UPDATE users 
                  SET rp = ?, wins = ?, losses = ?, draws = ?, season = 2 
                  WHERE id = ?
                `).run(higherRp, higherWins, higherLosses, higherDraws, found.id);
              } catch (e) {}
            }
          }
        }
      }
    }
    if (useJsonFallback) saveJsonStore();
  }

  return getUserByNickname(cleanNick);
}

return {
  createUser,
  getUserByNickname,
  getUserById,
  updateUserStats,
  saveMatch,
  getMatchHistory,
  getLeaderboard,
  getSeason1HallOfFame,
  resetToSeason2,
  recordWrongAnswer,
  saveWrongAnswer: recordWrongAnswer,
  getWrongAnswers,
  getTierInfo,
  restoreOrSyncUser,
  updateUserPassword,
  deleteUser,
  sanitizeProhibitedUsers,
  isProhibitedNickname,
  PROHIBITED_KEYWORDS
};

})();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Fallback 120 Curated Korean Spelling Quizzes
const FALLBACK_QUIZZES = [
  {
    "id": 1,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"갑작스러운 상황에 너무 ( ) 없었어.\"",
    "options": [
      "어이",
      "어의"
    ],
    "answer": "어이",
    "explanation": "'어이'는 엄청나게 큰 사람이나 사물을 뜻하는 고유어로 기가 막힐 때 '어이없다'라고 써요. '어의(御醫)'는 임금님을 치료하던 의사입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 2,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"오늘이 ( )인지 아니?\"",
    "options": [
      "며칠",
      "몇일"
    ],
    "answer": "며칠",
    "explanation": "국어에서는 '몇 일'이라는 표기 자체가 존재하지 않으며, 언제나 '며칠'로 적는 것이 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 3,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"오늘따라 ( ) 기분이 설레네.\"",
    "options": [
      "왠지",
      "웬지"
    ],
    "answer": "왠지",
    "explanation": "'왜인지'의 줄임말일 때만 '왠지'를 쓰고, 그 외에 '웬일이니?', '웬 떡이야?'처럼 어찌 된 일인지를 나타낼 때는 '웬'을 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 4,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"감기 얼른 다 ( ) 바랄게!\"",
    "options": [
      "낫길",
      "낳길"
    ],
    "answer": "낫길",
    "explanation": "병이나 상처가 치료되는 것은 '낫다(낫길, 나아)'이고, 아기나 알을 몸 밖으로 내보내는 것은 '낳다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 5,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"약속 시간에 늦으면 ( )?\"",
    "options": [
      "어떡해",
      "어떻해"
    ],
    "answer": "어떡해",
    "explanation": "'어떻게 해'가 줄어든 말은 '어떡해'입니다. 종성 'ㅎ' 뒤에 초성 'ㅎ'이 붙는 '어떻해'라는 단어는 우리말에 없습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 6,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"그 일을 ( ) 해결해야 할까?\"",
    "options": [
      "어떻게",
      "어떡해"
    ],
    "answer": "어떻게",
    "explanation": "뒤에 오는 서술어('해결할까')를 수식하는 부사형으로는 '어떻게'를 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 7,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"교실에서 장난치면 ( )!\"",
    "options": [
      "안 돼",
      "않 돼"
    ],
    "answer": "안 돼",
    "explanation": "'안'은 부정부사 '아니'의 준말이고, '않'은 '아니하-'의 준말입니다. '아니 돼'가 성립하므로 '안 돼'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 8,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"생각을 ( ) 해보고 결정하자.\"",
    "options": [
      "곰곰이",
      "곰곰히"
    ],
    "answer": "곰곰이",
    "explanation": "첩어 명사나 부사 뒤에 붙는 부사화 접미사로, '곰곰' 뒤에는 '-이'가 붙어 '곰곰이'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 9,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님께서 학생들을 ( ) 챙겨주셨다.\"",
    "options": [
      "일일이",
      "일일히"
    ],
    "answer": "일일이",
    "explanation": "'일일히'는 잘못된 표기이며, 현대 맞춤법에서는 '일일이'만 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 10,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"손을 비누로 ( ) 씻자.\"",
    "options": [
      "깨끗이",
      "깨끗히"
    ],
    "answer": "깨끗이",
    "explanation": "'ㅅ' 받침으로 끝나는 어간 뒤에는 부사화 접미사 '-이'가 붙어 '깨끗이'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 11,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"방안을 햇볕으로 ( ) 데웠다.\"",
    "options": [
      "따뜻이",
      "따뜻히"
    ],
    "answer": "따뜻이",
    "explanation": "'ㅅ' 받침으로 끝나는 말 뒤에는 '-이'가 결합하므로 '따뜻이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 12,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구야, 정말 ( )이야!\"",
    "options": [
      "오랜만",
      "오랫만"
    ],
    "answer": "오랜만",
    "explanation": "'오래간만'이 줄어든 말이므로 '오랜만'이 맞습니다. 사이시옷이 들어가지 않습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 13,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"하늘에 뜬 밝은 ( ).\"",
    "options": [
      "해님",
      "햇님"
    ],
    "answer": "해님",
    "explanation": "'님'은 접미사이므로 순우리말 명사 '해'와 결합할 때 사이시옷을 받치지 않고 '해님'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 14,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"카메라의 ( )을 잘 맞춰봐.\"",
    "options": [
      "초점",
      "촛점"
    ],
    "answer": "초점",
    "explanation": "'초점(焦點)'은 한자어와 한자어의 결합이므로 사이시옷을 쓰지 않고 '초점'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 15,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구들과 운동장에서 ( )을 했다.\"",
    "options": [
      "숨바꼭질",
      "숨박꼭질"
    ],
    "answer": "숨바꼭질",
    "explanation": "'숨다'에서 유래된 놀이 명칭의 바른 표준어는 '숨바꼭질'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 16,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"용돈을 다 써서 ( )가 되었어.\"",
    "options": [
      "빈털터리",
      "빈털털이"
    ],
    "answer": "빈털터리",
    "explanation": "가진 것이 하나도 없게 된 사람을 뜻하는 표준어는 '빈털터리'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 17,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"( ) 숙제는 미리 끝내두자.\"",
    "options": [
      "아무튼",
      "아뭏든"
    ],
    "answer": "아무튼",
    "explanation": "현행 표준어 규정에서는 소리 나는 대로 '아무튼'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 18,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"바르고 ( ) 어린이가 됩시다.\"",
    "options": [
      "올바른",
      "옳바른"
    ],
    "answer": "올바른",
    "explanation": "'올곧다'의 '올'과 '바르다'가 합쳐진 말로 '올바르다/올바른'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 19,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"좁은 가방 속에 책을 억지로 ( ).\"",
    "options": [
      "욱여넣었다",
      "우겨넣었다"
    ],
    "answer": "욱여넣었다",
    "explanation": "주위에서 안쪽으로 함부로 밀어 넣는 것은 '욱여넣다'가 바른 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 20,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아침에 ( ) 일어나 운동을 했다.\"",
    "options": [
      "일찍이",
      "일찌기"
    ],
    "answer": "일찍이",
    "explanation": "부사 '일찍' 뒤에 부사화 접미사 '-이'가 붙은 형태이므로 '일찍이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 21,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비가 오고 바람까지 부니 ( ) 춥다.\"",
    "options": [
      "더욱이",
      "더우기"
    ],
    "answer": "더욱이",
    "explanation": "'더욱'이라는 부사에 접미사 '-이'가 붙어 원형을 밝혀 적는 '더욱이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 22,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"넘어져도 ( ) 일어나는 인형.\"",
    "options": [
      "오뚝이",
      "오똑이"
    ],
    "answer": "오뚝이",
    "explanation": "현대 국어 표준어로는 모음조화가 약화되어 '오뚝하다/오뚝이'가 올바른 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 23,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가족들이 모여 ( ) 이야기를 나눴다.\"",
    "options": [
      "오순도순",
      "오손도손"
    ],
    "answer": "오순도순",
    "explanation": "표준어 규정에서 '오손도손'은 비표준어이며 '오순도순'만 표준어로 인정됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 24,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가위로 종이를 ( ) 잘랐어.\"",
    "options": [
      "싹둑싹둑",
      "싹독싹독"
    ],
    "answer": "싹둑싹둑",
    "explanation": "'싹둑'의 큰말은 '썩둑'이며, '싹독'은 잘못된 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 25,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"점심을 먹고 나니 너무 ( ).\"",
    "options": [
      "졸리다",
      "졸립다"
    ],
    "answer": "졸리다",
    "explanation": "'잠이 오다'라는 뜻의 표준어는 '졸리다'입니다. '졸립다'는 비표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 26,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"( ) 파도가 치는 바다.\"",
    "options": [
      "거친",
      "거칠은"
    ],
    "answer": "거친",
    "explanation": "'거칠다'의 관형사형은 'ㄹ'이 탈락하여 '거친'이 됩니다. '거칠은'은 문학적 허용 외에는 비표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 27,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"우리 집은 학교와 ( ).\"",
    "options": [
      "가까워",
      "가까와"
    ],
    "answer": "가까워",
    "explanation": "'ㅂ' 불규칙 용언 뒤에 모음 어미 '-어'가 결합하면 '가까워'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 28,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시험을 잘 ( ) 왔다.\"",
    "options": [
      "치르고",
      "치루고"
    ],
    "answer": "치르고",
    "explanation": "기본형이 '치르다'이므로 어간 '치르-' 뒤에 '-고'가 붙어 '치르고'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 29,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"상황에 ( ) 행동을 해야 해.\"",
    "options": [
      "알맞은",
      "알맞는"
    ],
    "answer": "알맞은",
    "explanation": "'알맞다'는 형용사이므로 현재 관형사형 어미 '-은'이 붙어 '알맞은'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 30,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"격식에 ( ) 옷차림.\"",
    "options": [
      "걸맞은",
      "걸맞는"
    ],
    "answer": "걸맞은",
    "explanation": "'걸맞다' 역시 형용사이므로 관형사형 어미 '-은'이 결합하여 '걸맞은'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 31,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"( ) 그럴 필요까지는 없어.\"",
    "options": [
      "굳이",
      "구지"
    ],
    "answer": "굳이",
    "explanation": "구개음화 현상으로 소리는 [구지]로 나지만 어원을 밝혀 '굳이'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 32,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"양말이 저절로 ( ).\"",
    "options": [
      "벗겨졌다",
      "벗어졌다"
    ],
    "answer": "벗겨졌다",
    "explanation": "자연스럽게 벗어난 상태는 피동형인 '벗겨지다'를 써서 '벗겨졌다'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 33,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"내 얼굴을 ( ) 쳐다보았다.\"",
    "options": [
      "빤히",
      "빤이"
    ],
    "answer": "빤히",
    "explanation": "'하다'가 붙는 어근 '빤하다' 뒤에는 부사화 접미사 '-히'가 붙어 '빤히'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 34,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"수학 문제가 ( ) 잘 풀린다.\"",
    "options": [
      "술술",
      "숼숼"
    ],
    "answer": "술술",
    "explanation": "거침없이 잘 풀리거나 넘어가는 모양을 나타내는 부사는 '술술'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 35,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어린 시절의 추억이 ( ) 난다.\"",
    "options": [
      "어렴풋이",
      "어렴풋히"
    ],
    "answer": "어렴풋이",
    "explanation": "'ㅅ' 받침으로 끝나는 말 뒤에는 부사화 접미사 '-이'가 붙어 '어렴풋이'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 36,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시간이 ( ) 못해 다 못 풀었다.\"",
    "options": [
      "넉넉지",
      "넉넉치"
    ],
    "answer": "넉넉지",
    "explanation": "앞말의 받침이 안울림소리(ㄱ, ㅂ, ㅅ)일 때는 '하'가 통째로 탈락하여 '넉넉지'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 37,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"내 ( ) 그 소문은 거짓이야.\"",
    "options": [
      "생각건대",
      "생각컨대"
    ],
    "answer": "생각건대",
    "explanation": "'생각하건대'에서 앞 받침 'ㄱ' 뒤의 '하'가 완전히 탈락하므로 '생각건대'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 38,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구들에게 친절을 ( ).\"",
    "options": [
      "베풀다",
      "배풀다"
    ],
    "answer": "베풀다",
    "explanation": "은혜나 친절을 베푸는 것은 '베풀다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 39,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"바닷가 위를 나는 ( ).\"",
    "options": [
      "갈매기",
      "갈메기"
    ],
    "answer": "갈매기",
    "explanation": "물샛과의 새를 뜻하는 표준어는 'ㅐ'를 쓰는 '갈매기'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 40,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"( )께는 항상 공손하게 인사하자.\"",
    "options": [
      "웃어른",
      "윗어른"
    ],
    "answer": "웃어른",
    "explanation": "위와 아래의 대립이 없는 경우에는 '웃-'을 쓰므로, '아랫어른'이 없는 '어른' 앞에는 '웃어른'을 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 41,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"나중에 멋진 과학자가 ( ) 싶어요.\"",
    "options": [
      "되고",
      "돼고"
    ],
    "answer": "되고",
    "explanation": "'돼'는 '되어'의 준말입니다. '되어고'는 성립하지 않으므로 '되고'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 42,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"드디어 과제를 다 ( )!\"",
    "options": [
      "됐다",
      "됬다"
    ],
    "answer": "됐다",
    "explanation": "'되었다'의 준말이므로 '됐다'로 적어야 합니다. '됬'이라는 글자는 우리말에 없습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 43,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시간이 ( ) 다시 만나자.\"",
    "options": [
      "돼서",
      "되서"
    ],
    "answer": "돼서",
    "explanation": "'되어서'가 줄어든 형태이므로 '돼서'가 올바른 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 44,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님, 내일 학교에서 ( ).\"",
    "options": [
      "봬요",
      "뵈요"
    ],
    "answer": "봬요",
    "explanation": "'뵈어요'가 줄어든 말이므로 '봬요'가 맞습니다. 어간 '뵈-' 뒤에 바로 보조사 '-요'가 올 수 없습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 45,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어젯밤에 잠을 잘 자지 ( ).\"",
    "options": [
      "못했다",
      "못 했다"
    ],
    "answer": "못했다",
    "explanation": "'일정한 수준에 미치지 못하다'라는 뜻의 동사는 한 단어인 '못하다'이므로 붙여 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 46,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"네 꿈이 꼭 이루어지길 ( ).\"",
    "options": [
      "바라",
      "바래"
    ],
    "answer": "바라",
    "explanation": "기본형이 '바라다'이므로 어간 '바라-'에 어미 '-아'가 붙으면 '바라'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 47,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동생이 밥을 먹지 ( ) 떼를 쓴다.\"",
    "options": [
      "않고",
      "안고"
    ],
    "answer": "않고",
    "explanation": "'아니하고'의 준말이므로 '않고'가 맞습니다. '안고'는 품에 안는다는 뜻입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 48,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"교장 선생님 말씀을 깊이 ( ).\"",
    "options": [
      "되새겼다",
      "돼새겼다"
    ],
    "answer": "되새겼다",
    "explanation": "'되새기다'는 접두사 '되-'가 붙은 말이므로 '되새겼다'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 49,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"남을 괴롭히면 ( )!\"",
    "options": [
      "안 돼",
      "안 되"
    ],
    "answer": "안 돼",
    "explanation": "문장의 끝에는 종결어미가 필요하므로 '아니 되어'의 준말인 '안 돼'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 50,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"우리는 내일 아침 일찍 ( ).\"",
    "options": [
      "출발할 거야",
      "출발할 꺼야"
    ],
    "answer": "출발할 거야",
    "explanation": "소리는 [출발할 꺼야]로 나더라도 의존명사 '것'을 밝혀 '출발할 거야'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 51,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"안전하게 ( )을 건넜다.\"",
    "options": [
      "등굣길",
      "등교길"
    ],
    "answer": "등굣길",
    "explanation": "한자어 '등교'와 순우리말 '길'이 만나 된소리 [등교낄]로 나므로 '등굣길'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 52,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"수업 끝나고 즐거운 ( ).\"",
    "options": [
      "하굣길",
      "하교길"
    ],
    "answer": "하굣길",
    "explanation": "한자어 '하교'와 순우리말 '길'의 결합으로 뒷소리가 된소리 [하교낄]이 나므로 '하굣길'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 53,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"생일 케이크에 ( )을 켰다.\"",
    "options": [
      "촛불",
      "초불"
    ],
    "answer": "촛불",
    "explanation": "한자어 '초'와 순우리말 '불'의 합성어로 [초뿔] 소리가 나므로 '촛불'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 54,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"지붕에서 ( )이 뚝뚝 떨어진다.\"",
    "options": [
      "빗물",
      "비물"
    ],
    "answer": "빗물",
    "explanation": "순우리말 '비'와 '물'이 결합할 때 'ㄴ' 소리가 덧나 [빈물]이 되므로 '빗물'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 55,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"산골짜기 맑은 ( ).\"",
    "options": [
      "냇물",
      "내물"
    ],
    "answer": "냇물",
    "explanation": "순우리말 '내'와 '물'이 합쳐져 [낸물]로 발음되므로 사이시옷을 받쳐 '냇물'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 56,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"여름 방학에 시원한 ( )에 놀러 갔다.\"",
    "options": [
      "바닷가",
      "바다가"
    ],
    "answer": "바닷가",
    "explanation": "순우리말 '바다'와 '가'가 결합하여 된소리 [바다까]로 발음되므로 '바닷가'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 57,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"고소한 냄새가 나는 ( ) 장아찌.\"",
    "options": [
      "깻잎",
      "깨잎"
    ],
    "answer": "깻잎",
    "explanation": "순우리말 '깨'와 '잎'이 만나 [깬닙]으로 'ㄴㄴ' 소리가 덧나므로 '깻잎'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 58,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"목표를 이루기 위해 큰 ( )를 치렀다.\"",
    "options": [
      "대가",
      "댓가"
    ],
    "answer": "대가",
    "explanation": "'대가(代價)'는 순수한 한자어끼리의 결합이므로 사이시옷을 쓰지 않고 '대가'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 59,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"바구니 속 사과의 ( )를 세어보자.\"",
    "options": [
      "개수",
      "갯수"
    ],
    "answer": "개수",
    "explanation": "'개수(個數)'는 한자어와 한자어의 결합이므로 사이시옷을 받치지 않고 '개수'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 60,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"운동한 ( )가 늘어날수록 건강해진다.\"",
    "options": [
      "횟수",
      "회수"
    ],
    "answer": "횟수",
    "explanation": "한자어 중 사이시옷을 예외로 인정하는 6개 단어(곳간, 셋방, 숫자, 찻간, 툇간, 횟수) 중 하나이므로 '횟수'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 61,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"눈 깜짝할 사이에 ( ) 사라졌다.\"",
    "options": [
      "금세",
      "금새"
    ],
    "answer": "금세",
    "explanation": "'지금 바로'의 뜻인 '금시에'가 줄어든 말이므로 '금세'가 맞습니다. '금새'는 물건의 값을 의미합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 62,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동물원에서 정말 ( ) 새를 보았다.\"",
    "options": [
      "희한한",
      "희안한"
    ],
    "answer": "희한한",
    "explanation": "드물고 신기하다는 뜻의 한자어는 '희한(稀罕)하다'이므로 '희한한'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 63,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"소풍 전날 밤, 마음속 ( )이 가득했다.\"",
    "options": [
      "설렘",
      "설레임"
    ],
    "answer": "설렘",
    "explanation": "기본형이 '설레다'이므로 명사형 어미 '-ㅁ'이 결합하여 '설렘'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 64,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"전국에서 ( )하는 실력자들이 모였다.\"",
    "options": [
      "내로라하는",
      "내노라하는"
    ],
    "answer": "내로라하는",
    "explanation": "'나이로다(나이다)'에서 유래한 고유 표현으로 '내로라하다'가 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 65,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시골 할머니 댁 앞마당이 참 ( ).\"",
    "options": [
      "널따랗다",
      "넓다랗다"
    ],
    "answer": "널따랗다",
    "explanation": "'넓다'에서 파생된 말 중 'ㅂ' 받침이 탈락하여 소리 나는 대로 '널따랗다'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 66,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"새로 이사한 방이 ( ) 마음에 든다.\"",
    "options": [
      "널찍해서",
      "넓직해서"
    ],
    "answer": "널찍해서",
    "explanation": "'넓-'의 'ㅂ'이 탈락하고 된소리로 굳어진 형태이므로 '널찍하다/널찍해서'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 67,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"숲속 나무를 콕콕 쪼는 ( ).\"",
    "options": [
      "딱따구리",
      "딱다구리"
    ],
    "answer": "딱따구리",
    "explanation": "한 단어 안에서 까닭 없이 나는 된소리는 다음 음절을 된소리로 적으므로 '딱따구리'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 68,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아삭아삭 맛있는 무 ( ).\"",
    "options": [
      "깍두기",
      "깎두기"
    ],
    "answer": "깍두기",
    "explanation": "기역 받침 뒤에서 된소리가 나더라도 원형을 밝힐 수 없으므로 소리대로 '깍두기'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 69,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"방바닥에 장난감이 ( ) 있다.\"",
    "options": [
      "널브러져",
      "널부러져"
    ],
    "answer": "널브러져",
    "explanation": "흐트러져 어지럽게 흩어져 있는 모양은 '널브러지다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 70,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"쫄깃쫄깃 맛있는 매콤 ( ) 볶음.\"",
    "options": [
      "주꾸미",
      "쭈꾸미"
    ],
    "answer": "주꾸미",
    "explanation": "문어과의 연체동물을 가리키는 올바른 표준어는 '주꾸미'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 71,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"학교 앞 분식집에서 매콤한 ( )를 사 먹었다.\"",
    "options": [
      "떡볶이",
      "떡뽂이"
    ],
    "answer": "떡볶이",
    "explanation": "'떡'과 '볶다'의 명사형 파생 접미사 '-이'가 결합된 형태이므로 '떡볶이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 72,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"보글보글 맛있는 김치( ).\"",
    "options": [
      "찌개",
      "찌게"
    ],
    "answer": "찌개",
    "explanation": "국물을 자작하게 끓인 음식은 'ㅐ'를 쓰는 '찌개'가 올바른 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 73,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"밤에 편안한 ( )를 베고 잠들었다.\"",
    "options": [
      "베개",
      "배개"
    ],
    "answer": "베개",
    "explanation": "'베다'에 도구를 뜻하는 접미사 '-개'가 붙은 말이므로 '베개'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 74,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"목이 말라 시원한 보리차를 벌컥벌컥 ( ).\"",
    "options": [
      "들이켰다",
      "들이키었다"
    ],
    "answer": "들이켰다",
    "explanation": "'물이나 술 따위를 단숨에 마시다'는 '들이켜다'이므로 과거형은 '들이켰다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 75,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"달걀 ( )를 조심스럽게 깠다.\"",
    "options": [
      "껍데기",
      "껍질"
    ],
    "answer": "껍데기",
    "explanation": "달걀이나 조개처럼 딱딱하게 겉을 싸고 있는 것은 '껍데기'가 맞고, 사과나 귤처럼 질긴 것은 '껍질'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 76,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"사과 ( )을 얇게 깎았다.\"",
    "options": [
      "껍질",
      "껍데기"
    ],
    "answer": "껍질",
    "explanation": "과일이나 채소의 무르고 얇은 겉면은 '껍질'이라고 합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 77,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시간이 날 때마다 책을 ( ) 읽었다.\"",
    "options": [
      "틈틈이",
      "틈틈히"
    ],
    "answer": "틈틈이",
    "explanation": "첩어 명사 '틈틈' 뒤에는 부사화 접미사 '-이'가 결합하므로 '틈틈이'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 78,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 부탁을 ( ) 거절하기 어려웠다.\"",
    "options": [
      "번번이",
      "번번히"
    ],
    "answer": "번번이",
    "explanation": "'매 때마다'를 뜻하는 '번번' 뒤에는 '-이'가 붙어 '번번이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 79,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아침밥을 ( ) 챙겨 먹고 길을 나섰다.\"",
    "options": [
      "일찌감치",
      "일찌감히"
    ],
    "answer": "일찌감치",
    "explanation": "'넉넉하게 일찍'을 뜻하는 표준어는 '일찌감치'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 80,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"과녁의 정중앙을 정확하게 ( ).\"",
    "options": [
      "맞혔다",
      "맞췄다"
    ],
    "answer": "맞혔다",
    "explanation": "목표물에 닿게 하거나 퀴즈의 답을 맞게 낸 것은 '맞히다(맞혔다)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 81,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구와 시험 답안을 서로 ( ) 보았다.\"",
    "options": [
      "맞추어",
      "맞히어"
    ],
    "answer": "맞추어",
    "explanation": "둘 이상의 대상을 서로 대조하여 비교해보는 것은 '맞추다(맞추어)'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 82,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"우체국에서 친구에게 편지를 ( ).\"",
    "options": [
      "부쳤다",
      "붙였다"
    ],
    "answer": "부쳤다",
    "explanation": "편지나 짐을 보내는 것은 '부치다(부쳤다)'입니다. '붙이다'는 맞닿아 떨어지지 않게 하는 것입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 83,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"게시판에 안내문을 테이프로 ( ).\"",
    "options": [
      "붙였다",
      "부쳤다"
    ],
    "answer": "붙였다",
    "explanation": "물건이 달라붙게 접착하는 것은 '붙이다(붙였다)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 84,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비 오는 날 프라이팬에 맛있는 전을 ( ).\"",
    "options": [
      "부쳤다",
      "붙였다"
    ],
    "answer": "부쳤다",
    "explanation": "기름을 두르고 빈대떡이나 전을 익혀 만드는 것은 '부치다(부쳤다)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 85,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"외출했다가 소중한 지갑을 ( ).\"",
    "options": [
      "잃어버렸다",
      "잊어버렸다"
    ],
    "answer": "잃어버렸다",
    "explanation": "물건을 분실하여 없어진 상태는 '잃어버리다'입니다. '잊어버리다'는 기억을 잊는 것입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 86,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"오늘 숙제가 있다는 사실을 까맣게 ( ).\"",
    "options": [
      "잊어버렸다",
      "잃어버렸다"
    ],
    "answer": "잊어버렸다",
    "explanation": "기억해야 할 사실을 깜빡한 것은 '잊어버리다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 87,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"저 높은 산 ( )에 예쁜 무지개가 떴다.\"",
    "options": [
      "너머",
      "넘어"
    ],
    "answer": "너머",
    "explanation": "'높이나 경계의 저쪽 공간'을 가리키는 명사는 '너머'입니다. '넘어'는 동작을 나타내는 동사 활용형입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 88,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"높은 담장을 훌쩍 ( ) 마당으로 들어갔다.\"",
    "options": [
      "넘어",
      "너머"
    ],
    "answer": "넘어",
    "explanation": "'넘다'라는 움직임을 나타내는 서술형이므로 '넘어'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 89,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"초등학생( ) 지켜야 할 기본 규칙이 있어.\"",
    "options": [
      "으로서",
      "으로써"
    ],
    "answer": "으로서",
    "explanation": "신분이나 자격을 나타낼 때는 조사 '-으로서'를 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 90,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"대화( ) 서로의 갈등을 평화롭게 풀었다.\"",
    "options": [
      "로써",
      "로서"
    ],
    "answer": "로써",
    "explanation": "수단이나 도구를 나타낼 때는 조사 '-로써'를 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 91,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님께 체험학습 보고서 ( )를 받았다.\"",
    "options": [
      "결재",
      "결제"
    ],
    "answer": "결재",
    "explanation": "상관이나 책임자가 부하의 안건을 허가하고 승인하는 것은 '결재(決裁)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 92,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"문구점에서 학용품을 카드로 ( )했다.\"",
    "options": [
      "결제",
      "결재"
    ],
    "answer": "결제",
    "explanation": "돈을 치르고 거래를 끝맺는 것은 '결제(決濟)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 93,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"자신의 숨은 재능과 소질을 ( )하자.\"",
    "options": [
      "계발",
      "개발"
    ],
    "answer": "계발",
    "explanation": "슬기나 재능, 사상 등을 일깨워 발전시키는 것은 '계발(啓發)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 94,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"새로운 기술과 소프트웨어를 ( )했다.\"",
    "options": [
      "개발",
      "계발"
    ],
    "answer": "개발",
    "explanation": "새로운 물건이나 자원을 만들어내거나 경제를 발전시키는 것은 '개발(開發)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 95,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"멋지게 기른 멋진 ( ).\"",
    "options": [
      "구레나룻",
      "구렛나루"
    ],
    "answer": "구레나룻",
    "explanation": "'귀밑에서 턱까지 난 수염'의 바른 표준어는 '구레나룻'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 96,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비밀 파티 계획을 살짝 ( )해주었다.\"",
    "options": [
      "귀띔",
      "귀뜸"
    ],
    "answer": "귀띔",
    "explanation": "상대방이 눈치챌 수 있도록 살그머니 미리 알려주는 것은 '귀띔'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 97,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"두꺼운 나무 ( )로 다리를 만들었다.\"",
    "options": [
      "널빤지",
      "널판지"
    ],
    "answer": "널빤지",
    "explanation": "판자 형태의 얇은 널빤지를 가리키는 표준어는 '널빤지'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 98,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"뱀이 몸을 둥글게 ( )를 틀고 있다.\"",
    "options": [
      "똬리",
      "또아리"
    ],
    "answer": "똬리",
    "explanation": "머리에 짐을 일 때 얹는 고리나 둥글게 튼 형태는 '똬리'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 99,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어깨에 무거운 책가방을 ( ).\"",
    "options": [
      "메고",
      "매고"
    ],
    "answer": "메고",
    "explanation": "어깨나 등에 걸치는 것은 '메다'이고, 끈으로 묶는 것은 '매다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 100,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"풀어진 운동화 끈을 단단히 ( ).\"",
    "options": [
      "맸다",
      "멨다"
    ],
    "answer": "맸다",
    "explanation": "끈이나 줄을 묶어 매듭을 짓는 것은 '매다(맸다)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 101,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"차곡차곡 저축해서 꽤 큰 ( )을 모았다.\"",
    "options": [
      "목돈",
      "몫돈"
    ],
    "answer": "목돈",
    "explanation": "한 덩어리가 된 큰돈을 뜻하는 표준어는 '목돈'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 102,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"거센 비바람의 위험을 ( ) 나아갔다.\"",
    "options": [
      "무릅쓰고",
      "무릎쓰고"
    ],
    "answer": "무릅쓰고",
    "explanation": "'힘들거나 위험한 상태를 참고 견디다'는 동사 '무릅쓰다'이므로 '무릅쓰고'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 103,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"길가에 잎이 무성한 키 큰 ( ).\"",
    "options": [
      "미루나무",
      "미류나무"
    ],
    "answer": "미루나무",
    "explanation": "미국에서 건너온 버드나무라는 뜻의 올바른 표준어는 '미루나무'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 104,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"수학 시간에 소수를 ( )로 바꾸어 나타냈다.\"",
    "options": [
      "백분율",
      "백분률"
    ],
    "answer": "백분율",
    "explanation": "모음이나 'ㄴ' 받침 뒤에서는 '률'이 아니라 '율'로 표기하므로 '백분율'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 105,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"정월 ( )에 모여 잔치를 열었다.\"",
    "options": [
      "사흗날",
      "사흘날"
    ],
    "answer": "사흗날",
    "explanation": "'사흘'과 '날'이 결합할 때 'ㄹ'이 'ㄷ'으로 변형되어 '사흗날'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 106,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"축제가 끝난 바로 ( ) 아침.\"",
    "options": [
      "이튿날",
      "이틀날"
    ],
    "answer": "이튿날",
    "explanation": "'이틀'과 '날'의 결합에서 'ㄹ'이 'ㄷ'으로 굳어져 '이튿날'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 107,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"복도에서 심한 장난을 ( ).\"",
    "options": [
      "삼가자",
      "삼가하자"
    ],
    "answer": "삼가자",
    "explanation": "기본형이 '삼가다'이므로 어간 '삼가-'에 어미 '-자'가 붙어 '삼가자'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 108,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"잃어버린 열쇠를 찾으려고 방안을 ( ) 뒤졌다.\"",
    "options": [
      "샅샅이",
      "샅샅히"
    ],
    "answer": "샅샅이",
    "explanation": "첩어 '샅샅' 뒤에는 부사화 접미사 '-이'가 결합하여 [삳싸치]로 발음되고 '샅샅이'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 109,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"음력으로 한 해의 마지막 달을 ( )이라고 한다.\"",
    "options": [
      "섣달",
      "설달"
    ],
    "answer": "섣달",
    "explanation": "'설'과 '달'이 만날 때 'ㄹ' 받침이 'ㄷ'으로 바뀌어 '섣달'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 110,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"순진하고 ( ) 보여도 속이 깊은 친구야.\"",
    "options": [
      "어수룩해",
      "어리숙해"
    ],
    "answer": "어수룩해",
    "explanation": "본래 표준어 규범에 맞는 전통적인 원형 표준어는 '어수룩하다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 111,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"얼굴이 아직 어린아이처럼 ( ).\"",
    "options": [
      "앳되다",
      "애띠다"
    ],
    "answer": "앳되다",
    "explanation": "어린 태가 남아 있는 모습의 표준어는 '앳되다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 112,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"서투른 실력으로 ( ) 아는 척하지 마.\"",
    "options": [
      "어쭙잖게",
      "어줍잖게"
    ],
    "answer": "어쭙잖게",
    "explanation": "주제넘거나 어설프다는 뜻의 표준어는 '어쭙잖다/어쭙잖게'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 113,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"학교가 끝나면 ( ) 놀이터로 달려갔다.\"",
    "options": [
      "으레",
      "으례"
    ],
    "answer": "으레",
    "explanation": "'틀림없이 언제나'를 뜻하는 표준어는 '으레'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 114,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"환경을 위해 일회용품 사용을 ( )해야 한다.\"",
    "options": [
      "지양",
      "지향"
    ],
    "answer": "지양",
    "explanation": "'피하거나 하지 않음'은 '지양(止揚)'이고, '어떤 목표를 향해 나아감'은 '지향(志向)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 115,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구에게 ( ) 장난을 치면 안 돼.\"",
    "options": [
      "짓궂은",
      "짓굳은"
    ],
    "answer": "짓궂은",
    "explanation": "남을 궂게 대하는 장난기가 있다는 뜻의 표준어는 '짓궂다/짓궂은'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 116,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"방구석에 종일 ( ) 책만 읽었다.\"",
    "options": [
      "처박혀",
      "쳐박혀"
    ],
    "answer": "처박혀",
    "explanation": "'함부로'의 뜻을 더하는 접두사는 '처-'이므로 '처박히다/처박혀'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 117,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"슬픔을 딛고 마음을 잘 ( ) 보자.\"",
    "options": [
      "추스르고",
      "추스리고"
    ],
    "answer": "추스르고",
    "explanation": "기본형이 '추스르다'이므로 어미 '-고'가 붙어 '추스르고'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 118,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"다락방에서 ( ) 옛날 책을 발견했다.\"",
    "options": [
      "케케묵은",
      "퀘퀘묵은"
    ],
    "answer": "케케묵은",
    "explanation": "오래되어 낡은 것을 뜻하는 올바른 표준어는 '케케묵다/케케묵은'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 119,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"물풍선이 터지며 ( )으로 튀었다.\"",
    "options": [
      "풍비박산",
      "풍지박산"
    ],
    "answer": "풍비박산",
    "explanation": "사방으로 날아가 흩어짐을 뜻하는 고사성어 표준어는 '풍비박산(風飛雹散)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 120,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"잠이 덜 깨어 정신이 ( )하다.\"",
    "options": [
      "흐리멍덩",
      "흐리멍텅"
    ],
    "answer": "흐리멍덩",
    "explanation": "정신이 맑지 못하고 흐릿한 모양을 뜻하는 표준어는 '흐리멍덩하다'입니다.",
    "source": "바른 국어 맞춤법"
  }
];

// Embedded Static Files for 100% Zero-Stale Single-File Deployment
const EMBEDDED_FILES = {
  '/index.html': { type: 'text/html; charset=utf-8', content: "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>워터팡! 초등 맞춤법 퀴즈 배틀</title>\n  <link rel=\"stylesheet\" href=\"/css/style.css?v=2.0\">\n  <link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💧</text></svg>\">\n</head>\n<body>\n  <div id=\"app\">\n    <!-- Game Header -->\n    <header class=\"game-header\">\n      <div class=\"logo-title\">\n        <span>💧</span>\n        <span>워터팡! 맞춤법 배틀 <span style=\"background: #f59e0b; color: #451a03; font-size: 13px; padding: 2px 8px; border-radius: 12px; margin-left: 4px; font-weight: 900; vertical-align: middle;\">시즌 2</span></span>\n      </div>\n      <div class=\"user-quick-bar\" id=\"header-user-bar\" style=\"display: none;\">\n        <span class=\"tier-badge\" id=\"header-tier-badge\">💧 물방울 (100 RP)</span>\n        <span id=\"header-nickname\" style=\"font-size: 16px; font-weight: bold;\"></span>\n        <button class=\"btn-icon\" id=\"btn-sound-toggle\" title=\"소리 켜기/끄기\">🔊</button>\n        <button class=\"btn-icon\" id=\"btn-logout\" title=\"로그아웃\">🚪</button>\n      </div>\n    </header>\n\n    <!-- 1. Auth View (Login / Register / Quick Guest) -->\n    <section class=\"view-panel active\" id=\"view-auth\">\n      <div class=\"auth-container\">\n        <div class=\"auth-logo\">🎈💦</div>\n        <div class=\"auth-card\">\n          <h2 style=\"font-size: 26px; color: #0284c7; margin-bottom: 8px;\">신나는 맞춤법 퀴즈 대결!</h2>\n          <p style=\"font-size: 14px; color: #64748b; margin-bottom: 20px;\">\n            친구들과 1대 1로 물풍선을 던지며 맞춤법 왕이 되어보세요!\n          </p>\n\n          <!-- Auth Mode Tabs -->\n          <div class=\"auth-tabs\">\n            <button type=\"button\" class=\"auth-tab active\" id=\"tab-login\">기존 아이디 로그인</button>\n            <button type=\"button\" class=\"auth-tab\" id=\"tab-register\">새 계정 만들기</button>\n          </div>\n\n          <form id=\"form-auth\">\n            <div class=\"form-group\">\n              <label class=\"form-label\" for=\"auth-nickname\">내 닉네임 (아이디)</label>\n              <input type=\"text\" id=\"auth-nickname\" class=\"form-input\" placeholder=\"예: 번개람쥐 (2~10자)\" maxlength=\"12\" required>\n            </div>\n            <div class=\"form-group\">\n              <label class=\"form-label\" for=\"auth-password\">간편 비밀번호</label>\n              <input type=\"password\" id=\"auth-password\" class=\"form-input\" placeholder=\"비밀번호 (2자 이상)\" required>\n            </div>\n\n            <button type=\"submit\" class=\"btn-primary\" id=\"btn-submit-auth\">로그인하기</button>\n            <button type=\"button\" class=\"btn-sub\" id=\"btn-forgot-pw\" style=\"display: block; margin: 12px auto 0; font-size: 13px; color: #64748b; background: none; border: none; cursor: pointer; text-decoration: underline;\">비밀번호를 잊으셨나요?</button>\n          </form>\n        </div>\n      </div>\n    </section>\n\n    <!-- 2. Lobby View -->\n    <section class=\"view-panel\" id=\"view-lobby\">\n      <div class=\"lobby-grid\">\n        <!-- Profile Column -->\n        <div class=\"profile-card\">\n          <div class=\"profile-avatar-large\" id=\"lobby-avatar\">👦</div>\n          <h3 class=\"profile-name\" id=\"lobby-nickname\">학생</h3>\n          <div class=\"tier-badge\" id=\"lobby-tier-badge\" style=\"margin-bottom: 8px;\">💧 물방울 (100 RP)</div>\n          \n          <div class=\"stats-panel\">\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-wins\">0</div>\n              <div class=\"stat-label\">승리</div>\n            </div>\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-losses\">0</div>\n              <div class=\"stat-label\">패배</div>\n            </div>\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-winrate\">0%</div>\n              <div class=\"stat-label\">승률</div>\n            </div>\n          </div>\n\n          <div style=\"font-size: 13px; color: #64748b; width: 100%; text-align: left; margin-top: 4px;\">\n            다음 티어까지: <span id=\"tier-next-rp\" style=\"font-weight: bold; color: #0284c7;\">100 RP</span> 남음!\n          </div>\n        </div>\n\n        <!-- Main Action Column -->\n        <div class=\"lobby-main\">\n          <div class=\"hero-banner\">\n            <h2>실시간 1대 1 물풍선 배틀!</h2>\n            <p>\n              문제를 먼저 맞혀 물풍선을 날려보세요! 💥<br>\n              10문제를 풀고 승리하면 티어가 올라갑니다.\n            </p>\n            <div class=\"hero-water-balloon\">🎈</div>\n          </div>\n\n          <div class=\"action-cards\">\n            <button class=\"action-card-btn\" id=\"btn-open-leaderboard\">\n              <div class=\"action-icon\">🏆</div>\n              <div class=\"action-text\">\n                <div class=\"action-title\">명예의 전당 (시즌2)</div>\n                <div class=\"action-desc\">전체 학생 티어 순위 보기</div>\n              </div>\n            </button>\n\n            <button class=\"action-card-btn\" id=\"btn-open-wrongnotes\">\n              <div class=\"action-icon\">📝</div>\n              <div class=\"action-text\">\n                <div class=\"action-title\">나의 오답노트</div>\n                <div class=\"action-desc\">틀렸던 맞춤법 복습하기</div>\n              </div>\n            </button>\n          </div>\n\n          <button class=\"btn-primary btn-battle-start\" id=\"btn-start-matching\">\n            🚀 1대1 대결 시작! (랜덤 매칭)\n          </button>\n        </div>\n      </div>\n    </section>\n\n    <!-- 3. Matchmaking Queue View -->\n    <section class=\"view-panel\" id=\"view-matchmaking\">\n      <div class=\"matchmaking-container\">\n        <div class=\"radar-wrapper\">\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-icon\">🎯</div>\n        </div>\n        <h2 class=\"queue-status-text\">대결 상대를 찾는 중...</h2>\n        <p class=\"queue-subtext\">\n          매칭을 기다리는 친구가 없으면 <strong>3초 후 AI 봇</strong>과 대결이 시작됩니다!\n        </p>\n        <button class=\"btn-primary btn-accent\" id=\"btn-cancel-matching\" style=\"max-width: 240px;\">\n          매칭 취소\n        </button>\n      </div>\n    </section>\n\n    <!-- 4. Battle Arena View -->\n    <section class=\"view-panel\" id=\"view-battle\">\n      <div class=\"battle-container\" id=\"game-arena\">\n        <!-- Canvas for water balloons & particle explosions -->\n        <canvas id=\"battle-fx-canvas\"></canvas>\n\n        <!-- Battle Header -->\n        <div class=\"battle-top-bar\">\n          <div class=\"round-pill\" id=\"battle-round-indicator\">라운드 1 / 10</div>\n          <div class=\"battle-timer-box\">\n            <span>⏱️</span>\n            <span id=\"battle-timer-num\">10</span>s\n            <div class=\"timer-bar-bg\">\n              <div class=\"timer-bar-fill\" id=\"battle-timer-fill\"></div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Versus Arena Section -->\n        <div class=\"arena-versus\">\n          <!-- Player 1 (Me) -->\n          <div class=\"fighter-card\" id=\"fighter-p1\">\n            <div class=\"fighter-avatar\" id=\"avatar-p1\">👦\n              <div class=\"water-drips\">💦</div>\n            </div>\n            <div class=\"fighter-name\" id=\"name-p1\">나</div>\n            <div class=\"hp-gauge-wrapper\">\n              <div class=\"hp-text\">\n                <span>체력</span>\n                <span id=\"hp-num-p1\">100 / 100</span>\n              </div>\n              <div class=\"hp-bar-bg\">\n                <div class=\"hp-bar-fill\" id=\"hp-bar-p1\" style=\"width: 100%;\"></div>\n              </div>\n            </div>\n          </div>\n\n          <div class=\"vs-badge\">VS</div>\n\n          <!-- Player 2 (Opponent) -->\n          <div class=\"fighter-card\" id=\"fighter-p2\">\n            <div class=\"fighter-avatar\" id=\"avatar-p2\">🤖\n              <div class=\"water-drips\">💦</div>\n            </div>\n            <div class=\"fighter-name\" id=\"name-p2\">상대방</div>\n            <div class=\"hp-gauge-wrapper\">\n              <div class=\"hp-text\">\n                <span>체력</span>\n                <span id=\"hp-num-p2\">100 / 100</span>\n              </div>\n              <div class=\"hp-bar-bg\">\n                <div class=\"hp-bar-fill\" id=\"hp-bar-p2\" style=\"width: 100%;\"></div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Quiz Area -->\n        <div class=\"quiz-card\">\n          <div class=\"quiz-question\" id=\"quiz-question-text\">\n            문제를 불러오는 중입니다...\n          </div>\n\n          <div class=\"quiz-options-grid\" id=\"quiz-options-container\">\n            <!-- Buttons injected by app.js -->\n          </div>\n        </div>\n\n        <!-- Live Battle Action Banner -->\n        <div class=\"battle-banner\" id=\"battle-live-banner\">\n          문제를 먼저 맞히는 사람이 상대에게 물풍선을 던집니다!\n        </div>\n\n        <div class=\"explanation-box\" id=\"round-explanation-box\" style=\"display: none;\">\n          <!-- Educational spelling explanation -->\n        </div>\n      </div>\n    </section>\n\n    <!-- 5. Match Over View -->\n    <section class=\"view-panel\" id=\"view-match-over\">\n      <div class=\"match-over-container\">\n        <div class=\"result-crown\" id=\"result-emoji\">👑</div>\n        <h2 class=\"result-title win\" id=\"result-title\">대승리!</h2>\n        \n        <div class=\"rp-badge-change plus\" id=\"result-rp-badge\">\n          +25 RP 획득!\n        </div>\n\n        <div style=\"width: 100%; max-width: 600px; text-align: left; margin-bottom: 8px; font-weight: bold; color: #0284c7;\">\n          📖 이번 대결 오답/정답 퀴즈 복습\n        </div>\n        <div class=\"match-history-recap\" id=\"match-recap-list\">\n          <!-- Recap rounds injected here -->\n        </div>\n\n        <div style=\"display: flex; gap: 16px; width: 100%; max-width: 440px;\">\n          <button class=\"btn-primary\" id=\"btn-return-lobby\">로비로 이동</button>\n          <button class=\"btn-primary btn-accent\" id=\"btn-rematch\">다시 대결하기</button>\n        </div>\n      </div>\n    </section>\n\n    <!-- Modal: Leaderboard -->\n    <div class=\"modal-backdrop\" id=\"modal-leaderboard\">\n      <div class=\"modal-window\">\n        <div class=\"modal-header\">\n          <h3 id=\"leaderboard-modal-title\">🏆 명예의 전당 (시즌2)</h3>\n          <button class=\"btn-close\" id=\"btn-close-leaderboard\">✕</button>\n        </div>\n        <div class=\"modal-body\">\n          <div id=\"leaderboard-my-summary\"></div>\n          <div class=\"leaderboard-list\" id=\"leaderboard-container\">\n            <!-- Leaderboard rows -->\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <!-- Modal: Wrong Answer Note -->\n    <div class=\"modal-backdrop\" id=\"modal-wrongnotes\">\n      <div class=\"modal-window\">\n        <div class=\"modal-header\">\n          <h3>📝 나의 맞춤법 오답노트</h3>\n          <button class=\"btn-close\" id=\"btn-close-wrongnotes\">✕</button>\n        </div>\n        <div class=\"modal-body\" id=\"wrongnotes-container\">\n          <!-- Wrong answer cards -->\n        </div>\n      </div>\n    </div>\n\n    <!-- Toast message -->\n    <div class=\"toast-msg\" id=\"toast-notification\"></div>\n\n    <!-- Game Footer -->\n    <footer class=\"game-footer\">\n      <span>💧 워터팡! 초등 맞춤법 배틀</span>\n      <span class=\"footer-dot\">·</span>\n      <span class=\"footer-author\">made by 하하하하하쌤</span>\n    </footer>\n  </div>\n\n  <!-- Scripts -->\n  <script src=\"/js/audio.js?v=2.0\"></script>\n  <script src=\"/js/particles.js?v=2.0\"></script>\n  <script src=\"/js/app.js?v=2.0\"></script>\n</body>\n</html>\n" },
  '/css/style.css': { type: 'text/css; charset=utf-8', content: "@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;600;800;900&display=swap');\n\n:root {\n  --primary: #0284c7;\n  --primary-hover: #0369a1;\n  --accent: #f59e0b;\n  --danger: #ef4444;\n  --success: #10b981;\n  --bg-top: #0284c7;\n  --bg-bottom: #0f172a;\n  --card-bg: rgba(255, 255, 255, 0.95);\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n  user-select: none;\n}\n\nbody {\n  font-family: 'Jua', 'Noto Sans KR', sans-serif;\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%);\n  min-height: 100vh;\n  color: #1e293b;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  overflow-x: hidden;\n}\n\n/* Base Container */\n#app {\n  width: 100%;\n  max-width: 960px;\n  min-height: 640px;\n  background: #ffffff;\n  border-radius: 28px;\n  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 6px #38bdf8;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n}\n\n/* Header */\n.game-header {\n  background: linear-gradient(90deg, #0284c7, #38bdf8);\n  padding: 14px 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  color: white;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n  z-index: 10;\n}\n\n.logo-title {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-size: 24px;\n  letter-spacing: 0.5px;\n  text-shadow: 1px 2px 0px rgba(0, 0, 0, 0.2);\n}\n\n.user-quick-bar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.tier-badge {\n  background: rgba(255, 255, 255, 0.2);\n  padding: 6px 14px;\n  border-radius: 20px;\n  font-size: 15px;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid rgba(255, 255, 255, 0.4);\n  font-weight: bold;\n}\n\n.btn-icon {\n  background: rgba(255, 255, 255, 0.25);\n  border: none;\n  border-radius: 50%;\n  width: 38px;\n  height: 38px;\n  font-size: 18px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: white;\n  transition: all 0.15s;\n}\n\n.btn-icon:hover {\n  background: rgba(255, 255, 255, 0.45);\n  transform: scale(1.08);\n}\n\n/* Views Common */\n.view-panel {\n  display: none;\n  flex: 1;\n  padding: 24px;\n  flex-direction: column;\n  position: relative;\n}\n\n.view-panel.active {\n  display: flex;\n  animation: fadeIn 0.25s ease-out;\n}\n\n@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(8px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n/* Auth View */\n.auth-container {\n  max-width: 420px;\n  margin: auto;\n  text-align: center;\n}\n\n.auth-card {\n  background: #f8fafc;\n  padding: 32px 28px;\n  border-radius: 24px;\n  border: 3px solid #e2e8f0;\n  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);\n}\n\n.auth-logo {\n  font-size: 64px;\n  margin-bottom: 12px;\n  animation: floatBounce 2.5s infinite ease-in-out;\n}\n\n@keyframes floatBounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-8px); }\n}\n\n.auth-tabs {\n  display: flex;\n  background: #e2e8f0;\n  border-radius: 14px;\n  padding: 4px;\n  margin-bottom: 20px;\n  gap: 6px;\n}\n\n.auth-tab {\n  flex: 1;\n  padding: 10px 12px;\n  border: none;\n  background: transparent;\n  border-radius: 10px;\n  font-family: inherit;\n  font-size: 15px;\n  font-weight: bold;\n  color: #64748b;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n\n.auth-tab.active {\n  background: white;\n  color: #0284c7;\n  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);\n}\n\n.form-group {\n  margin-bottom: 16px;\n  text-align: left;\n}\n\n.form-label {\n  font-size: 14px;\n  color: #475569;\n  margin-bottom: 6px;\n  display: block;\n}\n\n.form-input {\n  width: 100%;\n  padding: 12px 16px;\n  border: 2px solid #cbd5e1;\n  border-radius: 14px;\n  font-size: 16px;\n  font-family: inherit;\n  outline: none;\n  transition: border-color 0.2s;\n}\n\n.form-input:focus {\n  border-color: #0284c7;\n  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);\n}\n\n/* Buttons */\n.btn-primary {\n  width: 100%;\n  padding: 14px 20px;\n  background: linear-gradient(180deg, #38bdf8, #0284c7);\n  border: none;\n  border-bottom: 4px solid #0369a1;\n  border-radius: 16px;\n  color: white;\n  font-size: 19px;\n  font-family: inherit;\n  font-weight: bold;\n  cursor: pointer;\n  transition: all 0.1s;\n  box-shadow: 0 6px 12px rgba(2, 132, 199, 0.3);\n}\n\n.btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 16px rgba(2, 132, 199, 0.4);\n}\n\n.btn-primary:active {\n  transform: translateY(2px);\n  border-bottom-width: 2px;\n}\n\n.btn-accent {\n  background: linear-gradient(180deg, #fbbf24, #f59e0b);\n  border-bottom: 4px solid #d97706;\n  color: #451a03;\n}\n\n.btn-accent:hover {\n  background: linear-gradient(180deg, #fcd34d, #f59e0b);\n}\n\n.btn-sub {\n  background: transparent;\n  border: none;\n  color: #64748b;\n  font-size: 14px;\n  font-family: inherit;\n  margin-top: 14px;\n  cursor: pointer;\n  text-decoration: underline;\n}\n\n/* Lobby View */\n.lobby-grid {\n  display: grid;\n  grid-template-columns: 320px 1fr;\n  gap: 24px;\n  flex: 1;\n}\n\n.profile-card {\n  background: linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%);\n  border: 3px solid #bae6fd;\n  border-radius: 24px;\n  padding: 24px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.profile-avatar-large {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: white;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.15);\n  border: 4px solid #38bdf8;\n  margin-bottom: 12px;\n}\n\n.profile-name {\n  font-size: 24px;\n  color: #0c4a6e;\n  margin-bottom: 6px;\n}\n\n.stats-panel {\n  width: 100%;\n  background: white;\n  border-radius: 16px;\n  padding: 14px;\n  margin: 16px 0;\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 8px;\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);\n}\n\n.stat-box {\n  text-align: center;\n}\n\n.stat-value {\n  font-size: 20px;\n  font-weight: bold;\n  color: #0369a1;\n}\n\n.stat-label {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.lobby-main {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n}\n\n.hero-banner {\n  background: linear-gradient(135deg, #38bdf8, #0ea5e9);\n  border-radius: 24px;\n  padding: 28px;\n  color: white;\n  position: relative;\n  overflow: hidden;\n  box-shadow: 0 10px 25px rgba(14, 165, 233, 0.25);\n}\n\n.hero-banner h2 {\n  font-size: 32px;\n  margin-bottom: 8px;\n  text-shadow: 1px 2px 0 rgba(0,0,0,0.2);\n}\n\n.hero-banner p {\n  font-size: 16px;\n  opacity: 0.95;\n  line-height: 1.5;\n}\n\n.hero-water-balloon {\n  position: absolute;\n  right: 20px;\n  bottom: -10px;\n  font-size: 90px;\n  opacity: 0.85;\n  transform: rotate(15deg);\n}\n\n.action-cards {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n  margin-top: 16px;\n}\n\n.action-card-btn {\n  background: white;\n  border: 3px solid #e2e8f0;\n  border-radius: 20px;\n  padding: 18px;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-family: inherit;\n}\n\n.action-card-btn:hover {\n  border-color: #38bdf8;\n  transform: translateY(-3px);\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);\n}\n\n.action-icon {\n  font-size: 34px;\n}\n\n.action-text {\n  text-align: left;\n}\n\n.action-title {\n  font-size: 17px;\n  font-weight: bold;\n  color: #1e293b;\n}\n\n.action-desc {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.btn-battle-start {\n  margin-top: 18px;\n  padding: 20px;\n  font-size: 26px;\n  letter-spacing: 1px;\n}\n\n/* Matchmaking Queue View */\n.matchmaking-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n  text-align: center;\n}\n\n.radar-wrapper {\n  position: relative;\n  width: 180px;\n  height: 180px;\n  margin-bottom: 24px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.radar-pulse {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  border: 3px solid #38bdf8;\n  animation: radarPulse 2s infinite ease-out;\n}\n\n.radar-pulse:nth-child(2) {\n  animation-delay: 0.6s;\n}\n\n.radar-pulse:nth-child(3) {\n  animation-delay: 1.2s;\n}\n\n@keyframes radarPulse {\n  0% { transform: scale(0.3); opacity: 1; }\n  100% { transform: scale(1.4); opacity: 0; }\n}\n\n.radar-icon {\n  font-size: 64px;\n  z-index: 2;\n}\n\n.queue-status-text {\n  font-size: 26px;\n  color: #0284c7;\n  margin-bottom: 8px;\n}\n\n.queue-subtext {\n  font-size: 15px;\n  color: #64748b;\n  margin-bottom: 24px;\n}\n\n/* Battle Arena View */\n.battle-container {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  position: relative;\n  height: 100%;\n}\n\n/* Canvas overlay for projectiles & splashes */\n#battle-fx-canvas {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 30;\n}\n\n.battle-top-bar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 4px 12px 14px;\n  border-bottom: 2px dashed #e2e8f0;\n}\n\n.round-pill {\n  background: #0284c7;\n  color: white;\n  padding: 6px 18px;\n  border-radius: 20px;\n  font-size: 18px;\n  font-weight: bold;\n}\n\n.battle-timer-box {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 22px;\n  color: #d97706;\n}\n\n.timer-bar-bg {\n  width: 180px;\n  height: 14px;\n  background: #e2e8f0;\n  border-radius: 8px;\n  overflow: hidden;\n}\n\n.timer-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);\n  width: 100%;\n  transition: width 0.1s linear;\n}\n\n/* Arena Versus Section */\n.arena-versus {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px 20px;\n  position: relative;\n}\n\n.fighter-card {\n  width: 220px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  transition: transform 0.2s;\n}\n\n.fighter-avatar {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: #f0f9ff;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);\n  position: relative;\n  transition: all 0.2s;\n}\n\n.fighter-card.drenched .fighter-avatar {\n  animation: drenchedShake 0.4s ease-in-out;\n  border-color: #ef4444;\n  background: #fee2e2;\n}\n\n@keyframes drenchedShake {\n  0%, 100% { transform: scale(1) rotate(0deg); }\n  25% { transform: scale(0.92) rotate(-8deg); }\n  75% { transform: scale(0.92) rotate(8deg); }\n}\n\n.water-drips {\n  display: none;\n  position: absolute;\n  bottom: -8px;\n  font-size: 20px;\n}\n\n.fighter-card.drenched .water-drips {\n  display: block;\n}\n\n.fighter-name {\n  font-size: 20px;\n  color: #1e293b;\n  margin-top: 8px;\n}\n\n.hp-gauge-wrapper {\n  width: 100%;\n  margin-top: 8px;\n}\n\n.hp-text {\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  color: #64748b;\n  margin-bottom: 4px;\n}\n\n.hp-bar-bg {\n  width: 100%;\n  height: 16px;\n  background: #e2e8f0;\n  border-radius: 10px;\n  overflow: hidden;\n  border: 2px solid #cbd5e1;\n}\n\n.hp-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #34d399);\n  width: 100%;\n  border-radius: 8px;\n  transition: width 0.35s ease-out, background 0.3s;\n}\n\n.hp-bar-fill.warning {\n  background: linear-gradient(90deg, #f59e0b, #fbbf24);\n}\n\n.hp-bar-fill.danger {\n  background: linear-gradient(90deg, #ef4444, #f87171);\n}\n\n.vs-badge {\n  font-size: 36px;\n  font-weight: 900;\n  color: #f59e0b;\n  text-shadow: 2px 3px 0 #b45309;\n  letter-spacing: 2px;\n}\n\n/* Quiz Arena */\n.quiz-card {\n  background: #f8fafc;\n  border: 3px solid #cbd5e1;\n  border-radius: 24px;\n  padding: 24px;\n  margin: 12px 0;\n  text-align: center;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);\n}\n\n.quiz-question {\n  font-size: 24px;\n  line-height: 1.45;\n  color: #0f172a;\n  white-space: pre-line;\n  margin-bottom: 20px;\n}\n\n.quiz-options-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n}\n\n.btn-option {\n  background: white;\n  border: 3px solid #94a3b8;\n  border-bottom: 6px solid #64748b;\n  border-radius: 18px;\n  padding: 18px 24px;\n  font-size: 26px;\n  font-weight: bold;\n  color: #1e293b;\n  cursor: pointer;\n  transition: all 0.1s;\n  font-family: inherit;\n}\n\n.btn-option:hover:not(:disabled) {\n  border-color: #0284c7;\n  border-bottom-color: #0369a1;\n  transform: translateY(-2px);\n  background: #f0f9ff;\n}\n\n.btn-option:active:not(:disabled) {\n  transform: translateY(3px);\n  border-bottom-width: 3px;\n}\n\n.btn-option:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.btn-option.correct-pick {\n  background: #dcfce7 !important;\n  border-color: #10b981 !important;\n  border-bottom-color: #059669 !important;\n  color: #065f46 !important;\n}\n\n.btn-option.wrong-pick {\n  background: #fee2e2 !important;\n  border-color: #ef4444 !important;\n  border-bottom-color: #b91c1c !important;\n  color: #991b1b !important;\n}\n\n/* Battle Action Banner */\n.battle-banner {\n  min-height: 60px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  font-size: 18px;\n  color: #0284c7;\n  background: #f0f9ff;\n  border-radius: 14px;\n  padding: 8px 16px;\n}\n\n.explanation-box {\n  background: #eff6ff;\n  border-left: 5px solid #3b82f6;\n  padding: 10px 14px;\n  border-radius: 8px;\n  font-size: 15px;\n  color: #1e40af;\n  margin-top: 6px;\n  text-align: left;\n}\n\n/* Screen Shake Classes */\n.screen-shake {\n  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n.screen-shake-intense {\n  animation: shakeIntense 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n@keyframes shake {\n  10%, 90% { transform: translate3d(-3px, 0, 0); }\n  20%, 80% { transform: translate3d(5px, 0, 0); }\n  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }\n  40%, 60% { transform: translate3d(6px, 0, 0); }\n}\n\n@keyframes shakeIntense {\n  10%, 90% { transform: translate3d(-6px, 3px, 0) rotate(-1deg); }\n  20%, 80% { transform: translate3d(8px, -4px, 0) rotate(1.5deg); }\n  30%, 50%, 70% { transform: translate3d(-10px, 5px, 0) rotate(-2deg); }\n  40%, 60% { transform: translate3d(10px, -5px, 0) rotate(2deg); }\n}\n\n/* Match Over View */\n.match-over-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  flex: 1;\n  padding: 16px 0;\n}\n\n.result-crown {\n  font-size: 72px;\n  animation: floatBounce 2s infinite ease-in-out;\n}\n\n.result-title {\n  font-size: 40px;\n  margin: 6px 0;\n}\n\n.result-title.win {\n  color: #f59e0b;\n  text-shadow: 2px 2px 0 #b45309;\n}\n\n.result-title.lose {\n  color: #64748b;\n}\n\n.result-title.draw {\n  color: #0284c7;\n}\n\n.rp-badge-change {\n  display: inline-block;\n  padding: 8px 24px;\n  border-radius: 24px;\n  font-size: 20px;\n  font-weight: bold;\n  margin-bottom: 16px;\n}\n\n.rp-badge-change.plus {\n  background: #dcfce7;\n  color: #166534;\n  border: 2px solid #86efac;\n}\n\n.rp-badge-change.minus {\n  background: #fee2e2;\n  color: #991b1b;\n  border: 2px solid #fca5a5;\n}\n\n.match-history-recap {\n  width: 100%;\n  max-height: 220px;\n  overflow-y: auto;\n  background: #f8fafc;\n  border-radius: 18px;\n  border: 2px solid #e2e8f0;\n  padding: 12px;\n  margin-bottom: 20px;\n}\n\n.recap-item {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 12px;\n  border-bottom: 1px solid #e2e8f0;\n  font-size: 14px;\n}\n\n.recap-item:last-child {\n  border-bottom: none;\n}\n\n/* Modals */\n.modal-backdrop {\n  display: none;\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: rgba(0, 0, 0, 0.6);\n  z-index: 100;\n  align-items: center;\n  justify-content: center;\n}\n\n.modal-backdrop.active {\n  display: flex;\n  animation: fadeIn 0.2s ease-out;\n}\n\n.modal-window {\n  background: white;\n  width: 90%;\n  max-width: 540px;\n  max-height: 80vh;\n  border-radius: 24px;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.modal-header {\n  background: #f0f9ff;\n  padding: 16px 20px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  border-bottom: 2px solid #e2e8f0;\n}\n\n.modal-header h3 {\n  font-size: 20px;\n  color: #0369a1;\n}\n\n.modal-body {\n  padding: 20px;\n  overflow-y: auto;\n  flex: 1;\n}\n\n/* Leaderboard & My Rank Styles */\n.my-rank-banner {\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);\n  color: white;\n  padding: 12px 16px;\n  border-radius: 14px;\n  margin-bottom: 14px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.my-rank-banner:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.35);\n}\n\n.my-rank-banner .my-rank-left {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.my-rank-banner .my-rank-label {\n  font-size: 12px;\n  opacity: 0.9;\n  font-weight: 600;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.my-rank-banner .my-rank-pos {\n  font-size: 22px;\n  font-weight: 800;\n  letter-spacing: -0.5px;\n}\n\n.my-rank-banner .my-rank-total {\n  font-size: 13px;\n  opacity: 0.85;\n  font-weight: 500;\n}\n\n.my-rank-banner .my-rank-right {\n  text-align: right;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: 2px;\n}\n\n.my-rank-banner .my-rank-tier {\n  font-size: 13px;\n  opacity: 0.95;\n  font-weight: 600;\n}\n\n.my-rank-banner .my-rank-rp {\n  font-size: 18px;\n  font-weight: 800;\n  color: #fef08a;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);\n}\n\n.my-rank-jump-hint {\n  font-size: 11px;\n  background: rgba(255, 255, 255, 0.22);\n  padding: 2px 8px;\n  border-radius: 10px;\n  margin-top: 2px;\n  display: inline-block;\n}\n\n.my-rank-banner.guest {\n  background: #f1f5f9;\n  color: #475569;\n  border: 1px dashed #cbd5e1;\n  box-shadow: none;\n  cursor: default;\n}\n\n.my-rank-banner.guest:hover {\n  transform: none;\n  box-shadow: none;\n}\n\n.leaderboard-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.leaderboard-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 10px 14px;\n  background: #f8fafc;\n  border-radius: 12px;\n  border: 1px solid #e2e8f0;\n  transition: all 0.2s ease;\n}\n\n.leaderboard-row.rank-1 {\n  background: #fef9c3;\n  border-color: #facc15;\n}\n\n.leaderboard-row.rank-2 {\n  background: #f8fafc;\n  border-color: #94a3b8;\n}\n\n.leaderboard-row.rank-3 {\n  background: #fff7ed;\n  border-color: #fdba74;\n}\n\n/* User's Own Ranking Highlight */\n.leaderboard-row.my-rank-row {\n  background: #eff6ff !important;\n  border: 2.5px solid #0284c7 !important;\n  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.28) !important;\n  position: relative;\n}\n\n.my-badge {\n  display: inline-block;\n  background: #0284c7;\n  color: white;\n  font-size: 11px;\n  font-weight: 800;\n  padding: 2px 8px;\n  border-radius: 10px;\n  margin-left: 6px;\n  vertical-align: middle;\n  box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);\n}\n\n@keyframes pulseMyRow {\n  0% { transform: scale(1); }\n  50% { transform: scale(1.025); }\n  100% { transform: scale(1); }\n}\n\n.leaderboard-row.pulse-highlight {\n  animation: pulseMyRow 0.5s ease-in-out 2;\n}\n\n.leaderboard-rank {\n  font-size: 18px;\n  font-weight: bold;\n  width: 36px;\n}\n\n.leaderboard-user {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n}\n\n.btn-close {\n  background: transparent;\n  border: none;\n  font-size: 22px;\n  cursor: pointer;\n  color: #64748b;\n}\n\n/* Toast Notification */\n.toast-msg {\n  position: fixed;\n  top: 20px;\n  left: 50%;\n  transform: translateX(-50%) translateY(-30px);\n  background: #0f172a;\n  color: white;\n  padding: 12px 24px;\n  border-radius: 20px;\n  font-size: 16px;\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);\n  opacity: 0;\n  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);\n  pointer-events: none;\n  z-index: 200;\n}\n\n.toast-msg.show {\n  transform: translateX(-50%) translateY(0);\n  opacity: 1;\n}\n\n/* Responsive adjustments */\n@media (max-width: 768px) {\n  #app {\n    border-radius: 0;\n    min-height: 100vh;\n    border: none;\n  }\n  .lobby-grid {\n    grid-template-columns: 1fr;\n  }\n  .arena-versus {\n    padding: 8px;\n  }\n  .fighter-avatar {\n    width: 80px;\n    height: 80px;\n    font-size: 50px;\n  }\n  .quiz-options-grid {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* Footer Style */\n.game-footer {\n  text-align: center;\n  padding: 12px 16px;\n  font-size: 13px;\n  color: #64748b;\n  background: #f8fafc;\n  border-top: 2px solid #e2e8f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  z-index: 20;\n  margin-top: auto;\n}\n\n.footer-dot {\n  opacity: 0.5;\n}\n\n.footer-author {\n  color: #0284c7;\n  font-weight: 800;\n}\n\n" },
  '/js/audio.js': { type: 'application/javascript; charset=utf-8', content: "// Procedural Web Audio API Sound Generator\n// Zero external assets required! 100% reliable and instantaneous.\n\nclass SoundFX {\n  constructor() {\n    this.ctx = null;\n    this.enabled = true;\n  }\n\n  init() {\n    try {\n      if (!this.ctx) {\n        const AudioContext = window.AudioContext || window.webkitAudioContext;\n        if (AudioContext) {\n          this.ctx = new AudioContext();\n        }\n      }\n      if (this.ctx && this.ctx.state === 'suspended') {\n        this.ctx.resume().catch(() => {});\n      }\n    } catch (e) {\n      console.warn('[Audio] Init ignored:', e.message);\n    }\n  }\n\n  toggle() {\n    this.enabled = !this.enabled;\n    return this.enabled;\n  }\n\n  // 1. Water balloon throw whoosh (휙!)\n  playThrow() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n      const filter = this.ctx.createBiquadFilter();\n\n      osc.type = 'sine';\n      osc.frequency.setValueAtTime(300, t);\n      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);\n      osc.frequency.exponentialRampToValueAtTime(200, t + 0.35);\n\n      filter.type = 'lowpass';\n      filter.frequency.setValueAtTime(1200, t);\n\n      gain.gain.setValueAtTime(0.01, t);\n      gain.gain.linearRampToValueAtTime(0.35, t + 0.1);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n      osc.connect(filter);\n      filter.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t);\n      osc.stop(t + 0.36);\n    } catch (e) {}\n  }\n\n  // 2. Water balloon hit & splash explosion (펑! 콰광!)\n  playSplash(isCritical = false) {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const duration = isCritical ? 0.6 : 0.45;\n\n      // White noise for water splash\n      const bufferSize = this.ctx.sampleRate * duration;\n      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);\n      const data = buffer.getChannelData(0);\n      for (let i = 0; i < bufferSize; i++) {\n        data[i] = Math.random() * 2 - 1;\n      }\n\n      const noise = this.ctx.createBufferSource();\n      noise.buffer = buffer;\n\n      const noiseFilter = this.ctx.createBiquadFilter();\n      noiseFilter.type = 'bandpass';\n      noiseFilter.frequency.setValueAtTime(isCritical ? 1400 : 900, t);\n      noiseFilter.frequency.exponentialRampToValueAtTime(200, t + duration);\n      noiseFilter.Q.setValueAtTime(2, t);\n\n      const noiseGain = this.ctx.createGain();\n      noiseGain.gain.setValueAtTime(isCritical ? 0.9 : 0.65, t);\n      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);\n\n      noise.connect(noiseFilter);\n      noiseFilter.connect(noiseGain);\n      noiseGain.connect(this.ctx.destination);\n\n      // Deep sub-bass punch impact\n      const punchOsc = this.ctx.createOscillator();\n      const punchGain = this.ctx.createGain();\n      punchOsc.type = 'triangle';\n      punchOsc.frequency.setValueAtTime(isCritical ? 180 : 130, t);\n      punchOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);\n\n      punchGain.gain.setValueAtTime(isCritical ? 0.8 : 0.5, t);\n      punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);\n\n      punchOsc.connect(punchGain);\n      punchGain.connect(this.ctx.destination);\n\n      noise.start(t);\n      punchOsc.start(t);\n      punchOsc.stop(t + 0.31);\n    } catch (e) {}\n  }\n\n  // 3. Ding-Dong Correct Sound (딩동댕!)\n  playCorrect() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6\n      const t = this.ctx.currentTime;\n\n      notes.forEach((freq, i) => {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n\n        osc.type = 'sine';\n        osc.frequency.setValueAtTime(freq, t + i * 0.08);\n\n        gain.gain.setValueAtTime(0.001, t + i * 0.08);\n        gain.gain.linearRampToValueAtTime(0.3, t + i * 0.08 + 0.02);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + i * 0.08);\n        osc.stop(t + i * 0.08 + 0.45);\n      });\n    } catch (e) {}\n  }\n\n  // 4. Buzzer Wrong Sound (삐-익!)\n  playWrong() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n\n      const osc1 = this.ctx.createOscillator();\n      const osc2 = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc1.type = 'sawtooth';\n      osc2.type = 'sawtooth';\n\n      osc1.frequency.setValueAtTime(140, t);\n      osc2.frequency.setValueAtTime(147, t); // dissonant dissonance\n\n      gain.gain.setValueAtTime(0.25, t);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n      osc1.connect(gain);\n      osc2.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc1.start(t);\n      osc2.start(t);\n      osc1.stop(t + 0.36);\n      osc2.stop(t + 0.36);\n    } catch (e) {}\n  }\n\n  // 5. Timer tick\n  playTick() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc.type = 'triangle';\n      osc.frequency.setValueAtTime(800, t);\n\n      gain.gain.setValueAtTime(0.15, t);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);\n\n      osc.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t);\n      osc.stop(t + 0.06);\n    } catch (e) {}\n  }\n\n  // 6. Match Victory Fanfare\n  playVictory() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const chords = [\n        { notes: [523.25, 659.25], time: 0, dur: 0.18 },\n        { notes: [523.25, 659.25], time: 0.2, dur: 0.18 },\n        { notes: [523.25, 659.25], time: 0.4, dur: 0.18 },\n        { notes: [659.25, 783.99, 1046.50], time: 0.65, dur: 0.8 }\n      ];\n\n      chords.forEach(c => {\n        c.notes.forEach(freq => {\n          const osc = this.ctx.createOscillator();\n          const gain = this.ctx.createGain();\n          osc.type = 'triangle';\n          osc.frequency.setValueAtTime(freq, t + c.time);\n\n          gain.gain.setValueAtTime(0.01, t + c.time);\n          gain.gain.linearRampToValueAtTime(0.25, t + c.time + 0.03);\n          gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);\n\n          osc.connect(gain);\n          gain.connect(this.ctx.destination);\n\n          osc.start(t + c.time);\n          osc.stop(t + c.time + c.dur + 0.05);\n        });\n      });\n    } catch (e) {}\n  }\n\n  // 7. Defeat Sad sound\n  playDefeat() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const notes = [440, 415.3, 392, 349.2];\n      notes.forEach((freq, i) => {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n        osc.type = 'sawtooth';\n        osc.frequency.setValueAtTime(freq, t + i * 0.25);\n\n        gain.gain.setValueAtTime(0.18, t + i * 0.25);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.28);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + i * 0.25);\n        osc.stop(t + i * 0.25 + 0.3);\n      });\n    } catch (e) {}\n  }\n}\n\nwindow.soundFX = new SoundFX();\n" },
  '/js/particles.js': { type: 'application/javascript; charset=utf-8', content: "// Dynamic Water Balloon & Splash Particle FX Engine\n\nclass BattleFX {\n  constructor(canvasId) {\n    this.canvas = document.getElementById(canvasId);\n    this.ctx = this.canvas.getContext('2d');\n    this.projectiles = [];\n    this.particles = [];\n    this.shockwaves = [];\n    this.floatingTexts = [];\n    this.animating = false;\n\n    this.resize();\n    window.addEventListener('resize', () => this.resize());\n    this.loop();\n  }\n\n  resize() {\n    if (!this.canvas) return;\n    const rect = this.canvas.parentElement.getBoundingClientRect();\n    this.canvas.width = rect.width;\n    this.canvas.height = rect.height;\n  }\n\n  // Launch a water balloon from player to opponent (or vice versa)\n  throwBalloon(fromPos, toPos, isCritical, damage, onHitCallback) {\n    window.soundFX.playThrow();\n\n    const duration = 650; // ms flight time\n    const heightArc = Math.min(180, Math.abs(toPos.x - fromPos.x) * 0.35 + 80);\n\n    const projectile = {\n      startX: fromPos.x,\n      startY: fromPos.y,\n      targetX: toPos.x,\n      targetY: toPos.y,\n      heightArc,\n      startTime: performance.now(),\n      duration,\n      isCritical,\n      damage,\n      onHitCallback,\n      color: isCritical ? '#00e5ff' : '#00b0ff',\n      tailParticles: []\n    };\n\n    this.projectiles.push(projectile);\n  }\n\n  // Create splash explosion at coordinates\n  createSplash(x, y, isCritical, damage) {\n    window.soundFX.playSplash(isCritical);\n\n    // Screen Shake effect\n    this.triggerScreenShake(isCritical ? 14 : 8);\n\n    // 1. Water Shockwave Ripple\n    this.shockwaves.push({\n      x,\n      y,\n      radius: 10,\n      maxRadius: isCritical ? 130 : 90,\n      opacity: 0.9,\n      color: isCritical ? 'rgba(0, 229, 255,' : 'rgba(56, 189, 248,'\n    });\n\n    // 2. 45 Water Droplets Explosion\n    const dropletCount = isCritical ? 55 : 38;\n    for (let i = 0; i < dropletCount; i++) {\n      const angle = Math.random() * Math.PI * 2;\n      const speed = Math.random() * (isCritical ? 14 : 10) + 3;\n      const size = Math.random() * 6 + 3;\n      this.particles.push({\n        x,\n        y,\n        vx: Math.cos(angle) * speed,\n        vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // bias upwards\n        size,\n        color: Math.random() > 0.3 ? '#38bdf8' : '#e0f2fe',\n        alpha: 1,\n        decay: Math.random() * 0.02 + 0.015,\n        gravity: 0.38\n      });\n    }\n\n    // 3. Floating Damage / Critical Text\n    this.floatingTexts.push({\n      x: x + (Math.random() * 40 - 20),\n      y: y - 20,\n      text: isCritical ? `⚡-${damage} 치명타!` : `💥-${damage} HP`,\n      color: isCritical ? '#facc15' : '#ef4444',\n      fontSize: isCritical ? 34 : 26,\n      alpha: 1,\n      vy: -2.2,\n      scale: 1.4\n    });\n  }\n\n  triggerScreenShake(intensity = 10) {\n    const container = document.getElementById('game-arena') || document.body;\n    container.classList.remove('screen-shake', 'screen-shake-intense');\n    void container.offsetWidth; // trigger reflow\n    container.classList.add(intensity > 10 ? 'screen-shake-intense' : 'screen-shake');\n    setTimeout(() => {\n      container.classList.remove('screen-shake', 'screen-shake-intense');\n    }, 450);\n  }\n\n  loop() {\n    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n    const now = performance.now();\n\n    // 1. Update & Draw Projectiles\n    for (let i = this.projectiles.length - 1; i >= 0; i--) {\n      const p = this.projectiles[i];\n      const progress = Math.min(1, (now - p.startTime) / p.duration);\n\n      // Parabolic Arc calculation\n      const curX = p.startX + (p.targetX - p.startX) * progress;\n      const linearY = p.startY + (p.targetY - p.startY) * progress;\n      const arcY = -4 * p.heightArc * progress * (1 - progress);\n      const curY = linearY + arcY;\n\n      // Draw Water Balloon\n      this.ctx.save();\n      this.ctx.translate(curX, curY);\n\n      // Slight rotation & liquid squish effect\n      const squish = 1 + Math.sin(progress * Math.PI * 4) * 0.18;\n      this.ctx.scale(squish, 2 - squish);\n\n      // Water Balloon Body\n      const grad = this.ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);\n      grad.addColorStop(0, '#ffffff');\n      grad.addColorStop(0.3, p.color);\n      grad.addColorStop(1, '#0284c7');\n\n      this.ctx.beginPath();\n      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);\n      this.ctx.fillStyle = grad;\n      this.ctx.shadowColor = p.color;\n      this.ctx.shadowBlur = p.isCritical ? 18 : 10;\n      this.ctx.fill();\n\n      // Balloon tie knot\n      this.ctx.beginPath();\n      this.ctx.ellipse(progress < 0.5 ? -15 : 15, 2, 4, 6, 0, 0, Math.PI * 2);\n      this.ctx.fillStyle = '#0369a1';\n      this.ctx.fill();\n\n      this.ctx.restore();\n\n      // Water droplet trail\n      if (Math.random() > 0.2) {\n        this.particles.push({\n          x: curX,\n          y: curY,\n          vx: (Math.random() - 0.5) * 2,\n          vy: Math.random() * 2,\n          size: Math.random() * 4 + 2,\n          color: '#7dd3fc',\n          alpha: 0.8,\n          decay: 0.05,\n          gravity: 0.1\n        });\n      }\n\n      if (progress >= 1) {\n        // Hit!\n        this.createSplash(p.targetX, p.targetY, p.isCritical, p.damage);\n        if (p.onHitCallback) p.onHitCallback();\n        this.projectiles.splice(i, 1);\n      }\n    }\n\n    // 2. Shockwaves\n    for (let i = this.shockwaves.length - 1; i >= 0; i--) {\n      const sw = this.shockwaves[i];\n      sw.radius += (sw.maxRadius - sw.radius) * 0.18;\n      sw.opacity -= 0.035;\n\n      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius - 2) {\n        this.shockwaves.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.beginPath();\n      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);\n      this.ctx.strokeStyle = `${sw.color}${sw.opacity})`;\n      this.ctx.lineWidth = 5 * sw.opacity;\n      this.ctx.stroke();\n      this.ctx.restore();\n    }\n\n    // 3. Water Particles\n    for (let i = this.particles.length - 1; i >= 0; i--) {\n      const pt = this.particles[i];\n      pt.x += pt.vx;\n      pt.y += pt.vy;\n      pt.vy += pt.gravity;\n      pt.alpha -= pt.decay;\n\n      if (pt.alpha <= 0) {\n        this.particles.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = pt.alpha;\n      this.ctx.fillStyle = pt.color;\n      this.ctx.beginPath();\n      this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);\n      this.ctx.fill();\n      this.ctx.restore();\n    }\n\n    // 4. Floating Damage Text\n    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {\n      const ft = this.floatingTexts[i];\n      ft.y += ft.vy;\n      ft.alpha -= 0.02;\n      ft.scale = Math.max(1, ft.scale - 0.03);\n\n      if (ft.alpha <= 0) {\n        this.floatingTexts.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = ft.alpha;\n      this.ctx.font = `900 ${ft.fontSize * ft.scale}px 'Jua', 'Pretendard', sans-serif`;\n      this.ctx.textAlign = 'center';\n\n      // Outline\n      this.ctx.lineWidth = 5;\n      this.ctx.strokeStyle = '#000000';\n      this.ctx.strokeText(ft.text, ft.x, ft.y);\n\n      // Fill\n      this.ctx.fillStyle = ft.color;\n      this.ctx.fillText(ft.text, ft.x, ft.y);\n      this.ctx.restore();\n    }\n\n    requestAnimationFrame(() => this.loop());\n  }\n}\n\nwindow.BattleFX = BattleFX;\n" },
  '/js/app.js': { type: 'application/javascript; charset=utf-8', content: "// -------------------------------------------------------------\n// Season 2 Storage Keys & Tier Definition\n// -------------------------------------------------------------\nconst STORAGE_KEYS = {\n  USER: 'waterpang_s2_user',\n  LEADERBOARD: 'waterpang_s2_leaderboard',\n  LEGACY_USER: 'waterpang_user',\n  LEGACY_LEADERBOARD: 'waterpang_leaderboard',\n  HALL_OF_FAME: 'waterpang_s1_hall_of_fame',\n  WRONG_NOTES_PREFIX: 'waterpang_wrongnotes_'\n};\n\nfunction getTierInfo(rp) {\n  if (rp >= 1400) {\n    return { name: '맞춤법 제왕', rank: 'MASTER', badge: '👑', color: '#8b5cf6', min: 1400, max: 2000 };\n  } else if (rp >= 900) {\n    return { name: '번개 물대포', rank: 'DIAMOND', badge: '⚡', color: '#06b6d4', min: 900, max: 1399 };\n  } else if (rp >= 500) {\n    return { name: '파도 전사', rank: 'GOLD', badge: '🌊', color: '#eab308', min: 500, max: 899 };\n  } else if (rp >= 200) {\n    return { name: '꼬마 물풍선', rank: 'SILVER', badge: '🎈', color: '#3b82f6', min: 200, max: 499 };\n  } else {\n    return { name: '물방울', rank: 'BRONZE', badge: '💧', color: '#10b981', min: 0, max: 199 };\n  }\n}\n\nasync function refreshLeaderboardCache() {\n  try {\n    const res = await fetch('/api/leaderboard');\n    if (res.ok) {\n      const data = await res.json();\n      if (data.ok && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {\n        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));\n      }\n    }\n  } catch (e) {}\n}\n\n// Main Game Application Logic\n\nlet currentUser = null;\nlet currentRoomId = null;\nlet eventSource = null;\nlet battleFX = null;\nlet roundTimerInterval = null;\nlet roundTimeRemaining = 10;\nlet hasAnsweredCurrentRound = false;\n\n// DOM Elements\nconst views = {\n  auth: document.getElementById('view-auth'),\n  lobby: document.getElementById('view-lobby'),\n  matchmaking: document.getElementById('view-matchmaking'),\n  battle: document.getElementById('view-battle'),\n  matchOver: document.getElementById('view-match-over')\n};\n\nfunction showView(name) {\n  Object.values(views).forEach(v => v.classList.remove('active'));\n  if (views[name]) {\n    views[name].classList.add('active');\n  }\n  if (name === 'battle' && battleFX) {\n    setTimeout(() => battleFX.resize(), 100);\n  }\n}\n\nfunction showToast(msg) {\n  const toast = document.getElementById('toast-notification');\n  toast.innerText = msg;\n  toast.classList.add('show');\n  setTimeout(() => toast.classList.remove('show'), 2600);\n}\n\n// Prohibited word dictionary (Profanity, slurs, family insults)\nconst PROHIBITED_KEYWORDS = [\n  // User requested explicit keywords\n  'ㅄ', 'ㅂㅅ', '병신', '븅신', '등신',\n  '엄마', '아빠', '느금', '애미', '애비', '어미', '아비', '모친', '부친', '패드립',\n\n  // Profanity / Slurs\n  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '시바', '씨바', '시팔', '씨팔', '씹', '썅',\n  '개새', '새끼', 'ㅅㄲ', '개년',\n  '좆', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ',\n  '미친', 'ㅁㅊ', '꺼져', '닥쳐',\n\n  // Sexual / Vulgar\n  '보지', '자지', '섹스', '쎅스', '자위', '딸딸이', '성관계',\n\n  // Insults & Foreign Profanity\n  'ㅗ', 'fuck', 'shit', 'bitch', '법규',\n  '엠창', '창녀', '걸레',\n  '자살', '뒈져', '죽어',\n\n  // Hate / Discrimination\n  '일베', '노무현', '운지', '메갈', '한남', '한녀', '틀딱', '맘충'\n];\n\nfunction isProhibitedNickname(nickname) {\n  if (!nickname || typeof nickname !== 'string') return { prohibited: false };\n  const clean = nickname.replace(/[\\s_\\-\\.\\,\\~\\!\\@\\#\\$\\%\\^\\&\\*\\(\\)\\=\\+\\/\\\\\\|\\?\\:\\;\\'\\\"\\[\\]\\{\\}\\<\\>]/g, '').toLowerCase();\n  for (const word of PROHIBITED_KEYWORDS) {\n    if (clean.includes(word.toLowerCase())) {\n      return { prohibited: true, matched: word };\n    }\n  }\n  return { prohibited: false };\n}\n\n// -------------------------------------------------------------\n// Initialization & Auth\n// -------------------------------------------------------------\ndocument.addEventListener('DOMContentLoaded', () => {\n  battleFX = new BattleFX('battle-fx-canvas');\n\n  // Check Season 2 saved session or migrate seamlessly from Season 1\n  let saved = localStorage.getItem(STORAGE_KEYS.USER);\n  if (!saved) {\n    const legacySaved = localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n    if (legacySaved) {\n      try {\n        const legacyParsed = JSON.parse(legacySaved);\n        if (legacyParsed && legacyParsed.nickname) {\n          console.log('[Season 2] Migrating account to Season 2:', legacyParsed.nickname);\n          const s2User = {\n            id: legacyParsed.id || ('user_' + Math.random().toString(36).substring(2, 9)),\n            nickname: legacyParsed.nickname,\n            password: legacyParsed.password || 'saved_user',\n            rp: 100,\n            wins: 0,\n            losses: 0,\n            draws: 0,\n            season: 2,\n            season1_rp: legacyParsed.rp || 100,\n            avatar: legacyParsed.avatar || '👦',\n            tier: getTierInfo(100)\n          };\n          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(s2User));\n          saved = JSON.stringify(s2User);\n        }\n      } catch (e) {\n        console.warn('Legacy migration error:', e);\n      }\n    }\n  }\n\n  if (saved) {\n    try {\n      const parsed = JSON.parse(saved);\n      if (parsed && parsed.nickname) {\n        if (isProhibitedNickname(parsed.nickname).prohibited) {\n          localStorage.removeItem(STORAGE_KEYS.USER);\n          alert('❌ 부적절한 닉네임으로 인해 계정 이용이 제한되었습니다.\\n새로운 바른 닉네임으로 계정을 만들어주세요!');\n          showView('auth');\n          refreshLeaderboardCache();\n          setupEventListeners();\n          return;\n        }\n        currentUser = parsed;\n        updateUserData(parsed);\n        showView('lobby');\n        initSSE(parsed.id);\n        // Proactively restore and sync account + leaderboard with server, then fetch verified profile\n        syncUserWithServer(parsed).then(() => {\n          fetchProfile(parsed.id);\n        });\n        refreshLeaderboardCache();\n      }\n    } catch (e) {\n      console.warn('Session parse warning:', e);\n    }\n  } else {\n    refreshLeaderboardCache();\n  }\n\n  setupEventListeners();\n});\n\nfunction setupEventListeners() {\n  // Sound toggle\n  const btnSound = document.getElementById('btn-sound-toggle');\n  btnSound.addEventListener('click', () => {\n    const on = window.soundFX.toggle();\n    btnSound.innerText = on ? '🔊' : '🔇';\n    showToast(on ? '소리가 켜졌습니다.' : '소리가 꺼졌습니다.');\n  });\n\n  // Logout\n  document.getElementById('btn-logout').addEventListener('click', () => {\n    if (confirm('로그아웃 하시겠습니까?')) {\n      logout();\n    }\n  });\n\n  // Auth Form & Tabs\n  let authMode = 'login'; // 'login' or 'register'\n  const tabLogin = document.getElementById('tab-login');\n  const tabRegister = document.getElementById('tab-register');\n  const btnSubmitAuth = document.getElementById('btn-submit-auth');\n  const btnForgot = document.getElementById('btn-forgot-pw');\n\n  tabLogin.addEventListener('click', () => {\n    authMode = 'login';\n    tabLogin.classList.add('active');\n    tabRegister.classList.remove('active');\n    btnSubmitAuth.innerText = '로그인하기';\n    if (btnForgot) btnForgot.style.display = 'block';\n  });\n\n  tabRegister.addEventListener('click', () => {\n    authMode = 'register';\n    tabRegister.classList.add('active');\n    tabLogin.classList.remove('active');\n    btnSubmitAuth.innerText = '새 계정 생성하기';\n    if (btnForgot) btnForgot.style.display = 'none';\n  });\n\n  if (btnForgot) {\n    btnForgot.addEventListener('click', () => {\n      alert('💡 [비밀번호 안내]\\n\\n1. 서버 재시작으로 복원된 계정은 간편 비밀번호로 \"saved_user\"를 입력하시면 바로 접속됩니다!\\n2. 혹시 이미 다른 친구가 사용 중인 닉네임인지 확인해보세요.\\n3. 비밀번호를 완전히 잊으신 경우 선생님께 요청하시면 비밀번호를 초기화해주실 수 있습니다.');\n    });\n  }\n\n  document.getElementById('form-auth').addEventListener('submit', async (e) => {\n    e.preventDefault();\n    const nickname = document.getElementById('auth-nickname').value.trim();\n    const password = document.getElementById('auth-password').value;\n\n    if (!nickname || !password) return;\n\n    if (isProhibitedNickname(nickname).prohibited) {\n      alert('❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 사용할 수 없습니다.\\n바르고 고운 닉네임을 사용해주세요!');\n      return;\n    }\n\n    try {\n      if (authMode === 'register') {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch('/api/register', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok && data.user) {\n          showToast(`'${data.user.nickname}' 계정이 생성되었습니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || '계정 생성에 실패했습니다.');\n        }\n      } else {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch('/api/login', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok && data.user) {\n          showToast(`'${data.user.nickname}' 님 환영합니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || '로그인에 실패했습니다.');\n        }\n      }\n    } catch (err) {\n      alert('서버 연결 오류가 발생했습니다.');\n    }\n  });\n\n  // Lobby actions\n  document.getElementById('btn-start-matching').addEventListener('click', startMatching);\n  document.getElementById('btn-cancel-matching').addEventListener('click', cancelMatching);\n  document.getElementById('btn-return-lobby').addEventListener('click', () => {\n    if (currentUser) fetchProfile(currentUser.id);\n    showView('lobby');\n  });\n  document.getElementById('btn-rematch').addEventListener('click', () => {\n    startMatching();\n  });\n\n  // Modals\n  document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);\n  document.getElementById('btn-close-leaderboard').addEventListener('click', () => {\n    document.getElementById('modal-leaderboard').classList.remove('active');\n  });\n\n  document.getElementById('btn-open-wrongnotes').addEventListener('click', openWrongNotes);\n  document.getElementById('btn-close-wrongnotes').addEventListener('click', () => {\n    document.getElementById('modal-wrongnotes').classList.remove('active');\n  });\n}\n\nfunction updateUserData(user) {\n  currentUser = user;\n  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));\n\n  // Update Header\n  document.getElementById('header-user-bar').style.display = 'flex';\n  document.getElementById('header-nickname').innerText = user.nickname;\n  updateTierBadge('header-tier-badge', user.tier, user.rp);\n\n  // Update Lobby\n  updateLobbyUI(user);\n}\n\nfunction loginSuccess(user) {\n  updateUserData(user);\n  showView('lobby');\n\n  // Connect SSE\n  initSSE(user.id);\n\n  // Auto-sync and cache leaderboard in background\n  syncUserWithServer(user);\n  refreshLeaderboardCache();\n}\n\nfunction logout() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  if (eventSource) {\n    eventSource.close();\n    eventSource = null;\n  }\n  currentUser = null;\n  localStorage.removeItem(STORAGE_KEYS.USER);\n  document.getElementById('header-user-bar').style.display = 'none';\n  showView('auth');\n}\n\nasync function syncUserWithServer(userToSync) {\n  if (!userToSync || !userToSync.nickname) return;\n  try {\n    let leaderboardSnapshot = [];\n    try {\n      const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n      if (cached) leaderboardSnapshot = JSON.parse(cached);\n    } catch (e) {}\n\n    const res = await fetch('/api/user/sync', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        user: userToSync,\n        leaderboardSnapshot\n      })\n    });\n    const data = await res.json();\n    if (data.ok && data.user) {\n      console.log('[Sync] Account successfully preserved & restored with server:', data.user.nickname);\n      updateUserData(data.user);\n      return data.user;\n    }\n  } catch (err) {\n    console.warn('[Sync] Server sync failed (offline or container starting):', err);\n  }\n}\n\nasync function fetchProfile(userId) {\n  try {\n    const res = await fetch(`/api/profile?userId=${userId}&_t=${Date.now()}`);\n    const data = await res.json();\n    if (data.ok && data.user) {\n      // Anti-downgrade shield: Protect local verified RP from lower server value\n      if (currentUser && typeof currentUser.rp === 'number') {\n        if (data.user.rp < currentUser.rp) {\n          console.warn(`[Profile] Anti-downgrade shield: Server RP (${data.user.rp}) is lower than local verified RP (${currentUser.rp}). Syncing higher RP to server.`);\n          await syncUserWithServer(currentUser);\n          return;\n        }\n      }\n      updateUserData(data.user);\n    } else if (currentUser) {\n      // Container restarted on Render! Automatically sync and resurrect account\n      await syncUserWithServer(currentUser);\n    }\n  } catch (err) {\n    console.warn('[Profile] fetch error, syncing with server:', err);\n    if (currentUser) {\n      await syncUserWithServer(currentUser);\n    }\n  }\n}\n\nfunction updateTierBadge(elementId, tier, rp) {\n  const el = document.getElementById(elementId);\n  if (!el || !tier) return;\n  el.innerText = `${tier.badge} ${tier.name} (${rp} RP)`;\n  el.style.borderColor = tier.color;\n}\n\nfunction updateLobbyUI(user) {\n  document.getElementById('lobby-nickname').innerText = user.nickname;\n  updateTierBadge('lobby-tier-badge', user.tier, user.rp);\n  document.getElementById('stat-wins').innerText = user.wins;\n  document.getElementById('stat-losses').innerText = user.losses;\n\n  const total = user.wins + user.losses;\n  const rate = total > 0 ? Math.round((user.wins / total) * 100) : 0;\n  document.getElementById('stat-winrate').innerText = `${rate}%`;\n\n  const nextThreshold = user.tier ? user.tier.max + 1 : 200;\n  const needed = Math.max(0, nextThreshold - user.rp);\n  document.getElementById('tier-next-rp').innerText = `${needed} RP`;\n}\n\n// -------------------------------------------------------------\n// SSE Real-Time Communication\n// -------------------------------------------------------------\nfunction initSSE(userId) {\n  if (eventSource) {\n    if (eventSource.readyState !== EventSource.CLOSED && eventSource.url.includes(`userId=${userId}`)) {\n      return; // Already actively connected\n    }\n    eventSource.close();\n  }\n\n  eventSource = new EventSource(`/api/events?userId=${userId}`);\n\n  eventSource.onopen = () => {\n    console.log('[SSE] Stream connected successfully');\n  };\n\n  eventSource.onmessage = (event) => {\n    try {\n      const msg = JSON.parse(event.data);\n      handleServerEvent(msg.type, msg.payload);\n    } catch (e) {\n      console.error('[SSE] Parse error:', e);\n    }\n  };\n\n  eventSource.onerror = () => {\n    console.warn('[SSE] Connection lost, browser will auto-retry...');\n  };\n}\n\nfunction handleServerEvent(type, payload) {\n  console.log('[Game Event]', type, payload);\n\n  switch (type) {\n    case 'MATCH_FOUND':\n      onMatchFound(payload);\n      break;\n    case 'ROUND_START':\n      onRoundStart(payload);\n      break;\n    case 'ATTACK':\n    case 'ROUND_RESULT':\n      onRoundResult(payload);\n      break;\n    case 'WRONG_ANSWER':\n      onWrongAnswer(payload);\n      break;\n    case 'MATCH_OVER':\n      onMatchOver(payload);\n      break;\n  }\n}\n\n// -------------------------------------------------------------\n// -------------------------------------------------------------\n// Matchmaking Flow (Dual-Channel: SSE + Guaranteed Polling Fallback)\n// -------------------------------------------------------------\nlet matchPollingInterval = null;\nlet isMatchingInProgress = false;\n\nasync function startMatching() {\n  if (!currentUser || isMatchingInProgress) return;\n  isMatchingInProgress = true;\n\n  const btnStart = document.getElementById('btn-start-matching');\n  if (btnStart) btnStart.disabled = true;\n\n  initSSE(currentUser.id);\n\n  currentRoomId = null;\n  battleData = null;\n  showView('matchmaking');\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  try {\n    const res = await fetch('/api/match/join', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n    const data = await res.json();\n    if (!data.ok) {\n      isMatchingInProgress = false;\n      if (btnStart) btnStart.disabled = false;\n      alert(data.error || '매칭 시작 실패');\n      showView('lobby');\n      return;\n    }\n\n    // 1. Instant match returned directly in join response\n    if (data.result && data.result.status === 'MATCHED' && data.result.roomData) {\n      console.log('[Match] Instant match via join response:', data.result.roomData);\n      onMatchFound(data.result.roomData);\n      return;\n    }\n\n    // 2. Dual-channel polling check (every 1000ms) to ensure neither player ever gets stuck\n    matchPollingInterval = setInterval(async () => {\n      const viewEl = document.getElementById('view-matchmaking');\n      if (!viewEl || !viewEl.classList.contains('active')) {\n        clearInterval(matchPollingInterval);\n        matchPollingInterval = null;\n        isMatchingInProgress = false;\n        if (btnStart) btnStart.disabled = false;\n        return;\n      }\n\n      try {\n        const pollRes = await fetch(`/api/match/status?userId=${currentUser.id}&_t=${Date.now()}`);\n        const pollData = await pollRes.json();\n        if (pollData.ok && pollData.status === 'MATCHED' && pollData.roomData) {\n          console.log('[Match] Polling detected match:', pollData.roomData);\n          clearInterval(matchPollingInterval);\n          matchPollingInterval = null;\n          onMatchFound(pollData.roomData);\n        }\n      } catch (e) {\n        // network polling error ignored\n      }\n    }, 1000);\n\n  } catch (e) {\n    isMatchingInProgress = false;\n    if (btnStart) btnStart.disabled = false;\n    alert('서버 연결 실패');\n    showView('lobby');\n  }\n}\n\nasync function cancelMatching() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  isMatchingInProgress = false;\n  const btnStart = document.getElementById('btn-start-matching');\n  if (btnStart) btnStart.disabled = false;\n\n  if (!currentUser) return;\n  try {\n    await fetch('/api/match/cancel', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n  } catch (e) {}\n  showView('lobby');\n}\n\n// -------------------------------------------------------------\n// Battle Scene\n// -------------------------------------------------------------\nlet battleData = null;\nlet battleSyncInterval = null;\nlet currentClientRound = 0;\n\nfunction onMatchFound(data) {\n  isMatchingInProgress = false;\n  const btnStart = document.getElementById('btn-start-matching');\n  if (btnStart) btnStart.disabled = false;\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  // Prevent duplicate execution if both SSE and polling trigger simultaneously\n  if (battleData && currentRoomId === data.roomId && views.battle.classList.contains('active')) {\n    return;\n  }\n\n  battleData = data;\n  currentRoomId = data.roomId;\n\n  // Setup Fighters\n  const isMeP1 = (data.p1.id === currentUser.id);\n  const myData = isMeP1 ? data.p1 : data.p2;\n  const oppData = isMeP1 ? data.p2 : data.p1;\n\n  document.getElementById('name-p1').innerText = `${myData.nickname} (나)`;\n  const av1 = document.getElementById('avatar-p1');\n  if (av1 && av1.childNodes[0]) av1.childNodes[0].nodeValue = myData.avatar || '👦';\n\n  document.getElementById('name-p2').innerText = oppData.nickname + (oppData.isBot ? ' 🤖' : '');\n  const av2 = document.getElementById('avatar-p2');\n  if (av2 && av2.childNodes[0]) av2.childNodes[0].nodeValue = oppData.avatar || (oppData.isBot ? '🤖' : '👧');\n\n  updateHpUI('p1', 100, 100);\n  updateHpUI('p2', 100, 100);\n\n  document.getElementById('quiz-question-text').innerText = '상대와 연결되었습니다! 곧 1라운드가 시작됩니다!';\n  document.getElementById('quiz-options-container').innerHTML = '';\n  document.getElementById('battle-live-banner').innerText = '💦 먼저 정답을 맞혀 물풍선을 던지세요!';\n  document.getElementById('round-explanation-box').style.display = 'none';\n  currentClientRound = 0;\n\n  // Dual-channel battle state backup polling: ensures round ALWAYS starts even if SSE lags or drops\n  if (battleSyncInterval) clearInterval(battleSyncInterval);\n  battleSyncInterval = setInterval(async () => {\n    if (!currentRoomId || !currentUser || !views.battle.classList.contains('active')) return;\n    try {\n      const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}&_t=${Date.now()}`);\n      if (res.ok) {\n        const state = await res.json();\n        if (state.ok) {\n          if (state.isEnded) {\n            clearInterval(battleSyncInterval);\n            battleSyncInterval = null;\n            return;\n          }\n          if (state.round > currentClientRound && state.quiz) {\n            console.log('[BattleSync] Syncing round state via polling:', state.round);\n            onRoundStart({\n              round: state.round,\n              totalRounds: state.totalRounds,\n              quiz: state.quiz,\n              timeLimit: 10,\n              p1: state.p1,\n              p2: state.p2\n            });\n          }\n        }\n      }\n    } catch (e) {\n      console.warn('[BattleSync] Polling error:', e.message);\n    }\n  }, 1000);\n\n  showView('battle');\n}\n\nfunction updateHpUI(target, curHp, maxHp) {\n  const percent = Math.max(0, Math.min(100, (curHp / maxHp) * 100));\n  const bar = document.getElementById(`hp-bar-${target}`);\n  const text = document.getElementById(`hp-num-${target}`);\n\n  if (bar) {\n    bar.style.width = `${percent}%`;\n    bar.className = 'hp-bar-fill';\n    if (percent < 30) bar.classList.add('danger');\n    else if (percent < 60) bar.classList.add('warning');\n  }\n  if (text) {\n    text.innerText = `${curHp} / ${maxHp}`;\n  }\n}\n\nfunction onRoundStart(data) {\n  try {\n    if (!data || !data.quiz) return;\n    currentClientRound = data.round;\n    hasAnsweredCurrentRound = false;\n\n    // Sync HP bars with server state\n    if (data.p1 && data.p2 && currentUser) {\n      const isMeP1 = (battleData && battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1.id === currentUser.id);\n      const myHp = isMeP1 ? data.p1.hp : data.p2.hp;\n      const oppHp = isMeP1 ? data.p2.hp : data.p1.hp;\n      updateHpUI('p1', typeof myHp === 'number' ? myHp : 100, 100);\n      updateHpUI('p2', typeof oppHp === 'number' ? oppHp : 100, 100);\n    }\n    const expBox = document.getElementById('round-explanation-box');\n    if (expBox) expBox.style.display = 'none';\n\n    // Round indicator\n    const roundInd = document.getElementById('battle-round-indicator');\n    if (roundInd) roundInd.innerText = `라운드 ${data.round} / ${data.totalRounds || 10}`;\n    const liveBanner = document.getElementById('battle-live-banner');\n    if (liveBanner) liveBanner.innerText = '문제를 읽고 빠르게 정답을 누르세요!';\n\n    // Reset drenched cards\n    const cardP1 = document.getElementById('fighter-p1');\n    const cardP2 = document.getElementById('fighter-p2');\n    if (cardP1) cardP1.classList.remove('drenched');\n    if (cardP2) cardP2.classList.remove('drenched');\n\n    // Render question\n    const qText = document.getElementById('quiz-question-text');\n    if (qText) qText.innerText = data.quiz.question;\n\n    // Render Options\n    const container = document.getElementById('quiz-options-container');\n    if (container) {\n      container.innerHTML = '';\n      (data.quiz.options || []).forEach(opt => {\n        const btn = document.createElement('button');\n        btn.className = 'btn-option';\n        btn.innerText = opt;\n        btn.addEventListener('click', () => submitAnswer(opt, btn));\n        container.appendChild(btn);\n      });\n    }\n\n    // Start 10s Timer\n    startRoundTimer(data.timeLimit || 10);\n  } catch (err) {\n    console.error('[RoundStart] Error in onRoundStart:', err);\n  }\n}\n\nfunction startRoundTimer(seconds) {\n  clearInterval(roundTimerInterval);\n  roundTimeRemaining = seconds;\n\n  const timerNum = document.getElementById('battle-timer-num');\n  const timerFill = document.getElementById('battle-timer-fill');\n\n  if (timerNum) timerNum.innerText = roundTimeRemaining;\n  if (timerFill) timerFill.style.width = '100%';\n\n  const totalMs = seconds * 1000;\n  const startAt = Date.now();\n\n  roundTimerInterval = setInterval(() => {\n    const elapsed = Date.now() - startAt;\n    const remaining = Math.max(0, totalMs - elapsed);\n    const sec = Math.ceil(remaining / 1000);\n\n    if (timerNum) timerNum.innerText = sec;\n    if (timerFill) timerFill.style.width = `${(remaining / totalMs) * 100}%`;\n\n    if (sec <= 3 && sec > 0 && remaining % 1000 < 100) {\n      try { window.soundFX?.playTick(); } catch (e) {}\n    }\n\n    if (remaining <= 0) {\n      clearInterval(roundTimerInterval);\n      // Disable buttons immediately on round timeout to prevent late click contamination\n      const buttons = document.querySelectorAll('.btn-option');\n      buttons.forEach(b => b.disabled = true);\n    }\n  }, 100);\n}\n\nasync function submitAnswer(answer, clickedBtn) {\n  if (hasAnsweredCurrentRound || !currentRoomId) return;\n  hasAnsweredCurrentRound = true;\n\n  // Disable all options\n  const buttons = document.querySelectorAll('.btn-option');\n  buttons.forEach(b => b.disabled = true);\n\n  try {\n    await fetch('/api/game/answer', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        roomId: currentRoomId,\n        userId: currentUser.id,\n        answer\n      })\n    });\n  } catch (e) {\n    console.error('Answer send error:', e);\n  }\n}\n\nfunction onWrongAnswer(data) {\n  try {\n    const isMe = (data.userId === currentUser.id);\n\n    if (isMe) {\n      try { window.soundFX?.playWrong(); } catch (e) {}\n      showToast('❌ 아쉽게도 오답입니다! 이번 라운드는 기회가 끝났습니다.');\n\n      // Mark clicked button red\n      const buttons = document.querySelectorAll('.btn-option');\n      buttons.forEach(b => {\n        if (b.innerText === data.userAnswer) {\n          b.classList.add('wrong-pick');\n        }\n        b.disabled = true;\n      });\n\n      const banner = document.getElementById('battle-live-banner');\n      if (banner) banner.innerText = '❌ 아쉽게도 오답입니다! 상대방에게 기회가 넘어갔습니다.';\n    } else {\n      const banner = document.getElementById('battle-live-banner');\n      if (banner) banner.innerText = `💦 상대방(${data.nickname || '상대'})이 오답을 선택했습니다! 서둘러 맞히세요!`;\n    }\n  } catch (e) {\n    console.error('[WrongAnswer] UI error:', e);\n  }\n}\n\nfunction onRoundResult(data) {\n  try {\n    clearInterval(roundTimerInterval);\n\n    // Show explanation box\n    const explBox = document.getElementById('round-explanation-box');\n    if (explBox && data.correctAnswer) {\n      explBox.style.display = 'block';\n      explBox.innerHTML = `<strong>💡 정답: ${data.correctAnswer}</strong><br>${data.explanation || ''}`;\n    }\n\n    // Highlight correct option button green\n    const buttons = document.querySelectorAll('.btn-option');\n    buttons.forEach(b => {\n      b.disabled = true;\n      if (b.innerText === data.correctAnswer) {\n        b.classList.add('correct-pick');\n      }\n    });\n\n    const hasWinner = (data.type === 'ATTACK' || !!data.winnerId);\n\n    if (hasWinner) {\n      const isMeWinner = (data.winnerId === currentUser.id);\n\n      // Resize FX canvas\n      if (battleFX) {\n        try { battleFX.resize(); } catch (e) {}\n      }\n\n      // In DOM, avatar-p1 is ALWAYS ME (left), avatar-p2 is ALWAYS OPPONENT (right)\n      const elP1 = document.getElementById('avatar-p1');\n      const elP2 = document.getElementById('avatar-p2');\n      const canvas = document.getElementById('battle-fx-canvas');\n\n      let p1Pos = { x: 120, y: 140 };\n      let p2Pos = { x: 420, y: 140 };\n\n      if (elP1 && elP2 && canvas) {\n        const p1Rect = elP1.getBoundingClientRect();\n        const p2Rect = elP2.getBoundingClientRect();\n        const cRect = canvas.getBoundingClientRect();\n\n        if (cRect.width > 0 && cRect.height > 0) {\n          p1Pos = {\n            x: p1Rect.left + p1Rect.width / 2 - cRect.left,\n            y: p1Rect.top + p1Rect.height / 2 - cRect.top\n          };\n          p2Pos = {\n            x: p2Rect.left + p2Rect.width / 2 - cRect.left,\n            y: p2Rect.top + p2Rect.height / 2 - cRect.top\n          };\n        }\n      }\n\n      // Fix Bug 1: Winner ALWAYS throws AT the loser!\n      // p1Pos is ME, p2Pos is OPPONENT\n      const fromPos = isMeWinner ? p1Pos : p2Pos;\n      const toPos = isMeWinner ? p2Pos : p1Pos;\n      const victimCardId = isMeWinner ? 'fighter-p2' : 'fighter-p1';\n\n      if (isMeWinner) {\n        try { window.soundFX?.playCorrect(); } catch (e) {}\n        const banner = document.getElementById('battle-live-banner');\n        if (banner) banner.innerHTML = `🎉 <strong>정답!</strong> 시원하게 물풍선을 투척합니다! 💦`;\n      } else {\n        try { window.soundFX?.playWrong(); } catch (e) {}\n        const banner = document.getElementById('battle-live-banner');\n        if (banner) banner.innerHTML = `💦 상대방(${data.winnerName || '상대'})이 정답을 맞혀 물풍선을 던집니다!`;\n      }\n\n      // Safe extraction of HP\n      const isRoomP1Me = (battleData && battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1 && data.p1.id === currentUser.id);\n      const p1Hp = (data.p1 && typeof data.p1.hp === 'number') ? data.p1.hp : (typeof data.p1Hp === 'number' ? data.p1Hp : 100);\n      const p2Hp = (data.p2 && typeof data.p2.hp === 'number') ? data.p2.hp : (typeof data.p2Hp === 'number' ? data.p2Hp : 100);\n\n      const myHp = isRoomP1Me ? p1Hp : p2Hp;\n      const oppHp = isRoomP1Me ? p2Hp : p1Hp;\n\n      const applyDamage = () => {\n        const victimCard = document.getElementById(victimCardId);\n        if (victimCard) victimCard.classList.add('drenched');\n        updateHpUI('p1', myHp, 100);\n        updateHpUI('p2', oppHp, 100);\n      };\n\n      if (battleFX) {\n        try {\n          battleFX.throwBalloon(fromPos, toPos, false, data.damage || 20, applyDamage);\n        } catch (e) {\n          applyDamage();\n        }\n        setTimeout(applyDamage, 700);\n      } else {\n        applyDamage();\n      }\n\n    } else {\n      // Both wrong or timeout\n      try { window.soundFX?.playWrong(); } catch (e) {}\n      const banner = document.getElementById('battle-live-banner');\n      if (banner) {\n        if (data.allWrong) {\n          banner.innerText = '😅 양쪽 모두 오답입니다! 물풍선 없이 다음 라운드로 넘어갑니다.';\n        } else {\n          banner.innerText = data.timeout ? '⌛ 시간 초과! 아무도 맞히지 못했습니다.' : '😅 둘 다 오답으로 물풍선이 날아가지 않았습니다.';\n        }\n      }\n    }\n\n    // Client-side Round Transition Backup Timer:\n    // If next round (or match over) does not trigger within 3.2s, force sync state with server\n    const resolvedRound = data.round;\n    setTimeout(async () => {\n      if (currentClientRound === resolvedRound && currentRoomId && views.battle.classList.contains('active')) {\n        console.log('[TransitionSafety] Round', resolvedRound, 'transition did not arrive in 3.2s. Force-syncing state...');\n        try {\n          const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}&_t=${Date.now()}`);\n          if (res.ok) {\n            const state = await res.json();\n            if (state.ok) {\n              if (state.isEnded) {\n                return;\n              }\n              if (state.round > currentClientRound && state.quiz) {\n                console.log('[TransitionSafety] Advanced to round', state.round, 'via safety poll');\n                onRoundStart({\n                  round: state.round,\n                  totalRounds: state.totalRounds,\n                  quiz: state.quiz,\n                  timeLimit: 10,\n                  p1: state.p1,\n                  p2: state.p2\n                });\n              }\n            }\n          }\n        } catch (e) {\n          console.warn('[TransitionSafety] Sync failed:', e);\n        }\n      }\n    }, 3200);\n\n  } catch (err) {\n    console.error('[RoundResult] Error in onRoundResult:', err);\n  }\n}\n\nfunction onMatchOver(data) {\n  if (battleSyncInterval) {\n    clearInterval(battleSyncInterval);\n    battleSyncInterval = null;\n  }\n  clearInterval(roundTimerInterval);\n\n  setTimeout(() => {\n    showView('matchOver');\n\n    const isMeP1 = (data.p1.id === currentUser.id);\n    const myResult = isMeP1 ? data.p1 : data.p2;\n\n    const resultEmoji = document.getElementById('result-emoji');\n    const resultTitle = document.getElementById('result-title');\n    const rpBadge = document.getElementById('result-rp-badge');\n\n    // Extract clean numeric RP safely\n    let currentTotalRp = 100;\n    if (typeof myResult.newRp === 'number') {\n      currentTotalRp = myResult.newRp;\n    } else if (myResult.newRp && typeof myResult.newRp.rp === 'number') {\n      currentTotalRp = myResult.newRp.rp;\n    } else if (currentUser && typeof currentUser.rp === 'number') {\n      currentTotalRp = Math.max(0, currentUser.rp + (myResult.rpChange || 0));\n    }\n\n    // Keep currentUser in sync\n    if (currentUser) {\n      currentUser.rp = currentTotalRp;\n      try {\n        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));\n        updateUserData(currentUser);\n      } catch (e) {}\n    }\n\n    const changeVal = myResult.rpChange || 0;\n    const changeText = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;\n\n    isMatchingInProgress = false;\n    const btnStart = document.getElementById('btn-start-matching');\n    if (btnStart) btnStart.disabled = false;\n\n    if (myResult.result === 'WIN') {\n      try { window.soundFX?.playVictory(); } catch (e) {}\n      resultEmoji.innerText = '👑';\n      resultTitle.innerText = '짜릿한 승리!';\n      resultTitle.className = 'result-title win';\n      rpBadge.className = 'rp-badge-change plus';\n      rpBadge.innerText = `${changeText} RP 획득! (현재 ${currentTotalRp} RP)`;\n    } else if (myResult.result === 'LOSE') {\n      try { window.soundFX?.playDefeat(); } catch (e) {}\n      resultEmoji.innerText = '💧';\n      resultTitle.innerText = '아쉬운 패배!';\n      resultTitle.className = 'result-title lose';\n      rpBadge.className = 'rp-badge-change minus';\n      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;\n    } else {\n      resultEmoji.innerText = '🤝';\n      resultTitle.innerText = '무승부!';\n      resultTitle.className = 'result-title draw';\n      rpBadge.className = 'rp-badge-change plus';\n      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;\n    }\n\n    // Render Round Recap & Automatically save unsolved rounds to client wrong notes\n    const recapList = document.getElementById('match-recap-list');\n    recapList.innerHTML = '';\n\n    // Save unsolved/wrong rounds to student's local wrong notes immediately\n    try {\n      const myKey = 'waterpang_wrongnotes_' + currentUser.id;\n      let existingNotes = [];\n      const savedNotes = localStorage.getItem(myKey);\n      if (savedNotes) {\n        try { existingNotes = JSON.parse(savedNotes); } catch (e) {}\n      }\n      if (!Array.isArray(existingNotes)) existingNotes = [];\n\n      const newUnsolved = [];\n      const nowFormatted = new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });\n\n      (data.history || []).forEach(h => {\n        if (!h || !h.quiz) return;\n        const isMyWin = (h.winnerId === currentUser.id);\n\n        if (!isMyWin) {\n          const userAns = (h.userAnswers && h.userAnswers[currentUser.id]) || (h.allWrong ? '오답 선택' : (h.timeout ? '시간 초과' : '상대방 정답'));\n          const itemNote = {\n            id: Date.now() + Math.random(),\n            user_id: currentUser.id,\n            quiz_id: h.quiz.id,\n            question: h.quiz.question,\n            explanation: h.quiz.explanation,\n            user_answer: userAns,\n            correct_answer: h.quiz.answer,\n            created_at: nowFormatted\n          };\n          // Remove old duplicate for this quiz so latest is at top\n          const dupIdx = existingNotes.findIndex(n => n.quiz_id === h.quiz.id);\n          if (dupIdx !== -1) existingNotes.splice(dupIdx, 1);\n          newUnsolved.push(itemNote);\n        }\n\n        const div = document.createElement('div');\n        div.className = 'recap-item';\n        div.innerHTML = `\n          <div>\n            <strong>[R${h.round}] ${h.quiz.answer}</strong>: ${h.quiz.question.replace(/\\n/g, ' ')}\n            <div style=\"font-size: 12px; color: #0284c7; margin-top: 2px;\">💡 ${h.quiz.explanation}</div>\n          </div>\n          <span style=\"font-weight: bold; white-space: nowrap; color: ${isMyWin ? '#10b981' : '#64748b'};\">\n            ${isMyWin ? '내가 맞힘 🎯' : (h.winnerName ? `${h.winnerName} 정답` : '오답/시간초과')}\n          </span>\n        `;\n        recapList.appendChild(div);\n      });\n\n      const mergedNotes = [...newUnsolved, ...existingNotes].slice(0, 50);\n      localStorage.setItem(myKey, JSON.stringify(mergedNotes));\n    } catch (err) {\n      console.warn('Error saving local wrong notes in recap:', err);\n    }\n\n    // Refresh profile and leaderboard cache in background\n    fetchProfile(currentUser.id);\n    refreshLeaderboardCache();\n  }, 2200);\n}\n\n// -------------------------------------------------------------\n// Modals: Leaderboard & Wrong Answer Notes\n// -------------------------------------------------------------\nfunction scrollToMyRank() {\n  const myRow = document.getElementById('my-leaderboard-row');\n  if (myRow) {\n    myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });\n    myRow.classList.add('pulse-highlight');\n    setTimeout(() => myRow.classList.remove('pulse-highlight'), 1200);\n  }\n}\n\nfunction renderLeaderboardItems(list, container) {\n  const summaryBox = document.getElementById('leaderboard-my-summary');\n  const modalTitle = document.getElementById('leaderboard-modal-title');\n\n  if (!Array.isArray(list) || list.length === 0) {\n    if (modalTitle) modalTitle.innerText = '🏆 명예의 전당 (시즌2)';\n    if (summaryBox) summaryBox.innerHTML = '';\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">아직 기록된 학생이 없습니다. 첫 번째 챔피언이 되어보세요!</div>';\n    return;\n  }\n\n  if (modalTitle) {\n    modalTitle.innerText = `🏆 명예의 전당 (시즌2) (전체 ${list.length}명)`;\n  }\n\n  // Check currentUser rank\n  const myRankIdx = currentUser\n    ? list.findIndex(u => (u.id && u.id === currentUser.id) || (u.nickname && u.nickname === currentUser.nickname))\n    : -1;\n\n  if (summaryBox) {\n    if (myRankIdx !== -1) {\n      const myUser = list[myRankIdx];\n      const rankNum = myRankIdx + 1;\n      const medal = rankNum === 1 ? '🥇 ' : (rankNum === 2 ? '🥈 ' : (rankNum === 3 ? '🥉 ' : ''));\n      const badge = (myUser.tier && myUser.tier.badge) || '💧';\n      const tierName = (myUser.tier && myUser.tier.name) || '물방울';\n\n      summaryBox.innerHTML = `\n        <div class=\"my-rank-banner\" onclick=\"scrollToMyRank()\" title=\"클릭하면 내 순위 위치로 이동합니다\">\n          <div class=\"my-rank-left\">\n            <div class=\"my-rank-label\">⭐ 내 순위 확인 (클릭하여 위치 이동)</div>\n            <div class=\"my-rank-pos\">${medal}${rankNum}위 <span class=\"my-rank-total\">/ 전체 ${list.length}명</span></div>\n          </div>\n          <div class=\"my-rank-right\">\n            <div class=\"my-rank-tier\">${badge} ${tierName}</div>\n            <div class=\"my-rank-rp\">${myUser.rp || 100} RP</div>\n            <span class=\"my-rank-jump-hint\">📍 내 위치로 이동</span>\n          </div>\n        </div>\n      `;\n    } else if (currentUser) {\n      summaryBox.innerHTML = `\n        <div class=\"my-rank-banner guest\">\n          <div class=\"my-rank-left\">\n            <div class=\"my-rank-label\">⭐ ${currentUser.nickname}님의 순위</div>\n            <div class=\"my-rank-pos\">시즌 2 등록됨 <span class=\"my-rank-total\">(전체 ${list.length}명)</span></div>\n          </div>\n          <div class=\"my-rank-right\">\n            <div style=\"font-size: 12px; color: #64748b;\">게임을 플레이하여 RP를 올려보세요! 🎮</div>\n          </div>\n        </div>\n      `;\n    } else {\n      summaryBox.innerHTML = '';\n    }\n  }\n\n  container.innerHTML = '';\n  list.forEach((user, idx) => {\n    const isMe = currentUser && ((user.id && user.id === currentUser.id) || (user.nickname && user.nickname === currentUser.nickname));\n    const isTop1 = (idx === 0);\n    const isTop2 = (idx === 1);\n    const isTop3 = (idx === 2);\n\n    let rowClass = 'leaderboard-row';\n    if (isTop1) rowClass += ' rank-1';\n    else if (isTop2) rowClass += ' rank-2';\n    else if (isTop3) rowClass += ' rank-3';\n    if (isMe) rowClass += ' my-rank-row';\n\n    const badge = (user.tier && user.tier.badge) || '💧';\n    const tierName = (user.tier && user.tier.name) || '물방울';\n    const rankLabel = isTop1 ? '🥇' : (isTop2 ? '🥈' : (isTop3 ? '🥉' : `${idx + 1}위`));\n\n    const row = document.createElement('div');\n    row.className = rowClass;\n    if (isMe) row.id = 'my-leaderboard-row';\n\n    row.innerHTML = `\n      <div class=\"leaderboard-rank\">${rankLabel}</div>\n      <div class=\"leaderboard-user\">\n        <span style=\"font-size: 20px;\">${badge}</span>\n        <div>\n          <div style=\"display: flex; align-items: center;\">\n            <strong>${user.nickname}</strong>\n            ${isMe ? '<span class=\"my-badge\">나</span>' : ''}\n          </div>\n          <div style=\"font-size: 11px; color: #64748b;\">${tierName} · 승률 ${user.win_rate || 0}% (${user.wins || 0}승 ${user.losses || 0}패)</div>\n        </div>\n      </div>\n      <div style=\"font-weight: bold; color: #0284c7; font-size: 16px;\">\n        ${user.rp || 100} RP\n      </div>\n    `;\n    container.appendChild(row);\n  });\n}\n\nasync function openLeaderboard() {\n  const container = document.getElementById('leaderboard-container');\n  const modalTitle = document.getElementById('leaderboard-modal-title');\n  if (modalTitle) modalTitle.innerText = '🏆 명예의 전당 (시즌2)';\n\n  // Show cached leaderboard immediately\n  try {\n    const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) && parsed.length > 0) {\n        renderLeaderboardItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">불러오는 중...</div>';\n  }\n  document.getElementById('modal-leaderboard').classList.add('active');\n\n  setTimeout(() => {\n    const myRow = document.getElementById('my-leaderboard-row');\n    if (myRow) myRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });\n  }, 200);\n\n  try {\n    const res = await fetch(`/api/leaderboard?_t=${Date.now()}`);\n    const data = await res.json();\n    if (data.ok && data.leaderboard) {\n      if (data.leaderboard.length > 0) {\n        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));\n        renderLeaderboardItems(data.leaderboard, container);\n        setTimeout(() => {\n          const myRow = document.getElementById('my-leaderboard-row');\n          if (myRow) myRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });\n        }, 150);\n      } else if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n        renderLeaderboardItems([], container);\n      }\n    }\n  } catch (e) {\n    console.warn('Leaderboard fetch error, using cache:', e);\n  }\n}\n\nfunction renderWrongNotesItems(list, container) {\n  if (!Array.isArray(list) || list.length === 0) {\n    container.innerHTML = '<div style=\"text-align: center; padding: 35px 20px; color: #10b981; font-size: 17px; font-weight: bold;\">🎉 아직 틀린 문제가 없습니다! 아주 훌륭해요!</div>';\n    return;\n  }\n  container.innerHTML = '';\n  list.forEach(w => {\n    const item = document.createElement('div');\n    item.style.cssText = 'background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);';\n    \n    const qText = w.question ? `<div style=\"font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 8px; line-height: 1.4;\">${w.question.replace(/\\n/g, '<br>')}</div>` : '';\n    const explText = w.explanation ? `<div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #1e40af; margin-top: 8px; line-height: 1.4;\">💡 <strong>해설:</strong> ${w.explanation}</div>` : '';\n\n    item.innerHTML = `\n      <div style=\"display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;\">\n        <span>📝 문제 #${w.quiz_id || ''}</span>\n        <span>${w.created_at || ''}</span>\n      </div>\n      ${qText}\n      <div style=\"display: flex; gap: 16px; font-size: 15px; margin-bottom: 4px; flex-wrap: wrap;\">\n        <span style=\"color: #ef4444; font-weight: bold;\">❌ 내 선택: ${w.user_answer}</span>\n        <span style=\"color: #10b981; font-weight: bold;\">⭕ 정답: ${w.correct_answer}</span>\n      </div>\n      ${explText}\n    `;\n    container.appendChild(item);\n  });\n}\n\nasync function openWrongNotes() {\n  if (!currentUser) return;\n  const container = document.getElementById('wrongnotes-container');\n\n  // Show cached wrong answers first if available\n  try {\n    const cached = localStorage.getItem('waterpang_wrongnotes_' + currentUser.id);\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) && parsed.length > 0) {\n        renderWrongNotesItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes()) {\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">불러오는 중...</div>';\n  }\n  document.getElementById('modal-wrongnotes').classList.add('active');\n\n  try {\n    const res = await fetch(`/api/profile?userId=${currentUser.id}`);\n    const data = await res.json();\n    if (data.ok && Array.isArray(data.wrongAnswers)) {\n      localStorage.setItem('waterpang_wrongnotes_' + currentUser.id, JSON.stringify(data.wrongAnswers));\n      renderWrongNotesItems(data.wrongAnswers, container);\n    }\n  } catch (e) {\n    if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n      container.innerHTML = '<div style=\"color: #ef4444; text-align: center; padding: 20px;\">오답노트를 불러오지 못했습니다. 다시 시도해주세요.</div>';\n    }\n  }\n}\n" }
};

// Cache-busting URLs
EMBEDDED_FILES['/css/style.css?v=2.0'] = EMBEDDED_FILES['/css/style.css'];
EMBEDDED_FILES['/js/audio.js?v=2.0'] = EMBEDDED_FILES['/js/audio.js'];
EMBEDDED_FILES['/js/particles.js?v=2.0'] = EMBEDDED_FILES['/js/particles.js'];
EMBEDDED_FILES['/js/app.js?v=2.0'] = EMBEDDED_FILES['/js/app.js'];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Active quiz pool
let allQuizzes = [...FALLBACK_QUIZZES];
console.log(`[Quiz] Active quiz pool: ${allQuizzes.length} questions.`);

// In-Memory State
const clients = new Map(); // userId -> { res, userId, nickname, lastSeen }
const waitingQueue = []; // [{ userId, nickname, rp, queuedAt, botTimer }]
const activeRooms = new Map(); // roomId -> Room

// Bot Names
const BOT_NAMES = [
  { name: '바른말 똘이', avatar: '🐶', accuracy: 0.70, minDelay: 2800, maxDelay: 4600 },
  { name: '퐁퐁 로봇', avatar: '🤖', accuracy: 0.65, minDelay: 3200, maxDelay: 5000 },
  { name: '국어왕 뚜루', avatar: '🦊', accuracy: 0.75, minDelay: 2500, maxDelay: 4200 },
  { name: '맞춤법 요정', avatar: '🧚', accuracy: 0.80, minDelay: 2200, maxDelay: 3800 },
  { name: '물풍선 달인 몽이', avatar: '🐵', accuracy: 0.68, minDelay: 2600, maxDelay: 4500 }
];

// Send SSE event to a specific user
function sendToUser(userId, type, payload) {
  const client = clients.get(userId);
  if (client && client.res && !client.res.destroyed) {
    try {
      client.res.write(`data: ${JSON.stringify({ type, payload, timestamp: Date.now() })}\n\n`);
    } catch (e) {
      console.error(`[SSE] Error sending to ${userId}:`, e.message);
    }
  }
}

// Broadcast event to all players in a room
function broadcastToRoom(room, type, payload) {
  if (room.p1 && !room.p1.isBot) sendToUser(room.p1.id, type, payload);
  if (room.p2 && !room.p2.isBot) sendToUser(room.p2.id, type, payload);
}

// Global recent questions ring buffer to ensure consecutive games never repeat questions
const recentGlobalQuizIds = [];
function recordRecentQuiz(quizId) {
  recentGlobalQuizIds.push(quizId);
  if (recentGlobalQuizIds.length > 50) {
    recentGlobalQuizIds.shift();
  }
}

// -------------------------------------------------------------
// Game Room Class
// -------------------------------------------------------------
class Room {
  constructor(id, p1, p2, isBotMatch) {
    this.id = id;
    this.p1 = {
      id: p1.userId,
      nickname: p1.nickname,
      rp: p1.rp,
      avatar: p1.avatar || '👦',
      hp: 100,
      maxHp: 100,
      score: 0,
      isBot: false,
      answered: false,
      wrongAttempts: 0
    };
    this.p2 = {
      id: p2.userId,
      nickname: p2.nickname,
      rp: p2.rp,
      avatar: p2.avatar || '👧',
      hp: 100,
      maxHp: 100,
      score: 0,
      isBot: !!isBotMatch,
      botConfig: p2.botConfig,
      answered: false,
      wrongAttempts: 0
    };
    this.isBotMatch = isBotMatch;
    this.totalRounds = 10;
    this.currentRound = 0;
    this.currentQuiz = null;
    this.roundStartTime = 0;
    this.roundTimer = null;
    this.botAnswerTimer = null;
    this.transitionTimer = null;
    this.isRoundResolved = false;
    this.isEnded = false;
    this.history = []; // record of each round for review
    this.usedQuizIds = new Set();
    this.roundUserAnswers = {};
  }

  start() {
    broadcastToRoom(this, 'MATCH_FOUND', {
      roomId: this.id,
      totalRounds: this.totalRounds,
      p1: { id: this.p1.id, nickname: this.p1.nickname, rp: this.p1.rp, avatar: this.p1.avatar, hp: this.p1.hp },
      p2: { id: this.p2.id, nickname: this.p2.nickname, rp: this.p2.rp, avatar: this.p2.avatar, hp: this.p2.hp, isBot: this.p2.isBot }
    });

    // Start 1st round after 2.5s intro
    setTimeout(() => {
      if (!this.isEnded) {
        this.nextRound();
      }
    }, 2500);
  }

  nextRound() {
    try {
      if (this.isEnded) return;

      this.currentRound++;
      if (this.currentRound > this.totalRounds || this.p1.hp <= 0 || this.p2.hp <= 0) {
        this.endMatch();
        return;
      }

      this.isRoundResolved = false;
      this.p1.answered = false;
      this.p1.wrongAttempts = 0;
      this.p2.answered = false;
      this.p2.wrongAttempts = 0;
      this.roundUserAnswers = {};

      // Pick quiz from 120 curated questions safely
      let quiz = null;
      try {
        const available = allQuizzes.filter(q => q && !this.usedQuizIds.has(q.id));
        const recentSet = new Set(recentGlobalQuizIds);
        const freshPool = available.filter(q => !recentSet.has(q.id));
        const pool = (freshPool.length >= 5) ? freshPool : (available.length > 0 ? available : allQuizzes);
        if (pool && pool.length > 0) {
          quiz = pool[Math.floor(Math.random() * pool.length)];
        }
      } catch (e) {
        console.error('[Room] Error selecting quiz, falling back:', e);
      }
      if (!quiz) {
        quiz = allQuizzes[0] || (FALLBACK_QUIZZES && FALLBACK_QUIZZES[0]);
      }
      if (quiz && quiz.id) {
        this.usedQuizIds.add(quiz.id);
        recordRecentQuiz(quiz.id);
      }
      this.currentQuiz = quiz;
      this.roundStartTime = Date.now();

      // Broadcast question to both players (without answer key)
      broadcastToRoom(this, 'ROUND_START', {
        round: this.currentRound,
        totalRounds: this.totalRounds,
        quiz: {
          id: this.currentQuiz.id,
          question: this.currentQuiz.question,
          options: [...this.currentQuiz.options].sort(() => Math.random() - 0.5) // shuffle options
        },
        timeLimit: 10,
        p1: { id: this.p1.id, hp: this.p1.hp, maxHp: this.p1.maxHp },
        p2: { id: this.p2.id, hp: this.p2.hp, maxHp: this.p2.maxHp }
      });

      // Round countdown (10s)
      clearTimeout(this.roundTimer);
      this.roundTimer = setTimeout(() => {
        this.handleRoundTimeout();
      }, 10500);

      // If opponent is Bot, schedule bot answer
      if (this.p2.isBot && !this.isEnded) {
        this.scheduleBotAnswer();
      }
    } catch (err) {
      console.error('[Room] Fatal error in nextRound:', err);
    }
  }

  scheduleBotAnswer() {
    clearTimeout(this.botAnswerTimer);
    const cfg = this.p2.botConfig || { minDelay: 2500, maxDelay: 4500, accuracy: 0.70 };
    const delay = Math.floor(Math.random() * (cfg.maxDelay - cfg.minDelay)) + cfg.minDelay;

    this.botAnswerTimer = setTimeout(() => {
      if (this.isEnded || this.isRoundResolved || this.p2.answered) return;

      const isCorrect = Math.random() < cfg.accuracy;
      const chosenAnswer = isCorrect
        ? this.currentQuiz.answer
        : this.currentQuiz.options.find(opt => opt !== this.currentQuiz.answer) || this.currentQuiz.answer;

      this.submitAnswer(this.p2.id, chosenAnswer);
    }, delay);
  }

  submitAnswer(userId, answer) {
    if (this.isEnded || this.isRoundResolved) return;

    const isP1 = (userId === this.p1.id);
    const player = isP1 ? this.p1 : this.p2;
    const opponent = isP1 ? this.p2 : this.p1;

    if (player.answered) return;
    this.roundUserAnswers[userId] = answer;

    const isCorrect = (answer === this.currentQuiz.answer);

    if (isCorrect) {
      this.isRoundResolved = true;
      player.answered = true;
      player.score += 10;
      clearTimeout(this.roundTimer);
      clearTimeout(this.botAnswerTimer);

      // Deal 20 damage to opponent
      opponent.hp = Math.max(0, opponent.hp - 20);

      // Record this unsolved round for opponent if human
      if (!opponent.isBot) {
        try {
          const oppAns = this.roundUserAnswers[opponent.id] || '상대방 먼저 정답';
          db.recordWrongAnswer(opponent.id, this.currentQuiz.id, oppAns, this.currentQuiz.answer);
        } catch (e) {}
      }

      // Record round history
      this.history.push({
        round: this.currentRound,
        quiz: this.currentQuiz,
        winnerId: player.id,
        winnerName: player.nickname,
        userAnswers: { ...this.roundUserAnswers },
        p1Hp: this.p1.hp,
        p2Hp: this.p2.hp
      });

      // Broadcast Attack & Round Result
      broadcastToRoom(this, 'ROUND_RESULT', {
        type: 'ATTACK',
        round: this.currentRound,
        winnerId: player.id,
        winnerName: player.nickname,
        userAnswer: answer,
        correctAnswer: this.currentQuiz.answer,
        explanation: this.currentQuiz.explanation,
        damage: 20,
        p1: { id: this.p1.id, hp: this.p1.hp, score: this.p1.score },
        p2: { id: this.p2.id, hp: this.p2.hp, score: this.p2.score },
        p1Hp: this.p1.hp,
        p2Hp: this.p2.hp
      });

      // Next round after 2.5s transition
      clearTimeout(this.transitionTimer);
      this.transitionTimer = setTimeout(() => {
        if (!this.isEnded) this.nextRound();
      }, 2500);

    } else {
      // Wrong answer
      player.answered = true;
      player.wrongAttempts++;

      if (!player.isBot) {
        try {
          db.recordWrongAnswer(player.id, this.currentQuiz.id, answer, this.currentQuiz.answer);
          console.log(`[WrongAnswer] Saved for ${player.nickname} (${player.id}): quiz #${this.currentQuiz.id}, user: "${answer}", correct: "${this.currentQuiz.answer}"`);
        } catch (e) {
          console.error('[WrongAnswer] Save error:', e);
        }
      }

      // Fix Bug 3: Broadcast WRONG_ANSWER with userId and nickname so client knows who was wrong!
      broadcastToRoom(this, 'WRONG_ANSWER', {
        userId: player.id,
        nickname: player.nickname,
        round: this.currentRound,
        userAnswer: answer,
        message: '틀렸습니다! 다시 생각해보세요.'
      });

      // Fix Bug 2: If BOTH players have now answered and both were wrong, immediately end round without waiting 10s!
      if (this.p1.answered && this.p2.answered) {
        this.isRoundResolved = true;
        clearTimeout(this.roundTimer);
        clearTimeout(this.botAnswerTimer);

        this.history.push({
          round: this.currentRound,
          quiz: this.currentQuiz,
          winnerId: null,
          winnerName: null,
          allWrong: true,
          userAnswers: { ...this.roundUserAnswers },
          p1Hp: this.p1.hp,
          p2Hp: this.p2.hp
        });

        broadcastToRoom(this, 'ROUND_RESULT', {
          type: 'DRAW',
          round: this.currentRound,
          winnerId: null,
          winnerName: null,
          allWrong: true,
          correctAnswer: this.currentQuiz.answer,
          explanation: this.currentQuiz.explanation,
          p1: { id: this.p1.id, hp: this.p1.hp, score: this.p1.score },
          p2: { id: this.p2.id, hp: this.p2.hp, score: this.p2.score },
          p1Hp: this.p1.hp,
          p2Hp: this.p2.hp
        });

        // Transition to next round after 2.5s immediately!
        clearTimeout(this.transitionTimer);
        this.transitionTimer = setTimeout(() => {
          if (!this.isEnded) this.nextRound();
        }, 2500);
      }
    }
  }

  handleRoundTimeout() {
    if (this.isEnded || this.isRoundResolved) return;
    this.isRoundResolved = true;

    // Record timeout for human players who didn't answer
    if (this.p1 && !this.p1.isBot) {
      try {
        const p1Ans = this.roundUserAnswers[this.p1.id] || '시간 초과';
        db.recordWrongAnswer(this.p1.id, this.currentQuiz.id, p1Ans, this.currentQuiz.answer);
      } catch (e) {}
    }
    if (this.p2 && !this.p2.isBot) {
      try {
        const p2Ans = this.roundUserAnswers[this.p2.id] || '시간 초과';
        db.recordWrongAnswer(this.p2.id, this.currentQuiz.id, p2Ans, this.currentQuiz.answer);
      } catch (e) {}
    }

    // Record draw round
    this.history.push({
      round: this.currentRound,
      quiz: this.currentQuiz,
      winnerId: null,
      winnerName: null,
      timeout: true,
      userAnswers: { ...this.roundUserAnswers },
      p1Hp: this.p1.hp,
      p2Hp: this.p2.hp
    });

    broadcastToRoom(this, 'ROUND_RESULT', {
      type: 'TIMEOUT',
      round: this.currentRound,
      winnerId: null,
      winnerName: null,
      timeout: true,
      correctAnswer: this.currentQuiz.answer,
      explanation: this.currentQuiz.explanation,
      p1: { id: this.p1.id, hp: this.p1.hp, score: this.p1.score },
      p2: { id: this.p2.id, hp: this.p2.hp, score: this.p2.score },
      p1Hp: this.p1.hp,
      p2Hp: this.p2.hp
    });

    clearTimeout(this.transitionTimer);
    this.transitionTimer = setTimeout(() => {
      if (!this.isEnded) this.nextRound();
    }, 2500);
  }

  endMatch() {
    if (this.isEnded) return;
    this.isEnded = true;

    clearTimeout(this.roundTimer);
    clearTimeout(this.botAnswerTimer);
    clearTimeout(this.transitionTimer);

    let p1Result = 'DRAW';
    let p2Result = 'DRAW';
    let p1RpChange = 10;
    let p2RpChange = 10;

    if (this.p1.hp > this.p2.hp) {
      p1Result = 'WIN';
      p2Result = 'LOSE';
      p1RpChange = 25;
      p2RpChange = -15;
    } else if (this.p2.hp > this.p1.hp) {
      p1Result = 'LOSE';
      p2Result = 'WIN';
      p1RpChange = -15;
      p2RpChange = 25;
    }

    // Save all unsolved/wrong rounds into DB for each student
    try {
      this.history.forEach(h => {
        if (!h || !h.quiz) return;
        // For P1
        if (!this.p1.isBot && h.winnerId !== this.p1.id) {
          const userAns = (h.userAnswers && h.userAnswers[this.p1.id]) || (h.allWrong ? '오답 선택' : (h.timeout ? '시간 초과' : '상대방 정답'));
          db.recordWrongAnswer(this.p1.id, h.quiz.id, userAns, h.quiz.answer);
        }
        // For P2
        if (!this.p2.isBot && h.winnerId !== this.p2.id) {
          const userAns = (h.userAnswers && h.userAnswers[this.p2.id]) || (h.allWrong ? '오답 선택' : (h.timeout ? '시간 초과' : '상대방 정답'));
          db.recordWrongAnswer(this.p2.id, h.quiz.id, userAns, h.quiz.answer);
        }
      });
    } catch (e) {
      console.error('[Match] Error saving unsolved rounds to wrong answers:', e);
    }

    // Update Player 1 DB
    let p1NewRp = Math.max(0, this.p1.rp + p1RpChange);
    try {
      const p1Updated = db.updateUserStats(this.p1.id, p1Result, p1RpChange);
      if (p1Updated && typeof p1Updated.rp === 'number') {
        p1NewRp = p1Updated.rp;
      }
      db.saveMatch(this.p1.id, this.p2.nickname, this.p2.isBot, p1Result, this.p1.score, this.p2.score, p1RpChange);
    } catch (e) {
      console.error('[Match] Error saving P1 stats:', e);
    }

    // Update Player 2 DB if human
    let p2NewRp = Math.max(0, this.p2.rp + p2RpChange);
    if (!this.p2.isBot) {
      try {
        const p2Updated = db.updateUserStats(this.p2.id, p2Result, p2RpChange);
        if (p2Updated && typeof p2Updated.rp === 'number') {
          p2NewRp = p2Updated.rp;
        }
        db.saveMatch(this.p2.id, this.p1.nickname, false, p2Result, this.p2.score, this.p1.score, p2RpChange);
      } catch (e) {
        console.error('[Match] Error saving P2 stats:', e);
      }
    }

    // Broadcast MATCH_OVER
    broadcastToRoom(this, 'MATCH_OVER', {
      roomId: this.id,
      p1: {
        id: this.p1.id,
        nickname: this.p1.nickname,
        result: p1Result,
        rpChange: p1RpChange,
        newRp: p1NewRp,
        finalScore: this.p1.score
      },
      p2: {
        id: this.p2.id,
        nickname: this.p2.nickname,
        result: p2Result,
        rpChange: p2RpChange,
        newRp: p2NewRp,
        finalScore: this.p2.score,
        isBot: this.p2.isBot
      },
      history: this.history
    });

    // Remove room after 30s
    setTimeout(() => {
      activeRooms.delete(this.id);
    }, 30000);
  }
}

// -------------------------------------------------------------
// Matchmaker Engine
// -------------------------------------------------------------
function addToMatchQueue(user) {
  removeFromMatchQueue(user.id);

  // Check if user is already in an ACTIVE, non-ended room.
  // If so, do NOT destroy the room! Return the active match immediately.
  for (const [roomId, room] of activeRooms) {
    if ((room.p1.id === user.id || room.p2.id === user.id) && !room.isEnded) {
      console.log(`[MatchQueue] User ${user.nickname} already in active room ${roomId}. Returning existing match.`);
      return {
        status: 'MATCHED',
        roomId: room.id,
        roomData: {
          roomId: room.id,
          totalRounds: room.totalRounds,
          p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, avatar: room.p1.avatar, hp: room.p1.hp },
          p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
        }
      };
    }
    // Clean up old ended rooms for this user
    if ((room.p1.id === user.id || room.p2.id === user.id) && room.isEnded) {
      activeRooms.delete(roomId);
    }
  }

  const queueEntry = {
    userId: user.id,
    nickname: user.nickname,
    rp: user.rp,
    avatar: user.avatar || '👦',
    queuedAt: Date.now(),
    botTimer: null
  };

  // If there's another waiting human, match immediately!
  if (waitingQueue.length > 0) {
    const opponent = waitingQueue.shift();
    clearTimeout(opponent.botTimer);
    const room = createMatchRoom(opponent, queueEntry, false);
    return {
      status: 'MATCHED',
      roomId: room.id,
      roomData: {
        roomId: room.id,
        totalRounds: room.totalRounds,
        p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, avatar: room.p1.avatar, hp: room.p1.hp },
        p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
      }
    };
  }

  // Otherwise, set 3.5s timer for Bot fallback (handles odd number or solo)
  queueEntry.botTimer = setTimeout(() => {
    const idx = waitingQueue.findIndex(q => q.userId === user.id);
    if (idx !== -1) {
      waitingQueue.splice(idx, 1);
      // Spawn Bot Opponent
      const botConfig = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const botOpponent = {
        userId: 'bot_' + crypto.randomBytes(4).toString('hex'),
        nickname: botConfig.name,
        rp: Math.max(50, user.rp + Math.floor(Math.random() * 40 - 20)),
        avatar: botConfig.avatar,
        isBot: true,
        botConfig
      };
      createMatchRoom(queueEntry, botOpponent, true);
    }
  }, 3500);

  waitingQueue.push(queueEntry);
  return { status: 'QUEUED' };
}

function removeFromMatchQueue(userId) {
  const idx = waitingQueue.findIndex(q => q.userId === userId);
  if (idx !== -1) {
    clearTimeout(waitingQueue[idx].botTimer);
    waitingQueue.splice(idx, 1);
  }
}

function createMatchRoom(player1, player2, isBotMatch) {
  const roomId = 'room_' + crypto.randomBytes(6).toString('hex');
  const room = new Room(roomId, player1, player2, isBotMatch);
  activeRooms.set(roomId, room);
  room.start();
  return room;
}

// -------------------------------------------------------------
// HTTP Server & Routing
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. SSE Real-Time Stream Endpoint
  if (pathname === '/api/events') {
    const userId = parsedUrl.query.userId;
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'userId parameter required' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write('\n');

    const clientRecord = { res, userId, lastSeen: Date.now() };
    clients.set(userId, clientRecord);
    console.log(`[SSE] User ${userId} connected. Total active streams: ${clients.size}`);

    // Send connected welcome
    sendToUser(userId, 'CONNECTED', { userId });

    // Proactively restore and re-sync match state if reconnecting to an active game
    for (const [roomId, room] of activeRooms) {
      if ((room.p1.id === userId || room.p2.id === userId) && !room.isEnded) {
        sendToUser(userId, 'MATCH_FOUND', {
          roomId: room.id,
          totalRounds: room.totalRounds,
          p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, avatar: room.p1.avatar, hp: room.p1.hp },
          p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
        });
        if (room.currentRound > 0 && room.currentQuiz) {
          sendToUser(userId, 'ROUND_START', {
            round: room.currentRound,
            totalRounds: room.totalRounds,
            quiz: {
              id: room.currentQuiz.id,
              question: room.currentQuiz.question,
              options: room.currentQuiz.options
            },
            timeLimit: 10,
            p1: { id: room.p1.id, hp: room.p1.hp, maxHp: room.p1.maxHp },
            p2: { id: room.p2.id, hp: room.p2.hp, maxHp: room.p2.maxHp }
          });
        }
        break;
      }
    }

    // Keep-alive heartbeat every 20s
    const heartbeat = setInterval(() => {
      if (!res.destroyed) {
        res.write(': ping\n\n');
      } else {
        clearInterval(heartbeat);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (clients.get(userId) === clientRecord) {
        clients.delete(userId);
        removeFromMatchQueue(userId);
        console.log(`[SSE] User ${userId} disconnected. Total active streams: ${clients.size}`);
      }
    });
    return;
  }

  // 2. Helper for JSON Request Body
  function parseJsonBody(callback) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(null, parsed);
      } catch (e) {
        callback(e, null);
      }
    });
  }

  // 3. API Endpoints
  if (pathname === '/api/season/hall-of-fame' && req.method === 'GET') {
    const list = db.getSeason1HallOfFame();
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    });
    return res.end(JSON.stringify({ ok: true, season: 1, hallOfFame: list }));
  }

  if (pathname === '/api/admin/season-reset') {
    db.resetToSeason2();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, message: 'All users reset to Season 2 (100 RP baseline)' }));
  }

  if (pathname === '/api/admin/clean-prohibited') {
    const purged = db.sanitizeProhibitedUsers();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, purgedCount: purged }));
  }

  if (pathname === '/api/admin/reset-password') {
    const query = parsedUrl.query || {};
    const nickname = (query.nickname || '').trim();
    const newPassword = (query.newPassword || '1234').trim();
    if (!nickname) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '닉네임을 입력해주세요. (예: /api/admin/reset-password?nickname=학생이름&newPassword=1234)' }));
    }
    const user = db.getUserByNickname(nickname);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: `"${nickname}" 계정을 찾을 수 없습니다.` }));
    }
    db.updateUserPassword(user.id, newPassword);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      message: `"${nickname}" 계정의 비밀번호가 "${newPassword}"(으)로 재설정되었습니다!`,
      nickname,
      newPassword
    }));
  }

  if (pathname === '/api/admin/get-user') {
    const query = parsedUrl.query || {};
    const nickname = (query.nickname || '').trim();
    if (!nickname) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '닉네임을 입력해주세요.' }));
    }
    const user = db.getUserByNickname(nickname);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: `"${nickname}" 계정을 찾을 수 없습니다.` }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({
      ok: true,
      user: {
        id: user.id,
        nickname: user.nickname,
        password: user.password,
        rp: user.rp,
        wins: user.wins,
        losses: user.losses
      }
    }));
  }

  if (pathname === '/api/register' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (err || !body.nickname || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '닉네임과 비밀번호를 입력해주세요.' }));
      }
      if (db.isProhibitedNickname(body.nickname).prohibited) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 계정을 생성할 수 없습니다. 바르고 고운 닉네임을 사용해주세요!' }));
      }
      try {
        const existing = db.getUserByNickname(body.nickname);
        if (existing) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: '❌ 이미 사용 중인 닉네임(아이디)입니다! 다른 닉네임을 사용해주세요.' }));
        }

        let user;
        if (body.backupUser && body.backupUser.nickname === body.nickname && body.backupUser.password === body.password) {
          user = db.restoreOrSyncUser(body.backupUser, body.leaderboardSnapshot);
        } else {
          user = db.createUser(body.nickname, body.password);
        }
        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, user }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/login' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (err || !body.nickname || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '닉네임과 비밀번호를 입력해주세요.' }));
      }
      if (db.isProhibitedNickname(body.nickname).prohibited) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 부적절한 닉네임으로 이용이 제한된 계정입니다. 새 계정을 생성해주세요.' }));
      }
      let user = db.getUserByNickname(body.nickname);
      if (!user && body.backupUser && body.backupUser.nickname === body.nickname && body.backupUser.password === body.password) {
        user = db.restoreOrSyncUser(body.backupUser, body.leaderboardSnapshot);
      }
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 등록되지 않은 아이디입니다. [새 계정 만들기] 탭에서 먼저 계정을 생성해주세요!' }));
      }
      // Auto-claim/update password if user password is the ephemeral 'saved_user' placeholder
      if (user.password === 'saved_user') {
        db.updateUserPassword(user.id, body.password);
        user.password = body.password;
      } else if (user.password !== body.password) {
        if (body.backupUser && body.backupUser.id === user.id && body.backupUser.password === body.password) {
          db.updateUserPassword(user.id, body.password);
          user.password = body.password;
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: '❌ 비밀번호가 올바르지 않습니다. 다시 확인해주세요!\n(서버 재시작 전 계정인 경우 간편 비밀번호 "saved_user"로도 접속 가능합니다)' }));
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, user }));
    });
    return;
  }

  if (pathname === '/api/user/sync' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (err || !body || !body.user) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Missing user payload' }));
      }
      try {
        const synced = db.restoreOrSyncUser(body.user, body.leaderboardSnapshot);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, user: synced, restored: true }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (pathname === '/api/profile' && req.method === 'GET') {
    const userId = parsedUrl.query.userId;
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing userId' }));
    }
    let user = db.getUserById(userId);
    if (!user) {
      user = { id: userId, nickname: '학생', rp: 100 };
    }
    const matches = db.getMatchHistory(userId, 10);
    const wrongAnswersRaw = db.getWrongAnswers(userId, 50);
    const wrongAnswers = wrongAnswersRaw.map(w => {
      const q = allQuizzes.find(item => item.id === w.quiz_id);
      return {
        ...w,
        question: q ? q.question : '',
        explanation: q ? q.explanation : ''
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, user, matches, wrongAnswers }));
    return;
  }

  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    // Return all students without limit so full school rankings are visible
    const list = db.getLeaderboard();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, leaderboard: list }));
    return;
  }

  if (pathname === '/api/match/join' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (err || !body.userId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing userId' }));
      }
      const user = db.getUserById(body.userId);
      if (!user) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'User not found' }));
      }
      const result = addToMatchQueue(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result }));
    });
    return;
  }

  if (pathname === '/api/match/cancel' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (body && body.userId) {
        removeFromMatchQueue(body.userId);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Guaranteed match status polling endpoint
  if (pathname === '/api/match/status' && req.method === 'GET') {
    const userId = parsedUrl.query.userId;
    if (!userId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing userId' }));
    }

    for (const [roomId, room] of activeRooms) {
      if ((room.p1.id === userId || room.p2.id === userId) && !room.isEnded) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true,
          status: 'MATCHED',
          roomId: room.id,
          roomData: {
            roomId: room.id,
            totalRounds: room.totalRounds,
            p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, avatar: room.p1.avatar, hp: room.p1.hp },
            p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
          }
        }));
      }
    }

    const isQueued = waitingQueue.some(q => q.userId === userId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      status: isQueued ? 'QUEUED' : 'IDLE'
    }));
  }

  // Game State Polling Endpoint (Dual-channel fallback for strict firewalls)
  if (pathname === '/api/game/state' && req.method === 'GET') {
    const roomId = parsedUrl.query.roomId;
    const room = activeRooms.get(roomId);
    if (!room) {
      res.writeHead(404, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      return res.end(JSON.stringify({ error: 'Game room not found' }));
    }
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    return res.end(JSON.stringify({
      ok: true,
      round: room.currentRound,
      totalRounds: room.totalRounds,
      isRoundResolved: room.isRoundResolved,
      isEnded: room.isEnded,
      quiz: room.currentQuiz ? {
        id: room.currentQuiz.id,
        question: room.currentQuiz.question,
        options: room.currentQuiz.options
      } : null,
      p1: { id: room.p1.id, hp: room.p1.hp, maxHp: room.p1.maxHp },
      p2: { id: room.p2.id, hp: room.p2.hp, maxHp: room.p2.maxHp }
    }));
  }

  if (pathname === '/api/game/answer' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      const { roomId, userId, answer } = body;
      const room = activeRooms.get(roomId);
      if (!room) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Game room not found' }));
      }
      room.submitAnswer(userId, answer);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // 4. Bulletproof Static File Serving (Prioritizes embedded assets for zero-stale deployment)
  const normPath = pathname === '/' ? '/index.html' : pathname;
  const ext = path.extname(normPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (EMBEDDED_FILES[normPath]) {
    res.writeHead(200, {
      'Content-Type': EMBEDDED_FILES[normPath].type,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(EMBEDDED_FILES[normPath].content);
    return;
  }

  if (ext === '' || ext === '.html') {
    if (EMBEDDED_FILES['/index.html']) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(EMBEDDED_FILES['/index.html'].content);
      return;
    }
  }

  const cleanRelative = normPath.replace(/^\//, '');
  const candidateDiskPaths = [
    path.join(PUBLIC_DIR, cleanRelative),
    path.join(__dirname, cleanRelative),
    path.join(__dirname, 'spelling-quiz-battle', 'public', cleanRelative),
    path.join(__dirname, 'spelling-quiz-battle', cleanRelative)
  ];

  let foundDiskPath = null;
  for (const cp of candidateDiskPaths) {
    if (fs.existsSync(cp) && fs.statSync(cp).isFile()) {
      foundDiskPath = cp;
      break;
    }
  }

  if (foundDiskPath) {
    fs.readFile(foundDiskPath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(content);
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`💧 워터팡! 맞춤법 배틀 서버가 시작되었습니다!`);
  console.log(`🌐 접속 주소: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
