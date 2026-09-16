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

// Prohibited word dictionary (Profanity, slurs, disability insults, family insults, hate speech)
const PROHIBITED_KEYWORDS = [
  // 1. Explicit disability insults & slurs (User requested: 다운증후군)
  '다운증후군', '다운증',
  '장애인', '장애련', '장애새끼', '장애자', '지체장애', '뇌병변',
  '저능아', '저능', '정박아', '정박', '자폐아', '자폐증', '백치',
  '정신병자', '정신병', '조현병', '싸이코', '사이코', '정신병원',
  '애자',

  // 2. Family insults / Pedrip (User requested: 엄마, 아빠 etc.)
  '엄마', '아빠', '느금', '느금마', '느검마', '느개비', '니애미', '니애비',
  '애미', '애비', '어미', '아비', '모친', '부친', '패드립',
  '엠창', '앰창', '엄창', '니엄마', '니아빠',

  // 3. Profanity / Slurs / Bullying
  'ㅄ', 'ㅂㅅ', '병신', '븅신', '등신', '호구', '찐따', '찌질이', '왕따',
  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '시바', '씨바', '시팔', '씨팔', '씹', '썅',
  '개새', '새끼', 'ㅅㄲ', '개년', '개놈', '미친놈', '미친년',
  '좆', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ',
  '미친', 'ㅁㅊ', '꺼져', '닥쳐',

  // 4. Sexual / Vulgar & Evasion variants
  '보지', '자지', '섹스', '쎅스', '자위', '딸딸이', '성관계', '콘돔', '성기', '음경', '사정', '유두', '젖꼭지', '야동', '포르노', '강간', '성폭행',
  '보즐지', '보줄지', '보즑지', '보즐', '보줄', '보쥐', '보찌', '보쮜', '보징',
  '자즐지', '자줄지', '자즑지', '자즐', '자줄', '자쥐', '자찌', '자쮜', '자징',

  // 5. Violence / Self-harm
  '자살', '뒈져', '죽어라', '죽어', '살인', '칼빵',

  // 6. Hate speech, discrimination & meme troll terms
  '무현', '노무현', '운지', '바이든', '김정은', '윤두창', '문재앙', '찢재명',
  '일베', '메갈', '워마드', '한남', '한녀', '틀딱', '맘충', '급식충', '틀니',
  '짱깨', '쪽발이', '조센징', '흑형',

  // 7. Foreign insults
  'ㅗ', 'fuck', 'shit', 'bitch', '법규', '창녀', '걸레'
];

const TEACHER_ACCOUNT = {
  id: '01fdd103-ef91-43d5-b0d5-8f1867d98c3e',
  nickname: '하하하하하쌤'
};

