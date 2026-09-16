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

function initSeason2Data() {
  try {
    if (!fs.existsSync(SEED_PATH)) {
      console.log('[DB] No seed file found at', SEED_PATH);
      return;
    }

    const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

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

module.exports = {
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