function isProhibitedNickname(nickname, userId = null) {
  if (!nickname || typeof nickname !== 'string') return { prohibited: false };
  const clean = nickname.replace(/[\s_.,~!@#$%^&*()=+/\\|?:;'"<>-]/g, '').toLowerCase();

  // Teacher account exemption: Only the authentic teacher account is allowed
  if (userId && userId === TEACHER_ACCOUNT.id && nickname.trim() === TEACHER_ACCOUNT.nickname) {
    return { prohibited: false };
  }

  // Teacher / Admin impersonation check (Blocks all unauthorized teacher/admin accounts)
  if (clean.includes('하하하하하쌤') || /하하하+쌤/.test(clean) || /하하하+선생(?:님)?(?:$|[0-9_])/.test(clean) || /\[?(?:gm|관리자|운영자)\]?/i.test(nickname)) {
    return { prohibited: true, matched: '선생님/관리자 사칭 방지' };
  }

  for (const word of PROHIBITED_KEYWORDS) {
    if (clean.includes(word.toLowerCase()) || nickname.toLowerCase().includes(word.toLowerCase())) {
      return { prohibited: true, matched: word };
    }
  }

  // Evasion regexes (insertion of chars/spaces)
  if (/보[줄즐즑즞즤]지/.test(clean) || /자[줄즐즑즞즤]지/.test(clean)) {
    return { prohibited: true, matched: '비속어 우회 표현' };
  }
  if (/보[\s\d_]+[지쥐찌쮜]/.test(nickname) || /자[\s\d_]+[지쥐찌쮜]/.test(nickname)) {
    return { prohibited: true, matched: '비속어 우회 표현' };
  }
  if (/무[\s\d_]*현/.test(nickname)) {
    return { prohibited: true, matched: '부적절한 표현 (무현)' };
  }
  if (/바[\s\d_]*이[\s\d_]*든/.test(nickname)) {
    return { prohibited: true, matched: '부적절한 표현 (바이든)' };
  }
  if (/다[\s\d_]*운[\s\d_]*증/.test(nickname)) {
    return { prohibited: true, matched: '장애 비하 표현 (다운증후군)' };
  }
  if (/장[\s\d_]*애/.test(nickname)) {
    return { prohibited: true, matched: '장애 비하 표현' };
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
      if (u && u.nickname && isProhibitedNickname(u.nickname, u.id).prohibited) {
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
    const validUsers = (jsonStore.users || []).filter(u => u && u.nickname && !isProhibitedNickname(u.nickname, u.id).prohibited && (u.season === 2 || !u.season));
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
    .filter(item => item && item.nickname && !isProhibitedNickname(item.nickname, item.id).prohibited)
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
  if (isProhibitedNickname(cleanNick, userData.id).prohibited) {
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
        if (isProhibitedNickname(nick, item.id).prohibited) continue;

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
  },
  {
    "id": 121,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"오늘따라 ( ) 기분이 좋은 일이 생길 것 같아.\"",
    "options": [
      "왠지",
      "웬지"
    ],
    "answer": "왠지",
    "explanation": "'왜 그런지 모르게'라는 뜻의 '왜인지'가 줄어든 말이므로 '왠지'가 맞습니다. '웬'은 '어찌 된'의 뜻입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 122,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"이게 ( ) 영희가 우리 집에 다 놀러 오고!\"",
    "options": [
      "웬일이야",
      "왠일이야"
    ],
    "answer": "웬일이야",
    "explanation": "'어찌 된 일'을 뜻할 때는 관형사 '웬'을 써서 '웬일'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 123,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"쓰러져도 다시 일어서는 ( ) 인형처럼 용기를 내자!\"",
    "options": [
      "오뚝이",
      "오뚜기"
    ],
    "answer": "오뚝이",
    "explanation": "'오뚝하다'의 어근 '오뚝-'에 접미사 '-이'가 붙어 명사가 된 단어이므로 '오뚝이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 124,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동생이 거짓말을 해서 정말 ( )가 없었다.\"",
    "options": [
      "어이",
      "어의"
    ],
    "answer": "어이",
    "explanation": "'너무 뜻밖이어서 기가 막히다'는 뜻은 '어이없다'가 맞습니다. '어의'는 임금의 의사를 뜻합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 125,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"약속 장소에 ( ) 도착했더니 아무도 없었다.\"",
    "options": [
      "금세",
      "금새"
    ],
    "answer": "금세",
    "explanation": "'지금 바로'를 뜻하는 '금시에'의 준말이므로 '금세'가 맞습니다. '금새'는 물건의 값을 뜻합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 126,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"오늘이 ( )인지 달력을 확인해 보렴.\"",
    "options": [
      "며칠",
      "몇일"
    ],
    "answer": "며칠",
    "explanation": "우리말에서 '몇 일'이라는 표기는 없으며, 발음대로 '며칠'로 적는 것이 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 127,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"하늘에 무지개가 쌍으로 뜨는 ( ) 광경을 보았다.\"",
    "options": [
      "희한한",
      "희안한"
    ],
    "answer": "희한한",
    "explanation": "'드물거나 신기하다'는 뜻의 한자어는 '희한(稀罕)하다'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 128,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시험에 나올 핵심 내용을 ( )처럼 콕 집어주셨다.\"",
    "options": [
      "족집게",
      "쪽집게"
    ],
    "answer": "족집게",
    "explanation": "작은 물건을 집는 도구의 표준어는 '족집게'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 129,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"라면을 늦게 먹었더니 면발이 퉁퉁 ( ).\"",
    "options": [
      "붇다",
      "불다"
    ],
    "answer": "붇다",
    "explanation": "물에 젖어 부피가 커지거나 분량이 많아지는 것은 '붇다'가 기본형입니다. (모음 어미가 오면 '불어'로 바뀝니다)",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 130,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시험 결과를 기다리며 ( ) 어쩔 줄 몰랐다.\"",
    "options": [
      "안절부절못하며",
      "안절부절하며"
    ],
    "answer": "안절부절못하며",
    "explanation": "마음이 초조하여 어찌할 바를 모르는 상태는 '안절부절못하다'가 한 단어 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 131,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"소지품을 잘 챙기지 못하고 ( ) 행동하면 안 돼.\"",
    "options": [
      "칠칠치 못하게",
      "칠칠맞게"
    ],
    "answer": "칠칠치 못하게",
    "explanation": "'칠칠하다'는 야무지고 알뜰하다는 긍정적인 뜻이므로, 조심성이 없을 때는 '칠칠치 못하다'고 해야 합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 132,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"우리 반 학생을 ( ) 가장 키가 큰 친구는 민수다.\"",
    "options": [
      "통틀어",
      "통털어"
    ],
    "answer": "통틀어",
    "explanation": "'있는 대로 다 합하여'라는 뜻의 표준어는 '통틀어'입니다. '통털어'는 사투리입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 133,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"서로의 입장을 고려해 ( )하게 문제를 해결했다.\"",
    "options": [
      "두루뭉술",
      "두리뭉실"
    ],
    "answer": "두루뭉술",
    "explanation": "모나지 않고 둥글둥글하다는 뜻의 바른 표준어는 '두루뭉술'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 134,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구는 하루 종일 쉬지도 않고 ( ) 게임만 했다.\"",
    "options": [
      "주야장천",
      "주구장창"
    ],
    "answer": "주야장천",
    "explanation": "'밤낮으로 쉬지 않고 잇따라'라는 뜻의 표준 사자성어는 '주야장천(晝夜長川)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 135,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"억울하게 남의 잘못까지 ( )를 쓰게 되었다.\"",
    "options": [
      "덤터기",
      "덤탱이"
    ],
    "answer": "덤터기",
    "explanation": "남에게 넘겨씌우는 허물이나 책임을 뜻하는 표준어는 '덤터기'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 136,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"불만이 있으면 속으로 ( )대지 말고 똑바로 말해.\"",
    "options": [
      "구시렁",
      "궁시렁"
    ],
    "answer": "구시렁",
    "explanation": "못마땅하여 잔소리를 자꾸 늘어놓는 모양은 '구시렁거리다/구시렁대다'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 137,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"식사가 끝나면 자기 그릇은 스스로 ( )를 하자.\"",
    "options": [
      "설거지",
      "설겆이"
    ],
    "answer": "설거지",
    "explanation": "원래의 형태를 밝히지 않고 소리 나는 대로 '설거지'로 적는 것이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 138,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어려운 수학 문제를 어떻게 풀지 ( ) 생각해 보았다.\"",
    "options": [
      "곰곰이",
      "곰곰히"
    ],
    "answer": "곰곰이",
    "explanation": "'곰곰'이라는 부사에 부사화 접미사 '-이'가 붙은 말이므로 '곰곰이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 139,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비누로 손을 ( ) 씻어 감기를 예방하자.\"",
    "options": [
      "깨끗이",
      "깨끗히"
    ],
    "answer": "깨끗이",
    "explanation": "'ㅅ' 받침으로 끝나는 어근 뒤에는 부사화 접미사 '-이'가 붙어 '깨끗이'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 140,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"운동장 트랙의 ( )가 좁아서 달리기 불편했다.\"",
    "options": [
      "너비",
      "넓이"
    ],
    "answer": "너비",
    "explanation": "가로 방향의 폭을 나타낼 때는 '너비', 평면의 면적 크기를 나타낼 때는 '넓이'를 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 141,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"고무줄을 길게 쭉 ( ) 보았다.\"",
    "options": [
      "늘여",
      "늘려"
    ],
    "answer": "늘여",
    "explanation": "본래보다 길이를 길게 할 때는 '늘이다', 수량이나 부피를 크게 할 때는 '늘리다'를 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 142,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님께서 손가락으로 칠판의 지도를 ( )셨다.\"",
    "options": [
      "가리키",
      "가르치"
    ],
    "answer": "가리키",
    "explanation": "방향이나 대상을 손짓 등으로 집어 알릴 때는 '가리키다', 지식을 알려줄 때는 '가르치다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 143,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"무거운 짐을 들고 가파른 언덕을 오르기가 힘에 ( ).\"",
    "options": [
      "부쳤다",
      "붙였다"
    ],
    "answer": "부쳤다",
    "explanation": "힘이나 능력이 미치지 못할 때는 '부치다'를 씁니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 144,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"생선 토막에 양념장을 넣고 자작자작 ( ).\"",
    "options": [
      "조렸다",
      "졸였다"
    ],
    "answer": "조렸다",
    "explanation": "고기나 생선 등을 양념하여 국물이 적게 끓이는 것은 '조리다', 마음을 태우는 것은 '졸이다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 145,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"답답한 교실을 벗어나 시원한 바깥바람을 ( ).\"",
    "options": [
      "쐤다",
      "쇘다"
    ],
    "answer": "쐤다",
    "explanation": "'쐬다'에 과거 시제 '-었-'이 붙으면 '쐬었다'가 줄어 '쐤다'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 146,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님, 내일 학교 끝나고 교무실에서 ( )!\"",
    "options": [
      "봬요",
      "뵈요"
    ],
    "answer": "봬요",
    "explanation": "'뵈어'의 준말이 '봬'이므로, 존칭 어미 '-요'가 붙을 때는 '봬요'가 올바른 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 147,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"봄이 되니 들판 위로 따스한 ( )가 피어올랐다.\"",
    "options": [
      "아지랑이",
      "아지랭이"
    ],
    "answer": "아지랑이",
    "explanation": "햇빛에 지면이 가열되어 공기가 아른거리는 현상은 '아지랑이'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 148,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"먹구름이 몰려오더니 하늘에서 쿵쾅쿵쾅 ( ) 소리가 났다.\"",
    "options": [
      "우레",
      "우뢰"
    ],
    "answer": "우레",
    "explanation": "'천둥'을 뜻하는 순우리말 표준어는 '우레'입니다. '우뢰(雨雷)'는 잘못된 한자 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 149,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"순진해서 세상 물정을 너무 모르는 ( ).\"",
    "options": [
      "숙맥",
      "쑥맥"
    ],
    "answer": "숙맥",
    "explanation": "'콩과 보리도 구별 못 한다'는 사자성어 '숙맥불변(菽麥不辨)'에서 온 말이므로 '숙맥'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 150,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"내가 ( ) 이번 대결에서 반드시 이길 거야!\"",
    "options": [
      "단언컨대",
      "단언컨데"
    ],
    "answer": "단언컨대",
    "explanation": "'단언하건대'가 줄어든 말이므로 어미 '-건대/-컨대'를 살려 '단언컨대'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 151,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"준비를 철저히 하지 않으면 시험을 망치기 ( )이다.\"",
    "options": [
      "십상",
      "쉽상"
    ],
    "answer": "십상",
    "explanation": "'열에 여덟이나 아홉'을 뜻하는 십상팔구(十常八九)에서 온 말이므로 '십상'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 152,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"나이에 비해 얼굴이 매우 앳되고 ( ) 보였다.\"",
    "options": [
      "귀여워",
      "귀여워"
    ],
    "answer": "귀여워",
    "explanation": "'귀엽다'에 모음 어미가 붙으면 'ㅂ'이 '우'로 바뀌어 '귀여워'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 153,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"빈칸에 들어갈 가장 ( ) 낱말을 고르시오.\"",
    "options": [
      "알맞은",
      "알맞는"
    ],
    "answer": "알맞은",
    "explanation": "'알맞다'는 형용사이므로 관형사형 어미 '-은'이 붙어 '알맞은'이 올바릅니다. ('알맞는'은 틀림)",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 154,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"상황에 ( ) 행동을 해야 칭찬을 받는다.\"",
    "options": [
      "걸맞은",
      "걸맞는"
    ],
    "answer": "걸맞은",
    "explanation": "'걸맞다'도 형용사이므로 현재 관형사형은 '걸맞은'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 155,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동생은 내 말에 어림없다는 듯 ( )를 뀌었다.\"",
    "options": [
      "콧방귀",
      "코방귀"
    ],
    "answer": "콧방귀",
    "explanation": "순우리말 합성어로 뒤 단어의 첫소리가 된소리로 나므로 사이시옷을 받쳐 '콧방귀'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 156,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어르신께 자리를 양보하며 ( )을 공경하자.\"",
    "options": [
      "웃어른",
      "윗어른"
    ],
    "answer": "웃어른",
    "explanation": "'아래'와 '위'의 대립이 없는 단어에는 '웃-'을 붙여 '웃어른'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 157,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"소음이 너무 심하니 ( )으로 올라가서 조용히 해달라고 하자.\"",
    "options": [
      "위층",
      "윗층"
    ],
    "answer": "위층",
    "explanation": "거센소리('ㅊ') 앞에서는 사이시옷을 받쳐 적지 않으므로 '위층'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 158,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"매일 아침 안전한 ( )을 통해 학교로 걸어간다.\"",
    "options": [
      "등굣길",
      "등교길"
    ],
    "answer": "등굣길",
    "explanation": "한자어 '등교'와 순우리말 '길'이 결합하여 [등교낄]로 소리 나므로 사이시옷을 적어 '등굣길'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 159,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어두운 밤길을 밝혀주는 작은 ( ) 하나.\"",
    "options": [
      "촛불",
      "초불"
    ],
    "answer": "촛불",
    "explanation": "'초'와 '불'이 합쳐져 [초뿔]로 소리 나므로 사이시옷을 붙여 '촛불'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 160,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가을철 갓 수확한 벼로 찧은 맛있는 ( ).\"",
    "options": [
      "햅쌀",
      "햇쌀"
    ],
    "answer": "햅쌀",
    "explanation": "'그해에 새로 난'을 뜻하는 접두사 '해-'에 '쌀'이 붙을 때 'ㅂ' 소리가 덧나 '햅쌀'이 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 161,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비계가 적고 담백한 붉은 ( ).\"",
    "options": [
      "살코기",
      "살고기"
    ],
    "answer": "살코기",
    "explanation": "'살'과 '고기'가 어울릴 때 'ㅎ' 소리가 덧나 거센소리 [살코기]로 소리 나므로 '살코기'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 162,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"집안 ( )을 깨끗하게 청소해서 기분이 상쾌하다.\"",
    "options": [
      "안팎",
      "안밖"
    ],
    "answer": "안팎",
    "explanation": "'안'과 '밖'이 결합하면서 거센소리가 덧나 '안팎'으로 굳어진 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 163,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"목장에서 풀을 뜯고 있는 뿔 달린 ( ).\"",
    "options": [
      "숫양",
      "수양"
    ],
    "answer": "숫양",
    "explanation": "수컷을 나타내는 접두사로 '숫-'을 쓰는 단어는 '숫양', '숫염소', '숫쥐' 3가지만 있습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 164,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"마당 한구석에서 꼬꼬댁 우는 씩씩한 ( ).\"",
    "options": [
      "수탉",
      "수닭"
    ],
    "answer": "수탉",
    "explanation": "수컷을 나타내는 '수-' 뒤에서 거센소리로 변하여 '수탉'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 165,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"복잡한 실타래처럼 이리저리 ( ) 문제.\"",
    "options": [
      "얽히고설킨",
      "얽히고얽힌"
    ],
    "answer": "얽히고설킨",
    "explanation": "관계나 일이 복잡하게 얽힌 모양은 '얽히고설키다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 166,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가방 안에 책과 준비물을 마구 ( ) 넣었다.\"",
    "options": [
      "욱여",
      "우겨"
    ],
    "answer": "욱여",
    "explanation": "주위에서 안쪽으로 밀어 넣는 행동은 '욱여넣다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 167,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"슬픈 영화를 보고 ( )이 붉어지며 눈물을 흘렸다.\"",
    "options": [
      "눈시울",
      "눈씨울"
    ],
    "answer": "눈시울",
    "explanation": "눈썹이 난 가장자리를 뜻하는 표준어는 '눈시울'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 168,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아침에 일어나 거울을 보니 눈가에 ( )이 끼어 있었다.\"",
    "options": [
      "눈곱",
      "눈꼽"
    ],
    "answer": "눈곱",
    "explanation": "발음은 [눈꼽]으로 나더라도 형태를 밝혀 '눈곱'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 169,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"불쾌한 행동을 보면 누구나 ( )을 찌푸리게 된다.\"",
    "options": [
      "눈살",
      "눈쌀"
    ],
    "answer": "눈살",
    "explanation": "눈썹과 눈썹 사이의 살을 뜻하는 단어는 '눈살'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 170,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"약속 시간을 ( ) 지키지 않고 늦는 친구.\"",
    "options": [
      "번번이",
      "번번히"
    ],
    "answer": "번번이",
    "explanation": "'매번'을 뜻하는 부사는 '번번이'가 맞습니다. '번번히'는 평평하다는 뜻입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 171,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"외출할 때 문을 꼭 ( ) 나갔는지 확인해라.\"",
    "options": [
      "잠그고",
      "잠구고"
    ],
    "answer": "잠그고",
    "explanation": "기본형이 '잠그다'이므로 어간 '잠그-'에 어미 '-고'가 붙어 '잠그고'가 됩니다. ('잠구다'는 틀림)",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 172,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"큰 시험을 무사히 잘 ( ) 홀가분하다.\"",
    "options": [
      "치렀으니",
      "치뤘으니"
    ],
    "answer": "치렀으니",
    "explanation": "기본형이 '치르다'이므로 과거형은 '치렀다'가 맞습니다. ('치뤘다'는 틀림)",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 173,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"김장철을 맞아 배추김치를 항아리에 ( ).\"",
    "options": [
      "담갔다",
      "담궜다"
    ],
    "answer": "담갔다",
    "explanation": "기본형이 '담그다'이므로 모음 어미 '-아'가 붙으면 '담가/담갔다'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 174,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"집에 가는 길에 잠시 문구점에 ( ) 가자.\"",
    "options": [
      "들렀다",
      "들렸다"
    ],
    "answer": "들렀다",
    "explanation": "'지나는 길에 잠깐 방문하다'는 '들르다'이므로 어미 '-어'가 결합하면 '들러/들렀다'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 175,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"물통에 물을 가득 ( ) 넘쳤다.\"",
    "options": [
      "부었더니",
      "붰더니"
    ],
    "answer": "부었더니",
    "explanation": "'붓다'는 'ㅅ' 불규칙 용언이므로 모음 어미가 오면 'ㅅ'이 탈락하여 '부어/부었더니'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 176,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"냄비 속의 국물을 국자로 골고루 ( ).\"",
    "options": [
      "저었다",
      "젔다"
    ],
    "answer": "저었다",
    "explanation": "'젓다'도 'ㅅ' 불규칙 용언이므로 모음 어미와 결합할 때 '저어/저었다'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 177,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"벽돌을 차곡차곡 쌓아 튼튼한 집을 ( ).\"",
    "options": [
      "지었다",
      "짔다"
    ],
    "answer": "지었다",
    "explanation": "'짓다'는 모음 어미가 올 때 'ㅅ'이 탈락하여 '지어/지었다'로 활용합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 178,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"감기가 다 ( ) 건강한 모습으로 등교했다.\"",
    "options": [
      "나아서",
      "낫아서"
    ],
    "answer": "나아서",
    "explanation": "'병이 고쳐지다'는 뜻의 '낫다'는 'ㅅ' 불규칙이므로 '나아/나아서'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 179,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동생이 밥을 먹기 싫다고 ( )을 부렸다.\"",
    "options": [
      "투정",
      "투증"
    ],
    "answer": "투정",
    "explanation": "까탈을 부리며 떼를 쓰는 것은 '투정'이 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 180,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"밥을 먹을 때는 ( )과 젓가락을 바르게 쥐어야 해.\"",
    "options": [
      "숟가락",
      "숫가락"
    ],
    "answer": "숟가락",
    "explanation": "'술'에서 'ㄹ'이 'ㄷ'으로 바뀐 단어로 '숟가락'이 맞습니다. (젓가락은 'ㅅ' 받침)",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 181,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"고소하고 쫄깃한 ( ) 떡을 명절에 쪄 먹었다.\"",
    "options": [
      "시루떡",
      "시룻떡"
    ],
    "answer": "시루떡",
    "explanation": "사이시옷 규정에서 된소리나 거센소리 앞에는 사이시옷을 붙이지 않아 '시루떡'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 182,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"겉으로 아무렇지 않은 척 ( ) 넘어가려 했다.\"",
    "options": [
      "어물쩍",
      "어물쩡"
    ],
    "answer": "어물쩍",
    "explanation": "말이나 행동을 슬그머니 대충 넘기는 모양은 '어물쩍'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 183,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"속으로 나쁜 꾀를 품고 ( )하게 행동하는 늑대.\"",
    "options": [
      "엉큼",
      "응큼"
    ],
    "answer": "엉큼",
    "explanation": "속으로 엉뚱한 욕심이나 흉계를 품고 있는 모양은 '엉큼하다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 184,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구가 잘난 척하며 거들먹거리고 ( )댔다.\"",
    "options": [
      "으스",
      "으시"
    ],
    "answer": "으스",
    "explanation": "우쭐하여 뽐내는 모양은 '으스대다'가 맞습니다. ('으시대다'는 비표준어)",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 185,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가을이 되어 나무 ( )가 울긋불긋 물들었다.\"",
    "options": [
      "이파리",
      "잎사귀"
    ],
    "answer": "이파리",
    "explanation": "단어의 뜻에 따라 식물의 잎 전체를 귀엽게 가리킬 때는 '이파리'나 '잎사귀' 모두 쓰이지만 단독 잎은 '이파리'가 널리 쓰입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 186,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"학생들의 출석을 ( ) 한 명씩 확인했다.\"",
    "options": [
      "일일이",
      "일일히"
    ],
    "answer": "일일이",
    "explanation": "'하나하나 모두'를 뜻하는 부사는 접미사 '-이'가 붙어 '일일이'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 187,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"문을 꼭 닫고 쇠 ( )를 단단히 채웠다.\"",
    "options": [
      "자물쇠",
      "자물통"
    ],
    "answer": "자물쇠",
    "explanation": "여닫는 문을 잠그는 장치는 '자물쇠'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 188,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가을바람에 낙엽이 ( ) 뒹굴고 있다.\"",
    "options": [
      "우수수",
      "우수새"
    ],
    "answer": "우수수",
    "explanation": "낙엽이나 열매 따위가 한꺼번에 떨어지는 소리나 모양은 '우수수'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 189,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"달콤한 사탕이 입안에서 ( ) 녹아내렸다.\"",
    "options": [
      "사르르",
      "사르륵"
    ],
    "answer": "사르르",
    "explanation": "눈이나 얼음 등이 소리 없이 부드럽게 녹는 모양은 '사르르'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 190,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 뜻밖의 비밀 고백에 깜짝 ( ).\"",
    "options": [
      "놀랐다",
      "놀래었다"
    ],
    "answer": "놀랐다",
    "explanation": "자신이 놀라는 것은 '놀라다'이므로 '놀랐다'가 맞습니다. 남을 놀라게 하는 것이 '놀래다'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 191,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"갑자기 뒤에서 큰 소리로 친구를 ( ) 주었다.\"",
    "options": [
      "놀래켜",
      "놀라게"
    ],
    "answer": "놀라게",
    "explanation": "남을 놀라게 만들 때는 '놀라게 하다' 또는 '놀래다'가 바른 표현입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 192,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동생이 칭찬을 듣고 기분이 좋아 ( ) 웃었다.\"",
    "options": [
      "배시시",
      "배시시"
    ],
    "answer": "배시시",
    "explanation": "소리 없이 눈과 입을 살며시 움직여 웃는 모양은 '배시시'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 193,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"마음씨가 곱고 착한 ( ) 아가씨.\"",
    "options": [
      "어여쁜",
      "어여뿐"
    ],
    "answer": "어여쁜",
    "explanation": "기본형 '어여쁘다'의 어간에 관형사형 어미 '-ㄴ'이 결합하여 '어여쁜'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 194,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"추운 겨울날 뜨끈뜨끈한 국물을 마시니 속이 ( ) 풀렸다.\"",
    "options": [
      "사르르",
      "스르르"
    ],
    "answer": "사르르",
    "explanation": "언 마음이나 굳은 감정이 자연스럽게 풀리는 모양은 '사르르'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 195,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"수업 시작 종이 울리자마자 ( ) 교실로 뛰어들어왔다.\"",
    "options": [
      "허둥지둥",
      "허둥대며"
    ],
    "answer": "허둥지둥",
    "explanation": "갈팡질팡 당황하여 정신없이 서두르는 부사는 '허둥지둥'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 196,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 따뜻한 격려 말씀에 가슴이 ( ).\"",
    "options": [
      "뭉클했다",
      "뭉쿨했다"
    ],
    "answer": "뭉클했다",
    "explanation": "감동이나 슬픔으로 가슴속이 벅차오르는 느낌은 '뭉클하다'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 197,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"새 학년이 되어 새로운 짝꿍과 ( ) 인사를 나누었다.\"",
    "options": [
      "반갑게",
      "반갑개"
    ],
    "answer": "반갑게",
    "explanation": "부사형 어미는 '-게'이므로 '반갑게'로 적어야 합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 198,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"달리기 시합에서 젖 먹던 ( )까지 다해 결승선을 통과했다.\"",
    "options": [
      "힘",
      "흼"
    ],
    "answer": "힘",
    "explanation": "육체적·정신적 에너지를 뜻하는 단어는 '힘'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 199,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"자신이 맡은 역할에 최선을 다하는 ( ) 학생이 되자.\"",
    "options": [
      "성실한",
      "성실핸"
    ],
    "answer": "성실한",
    "explanation": "'성실하다'에 관형사형 어미 '-ㄴ'이 붙어 '성실한'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 200,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"도서관에서는 다른 친구들을 위해 ( ) 걸어야 해.\"",
    "options": [
      "살금살금",
      "살굼살굼"
    ],
    "answer": "살금살금",
    "explanation": "남이 알아채지 못하게 조용히 발걸음을 옮기는 모양은 '살금살금'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 201,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"운동장에서 공을 차며 ( ) 뛰어놀았다.\"",
    "options": [
      "신나게",
      "신낫게"
    ],
    "answer": "신나게",
    "explanation": "기본형 '신나다'의 어간에 어미 '-게'가 붙어 '신나게'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 202,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 농담에 배를 잡고 ( ) 웃음이 터졌다.\"",
    "options": [
      "와르르",
      "와르륵"
    ],
    "answer": "와르르",
    "explanation": "참았던 웃음이나 눈물이 한꺼번에 터져 나오는 모양은 '와르르'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 203,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비가 그치고 먹구름이 걷히며 하늘이 ( ) 맑아졌다.\"",
    "options": [
      "환하게",
      "환햬게"
    ],
    "answer": "환하게",
    "explanation": "'환하다'에 부사형 어미 '-게'가 붙어 '환하게'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 204,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"숲길을 걷다 귀여운 아기 다람쥐를 ( ) 마주쳤다.\"",
    "options": [
      "우연히",
      "우연이"
    ],
    "answer": "우연히",
    "explanation": "'우연(偶然)'이라는 한자어 부사 뒤에는 '-히'가 붙어 '우연히'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 205,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"내일 아침 일찍 깨워 달라고 엄마에게 ( ) 부탁했다.\"",
    "options": [
      "간곡히",
      "간곡이"
    ],
    "answer": "간곡히",
    "explanation": "'간곡하다'처럼 '-하다'가 붙는 어근 뒤에는 '-히'가 붙어 '간곡히'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 206,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"책상 서랍 정리를 ( ) 마치고 나니 뿌듯했다.\"",
    "options": [
      "깔끔히",
      "깔끔이"
    ],
    "answer": "깔끔히",
    "explanation": "'깔끔하다'의 어근에 부사화 접미사 '-히'가 결합하여 '깔끔히'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 207,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아무리 힘든 일이라도 ( ) 포기하지 말자.\"",
    "options": [
      "결코",
      "결토"
    ],
    "answer": "결코",
    "explanation": "'어떠한 경우에도'라는 뜻을 나타내는 부정 부사는 '결코'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 208,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"정리정돈을 잘해서 방안이 ( ) 정갈해 보인다.\"",
    "options": [
      "사뭇",
      "사못"
    ],
    "answer": "사뭇",
    "explanation": "'아주 딴판으로' 또는 '마음에 차도록'의 뜻을 가진 부사는 '사뭇'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 209,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"겨울방학이 끝나고 오랜만에 친구들을 만나니 ( ) 반가웠다.\"",
    "options": [
      "더없이",
      "더업시"
    ],
    "answer": "더없이",
    "explanation": "'더할 나위 없이'의 뜻을 가진 합성 부사는 '더없이'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 210,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어린 동생이 혼자 옷을 입으려고 ( ) 애를 쓴다.\"",
    "options": [
      "용용",
      "용케"
    ],
    "answer": "용케",
    "explanation": "'어려운 일을 훌륭하게 해내다'라는 뜻의 '용하다'에서 온 부사는 '용케'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 211,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어둠 속에서 반짝이는 반딧불이를 ( ) 지켜보았다.\"",
    "options": [
      "가만히",
      "가만이"
    ],
    "answer": "가만히",
    "explanation": "'가만하다'의 어근 뒤에 '-히'가 붙어 '가만히'가 올바릅니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 212,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"바쁜 와중에도 틈을 내어 ( ) 운동을 했다.\"",
    "options": [
      "짬짬이",
      "짬짬히"
    ],
    "answer": "짬짬이",
    "explanation": "'짬(틈)'이 반복된 첩어 부사 뒤에는 '-이'가 붙어 '짬짬이'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 213,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"꽃밭에 알록달록 예쁜 꽃들이 ( ) 피어났다.\"",
    "options": [
      "송이송이",
      "송이송히"
    ],
    "answer": "송이송이",
    "explanation": "'송이'가 거듭된 명사 첩어 부사이므로 '-이'를 써서 '송이송이'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 214,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가을 하늘 높이 날아가는 기러기 ( )를 보았다.\"",
    "options": [
      "떼",
      "때"
    ],
    "answer": "떼",
    "explanation": "무리 지어 있는 동물의 모임을 나타낼 때는 '떼'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 215,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구와 어릴 적 함께 놀던 ( )를 추억했다.\"",
    "options": [
      "때",
      "떼"
    ],
    "answer": "때",
    "explanation": "어떤 일이나 현상이 일어나는 순간이나 시절을 뜻할 때는 '때'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 216,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"수학 문제를 풀기 위해 머리를 ( ) 맞대었다.\"",
    "options": [
      "서로",
      "서러"
    ],
    "answer": "서로",
    "explanation": "짝을 이루어 함께 함을 뜻하는 부사는 '서로'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 217,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 생일 선물로 정성스레 쓴 ( )를 건넸다.\"",
    "options": [
      "편지",
      "편치"
    ],
    "answer": "편지",
    "explanation": "안부나 소식을 전하는 글은 한자어 '편지(便紙)'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 218,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"숲속 옹달샘에서 시원한 ( )물이 솟아난다.\"",
    "options": [
      "샘",
      "쌤"
    ],
    "answer": "샘",
    "explanation": "땅에서 솟아 나오는 맑은 물은 '샘'이 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 219,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"어린이날을 맞아 부모님과 함께 ( )에 놀러 갔다.\"",
    "options": [
      "놀이공원",
      "노리공원"
    ],
    "answer": "놀이공원",
    "explanation": "'놀다'에 접미사 '-이'가 붙어 만들어진 명사이므로 '놀이공원'으로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 220,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"도서관에서 재미있는 ( )책을 대출해 읽었다.\"",
    "options": [
      "동화",
      "동하"
    ],
    "answer": "동화",
    "explanation": "어린이를 위하여 지은 이야기는 '동화(童話)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 221,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"맑고 푸른 가을 하늘에 하얀 ( )이 둥실 떠 있다.\"",
    "options": [
      "구름",
      "구룸"
    ],
    "answer": "구름",
    "explanation": "공기 중의 수증기가 뭉쳐 뜬 것은 '구름'이 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 222,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"봄바람에 살랑살랑 흔들리는 노란 ( )꽃.\"",
    "options": [
      "개나리",
      "개날이"
    ],
    "answer": "개나리",
    "explanation": "봄을 알리는 노란 봄꽃의 올바른 이름은 '개나리'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 223,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"추운 겨울철에는 따뜻한 ( )를 입어 감기를 예방하자.\"",
    "options": [
      "외투",
      "웨투"
    ],
    "answer": "외투",
    "explanation": "겉에 입는 두꺼운 옷은 '외투(外套)'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 224,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 질문에 바르게 손을 들고 ( )했다.\"",
    "options": [
      "대답",
      "대닾"
    ],
    "answer": "대답",
    "explanation": "부름이나 물음에 응하는 말은 '대답'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 225,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"여름철 바닷가 모래사장에서 예쁜 ( )를 주웠다.\"",
    "options": [
      "조개",
      "조게"
    ],
    "answer": "조개",
    "explanation": "껍데기가 두 짝으로 된 연체동물은 '조개'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 226,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아침 햇살을 받아 영롱하게 빛나는 풀잎 위의 ( ).\"",
    "options": [
      "이슬",
      "이슬이"
    ],
    "answer": "이슬",
    "explanation": "공기 중의 수증기가 찬 물체에 맺힌 방울은 '이슬'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 227,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"밤하늘을 올려다보니 은빛 ( )이 환하게 빛났다.\"",
    "options": [
      "초승달",
      "초생달"
    ],
    "answer": "초승달",
    "explanation": "음력 매달 초하룻날 무렵에 뜨는 눈썹 모양의 달은 '초승달'이 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 228,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구에게 빌린 지우개를 내일 꼭 ( ) 주기로 약속했다.\"",
    "options": [
      "돌려",
      "돌여"
    ],
    "answer": "돌려",
    "explanation": "'돌리다'의 활용형이므로 '돌려'가 올바른 표기입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 229,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"우리의 소중한 전통문화를 아끼고 ( ) 보존하자.\"",
    "options": [
      "길이",
      "기리"
    ],
    "answer": "길이",
    "explanation": "'영원히 오래도록'을 뜻하는 부사는 '길이'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 230,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"음식을 골고루 잘 먹어야 키가 ( ) 큰다.\"",
    "options": [
      "쑥쑥",
      "숙숙"
    ],
    "answer": "쑥쑥",
    "explanation": "거침없이 자라거나 나아가는 모양은 '쑥쑥'이 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 231,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 생일 파티를 위해 케이크에 ( )를 꽂았다.\"",
    "options": [
      "촛불",
      "초불"
    ],
    "answer": "촛불",
    "explanation": "순우리말 결합으로 [초뿔]로 소리 나므로 사이시옷을 받쳐 '촛불'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 232,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"아침 일찍 일어나 동네 한 바퀴를 ( ) 돌았다.\"",
    "options": [
      "빙글빙글",
      "빙글빙골"
    ],
    "answer": "빙글빙글",
    "explanation": "둥글게 자꾸 도는 모양을 나타내는 부사는 '빙글빙글'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 233,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"엄마가 끓여주신 구수한 된장찌개 맛이 ( ) 최고다.\"",
    "options": [
      "정말",
      "정말루"
    ],
    "answer": "정말",
    "explanation": "'거짓이 없이 참으로'를 뜻하는 표준어는 '정말'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 234,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"체육 시간에 힘차게 ( ) 넘기를 하며 체력을 길렀다.\"",
    "options": [
      "줄",
      "쥴"
    ],
    "answer": "줄",
    "explanation": "새끼나 노끈 등을 통틀어 이르는 말은 '줄'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 235,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구들과 함께 힘을 합쳐 ( )를 만드니 뿌듯했다.\"",
    "options": [
      "작품",
      "작풂"
    ],
    "answer": "작품",
    "explanation": "예술적·창작적 활동의 결과물을 뜻하는 한자어는 '작품(作品)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 236,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"맑은 시냇물 속에 작은 ( )들이 헤엄치고 있었다.\"",
    "options": [
      "송사리",
      "송살이"
    ],
    "answer": "송사리",
    "explanation": "시냇물에 사는 작은 민물고기의 이름은 '송사리'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 237,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"여름 밤하늘에 반짝반짝 빛나는 ( )을 세어 보았다.\"",
    "options": [
      "별",
      "뼐"
    ],
    "answer": "별",
    "explanation": "밤하늘에 스스로 빛을 내는 천체는 '별'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 238,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"동물원에서 긴 코로 풀을 집어 먹는 ( )를 만났다.\"",
    "options": [
      "코끼리",
      "코길이"
    ],
    "answer": "코끼리",
    "explanation": "코가 긴 동물의 이름은 '코끼리'가 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 239,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"비가 갠 뒤 숲속 나무 밑에 돋아난 작은 ( ).\"",
    "options": [
      "버섯",
      "버섯이"
    ],
    "answer": "버섯",
    "explanation": "균류에 속하는 식물성 생물의 이름은 '버섯'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 240,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"새콤달콤 맛있는 빨간 ( )를 한 입 베어 물었다.\"",
    "options": [
      "딸기",
      "딸긔"
    ],
    "answer": "딸기",
    "explanation": "봄철의 대표적인 붉은 과일은 '딸기'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 241,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 착하고 따뜻한 ( )씨에 모두가 감동했다.\"",
    "options": [
      "마음",
      "마암"
    ],
    "answer": "마음",
    "explanation": "사람의 생각, 감정, 기억이 생기는 곳은 '마음'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 242,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"수업 시간에 집중해서 선생님의 설명을 ( ) 들었다.\"",
    "options": [
      "귀담아",
      "귀담어"
    ],
    "answer": "귀담아",
    "explanation": "'귀담다'의 어간 '귀담-'에 모음 어미 '-아'가 결합하여 '귀담아'가 됩니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 243,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"우리 반 친구들과 ( ) 사이좋게 지내자.\"",
    "options": [
      "두루두루",
      "두루두리"
    ],
    "answer": "두루두루",
    "explanation": "'모두 골고루'를 뜻하는 부사는 '두루두루'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 244,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"시원한 가을바람에 노란 은행잎이 ( ) 떨어졌다.\"",
    "options": [
      "우수수",
      "우수새"
    ],
    "answer": "우수수",
    "explanation": "잎이나 꽃 등이 한꺼번에 떨어지는 모양은 '우수수'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 245,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"힘든 일이 있어도 긍정적인 ( )을 가지면 극복할 수 있어.\"",
    "options": [
      "자신감",
      "자신깜"
    ],
    "answer": "자신감",
    "explanation": "스스로를 믿는 굳센 느낌은 '자신감(自信感)'입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 246,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"약속 시간에 늦지 않으려고 걸음을 ( ) 옮겼다.\"",
    "options": [
      "바삐",
      "바삐히"
    ],
    "answer": "바삐",
    "explanation": "'바쁘다'의 부사형은 '바삐'가 올바른 표준어입니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 247,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"산 정상에 올라가서 야호를 ( ) 외쳤다.\"",
    "options": [
      "크게",
      "킈게"
    ],
    "answer": "크게",
    "explanation": "'크다'의 어간 '크-'에 부사형 어미 '-게'가 붙어 '크게'로 적습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 248,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"친구의 기쁜 소식을 듣고 내 일처럼 ( ) 기뻐했다.\"",
    "options": [
      "진심으로",
      "진심으루"
    ],
    "answer": "진심으로",
    "explanation": "조사는 '-으로'이므로 '진심으로'가 맞습니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 249,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"모르는 문제가 나오면 포기하지 말고 ( ) 끝까지 생각해보자.\"",
    "options": [
      "끈기 있게",
      "끈기 있개"
    ],
    "answer": "끈기 있게",
    "explanation": "어미는 '-게'이므로 '끈기 있게'로 적어야 합니다.",
    "source": "바른 국어 맞춤법"
  },
  {
    "id": 250,
    "question": "다음 중 올바른 표기는 무엇일까요?\n\"가족과 함께 보름달을 보며 마음속 ( )을 빌었다.\"",
    "options": [
      "소원",
      "소원"
    ],
    "answer": "소원",
    "explanation": "이루어지기를 바라는 바는 한자어 '소원(所願)'입니다.",
    "source": "바른 국어 맞춤법"
  }
];

// Embedded Static Files for 100% Zero-Stale Single-File Deployment
const EMBEDDED_FILES = {
  '/index.html': { type: 'text/html; charset=utf-8', content: "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>워터팡! 초등 맞춤법 퀴즈 배틀</title>\n  <link rel=\"stylesheet\" href=\"/css/style.css?v=2.0\">\n  <link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💧</text></svg>\">\n</head>\n<body>\n  <div id=\"app\">\n    <!-- Game Header -->\n    <header class=\"game-header\">\n      <div class=\"logo-title\">\n        <span>💧</span>\n        <span>워터팡! 맞춤법 배틀 <span style=\"background: #f59e0b; color: #451a03; font-size: 13px; padding: 2px 8px; border-radius: 12px; margin-left: 4px; font-weight: 900; vertical-align: middle;\">시즌 2</span></span>\n      </div>\n      <div class=\"user-quick-bar\" id=\"header-user-bar\" style=\"display: none;\">\n        <span class=\"tier-badge\" id=\"header-tier-badge\">💧 물방울 (100 RP)</span>\n        <span id=\"header-nickname\" style=\"font-size: 16px; font-weight: bold;\"></span>\n        <button class=\"btn-icon\" id=\"btn-sound-toggle\" title=\"소리 켜기/끄기\">🔊</button>\n        <button class=\"btn-icon\" id=\"btn-logout\" title=\"로그아웃\">🚪</button>\n      </div>\n    </header>\n\n    <!-- 1. Auth View (Login / Register / Quick Guest) -->\n    <section class=\"view-panel active\" id=\"view-auth\">\n      <div class=\"auth-container\">\n        <div class=\"auth-logo\">🎈💦</div>\n        <div class=\"auth-card\">\n          <h2 style=\"font-size: 26px; color: #0284c7; margin-bottom: 8px;\">신나는 맞춤법 퀴즈 대결!</h2>\n          <p style=\"font-size: 14px; color: #64748b; margin-bottom: 20px;\">\n            친구들과 1대 1로 물풍선을 던지며 맞춤법 왕이 되어보세요!\n          </p>\n\n          <!-- Auth Mode Tabs -->\n          <div class=\"auth-tabs\">\n            <button type=\"button\" class=\"auth-tab active\" id=\"tab-login\">기존 아이디 로그인</button>\n            <button type=\"button\" class=\"auth-tab\" id=\"tab-register\">새 계정 만들기</button>\n          </div>\n\n          <form id=\"form-auth\">\n            <div class=\"form-group\">\n              <label class=\"form-label\" for=\"auth-nickname\">내 닉네임 (아이디)</label>\n              <input type=\"text\" id=\"auth-nickname\" class=\"form-input\" placeholder=\"예: 번개람쥐 (2~10자)\" maxlength=\"12\" required>\n            </div>\n            <div class=\"form-group\">\n              <label class=\"form-label\" for=\"auth-password\">간편 비밀번호</label>\n              <input type=\"password\" id=\"auth-password\" class=\"form-input\" placeholder=\"비밀번호 (2자 이상)\" required>\n            </div>\n\n            <button type=\"submit\" class=\"btn-primary\" id=\"btn-submit-auth\">로그인하기</button>\n            <button type=\"button\" class=\"btn-sub\" id=\"btn-forgot-pw\" style=\"display: block; margin: 12px auto 0; font-size: 13px; color: #64748b; background: none; border: none; cursor: pointer; text-decoration: underline;\">비밀번호를 잊으셨나요?</button>\n          </form>\n        </div>\n      </div>\n    </section>\n\n    <!-- 2. Lobby View -->\n    <section class=\"view-panel\" id=\"view-lobby\">\n      <div class=\"lobby-grid\">\n        <!-- Profile Column -->\n        <div class=\"profile-card\">\n          <div class=\"profile-avatar-large\" id=\"lobby-avatar\">👦</div>\n          <h3 class=\"profile-name\" id=\"lobby-nickname\">학생</h3>\n          <div class=\"tier-badge\" id=\"lobby-tier-badge\" style=\"margin-bottom: 8px;\">💧 물방울 (100 RP)</div>\n          \n          <div class=\"stats-panel\">\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-wins\">0</div>\n              <div class=\"stat-label\">승리</div>\n            </div>\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-losses\">0</div>\n              <div class=\"stat-label\">패배</div>\n            </div>\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-winrate\">0%</div>\n              <div class=\"stat-label\">승률</div>\n            </div>\n          </div>\n\n          <div style=\"font-size: 13px; color: #64748b; width: 100%; text-align: left; margin-top: 4px;\">\n            다음 티어까지: <span id=\"tier-next-rp\" style=\"font-weight: bold; color: #0284c7;\">100 RP</span> 남음!\n          </div>\n        </div>\n\n        <!-- Main Action Column -->\n        <div class=\"lobby-main\">\n          <div class=\"hero-banner\">\n            <h2>실시간 1대 1 물풍선 배틀!</h2>\n            <p>\n              문제를 먼저 맞혀 물풍선을 날려보세요! 💥<br>\n              10문제를 풀고 승리하면 티어가 올라갑니다.\n            </p>\n            <div class=\"hero-water-balloon\">🎈</div>\n          </div>\n\n          <div class=\"action-cards\">\n            <button class=\"action-card-btn\" id=\"btn-open-leaderboard\">\n              <div class=\"action-icon\">🏆</div>\n              <div class=\"action-text\">\n                <div class=\"action-title\">명예의 전당 (시즌2)</div>\n                <div class=\"action-desc\">전체 학생 티어 순위 보기</div>\n              </div>\n            </button>\n\n            <button class=\"action-card-btn\" id=\"btn-open-wrongnotes\">\n              <div class=\"action-icon\">📝</div>\n              <div class=\"action-text\">\n                <div class=\"action-title\">나의 오답노트</div>\n                <div class=\"action-desc\">틀렸던 맞춤법 복습하기</div>\n              </div>\n            </button>\n          </div>\n\n          <button class=\"btn-primary btn-battle-start\" id=\"btn-start-matching\">\n            🚀 1대1 대결 시작! (랜덤 매칭)\n          </button>\n        </div>\n      </div>\n    </section>\n\n    <!-- 3. Matchmaking Queue View -->\n    <section class=\"view-panel\" id=\"view-matchmaking\">\n      <div class=\"matchmaking-container\">\n        <div class=\"radar-wrapper\">\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-icon\">🎯</div>\n        </div>\n        <h2 class=\"queue-status-text\">대결 상대를 찾는 중...</h2>\n        <p class=\"queue-subtext\">\n          매칭을 기다리는 친구가 없으면 <strong>3초 후 AI 봇</strong>과 대결이 시작됩니다!\n        </p>\n        <button class=\"btn-primary btn-accent\" id=\"btn-cancel-matching\" style=\"max-width: 240px;\">\n          매칭 취소\n        </button>\n      </div>\n    </section>\n\n    <!-- 4. Battle Arena View -->\n    <section class=\"view-panel\" id=\"view-battle\">\n      <div class=\"battle-container\" id=\"game-arena\">\n        <!-- Canvas for water balloons & particle explosions -->\n        <canvas id=\"battle-fx-canvas\"></canvas>\n\n        <!-- Battle Header -->\n        <div class=\"battle-top-bar\">\n          <div class=\"round-pill\" id=\"battle-round-indicator\">라운드 1 / 10</div>\n          <div class=\"battle-timer-box\">\n            <span>⏱️</span>\n            <span id=\"battle-timer-num\">10</span>s\n            <div class=\"timer-bar-bg\">\n              <div class=\"timer-bar-fill\" id=\"battle-timer-fill\"></div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Versus Arena Section -->\n        <div class=\"arena-versus\">\n          <!-- Player 1 (Me) -->\n          <div class=\"fighter-card\" id=\"fighter-p1\">\n            <div class=\"fighter-avatar\" id=\"avatar-p1\">👦\n              <div class=\"water-drips\">💦</div>\n            </div>\n            <div class=\"fighter-name\" id=\"name-p1\">나</div>\n            <div class=\"hp-gauge-wrapper\">\n              <div class=\"hp-text\">\n                <span>체력</span>\n                <span id=\"hp-num-p1\">100 / 100</span>\n              </div>\n              <div class=\"hp-bar-bg\">\n                <div class=\"hp-bar-fill\" id=\"hp-bar-p1\" style=\"width: 100%;\"></div>\n              </div>\n            </div>\n          </div>\n\n          <div class=\"vs-badge\">VS</div>\n\n          <!-- Player 2 (Opponent) -->\n          <div class=\"fighter-card\" id=\"fighter-p2\">\n            <div class=\"fighter-avatar\" id=\"avatar-p2\">🤖\n              <div class=\"water-drips\">💦</div>\n            </div>\n            <div class=\"fighter-name\" id=\"name-p2\">상대방</div>\n            <div class=\"hp-gauge-wrapper\">\n              <div class=\"hp-text\">\n                <span>체력</span>\n                <span id=\"hp-num-p2\">100 / 100</span>\n              </div>\n              <div class=\"hp-bar-bg\">\n                <div class=\"hp-bar-fill\" id=\"hp-bar-p2\" style=\"width: 100%;\"></div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Quiz Area -->\n        <div class=\"quiz-card\">\n          <div class=\"quiz-question\" id=\"quiz-question-text\">\n            문제를 불러오는 중입니다...\n          </div>\n\n          <div class=\"quiz-options-grid\" id=\"quiz-options-container\">\n            <!-- Buttons injected by app.js -->\n          </div>\n        </div>\n\n        <!-- Live Battle Action Banner -->\n        <div class=\"battle-banner\" id=\"battle-live-banner\">\n          문제를 먼저 맞히는 사람이 상대에게 물풍선을 던집니다!\n        </div>\n\n        <div class=\"explanation-box\" id=\"round-explanation-box\" style=\"display: none;\">\n          <!-- Educational spelling explanation -->\n        </div>\n      </div>\n    </section>\n\n    <!-- 5. Match Over View -->\n    <section class=\"view-panel\" id=\"view-match-over\">\n      <div class=\"match-over-container\">\n        <div class=\"result-crown\" id=\"result-emoji\">👑</div>\n        <h2 class=\"result-title win\" id=\"result-title\">대승리!</h2>\n        \n        <div class=\"rp-badge-change plus\" id=\"result-rp-badge\">\n          +25 RP 획득!\n        </div>\n\n        <div style=\"width: 100%; max-width: 600px; text-align: left; margin-bottom: 8px; font-weight: bold; color: #0284c7;\">\n          📖 이번 대결 오답/정답 퀴즈 복습\n        </div>\n        <div class=\"match-history-recap\" id=\"match-recap-list\">\n          <!-- Recap rounds injected here -->\n        </div>\n\n        <div style=\"display: flex; gap: 16px; width: 100%; max-width: 440px;\">\n          <button class=\"btn-primary\" id=\"btn-return-lobby\">로비로 이동</button>\n          <button class=\"btn-primary btn-accent\" id=\"btn-rematch\">다시 대결하기</button>\n        </div>\n      </div>\n    </section>\n\n    <!-- Modal: Leaderboard -->\n    <div class=\"modal-backdrop\" id=\"modal-leaderboard\">\n      <div class=\"modal-window\">\n        <div class=\"modal-header\">\n          <h3 id=\"leaderboard-modal-title\">🏆 명예의 전당 (시즌2)</h3>\n          <button class=\"btn-close\" id=\"btn-close-leaderboard\">✕</button>\n        </div>\n        <div class=\"modal-body\">\n          <div id=\"leaderboard-my-summary\"></div>\n          <div class=\"leaderboard-list\" id=\"leaderboard-container\">\n            <!-- Leaderboard rows -->\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <!-- Modal: Wrong Answer Note -->\n    <div class=\"modal-backdrop\" id=\"modal-wrongnotes\">\n      <div class=\"modal-window\">\n        <div class=\"modal-header\">\n          <h3>📝 나의 맞춤법 오답노트</h3>\n          <button class=\"btn-close\" id=\"btn-close-wrongnotes\">✕</button>\n        </div>\n        <div class=\"modal-body\" id=\"wrongnotes-container\">\n          <!-- Wrong answer cards -->\n        </div>\n      </div>\n    </div>\n\n    <!-- Toast message -->\n    <div class=\"toast-msg\" id=\"toast-notification\"></div>\n\n    <!-- Game Footer -->\n    <footer class=\"game-footer\">\n      <span>💧 워터팡! 초등 맞춤법 배틀</span>\n      <span class=\"footer-dot\">·</span>\n      <span class=\"footer-author\">made by 하하하하하쌤</span>\n    </footer>\n  </div>\n\n  <!-- Scripts -->\n  <script src=\"/js/audio.js?v=2.0\"></script>\n  <script src=\"/js/particles.js?v=2.0\"></script>\n  <script src=\"/js/app.js?v=2.0\"></script>\n</body>\n</html>\n" },
  '/css/style.css': { type: 'text/css; charset=utf-8', content: "@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;600;800;900&display=swap');\n\n:root {\n  --primary: #0284c7;\n  --primary-hover: #0369a1;\n  --accent: #f59e0b;\n  --danger: #ef4444;\n  --success: #10b981;\n  --bg-top: #0284c7;\n  --bg-bottom: #0f172a;\n  --card-bg: rgba(255, 255, 255, 0.95);\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n  user-select: none;\n}\n\nbody {\n  font-family: 'Jua', 'Noto Sans KR', sans-serif;\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%);\n  min-height: 100vh;\n  color: #1e293b;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  overflow-x: hidden;\n}\n\n/* Base Container */\n#app {\n  width: 100%;\n  max-width: 960px;\n  min-height: 640px;\n  background: #ffffff;\n  border-radius: 28px;\n  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 6px #38bdf8;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n}\n\n/* Header */\n.game-header {\n  background: linear-gradient(90deg, #0284c7, #38bdf8);\n  padding: 14px 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  color: white;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n  z-index: 10;\n}\n\n.logo-title {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-size: 24px;\n  letter-spacing: 0.5px;\n  text-shadow: 1px 2px 0px rgba(0, 0, 0, 0.2);\n}\n\n.user-quick-bar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.tier-badge {\n  background: rgba(255, 255, 255, 0.2);\n  padding: 6px 14px;\n  border-radius: 20px;\n  font-size: 15px;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid rgba(255, 255, 255, 0.4);\n  font-weight: bold;\n}\n\n.btn-icon {\n  background: rgba(255, 255, 255, 0.25);\n  border: none;\n  border-radius: 50%;\n  width: 38px;\n  height: 38px;\n  font-size: 18px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: white;\n  transition: all 0.15s;\n}\n\n.btn-icon:hover {\n  background: rgba(255, 255, 255, 0.45);\n  transform: scale(1.08);\n}\n\n/* Views Common */\n.view-panel {\n  display: none;\n  flex: 1;\n  padding: 24px;\n  flex-direction: column;\n  position: relative;\n}\n\n.view-panel.active {\n  display: flex;\n  animation: fadeIn 0.25s ease-out;\n}\n\n@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(8px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n/* Auth View */\n.auth-container {\n  max-width: 420px;\n  margin: auto;\n  text-align: center;\n}\n\n.auth-card {\n  background: #f8fafc;\n  padding: 32px 28px;\n  border-radius: 24px;\n  border: 3px solid #e2e8f0;\n  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);\n}\n\n.auth-logo {\n  font-size: 64px;\n  margin-bottom: 12px;\n  animation: floatBounce 2.5s infinite ease-in-out;\n}\n\n@keyframes floatBounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-8px); }\n}\n\n.auth-tabs {\n  display: flex;\n  background: #e2e8f0;\n  border-radius: 14px;\n  padding: 4px;\n  margin-bottom: 20px;\n  gap: 6px;\n}\n\n.auth-tab {\n  flex: 1;\n  padding: 10px 12px;\n  border: none;\n  background: transparent;\n  border-radius: 10px;\n  font-family: inherit;\n  font-size: 15px;\n  font-weight: bold;\n  color: #64748b;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n\n.auth-tab.active {\n  background: white;\n  color: #0284c7;\n  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);\n}\n\n.form-group {\n  margin-bottom: 16px;\n  text-align: left;\n}\n\n.form-label {\n  font-size: 14px;\n  color: #475569;\n  margin-bottom: 6px;\n  display: block;\n}\n\n.form-input {\n  width: 100%;\n  padding: 12px 16px;\n  border: 2px solid #cbd5e1;\n  border-radius: 14px;\n  font-size: 16px;\n  font-family: inherit;\n  outline: none;\n  transition: border-color 0.2s;\n}\n\n.form-input:focus {\n  border-color: #0284c7;\n  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);\n}\n\n/* Buttons */\n.btn-primary {\n  width: 100%;\n  padding: 14px 20px;\n  background: linear-gradient(180deg, #38bdf8, #0284c7);\n  border: none;\n  border-bottom: 4px solid #0369a1;\n  border-radius: 16px;\n  color: white;\n  font-size: 19px;\n  font-family: inherit;\n  font-weight: bold;\n  cursor: pointer;\n  transition: all 0.1s;\n  box-shadow: 0 6px 12px rgba(2, 132, 199, 0.3);\n}\n\n.btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 16px rgba(2, 132, 199, 0.4);\n}\n\n.btn-primary:active {\n  transform: translateY(2px);\n  border-bottom-width: 2px;\n}\n\n.btn-accent {\n  background: linear-gradient(180deg, #fbbf24, #f59e0b);\n  border-bottom: 4px solid #d97706;\n  color: #451a03;\n}\n\n.btn-accent:hover {\n  background: linear-gradient(180deg, #fcd34d, #f59e0b);\n}\n\n.btn-sub {\n  background: transparent;\n  border: none;\n  color: #64748b;\n  font-size: 14px;\n  font-family: inherit;\n  margin-top: 14px;\n  cursor: pointer;\n  text-decoration: underline;\n}\n\n/* Lobby View */\n.lobby-grid {\n  display: grid;\n  grid-template-columns: 320px 1fr;\n  gap: 24px;\n  flex: 1;\n}\n\n.profile-card {\n  background: linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%);\n  border: 3px solid #bae6fd;\n  border-radius: 24px;\n  padding: 24px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.profile-avatar-large {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: white;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.15);\n  border: 4px solid #38bdf8;\n  margin-bottom: 12px;\n}\n\n.profile-name {\n  font-size: 24px;\n  color: #0c4a6e;\n  margin-bottom: 6px;\n}\n\n.stats-panel {\n  width: 100%;\n  background: white;\n  border-radius: 16px;\n  padding: 14px;\n  margin: 16px 0;\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 8px;\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);\n}\n\n.stat-box {\n  text-align: center;\n}\n\n.stat-value {\n  font-size: 20px;\n  font-weight: bold;\n  color: #0369a1;\n}\n\n.stat-label {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.lobby-main {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n}\n\n.hero-banner {\n  background: linear-gradient(135deg, #38bdf8, #0ea5e9);\n  border-radius: 24px;\n  padding: 28px;\n  color: white;\n  position: relative;\n  overflow: hidden;\n  box-shadow: 0 10px 25px rgba(14, 165, 233, 0.25);\n}\n\n.hero-banner h2 {\n  font-size: 32px;\n  margin-bottom: 8px;\n  text-shadow: 1px 2px 0 rgba(0,0,0,0.2);\n}\n\n.hero-banner p {\n  font-size: 16px;\n  opacity: 0.95;\n  line-height: 1.5;\n}\n\n.hero-water-balloon {\n  position: absolute;\n  right: 20px;\n  bottom: -10px;\n  font-size: 90px;\n  opacity: 0.85;\n  transform: rotate(15deg);\n}\n\n.action-cards {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n  margin-top: 16px;\n}\n\n.action-card-btn {\n  background: white;\n  border: 3px solid #e2e8f0;\n  border-radius: 20px;\n  padding: 18px;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-family: inherit;\n}\n\n.action-card-btn:hover {\n  border-color: #38bdf8;\n  transform: translateY(-3px);\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);\n}\n\n.action-icon {\n  font-size: 34px;\n}\n\n.action-text {\n  text-align: left;\n}\n\n.action-title {\n  font-size: 17px;\n  font-weight: bold;\n  color: #1e293b;\n}\n\n.action-desc {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.btn-battle-start {\n  margin-top: 18px;\n  padding: 20px;\n  font-size: 26px;\n  letter-spacing: 1px;\n}\n\n/* Matchmaking Queue View */\n.matchmaking-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n  text-align: center;\n}\n\n.radar-wrapper {\n  position: relative;\n  width: 180px;\n  height: 180px;\n  margin-bottom: 24px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.radar-pulse {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  border: 3px solid #38bdf8;\n  animation: radarPulse 2s infinite ease-out;\n}\n\n.radar-pulse:nth-child(2) {\n  animation-delay: 0.6s;\n}\n\n.radar-pulse:nth-child(3) {\n  animation-delay: 1.2s;\n}\n\n@keyframes radarPulse {\n  0% { transform: scale(0.3); opacity: 1; }\n  100% { transform: scale(1.4); opacity: 0; }\n}\n\n.radar-icon {\n  font-size: 64px;\n  z-index: 2;\n}\n\n.queue-status-text {\n  font-size: 26px;\n  color: #0284c7;\n  margin-bottom: 8px;\n}\n\n.queue-subtext {\n  font-size: 15px;\n  color: #64748b;\n  margin-bottom: 24px;\n}\n\n/* Battle Arena View */\n.battle-container {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  position: relative;\n  height: 100%;\n}\n\n/* Canvas overlay for projectiles & splashes */\n#battle-fx-canvas {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 30;\n}\n\n.battle-top-bar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 4px 12px 14px;\n  border-bottom: 2px dashed #e2e8f0;\n}\n\n.round-pill {\n  background: #0284c7;\n  color: white;\n  padding: 6px 18px;\n  border-radius: 20px;\n  font-size: 18px;\n  font-weight: bold;\n}\n\n.battle-timer-box {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 22px;\n  color: #d97706;\n}\n\n.timer-bar-bg {\n  width: 180px;\n  height: 14px;\n  background: #e2e8f0;\n  border-radius: 8px;\n  overflow: hidden;\n}\n\n.timer-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);\n  width: 100%;\n  transition: width 0.1s linear;\n}\n\n/* Arena Versus Section */\n.arena-versus {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px 20px;\n  position: relative;\n}\n\n.fighter-card {\n  width: 220px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  transition: transform 0.2s;\n}\n\n.fighter-avatar {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: #f0f9ff;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);\n  position: relative;\n  transition: all 0.2s;\n}\n\n.fighter-card.drenched .fighter-avatar {\n  animation: drenchedShake 0.4s ease-in-out;\n  border-color: #ef4444;\n  background: #fee2e2;\n}\n\n@keyframes drenchedShake {\n  0%, 100% { transform: scale(1) rotate(0deg); }\n  25% { transform: scale(0.92) rotate(-8deg); }\n  75% { transform: scale(0.92) rotate(8deg); }\n}\n\n.water-drips {\n  display: none;\n  position: absolute;\n  bottom: -8px;\n  font-size: 20px;\n}\n\n.fighter-card.drenched .water-drips {\n  display: block;\n}\n\n.fighter-name {\n  font-size: 20px;\n  color: #1e293b;\n  margin-top: 8px;\n}\n\n.hp-gauge-wrapper {\n  width: 100%;\n  margin-top: 8px;\n}\n\n.hp-text {\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  color: #64748b;\n  margin-bottom: 4px;\n}\n\n.hp-bar-bg {\n  width: 100%;\n  height: 16px;\n  background: #e2e8f0;\n  border-radius: 10px;\n  overflow: hidden;\n  border: 2px solid #cbd5e1;\n}\n\n.hp-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #34d399);\n  width: 100%;\n  border-radius: 8px;\n  transition: width 0.35s ease-out, background 0.3s;\n}\n\n.hp-bar-fill.warning {\n  background: linear-gradient(90deg, #f59e0b, #fbbf24);\n}\n\n.hp-bar-fill.danger {\n  background: linear-gradient(90deg, #ef4444, #f87171);\n}\n\n.vs-badge {\n  font-size: 36px;\n  font-weight: 900;\n  color: #f59e0b;\n  text-shadow: 2px 3px 0 #b45309;\n  letter-spacing: 2px;\n}\n\n/* Quiz Arena */\n.quiz-card {\n  background: #f8fafc;\n  border: 3px solid #cbd5e1;\n  border-radius: 24px;\n  padding: 24px;\n  margin: 12px 0;\n  text-align: center;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);\n}\n\n.quiz-question {\n  font-size: 24px;\n  line-height: 1.45;\n  color: #0f172a;\n  white-space: pre-line;\n  margin-bottom: 20px;\n}\n\n.quiz-options-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n}\n\n.btn-option {\n  background: white;\n  border: 3px solid #94a3b8;\n  border-bottom: 6px solid #64748b;\n  border-radius: 18px;\n  padding: 18px 24px;\n  font-size: 26px;\n  font-weight: bold;\n  color: #1e293b;\n  cursor: pointer;\n  transition: all 0.1s;\n  font-family: inherit;\n}\n\n.btn-option:hover:not(:disabled) {\n  border-color: #0284c7;\n  border-bottom-color: #0369a1;\n  transform: translateY(-2px);\n  background: #f0f9ff;\n}\n\n.btn-option:active:not(:disabled) {\n  transform: translateY(3px);\n  border-bottom-width: 3px;\n}\n\n.btn-option:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.btn-option.correct-pick {\n  background: #dcfce7 !important;\n  border-color: #10b981 !important;\n  border-bottom-color: #059669 !important;\n  color: #065f46 !important;\n}\n\n.btn-option.wrong-pick {\n  background: #fee2e2 !important;\n  border-color: #ef4444 !important;\n  border-bottom-color: #b91c1c !important;\n  color: #991b1b !important;\n}\n\n/* Battle Action Banner */\n.battle-banner {\n  min-height: 60px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  font-size: 18px;\n  color: #0284c7;\n  background: #f0f9ff;\n  border-radius: 14px;\n  padding: 8px 16px;\n}\n\n.explanation-box {\n  background: #eff6ff;\n  border-left: 5px solid #3b82f6;\n  padding: 10px 14px;\n  border-radius: 8px;\n  font-size: 15px;\n  color: #1e40af;\n  margin-top: 6px;\n  text-align: left;\n}\n\n/* Screen Shake Classes */\n.screen-shake {\n  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n.screen-shake-intense {\n  animation: shakeIntense 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n@keyframes shake {\n  10%, 90% { transform: translate3d(-3px, 0, 0); }\n  20%, 80% { transform: translate3d(5px, 0, 0); }\n  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }\n  40%, 60% { transform: translate3d(6px, 0, 0); }\n}\n\n@keyframes shakeIntense {\n  10%, 90% { transform: translate3d(-6px, 3px, 0) rotate(-1deg); }\n  20%, 80% { transform: translate3d(8px, -4px, 0) rotate(1.5deg); }\n  30%, 50%, 70% { transform: translate3d(-10px, 5px, 0) rotate(-2deg); }\n  40%, 60% { transform: translate3d(10px, -5px, 0) rotate(2deg); }\n}\n\n/* Match Over View */\n.match-over-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  flex: 1;\n  padding: 16px 0;\n}\n\n.result-crown {\n  font-size: 72px;\n  animation: floatBounce 2s infinite ease-in-out;\n}\n\n.result-title {\n  font-size: 40px;\n  margin: 6px 0;\n}\n\n.result-title.win {\n  color: #f59e0b;\n  text-shadow: 2px 2px 0 #b45309;\n}\n\n.result-title.lose {\n  color: #64748b;\n}\n\n.result-title.draw {\n  color: #0284c7;\n}\n\n.rp-badge-change {\n  display: inline-block;\n  padding: 8px 24px;\n  border-radius: 24px;\n  font-size: 20px;\n  font-weight: bold;\n  margin-bottom: 16px;\n}\n\n.rp-badge-change.plus {\n  background: #dcfce7;\n  color: #166534;\n  border: 2px solid #86efac;\n}\n\n.rp-badge-change.minus {\n  background: #fee2e2;\n  color: #991b1b;\n  border: 2px solid #fca5a5;\n}\n\n.match-history-recap {\n  width: 100%;\n  max-height: 220px;\n  overflow-y: auto;\n  background: #f8fafc;\n  border-radius: 18px;\n  border: 2px solid #e2e8f0;\n  padding: 12px;\n  margin-bottom: 20px;\n}\n\n.recap-item {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 12px;\n  border-bottom: 1px solid #e2e8f0;\n  font-size: 14px;\n}\n\n.recap-item:last-child {\n  border-bottom: none;\n}\n\n/* Modals */\n.modal-backdrop {\n  display: none;\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: rgba(0, 0, 0, 0.6);\n  z-index: 100;\n  align-items: center;\n  justify-content: center;\n}\n\n.modal-backdrop.active {\n  display: flex;\n  animation: fadeIn 0.2s ease-out;\n}\n\n.modal-window {\n  background: white;\n  width: 90%;\n  max-width: 540px;\n  max-height: 80vh;\n  border-radius: 24px;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.modal-header {\n  background: #f0f9ff;\n  padding: 16px 20px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  border-bottom: 2px solid #e2e8f0;\n}\n\n.modal-header h3 {\n  font-size: 20px;\n  color: #0369a1;\n}\n\n.modal-body {\n  padding: 20px;\n  overflow-y: auto;\n  flex: 1;\n}\n\n/* Leaderboard & My Rank Styles */\n.my-rank-banner {\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);\n  color: white;\n  padding: 12px 16px;\n  border-radius: 14px;\n  margin-bottom: 14px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.my-rank-banner:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.35);\n}\n\n.my-rank-banner .my-rank-left {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.my-rank-banner .my-rank-label {\n  font-size: 12px;\n  opacity: 0.9;\n  font-weight: 600;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.my-rank-banner .my-rank-pos {\n  font-size: 22px;\n  font-weight: 800;\n  letter-spacing: -0.5px;\n}\n\n.my-rank-banner .my-rank-total {\n  font-size: 13px;\n  opacity: 0.85;\n  font-weight: 500;\n}\n\n.my-rank-banner .my-rank-right {\n  text-align: right;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: 2px;\n}\n\n.my-rank-banner .my-rank-tier {\n  font-size: 13px;\n  opacity: 0.95;\n  font-weight: 600;\n}\n\n.my-rank-banner .my-rank-rp {\n  font-size: 18px;\n  font-weight: 800;\n  color: #fef08a;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);\n}\n\n.my-rank-jump-hint {\n  font-size: 11px;\n  background: rgba(255, 255, 255, 0.22);\n  padding: 2px 8px;\n  border-radius: 10px;\n  margin-top: 2px;\n  display: inline-block;\n}\n\n.my-rank-banner.guest {\n  background: #f1f5f9;\n  color: #475569;\n  border: 1px dashed #cbd5e1;\n  box-shadow: none;\n  cursor: default;\n}\n\n.my-rank-banner.guest:hover {\n  transform: none;\n  box-shadow: none;\n}\n\n.leaderboard-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.leaderboard-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 10px 14px;\n  background: #f8fafc;\n  border-radius: 12px;\n  border: 1px solid #e2e8f0;\n  transition: all 0.2s ease;\n}\n\n.leaderboard-row.rank-1 {\n  background: #fef9c3;\n  border-color: #facc15;\n}\n\n.leaderboard-row.rank-2 {\n  background: #f8fafc;\n  border-color: #94a3b8;\n}\n\n.leaderboard-row.rank-3 {\n  background: #fff7ed;\n  border-color: #fdba74;\n}\n\n/* User's Own Ranking Highlight */\n.leaderboard-row.my-rank-row {\n  background: #eff6ff !important;\n  border: 2.5px solid #0284c7 !important;\n  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.28) !important;\n  position: relative;\n}\n\n.my-badge {\n  display: inline-block;\n  background: #0284c7;\n  color: white;\n  font-size: 11px;\n  font-weight: 800;\n  padding: 2px 8px;\n  border-radius: 10px;\n  margin-left: 6px;\n  vertical-align: middle;\n  box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);\n}\n\n@keyframes pulseMyRow {\n  0% { transform: scale(1); }\n  50% { transform: scale(1.025); }\n  100% { transform: scale(1); }\n}\n\n.leaderboard-row.pulse-highlight {\n  animation: pulseMyRow 0.5s ease-in-out 2;\n}\n\n.leaderboard-rank {\n  font-size: 18px;\n  font-weight: bold;\n  width: 36px;\n}\n\n.leaderboard-user {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n}\n\n.btn-close {\n  background: transparent;\n  border: none;\n  font-size: 22px;\n  cursor: pointer;\n  color: #64748b;\n}\n\n/* Toast Notification */\n.toast-msg {\n  position: fixed;\n  top: 20px;\n  left: 50%;\n  transform: translateX(-50%) translateY(-30px);\n  background: #0f172a;\n  color: white;\n  padding: 12px 24px;\n  border-radius: 20px;\n  font-size: 16px;\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);\n  opacity: 0;\n  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);\n  pointer-events: none;\n  z-index: 200;\n}\n\n.toast-msg.show {\n  transform: translateX(-50%) translateY(0);\n  opacity: 1;\n}\n\n/* Responsive adjustments */\n@media (max-width: 768px) {\n  #app {\n    border-radius: 0;\n    min-height: 100vh;\n    border: none;\n  }\n  .lobby-grid {\n    grid-template-columns: 1fr;\n  }\n  .arena-versus {\n    padding: 8px;\n  }\n  .fighter-avatar {\n    width: 80px;\n    height: 80px;\n    font-size: 50px;\n  }\n  .quiz-options-grid {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* Footer Style */\n.game-footer {\n  text-align: center;\n  padding: 12px 16px;\n  font-size: 13px;\n  color: #64748b;\n  background: #f8fafc;\n  border-top: 2px solid #e2e8f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  z-index: 20;\n  margin-top: auto;\n}\n\n.footer-dot {\n  opacity: 0.5;\n}\n\n.footer-author {\n  color: #0284c7;\n  font-weight: 800;\n}\n\n" },
  '/js/audio.js': { type: 'application/javascript; charset=utf-8', content: "// Procedural Web Audio API Sound Generator\n// Zero external assets required! 100% reliable and instantaneous.\n\nclass SoundFX {\n  constructor() {\n    this.ctx = null;\n    this.enabled = true;\n  }\n\n  init() {\n    try {\n      if (!this.ctx) {\n        const AudioContext = window.AudioContext || window.webkitAudioContext;\n        if (AudioContext) {\n          this.ctx = new AudioContext();\n        }\n      }\n      if (this.ctx && this.ctx.state === 'suspended') {\n        this.ctx.resume().catch(() => {});\n      }\n    } catch (e) {\n      console.warn('[Audio] Init ignored:', e.message);\n    }\n  }\n\n  toggle() {\n    this.enabled = !this.enabled;\n    return this.enabled;\n  }\n\n  // 1. Water balloon throw whoosh (휙!)\n  playThrow() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n      const filter = this.ctx.createBiquadFilter();\n\n      osc.type = 'sine';\n      osc.frequency.setValueAtTime(300, t);\n      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);\n      osc.frequency.exponentialRampToValueAtTime(200, t + 0.35);\n\n      filter.type = 'lowpass';\n      filter.frequency.setValueAtTime(1200, t);\n\n      gain.gain.setValueAtTime(0.01, t);\n      gain.gain.linearRampToValueAtTime(0.35, t + 0.1);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n      osc.connect(filter);\n      filter.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t);\n      osc.stop(t + 0.36);\n    } catch (e) {}\n  }\n\n  // 2. Water balloon hit & splash explosion (펑! 콰광!)\n  playSplash(isCritical = false) {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const duration = isCritical ? 0.6 : 0.45;\n\n      // White noise for water splash\n      const bufferSize = this.ctx.sampleRate * duration;\n      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);\n      const data = buffer.getChannelData(0);\n      for (let i = 0; i < bufferSize; i++) {\n        data[i] = Math.random() * 2 - 1;\n      }\n\n      const noise = this.ctx.createBufferSource();\n      noise.buffer = buffer;\n\n      const noiseFilter = this.ctx.createBiquadFilter();\n      noiseFilter.type = 'bandpass';\n      noiseFilter.frequency.setValueAtTime(isCritical ? 1400 : 900, t);\n      noiseFilter.frequency.exponentialRampToValueAtTime(200, t + duration);\n      noiseFilter.Q.setValueAtTime(2, t);\n\n      const noiseGain = this.ctx.createGain();\n      noiseGain.gain.setValueAtTime(isCritical ? 0.9 : 0.65, t);\n      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);\n\n      noise.connect(noiseFilter);\n      noiseFilter.connect(noiseGain);\n      noiseGain.connect(this.ctx.destination);\n\n      // Deep sub-bass punch impact\n      const punchOsc = this.ctx.createOscillator();\n      const punchGain = this.ctx.createGain();\n      punchOsc.type = 'triangle';\n      punchOsc.frequency.setValueAtTime(isCritical ? 180 : 130, t);\n      punchOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);\n\n      punchGain.gain.setValueAtTime(isCritical ? 0.8 : 0.5, t);\n      punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);\n\n      punchOsc.connect(punchGain);\n      punchGain.connect(this.ctx.destination);\n\n      noise.start(t);\n      punchOsc.start(t);\n      punchOsc.stop(t + 0.31);\n    } catch (e) {}\n  }\n\n  // 3. Ding-Dong Correct Sound (딩동댕!)\n  playCorrect() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6\n      const t = this.ctx.currentTime;\n\n      notes.forEach((freq, i) => {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n\n        osc.type = 'sine';\n        osc.frequency.setValueAtTime(freq, t + i * 0.08);\n\n        gain.gain.setValueAtTime(0.001, t + i * 0.08);\n        gain.gain.linearRampToValueAtTime(0.3, t + i * 0.08 + 0.02);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + i * 0.08);\n        osc.stop(t + i * 0.08 + 0.45);\n      });\n    } catch (e) {}\n  }\n\n  // 4. Buzzer Wrong Sound (삐-익!)\n  playWrong() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n\n      const osc1 = this.ctx.createOscillator();\n      const osc2 = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc1.type = 'sawtooth';\n      osc2.type = 'sawtooth';\n\n      osc1.frequency.setValueAtTime(140, t);\n      osc2.frequency.setValueAtTime(147, t); // dissonant dissonance\n\n      gain.gain.setValueAtTime(0.25, t);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n      osc1.connect(gain);\n      osc2.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc1.start(t);\n      osc2.start(t);\n      osc1.stop(t + 0.36);\n      osc2.stop(t + 0.36);\n    } catch (e) {}\n  }\n\n  // 5. Timer tick\n  playTick() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc.type = 'triangle';\n      osc.frequency.setValueAtTime(800, t);\n\n      gain.gain.setValueAtTime(0.15, t);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);\n\n      osc.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t);\n      osc.stop(t + 0.06);\n    } catch (e) {}\n  }\n\n  // 6. Match Victory Fanfare\n  playVictory() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const chords = [\n        { notes: [523.25, 659.25], time: 0, dur: 0.18 },\n        { notes: [523.25, 659.25], time: 0.2, dur: 0.18 },\n        { notes: [523.25, 659.25], time: 0.4, dur: 0.18 },\n        { notes: [659.25, 783.99, 1046.50], time: 0.65, dur: 0.8 }\n      ];\n\n      chords.forEach(c => {\n        c.notes.forEach(freq => {\n          const osc = this.ctx.createOscillator();\n          const gain = this.ctx.createGain();\n          osc.type = 'triangle';\n          osc.frequency.setValueAtTime(freq, t + c.time);\n\n          gain.gain.setValueAtTime(0.01, t + c.time);\n          gain.gain.linearRampToValueAtTime(0.25, t + c.time + 0.03);\n          gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);\n\n          osc.connect(gain);\n          gain.connect(this.ctx.destination);\n\n          osc.start(t + c.time);\n          osc.stop(t + c.time + c.dur + 0.05);\n        });\n      });\n    } catch (e) {}\n  }\n\n  // 7. Defeat Sad sound\n  playDefeat() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const notes = [440, 415.3, 392, 349.2];\n      notes.forEach((freq, i) => {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n        osc.type = 'sawtooth';\n        osc.frequency.setValueAtTime(freq, t + i * 0.25);\n\n        gain.gain.setValueAtTime(0.18, t + i * 0.25);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.28);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + i * 0.25);\n        osc.stop(t + i * 0.25 + 0.3);\n      });\n    } catch (e) {}\n  }\n}\n\nwindow.soundFX = new SoundFX();\n" },
  '/js/particles.js': { type: 'application/javascript; charset=utf-8', content: "// Dynamic Water Balloon & Splash Particle FX Engine\n\nclass BattleFX {\n  constructor(canvasId) {\n    this.canvas = document.getElementById(canvasId);\n    this.ctx = this.canvas.getContext('2d');\n    this.projectiles = [];\n    this.particles = [];\n    this.shockwaves = [];\n    this.floatingTexts = [];\n    this.animating = false;\n\n    this.resize();\n    window.addEventListener('resize', () => this.resize());\n    this.loop();\n  }\n\n  resize() {\n    if (!this.canvas) return;\n    const rect = this.canvas.parentElement.getBoundingClientRect();\n    this.canvas.width = rect.width;\n    this.canvas.height = rect.height;\n  }\n\n  // Launch a water balloon from player to opponent (or vice versa)\n  throwBalloon(fromPos, toPos, isCritical, damage, onHitCallback) {\n    window.soundFX.playThrow();\n\n    const duration = 650; // ms flight time\n    const heightArc = Math.min(180, Math.abs(toPos.x - fromPos.x) * 0.35 + 80);\n\n    const projectile = {\n      startX: fromPos.x,\n      startY: fromPos.y,\n      targetX: toPos.x,\n      targetY: toPos.y,\n      heightArc,\n      startTime: performance.now(),\n      duration,\n      isCritical,\n      damage,\n      onHitCallback,\n      color: isCritical ? '#00e5ff' : '#00b0ff',\n      tailParticles: []\n    };\n\n    this.projectiles.push(projectile);\n  }\n\n  // Create splash explosion at coordinates\n  createSplash(x, y, isCritical, damage) {\n    window.soundFX.playSplash(isCritical);\n\n    // Screen Shake effect\n    this.triggerScreenShake(isCritical ? 14 : 8);\n\n    // 1. Water Shockwave Ripple\n    this.shockwaves.push({\n      x,\n      y,\n      radius: 10,\n      maxRadius: isCritical ? 130 : 90,\n      opacity: 0.9,\n      color: isCritical ? 'rgba(0, 229, 255,' : 'rgba(56, 189, 248,'\n    });\n\n    // 2. 45 Water Droplets Explosion\n    const dropletCount = isCritical ? 55 : 38;\n    for (let i = 0; i < dropletCount; i++) {\n      const angle = Math.random() * Math.PI * 2;\n      const speed = Math.random() * (isCritical ? 14 : 10) + 3;\n      const size = Math.random() * 6 + 3;\n      this.particles.push({\n        x,\n        y,\n        vx: Math.cos(angle) * speed,\n        vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // bias upwards\n        size,\n        color: Math.random() > 0.3 ? '#38bdf8' : '#e0f2fe',\n        alpha: 1,\n        decay: Math.random() * 0.02 + 0.015,\n        gravity: 0.38\n      });\n    }\n\n    // 3. Floating Damage / Critical Text\n    this.floatingTexts.push({\n      x: x + (Math.random() * 40 - 20),\n      y: y - 20,\n      text: isCritical ? `⚡-${damage} 치명타!` : `💥-${damage} HP`,\n      color: isCritical ? '#facc15' : '#ef4444',\n      fontSize: isCritical ? 34 : 26,\n      alpha: 1,\n      vy: -2.2,\n      scale: 1.4\n    });\n  }\n\n  triggerScreenShake(intensity = 10) {\n    const container = document.getElementById('game-arena') || document.body;\n    container.classList.remove('screen-shake', 'screen-shake-intense');\n    void container.offsetWidth; // trigger reflow\n    container.classList.add(intensity > 10 ? 'screen-shake-intense' : 'screen-shake');\n    setTimeout(() => {\n      container.classList.remove('screen-shake', 'screen-shake-intense');\n    }, 450);\n  }\n\n  loop() {\n    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n    const now = performance.now();\n\n    // 1. Update & Draw Projectiles\n    for (let i = this.projectiles.length - 1; i >= 0; i--) {\n      const p = this.projectiles[i];\n      const progress = Math.min(1, (now - p.startTime) / p.duration);\n\n      // Parabolic Arc calculation\n      const curX = p.startX + (p.targetX - p.startX) * progress;\n      const linearY = p.startY + (p.targetY - p.startY) * progress;\n      const arcY = -4 * p.heightArc * progress * (1 - progress);\n      const curY = linearY + arcY;\n\n      // Draw Water Balloon\n      this.ctx.save();\n      this.ctx.translate(curX, curY);\n\n      // Slight rotation & liquid squish effect\n      const squish = 1 + Math.sin(progress * Math.PI * 4) * 0.18;\n      this.ctx.scale(squish, 2 - squish);\n\n      // Water Balloon Body\n      const grad = this.ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);\n      grad.addColorStop(0, '#ffffff');\n      grad.addColorStop(0.3, p.color);\n      grad.addColorStop(1, '#0284c7');\n\n      this.ctx.beginPath();\n      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);\n      this.ctx.fillStyle = grad;\n      this.ctx.shadowColor = p.color;\n      this.ctx.shadowBlur = p.isCritical ? 18 : 10;\n      this.ctx.fill();\n\n      // Balloon tie knot\n      this.ctx.beginPath();\n      this.ctx.ellipse(progress < 0.5 ? -15 : 15, 2, 4, 6, 0, 0, Math.PI * 2);\n      this.ctx.fillStyle = '#0369a1';\n      this.ctx.fill();\n\n      this.ctx.restore();\n\n      // Water droplet trail\n      if (Math.random() > 0.2) {\n        this.particles.push({\n          x: curX,\n          y: curY,\n          vx: (Math.random() - 0.5) * 2,\n          vy: Math.random() * 2,\n          size: Math.random() * 4 + 2,\n          color: '#7dd3fc',\n          alpha: 0.8,\n          decay: 0.05,\n          gravity: 0.1\n        });\n      }\n\n      if (progress >= 1) {\n        // Hit!\n        this.createSplash(p.targetX, p.targetY, p.isCritical, p.damage);\n        if (p.onHitCallback) p.onHitCallback();\n        this.projectiles.splice(i, 1);\n      }\n    }\n\n    // 2. Shockwaves\n    for (let i = this.shockwaves.length - 1; i >= 0; i--) {\n      const sw = this.shockwaves[i];\n      sw.radius += (sw.maxRadius - sw.radius) * 0.18;\n      sw.opacity -= 0.035;\n\n      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius - 2) {\n        this.shockwaves.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.beginPath();\n      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);\n      this.ctx.strokeStyle = `${sw.color}${sw.opacity})`;\n      this.ctx.lineWidth = 5 * sw.opacity;\n      this.ctx.stroke();\n      this.ctx.restore();\n    }\n\n    // 3. Water Particles\n    for (let i = this.particles.length - 1; i >= 0; i--) {\n      const pt = this.particles[i];\n      pt.x += pt.vx;\n      pt.y += pt.vy;\n      pt.vy += pt.gravity;\n      pt.alpha -= pt.decay;\n\n      if (pt.alpha <= 0) {\n        this.particles.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = pt.alpha;\n      this.ctx.fillStyle = pt.color;\n      this.ctx.beginPath();\n      this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);\n      this.ctx.fill();\n      this.ctx.restore();\n    }\n\n    // 4. Floating Damage Text\n    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {\n      const ft = this.floatingTexts[i];\n      ft.y += ft.vy;\n      ft.alpha -= 0.02;\n      ft.scale = Math.max(1, ft.scale - 0.03);\n\n      if (ft.alpha <= 0) {\n        this.floatingTexts.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = ft.alpha;\n      this.ctx.font = `900 ${ft.fontSize * ft.scale}px 'Jua', 'Pretendard', sans-serif`;\n      this.ctx.textAlign = 'center';\n\n      // Outline\n      this.ctx.lineWidth = 5;\n      this.ctx.strokeStyle = '#000000';\n      this.ctx.strokeText(ft.text, ft.x, ft.y);\n\n      // Fill\n      this.ctx.fillStyle = ft.color;\n      this.ctx.fillText(ft.text, ft.x, ft.y);\n      this.ctx.restore();\n    }\n\n    requestAnimationFrame(() => this.loop());\n  }\n}\n\nwindow.BattleFX = BattleFX;\n" },
  '/js/app.js': { type: 'application/javascript; charset=utf-8', content: "// -------------------------------------------------------------\n// Season 2 Storage Keys & Tier Definition\n// -------------------------------------------------------------\nconst STORAGE_KEYS = {\n  USER: 'waterpang_s2_user',\n  LEADERBOARD: 'waterpang_s2_leaderboard',\n  LEGACY_USER: 'waterpang_user',\n  LEGACY_LEADERBOARD: 'waterpang_leaderboard',\n  HALL_OF_FAME: 'waterpang_s1_hall_of_fame',\n  WRONG_NOTES_PREFIX: 'waterpang_wrongnotes_'\n};\n\nfunction getTierInfo(rp) {\n  if (rp >= 1400) {\n    return { name: '맞춤법 제왕', rank: 'MASTER', badge: '👑', color: '#8b5cf6', min: 1400, max: 2000 };\n  } else if (rp >= 900) {\n    return { name: '번개 물대포', rank: 'DIAMOND', badge: '⚡', color: '#06b6d4', min: 900, max: 1399 };\n  } else if (rp >= 500) {\n    return { name: '파도 전사', rank: 'GOLD', badge: '🌊', color: '#eab308', min: 500, max: 899 };\n  } else if (rp >= 200) {\n    return { name: '꼬마 물풍선', rank: 'SILVER', badge: '🎈', color: '#3b82f6', min: 200, max: 499 };\n  } else {\n    return { name: '물방울', rank: 'BRONZE', badge: '💧', color: '#10b981', min: 0, max: 199 };\n  }\n}\n\nasync function refreshLeaderboardCache() {\n  try {\n    const res = await fetch('/api/leaderboard');\n    if (res.ok) {\n      const data = await res.json();\n      if (data.ok && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {\n        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));\n      }\n    }\n  } catch (e) {}\n}\n\n// Main Game Application Logic\n\nlet currentUser = null;\nlet currentRoomId = null;\nlet eventSource = null;\nlet battleFX = null;\nlet roundTimerInterval = null;\nlet roundTimeRemaining = 10;\nlet hasAnsweredCurrentRound = false;\n\n// DOM Elements\nconst views = {\n  auth: document.getElementById('view-auth'),\n  lobby: document.getElementById('view-lobby'),\n  matchmaking: document.getElementById('view-matchmaking'),\n  battle: document.getElementById('view-battle'),\n  matchOver: document.getElementById('view-match-over')\n};\n\nfunction showView(name) {\n  Object.values(views).forEach(v => v.classList.remove('active'));\n  if (views[name]) {\n    views[name].classList.add('active');\n  }\n  if (name === 'battle' && battleFX) {\n    setTimeout(() => battleFX.resize(), 100);\n  }\n}\n\nfunction showToast(msg) {\n  const toast = document.getElementById('toast-notification');\n  toast.innerText = msg;\n  toast.classList.add('show');\n  setTimeout(() => toast.classList.remove('show'), 2600);\n}\n\n// Prohibited word dictionary (Profanity, slurs, family insults, political/bypass terms)\n// Prohibited word dictionary (Profanity, slurs, disability insults, family insults, hate speech)\nconst PROHIBITED_KEYWORDS = [\n  // 1. Explicit disability insults & slurs (User requested: 다운증후군)\n  '다운증후군', '다운증',\n  '장애인', '장애련', '장애새끼', '장애자', '지체장애', '뇌병변',\n  '저능아', '저능', '정박아', '정박', '자폐아', '자폐증', '백치',\n  '정신병자', '정신병', '조현병', '싸이코', '사이코', '정신병원',\n  '애자',\n\n  // 2. Family insults / Pedrip (User requested: 엄마, 아빠 etc.)\n  '엄마', '아빠', '느금', '느금마', '느검마', '느개비', '니애미', '니애비',\n  '애미', '애비', '어미', '아비', '모친', '부친', '패드립',\n  '엠창', '앰창', '엄창', '니엄마', '니아빠',\n\n  // 3. Profanity / Slurs / Bullying\n  'ㅄ', 'ㅂㅅ', '병신', '븅신', '등신', '호구', '찐따', '찌질이', '왕따',\n  '시발', '씨발', 'ㅅㅂ', 'ㅆㅂ', '시바', '씨바', '시팔', '씨팔', '씹', '썅',\n  '개새', '새끼', 'ㅅㄲ', '개년', '개놈', '미친놈', '미친년',\n  '좆', '존나', '졸라', 'ㅈㄴ', '지랄', 'ㅈㄹ',\n  '미친', 'ㅁㅊ', '꺼져', '닥쳐',\n\n  // 4. Sexual / Vulgar & Evasion variants\n  '보지', '자지', '섹스', '쎅스', '자위', '딸딸이', '성관계', '콘돔', '성기', '음경', '사정', '유두', '젖꼭지', '야동', '포르노', '강간', '성폭행',\n  '보즐지', '보줄지', '보즑지', '보즐', '보줄', '보쥐', '보찌', '보쮜', '보징',\n  '자즐지', '자줄지', '자즑지', '자즐', '자줄', '자쥐', '자찌', '자쮜', '자징',\n\n  // 5. Violence / Self-harm\n  '자살', '뒈져', '죽어라', '죽어', '살인', '칼빵',\n\n  // 6. Hate speech, discrimination & meme troll terms\n  '무현', '노무현', '운지', '바이든', '김정은', '윤두창', '문재앙', '찢재명',\n  '일베', '메갈', '워마드', '한남', '한녀', '틀딱', '맘충', '급식충', '틀니',\n  '짱깨', '쪽발이', '조센징', '흑형',\n\n  // 7. Foreign insults\n  'ㅗ', 'fuck', 'shit', 'bitch', '법규', '창녀', '걸레'\n];\n\nconst TEACHER_ACCOUNT = {\n  id: '01fdd103-ef91-43d5-b0d5-8f1867d98c3e',\n  nickname: '하하하하하쌤'\n};\n\nfunction isProhibitedNickname(nickname, userId = null) {\n  if (!nickname || typeof nickname !== 'string') return { prohibited: false };\n  const clean = nickname.replace(/[\\s_.,~!@#$%^&*()=+/\\\\|?:;'\"<>-]/g, '').toLowerCase();\n\n  // Teacher account exemption: Only the authentic teacher account is allowed\n  if (userId && userId === TEACHER_ACCOUNT.id && nickname.trim() === TEACHER_ACCOUNT.nickname) {\n    return { prohibited: false };\n  }\n\n  // Teacher / Admin impersonation check (Blocks all unauthorized teacher/admin accounts)\n  if (clean.includes('하하하하하쌤') || /하하하+쌤/.test(clean) || /하하하+선생(?:님)?(?:$|[0-9_])/.test(clean) || /\\[?(?:gm|관리자|운영자)\\]?/i.test(nickname)) {\n    return { prohibited: true, matched: '선생님/관리자 사칭 방지' };\n  }\n\n  for (const word of PROHIBITED_KEYWORDS) {\n    if (clean.includes(word.toLowerCase()) || nickname.toLowerCase().includes(word.toLowerCase())) {\n      return { prohibited: true, matched: word };\n    }\n  }\n\n  // Evasion regexes (insertion of chars/spaces)\n  if (/보[줄즐즑즞즤]지/.test(clean) || /자[줄즐즑즞즤]지/.test(clean)) {\n    return { prohibited: true, matched: '비속어 우회 표현' };\n  }\n  if (/보[\\s\\d_]+[지쥐찌쮜]/.test(nickname) || /자[\\s\\d_]+[지쥐찌쮜]/.test(nickname)) {\n    return { prohibited: true, matched: '비속어 우회 표현' };\n  }\n  if (/무[\\s\\d_]*현/.test(nickname)) {\n    return { prohibited: true, matched: '부적절한 표현 (무현)' };\n  }\n  if (/바[\\s\\d_]*이[\\s\\d_]*든/.test(nickname)) {\n    return { prohibited: true, matched: '부적절한 표현 (바이든)' };\n  }\n  if (/다[\\s\\d_]*운[\\s\\d_]*증/.test(nickname)) {\n    return { prohibited: true, matched: '장애 비하 표현 (다운증후군)' };\n  }\n  if (/장[\\s\\d_]*애/.test(nickname)) {\n    return { prohibited: true, matched: '장애 비하 표현' };\n  }\n\n  return { prohibited: false };\n}\n\n// -------------------------------------------------------------\n// Initialization & Auth\n// -------------------------------------------------------------\ndocument.addEventListener('DOMContentLoaded', () => {\n  battleFX = new BattleFX('battle-fx-canvas');\n\n  // Check Season 2 saved session or migrate seamlessly from Season 1\n  let saved = localStorage.getItem(STORAGE_KEYS.USER);\n  if (!saved) {\n    const legacySaved = localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n    if (legacySaved) {\n      try {\n        const legacyParsed = JSON.parse(legacySaved);\n        if (legacyParsed && legacyParsed.nickname) {\n          console.log('[Season 2] Migrating account to Season 2:', legacyParsed.nickname);\n          const s2User = {\n            id: legacyParsed.id || ('user_' + Math.random().toString(36).substring(2, 9)),\n            nickname: legacyParsed.nickname,\n            password: legacyParsed.password || 'saved_user',\n            rp: 100,\n            wins: 0,\n            losses: 0,\n            draws: 0,\n            season: 2,\n            season1_rp: legacyParsed.rp || 100,\n            avatar: legacyParsed.avatar || '👦',\n            tier: getTierInfo(100)\n          };\n          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(s2User));\n          saved = JSON.stringify(s2User);\n        }\n      } catch (e) {\n        console.warn('Legacy migration error:', e);\n      }\n    }\n  }\n\n  if (saved) {\n    try {\n      const parsed = JSON.parse(saved);\n      if (parsed && parsed.nickname) {\n        if (isProhibitedNickname(parsed.nickname, parsed.id).prohibited) {\n          localStorage.removeItem(STORAGE_KEYS.USER);\n          alert('❌ 부적절한 닉네임으로 인해 계정 이용이 제한되었습니다.\\n새로운 바른 닉네임으로 계정을 만들어주세요!');\n          showView('auth');\n          refreshLeaderboardCache();\n          setupEventListeners();\n          return;\n        }\n        currentUser = parsed;\n        updateUserData(parsed);\n        showView('lobby');\n        initSSE(parsed.id);\n        // Proactively restore and sync account + leaderboard with server, then fetch verified profile\n        syncUserWithServer(parsed).then(() => {\n          fetchProfile(parsed.id);\n        });\n        refreshLeaderboardCache();\n      }\n    } catch (e) {\n      console.warn('Session parse warning:', e);\n    }\n  } else {\n    refreshLeaderboardCache();\n  }\n\n  setupEventListeners();\n});\n\nfunction setupEventListeners() {\n  // Sound toggle\n  const btnSound = document.getElementById('btn-sound-toggle');\n  btnSound.addEventListener('click', () => {\n    const on = window.soundFX.toggle();\n    btnSound.innerText = on ? '🔊' : '🔇';\n    showToast(on ? '소리가 켜졌습니다.' : '소리가 꺼졌습니다.');\n  });\n\n  // Logout\n  document.getElementById('btn-logout').addEventListener('click', () => {\n    if (confirm('로그아웃 하시겠습니까?')) {\n      logout();\n    }\n  });\n\n  // Auth Form & Tabs\n  let authMode = 'login'; // 'login' or 'register'\n  const tabLogin = document.getElementById('tab-login');\n  const tabRegister = document.getElementById('tab-register');\n  const btnSubmitAuth = document.getElementById('btn-submit-auth');\n  const btnForgot = document.getElementById('btn-forgot-pw');\n\n  tabLogin.addEventListener('click', () => {\n    authMode = 'login';\n    tabLogin.classList.add('active');\n    tabRegister.classList.remove('active');\n    btnSubmitAuth.innerText = '로그인하기';\n    if (btnForgot) btnForgot.style.display = 'block';\n  });\n\n  tabRegister.addEventListener('click', () => {\n    authMode = 'register';\n    tabRegister.classList.add('active');\n    tabLogin.classList.remove('active');\n    btnSubmitAuth.innerText = '새 계정 생성하기';\n    if (btnForgot) btnForgot.style.display = 'none';\n  });\n\n  if (btnForgot) {\n    btnForgot.addEventListener('click', () => {\n      alert('💡 [비밀번호 안내]\\n\\n1. 서버 재시작으로 복원된 계정은 간편 비밀번호로 \"saved_user\"를 입력하시면 바로 접속됩니다!\\n2. 혹시 이미 다른 친구가 사용 중인 닉네임인지 확인해보세요.\\n3. 비밀번호를 완전히 잊으신 경우 선생님께 요청하시면 비밀번호를 초기화해주실 수 있습니다.');\n    });\n  }\n\n  document.getElementById('form-auth').addEventListener('submit', async (e) => {\n    e.preventDefault();\n    const nickname = document.getElementById('auth-nickname').value.trim();\n    const password = document.getElementById('auth-password').value;\n\n    if (!nickname || !password) return;\n\n    if (authMode === 'register' && isProhibitedNickname(nickname).prohibited) {\n      alert('❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 사용할 수 없습니다.\\n바르고 고운 닉네임을 사용해주세요!');\n      return;\n    }\n\n    try {\n      if (authMode === 'register') {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch('/api/register', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok && data.user) {\n          showToast(`'${data.user.nickname}' 계정이 생성되었습니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || '계정 생성에 실패했습니다.');\n        }\n      } else {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch('/api/login', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok && data.user) {\n          showToast(`'${data.user.nickname}' 님 환영합니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || '로그인에 실패했습니다.');\n        }\n      }\n    } catch (err) {\n      alert('서버 연결 오류가 발생했습니다.');\n    }\n  });\n\n  // Lobby actions\n  document.getElementById('btn-start-matching').addEventListener('click', startMatching);\n  document.getElementById('btn-cancel-matching').addEventListener('click', cancelMatching);\n  document.getElementById('btn-return-lobby').addEventListener('click', () => {\n    if (currentUser) fetchProfile(currentUser.id);\n    showView('lobby');\n  });\n  document.getElementById('btn-rematch').addEventListener('click', () => {\n    startMatching();\n  });\n\n  // Modals\n  document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);\n  document.getElementById('btn-close-leaderboard').addEventListener('click', () => {\n    document.getElementById('modal-leaderboard').classList.remove('active');\n  });\n\n  document.getElementById('btn-open-wrongnotes').addEventListener('click', openWrongNotes);\n  document.getElementById('btn-close-wrongnotes').addEventListener('click', () => {\n    document.getElementById('modal-wrongnotes').classList.remove('active');\n  });\n}\n\nfunction updateUserData(user) {\n  currentUser = user;\n  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));\n\n  // Update Header\n  document.getElementById('header-user-bar').style.display = 'flex';\n  document.getElementById('header-nickname').innerText = user.nickname;\n  updateTierBadge('header-tier-badge', user.tier, user.rp);\n\n  // Update Lobby\n  updateLobbyUI(user);\n}\n\nfunction loginSuccess(user) {\n  updateUserData(user);\n  showView('lobby');\n\n  // Connect SSE\n  initSSE(user.id);\n\n  // Auto-sync and cache leaderboard in background\n  syncUserWithServer(user);\n  refreshLeaderboardCache();\n}\n\nfunction logout() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  if (eventSource) {\n    eventSource.close();\n    eventSource = null;\n  }\n  currentUser = null;\n  localStorage.removeItem(STORAGE_KEYS.USER);\n  document.getElementById('header-user-bar').style.display = 'none';\n  showView('auth');\n}\n\nasync function syncUserWithServer(userToSync) {\n  if (!userToSync || !userToSync.nickname) return;\n  try {\n    let leaderboardSnapshot = [];\n    try {\n      const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n      if (cached) leaderboardSnapshot = JSON.parse(cached);\n    } catch (e) {}\n\n    const res = await fetch('/api/user/sync', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        user: userToSync,\n        leaderboardSnapshot\n      })\n    });\n    const data = await res.json();\n    if (data.ok && data.user) {\n      console.log('[Sync] Account successfully preserved & restored with server:', data.user.nickname);\n      updateUserData(data.user);\n      return data.user;\n    }\n  } catch (err) {\n    console.warn('[Sync] Server sync failed (offline or container starting):', err);\n  }\n}\n\nasync function fetchProfile(userId) {\n  try {\n    const res = await fetch(`/api/profile?userId=${userId}&_t=${Date.now()}`);\n    const data = await res.json();\n    if (data.ok && data.user) {\n      // Anti-downgrade shield: Protect local verified RP from lower server value\n      if (currentUser && typeof currentUser.rp === 'number') {\n        if (data.user.rp < currentUser.rp) {\n          console.warn(`[Profile] Anti-downgrade shield: Server RP (${data.user.rp}) is lower than local verified RP (${currentUser.rp}). Syncing higher RP to server.`);\n          await syncUserWithServer(currentUser);\n          return;\n        }\n      }\n      updateUserData(data.user);\n    } else if (currentUser) {\n      // Container restarted on Render! Automatically sync and resurrect account\n      await syncUserWithServer(currentUser);\n    }\n  } catch (err) {\n    console.warn('[Profile] fetch error, syncing with server:', err);\n    if (currentUser) {\n      await syncUserWithServer(currentUser);\n    }\n  }\n}\n\nfunction updateTierBadge(elementId, tier, rp) {\n  const el = document.getElementById(elementId);\n  if (!el || !tier) return;\n  el.innerText = `${tier.badge} ${tier.name} (${rp} RP)`;\n  el.style.borderColor = tier.color;\n}\n\nfunction updateLobbyUI(user) {\n  document.getElementById('lobby-nickname').innerText = user.nickname;\n  updateTierBadge('lobby-tier-badge', user.tier, user.rp);\n  document.getElementById('stat-wins').innerText = user.wins;\n  document.getElementById('stat-losses').innerText = user.losses;\n\n  const total = user.wins + user.losses;\n  const rate = total > 0 ? Math.round((user.wins / total) * 100) : 0;\n  document.getElementById('stat-winrate').innerText = `${rate}%`;\n\n  const nextThreshold = user.tier ? user.tier.max + 1 : 200;\n  const needed = Math.max(0, nextThreshold - user.rp);\n  document.getElementById('tier-next-rp').innerText = `${needed} RP`;\n}\n\n// -------------------------------------------------------------\n// SSE Real-Time Communication\n// -------------------------------------------------------------\nfunction initSSE(userId) {\n  if (eventSource) {\n    if (eventSource.readyState !== EventSource.CLOSED && eventSource.url.includes(`userId=${userId}`)) {\n      return; // Already actively connected\n    }\n    eventSource.close();\n  }\n\n  eventSource = new EventSource(`/api/events?userId=${userId}`);\n\n  eventSource.onopen = () => {\n    console.log('[SSE] Stream connected successfully');\n  };\n\n  eventSource.onmessage = (event) => {\n    try {\n      const msg = JSON.parse(event.data);\n      handleServerEvent(msg.type, msg.payload);\n    } catch (e) {\n      console.error('[SSE] Parse error:', e);\n    }\n  };\n\n  eventSource.onerror = () => {\n    console.warn('[SSE] Connection lost, browser will auto-retry...');\n  };\n}\n\nfunction handleServerEvent(type, payload) {\n  console.log('[Game Event]', type, payload);\n\n  switch (type) {\n    case 'MATCH_FOUND':\n      onMatchFound(payload);\n      break;\n    case 'ROUND_START':\n      onRoundStart(payload);\n      break;\n    case 'ATTACK':\n    case 'ROUND_RESULT':\n      onRoundResult(payload);\n      break;\n    case 'WRONG_ANSWER':\n      onWrongAnswer(payload);\n      break;\n    case 'MATCH_OVER':\n      onMatchOver(payload);\n      break;\n  }\n}\n\n// -------------------------------------------------------------\n// -------------------------------------------------------------\n// Matchmaking Flow (Dual-Channel: SSE + Guaranteed Polling Fallback)\n// -------------------------------------------------------------\nlet matchPollingInterval = null;\nlet isMatchingInProgress = false;\n\nasync function startMatching() {\n  if (!currentUser || isMatchingInProgress) return;\n  isMatchingInProgress = true;\n\n  const btnStart = document.getElementById('btn-start-matching');\n  if (btnStart) btnStart.disabled = true;\n\n  initSSE(currentUser.id);\n\n  currentRoomId = null;\n  battleData = null;\n  showView('matchmaking');\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  try {\n    const res = await fetch('/api/match/join', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n    const data = await res.json();\n    if (!data.ok) {\n      isMatchingInProgress = false;\n      if (btnStart) btnStart.disabled = false;\n      alert(data.error || '매칭 시작 실패');\n      showView('lobby');\n      return;\n    }\n\n    // 1. Instant match returned directly in join response\n    if (data.result && data.result.status === 'MATCHED' && data.result.roomData) {\n      console.log('[Match] Instant match via join response:', data.result.roomData);\n      onMatchFound(data.result.roomData);\n      return;\n    }\n\n    // 2. Dual-channel polling check (every 1000ms) to ensure neither player ever gets stuck\n    matchPollingInterval = setInterval(async () => {\n      const viewEl = document.getElementById('view-matchmaking');\n      if (!viewEl || !viewEl.classList.contains('active')) {\n        clearInterval(matchPollingInterval);\n        matchPollingInterval = null;\n        isMatchingInProgress = false;\n        if (btnStart) btnStart.disabled = false;\n        return;\n      }\n\n      try {\n        const pollRes = await fetch(`/api/match/status?userId=${currentUser.id}&_t=${Date.now()}`);\n        const pollData = await pollRes.json();\n        if (pollData.ok && pollData.status === 'MATCHED' && pollData.roomData) {\n          console.log('[Match] Polling detected match:', pollData.roomData);\n          clearInterval(matchPollingInterval);\n          matchPollingInterval = null;\n          onMatchFound(pollData.roomData);\n        }\n      } catch (e) {\n        // network polling error ignored\n      }\n    }, 1000);\n\n  } catch (e) {\n    isMatchingInProgress = false;\n    if (btnStart) btnStart.disabled = false;\n    alert('서버 연결 실패');\n    showView('lobby');\n  }\n}\n\nasync function cancelMatching() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  isMatchingInProgress = false;\n  const btnStart = document.getElementById('btn-start-matching');\n  if (btnStart) btnStart.disabled = false;\n\n  if (!currentUser) return;\n  try {\n    await fetch('/api/match/cancel', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n  } catch (e) {}\n  showView('lobby');\n}\n\n// -------------------------------------------------------------\n// Battle Scene\n// -------------------------------------------------------------\nlet battleData = null;\nlet battleSyncInterval = null;\nlet currentClientRound = 0;\n\nfunction onMatchFound(data) {\n  isMatchingInProgress = false;\n  const btnStart = document.getElementById('btn-start-matching');\n  if (btnStart) btnStart.disabled = false;\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  // Prevent duplicate execution if both SSE and polling trigger simultaneously\n  if (battleData && currentRoomId === data.roomId && views.battle.classList.contains('active')) {\n    return;\n  }\n\n  battleData = data;\n  currentRoomId = data.roomId;\n\n  // Setup Fighters\n  const isMeP1 = (data.p1.id === currentUser.id);\n  const myData = isMeP1 ? data.p1 : data.p2;\n  const oppData = isMeP1 ? data.p2 : data.p1;\n\n  document.getElementById('name-p1').innerText = `${myData.nickname} (나)`;\n  const av1 = document.getElementById('avatar-p1');\n  if (av1 && av1.childNodes[0]) av1.childNodes[0].nodeValue = myData.avatar || '👦';\n\n  document.getElementById('name-p2').innerText = oppData.nickname + (oppData.isBot ? ' 🤖' : '');\n  const av2 = document.getElementById('avatar-p2');\n  if (av2 && av2.childNodes[0]) av2.childNodes[0].nodeValue = oppData.avatar || (oppData.isBot ? '🤖' : '👧');\n\n  updateHpUI('p1', 100, 100);\n  updateHpUI('p2', 100, 100);\n\n  document.getElementById('quiz-question-text').innerText = '상대와 연결되었습니다! 곧 1라운드가 시작됩니다!';\n  document.getElementById('quiz-options-container').innerHTML = '';\n  document.getElementById('battle-live-banner').innerText = '💦 먼저 정답을 맞혀 물풍선을 던지세요!';\n  document.getElementById('round-explanation-box').style.display = 'none';\n  currentClientRound = 0;\n\n  // Dual-channel battle state backup polling: ensures round ALWAYS starts even if SSE lags or drops\n  if (battleSyncInterval) clearInterval(battleSyncInterval);\n  battleSyncInterval = setInterval(async () => {\n    if (!currentRoomId || !currentUser || !views.battle.classList.contains('active')) return;\n    try {\n      const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}&_t=${Date.now()}`);\n      if (res.ok) {\n        const state = await res.json();\n        if (state.ok) {\n          if (state.isEnded) {\n            clearInterval(battleSyncInterval);\n            battleSyncInterval = null;\n            return;\n          }\n          if (state.round > currentClientRound && state.quiz) {\n            console.log('[BattleSync] Syncing round state via polling:', state.round);\n            onRoundStart({\n              round: state.round,\n              totalRounds: state.totalRounds,\n              quiz: state.quiz,\n              timeLimit: 10,\n              p1: state.p1,\n              p2: state.p2\n            });\n          }\n        }\n      }\n    } catch (e) {\n      console.warn('[BattleSync] Polling error:', e.message);\n    }\n  }, 1000);\n\n  showView('battle');\n}\n\nfunction updateHpUI(target, curHp, maxHp) {\n  const percent = Math.max(0, Math.min(100, (curHp / maxHp) * 100));\n  const bar = document.getElementById(`hp-bar-${target}`);\n  const text = document.getElementById(`hp-num-${target}`);\n\n  if (bar) {\n    bar.style.width = `${percent}%`;\n    bar.className = 'hp-bar-fill';\n    if (percent < 30) bar.classList.add('danger');\n    else if (percent < 60) bar.classList.add('warning');\n  }\n  if (text) {\n    text.innerText = `${curHp} / ${maxHp}`;\n  }\n}\n\nfunction onRoundStart(data) {\n  try {\n    if (!data || !data.quiz) return;\n    currentClientRound = data.round;\n    hasAnsweredCurrentRound = false;\n\n    // Sync HP bars with server state\n    if (data.p1 && data.p2 && currentUser) {\n      const isMeP1 = (battleData && battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1.id === currentUser.id);\n      const myHp = isMeP1 ? data.p1.hp : data.p2.hp;\n      const oppHp = isMeP1 ? data.p2.hp : data.p1.hp;\n      updateHpUI('p1', typeof myHp === 'number' ? myHp : 100, 100);\n      updateHpUI('p2', typeof oppHp === 'number' ? oppHp : 100, 100);\n    }\n    const expBox = document.getElementById('round-explanation-box');\n    if (expBox) expBox.style.display = 'none';\n\n    // Round indicator\n    const roundInd = document.getElementById('battle-round-indicator');\n    if (roundInd) roundInd.innerText = `라운드 ${data.round} / ${data.totalRounds || 10}`;\n    const liveBanner = document.getElementById('battle-live-banner');\n    if (liveBanner) liveBanner.innerText = '문제를 읽고 빠르게 정답을 누르세요!';\n\n    // Reset drenched cards\n    const cardP1 = document.getElementById('fighter-p1');\n    const cardP2 = document.getElementById('fighter-p2');\n    if (cardP1) cardP1.classList.remove('drenched');\n    if (cardP2) cardP2.classList.remove('drenched');\n\n    // Render question\n    const qText = document.getElementById('quiz-question-text');\n    if (qText) qText.innerText = data.quiz.question;\n\n    // Render Options\n    const container = document.getElementById('quiz-options-container');\n    if (container) {\n      container.innerHTML = '';\n      (data.quiz.options || []).forEach(opt => {\n        const btn = document.createElement('button');\n        btn.className = 'btn-option';\n        btn.innerText = opt;\n        btn.addEventListener('click', () => submitAnswer(opt, btn));\n        container.appendChild(btn);\n      });\n    }\n\n    // Start 10s Timer\n    startRoundTimer(data.timeLimit || 10);\n  } catch (err) {\n    console.error('[RoundStart] Error in onRoundStart:', err);\n  }\n}\n\nfunction startRoundTimer(seconds) {\n  clearInterval(roundTimerInterval);\n  roundTimeRemaining = seconds;\n\n  const timerNum = document.getElementById('battle-timer-num');\n  const timerFill = document.getElementById('battle-timer-fill');\n\n  if (timerNum) timerNum.innerText = roundTimeRemaining;\n  if (timerFill) timerFill.style.width = '100%';\n\n  const totalMs = seconds * 1000;\n  const startAt = Date.now();\n\n  roundTimerInterval = setInterval(() => {\n    const elapsed = Date.now() - startAt;\n    const remaining = Math.max(0, totalMs - elapsed);\n    const sec = Math.ceil(remaining / 1000);\n\n    if (timerNum) timerNum.innerText = sec;\n    if (timerFill) timerFill.style.width = `${(remaining / totalMs) * 100}%`;\n\n    if (sec <= 3 && sec > 0 && remaining % 1000 < 100) {\n      try { window.soundFX?.playTick(); } catch (e) {}\n    }\n\n    if (remaining <= 0) {\n      clearInterval(roundTimerInterval);\n      // Disable buttons immediately on round timeout to prevent late click contamination\n      const buttons = document.querySelectorAll('.btn-option');\n      buttons.forEach(b => b.disabled = true);\n    }\n  }, 100);\n}\n\nasync function submitAnswer(answer, clickedBtn) {\n  if (hasAnsweredCurrentRound || !currentRoomId) return;\n  hasAnsweredCurrentRound = true;\n\n  // Disable all options\n  const buttons = document.querySelectorAll('.btn-option');\n  buttons.forEach(b => b.disabled = true);\n\n  try {\n    await fetch('/api/game/answer', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        roomId: currentRoomId,\n        userId: currentUser.id,\n        answer\n      })\n    });\n  } catch (e) {\n    console.error('Answer send error:', e);\n  }\n}\n\nfunction onWrongAnswer(data) {\n  try {\n    const isMe = (data.userId === currentUser.id);\n\n    if (isMe) {\n      try { window.soundFX?.playWrong(); } catch (e) {}\n      showToast('❌ 아쉽게도 오답입니다! 이번 라운드는 기회가 끝났습니다.');\n\n      // Mark clicked button red\n      const buttons = document.querySelectorAll('.btn-option');\n      buttons.forEach(b => {\n        if (b.innerText === data.userAnswer) {\n          b.classList.add('wrong-pick');\n        }\n        b.disabled = true;\n      });\n\n      const banner = document.getElementById('battle-live-banner');\n      if (banner) banner.innerText = '❌ 아쉽게도 오답입니다! 상대방에게 기회가 넘어갔습니다.';\n    } else {\n      const banner = document.getElementById('battle-live-banner');\n      if (banner) banner.innerText = `💦 상대방(${data.nickname || '상대'})이 오답을 선택했습니다! 서둘러 맞히세요!`;\n    }\n  } catch (e) {\n    console.error('[WrongAnswer] UI error:', e);\n  }\n}\n\nfunction onRoundResult(data) {\n  try {\n    clearInterval(roundTimerInterval);\n\n    // Show explanation box\n    const explBox = document.getElementById('round-explanation-box');\n    if (explBox && data.correctAnswer) {\n      explBox.style.display = 'block';\n      explBox.innerHTML = `<strong>💡 정답: ${data.correctAnswer}</strong><br>${data.explanation || ''}`;\n    }\n\n    // Highlight correct option button green\n    const buttons = document.querySelectorAll('.btn-option');\n    buttons.forEach(b => {\n      b.disabled = true;\n      if (b.innerText === data.correctAnswer) {\n        b.classList.add('correct-pick');\n      }\n    });\n\n    const hasWinner = (data.type === 'ATTACK' || !!data.winnerId);\n\n    if (hasWinner) {\n      const isMeWinner = (data.winnerId === currentUser.id);\n\n      // Resize FX canvas\n      if (battleFX) {\n        try { battleFX.resize(); } catch (e) {}\n      }\n\n      // In DOM, avatar-p1 is ALWAYS ME (left), avatar-p2 is ALWAYS OPPONENT (right)\n      const elP1 = document.getElementById('avatar-p1');\n      const elP2 = document.getElementById('avatar-p2');\n      const canvas = document.getElementById('battle-fx-canvas');\n\n      let p1Pos = { x: 120, y: 140 };\n      let p2Pos = { x: 420, y: 140 };\n\n      if (elP1 && elP2 && canvas) {\n        const p1Rect = elP1.getBoundingClientRect();\n        const p2Rect = elP2.getBoundingClientRect();\n        const cRect = canvas.getBoundingClientRect();\n\n        if (cRect.width > 0 && cRect.height > 0) {\n          p1Pos = {\n            x: p1Rect.left + p1Rect.width / 2 - cRect.left,\n            y: p1Rect.top + p1Rect.height / 2 - cRect.top\n          };\n          p2Pos = {\n            x: p2Rect.left + p2Rect.width / 2 - cRect.left,\n            y: p2Rect.top + p2Rect.height / 2 - cRect.top\n          };\n        }\n      }\n\n      // Fix Bug 1: Winner ALWAYS throws AT the loser!\n      // p1Pos is ME, p2Pos is OPPONENT\n      const fromPos = isMeWinner ? p1Pos : p2Pos;\n      const toPos = isMeWinner ? p2Pos : p1Pos;\n      const victimCardId = isMeWinner ? 'fighter-p2' : 'fighter-p1';\n\n      if (isMeWinner) {\n        try { window.soundFX?.playCorrect(); } catch (e) {}\n        const banner = document.getElementById('battle-live-banner');\n        if (banner) banner.innerHTML = `🎉 <strong>정답!</strong> 시원하게 물풍선을 투척합니다! 💦`;\n      } else {\n        try { window.soundFX?.playWrong(); } catch (e) {}\n        const banner = document.getElementById('battle-live-banner');\n        if (banner) banner.innerHTML = `💦 상대방(${data.winnerName || '상대'})이 정답을 맞혀 물풍선을 던집니다!`;\n      }\n\n      // Safe extraction of HP\n      const isRoomP1Me = (battleData && battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1 && data.p1.id === currentUser.id);\n      const p1Hp = (data.p1 && typeof data.p1.hp === 'number') ? data.p1.hp : (typeof data.p1Hp === 'number' ? data.p1Hp : 100);\n      const p2Hp = (data.p2 && typeof data.p2.hp === 'number') ? data.p2.hp : (typeof data.p2Hp === 'number' ? data.p2Hp : 100);\n\n      const myHp = isRoomP1Me ? p1Hp : p2Hp;\n      const oppHp = isRoomP1Me ? p2Hp : p1Hp;\n\n      const applyDamage = () => {\n        const victimCard = document.getElementById(victimCardId);\n        if (victimCard) victimCard.classList.add('drenched');\n        updateHpUI('p1', myHp, 100);\n        updateHpUI('p2', oppHp, 100);\n      };\n\n      if (battleFX) {\n        try {\n          battleFX.throwBalloon(fromPos, toPos, false, data.damage || 20, applyDamage);\n        } catch (e) {\n          applyDamage();\n        }\n        setTimeout(applyDamage, 700);\n      } else {\n        applyDamage();\n      }\n\n    } else {\n      // Both wrong or timeout\n      try { window.soundFX?.playWrong(); } catch (e) {}\n      const banner = document.getElementById('battle-live-banner');\n      if (banner) {\n        if (data.allWrong) {\n          banner.innerText = '😅 양쪽 모두 오답입니다! 물풍선 없이 다음 라운드로 넘어갑니다.';\n        } else {\n          banner.innerText = data.timeout ? '⌛ 시간 초과! 아무도 맞히지 못했습니다.' : '😅 둘 다 오답으로 물풍선이 날아가지 않았습니다.';\n        }\n      }\n    }\n\n    // Client-side Round Transition Backup Timer:\n    // If next round (or match over) does not trigger within 3.2s, force sync state with server\n    const resolvedRound = data.round;\n    setTimeout(async () => {\n      if (currentClientRound === resolvedRound && currentRoomId && views.battle.classList.contains('active')) {\n        console.log('[TransitionSafety] Round', resolvedRound, 'transition did not arrive in 3.2s. Force-syncing state...');\n        try {\n          const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}&_t=${Date.now()}`);\n          if (res.ok) {\n            const state = await res.json();\n            if (state.ok) {\n              if (state.isEnded) {\n                return;\n              }\n              if (state.round > currentClientRound && state.quiz) {\n                console.log('[TransitionSafety] Advanced to round', state.round, 'via safety poll');\n                onRoundStart({\n                  round: state.round,\n                  totalRounds: state.totalRounds,\n                  quiz: state.quiz,\n                  timeLimit: 10,\n                  p1: state.p1,\n                  p2: state.p2\n                });\n              }\n            }\n          }\n        } catch (e) {\n          console.warn('[TransitionSafety] Sync failed:', e);\n        }\n      }\n    }, 3200);\n\n  } catch (err) {\n    console.error('[RoundResult] Error in onRoundResult:', err);\n  }\n}\n\nfunction onMatchOver(data) {\n  if (battleSyncInterval) {\n    clearInterval(battleSyncInterval);\n    battleSyncInterval = null;\n  }\n  clearInterval(roundTimerInterval);\n\n  setTimeout(() => {\n    showView('matchOver');\n\n    const isMeP1 = (data.p1.id === currentUser.id);\n    const myResult = isMeP1 ? data.p1 : data.p2;\n\n    const resultEmoji = document.getElementById('result-emoji');\n    const resultTitle = document.getElementById('result-title');\n    const rpBadge = document.getElementById('result-rp-badge');\n\n    // Extract clean numeric RP safely\n    let currentTotalRp = 100;\n    if (typeof myResult.newRp === 'number') {\n      currentTotalRp = myResult.newRp;\n    } else if (myResult.newRp && typeof myResult.newRp.rp === 'number') {\n      currentTotalRp = myResult.newRp.rp;\n    } else if (currentUser && typeof currentUser.rp === 'number') {\n      currentTotalRp = Math.max(0, currentUser.rp + (myResult.rpChange || 0));\n    }\n\n    // Keep currentUser in sync\n    if (currentUser) {\n      currentUser.rp = currentTotalRp;\n      try {\n        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));\n        updateUserData(currentUser);\n      } catch (e) {}\n    }\n\n    const changeVal = myResult.rpChange || 0;\n    const changeText = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;\n\n    isMatchingInProgress = false;\n    const btnStart = document.getElementById('btn-start-matching');\n    if (btnStart) btnStart.disabled = false;\n\n    if (myResult.result === 'WIN') {\n      try { window.soundFX?.playVictory(); } catch (e) {}\n      resultEmoji.innerText = '👑';\n      resultTitle.innerText = '짜릿한 승리!';\n      resultTitle.className = 'result-title win';\n      rpBadge.className = 'rp-badge-change plus';\n      rpBadge.innerText = `${changeText} RP 획득! (현재 ${currentTotalRp} RP)`;\n    } else if (myResult.result === 'LOSE') {\n      try { window.soundFX?.playDefeat(); } catch (e) {}\n      resultEmoji.innerText = '💧';\n      resultTitle.innerText = '아쉬운 패배!';\n      resultTitle.className = 'result-title lose';\n      rpBadge.className = 'rp-badge-change minus';\n      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;\n    } else {\n      resultEmoji.innerText = '🤝';\n      resultTitle.innerText = '무승부!';\n      resultTitle.className = 'result-title draw';\n      rpBadge.className = 'rp-badge-change plus';\n      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;\n    }\n\n    // Render Round Recap & Automatically save unsolved rounds to client wrong notes\n    const recapList = document.getElementById('match-recap-list');\n    recapList.innerHTML = '';\n\n    // Save unsolved/wrong rounds to student's local wrong notes immediately\n    try {\n      const myKey = 'waterpang_wrongnotes_' + currentUser.id;\n      let existingNotes = [];\n      const savedNotes = localStorage.getItem(myKey);\n      if (savedNotes) {\n        try { existingNotes = JSON.parse(savedNotes); } catch (e) {}\n      }\n      if (!Array.isArray(existingNotes)) existingNotes = [];\n\n      const newUnsolved = [];\n      const nowFormatted = new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });\n\n      (data.history || []).forEach(h => {\n        if (!h || !h.quiz) return;\n        const isMyWin = (h.winnerId === currentUser.id);\n\n        if (!isMyWin) {\n          const userAns = (h.userAnswers && h.userAnswers[currentUser.id]) || (h.allWrong ? '오답 선택' : (h.timeout ? '시간 초과' : '상대방 정답'));\n          const itemNote = {\n            id: Date.now() + Math.random(),\n            user_id: currentUser.id,\n            quiz_id: h.quiz.id,\n            question: h.quiz.question,\n            explanation: h.quiz.explanation,\n            user_answer: userAns,\n            correct_answer: h.quiz.answer,\n            created_at: nowFormatted\n          };\n          // Remove old duplicate for this quiz so latest is at top\n          const dupIdx = existingNotes.findIndex(n => n.quiz_id === h.quiz.id);\n          if (dupIdx !== -1) existingNotes.splice(dupIdx, 1);\n          newUnsolved.push(itemNote);\n        }\n\n        const div = document.createElement('div');\n        div.className = 'recap-item';\n        div.innerHTML = `\n          <div>\n            <strong>[R${h.round}] ${h.quiz.answer}</strong>: ${h.quiz.question.replace(/\\n/g, ' ')}\n            <div style=\"font-size: 12px; color: #0284c7; margin-top: 2px;\">💡 ${h.quiz.explanation}</div>\n          </div>\n          <span style=\"font-weight: bold; white-space: nowrap; color: ${isMyWin ? '#10b981' : '#64748b'};\">\n            ${isMyWin ? '내가 맞힘 🎯' : (h.winnerName ? `${h.winnerName} 정답` : '오답/시간초과')}\n          </span>\n        `;\n        recapList.appendChild(div);\n      });\n\n      const mergedNotes = [...newUnsolved, ...existingNotes].slice(0, 50);\n      localStorage.setItem(myKey, JSON.stringify(mergedNotes));\n    } catch (err) {\n      console.warn('Error saving local wrong notes in recap:', err);\n    }\n\n    // Refresh profile and leaderboard cache in background\n    fetchProfile(currentUser.id);\n    refreshLeaderboardCache();\n  }, 2200);\n}\n\n// -------------------------------------------------------------\n// Modals: Leaderboard & Wrong Answer Notes\n// -------------------------------------------------------------\nfunction scrollToMyRank() {\n  const myRow = document.getElementById('my-leaderboard-row');\n  if (myRow) {\n    myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });\n    myRow.classList.add('pulse-highlight');\n    setTimeout(() => myRow.classList.remove('pulse-highlight'), 1200);\n  }\n}\n\nfunction renderLeaderboardItems(list, container) {\n  const summaryBox = document.getElementById('leaderboard-my-summary');\n  const modalTitle = document.getElementById('leaderboard-modal-title');\n\n  if (!Array.isArray(list) || list.length === 0) {\n    if (modalTitle) modalTitle.innerText = '🏆 명예의 전당 (시즌2)';\n    if (summaryBox) summaryBox.innerHTML = '';\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">아직 기록된 학생이 없습니다. 첫 번째 챔피언이 되어보세요!</div>';\n    return;\n  }\n\n  if (modalTitle) {\n    modalTitle.innerText = `🏆 명예의 전당 (시즌2) (전체 ${list.length}명)`;\n  }\n\n  // Check currentUser rank\n  const myRankIdx = currentUser\n    ? list.findIndex(u => (u.id && u.id === currentUser.id) || (u.nickname && u.nickname === currentUser.nickname))\n    : -1;\n\n  if (summaryBox) {\n    if (myRankIdx !== -1) {\n      const myUser = list[myRankIdx];\n      const rankNum = myRankIdx + 1;\n      const medal = rankNum === 1 ? '🥇 ' : (rankNum === 2 ? '🥈 ' : (rankNum === 3 ? '🥉 ' : ''));\n      const badge = (myUser.tier && myUser.tier.badge) || '💧';\n      const tierName = (myUser.tier && myUser.tier.name) || '물방울';\n\n      summaryBox.innerHTML = `\n        <div class=\"my-rank-banner\" onclick=\"scrollToMyRank()\" title=\"클릭하면 내 순위 위치로 이동합니다\">\n          <div class=\"my-rank-left\">\n            <div class=\"my-rank-label\">⭐ 내 순위 확인 (클릭하여 위치 이동)</div>\n            <div class=\"my-rank-pos\">${medal}${rankNum}위 <span class=\"my-rank-total\">/ 전체 ${list.length}명</span></div>\n          </div>\n          <div class=\"my-rank-right\">\n            <div class=\"my-rank-tier\">${badge} ${tierName}</div>\n            <div class=\"my-rank-rp\">${myUser.rp || 100} RP</div>\n            <span class=\"my-rank-jump-hint\">📍 내 위치로 이동</span>\n          </div>\n        </div>\n      `;\n    } else if (currentUser) {\n      summaryBox.innerHTML = `\n        <div class=\"my-rank-banner guest\">\n          <div class=\"my-rank-left\">\n            <div class=\"my-rank-label\">⭐ ${currentUser.nickname}님의 순위</div>\n            <div class=\"my-rank-pos\">시즌 2 등록됨 <span class=\"my-rank-total\">(전체 ${list.length}명)</span></div>\n          </div>\n          <div class=\"my-rank-right\">\n            <div style=\"font-size: 12px; color: #64748b;\">게임을 플레이하여 RP를 올려보세요! 🎮</div>\n          </div>\n        </div>\n      `;\n    } else {\n      summaryBox.innerHTML = '';\n    }\n  }\n\n  container.innerHTML = '';\n  list.forEach((user, idx) => {\n    const isMe = currentUser && ((user.id && user.id === currentUser.id) || (user.nickname && user.nickname === currentUser.nickname));\n    const isTop1 = (idx === 0);\n    const isTop2 = (idx === 1);\n    const isTop3 = (idx === 2);\n\n    let rowClass = 'leaderboard-row';\n    if (isTop1) rowClass += ' rank-1';\n    else if (isTop2) rowClass += ' rank-2';\n    else if (isTop3) rowClass += ' rank-3';\n    if (isMe) rowClass += ' my-rank-row';\n\n    const badge = (user.tier && user.tier.badge) || '💧';\n    const tierName = (user.tier && user.tier.name) || '물방울';\n    const rankLabel = isTop1 ? '🥇' : (isTop2 ? '🥈' : (isTop3 ? '🥉' : `${idx + 1}위`));\n\n    const row = document.createElement('div');\n    row.className = rowClass;\n    if (isMe) row.id = 'my-leaderboard-row';\n\n    row.innerHTML = `\n      <div class=\"leaderboard-rank\">${rankLabel}</div>\n      <div class=\"leaderboard-user\">\n        <span style=\"font-size: 20px;\">${badge}</span>\n        <div>\n          <div style=\"display: flex; align-items: center;\">\n            <strong>${user.nickname}</strong>\n            ${isMe ? '<span class=\"my-badge\">나</span>' : ''}\n          </div>\n          <div style=\"font-size: 11px; color: #64748b;\">${tierName} · 승률 ${user.win_rate || 0}% (${user.wins || 0}승 ${user.losses || 0}패)</div>\n        </div>\n      </div>\n      <div style=\"font-weight: bold; color: #0284c7; font-size: 16px;\">\n        ${user.rp || 100} RP\n      </div>\n    `;\n    container.appendChild(row);\n  });\n}\n\nasync function openLeaderboard() {\n  const container = document.getElementById('leaderboard-container');\n  const modalTitle = document.getElementById('leaderboard-modal-title');\n  if (modalTitle) modalTitle.innerText = '🏆 명예의 전당 (시즌2)';\n\n  // Show cached leaderboard immediately\n  try {\n    const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) && parsed.length > 0) {\n        renderLeaderboardItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">불러오는 중...</div>';\n  }\n  document.getElementById('modal-leaderboard').classList.add('active');\n\n  setTimeout(() => {\n    const myRow = document.getElementById('my-leaderboard-row');\n    if (myRow) myRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });\n  }, 200);\n\n  try {\n    const res = await fetch(`/api/leaderboard?_t=${Date.now()}`);\n    const data = await res.json();\n    if (data.ok && data.leaderboard) {\n      if (data.leaderboard.length > 0) {\n        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));\n        renderLeaderboardItems(data.leaderboard, container);\n        setTimeout(() => {\n          const myRow = document.getElementById('my-leaderboard-row');\n          if (myRow) myRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });\n        }, 150);\n      } else if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n        renderLeaderboardItems([], container);\n      }\n    }\n  } catch (e) {\n    console.warn('Leaderboard fetch error, using cache:', e);\n  }\n}\n\nfunction renderWrongNotesItems(list, container) {\n  if (!Array.isArray(list) || list.length === 0) {\n    container.innerHTML = '<div style=\"text-align: center; padding: 35px 20px; color: #10b981; font-size: 17px; font-weight: bold;\">🎉 아직 틀린 문제가 없습니다! 아주 훌륭해요!</div>';\n    return;\n  }\n  container.innerHTML = '';\n  list.forEach(w => {\n    const item = document.createElement('div');\n    item.style.cssText = 'background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);';\n    \n    const qText = w.question ? `<div style=\"font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 8px; line-height: 1.4;\">${w.question.replace(/\\n/g, '<br>')}</div>` : '';\n    const explText = w.explanation ? `<div style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #1e40af; margin-top: 8px; line-height: 1.4;\">💡 <strong>해설:</strong> ${w.explanation}</div>` : '';\n\n    item.innerHTML = `\n      <div style=\"display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;\">\n        <span>📝 문제 #${w.quiz_id || ''}</span>\n        <span>${w.created_at || ''}</span>\n      </div>\n      ${qText}\n      <div style=\"display: flex; gap: 16px; font-size: 15px; margin-bottom: 4px; flex-wrap: wrap;\">\n        <span style=\"color: #ef4444; font-weight: bold;\">❌ 내 선택: ${w.user_answer}</span>\n        <span style=\"color: #10b981; font-weight: bold;\">⭕ 정답: ${w.correct_answer}</span>\n      </div>\n      ${explText}\n    `;\n    container.appendChild(item);\n  });\n}\n\nasync function openWrongNotes() {\n  if (!currentUser) return;\n  const container = document.getElementById('wrongnotes-container');\n\n  // Show cached wrong answers first if available\n  try {\n    const cached = localStorage.getItem('waterpang_wrongnotes_' + currentUser.id);\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) && parsed.length > 0) {\n        renderWrongNotesItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes()) {\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">불러오는 중...</div>';\n  }\n  document.getElementById('modal-wrongnotes').classList.add('active');\n\n  try {\n    const res = await fetch(`/api/profile?userId=${currentUser.id}`);\n    const data = await res.json();\n    if (data.ok && Array.isArray(data.wrongAnswers)) {\n      localStorage.setItem('waterpang_wrongnotes_' + currentUser.id, JSON.stringify(data.wrongAnswers));\n      renderWrongNotesItems(data.wrongAnswers, container);\n    }\n  } catch (e) {\n    if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n      container.innerHTML = '<div style=\"color: #ef4444; text-align: center; padding: 20px;\">오답노트를 불러오지 못했습니다. 다시 시도해주세요.</div>';\n    }\n  }\n}\n" }
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
try {
  const qPath = path.join(__dirname, 'quizzes.json');
  if (fs.existsSync(qPath)) {
    const loaded = JSON.parse(fs.readFileSync(qPath, 'utf8'));
    if (Array.isArray(loaded) && loaded.length > 0) {
      allQuizzes = loaded;
    }
  }
} catch (e) {}
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

  if (pathname === '/api/admin/delete-user') {
    const query = parsedUrl.query || {};
    const nickname = (query.nickname || '').trim();
    if (!nickname) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: '닉네임을 입력해주세요. (예: /api/admin/delete-user?nickname=삭제할계정)' }));
    }
    const user = db.getUserByNickname(nickname);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ error: `"${nickname}" 계정을 찾을 수 없습니다.` }));
    }
    db.deleteUser(user.id);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, message: `"${nickname}" 계정이 성공적으로 삭제되었습니다!`, deletedNickname: nickname, deletedId: user.id }));
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
      let user = db.getUserByNickname(body.nickname);
      if (!user && body.backupUser && body.backupUser.nickname === body.nickname && body.backupUser.password === body.password) {
        user = db.restoreOrSyncUser(body.backupUser, body.leaderboardSnapshot);
      }
      if (db.isProhibitedNickname(body.nickname, user ? user.id : null).prohibited) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 부적절한 닉네임으로 이용이 제한된 계정입니다. 새 계정을 생성해주세요.' }));
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
