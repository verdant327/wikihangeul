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
const zlib = require('node:zlib');

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

const EMOJI_REGEX = /[\u{1F000}-\u{1FAFF}\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}\u{FE0E}]/u;

const TEACHER_ACCOUNT = {
  id: '01fdd103-ef91-43d5-b0d5-8f1867d98c3e',
  nickname: '하하하하하쌤',
  password: '990327'
};

function isProhibitedNickname(nickname, userId = null) {
  if (!nickname || typeof nickname !== 'string') return { prohibited: false };

  // Emoji check (No emojis allowed in nicknames)
  if (EMOJI_REGEX.test(nickname)) {
    return { prohibited: true, matched: '이모지 사용 불가' };
  }

  const clean = nickname.replace(/[\s_.,~!@#$%^&*()=+/\\|?:;'"<>-]/g, '').toLowerCase();

  // Authentic teacher account is always exempted from prohibited filters
  if (nickname.trim() === TEACHER_ACCOUNT.nickname) {
    if (!userId || userId === TEACHER_ACCOUNT.id) {
      return { prohibited: false };
    }
  }

  // Teacher / Admin impersonation check (Blocks all unauthorized teacher/admin accounts)
  if (clean.includes('하하하하하쌤') || /하하하+쌤/.test(clean) || /하하하+선생(?:님)?(?:$|[0-9_])/.test(clean) || /\[?(?:gm|관리자|운영자)\]?/i.test(nickname)) {
    if (userId !== TEACHER_ACCOUNT.id) {
      return { prohibited: true, matched: '선생님/관리자 사칭 방지' };
    }
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
      if (!u || !u.nickname) continue;
      // Strip emojis from any existing nickname
      if (EMOJI_REGEX.test(u.nickname)) {
        let stripped = u.nickname.replace(new RegExp(EMOJI_REGEX.source, 'gu'), '').trim();
        if (stripped.length < 2) stripped = '물풍선친구' + u.id.slice(0, 4);
        console.log(`[DB-Sanitize] 🧼 Stripped emoji: "${u.nickname}" -> "${stripped}"`);
        try {
          if (useJsonFallback) {
            const f = jsonStore.users.find(x => x.id === u.id);
            if (f) f.nickname = stripped;
            saveJsonStore();
          } else {
            db.prepare('UPDATE users SET nickname = ? WHERE id = ?').run(stripped, u.id);
          }
          u.nickname = stripped;
        } catch (err) {}
      }
      if (isProhibitedNickname(u.nickname, u.id).prohibited) {
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

function ensureTeacherAccount() {
  try {
    if (useJsonFallback) {
      if (!jsonStore.users) jsonStore.users = [];
      let t = jsonStore.users.find(u => u.nickname === TEACHER_ACCOUNT.nickname);
      if (!t) {
        jsonStore.users.push({
          id: TEACHER_ACCOUNT.id,
          nickname: TEACHER_ACCOUNT.nickname,
          password: TEACHER_ACCOUNT.password,
          rp: 100,
          wins: 0,
          losses: 0,
          draws: 0,
          season: 3,
          season1_rp: 100,
          season1_rank: 0,
          avatar: '👨‍🏫',
          created_at: new Date().toISOString()
        });
      } else {
        t.id = TEACHER_ACCOUNT.id;
        t.password = TEACHER_ACCOUNT.password;
        t.season = 3;
      }
      saveJsonStore();
    } else {
      const existing = db.prepare('SELECT id, nickname, password FROM users WHERE nickname = ?').get(TEACHER_ACCOUNT.nickname);
      if (!existing) {
        db.prepare(`
          INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, season1_rp, season1_rank, created_at)
          VALUES (?, ?, ?, 100, 0, 0, 0, 3, 100, 0, datetime('now', 'localtime'))
        `).run(TEACHER_ACCOUNT.id, TEACHER_ACCOUNT.nickname, TEACHER_ACCOUNT.password);
        console.log('[DB] 👨‍🏫 Authentic Teacher account created: 하하하하하쌤 (PW: 990327)');
      } else {
        db.prepare('UPDATE users SET id = ?, password = ?, season = 3 WHERE nickname = ?')
          .run(TEACHER_ACCOUNT.id, TEACHER_ACCOUNT.password, TEACHER_ACCOUNT.nickname);
        console.log('[DB] 👨‍🏫 Authentic Teacher account verified & password synced (PW: 990327)');
      }
    }
  } catch (e) {
    console.error('[DB] ensureTeacherAccount error:', e.message);
  }
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
      season INTEGER DEFAULT 3,
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
  try { db.exec(`ALTER TABLE users ADD COLUMN season INTEGER DEFAULT 3`); } catch (e) {}
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
        if (u.season !== 3) {
          u.season1_rp = u.rp || 100;
          u.rp = 100;
          u.wins = 0;
          u.losses = 0;
          u.draws = 0;
          u.season = 3;
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
              season: 3,
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
          VALUES (?, ?, ?, 100, 0, 0, 0, 3, ?, ?, datetime('now', 'localtime'))
        `);
        for (const u of seed.season2SeedUsers) {
          stmt.run(u.id, u.nickname, u.password || '1234', u.season1_rp || 100, u.season1_rank || 0);
        }
        db.exec('COMMIT');
        console.log(`[DB] ✅ Pre-seeded ${seed.season2SeedUsers.length} user accounts for Season 2!`);
      }

      // Guarantee Season 3 reset is executed exactly once
      const metaRow = db.prepare("SELECT value FROM season_metadata WHERE key = 'season_reset_v3'").get();
      if (!metaRow) {
        console.log('[DB] Performing Season 3 reset on all existing users...');
        db.exec(`
          UPDATE users 
          SET season1_rp = CASE WHEN season1_rp IS NULL OR season1_rp = 100 THEN rp ELSE season1_rp END,
              rp = 100,
              wins = 0,
              losses = 0,
              draws = 0,
              season = 3;
          INSERT OR REPLACE INTO season_metadata (key, value) VALUES ('season_reset_v3', 'done');
        `);
        console.log('[DB] ✅ All existing users successfully reset to Season 3 (100 RP baseline)!');
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
  ensureTeacherAccount();
  sanitizeProhibitedUsers();
  console.log('[DB] node:sqlite database initialized successfully at', DB_PATH);
} catch (err) {
  console.warn('[DB] node:sqlite not available. Switching to persistent JSON store:', err.message);
  useJsonFallback = true;
  loadJsonStore();
  initSeason2Data();
  ensureTeacherAccount();
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
      season: 3,
      created_at: now
    };
    jsonStore.users.push(user);
    saveJsonStore();
    return getUserById(id);
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, created_at)
      VALUES (?, ?, ?, 100, 0, 0, 0, 3, datetime('now', 'localtime'))
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
      return { ...user, tier: getTierInfo(user.rp), season: user.season || 3 };
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
      return { ...user, tier: getTierInfo(user.rp), season: user.season || 3 };
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
      jsonStore.users[idx].season = 3;
      saveJsonStore();
    }
    return getUserById(userId);
  }

  const stmt = db.prepare(`
    UPDATE users
    SET rp = ?, wins = ?, losses = ?, draws = ?, season = 3
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
        season: 3
      };
    });
  }

  const query = (limit && limit > 0)
    ? `SELECT id, nickname, rp, wins, losses, draws,
              ROUND(CAST(wins AS FLOAT) / MAX(1, wins + losses) * 100, 1) as win_rate
       FROM users
       WHERE season >= 2 OR season IS NULL
       ORDER BY rp DESC, wins DESC
       LIMIT ?`
    : `SELECT id, nickname, rp, wins, losses, draws,
              ROUND(CAST(wins AS FLOAT) / MAX(1, wins + losses) * 100, 1) as win_rate
       FROM users
       WHERE season >= 2 OR season IS NULL
       ORDER BY rp DESC, wins DESC`;

  const stmt = db.prepare(query);
  const list = (limit && limit > 0) ? stmt.all(limit) : stmt.all();
  return list
    .filter(item => item && item.nickname && !isProhibitedNickname(item.nickname, item.id).prohibited)
    .map(item => ({
      ...item,
      tier: getTierInfo(item.rp),
      season: 3
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
      u.season = 3;
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
          season = 3
    `);
  }
  console.log('[DB] Reset all users to Season 3 baseline.');
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
    const isSeason2 = (userData.season === 3 || (userData.season === 3 || userData.season === 2));

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
          jsonStore.users[idx].season = 3;
          saveJsonStore();
        }
      } else {
        const stmt = db.prepare(`UPDATE users SET rp = ?, wins = ?, losses = ?, draws = ?, password = ?, season = 3 WHERE id = ?`);
        stmt.run(newRp, newWins, newLosses, newDraws, updatePass, existing.id);
      }
    }
  } else {
    const id = userData.id || crypto.randomUUID();
    const password = userData.password || '1234';
    // If incoming user is from Season 1 without season=2, start Season 2 at 100 RP!
    const rp = ((userData.season === 3 || userData.season === 2) && typeof userData.rp === 'number') ? userData.rp : 100;
    const wins = ((userData.season === 3 || userData.season === 2) && typeof userData.wins === 'number') ? userData.wins : 0;
    const losses = ((userData.season === 3 || userData.season === 2) && typeof userData.losses === 'number') ? userData.losses : 0;
    const draws = ((userData.season === 3 || userData.season === 2) && typeof userData.draws === 'number') ? userData.draws : 0;
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
        season: 3,
        created_at: createdAt
      });
      saveJsonStore();
    } else {
      try {
        const stmt = db.prepare(`
          INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 3, datetime('now', 'localtime'))
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
              season: 3,
              created_at: new Date().toISOString()
            });
          } else {
            try {
              const stmt = db.prepare(`
                INSERT INTO users (id, nickname, password, rp, wins, losses, draws, season, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 3, datetime('now', 'localtime'))
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
                jsonStore.users[idx].season = 3;
              }
            } else {
              try {
                db.prepare(`
                  UPDATE users 
                  SET rp = ?, wins = ?, losses = ?, draws = ?, season = 3 
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


function getUserRank(userId, nickname = null) {
  if (!userId && !nickname) return null;
  const lb = getLeaderboard(5000);
  const idx = lb.findIndex(u => (userId && (u.id === userId || u.nickname === userId)) || (nickname && u.nickname === nickname));
  return idx !== -1 ? (idx + 1) : null;
}

return {
  getUserRank,
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
  PROHIBITED_KEYWORDS,
  ensureTeacherAccount,
  TEACHER_ACCOUNT
};

})();

const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Fallback 120 Curated Korean Spelling Quizzes
const FALLBACK_QUIZZES = [
    {
        "id":  1,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"갑작스러운 상황에 너무 ( ) 없었어.\"",
        "options":  [
                        "어이",
                        "어의"
                    ],
        "answer":  "어이",
        "explanation":  "\u0027어이\u0027는 엄청나게 큰 사람이나 사물을 뜻하는 고유어로 기가 막힐 때 \u0027어이없다\u0027라고 써요. \u0027어의(御醫)\u0027는 임금님을 치료하던 의사입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  2,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘이 ( )인지 아니?\"",
        "options":  [
                        "며칠",
                        "몇일"
                    ],
        "answer":  "며칠",
        "explanation":  "국어에서는 \u0027몇 일\u0027이라는 표기 자체가 존재하지 않으며, 언제나 \u0027며칠\u0027로 적는 것이 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  3,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘따라 ( ) 기분이 설레네.\"",
        "options":  [
                        "왠지",
                        "웬지"
                    ],
        "answer":  "왠지",
        "explanation":  "\u0027왜인지\u0027의 줄임말일 때만 \u0027왠지\u0027를 쓰고, 그 외에 \u0027웬일이니?\u0027, \u0027웬 떡이야?\u0027처럼 어찌 된 일인지를 나타낼 때는 \u0027웬\u0027을 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  4,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"감기 얼른 다 ( ) 바랄게!\"",
        "options":  [
                        "낫길",
                        "낳길"
                    ],
        "answer":  "낫길",
        "explanation":  "병이나 상처가 치료되는 것은 \u0027낫다(낫길, 나아)\u0027이고, 아기나 알을 몸 밖으로 내보내는 것은 \u0027낳다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  5,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"약속 시간에 늦으면 ( )?\"",
        "options":  [
                        "어떡해",
                        "어떻해"
                    ],
        "answer":  "어떡해",
        "explanation":  "\u0027어떻게 해\u0027가 줄어든 말은 \u0027어떡해\u0027입니다. 종성 \u0027ㅎ\u0027 뒤에 초성 \u0027ㅎ\u0027이 붙는 \u0027어떻해\u0027라는 단어는 우리말에 없습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  6,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"그 일을 ( ) 해결해야 할까?\"",
        "options":  [
                        "어떻게",
                        "어떡해"
                    ],
        "answer":  "어떻게",
        "explanation":  "뒤에 오는 서술어(\u0027해결할까\u0027)를 수식하는 부사형으로는 \u0027어떻게\u0027를 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  7,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"교실에서 장난치면 ( )!\"",
        "options":  [
                        "안 돼",
                        "않 돼"
                    ],
        "answer":  "안 돼",
        "explanation":  "\u0027안\u0027은 부정부사 \u0027아니\u0027의 준말이고, \u0027않\u0027은 \u0027아니하-\u0027의 준말입니다. \u0027아니 돼\u0027가 성립하므로 \u0027안 돼\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  8,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"생각을 ( ) 해보고 결정하자.\"",
        "options":  [
                        "곰곰이",
                        "곰곰히"
                    ],
        "answer":  "곰곰이",
        "explanation":  "첩어 명사나 부사 뒤에 붙는 부사화 접미사로, \u0027곰곰\u0027 뒤에는 \u0027-이\u0027가 붙어 \u0027곰곰이\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  9,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께서 학생들을 ( ) 챙겨주셨다.\"",
        "options":  [
                        "일일이",
                        "일일히"
                    ],
        "answer":  "일일이",
        "explanation":  "\u0027일일히\u0027는 잘못된 표기이며, 현대 맞춤법에서는 \u0027일일이\u0027만 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  10,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"손을 비누로 ( ) 씻자.\"",
        "options":  [
                        "깨끗이",
                        "깨끗히"
                    ],
        "answer":  "깨끗이",
        "explanation":  "\u0027ㅅ\u0027 받침으로 끝나는 어간 뒤에는 부사화 접미사 \u0027-이\u0027가 붙어 \u0027깨끗이\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  11,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"방안을 햇볕으로 ( ) 데웠다.\"",
        "options":  [
                        "따뜻이",
                        "따뜻히"
                    ],
        "answer":  "따뜻이",
        "explanation":  "\u0027ㅅ\u0027 받침으로 끝나는 말 뒤에는 \u0027-이\u0027가 결합하므로 \u0027따뜻이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  12,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구야, 정말 ( )이야!\"",
        "options":  [
                        "오랜만",
                        "오랫만"
                    ],
        "answer":  "오랜만",
        "explanation":  "\u0027오래간만\u0027이 줄어든 말이므로 \u0027오랜만\u0027이 맞습니다. 사이시옷이 들어가지 않습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  13,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"하늘에 뜬 밝은 ( ).\"",
        "options":  [
                        "해님",
                        "햇님"
                    ],
        "answer":  "해님",
        "explanation":  "\u0027님\u0027은 접미사이므로 순우리말 명사 \u0027해\u0027와 결합할 때 사이시옷을 받치지 않고 \u0027해님\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  14,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"카메라의 ( )을 잘 맞춰봐.\"",
        "options":  [
                        "초점",
                        "촛점"
                    ],
        "answer":  "초점",
        "explanation":  "\u0027초점(焦點)\u0027은 한자어와 한자어의 결합이므로 사이시옷을 쓰지 않고 \u0027초점\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  15,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구들과 운동장에서 ( )을 했다.\"",
        "options":  [
                        "숨바꼭질",
                        "숨박꼭질"
                    ],
        "answer":  "숨바꼭질",
        "explanation":  "\u0027숨다\u0027에서 유래된 놀이 명칭의 바른 표준어는 \u0027숨바꼭질\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  16,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"용돈을 다 써서 ( )가 되었어.\"",
        "options":  [
                        "빈털터리",
                        "빈털털이"
                    ],
        "answer":  "빈털터리",
        "explanation":  "가진 것이 하나도 없게 된 사람을 뜻하는 표준어는 \u0027빈털터리\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  17,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"( ) 숙제는 미리 끝내두자.\"",
        "options":  [
                        "아무튼",
                        "아뭏든"
                    ],
        "answer":  "아무튼",
        "explanation":  "현행 표준어 규정에서는 소리 나는 대로 \u0027아무튼\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  18,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바르고 ( ) 어린이가 됩시다.\"",
        "options":  [
                        "올바른",
                        "옳바른"
                    ],
        "answer":  "올바른",
        "explanation":  "\u0027올곧다\u0027의 \u0027올\u0027과 \u0027바르다\u0027가 합쳐진 말로 \u0027올바르다/올바른\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  19,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"좁은 가방 속에 책을 억지로 ( ).\"",
        "options":  [
                        "욱여넣었다",
                        "우겨넣었다"
                    ],
        "answer":  "욱여넣었다",
        "explanation":  "주위에서 안쪽으로 함부로 밀어 넣는 것은 \u0027욱여넣다\u0027가 바른 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  20,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아침에 ( ) 일어나 운동을 했다.\"",
        "options":  [
                        "일찍이",
                        "일찌기"
                    ],
        "answer":  "일찍이",
        "explanation":  "부사 \u0027일찍\u0027 뒤에 부사화 접미사 \u0027-이\u0027가 붙은 형태이므로 \u0027일찍이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  21,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비가 오고 바람까지 부니 ( ) 춥다.\"",
        "options":  [
                        "더욱이",
                        "더우기"
                    ],
        "answer":  "더욱이",
        "explanation":  "\u0027더욱\u0027이라는 부사에 접미사 \u0027-이\u0027가 붙어 원형을 밝혀 적는 \u0027더욱이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  22,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"넘어져도 ( ) 일어나는 인형.\"",
        "options":  [
                        "오뚝이",
                        "오똑이"
                    ],
        "answer":  "오뚝이",
        "explanation":  "현대 국어 표준어로는 모음조화가 약화되어 \u0027오뚝하다/오뚝이\u0027가 올바른 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  23,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가족들이 모여 ( ) 이야기를 나눴다.\"",
        "options":  [
                        "오순도순",
                        "오손도손"
                    ],
        "answer":  "오순도순",
        "explanation":  "표준어 규정에서 \u0027오손도손\u0027은 비표준어이며 \u0027오순도순\u0027만 표준어로 인정됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  24,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가위로 종이를 ( ) 잘랐어.\"",
        "options":  [
                        "싹둑싹둑",
                        "싹독싹독"
                    ],
        "answer":  "싹둑싹둑",
        "explanation":  "\u0027싹둑\u0027의 큰말은 \u0027썩둑\u0027이며, \u0027싹독\u0027은 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  25,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"점심을 먹고 나니 너무 ( ).\"",
        "options":  [
                        "졸리다",
                        "졸립다"
                    ],
        "answer":  "졸리다",
        "explanation":  "\u0027잠이 오다\u0027라는 뜻의 표준어는 \u0027졸리다\u0027입니다. \u0027졸립다\u0027는 비표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  26,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"( ) 파도가 치는 바다.\"",
        "options":  [
                        "거친",
                        "거칠은"
                    ],
        "answer":  "거친",
        "explanation":  "\u0027거칠다\u0027의 관형사형은 \u0027ㄹ\u0027이 탈락하여 \u0027거친\u0027이 됩니다. \u0027거칠은\u0027은 문학적 허용 외에는 비표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  27,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리 집은 학교와 ( ).\"",
        "options":  [
                        "가까워",
                        "가까와"
                    ],
        "answer":  "가까워",
        "explanation":  "\u0027ㅂ\u0027 불규칙 용언 뒤에 모음 어미 \u0027-어\u0027가 결합하면 \u0027가까워\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  28,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시험을 잘 ( ) 왔다.\"",
        "options":  [
                        "치르고",
                        "치루고"
                    ],
        "answer":  "치르고",
        "explanation":  "기본형이 \u0027치르다\u0027이므로 어간 \u0027치르-\u0027 뒤에 \u0027-고\u0027가 붙어 \u0027치르고\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  29,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"상황에 ( ) 행동을 해야 해.\"",
        "options":  [
                        "알맞은",
                        "알맞는"
                    ],
        "answer":  "알맞은",
        "explanation":  "\u0027알맞다\u0027는 형용사이므로 현재 관형사형 어미 \u0027-은\u0027이 붙어 \u0027알맞은\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  30,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"격식에 ( ) 옷차림.\"",
        "options":  [
                        "걸맞은",
                        "걸맞는"
                    ],
        "answer":  "걸맞은",
        "explanation":  "\u0027걸맞다\u0027 역시 형용사이므로 관형사형 어미 \u0027-은\u0027이 결합하여 \u0027걸맞은\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  31,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"( ) 그럴 필요까지는 없어.\"",
        "options":  [
                        "굳이",
                        "구지"
                    ],
        "answer":  "굳이",
        "explanation":  "구개음화 현상으로 소리는 [구지]로 나지만 어원을 밝혀 \u0027굳이\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  32,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"양말이 헐렁해서 저절로 ( ).\"",
        "options":  [
                        "벗어졌다",
                        "벗겨졌다"
                    ],
        "answer":  "벗어졌다",
        "explanation":  "\u0027저절로\u0027처럼 외부의 힘 없이 스스로 떨어져 나갈 때는 자동사 \u0027벗어지다(벗어졌다)\u0027가 표준어입니다. \u0027벗겨졌다\u0027는 다른 사람에 의해 강제로 벗겨짐을 당할 때 쓰는 피동사입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  33,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"내 얼굴을 ( ) 쳐다보았다.\"",
        "options":  [
                        "빤히",
                        "빤이"
                    ],
        "answer":  "빤히",
        "explanation":  "\u0027하다\u0027가 붙는 어근 \u0027빤하다\u0027 뒤에는 부사화 접미사 \u0027-히\u0027가 붙어 \u0027빤히\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  34,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"수학 문제가 ( ) 잘 풀린다.\"",
        "options":  [
                        "술술",
                        "숼숼"
                    ],
        "answer":  "술술",
        "explanation":  "거침없이 잘 풀리거나 넘어가는 모양을 나타내는 부사는 \u0027술술\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  35,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어린 시절의 추억이 ( ) 난다.\"",
        "options":  [
                        "어렴풋이",
                        "어렴풋히"
                    ],
        "answer":  "어렴풋이",
        "explanation":  "\u0027ㅅ\u0027 받침으로 끝나는 말 뒤에는 부사화 접미사 \u0027-이\u0027가 붙어 \u0027어렴풋이\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  36,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시간이 ( ) 못해 다 못 풀었다.\"",
        "options":  [
                        "넉넉지",
                        "넉넉치"
                    ],
        "answer":  "넉넉지",
        "explanation":  "앞말의 받침이 안울림소리(ㄱ, ㅂ, ㅅ)일 때는 \u0027하\u0027가 통째로 탈락하여 \u0027넉넉지\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  37,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"내 ( ) 그 소문은 거짓이야.\"",
        "options":  [
                        "생각건대",
                        "생각컨대"
                    ],
        "answer":  "생각건대",
        "explanation":  "\u0027생각하건대\u0027에서 앞 받침 \u0027ㄱ\u0027 뒤의 \u0027하\u0027가 완전히 탈락하므로 \u0027생각건대\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  38,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구들에게 친절을 ( ).\"",
        "options":  [
                        "베풀다",
                        "배풀다"
                    ],
        "answer":  "베풀다",
        "explanation":  "은혜나 친절을 베푸는 것은 \u0027베풀다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  39,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바닷가 위를 나는 ( ).\"",
        "options":  [
                        "갈매기",
                        "갈메기"
                    ],
        "answer":  "갈매기",
        "explanation":  "물샛과의 새를 뜻하는 표준어는 \u0027ㅐ\u0027를 쓰는 \u0027갈매기\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  40,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"( )께는 항상 공손하게 인사하자.\"",
        "options":  [
                        "웃어른",
                        "윗어른"
                    ],
        "answer":  "웃어른",
        "explanation":  "위와 아래의 대립이 없는 경우에는 \u0027웃-\u0027을 쓰므로, \u0027아랫어른\u0027이 없는 \u0027어른\u0027 앞에는 \u0027웃어른\u0027을 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  41,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"나중에 멋진 과학자가 ( ) 싶어요.\"",
        "options":  [
                        "되고",
                        "돼고"
                    ],
        "answer":  "되고",
        "explanation":  "\u0027돼\u0027는 \u0027되어\u0027의 준말입니다. \u0027되어고\u0027는 성립하지 않으므로 \u0027되고\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  42,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"드디어 과제를 다 ( )!\"",
        "options":  [
                        "됐다",
                        "됬다"
                    ],
        "answer":  "됐다",
        "explanation":  "\u0027되었다\u0027의 준말이므로 \u0027됐다\u0027로 적어야 합니다. \u0027됬\u0027이라는 글자는 우리말에 없습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  43,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시간이 ( ) 다시 만나자.\"",
        "options":  [
                        "돼서",
                        "되서"
                    ],
        "answer":  "돼서",
        "explanation":  "\u0027되어서\u0027가 줄어든 형태이므로 \u0027돼서\u0027가 올바른 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  44,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님, 내일 학교에서 ( ).\"",
        "options":  [
                        "봬요",
                        "뵈요"
                    ],
        "answer":  "봬요",
        "explanation":  "\u0027뵈어요\u0027가 줄어든 말이므로 \u0027봬요\u0027가 맞습니다. 어간 \u0027뵈-\u0027 뒤에 바로 보조사 \u0027-요\u0027가 올 수 없습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  45,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어젯밤에 잠을 잘 자지 ( ).\"",
        "options":  [
                        "못했다",
                        "못 했다"
                    ],
        "answer":  "못했다",
        "explanation":  "\u0027일정한 수준에 미치지 못하다\u0027라는 뜻의 동사는 한 단어인 \u0027못하다\u0027이므로 붙여 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  46,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"네 꿈이 꼭 이루어지길 ( ).\"",
        "options":  [
                        "바라",
                        "바래"
                    ],
        "answer":  "바라",
        "explanation":  "기본형이 \u0027바라다\u0027이므로 어간 \u0027바라-\u0027에 어미 \u0027-아\u0027가 붙으면 \u0027바라\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  47,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동생이 밥을 먹지 ( ) 떼를 쓴다.\"",
        "options":  [
                        "않고",
                        "안고"
                    ],
        "answer":  "않고",
        "explanation":  "\u0027아니하고\u0027의 준말이므로 \u0027않고\u0027가 맞습니다. \u0027안고\u0027는 품에 안는다는 뜻입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  48,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"교장 선생님 말씀을 깊이 ( ).\"",
        "options":  [
                        "되새겼다",
                        "돼새겼다"
                    ],
        "answer":  "되새겼다",
        "explanation":  "\u0027되새기다\u0027는 접두사 \u0027되-\u0027가 붙은 말이므로 \u0027되새겼다\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  49,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"남을 괴롭히면 ( )!\"",
        "options":  [
                        "안 돼",
                        "안 되"
                    ],
        "answer":  "안 돼",
        "explanation":  "문장의 끝에는 종결어미가 필요하므로 \u0027아니 되어\u0027의 준말인 \u0027안 돼\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  50,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리는 내일 아침 일찍 ( ).\"",
        "options":  [
                        "출발할 거야",
                        "출발할 꺼야"
                    ],
        "answer":  "출발할 거야",
        "explanation":  "소리는 [출발할 꺼야]로 나더라도 의존명사 \u0027것\u0027을 밝혀 \u0027출발할 거야\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  51,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"안전하게 ( )을 건넜다.\"",
        "options":  [
                        "등굣길",
                        "등교길"
                    ],
        "answer":  "등굣길",
        "explanation":  "한자어 \u0027등교\u0027와 순우리말 \u0027길\u0027이 만나 된소리 [등교낄]로 나므로 \u0027등굣길\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  52,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"수업 끝나고 즐거운 ( ).\"",
        "options":  [
                        "하굣길",
                        "하교길"
                    ],
        "answer":  "하굣길",
        "explanation":  "한자어 \u0027하교\u0027와 순우리말 \u0027길\u0027의 결합으로 뒷소리가 된소리 [하교낄]이 나므로 \u0027하굣길\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  53,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"생일 케이크에 ( )을 켰다.\"",
        "options":  [
                        "촛불",
                        "초불"
                    ],
        "answer":  "촛불",
        "explanation":  "한자어 \u0027초\u0027와 순우리말 \u0027불\u0027의 합성어로 [초뿔] 소리가 나므로 \u0027촛불\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  54,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"지붕에서 ( )이 뚝뚝 떨어진다.\"",
        "options":  [
                        "빗물",
                        "비물"
                    ],
        "answer":  "빗물",
        "explanation":  "순우리말 \u0027비\u0027와 \u0027물\u0027이 결합할 때 \u0027ㄴ\u0027 소리가 덧나 [빈물]이 되므로 \u0027빗물\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  55,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"산골짜기 맑은 ( ).\"",
        "options":  [
                        "냇물",
                        "내물"
                    ],
        "answer":  "냇물",
        "explanation":  "순우리말 \u0027내\u0027와 \u0027물\u0027이 합쳐져 [낸물]로 발음되므로 사이시옷을 받쳐 \u0027냇물\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  56,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"여름 방학에 시원한 ( )에 놀러 갔다.\"",
        "options":  [
                        "바닷가",
                        "바다가"
                    ],
        "answer":  "바닷가",
        "explanation":  "순우리말 \u0027바다\u0027와 \u0027가\u0027가 결합하여 된소리 [바다까]로 발음되므로 \u0027바닷가\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  57,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"고소한 냄새가 나는 ( ) 장아찌.\"",
        "options":  [
                        "깻잎",
                        "깨잎"
                    ],
        "answer":  "깻잎",
        "explanation":  "순우리말 \u0027깨\u0027와 \u0027잎\u0027이 만나 [깬닙]으로 \u0027ㄴㄴ\u0027 소리가 덧나므로 \u0027깻잎\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  58,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"목표를 이루기 위해 큰 ( )를 치렀다.\"",
        "options":  [
                        "대가",
                        "댓가"
                    ],
        "answer":  "대가",
        "explanation":  "\u0027대가(代價)\u0027는 순수한 한자어끼리의 결합이므로 사이시옷을 쓰지 않고 \u0027대가\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  59,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바구니 속 사과의 ( )를 세어보자.\"",
        "options":  [
                        "개수",
                        "갯수"
                    ],
        "answer":  "개수",
        "explanation":  "\u0027개수(個數)\u0027는 한자어와 한자어의 결합이므로 사이시옷을 받치지 않고 \u0027개수\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  60,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"운동한 ( )가 늘어날수록 건강해진다.\"",
        "options":  [
                        "횟수",
                        "회수"
                    ],
        "answer":  "횟수",
        "explanation":  "한자어 중 사이시옷을 예외로 인정하는 6개 단어(곳간, 셋방, 숫자, 찻간, 툇간, 횟수) 중 하나이므로 \u0027횟수\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  61,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"눈 깜짝할 사이에 ( ) 사라졌다.\"",
        "options":  [
                        "금세",
                        "금새"
                    ],
        "answer":  "금세",
        "explanation":  "\u0027지금 바로\u0027의 뜻인 \u0027금시에\u0027가 줄어든 말이므로 \u0027금세\u0027가 맞습니다. \u0027금새\u0027는 물건의 값을 의미합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  62,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동물원에서 정말 ( ) 새를 보았다.\"",
        "options":  [
                        "희한한",
                        "희안한"
                    ],
        "answer":  "희한한",
        "explanation":  "드물고 신기하다는 뜻의 한자어는 \u0027희한(稀罕)하다\u0027이므로 \u0027희한한\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  63,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"소풍 전날 밤, 마음속 ( )이 가득했다.\"",
        "options":  [
                        "설렘",
                        "설레임"
                    ],
        "answer":  "설렘",
        "explanation":  "기본형이 \u0027설레다\u0027이므로 명사형 어미 \u0027-ㅁ\u0027이 결합하여 \u0027설렘\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  64,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"전국에서 ( )하는 실력자들이 모였다.\"",
        "options":  [
                        "내로라하는",
                        "내노라하는"
                    ],
        "answer":  "내로라하는",
        "explanation":  "\u0027나이로다(나이다)\u0027에서 유래한 고유 표현으로 \u0027내로라하다\u0027가 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  65,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시골 할머니 댁 앞마당이 참 ( ).\"",
        "options":  [
                        "널따랗다",
                        "넓다랗다"
                    ],
        "answer":  "널따랗다",
        "explanation":  "\u0027넓다\u0027에서 파생된 말 중 \u0027ㅂ\u0027 받침이 탈락하여 소리 나는 대로 \u0027널따랗다\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  66,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"새로 이사한 방이 ( ) 마음에 든다.\"",
        "options":  [
                        "널찍해서",
                        "넓직해서"
                    ],
        "answer":  "널찍해서",
        "explanation":  "\u0027넓-\u0027의 \u0027ㅂ\u0027이 탈락하고 된소리로 굳어진 형태이므로 \u0027널찍하다/널찍해서\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  67,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"숲속 나무를 콕콕 쪼는 ( ).\"",
        "options":  [
                        "딱따구리",
                        "딱다구리"
                    ],
        "answer":  "딱따구리",
        "explanation":  "한 단어 안에서 까닭 없이 나는 된소리는 다음 음절을 된소리로 적으므로 \u0027딱따구리\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  68,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아삭아삭 맛있는 무 ( ).\"",
        "options":  [
                        "깍두기",
                        "깎두기"
                    ],
        "answer":  "깍두기",
        "explanation":  "기역 받침 뒤에서 된소리가 나더라도 원형을 밝힐 수 없으므로 소리대로 \u0027깍두기\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  69,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"방바닥에 장난감이 ( ) 있다.\"",
        "options":  [
                        "널브러져",
                        "널부러져"
                    ],
        "answer":  "널브러져",
        "explanation":  "흐트러져 어지럽게 흩어져 있는 모양은 \u0027널브러지다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  70,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"쫄깃쫄깃 맛있는 매콤 ( ) 볶음.\"",
        "options":  [
                        "주꾸미",
                        "쭈꾸미"
                    ],
        "answer":  "주꾸미",
        "explanation":  "문어과의 연체동물을 가리키는 올바른 표준어는 \u0027주꾸미\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  71,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"학교 앞 분식집에서 매콤한 ( )를 사 먹었다.\"",
        "options":  [
                        "떡볶이",
                        "떡뽂이"
                    ],
        "answer":  "떡볶이",
        "explanation":  "\u0027떡\u0027과 \u0027볶다\u0027의 명사형 파생 접미사 \u0027-이\u0027가 결합된 형태이므로 \u0027떡볶이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  72,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"보글보글 맛있는 김치( ).\"",
        "options":  [
                        "찌개",
                        "찌게"
                    ],
        "answer":  "찌개",
        "explanation":  "국물을 자작하게 끓인 음식은 \u0027ㅐ\u0027를 쓰는 \u0027찌개\u0027가 올바른 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  73,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"밤에 편안한 ( )를 베고 잠들었다.\"",
        "options":  [
                        "베개",
                        "배개"
                    ],
        "answer":  "베개",
        "explanation":  "\u0027베다\u0027에 도구를 뜻하는 접미사 \u0027-개\u0027가 붙은 말이므로 \u0027베개\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  74,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"목이 말라 시원한 보리차를 벌컥벌컥 ( ).\"",
        "options":  [
                        "들이켰다",
                        "들이키었다"
                    ],
        "answer":  "들이켰다",
        "explanation":  "\u0027물이나 술 따위를 단숨에 마시다\u0027는 \u0027들이켜다\u0027이므로 과거형은 \u0027들이켰다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  75,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"달걀 ( )을/를 조심스럽게 깠다.\"",
        "options":  [
                        "껍데기",
                        "껍질"
                    ],
        "answer":  "껍데기",
        "explanation":  "달걀이나 조개처럼 딱딱하게 겉을 싸고 있는 것은 \u0027껍데기\u0027가 맞고, 사과나 귤처럼 질긴 것은 \u0027껍질\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  76,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"사과 ( )을/를 얇게 깎았다.\"",
        "options":  [
                        "껍질",
                        "껍데기"
                    ],
        "answer":  "껍질",
        "explanation":  "과일이나 채소의 무르고 얇은 겉면은 \u0027껍질\u0027이라고 합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  77,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시간이 날 때마다 책을 ( ) 읽었다.\"",
        "options":  [
                        "틈틈이",
                        "틈틈히"
                    ],
        "answer":  "틈틈이",
        "explanation":  "첩어 명사 \u0027틈틈\u0027 뒤에는 부사화 접미사 \u0027-이\u0027가 결합하므로 \u0027틈틈이\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  78,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 부탁을 ( ) 거절하기 어려웠다.\"",
        "options":  [
                        "번번이",
                        "번번히"
                    ],
        "answer":  "번번이",
        "explanation":  "\u0027매 때마다\u0027를 뜻하는 \u0027번번\u0027 뒤에는 \u0027-이\u0027가 붙어 \u0027번번이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  79,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아침밥을 ( ) 챙겨 먹고 길을 나섰다.\"",
        "options":  [
                        "일찌감치",
                        "일찌감히"
                    ],
        "answer":  "일찌감치",
        "explanation":  "\u0027넉넉하게 일찍\u0027을 뜻하는 표준어는 \u0027일찌감치\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  80,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"과녁의 정중앙을 정확하게 ( ).\"",
        "options":  [
                        "맞혔다",
                        "맞췄다"
                    ],
        "answer":  "맞혔다",
        "explanation":  "목표물에 닿게 하거나 퀴즈의 답을 맞게 낸 것은 \u0027맞히다(맞혔다)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  81,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구와 시험 답안을 서로 ( ) 보았다.\"",
        "options":  [
                        "맞추어",
                        "맞히어"
                    ],
        "answer":  "맞추어",
        "explanation":  "둘 이상의 대상을 서로 대조하여 비교해보는 것은 \u0027맞추다(맞추어)\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  82,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우체국에서 친구에게 편지를 ( ).\"",
        "options":  [
                        "부쳤다",
                        "붙였다"
                    ],
        "answer":  "부쳤다",
        "explanation":  "편지나 짐을 보내는 것은 \u0027부치다(부쳤다)\u0027입니다. \u0027붙이다\u0027는 맞닿아 떨어지지 않게 하는 것입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  83,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"게시판에 안내문을 테이프로 ( ).\"",
        "options":  [
                        "붙였다",
                        "부쳤다"
                    ],
        "answer":  "붙였다",
        "explanation":  "물건이 달라붙게 접착하는 것은 \u0027붙이다(붙였다)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  84,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비 오는 날 프라이팬에 맛있는 전을 ( ).\"",
        "options":  [
                        "부쳤다",
                        "붙였다"
                    ],
        "answer":  "부쳤다",
        "explanation":  "기름을 두르고 빈대떡이나 전을 익혀 만드는 것은 \u0027부치다(부쳤다)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  85,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"외출했다가 소중한 지갑을 ( ).\"",
        "options":  [
                        "잃어버렸다",
                        "잊어버렸다"
                    ],
        "answer":  "잃어버렸다",
        "explanation":  "물건을 분실하여 없어진 상태는 \u0027잃어버리다\u0027입니다. \u0027잊어버리다\u0027는 기억을 잊는 것입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  86,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘 숙제가 있다는 사실을 까맣게 ( ).\"",
        "options":  [
                        "잊어버렸다",
                        "잃어버렸다"
                    ],
        "answer":  "잊어버렸다",
        "explanation":  "기억해야 할 사실을 깜빡한 것은 \u0027잊어버리다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  87,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"저 높은 산 ( )에 예쁜 무지개가 떴다.\"",
        "options":  [
                        "너머",
                        "넘어"
                    ],
        "answer":  "너머",
        "explanation":  "\u0027높이나 경계의 저쪽 공간\u0027을 가리키는 명사는 \u0027너머\u0027입니다. \u0027넘어\u0027는 동작을 나타내는 동사 활용형입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  88,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"높은 담장을 훌쩍 ( ) 마당으로 들어갔다.\"",
        "options":  [
                        "넘어",
                        "너머"
                    ],
        "answer":  "넘어",
        "explanation":  "\u0027넘다\u0027라는 움직임을 나타내는 서술형이므로 \u0027넘어\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  89,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"초등학생( ) 지켜야 할 기본 규칙이 있어.\"",
        "options":  [
                        "으로서",
                        "으로써"
                    ],
        "answer":  "으로서",
        "explanation":  "신분이나 자격을 나타낼 때는 조사 \u0027-으로서\u0027를 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  90,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"대화( ) 서로의 갈등을 평화롭게 풀었다.\"",
        "options":  [
                        "로써",
                        "로서"
                    ],
        "answer":  "로써",
        "explanation":  "수단이나 도구를 나타낼 때는 조사 \u0027-로써\u0027를 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  91,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께 체험학습 보고서 ( )를 받았다.\"",
        "options":  [
                        "결재",
                        "결제"
                    ],
        "answer":  "결재",
        "explanation":  "상관이나 책임자가 부하의 안건을 허가하고 승인하는 것은 \u0027결재(決裁)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  92,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"문구점에서 학용품을 카드로 ( )했다.\"",
        "options":  [
                        "결제",
                        "결재"
                    ],
        "answer":  "결제",
        "explanation":  "돈을 치르고 거래를 끝맺는 것은 \u0027결제(決濟)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  93,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"자신의 숨은 재능과 소질을 ( )하자.\"",
        "options":  [
                        "계발",
                        "개발"
                    ],
        "answer":  "계발",
        "explanation":  "슬기나 재능, 사상 등을 일깨워 발전시키는 것은 \u0027계발(啓發)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  94,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"새로운 기술과 소프트웨어를 ( )했다.\"",
        "options":  [
                        "개발",
                        "계발"
                    ],
        "answer":  "개발",
        "explanation":  "새로운 물건이나 자원을 만들어내거나 경제를 발전시키는 것은 \u0027개발(開發)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  95,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"멋지게 기른 멋진 ( ).\"",
        "options":  [
                        "구레나룻",
                        "구렛나루"
                    ],
        "answer":  "구레나룻",
        "explanation":  "\u0027귀밑에서 턱까지 난 수염\u0027의 바른 표준어는 \u0027구레나룻\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  96,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비밀 파티 계획을 살짝 ( )해주었다.\"",
        "options":  [
                        "귀띔",
                        "귀뜸"
                    ],
        "answer":  "귀띔",
        "explanation":  "상대방이 눈치챌 수 있도록 살그머니 미리 알려주는 것은 \u0027귀띔\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  97,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"두꺼운 나무 ( )로 다리를 만들었다.\"",
        "options":  [
                        "널빤지",
                        "널판지"
                    ],
        "answer":  "널빤지",
        "explanation":  "판자 형태의 얇은 널빤지를 가리키는 표준어는 \u0027널빤지\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  98,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"뱀이 몸을 둥글게 ( )를 틀고 있다.\"",
        "options":  [
                        "똬리",
                        "또아리"
                    ],
        "answer":  "똬리",
        "explanation":  "머리에 짐을 일 때 얹는 고리나 둥글게 튼 형태는 \u0027똬리\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  99,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어깨에 무거운 책가방을 ( ).\"",
        "options":  [
                        "메고",
                        "매고"
                    ],
        "answer":  "메고",
        "explanation":  "어깨나 등에 걸치는 것은 \u0027메다\u0027이고, 끈으로 묶는 것은 \u0027매다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  100,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"풀어진 운동화 끈을 단단히 ( ).\"",
        "options":  [
                        "맸다",
                        "멨다"
                    ],
        "answer":  "맸다",
        "explanation":  "끈이나 줄을 묶어 매듭을 짓는 것은 \u0027매다(맸다)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  101,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"차곡차곡 저축해서 꽤 큰 ( )을 모았다.\"",
        "options":  [
                        "목돈",
                        "몫돈"
                    ],
        "answer":  "목돈",
        "explanation":  "한 덩어리가 된 큰돈을 뜻하는 표준어는 \u0027목돈\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  102,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"거센 비바람의 위험을 ( ) 나아갔다.\"",
        "options":  [
                        "무릅쓰고",
                        "무릎쓰고"
                    ],
        "answer":  "무릅쓰고",
        "explanation":  "\u0027힘들거나 위험한 상태를 참고 견디다\u0027는 동사 \u0027무릅쓰다\u0027이므로 \u0027무릅쓰고\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  103,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"길가에 잎이 무성한 키 큰 ( ).\"",
        "options":  [
                        "미루나무",
                        "미류나무"
                    ],
        "answer":  "미루나무",
        "explanation":  "미국에서 건너온 버드나무라는 뜻의 올바른 표준어는 \u0027미루나무\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  104,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"수학 시간에 소수를 ( )로 바꾸어 나타냈다.\"",
        "options":  [
                        "백분율",
                        "백분률"
                    ],
        "answer":  "백분율",
        "explanation":  "모음이나 \u0027ㄴ\u0027 받침 뒤에서는 \u0027률\u0027이 아니라 \u0027율\u0027로 표기하므로 \u0027백분율\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  105,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"정월 ( )에 모여 잔치를 열었다.\"",
        "options":  [
                        "사흗날",
                        "사흘날"
                    ],
        "answer":  "사흗날",
        "explanation":  "\u0027사흘\u0027과 \u0027날\u0027이 결합할 때 \u0027ㄹ\u0027이 \u0027ㄷ\u0027으로 변형되어 \u0027사흗날\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  106,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"축제가 끝난 바로 ( ) 아침.\"",
        "options":  [
                        "이튿날",
                        "이틀날"
                    ],
        "answer":  "이튿날",
        "explanation":  "\u0027이틀\u0027과 \u0027날\u0027의 결합에서 \u0027ㄹ\u0027이 \u0027ㄷ\u0027으로 굳어져 \u0027이튿날\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  107,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"복도에서 심한 장난을 ( ).\"",
        "options":  [
                        "삼가자",
                        "삼가하자"
                    ],
        "answer":  "삼가자",
        "explanation":  "기본형이 \u0027삼가다\u0027이므로 어간 \u0027삼가-\u0027에 어미 \u0027-자\u0027가 붙어 \u0027삼가자\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  108,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"잃어버린 열쇠를 찾으려고 방안을 ( ) 뒤졌다.\"",
        "options":  [
                        "샅샅이",
                        "샅샅히"
                    ],
        "answer":  "샅샅이",
        "explanation":  "첩어 \u0027샅샅\u0027 뒤에는 부사화 접미사 \u0027-이\u0027가 결합하여 [삳싸치]로 발음되고 \u0027샅샅이\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  109,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"음력으로 한 해의 마지막 달을 ( )이라고 한다.\"",
        "options":  [
                        "섣달",
                        "설달"
                    ],
        "answer":  "섣달",
        "explanation":  "\u0027설\u0027과 \u0027달\u0027이 만날 때 \u0027ㄹ\u0027 받침이 \u0027ㄷ\u0027으로 바뀌어 \u0027섣달\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  110,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"순진하고 ( ) 보여도 속이 깊은 친구야.\"",
        "options":  [
                        "어수룩해",
                        "어리숙해"
                    ],
        "answer":  "어수룩해",
        "explanation":  "본래 표준어 규범에 맞는 전통적인 원형 표준어는 \u0027어수룩하다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  111,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"얼굴이 아직 어린아이처럼 ( ).\"",
        "options":  [
                        "앳되다",
                        "애띠다"
                    ],
        "answer":  "앳되다",
        "explanation":  "어린 태가 남아 있는 모습의 표준어는 \u0027앳되다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  112,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"서투른 실력으로 ( ) 아는 척하지 마.\"",
        "options":  [
                        "어쭙잖게",
                        "어줍잖게"
                    ],
        "answer":  "어쭙잖게",
        "explanation":  "주제넘거나 어설프다는 뜻의 표준어는 \u0027어쭙잖다/어쭙잖게\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  113,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"학교가 끝나면 ( ) 놀이터로 달려갔다.\"",
        "options":  [
                        "으레",
                        "으례"
                    ],
        "answer":  "으레",
        "explanation":  "\u0027틀림없이 언제나\u0027를 뜻하는 표준어는 \u0027으레\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  114,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"환경을 위해 일회용품 사용을 ( )해야 한다.\"",
        "options":  [
                        "지양",
                        "지향"
                    ],
        "answer":  "지양",
        "explanation":  "\u0027피하거나 하지 않음\u0027은 \u0027지양(止揚)\u0027이고, \u0027어떤 목표를 향해 나아감\u0027은 \u0027지향(志向)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  115,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구에게 ( ) 장난을 치면 안 돼.\"",
        "options":  [
                        "짓궂은",
                        "짓굳은"
                    ],
        "answer":  "짓궂은",
        "explanation":  "남을 궂게 대하는 장난기가 있다는 뜻의 표준어는 \u0027짓궂다/짓궂은\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  116,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"방구석에 종일 ( ) 책만 읽었다.\"",
        "options":  [
                        "처박혀",
                        "쳐박혀"
                    ],
        "answer":  "처박혀",
        "explanation":  "\u0027함부로\u0027의 뜻을 더하는 접두사는 \u0027처-\u0027이므로 \u0027처박히다/처박혀\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  117,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"슬픔을 딛고 마음을 잘 ( ) 보자.\"",
        "options":  [
                        "추스르고",
                        "추스리고"
                    ],
        "answer":  "추스르고",
        "explanation":  "기본형이 \u0027추스르다\u0027이므로 어미 \u0027-고\u0027가 붙어 \u0027추스르고\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  118,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"다락방에서 ( ) 옛날 책을 발견했다.\"",
        "options":  [
                        "케케묵은",
                        "퀘퀘묵은"
                    ],
        "answer":  "케케묵은",
        "explanation":  "오래되어 낡은 것을 뜻하는 올바른 표준어는 \u0027케케묵다/케케묵은\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  119,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"물풍선이 터지며 ( )으로 튀었다.\"",
        "options":  [
                        "풍비박산",
                        "풍지박산"
                    ],
        "answer":  "풍비박산",
        "explanation":  "사방으로 날아가 흩어짐을 뜻하는 고사성어 표준어는 \u0027풍비박산(風飛雹散)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  120,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"잠이 덜 깨어 정신이 ( )하다.\"",
        "options":  [
                        "흐리멍덩",
                        "흐리멍텅"
                    ],
        "answer":  "흐리멍덩",
        "explanation":  "정신이 맑지 못하고 흐릿한 모양을 뜻하는 표준어는 \u0027흐리멍덩하다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  121,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘따라 ( ) 기분이 좋은 일이 생길 것 같아.\"",
        "options":  [
                        "왠지",
                        "웬지"
                    ],
        "answer":  "왠지",
        "explanation":  "\u0027왜 그런지 모르게\u0027라는 뜻의 \u0027왜인지\u0027가 줄어든 말이므로 \u0027왠지\u0027가 맞습니다. \u0027웬\u0027은 \u0027어찌 된\u0027의 뜻입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  122,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"이게 ( ) 영희가 우리 집에 다 놀러 오고!\"",
        "options":  [
                        "웬일이야",
                        "왠일이야"
                    ],
        "answer":  "웬일이야",
        "explanation":  "\u0027어찌 된 일\u0027을 뜻할 때는 관형사 \u0027웬\u0027을 써서 \u0027웬일\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  123,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"쓰러져도 다시 일어서는 ( ) 인형처럼 용기를 내자!\"",
        "options":  [
                        "오뚝이",
                        "오뚜기"
                    ],
        "answer":  "오뚝이",
        "explanation":  "\u0027오뚝하다\u0027의 어근 \u0027오뚝-\u0027에 접미사 \u0027-이\u0027가 붙어 명사가 된 단어이므로 \u0027오뚝이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  124,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동생이 거짓말을 해서 정말 ( )가 없었다.\"",
        "options":  [
                        "어이",
                        "어의"
                    ],
        "answer":  "어이",
        "explanation":  "\u0027너무 뜻밖이어서 기가 막히다\u0027는 뜻은 \u0027어이없다\u0027가 맞습니다. \u0027어의\u0027는 임금의 의사를 뜻합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  125,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"약속 장소에 ( ) 도착했더니 아무도 없었다.\"",
        "options":  [
                        "금세",
                        "금새"
                    ],
        "answer":  "금세",
        "explanation":  "\u0027지금 바로\u0027를 뜻하는 \u0027금시에\u0027의 준말이므로 \u0027금세\u0027가 맞습니다. \u0027금새\u0027는 물건의 값을 뜻합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  126,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘이 ( )인지 달력을 확인해 보렴.\"",
        "options":  [
                        "며칠",
                        "몇일"
                    ],
        "answer":  "며칠",
        "explanation":  "우리말에서 \u0027몇 일\u0027이라는 표기는 없으며, 발음대로 \u0027며칠\u0027로 적는 것이 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  127,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"하늘에 무지개가 쌍으로 뜨는 ( ) 광경을 보았다.\"",
        "options":  [
                        "희한한",
                        "희안한"
                    ],
        "answer":  "희한한",
        "explanation":  "\u0027드물거나 신기하다\u0027는 뜻의 한자어는 \u0027희한(稀罕)하다\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  128,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시험에 나올 핵심 내용을 ( )처럼 콕 집어주셨다.\"",
        "options":  [
                        "족집게",
                        "쪽집게"
                    ],
        "answer":  "족집게",
        "explanation":  "작은 물건을 집는 도구의 표준어는 \u0027족집게\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  129,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"라면을 늦게 먹었더니 면발이 퉁퉁 ( ).\"",
        "options":  [
                        "붇다",
                        "불다"
                    ],
        "answer":  "붇다",
        "explanation":  "물에 젖어 부피가 커지거나 분량이 많아지는 것은 \u0027붇다\u0027가 기본형입니다. (모음 어미가 오면 \u0027불어\u0027로 바뀝니다)",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  130,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시험 결과를 기다리며 ( ) 어쩔 줄 몰랐다.\"",
        "options":  [
                        "안절부절못하며",
                        "안절부절하며"
                    ],
        "answer":  "안절부절못하며",
        "explanation":  "마음이 초조하여 어찌할 바를 모르는 상태는 \u0027안절부절못하다\u0027가 한 단어 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  131,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"소지품을 잘 챙기지 못하고 ( ) 행동하면 안 돼.\"",
        "options":  [
                        "칠칠치 못하게",
                        "칠칠맞게"
                    ],
        "answer":  "칠칠치 못하게",
        "explanation":  "\u0027칠칠하다\u0027는 야무지고 알뜰하다는 긍정적인 뜻이므로, 조심성이 없을 때는 \u0027칠칠치 못하다\u0027고 해야 합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  132,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리 반 학생을 ( ) 가장 키가 큰 친구는 민수다.\"",
        "options":  [
                        "통틀어",
                        "통털어"
                    ],
        "answer":  "통틀어",
        "explanation":  "\u0027있는 대로 다 합하여\u0027라는 뜻의 표준어는 \u0027통틀어\u0027입니다. \u0027통털어\u0027는 사투리입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  133,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"서로의 입장을 고려해 ( )하게 문제를 해결했다.\"",
        "options":  [
                        "두루뭉술",
                        "두리뭉실"
                    ],
        "answer":  "두루뭉술",
        "explanation":  "모나지 않고 둥글둥글하다는 뜻의 바른 표준어는 \u0027두루뭉술\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  134,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구는 하루 종일 쉬지도 않고 ( ) 게임만 했다.\"",
        "options":  [
                        "주야장천",
                        "주구장창"
                    ],
        "answer":  "주야장천",
        "explanation":  "\u0027밤낮으로 쉬지 않고 잇따라\u0027라는 뜻의 표준 사자성어는 \u0027주야장천(晝夜長川)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  135,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"억울하게 남의 잘못까지 ( )를 쓰게 되었다.\"",
        "options":  [
                        "덤터기",
                        "덤탱이"
                    ],
        "answer":  "덤터기",
        "explanation":  "남에게 넘겨씌우는 허물이나 책임을 뜻하는 표준어는 \u0027덤터기\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  136,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"불만이 있으면 속으로 ( )대지 말고 똑바로 말해.\"",
        "options":  [
                        "구시렁",
                        "궁시렁"
                    ],
        "answer":  "구시렁",
        "explanation":  "못마땅하여 잔소리를 자꾸 늘어놓는 모양은 \u0027구시렁거리다/구시렁대다\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  137,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"식사가 끝나면 자기 그릇은 스스로 ( )를 하자.\"",
        "options":  [
                        "설거지",
                        "설겆이"
                    ],
        "answer":  "설거지",
        "explanation":  "원래의 형태를 밝히지 않고 소리 나는 대로 \u0027설거지\u0027로 적는 것이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  138,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어려운 수학 문제를 어떻게 풀지 ( ) 생각해 보았다.\"",
        "options":  [
                        "곰곰이",
                        "곰곰히"
                    ],
        "answer":  "곰곰이",
        "explanation":  "\u0027곰곰\u0027이라는 부사에 부사화 접미사 \u0027-이\u0027가 붙은 말이므로 \u0027곰곰이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  139,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비누로 손을 ( ) 씻어 감기를 예방하자.\"",
        "options":  [
                        "깨끗이",
                        "깨끗히"
                    ],
        "answer":  "깨끗이",
        "explanation":  "\u0027ㅅ\u0027 받침으로 끝나는 어근 뒤에는 부사화 접미사 \u0027-이\u0027가 붙어 \u0027깨끗이\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  140,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"운동장 트랙의 ( )가 좁아서 달리기 불편했다.\"",
        "options":  [
                        "너비",
                        "넓이"
                    ],
        "answer":  "너비",
        "explanation":  "가로 방향의 폭을 나타낼 때는 \u0027너비\u0027, 평면의 면적 크기를 나타낼 때는 \u0027넓이\u0027를 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  141,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"고무줄을 길게 쭉 ( ) 보았다.\"",
        "options":  [
                        "늘여",
                        "늘려"
                    ],
        "answer":  "늘여",
        "explanation":  "본래보다 길이를 길게 할 때는 \u0027늘이다\u0027, 수량이나 부피를 크게 할 때는 \u0027늘리다\u0027를 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  142,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께서 손가락으로 칠판의 지도를 ( )셨다.\"",
        "options":  [
                        "가리키",
                        "가르치"
                    ],
        "answer":  "가리키",
        "explanation":  "방향이나 대상을 손짓 등으로 집어 알릴 때는 \u0027가리키다\u0027, 지식을 알려줄 때는 \u0027가르치다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  143,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"무거운 짐을 들고 가파른 언덕을 오르기가 힘에 ( ).\"",
        "options":  [
                        "부쳤다",
                        "붙였다"
                    ],
        "answer":  "부쳤다",
        "explanation":  "힘이나 능력이 미치지 못할 때는 \u0027부치다\u0027를 씁니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  144,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"생선 토막에 양념장을 넣고 자작자작 ( ).\"",
        "options":  [
                        "조렸다",
                        "졸였다"
                    ],
        "answer":  "조렸다",
        "explanation":  "고기나 생선 등을 양념하여 국물이 적게 끓이는 것은 \u0027조리다\u0027, 마음을 태우는 것은 \u0027졸이다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  145,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"답답한 교실을 벗어나 시원한 바깥바람을 ( ).\"",
        "options":  [
                        "쐤다",
                        "쇘다"
                    ],
        "answer":  "쐤다",
        "explanation":  "\u0027쐬다\u0027에 과거 시제 \u0027-었-\u0027이 붙으면 \u0027쐬었다\u0027가 줄어 \u0027쐤다\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  146,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님, 내일 학교 끝나고 교무실에서 ( )!\"",
        "options":  [
                        "봬요",
                        "뵈요"
                    ],
        "answer":  "봬요",
        "explanation":  "\u0027뵈어\u0027의 준말이 \u0027봬\u0027이므로, 존칭 어미 \u0027-요\u0027가 붙을 때는 \u0027봬요\u0027가 올바른 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  147,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"봄이 되니 들판 위로 따스한 ( )가 피어올랐다.\"",
        "options":  [
                        "아지랑이",
                        "아지랭이"
                    ],
        "answer":  "아지랑이",
        "explanation":  "햇빛에 지면이 가열되어 공기가 아른거리는 현상은 \u0027아지랑이\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  148,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"먹구름이 몰려오더니 하늘에서 쿵쾅쿵쾅 ( ) 소리가 났다.\"",
        "options":  [
                        "우레",
                        "우뢰"
                    ],
        "answer":  "우레",
        "explanation":  "\u0027천둥\u0027을 뜻하는 순우리말 표준어는 \u0027우레\u0027입니다. \u0027우뢰(雨雷)\u0027는 잘못된 한자 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  149,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"순진해서 세상 물정을 너무 모르는 ( ).\"",
        "options":  [
                        "숙맥",
                        "쑥맥"
                    ],
        "answer":  "숙맥",
        "explanation":  "\u0027콩과 보리도 구별 못 한다\u0027는 사자성어 \u0027숙맥불변(菽麥不辨)\u0027에서 온 말이므로 \u0027숙맥\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  150,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"내가 ( ) 이번 대결에서 반드시 이길 거야!\"",
        "options":  [
                        "단언컨대",
                        "단언컨데"
                    ],
        "answer":  "단언컨대",
        "explanation":  "\u0027단언하건대\u0027가 줄어든 말이므로 어미 \u0027-건대/-컨대\u0027를 살려 \u0027단언컨대\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  151,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"준비를 철저히 하지 않으면 시험을 망치기 ( )이다.\"",
        "options":  [
                        "십상",
                        "쉽상"
                    ],
        "answer":  "십상",
        "explanation":  "\u0027열에 여덟이나 아홉\u0027을 뜻하는 십상팔구(十常八九)에서 온 말이므로 \u0027십상\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  152,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"나이에 비해 얼굴이 매우 앳되고 ( ) 보였다.\"",
        "options":  [
                        "귀여워",
                        "귀여와"
                    ],
        "answer":  "귀여워",
        "explanation":  "\u0027귀엽다\u0027에 모음 어미가 결합하면 ㅂ 불규칙 활용으로 \u0027귀여워\u0027가 됩니다. \u0027귀여와\u0027는 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  153,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"빈칸에 들어갈 가장 ( ) 낱말을 고르시오.\"",
        "options":  [
                        "알맞은",
                        "알맞는"
                    ],
        "answer":  "알맞은",
        "explanation":  "\u0027알맞다\u0027는 형용사이므로 관형사형 어미 \u0027-은\u0027이 붙어 \u0027알맞은\u0027이 올바릅니다. (\u0027알맞는\u0027은 틀림)",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  154,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"상황에 ( ) 행동을 해야 칭찬을 받는다.\"",
        "options":  [
                        "걸맞은",
                        "걸맞는"
                    ],
        "answer":  "걸맞은",
        "explanation":  "\u0027걸맞다\u0027도 형용사이므로 현재 관형사형은 \u0027걸맞은\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  155,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동생은 내 말에 어림없다는 듯 ( )를 뀌었다.\"",
        "options":  [
                        "콧방귀",
                        "코방귀"
                    ],
        "answer":  "콧방귀",
        "explanation":  "순우리말 합성어로 뒤 단어의 첫소리가 된소리로 나므로 사이시옷을 받쳐 \u0027콧방귀\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  156,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어르신께 자리를 양보하며 ( )을 공경하자.\"",
        "options":  [
                        "웃어른",
                        "윗어른"
                    ],
        "answer":  "웃어른",
        "explanation":  "\u0027아래\u0027와 \u0027위\u0027의 대립이 없는 단어에는 \u0027웃-\u0027을 붙여 \u0027웃어른\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  157,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"소음이 너무 심하니 ( )으로 올라가서 조용히 해달라고 하자.\"",
        "options":  [
                        "위층",
                        "윗층"
                    ],
        "answer":  "위층",
        "explanation":  "거센소리(\u0027ㅊ\u0027) 앞에서는 사이시옷을 받쳐 적지 않으므로 \u0027위층\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  158,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"매일 아침 안전한 ( )을 통해 학교로 걸어간다.\"",
        "options":  [
                        "등굣길",
                        "등교길"
                    ],
        "answer":  "등굣길",
        "explanation":  "한자어 \u0027등교\u0027와 순우리말 \u0027길\u0027이 결합하여 [등교낄]로 소리 나므로 사이시옷을 적어 \u0027등굣길\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  159,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어두운 밤길을 밝혀주는 작은 ( ) 하나.\"",
        "options":  [
                        "촛불",
                        "초불"
                    ],
        "answer":  "촛불",
        "explanation":  "\u0027초\u0027와 \u0027불\u0027이 합쳐져 [초뿔]로 소리 나므로 사이시옷을 붙여 \u0027촛불\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  160,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가을철 갓 수확한 벼로 찧은 맛있는 ( ).\"",
        "options":  [
                        "햅쌀",
                        "햇쌀"
                    ],
        "answer":  "햅쌀",
        "explanation":  "\u0027그해에 새로 난\u0027을 뜻하는 접두사 \u0027해-\u0027에 \u0027쌀\u0027이 붙을 때 \u0027ㅂ\u0027 소리가 덧나 \u0027햅쌀\u0027이 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  161,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비계가 적고 담백한 붉은 ( ).\"",
        "options":  [
                        "살코기",
                        "살고기"
                    ],
        "answer":  "살코기",
        "explanation":  "\u0027살\u0027과 \u0027고기\u0027가 어울릴 때 \u0027ㅎ\u0027 소리가 덧나 거센소리 [살코기]로 소리 나므로 \u0027살코기\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  162,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"집안 ( )을 깨끗하게 청소해서 기분이 상쾌하다.\"",
        "options":  [
                        "안팎",
                        "안밖"
                    ],
        "answer":  "안팎",
        "explanation":  "\u0027안\u0027과 \u0027밖\u0027이 결합하면서 거센소리가 덧나 \u0027안팎\u0027으로 굳어진 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  163,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"목장에서 풀을 뜯고 있는 뿔 달린 ( ).\"",
        "options":  [
                        "숫양",
                        "수양"
                    ],
        "answer":  "숫양",
        "explanation":  "수컷을 나타내는 접두사로 \u0027숫-\u0027을 쓰는 단어는 \u0027숫양\u0027, \u0027숫염소\u0027, \u0027숫쥐\u0027 3가지만 있습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  164,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"마당 한구석에서 꼬꼬댁 우는 씩씩한 ( ).\"",
        "options":  [
                        "수탉",
                        "수닭"
                    ],
        "answer":  "수탉",
        "explanation":  "수컷을 나타내는 \u0027수-\u0027 뒤에서 거센소리로 변하여 \u0027수탉\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  165,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"복잡한 실타래처럼 이리저리 ( ) 문제.\"",
        "options":  [
                        "얽히고설킨",
                        "얽히고얽힌"
                    ],
        "answer":  "얽히고설킨",
        "explanation":  "관계나 일이 복잡하게 얽힌 모양은 \u0027얽히고설키다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  166,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가방 안에 책과 준비물을 마구 ( ) 넣었다.\"",
        "options":  [
                        "욱여",
                        "우겨"
                    ],
        "answer":  "욱여",
        "explanation":  "주위에서 안쪽으로 밀어 넣는 행동은 \u0027욱여넣다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  167,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"슬픈 영화를 보고 ( )이 붉어지며 눈물을 흘렸다.\"",
        "options":  [
                        "눈시울",
                        "눈씨울"
                    ],
        "answer":  "눈시울",
        "explanation":  "눈썹이 난 가장자리를 뜻하는 표준어는 \u0027눈시울\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  168,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아침에 일어나 거울을 보니 눈가에 ( )이 끼어 있었다.\"",
        "options":  [
                        "눈곱",
                        "눈꼽"
                    ],
        "answer":  "눈곱",
        "explanation":  "발음은 [눈꼽]으로 나더라도 형태를 밝혀 \u0027눈곱\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  169,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"불쾌한 행동을 보면 누구나 ( )을 찌푸리게 된다.\"",
        "options":  [
                        "눈살",
                        "눈쌀"
                    ],
        "answer":  "눈살",
        "explanation":  "눈썹과 눈썹 사이의 살을 뜻하는 단어는 \u0027눈살\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  170,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"약속 시간을 ( ) 지키지 않고 늦는 친구.\"",
        "options":  [
                        "번번이",
                        "번번히"
                    ],
        "answer":  "번번이",
        "explanation":  "\u0027매번\u0027을 뜻하는 부사는 \u0027번번이\u0027가 맞습니다. \u0027번번히\u0027는 평평하다는 뜻입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  171,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"외출할 때 문을 꼭 ( ) 나갔는지 확인해라.\"",
        "options":  [
                        "잠그고",
                        "잠구고"
                    ],
        "answer":  "잠그고",
        "explanation":  "기본형이 \u0027잠그다\u0027이므로 어간 \u0027잠그-\u0027에 어미 \u0027-고\u0027가 붙어 \u0027잠그고\u0027가 됩니다. (\u0027잠구다\u0027는 틀림)",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  172,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"큰 시험을 무사히 잘 ( ) 홀가분하다.\"",
        "options":  [
                        "치렀으니",
                        "치뤘으니"
                    ],
        "answer":  "치렀으니",
        "explanation":  "기본형이 \u0027치르다\u0027이므로 과거형은 \u0027치렀다\u0027가 맞습니다. (\u0027치뤘다\u0027는 틀림)",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  173,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"김장철을 맞아 배추김치를 항아리에 ( ).\"",
        "options":  [
                        "담갔다",
                        "담궜다"
                    ],
        "answer":  "담갔다",
        "explanation":  "기본형이 \u0027담그다\u0027이므로 모음 어미 \u0027-아\u0027가 붙으면 \u0027담가/담갔다\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  174,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"집에 가는 길에 잠시 문구점에 ( ) 가자.\"",
        "options":  [
                        "들렀다",
                        "들렸다"
                    ],
        "answer":  "들렀다",
        "explanation":  "\u0027지나는 길에 잠깐 방문하다\u0027는 \u0027들르다\u0027이므로 어미 \u0027-어\u0027가 결합하면 \u0027들러/들렀다\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  175,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"물통에 물을 가득 ( ) 넘쳤다.\"",
        "options":  [
                        "부었더니",
                        "붰더니"
                    ],
        "answer":  "부었더니",
        "explanation":  "\u0027붓다\u0027는 \u0027ㅅ\u0027 불규칙 용언이므로 모음 어미가 오면 \u0027ㅅ\u0027이 탈락하여 \u0027부어/부었더니\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  176,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"냄비 속의 국물을 국자로 골고루 ( ).\"",
        "options":  [
                        "저었다",
                        "젔다"
                    ],
        "answer":  "저었다",
        "explanation":  "\u0027젓다\u0027도 \u0027ㅅ\u0027 불규칙 용언이므로 모음 어미와 결합할 때 \u0027저어/저었다\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  177,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"벽돌을 차곡차곡 쌓아 튼튼한 집을 ( ).\"",
        "options":  [
                        "지었다",
                        "짔다"
                    ],
        "answer":  "지었다",
        "explanation":  "\u0027짓다\u0027는 모음 어미가 올 때 \u0027ㅅ\u0027이 탈락하여 \u0027지어/지었다\u0027로 활용합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  178,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"감기가 다 ( ) 건강한 모습으로 등교했다.\"",
        "options":  [
                        "나아서",
                        "낫아서"
                    ],
        "answer":  "나아서",
        "explanation":  "\u0027병이 고쳐지다\u0027는 뜻의 \u0027낫다\u0027는 \u0027ㅅ\u0027 불규칙이므로 \u0027나아/나아서\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  179,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동생이 밥을 먹기 싫다고 ( )을 부렸다.\"",
        "options":  [
                        "투정",
                        "투증"
                    ],
        "answer":  "투정",
        "explanation":  "까탈을 부리며 떼를 쓰는 것은 \u0027투정\u0027이 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  180,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"밥을 먹을 때는 ( )과 젓가락을 바르게 쥐어야 해.\"",
        "options":  [
                        "숟가락",
                        "숫가락"
                    ],
        "answer":  "숟가락",
        "explanation":  "\u0027술\u0027에서 \u0027ㄹ\u0027이 \u0027ㄷ\u0027으로 바뀐 단어로 \u0027숟가락\u0027이 맞습니다. (젓가락은 \u0027ㅅ\u0027 받침)",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  181,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"고소하고 쫄깃한 ( ) 떡을 명절에 쪄 먹었다.\"",
        "options":  [
                        "시루떡",
                        "시룻떡"
                    ],
        "answer":  "시루떡",
        "explanation":  "사이시옷 규정에서 된소리나 거센소리 앞에는 사이시옷을 붙이지 않아 \u0027시루떡\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  182,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"겉으로 아무렇지 않은 척 ( ) 넘어가려 했다.\"",
        "options":  [
                        "어물쩍",
                        "어물쩡"
                    ],
        "answer":  "어물쩍",
        "explanation":  "말이나 행동을 슬그머니 대충 넘기는 모양은 \u0027어물쩍\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  183,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"속으로 나쁜 꾀를 품고 ( )하게 행동하는 늑대.\"",
        "options":  [
                        "엉큼",
                        "응큼"
                    ],
        "answer":  "엉큼",
        "explanation":  "속으로 엉뚱한 욕심이나 흉계를 품고 있는 모양은 \u0027엉큼하다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  184,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구가 잘난 척하며 거들먹거리고 ( )댔다.\"",
        "options":  [
                        "으스",
                        "으시"
                    ],
        "answer":  "으스",
        "explanation":  "우쭐하여 뽐내는 모양은 \u0027으스대다\u0027가 맞습니다. (\u0027으시대다\u0027는 비표준어)",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  185,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가을이 되어 나무 ( )가 울긋불긋 물들었다.\"",
        "options":  [
                        "이파리",
                        "잎파리"
                    ],
        "answer":  "이파리",
        "explanation":  "\u0027잎\u0027의 원래 형태를 밝혀 적지 않고 소리 나는 대로 \u0027이파리\u0027로 적는 것이 맞춤법 규정에 맞습니다. \u0027잎파리\u0027는 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  186,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"학생들의 출석을 ( ) 한 명씩 확인했다.\"",
        "options":  [
                        "일일이",
                        "일일히"
                    ],
        "answer":  "일일이",
        "explanation":  "\u0027하나하나 모두\u0027를 뜻하는 부사는 접미사 \u0027-이\u0027가 붙어 \u0027일일이\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  187,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"문을 꼭 닫고 쇠 ( )를 단단히 채웠다.\"",
        "options":  [
                        "자물쇠",
                        "자물새"
                    ],
        "answer":  "자물쇠",
        "explanation":  "여닫는 문이나 궤 따위를 잠그는 장치는 \u0027자물쇠\u0027가 맞습니다. \u0027자물새\u0027는 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  188,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가을바람에 낙엽이 ( ) 뒹굴고 있다.\"",
        "options":  [
                        "우수수",
                        "우수새"
                    ],
        "answer":  "우수수",
        "explanation":  "낙엽이나 열매 따위가 한꺼번에 떨어지는 소리나 모양은 \u0027우수수\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  189,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"달콤한 사탕이 입안에서 ( ) 녹아내렸다.\"",
        "options":  [
                        "사르르",
                        "사르륵"
                    ],
        "answer":  "사르르",
        "explanation":  "눈이나 얼음 등이 소리 없이 부드럽게 녹는 모양은 \u0027사르르\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  190,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 뜻밖의 비밀 고백에 깜짝 ( ).\"",
        "options":  [
                        "놀랐다",
                        "놀래었다"
                    ],
        "answer":  "놀랐다",
        "explanation":  "자신이 놀라는 것은 \u0027놀라다\u0027이므로 \u0027놀랐다\u0027가 맞습니다. 남을 놀라게 하는 것이 \u0027놀래다\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  191,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"갑자기 뒤에서 큰 소리로 친구를 ( ) 주었다.\"",
        "options":  [
                        "놀래켜",
                        "놀라게"
                    ],
        "answer":  "놀라게",
        "explanation":  "남을 놀라게 만들 때는 \u0027놀라게 하다\u0027 또는 \u0027놀래다\u0027가 바른 표현입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  192,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동생이 칭찬을 듣고 기분이 좋아 ( ) 웃었다.\"",
        "options":  [
                        "배시시",
                        "베시시"
                    ],
        "answer":  "배시시",
        "explanation":  "소리 없이 눈과 입을 살며시 움직여 웃는 모양은 \u0027배시시\u0027가 올바른 표준어입니다. \u0027베시시\u0027는 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  193,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"마음씨가 곱고 착한 ( ) 아가씨.\"",
        "options":  [
                        "어여쁜",
                        "어여뿐"
                    ],
        "answer":  "어여쁜",
        "explanation":  "기본형 \u0027어여쁘다\u0027의 어간에 관형사형 어미 \u0027-ㄴ\u0027이 결합하여 \u0027어여쁜\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  194,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"추운 겨울날 뜨끈뜨끈한 국물을 마시니 속이 ( ) 풀렸다.\"",
        "options":  [
                        "사르르",
                        "스르르"
                    ],
        "answer":  "사르르",
        "explanation":  "언 마음이나 굳은 감정이 자연스럽게 풀리는 모양은 \u0027사르르\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  195,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"수업 시작 종이 울리자마자 ( ) 교실로 뛰어들어왔다.\"",
        "options":  [
                        "허둥지둥",
                        "허둥대며"
                    ],
        "answer":  "허둥지둥",
        "explanation":  "갈팡질팡 당황하여 정신없이 서두르는 부사는 \u0027허둥지둥\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  196,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 따뜻한 격려 말씀에 가슴이 ( ).\"",
        "options":  [
                        "뭉클했다",
                        "뭉쿨했다"
                    ],
        "answer":  "뭉클했다",
        "explanation":  "감동이나 슬픔으로 가슴속이 벅차오르는 느낌은 \u0027뭉클하다\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  197,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"새 학년이 되어 새로운 짝꿍과 ( ) 인사를 나누었다.\"",
        "options":  [
                        "반갑게",
                        "반갑개"
                    ],
        "answer":  "반갑게",
        "explanation":  "부사형 어미는 \u0027-게\u0027이므로 \u0027반갑게\u0027로 적어야 합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  198,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"달리기 시합에서 젖 먹던 ( )까지 다해 결승선을 통과했다.\"",
        "options":  [
                        "힘",
                        "흼"
                    ],
        "answer":  "힘",
        "explanation":  "육체적·정신적 에너지를 뜻하는 단어는 \u0027힘\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  199,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"자신이 맡은 역할에 최선을 다하는 ( ) 학생이 되자.\"",
        "options":  [
                        "성실한",
                        "성실핸"
                    ],
        "answer":  "성실한",
        "explanation":  "\u0027성실하다\u0027에 관형사형 어미 \u0027-ㄴ\u0027이 붙어 \u0027성실한\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  200,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"도서관에서는 다른 친구들을 위해 ( ) 걸어야 해.\"",
        "options":  [
                        "살금살금",
                        "살굼살굼"
                    ],
        "answer":  "살금살금",
        "explanation":  "남이 알아채지 못하게 조용히 발걸음을 옮기는 모양은 \u0027살금살금\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  201,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"운동장에서 공을 차며 ( ) 뛰어놀았다.\"",
        "options":  [
                        "신나게",
                        "신낫게"
                    ],
        "answer":  "신나게",
        "explanation":  "기본형 \u0027신나다\u0027의 어간에 어미 \u0027-게\u0027가 붙어 \u0027신나게\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  202,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 농담에 배를 잡고 ( ) 웃음이 터졌다.\"",
        "options":  [
                        "와르르",
                        "와르륵"
                    ],
        "answer":  "와르르",
        "explanation":  "참았던 웃음이나 눈물이 한꺼번에 터져 나오는 모양은 \u0027와르르\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  203,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비가 그치고 먹구름이 걷히며 하늘이 ( ) 맑아졌다.\"",
        "options":  [
                        "환하게",
                        "환햬게"
                    ],
        "answer":  "환하게",
        "explanation":  "\u0027환하다\u0027에 부사형 어미 \u0027-게\u0027가 붙어 \u0027환하게\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  204,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"숲길을 걷다 귀여운 아기 다람쥐를 ( ) 마주쳤다.\"",
        "options":  [
                        "우연히",
                        "우연이"
                    ],
        "answer":  "우연히",
        "explanation":  "\u0027우연(偶然)\u0027이라는 한자어 부사 뒤에는 \u0027-히\u0027가 붙어 \u0027우연히\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  205,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"내일 아침 일찍 깨워 달라고 엄마에게 ( ) 부탁했다.\"",
        "options":  [
                        "간곡히",
                        "간곡이"
                    ],
        "answer":  "간곡히",
        "explanation":  "\u0027간곡하다\u0027처럼 \u0027-하다\u0027가 붙는 어근 뒤에는 \u0027-히\u0027가 붙어 \u0027간곡히\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  206,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"책상 서랍 정리를 ( ) 마치고 나니 뿌듯했다.\"",
        "options":  [
                        "깔끔히",
                        "깔끔이"
                    ],
        "answer":  "깔끔히",
        "explanation":  "\u0027깔끔하다\u0027의 어근에 부사화 접미사 \u0027-히\u0027가 결합하여 \u0027깔끔히\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  207,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아무리 힘든 일이라도 ( ) 포기하지 말자.\"",
        "options":  [
                        "결코",
                        "결토"
                    ],
        "answer":  "결코",
        "explanation":  "\u0027어떠한 경우에도\u0027라는 뜻을 나타내는 부정 부사는 \u0027결코\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  208,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"정리정돈을 잘해서 방안이 ( ) 정갈해 보인다.\"",
        "options":  [
                        "사뭇",
                        "사못"
                    ],
        "answer":  "사뭇",
        "explanation":  "\u0027아주 딴판으로\u0027 또는 \u0027마음에 차도록\u0027의 뜻을 가진 부사는 \u0027사뭇\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  209,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"겨울방학이 끝나고 오랜만에 친구들을 만나니 ( ) 반가웠다.\"",
        "options":  [
                        "더없이",
                        "더업시"
                    ],
        "answer":  "더없이",
        "explanation":  "\u0027더할 나위 없이\u0027의 뜻을 가진 합성 부사는 \u0027더없이\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  210,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어린 동생이 복잡한 미로의 길을 ( ) 찾아냈다.\"",
        "options":  [
                        "용케",
                        "용캐"
                    ],
        "answer":  "용케",
        "explanation":  "\u0027어려운 일을 훌륭하게 해내다\u0027라는 뜻의 \u0027용하다\u0027에서 온 부사이므로 어미 \u0027-게\u0027가 붙어 \u0027용케\u0027로 적어야 합니다. \u0027용캐\u0027는 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  211,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어둠 속에서 반짝이는 반딧불이를 ( ) 지켜보았다.\"",
        "options":  [
                        "가만히",
                        "가만이"
                    ],
        "answer":  "가만히",
        "explanation":  "\u0027가만하다\u0027의 어근 뒤에 \u0027-히\u0027가 붙어 \u0027가만히\u0027가 올바릅니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  212,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바쁜 와중에도 틈을 내어 ( ) 운동을 했다.\"",
        "options":  [
                        "짬짬이",
                        "짬짬히"
                    ],
        "answer":  "짬짬이",
        "explanation":  "\u0027짬(틈)\u0027이 반복된 첩어 부사 뒤에는 \u0027-이\u0027가 붙어 \u0027짬짬이\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  213,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"꽃밭에 알록달록 예쁜 꽃들이 ( ) 피어났다.\"",
        "options":  [
                        "송이송이",
                        "송이송히"
                    ],
        "answer":  "송이송이",
        "explanation":  "\u0027송이\u0027가 거듭된 명사 첩어 부사이므로 \u0027-이\u0027를 써서 \u0027송이송이\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  214,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가을 하늘 높이 날아가는 기러기 ( )를 보았다.\"",
        "options":  [
                        "떼",
                        "때"
                    ],
        "answer":  "떼",
        "explanation":  "무리 지어 있는 동물의 모임을 나타낼 때는 \u0027떼\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  215,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구와 어릴 적 함께 놀던 ( )를 추억했다.\"",
        "options":  [
                        "때",
                        "떼"
                    ],
        "answer":  "때",
        "explanation":  "어떤 일이나 현상이 일어나는 순간이나 시절을 뜻할 때는 \u0027때\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  216,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"수학 문제를 풀기 위해 머리를 ( ) 맞대었다.\"",
        "options":  [
                        "서로",
                        "서러"
                    ],
        "answer":  "서로",
        "explanation":  "짝을 이루어 함께 함을 뜻하는 부사는 \u0027서로\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  217,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 생일 선물로 정성스레 쓴 ( )를 건넸다.\"",
        "options":  [
                        "편지",
                        "편치"
                    ],
        "answer":  "편지",
        "explanation":  "안부나 소식을 전하는 글은 한자어 \u0027편지(便紙)\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  218,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"숲속 옹달샘에서 시원한 ( )물이 솟아난다.\"",
        "options":  [
                        "샘",
                        "쌤"
                    ],
        "answer":  "샘",
        "explanation":  "땅에서 솟아 나오는 맑은 물은 \u0027샘\u0027이 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  219,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어린이날을 맞아 부모님과 함께 ( )에 놀러 갔다.\"",
        "options":  [
                        "놀이공원",
                        "노리공원"
                    ],
        "answer":  "놀이공원",
        "explanation":  "\u0027놀다\u0027에 접미사 \u0027-이\u0027가 붙어 만들어진 명사이므로 \u0027놀이공원\u0027으로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  220,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"도서관에서 재미있는 ( )책을 대출해 읽었다.\"",
        "options":  [
                        "동화",
                        "동하"
                    ],
        "answer":  "동화",
        "explanation":  "어린이를 위하여 지은 이야기는 \u0027동화(童話)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  221,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"맑고 푸른 가을 하늘에 하얀 ( )이 둥실 떠 있다.\"",
        "options":  [
                        "구름",
                        "구룸"
                    ],
        "answer":  "구름",
        "explanation":  "공기 중의 수증기가 뭉쳐 뜬 것은 \u0027구름\u0027이 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  222,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"봄바람에 살랑살랑 흔들리는 노란 ( )꽃.\"",
        "options":  [
                        "개나리",
                        "개날이"
                    ],
        "answer":  "개나리",
        "explanation":  "봄을 알리는 노란 봄꽃의 올바른 이름은 \u0027개나리\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  223,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"추운 겨울철에는 따뜻한 ( )를 입어 감기를 예방하자.\"",
        "options":  [
                        "외투",
                        "웨투"
                    ],
        "answer":  "외투",
        "explanation":  "겉에 입는 두꺼운 옷은 \u0027외투(外套)\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  224,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 질문에 바르게 손을 들고 ( )했다.\"",
        "options":  [
                        "대답",
                        "대닾"
                    ],
        "answer":  "대답",
        "explanation":  "부름이나 물음에 응하는 말은 \u0027대답\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  225,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"여름철 바닷가 모래사장에서 예쁜 ( )를 주웠다.\"",
        "options":  [
                        "조개",
                        "조게"
                    ],
        "answer":  "조개",
        "explanation":  "껍데기가 두 짝으로 된 연체동물은 \u0027조개\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  226,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아침 햇살을 받아 영롱하게 빛나는 풀잎 위의 ( ).\"",
        "options":  [
                        "이슬",
                        "이슬이"
                    ],
        "answer":  "이슬",
        "explanation":  "공기 중의 수증기가 찬 물체에 맺힌 방울은 \u0027이슬\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  227,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"밤하늘을 올려다보니 은빛 ( )이 환하게 빛났다.\"",
        "options":  [
                        "초승달",
                        "초생달"
                    ],
        "answer":  "초승달",
        "explanation":  "음력 매달 초하룻날 무렵에 뜨는 눈썹 모양의 달은 \u0027초승달\u0027이 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  228,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구에게 빌린 지우개를 내일 꼭 ( ) 주기로 약속했다.\"",
        "options":  [
                        "돌려",
                        "돌여"
                    ],
        "answer":  "돌려",
        "explanation":  "\u0027돌리다\u0027의 활용형이므로 \u0027돌려\u0027가 올바른 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  229,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리의 소중한 전통문화를 아끼고 ( ) 보존하자.\"",
        "options":  [
                        "길이",
                        "기리"
                    ],
        "answer":  "길이",
        "explanation":  "\u0027영원히 오래도록\u0027을 뜻하는 부사는 \u0027길이\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  230,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"음식을 골고루 잘 먹어야 키가 ( ) 큰다.\"",
        "options":  [
                        "쑥쑥",
                        "숙숙"
                    ],
        "answer":  "쑥쑥",
        "explanation":  "거침없이 자라거나 나아가는 모양은 \u0027쑥쑥\u0027이 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  231,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 생일 파티를 위해 케이크에 ( )를 꽂았다.\"",
        "options":  [
                        "촛불",
                        "초불"
                    ],
        "answer":  "촛불",
        "explanation":  "순우리말 결합으로 [초뿔]로 소리 나므로 사이시옷을 받쳐 \u0027촛불\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  232,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아침 일찍 일어나 동네 한 바퀴를 ( ) 돌았다.\"",
        "options":  [
                        "빙글빙글",
                        "빙글빙골"
                    ],
        "answer":  "빙글빙글",
        "explanation":  "둥글게 자꾸 도는 모양을 나타내는 부사는 \u0027빙글빙글\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  233,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"엄마가 끓여주신 구수한 된장찌개 맛이 ( ) 최고다.\"",
        "options":  [
                        "정말",
                        "정말루"
                    ],
        "answer":  "정말",
        "explanation":  "\u0027거짓이 없이 참으로\u0027를 뜻하는 표준어는 \u0027정말\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  234,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"체육 시간에 힘차게 ( ) 넘기를 하며 체력을 길렀다.\"",
        "options":  [
                        "줄",
                        "쥴"
                    ],
        "answer":  "줄",
        "explanation":  "새끼나 노끈 등을 통틀어 이르는 말은 \u0027줄\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  235,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구들과 함께 힘을 합쳐 ( )를 만드니 뿌듯했다.\"",
        "options":  [
                        "작품",
                        "작풂"
                    ],
        "answer":  "작품",
        "explanation":  "예술적·창작적 활동의 결과물을 뜻하는 한자어는 \u0027작품(作品)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  236,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"맑은 시냇물 속에 작은 ( )들이 헤엄치고 있었다.\"",
        "options":  [
                        "송사리",
                        "송살이"
                    ],
        "answer":  "송사리",
        "explanation":  "시냇물에 사는 작은 민물고기의 이름은 \u0027송사리\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  237,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"여름 밤하늘에 반짝반짝 빛나는 ( )을 세어 보았다.\"",
        "options":  [
                        "별",
                        "뼐"
                    ],
        "answer":  "별",
        "explanation":  "밤하늘에 스스로 빛을 내는 천체는 \u0027별\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  238,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동물원에서 긴 코로 풀을 집어 먹는 ( )를 만났다.\"",
        "options":  [
                        "코끼리",
                        "코길이"
                    ],
        "answer":  "코끼리",
        "explanation":  "코가 긴 동물의 이름은 \u0027코끼리\u0027가 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  239,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비가 갠 뒤 숲속 나무 밑에 돋아난 작은 ( ).\"",
        "options":  [
                        "버섯",
                        "버섯이"
                    ],
        "answer":  "버섯",
        "explanation":  "균류에 속하는 식물성 생물의 이름은 \u0027버섯\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  240,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"새콤달콤 맛있는 빨간 ( )를 한 입 베어 물었다.\"",
        "options":  [
                        "딸기",
                        "딸긔"
                    ],
        "answer":  "딸기",
        "explanation":  "봄철의 대표적인 붉은 과일은 \u0027딸기\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  241,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 착하고 따뜻한 ( )씨에 모두가 감동했다.\"",
        "options":  [
                        "마음",
                        "마암"
                    ],
        "answer":  "마음",
        "explanation":  "사람의 생각, 감정, 기억이 생기는 곳은 \u0027마음\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  242,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"수업 시간에 집중해서 선생님의 설명을 ( ) 들었다.\"",
        "options":  [
                        "귀담아",
                        "귀담어"
                    ],
        "answer":  "귀담아",
        "explanation":  "\u0027귀담다\u0027의 어간 \u0027귀담-\u0027에 모음 어미 \u0027-아\u0027가 결합하여 \u0027귀담아\u0027가 됩니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  243,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리 반 친구들과 ( ) 사이좋게 지내자.\"",
        "options":  [
                        "두루두루",
                        "두루두리"
                    ],
        "answer":  "두루두루",
        "explanation":  "\u0027모두 골고루\u0027를 뜻하는 부사는 \u0027두루두루\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  244,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시원한 가을바람에 노란 은행잎이 ( ) 떨어졌다.\"",
        "options":  [
                        "우수수",
                        "우수새"
                    ],
        "answer":  "우수수",
        "explanation":  "잎이나 꽃 등이 한꺼번에 떨어지는 모양은 \u0027우수수\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  245,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"힘든 일이 있어도 긍정적인 ( )을 가지면 극복할 수 있어.\"",
        "options":  [
                        "자신감",
                        "자신깜"
                    ],
        "answer":  "자신감",
        "explanation":  "스스로를 믿는 굳센 느낌은 \u0027자신감(自信感)\u0027입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  246,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"약속 시간에 늦지 않으려고 걸음을 ( ) 옮겼다.\"",
        "options":  [
                        "바삐",
                        "바삐히"
                    ],
        "answer":  "바삐",
        "explanation":  "\u0027바쁘다\u0027의 부사형은 \u0027바삐\u0027가 올바른 표준어입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  247,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"산 정상에 올라가서 야호를 ( ) 외쳤다.\"",
        "options":  [
                        "크게",
                        "킈게"
                    ],
        "answer":  "크게",
        "explanation":  "\u0027크다\u0027의 어간 \u0027크-\u0027에 부사형 어미 \u0027-게\u0027가 붙어 \u0027크게\u0027로 적습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  248,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구의 기쁜 소식을 듣고 내 일처럼 ( ) 기뻐했다.\"",
        "options":  [
                        "진심으로",
                        "진심으루"
                    ],
        "answer":  "진심으로",
        "explanation":  "조사는 \u0027-으로\u0027이므로 \u0027진심으로\u0027가 맞습니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  249,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"모르는 문제가 나오면 포기하지 말고 ( ) 끝까지 생각해보자.\"",
        "options":  [
                        "끈기 있게",
                        "끈기 있개"
                    ],
        "answer":  "끈기 있게",
        "explanation":  "어미는 \u0027-게\u0027이므로 \u0027끈기 있게\u0027로 적어야 합니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "id":  250,
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리 가족 모두 건강하길 바라는 간절한 ( )이 이루어졌다.\"",
        "options":  [
                        "바람",
                        "바램"
                    ],
        "answer":  "바람",
        "explanation":  "\u0027바라다\u0027에서 온 명사는 \u0027바람\u0027이 올바른 표준어입니다. \u0027바램\u0027은 색이 변하는 \u0027바래다\u0027의 명사형이므로 잘못된 표기입니다.",
        "source":  "바른 국어 맞춤법"
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께서 내주신 퀴즈의 정답을 ( ) 기분이 최고였다.\"",
        "options":  [
                        "맞혀서",
                        "맞춰서"
                    ],
        "answer":  "맞혀서",
        "explanation":  "\u0027문제의 답을 옳게 대다\u0027는 \u0027맞히다\u0027가 맞습니다. \u0027맞추다\u0027는 둘 이상의 대상을 비교하거나 짝을 맞출 때 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  251
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구와 시계를 똑같은 시간으로 ( ) 약속 장소로 향했다.\"",
        "options":  [
                        "맞추고",
                        "맞히고"
                    ],
        "answer":  "맞추고",
        "explanation":  "시간, 규격, 짝 따위를 어긋남 없이 같게 할 때는 \u0027맞추다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  252
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"형이 나에게 자전거 타는 법을 친절하게 ( ) 주었다.\"",
        "options":  [
                        "가르쳐",
                        "가리켜"
                    ],
        "answer":  "가르쳐",
        "explanation":  "\u0027지식이나 기술을 배우게 하다\u0027는 \u0027가르치다\u0027가 맞습니다. \u0027가리키다\u0027는 손가락이나 방향을 향할 때 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  253
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시계의 짧은 바늘이 숫자 12를 ( ) 있었다.\"",
        "options":  [
                        "가리키고",
                        "가르치고"
                    ],
        "answer":  "가리키고",
        "explanation":  "방향이나 대상을 손가락이나 바늘 따위로 향하여 지목할 때는 \u0027가리키다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  254
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"길을 걷다가 마주 오던 친구와 어깨를 세게 ( ).\"",
        "options":  [
                        "부딪쳤다",
                        "부딪혔다"
                    ],
        "answer":  "부딪쳤다",
        "explanation":  "서로 능동적으로 힘차게 마주 닿거나 치는 행동을 강조할 때는 강세 접사 \u0027-치-\u0027가 들어간 \u0027부딪치다\u0027를 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  255
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"골목길에서 갑자기 튀어나온 자전거에 ( ) 넘어졌다.\"",
        "options":  [
                        "부딪혀",
                        "부딪쳐"
                    ],
        "answer":  "부딪혀",
        "explanation":  "움직이는 대상에 충돌을 당하는 피동의 의미일 때는 피동 접사 \u0027-히-\u0027가 들어간 \u0027부딪히다\u0027를 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  256
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"맛있는 삶은 달걀의 딱딱한 ( )을/를 조심스럽게 벗겼다.\"",
        "options":  [
                        "껍데기",
                        "껍질"
                    ],
        "answer":  "껍데기",
        "explanation":  "달걀, 조개, 소라처럼 겉을 싸고 있는 단단한 물질은 \u0027껍데기\u0027가 표준어입니다. 부드러운 것은 \u0027껍질\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  257
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"할머니께서 달콤한 사과의 얇은 ( )을/를 깎아 주셨다.\"",
        "options":  [
                        "껍질",
                        "껍데기"
                    ],
        "answer":  "껍질",
        "explanation":  "사과, 귤, 바나나처럼 부드럽고 얇은 겉면은 \u0027껍질\u0027이 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  258
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"불길이 ( ) 수 없이 커져서 소방차가 빠르게 출동했다.\"",
        "options":  [
                        "걷잡을",
                        "겉잡을"
                    ],
        "answer":  "걷잡을",
        "explanation":  "\u0027흐름이나 상황을 거두어 붙잡다\u0027라는 뜻은 \u0027걷잡다\u0027가 맞습니다. \u0027겉잡다\u0027는 겉으로 대강 헤아릴 때 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  259
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"( ) 일주일 정도 걸릴 것 같은 작업이다.\"",
        "options":  [
                        "겉잡아서",
                        "걷잡아서"
                    ],
        "answer":  "겉잡아서",
        "explanation":  "\u0027대강 겉으로 보고 짐작하여 헤아리다\u0027라는 뜻은 \u0027겉잡다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  260
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"귀신 이야기 책을 읽었더니 등골이 ( ) 떨렸다.\"",
        "options":  [
                        "으스스",
                        "으시시"
                    ],
        "answer":  "으스스",
        "explanation":  "춥거나 무서워서 살갗이 움츠러드는 모양은 \u0027으스스\u0027가 표준어입니다. \u0027으시시\u0027는 비표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  261
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"중국집에 가서 자장면 ( )를 시켜 배부르게 먹었다.\"",
        "options":  [
                        "곱빼기",
                        "곱배기"
                    ],
        "answer":  "곱빼기",
        "explanation":  "음식의 양이 두 배임을 나타내는 말은 된소리 접미사 \u0027-빼기\u0027를 살려 \u0027곱빼기\u0027로 적습니다.",
        "source":  "한글 맞춤법 제5항",
        "id":  262
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"할머니께서 보글보글 찌개를 ( )에 끓여 주셨다.\"",
        "options":  [
                        "뚝배기",
                        "뚝빼기"
                    ],
        "answer":  "뚝배기",
        "explanation":  "\u0027뚝배기\u0027는 형태소 분석이 되지 않는 고유어로, 표준어 규정에 따라 \u0027뚝배기\u0027로 적습니다.",
        "source":  "한글 맞춤법 제54항",
        "id":  263
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"담장을 고치기 위해 단단한 나무 ( )를 준비했다.\"",
        "options":  [
                        "널빤지",
                        "널판지"
                    ],
        "answer":  "널빤지",
        "explanation":  "\u0027널빤지\u0027가 표준어입니다. \u0027널판지\u0027는 비표준어입니다.",
        "source":  "표준어 규정 제22항",
        "id":  264
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"당일치기 여행이라 짐을 아주 ( ) 챙겼다.\"",
        "options":  [
                        "단출하게",
                        "단촐하게"
                    ],
        "answer":  "단출하게",
        "explanation":  "\u0027단순하고 간단하다\u0027는 뜻의 표준어는 \u0027단출하다\u0027입니다. \u0027단촐하다\u0027는 비표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  265
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리 학교 전교생을 ( ) 가장 줄넘기를 잘한다.\"",
        "options":  [
                        "통틀어",
                        "통털어"
                    ],
        "answer":  "통틀어",
        "explanation":  "\u0027모두 합하여\u0027라는 뜻의 표준어는 \u0027통틀어\u0027입니다. \u0027통털어\u0027는 틀린 표기입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  266
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"공부를 마치고 나니 방바닥에 책들이 어지럽게 ( ) 있었다.\"",
        "options":  [
                        "널브러져",
                        "널부러져"
                    ],
        "answer":  "널브러져",
        "explanation":  "\u0027너저분하게 흩어져 있다\u0027는 뜻의 표준어는 \u0027널브러지다\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  267
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"안개가 걷히며 동네의 풍경이 ( ) 보이기 시작했다.\"",
        "options":  [
                        "어슴푸레",
                        "어슴프레"
                    ],
        "answer":  "어슴푸레",
        "explanation":  "\u0027빛이 흐릿하거나 어렴풋한 모양\u0027은 \u0027어슴푸레\u0027가 표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  268
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바닷가에서 고운 모래를 한 ( ) 쥐어 보았다.\"",
        "options":  [
                        "움큼",
                        "웅큼"
                    ],
        "answer":  "움큼",
        "explanation":  "\u0027한 손으로 쥘 만한 분량\u0027을 이르는 말은 \u0027움큼\u0027이 표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  269
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 부르심을 받고 아이는 ( ) 어쩔 줄 몰라 했다.\"",
        "options":  [
                        "안절부절못하며",
                        "안절부절하며"
                    ],
        "answer":  "안절부절못하며",
        "explanation":  "\u0027마음을 놓지 못하고 초조해하다\u0027는 합성어 \u0027안절부절못하다\u0027만 표준어로 인정됩니다. \u0027안절부절하다\u0027는 틀린 말입니다.",
        "source":  "표준어 규정 제25항",
        "id":  270
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"전국에서 ( ) 바둑 고수들이 모였다.\"",
        "options":  [
                        "내로라하는",
                        "내노라하는"
                    ],
        "answer":  "내로라하는",
        "explanation":  "\u0027나이로다\u0027라는 옛말에서 유래하여 \u0027내로라하다\u0027가 표준어입니다. \u0027내노라하다\u0027는 잘못입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  271
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구를 약 올릴 때 ( ) 하고 놀리면 안 됩니다.\"",
        "options":  [
                        "알나리깔나리",
                        "얼레리꼴레리"
                    ],
        "answer":  "알나리깔나리",
        "explanation":  "국립국어원 표준어 규정상 \u0027알나리깔나리\u0027가 표준어입니다. 흔히 쓰는 \u0027얼레리꼴레리\u0027는 비표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  272
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"야, ( )! 얼른 이리로 와서 이것 좀 봐봐!\"",
        "options":  [
                        "인마",
                        "임마"
                    ],
        "answer":  "인마",
        "explanation":  "\u0027이놈아\u0027가 줄어든 말로 표준어는 \u0027인마\u0027입니다. \u0027임마\u0027는 사투리 및 비표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  273
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"라면 국물 속에 쫄깃한 고기 ( )가 들어 있다.\"",
        "options":  [
                        "건더기",
                        "건데기"
                    ],
        "answer":  "건더기",
        "explanation":  "국이나 찌개 따위에서 국물을 뺀 음식물은 \u0027건더기\u0027가 표준어입니다.",
        "source":  "표준어 규정 제8항",
        "id":  274
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께서는 동생을 ( ) 대신 다정하게 타일러 주셨다.\"",
        "options":  [
                        "나무라는",
                        "나무래는"
                    ],
        "answer":  "나무라는",
        "explanation":  "\u0027잘못을 꾸짖다\u0027는 기본형이 \u0027나무라다\u0027이므로 \u0027나무라는\u0027이 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  275
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시험공부를 하지 않고 ( ) 컴퓨터 게임만 했다.\"",
        "options":  [
                        "주야장천",
                        "주구장창"
                    ],
        "answer":  "주야장천",
        "explanation":  "\u0027밤낮으로 쉬지 않고 잇따라\u0027를 뜻하는 사자성어는 \u0027주야장천(晝夜長川)\u0027입니다. \u0027주구장창\u0027은 틀린 표현입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  276
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"결과도 나오기 전에 미리 ( )을 떨지 마라.\"",
        "options":  [
                        "설레발",
                        "설레발이"
                    ],
        "answer":  "설레발",
        "explanation":  "\u0027몹시 서두르거나 호들갑을 떠는 짓\u0027은 \u0027설레발\u0027이 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  277
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"물건을 자주 잃어버리는 친구에게 \u0027왜 이렇게 ( )?\u0027 하고 타일렀다.\"",
        "options":  [
                        "칠칠치 못하니",
                        "칠칠맞니"
                    ],
        "answer":  "칠칠치 못하니",
        "explanation":  "\u0027칠칠하다\u0027는 깨끗하고 야무지다는 뜻의 좋은 말이므로, 부주의한 것은 \u0027칠칠치(칠칠하지) 못하다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  278
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어머니는 아침부터 가족들의 온갖 ( )를 도맡아 하셨다.\"",
        "options":  [
                        "뒤치다꺼리",
                        "뒤치닥거리"
                    ],
        "answer":  "뒤치다꺼리",
        "explanation":  "\u0027뒤에서 돌보아 주는 일\u0027은 된소리를 살려 \u0027뒤치다꺼리\u0027로 적습니다.",
        "source":  "한글 맞춤법 제5항",
        "id":  279
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"우리 학교 운동장은 아주 ( ) 축구하기에 좋다.\"",
        "options":  [
                        "널따랗고",
                        "넓다랗고"
                    ],
        "answer":  "널따랗고",
        "explanation":  "\u0027넓-\u0027의 원래 받침 소리가 유지되지 않고 된소리가 날 때는 \u0027널따랗다\u0027로 적습니다.",
        "source":  "한글 맞춤법 제21항",
        "id":  280
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"연필을 오래 썼더니 몽당연필처럼 ( )졌다.\"",
        "options":  [
                        "짤따래",
                        "짧다래"
                    ],
        "answer":  "짤따래",
        "explanation":  "\u0027짧-\u0027의 겹받침 소리가 변하여 된소리가 나므로 \u0027짤따랗다\u0027로 적습니다.",
        "source":  "한글 맞춤법 제21항",
        "id":  281
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"거실이 아주 ( ) 온 가족이 모여 앉았다.\"",
        "options":  [
                        "널찍해서",
                        "넓직해서"
                    ],
        "answer":  "널찍해서",
        "explanation":  "\u0027넓다\u0027에서 파생되었으나 된소리로 발음되므로 \u0027널찍하다\u0027로 표기합니다.",
        "source":  "한글 맞춤법 제21항",
        "id":  282
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"통나무가 매우 ( ) 의자로 쓰기에 딱 알맞다.\"",
        "options":  [
                        "굵다랗다",
                        "굵따랗다"
                    ],
        "answer":  "굵다랗다",
        "explanation":  "\u0027굵-\u0027의 어간 받침 소리 \u0027ㄺ\u0027이 그대로 나므로 \u0027굵다랗다\u0027로 적습니다.",
        "source":  "한글 맞춤법 제21항",
        "id":  283
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"종이가 너무 ( ) 글씨가 뒷면까지 다 비친다.\"",
        "options":  [
                        "얄따래서",
                        "얇다래서"
                    ],
        "answer":  "얄따래서",
        "explanation":  "\u0027얇-\u0027의 겹받침 소리가 변하여 된소리가 나므로 \u0027얄따랗다\u0027로 적습니다.",
        "source":  "한글 맞춤법 제21항",
        "id":  284
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바닷가에서 납작하고 ( ) 조약돌을 주웠다.\"",
        "options":  [
                        "넓적한",
                        "넙적한"
                    ],
        "answer":  "넓적한",
        "explanation":  "\u0027넓적하다\u0027는 어간의 본모양 \u0027넓-\u0027을 밝혀 적는 것이 원칙입니다.",
        "source":  "한글 맞춤법 제21항",
        "id":  285
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"글씨를 너무 ( ) 써서 무슨 글자인지 알아보기 힘들다.\"",
        "options":  [
                        "개발새발",
                        "괴발새발"
                    ],
        "answer":  "개발새발",
        "explanation":  "\u0027개발새발\u0027과 \u0027괴발개발\u0027은 둘 다 표준어로 인정됩니다. \u0027괴발새발\u0027은 비표준어입니다.",
        "source":  "표준어 규정 (복수 표준어)",
        "id":  286
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"하늘이 어두워지더니 번개와 함께 요란한 ( ) 소리가 울렸다.\"",
        "options":  [
                        "우레",
                        "우뢰"
                    ],
        "answer":  "우레",
        "explanation":  "\u0027우레\u0027는 고유어로 \u0027우레\u0027가 표준어입니다. 한자어 \u0027비 우(雨)\u0027와 결합한 \u0027우뢰\u0027는 잘못된 표기입니다.",
        "source":  "표준어 규정 제12항",
        "id":  287
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가자미를 좁쌀과 고춧가루에 버무려 삭힌 전통 음식은 ( )이다.\"",
        "options":  [
                        "식해",
                        "식혜"
                    ],
        "answer":  "식해",
        "explanation":  "생선을 곡식과 함께 삭힌 반찬은 \u0027식해(食醯)\u0027이고, 밥알이 뜬 달콤한 음료는 \u0027식혜(食醯)\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  288
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"문구점에서 학용품을 사고 카드로 ( )를 마쳤다.\"",
        "options":  [
                        "결제",
                        "결재"
                    ],
        "answer":  "결제",
        "explanation":  "\u0027대금을 주고받아 거래를 끝맺다\u0027는 \u0027결제(濟)\u0027이고, 상사나 선생님께 안건을 승인받는 것은 \u0027결재(裁)\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  289
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께 현장 체험 학습 계획서에 ( )를 받았다.\"",
        "options":  [
                        "결재",
                        "결제"
                    ],
        "answer":  "결재",
        "explanation":  "부하 직원이 제출한 서류를 상관이 검토하여 승인하는 것은 \u0027결재(裁)\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  290
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"자신의 숨겨진 잠재력과 소질을 ( )하는 것이 중요하다.\"",
        "options":  [
                        "계발",
                        "개발"
                    ],
        "answer":  "계발",
        "explanation":  "지능이나 재능, 사상 따위를 일깨워 발전시키는 것은 \u0027계발(啓發)\u0027이 알맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  291
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"과학자들이 지구를 지키기 위한 새로운 친환경 에너지를 ( )했다.\"",
        "options":  [
                        "개발",
                        "계발"
                    ],
        "answer":  "개발",
        "explanation":  "새로운 기술, 물건, 자원 등을 만들어 내거나 연구하는 것은 \u0027개발(開發)\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  292
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"임신한 이모에게 \u0027지금은 ( )이 아니니 무거운 것 들지 마세요\u0027라고 했다.\"",
        "options":  [
                        "홑몸",
                        "홀몸"
                    ],
        "answer":  "홑몸",
        "explanation":  "\u0027아이를 배지 아니한 몸\u0027은 \u0027홑몸\u0027이 맞습니다. \u0027홀몸\u0027은 딸린 가족이나 배우자가 없는 사람을 뜻합니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  293
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"장난을 심하게 치다가 결국 큰 ( )이 나고 말았다.\"",
        "options":  [
                        "사달",
                        "사단"
                    ],
        "answer":  "사달",
        "explanation":  "\u0027사고나 탈\u0027을 뜻하는 순우리말은 \u0027사달\u0027입니다. \u0027사단(事端)\u0027은 사건의 단서라는 한자어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  294
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아빠의 멋진 턱과 귀밑에 검은 ( )이 자라 있었다.\"",
        "options":  [
                        "구레나룻",
                        "구렛나루"
                    ],
        "answer":  "구레나룻",
        "explanation":  "\u0027귀밑에서 턱까지 잇따라 난 수염\u0027은 \u0027구레나룻\u0027이 표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  295
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"강을 건너기 위해 나룻배가 정박해 있는 ( )로 갔다.\"",
        "options":  [
                        "나루터",
                        "나룻터"
                    ],
        "answer":  "나루터",
        "explanation":  "뒷말 \u0027터\u0027의 첫소리가 거센소리([ㅌ])이므로 사이시옷을 받치지 않고 \u0027나루터\u0027로 적습니다.",
        "source":  "한글 맞춤법 제30항",
        "id":  296
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"계단을 올라가 3학년 교실이 있는 ( )으로 갔다.\"",
        "options":  [
                        "위층",
                        "윗층"
                    ],
        "answer":  "위층",
        "explanation":  "뒷말 \u0027층\u0027의 첫소리가 거센소리([ㅊ])이므로 사이시옷 없이 \u0027위층\u0027으로 적습니다.",
        "source":  "표준어 규정 제12항",
        "id":  297
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"체육관 건물 ( )에 작은 텃밭이 꾸며져 있다.\"",
        "options":  [
                        "뒤편",
                        "뒷편"
                    ],
        "answer":  "뒤편",
        "explanation":  "뒷말 \u0027편\u0027의 첫소리가 거센소리([ㅍ])이므로 사이시옷 없이 \u0027뒤편\u0027으로 적습니다.",
        "source":  "한글 맞춤법 제30항",
        "id":  298
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"책상 서랍의 ( )을 열어 공책을 꺼냈다.\"",
        "options":  [
                        "아래쪽",
                        "아랫쪽"
                    ],
        "answer":  "아래쪽",
        "explanation":  "뒷말 \u0027쪽\u0027의 첫소리가 된소리([ㅉ])이므로 사이시옷 없이 \u0027아래쪽\u0027으로 적습니다.",
        "source":  "한글 맞춤법 제30항",
        "id":  299
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"교실 ( )에 있는 게시판에 그림을 붙였다.\"",
        "options":  [
                        "뒤쪽",
                        "뒷쪽"
                    ],
        "answer":  "뒤쪽",
        "explanation":  "뒷말 \u0027쪽\u0027이 된소리이므로 사이시옷 없이 \u0027뒤쪽\u0027으로 적습니다.",
        "source":  "한글 맞춤법 제30항",
        "id":  300
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"편안한 잠을 자기 위해 푹신한 ( )를 베었다.\"",
        "options":  [
                        "베개",
                        "베게"
                    ],
        "answer":  "베개",
        "explanation":  "\u0027베다\u0027의 어간 \u0027베-\u0027에 도구를 나타내는 접미사 \u0027-개\u0027가 붙어 \u0027베개\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제19항",
        "id":  301
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"틀린 글자를 연필 ( )로 깨끗하게 지웠다.\"",
        "options":  [
                        "지우개",
                        "지우게"
                    ],
        "answer":  "지우개",
        "explanation":  "\u0027지우다\u0027에 접미사 \u0027-개\u0027가 붙어 명사가 되었으므로 \u0027지우개\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제19항",
        "id":  302
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘 저녁 메뉴는 두부가 듬뿍 들어간 된장 ( )이다.\"",
        "options":  [
                        "찌개",
                        "찌게"
                    ],
        "answer":  "찌개",
        "explanation":  "\u0027찌다\u0027에 접미사 \u0027-개\u0027가 붙은 말이므로 \u0027찌개\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제19항",
        "id":  303
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"소망이 꼭 이루어지기를 간절히 ( ).\"",
        "options":  [
                        "바라건대",
                        "바라건데"
                    ],
        "answer":  "바라건대",
        "explanation":  "어미 \u0027-건대\u0027가 붙은 형태로 \u0027바라건대\u0027가 맞습니다. \u0027-건데\u0027는 잘못된 표기입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  304
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"내 개인적인 ( ) 이번 계획이 아주 훌륭하다.\"",
        "options":  [
                        "생각건대",
                        "생각컨대"
                    ],
        "answer":  "생각건대",
        "explanation":  "\u0027생각하건대\u0027에서 앞 음절 \u0027각\u0027의 받침 \u0027ㄱ\u0027 뒤에서는 \u0027하\u0027가 통째로 탈락하여 \u0027생각건대\u0027가 됩니다.",
        "source":  "한글 맞춤법 제40항",
        "id":  305
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"얼음판 위에서 미끄러져 ( ) 넘어질 뻔했다.\"",
        "options":  [
                        "하마터면",
                        "하마트면"
                    ],
        "answer":  "하마터면",
        "explanation":  "\u0027조금만 잘못되었으면\u0027을 뜻하는 부사는 \u0027하마터면\u0027이 표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  306
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"미술 시간에 친구들과 함께 예쁜 꽃병을 ( ).\"",
        "options":  [
                        "만듦",
                        "만듬"
                    ],
        "answer":  "만듦",
        "explanation":  "\u0027만들다\u0027의 어간 \u0027만들-\u0027에 명사형 어미 \u0027-ㅁ\u0027이 붙으면 \u0027만듦\u0027이 됩니다.",
        "source":  "한글 맞춤법 제19항",
        "id":  307
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"새로운 사실을 알아가는 ( )의 즐거움은 참 크다.\"",
        "options":  [
                        "앎",
                        "암"
                    ],
        "answer":  "앎",
        "explanation":  "\u0027알다\u0027의 어간 \u0027알-\u0027에 명사형 어미 \u0027-ㅁ\u0027이 결합하여 \u0027앎\u0027으로 적습니다.",
        "source":  "한글 맞춤법 제19항",
        "id":  308
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 따뜻한 ( ) 덕분에 바르게 성장할 수 있었다.\"",
        "options":  [
                        "이끎",
                        "이끔"
                    ],
        "answer":  "이끎",
        "explanation":  "\u0027이끌다\u0027의 어간 \u0027이끌-\u0027에 명사형 어미 \u0027-ㅁ\u0027이 결합하여 \u0027이끎\u0027으로 적습니다.",
        "source":  "한글 맞춤법 제19항",
        "id":  309
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"점심을 배부르게 먹고 5교시가 되니 ( )이 쏟아졌다.\"",
        "options":  [
                        "졸음",
                        "졸림"
                    ],
        "answer":  "졸음",
        "explanation":  "\u0027졸다\u0027의 어간 \u0027졸-\u0027에 접미사 \u0027-음\u0027이 결합한 명사는 \u0027졸음\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  310
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"이것으로 간단히 개회식 인사를 ( )고자 합니다.\"",
        "options":  [
                        "갈음하",
                        "가름하"
                    ],
        "answer":  "갈음하",
        "explanation":  "\u0027다른 것으로 바꾸어 대신하다\u0027는 \u0027갈음하다\u0027가 맞습니다. \u0027가름하다\u0027는 승패나 갈래를 나눌 때 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  311
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"이번 결승전 한 판이 우승팀을 ( )는 중요한 경기다.\"",
        "options":  [
                        "가름하",
                        "갈음하"
                    ],
        "answer":  "가름하",
        "explanation":  "\u0027승패나 우열을 쪼개어 나누다\u0027는 \u0027가름하다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  312
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"체로 면의 물기를 깨끗하게 ( ) 그릇에 담았다.\"",
        "options":  [
                        "밭쳐서",
                        "받쳐서"
                    ],
        "answer":  "밭쳐서",
        "explanation":  "\u0027구멍이 뚫린 기구로 물기를 거르다\u0027는 \u0027밭치다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  313
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"비가 쏟아지자 얼른 가방 속에서 우산을 ( ) 들었다.\"",
        "options":  [
                        "받쳐",
                        "밭쳐"
                    ],
        "answer":  "받쳐",
        "explanation":  "\u0027밑에서 괴거나 위로 떠받치다\u0027는 \u0027받치다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  314
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"신체의 유연성을 기르기 위해 다리 스트레칭으로 길이를 ( ).\"",
        "options":  [
                        "늘였다",
                        "늘렸다"
                    ],
        "answer":  "늘였다",
        "explanation":  "\u0027본래보다 길이를 길게 하다\u0027는 \u0027늘이다\u0027가 맞습니다. 수량이나 부피를 크게 할 때는 \u0027늘리다\u0027를 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  315
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"독서 시간을 하루 30분에서 1시간으로 ( ).\"",
        "options":  [
                        "늘렸다",
                        "늘였다"
                    ],
        "answer":  "늘렸다",
        "explanation":  "\u0027수량, 무게, 시간 따위를 많아지게 하다\u0027는 \u0027늘리다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  316
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"군대에 계신 삼촌께 응원의 마음을 담아 편지를 ( ).\"",
        "options":  [
                        "부쳤다",
                        "붙였다"
                    ],
        "answer":  "부쳤다",
        "explanation":  "\u0027편지나 짐 따위를 보내다\u0027는 \u0027부치다\u0027가 맞습니다. 맞닿아 떨어지지 않게 할 때는 \u0027붙이다\u0027를 씁니다.",
        "source":  "한글 맞춤법 제57항",
        "id":  317
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구에게 보낼 편지 봉투 오른쪽 위에 우표를 ( ).\"",
        "options":  [
                        "붙였다",
                        "부쳤다"
                    ],
        "answer":  "붙였다",
        "explanation":  "\u0027물건을 풀이나 접착제로 달라붙게 하다\u0027는 \u0027붙이다\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제57항",
        "id":  318
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"거짓말을 하고 부모님의 마음과 속을 ( ) 무척 후회했다.\"",
        "options":  [
                        "썩여서",
                        "썩혀서"
                    ],
        "answer":  "썩여서",
        "explanation":  "\u0027걱정이나 근심으로 마음을 몹시 괴롭히다\u0027는 \u0027속을 썩이다\u0027가 맞습니다. \u0027썩히다\u0027는 유기물을 부패하게 할 때 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  319
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"밭에서 거둔 거름을 겨우내 땅속에서 푹 ( ) 봄에 뿌렸다.\"",
        "options":  [
                        "썩혀서",
                        "썩여서"
                    ],
        "answer":  "썩혀서",
        "explanation":  "\u0027물질을 부패하게 하거나, 재능을 활용하지 않고 묻어두다\u0027는 \u0027썩히다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  320
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"뱁새가 ( ) 따라가다 다리가 찢어진다는 속담이 있다.\"",
        "options":  [
                        "황새",
                        "황세"
                    ],
        "answer":  "황새",
        "explanation":  "날개와 다리가 긴 새의 표준 표기는 \u0027황새\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  321
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"( )도 낯짝이 있다는 말처럼 염치가 있어야 한다.\"",
        "options":  [
                        "벼룩",
                        "벼륵"
                    ],
        "answer":  "벼룩",
        "explanation":  "\u0027벼룩\u0027이 표준어이며, \u0027벼륵\u0027은 방언입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  322
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"공놀이를 하다가 ( ) 창문을 깨뜨리고 말았다.\"",
        "options":  [
                        "실수로",
                        "실수로써"
                    ],
        "answer":  "실수로",
        "explanation":  "수단이나 도구의 격조사 \u0027-로\u0027가 자연스러우며, \u0027실수로\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  323
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"시험지를 받아 들고 어떻게 풀어야 할지 몰라 ( ).\"",
        "options":  [
                        "어떡하지",
                        "어떻하지"
                    ],
        "answer":  "어떡하지",
        "explanation":  "\u0027어떻게 하지\u0027의 준말은 \u0027어떡하지\u0027입니다. \u0027어떻하지\u0027는 틀린 표기입니다.",
        "source":  "한글 맞춤법 제40항",
        "id":  324
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"갑자기 비가 쏟아지는데 우산이 없으면 ( )?\"",
        "options":  [
                        "어떡해",
                        "어떻게"
                    ],
        "answer":  "어떡해",
        "explanation":  "\u0027어떻게 해\u0027가 줄어든 서술어는 \u0027어떡해\u0027입니다. 문장 끝에는 \u0027어떡해\u0027가 옵니다.",
        "source":  "한글 맞춤법 제40항",
        "id":  325
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"이 문제를 ( ) 풀어야 정답을 맞힐 수 있을까?\"",
        "options":  [
                        "어떻게",
                        "어떡해"
                    ],
        "answer":  "어떻게",
        "explanation":  "\u0027어떠하다\u0027의 부사형으로 뒤의 용언을 꾸밀 때는 \u0027어떻게\u0027를 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  326
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아픈 친구의 수척해진 얼굴을 보니 참 ( ).\"",
        "options":  [
                        "안됐다",
                        "안 됐다"
                    ],
        "answer":  "안됐다",
        "explanation":  "\u0027가엾고 딱하다\u0027라는 뜻의 형용사는 한 단어이므로 붙여서 \u0027안됐다\u0027로 적습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  327
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아직 시작 시간이 ( ) 교실에 잠시 대기했다.\"",
        "options":  [
                        "안 됐다",
                        "안됐다"
                    ],
        "answer":  "안 됐다",
        "explanation":  "부사 \u0027안\u0027이 동사 \u0027되다\u0027를 단순 부정하는 경우에는 띄어서 \u0027안 됐다\u0027로 적습니다.",
        "source":  "한글 맞춤법 띄어쓰기 규정",
        "id":  328
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"지금은 바쁘니까 ( ) 쉬는 시간에 다시 이야기하자.\"",
        "options":  [
                        "이따가",
                        "있다가"
                    ],
        "answer":  "이따가",
        "explanation":  "\u0027조금 지난 뒤에\u0027를 뜻하는 시간 부사는 \u0027이따가\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  329
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"도서관에 조금 더 ( ) 학원에 갈 예정이다.\"",
        "options":  [
                        "있다가",
                        "이따가"
                    ],
        "answer":  "있다가",
        "explanation":  "어떤 장소에 머물러 존재하다가 떠날 때는 \u0027있다\u0027의 활용형인 \u0027있다가\u0027를 씁니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  330
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"소풍 갈 생각에 가슴이 마구 ( ).\"",
        "options":  [
                        "설렌다",
                        "설레인다"
                    ],
        "answer":  "설렌다",
        "explanation":  "\u0027마음이 가라앉지 않고 들뜨다\u0027의 표준 기본형은 \u0027설레다\u0027이므로 \u0027설렌다\u0027가 맞습니다. \u0027설레이다\u0027는 틀립니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  331
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"깊은 숲속에서 길을 잃고 한참을 ( ).\"",
        "options":  [
                        "헤맸다",
                        "헤매였다"
                    ],
        "answer":  "헤맸다",
        "explanation":  "기본형이 \u0027헤매다\u0027이므로 과거형은 \u0027헤맸다\u0027가 맞습니다. \u0027헤매이다\u0027는 비표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  332
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"슬픈 영화의 마지막 장면을 보고 목이 ( ) 울컥했다.\"",
        "options":  [
                        "메어",
                        "메여"
                    ],
        "answer":  "메어",
        "explanation":  "기본형은 \u0027목메다\u0027이므로 어미 \u0027-어\u0027가 결합하여 \u0027메어\u0027가 맞습니다. \u0027목메이다\u0027는 비표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  333
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님께 감사 편지를 ( ) 예쁜 봉투에 담았다.\"",
        "options":  [
                        "써서",
                        "써써"
                    ],
        "answer":  "써서",
        "explanation":  "\u0027쓰다\u0027의 어간 \u0027쓰-\u0027에 연결 어미 \u0027-어서\u0027가 결합하여 으 탈락 후 \u0027써서\u0027가 됩니다.",
        "source":  "한글 맞춤법 제18항",
        "id":  334
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"아침에 일어나 따뜻한 물로 세수를 ( ).\"",
        "options":  [
                        "했다",
                        "헸다"
                    ],
        "answer":  "했다",
        "explanation":  "\u0027하다\u0027의 과거 시제는 \u0027하였-\u0027의 준말인 \u0027했-\u0027을 써서 \u0027했다\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제34항",
        "id":  335
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구가 장난을 쳐서 ( ) 웃음이 터져 나왔다.\"",
        "options":  [
                        "피식",
                        "피식히"
                    ],
        "answer":  "피식",
        "explanation":  "웃는 모양을 나타내는 부사는 \u0027피식\u0027이 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  336
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"도서관에서는 다른 사람들을 위해 ( ) 걸어야 한다.\"",
        "options":  [
                        "살금살금",
                        "살큼살큼"
                    ],
        "answer":  "살금살금",
        "explanation":  "남이 모르게 발소리를 죽여 걷는 모양은 \u0027살금살금\u0027이 표준어입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  337
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"국어 시험에서 ( ) 만점을 받아 기뻤다.\"",
        "options":  [
                        "당당히",
                        "당당이"
                    ],
        "answer":  "당당히",
        "explanation":  "\u0027-하다\u0027가 붙는 어근 뒤에서 부사 파생 접미사 \u0027-히\u0027가 붙어 \u0027당당히\u0027로 적습니다.",
        "source":  "한글 맞춤법 제51항",
        "id":  338
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"친구와 ( ) 지내는 것이 즐거운 학교생활의 비결이다.\"",
        "options":  [
                        "다정하게",
                        "다정히게"
                    ],
        "answer":  "다정하게",
        "explanation":  "형용사 \u0027다정하다\u0027의 어간에 어미 \u0027-게\u0027가 붙어 \u0027다정하게\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  339
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"가을 하늘이 구름 한 점 없이 ( ) 맑았다.\"",
        "options":  [
                        "드높고",
                        "디높고"
                    ],
        "answer":  "드높고",
        "explanation":  "\u0027아주 높다\u0027를 뜻하는 접두사 \u0027드-\u0027가 결합하여 \u0027드높다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  340
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"동생이 졸린 눈을 ( ) 비비며 일어났다.\"",
        "options":  [
                        "비벼대며",
                        "비벼데며"
                    ],
        "answer":  "비벼대며",
        "explanation":  "반복적인 행동을 나타내는 보조 용언은 \u0027-대다\u0027이므로 \u0027비벼대며\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  341
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"오늘따라 하늘의 별이 ( ) 빛나고 있다.\"",
        "options":  [
                        "유난히",
                        "유난이"
                    ],
        "answer":  "유난히",
        "explanation":  "\u0027유난하다\u0027에 접미사 \u0027-히\u0027가 붙어 부사가 된 말이므로 \u0027유난히\u0027로 적습니다.",
        "source":  "한글 맞춤법 제51항",
        "id":  342
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"봄이 오자 마당 화단에 꽃들이 ( ) 피어났다.\"",
        "options":  [
                        "앞다투어",
                        "앞다투워"
                    ],
        "answer":  "앞다투어",
        "explanation":  "\u0027앞다투다\u0027의 어간 \u0027앞다투-\u0027에 어미 \u0027-어\u0027가 결합하여 \u0027앞다투어\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제16항",
        "id":  343
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어려운 문제를 끝까지 ( ) 성취감을 느꼈다.\"",
        "options":  [
                        "풀어내어",
                        "풀어내워"
                    ],
        "answer":  "풀어내어",
        "explanation":  "\u0027풀어내다\u0027의 어간에 어미 \u0027-어\u0027가 결합하여 \u0027풀어내어\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  344
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"선생님의 말씀을 귀담아 ( ) 실수를 줄일 수 있다.\"",
        "options":  [
                        "들어야",
                        "들워야"
                    ],
        "answer":  "들어야",
        "explanation":  "\u0027듣다\u0027의 ㄷ 불규칙 활용으로 모음 어미 앞에서 \u0027들-\u0027이 되어 \u0027들어야\u0027가 맞습니다.",
        "source":  "한글 맞춤법 제18항",
        "id":  345
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"학교 종이 ( ) 울리자 아이들이 교실로 뛰어갔다.\"",
        "options":  [
                        "땡땡",
                        "땡뎅"
                    ],
        "answer":  "땡땡",
        "explanation":  "종소리를 흉내 내는 순우리말 의성어는 \u0027땡땡\u0027이 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  346
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"어린 동생이 서툰 걸음마로 ( ) 걸어왔다.\"",
        "options":  [
                        "아장아장",
                        "애장애장"
                    ],
        "answer":  "아장아장",
        "explanation":  "키가 작은 사람이나 아기가 걷는 모양을 나타내는 표준어는 \u0027아장아장\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  347
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"바람에 날린 나뭇잎이 호수 위로 ( ) 떨어졌다.\"",
        "options":  [
                        "사뿐히",
                        "사뿐이"
                    ],
        "answer":  "사뿐히",
        "explanation":  "\u0027사뿐하다\u0027에 접미사 \u0027-히\u0027가 결합하여 \u0027사뿐히\u0027로 표기합니다.",
        "source":  "한글 맞춤법 제51항",
        "id":  348
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"엄마께서는 ( ) 식사 준비를 마치셨다.\"",
        "options":  [
                        "어느새",
                        "어느새에"
                    ],
        "answer":  "어느새",
        "explanation":  "\u0027어느 틈에 벌써\u0027를 뜻하는 표준 부사는 \u0027어느새\u0027입니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  349
    },
    {
        "question":  "다음 중 올바른 표기는 무엇일까요?\n\"모든 일에는 ( ) 차례와 순서가 있는 법이다.\"",
        "options":  [
                        "저마다",
                        "저마당"
                    ],
        "answer":  "저마다",
        "explanation":  "\u0027각자\u0027를 뜻하는 대명사 및 부사는 \u0027저마다\u0027가 맞습니다.",
        "source":  "국립국어원 표준국어대사전",
        "id":  350
    }
];

// Embedded Static Files for 100% Zero-Stale Single-File Deployment
const EMBEDDED_FILES = {
  '/index.html': { type: 'text/html; charset=utf-8', content: "\u003c!DOCTYPE html\u003e\n\u003chtml lang=\"ko\"\u003e\n\u003chead\u003e\n  \u003cmeta charset=\"UTF-8\"\u003e\n  \u003cmeta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"\u003e\n  \u003ctitle\u003e워터팡! 초등 맞춤법 퀴즈 배틀\u003c/title\u003e\n  \u003clink rel=\"stylesheet\" href=\"/css/style.css?v=3.0\"\u003e\n  \u003clink rel=\"icon\" href=\"data:image/svg+xml,\u003csvg xmlns=\u0027http://www.w3.org/2000/svg\u0027 viewBox=\u00270 0 100 100\u0027\u003e\u003ctext y=\u0027.9em\u0027 font-size=\u002790\u0027\u003e💧\u003c/text\u003e\u003c/svg\u003e\"\u003e\n\u003c/head\u003e\n\u003cbody\u003e\n  \u003cdiv id=\"app\"\u003e\n    \u003c!-- Game Header --\u003e\n    \u003cheader class=\"game-header\"\u003e\n      \u003cdiv class=\"logo-title\"\u003e\n        \u003cspan\u003e💧\u003c/span\u003e\n        \u003cspan\u003e워터팡! 맞춤법 배틀 \u003cspan style=\"background: #f59e0b; color: #451a03; font-size: 13px; padding: 2px 8px; border-radius: 12px; margin-left: 4px; font-weight: 900; vertical-align: middle;\"\u003e시즌 3\u003c/span\u003e\u003c/span\u003e\n      \u003c/div\u003e\n      \u003cdiv class=\"user-quick-bar\" id=\"header-user-bar\" style=\"display: none;\"\u003e\n        \u003cspan class=\"tier-badge\" id=\"header-tier-badge\"\u003e💧 물방울 (100 RP)\u003c/span\u003e\n        \u003cspan id=\"header-nickname\" style=\"font-size: 16px; font-weight: bold;\"\u003e\u003c/span\u003e\n        \u003cbutton class=\"btn-icon\" id=\"btn-sound-toggle\" title=\"소리 켜기/끄기\"\u003e🔊\u003c/button\u003e\n        \u003cbutton class=\"btn-icon\" id=\"btn-logout\" title=\"로그아웃\"\u003e🚪\u003c/button\u003e\n      \u003c/div\u003e\n    \u003c/header\u003e\n\n    \u003c!-- 1. Auth View (Login / Register / Quick Guest) --\u003e\n    \u003csection class=\"view-panel active\" id=\"view-auth\"\u003e\n      \u003cdiv class=\"auth-container\"\u003e\n        \u003cdiv class=\"auth-logo\"\u003e🎈💦\u003c/div\u003e\n        \u003cdiv class=\"auth-card\"\u003e\n          \u003ch2 style=\"font-size: 26px; color: #0284c7; margin-bottom: 8px;\"\u003e신나는 맞춤법 퀴즈 대결!\u003c/h2\u003e\n          \u003cp style=\"font-size: 14px; color: #64748b; margin-bottom: 20px;\"\u003e\n            친구들과 1대 1로 물풍선을 던지며 맞춤법 왕이 되어보세요!\n          \u003c/p\u003e\n\n          \u003c!-- Auth Mode Tabs --\u003e\n          \u003cdiv class=\"auth-tabs\"\u003e\n            \u003cbutton type=\"button\" class=\"auth-tab active\" id=\"tab-login\"\u003e기존 아이디 로그인\u003c/button\u003e\n            \u003cbutton type=\"button\" class=\"auth-tab\" id=\"tab-register\"\u003e새 계정 만들기\u003c/button\u003e\n          \u003c/div\u003e\n\n          \u003cform id=\"form-auth\"\u003e\n            \u003cdiv class=\"form-group\"\u003e\n              \u003clabel class=\"form-label\" for=\"auth-nickname\"\u003e내 닉네임 (아이디)\u003c/label\u003e\n              \u003cinput type=\"text\" id=\"auth-nickname\" class=\"form-input\" placeholder=\"예: 번개람쥐 (2~10자)\" maxlength=\"12\" required\u003e\n            \u003c/div\u003e\n            \u003cdiv class=\"form-group\"\u003e\n              \u003clabel class=\"form-label\" for=\"auth-password\"\u003e간편 비밀번호\u003c/label\u003e\n              \u003cinput type=\"password\" id=\"auth-password\" class=\"form-input\" placeholder=\"비밀번호 (2자 이상)\" required\u003e\n            \u003c/div\u003e\n\n            \u003cbutton type=\"submit\" class=\"btn-primary\" id=\"btn-submit-auth\"\u003e로그인하기\u003c/button\u003e\n            \u003cbutton type=\"button\" class=\"btn-sub\" id=\"btn-forgot-pw\" style=\"display: block; margin: 12px auto 0; font-size: 13px; color: #64748b; background: none; border: none; cursor: pointer; text-decoration: underline;\"\u003e비밀번호를 잊으셨나요?\u003c/button\u003e\n          \u003c/form\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n    \u003c/section\u003e\n\n    \u003c!-- 2. Lobby View --\u003e\n    \u003csection class=\"view-panel\" id=\"view-lobby\"\u003e\n      \u003cdiv class=\"lobby-grid\"\u003e\n        \u003c!-- Profile Column --\u003e\n        \u003cdiv class=\"profile-card\"\u003e\n          \u003cdiv class=\"profile-avatar-large\" id=\"lobby-avatar\"\u003e👦\u003c/div\u003e\n          \u003ch3 class=\"profile-name\" id=\"lobby-nickname\"\u003e학생\u003c/h3\u003e\n          \u003cdiv class=\"tier-badge\" id=\"lobby-tier-badge\" style=\"margin-bottom: 8px;\"\u003e💧 물방울 (100 RP)\u003c/div\u003e\n          \n          \u003cdiv class=\"stats-panel\"\u003e\n            \u003cdiv class=\"stat-box\"\u003e\n              \u003cdiv class=\"stat-value\" id=\"stat-wins\"\u003e0\u003c/div\u003e\n              \u003cdiv class=\"stat-label\"\u003e승리\u003c/div\u003e\n            \u003c/div\u003e\n            \u003cdiv class=\"stat-box\"\u003e\n              \u003cdiv class=\"stat-value\" id=\"stat-losses\"\u003e0\u003c/div\u003e\n              \u003cdiv class=\"stat-label\"\u003e패배\u003c/div\u003e\n            \u003c/div\u003e\n            \u003cdiv class=\"stat-box\"\u003e\n              \u003cdiv class=\"stat-value\" id=\"stat-winrate\"\u003e0%\u003c/div\u003e\n              \u003cdiv class=\"stat-label\"\u003e승률\u003c/div\u003e\n            \u003c/div\u003e\n          \u003c/div\u003e\n\n          \u003cdiv style=\"font-size: 13px; color: #64748b; width: 100%; text-align: left; margin-top: 4px;\"\u003e\n            다음 티어까지: \u003cspan id=\"tier-next-rp\" style=\"font-weight: bold; color: #0284c7;\"\u003e100 RP\u003c/span\u003e 남음!\n          \u003c/div\u003e\n        \u003c/div\u003e\n\n        \u003c!-- Main Action Column --\u003e\n        \u003cdiv class=\"lobby-main\"\u003e\n          \u003cdiv class=\"hero-banner\"\u003e\n            \u003ch2\u003e실시간 1대 1 물풍선 배틀!\u003c/h2\u003e\n            \u003cp\u003e\n              문제를 먼저 맞혀 물풍선을 날려보세요! 💥\u003cbr\u003e\n              10문제를 풀고 승리하면 티어가 올라갑니다.\n            \u003c/p\u003e\n            \u003cdiv class=\"hero-water-balloon\"\u003e🎈\u003c/div\u003e\n          \u003c/div\u003e\n\n          \u003cdiv class=\"action-cards\"\u003e\n            \u003cbutton class=\"action-card-btn\" id=\"btn-open-leaderboard\"\u003e\n              \u003cdiv class=\"action-icon\"\u003e🏆\u003c/div\u003e\n              \u003cdiv class=\"action-text\"\u003e\n                \u003cdiv class=\"action-title\"\u003e명예의 전당 (시즌3)\u003c/div\u003e\n                \u003cdiv class=\"action-desc\"\u003e전체 학생 티어 순위 보기\u003c/div\u003e\n              \u003c/div\u003e\n            \u003c/button\u003e\n\n            \u003cbutton class=\"action-card-btn\" id=\"btn-open-wrongnotes\"\u003e\n              \u003cdiv class=\"action-icon\"\u003e📝\u003c/div\u003e\n              \u003cdiv class=\"action-text\"\u003e\n                \u003cdiv class=\"action-title\"\u003e나의 오답노트\u003c/div\u003e\n                \u003cdiv class=\"action-desc\"\u003e틀렸던 맞춤법 복습하기\u003c/div\u003e\n              \u003c/div\u003e\n            \u003c/button\u003e\n          \u003c/div\u003e\n\n          \u003cbutton class=\"btn-primary btn-battle-start\" id=\"btn-start-matching\"\u003e\n            🚀 1대1 대결 시작! (랜덤 매칭)\n          \u003c/button\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n    \u003c/section\u003e\n\n    \u003c!-- 3. Matchmaking Queue View --\u003e\n    \u003csection class=\"view-panel\" id=\"view-matchmaking\"\u003e\n      \u003cdiv class=\"matchmaking-container\"\u003e\n        \u003cdiv class=\"radar-wrapper\"\u003e\n          \u003cdiv class=\"radar-pulse\"\u003e\u003c/div\u003e\n          \u003cdiv class=\"radar-pulse\"\u003e\u003c/div\u003e\n          \u003cdiv class=\"radar-pulse\"\u003e\u003c/div\u003e\n          \u003cdiv class=\"radar-icon\"\u003e🎯\u003c/div\u003e\n        \u003c/div\u003e\n        \u003ch2 class=\"queue-status-text\"\u003e대결 상대를 찾는 중...\u003c/h2\u003e\n        \u003cp class=\"queue-subtext\"\u003e\n          매칭을 기다리는 친구가 없으면 \u003cstrong\u003e3초 후 AI 봇\u003c/strong\u003e과 대결이 시작됩니다!\n        \u003c/p\u003e\n        \u003cbutton class=\"btn-primary btn-accent\" id=\"btn-cancel-matching\" style=\"max-width: 240px;\"\u003e\n          매칭 취소\n        \u003c/button\u003e\n      \u003c/div\u003e\n    \u003c/section\u003e\n\n    \u003c!-- 4. Battle Arena View --\u003e\n    \u003csection class=\"view-panel\" id=\"view-battle\"\u003e\n      \u003cdiv class=\"battle-container\" id=\"game-arena\"\u003e\n        \u003c!-- Canvas for water balloons \u0026 particle explosions --\u003e\n        \u003ccanvas id=\"battle-fx-canvas\"\u003e\u003c/canvas\u003e\n\n        \u003c!-- Battle Header --\u003e\n        \u003cdiv class=\"battle-top-bar\"\u003e\n          \u003cdiv class=\"round-pill\" id=\"battle-round-indicator\"\u003e라운드 1 / 10\u003c/div\u003e\n          \u003cdiv class=\"battle-timer-box\"\u003e\n            \u003cspan\u003e⏱️\u003c/span\u003e\n            \u003cspan id=\"battle-timer-num\"\u003e10\u003c/span\u003es\n            \u003cdiv class=\"timer-bar-bg\"\u003e\n              \u003cdiv class=\"timer-bar-fill\" id=\"battle-timer-fill\"\u003e\u003c/div\u003e\n            \u003c/div\u003e\n          \u003c/div\u003e\n        \u003c/div\u003e\n\n        \u003c!-- Versus Arena Section --\u003e\n        \u003cdiv class=\"arena-versus\"\u003e\n          \u003c!-- Player 1 (Me) --\u003e\n          \u003cdiv class=\"fighter-card\" id=\"fighter-p1\"\u003e\n            \u003cdiv class=\"fighter-avatar\" id=\"avatar-p1\"\u003e👦\n              \u003cdiv class=\"water-drips\"\u003e💦\u003c/div\u003e\n            \u003c/div\u003e\n            \u003cdiv class=\"fighter-name\" id=\"name-p1\"\u003e나\u003c/div\u003e\n            \u003cdiv class=\"hp-gauge-wrapper\"\u003e\n              \u003cdiv class=\"hp-text\"\u003e\n                \u003cspan\u003e체력\u003c/span\u003e\n                \u003cspan id=\"hp-num-p1\"\u003e100 / 100\u003c/span\u003e\n              \u003c/div\u003e\n              \u003cdiv class=\"hp-bar-bg\"\u003e\n                \u003cdiv class=\"hp-bar-fill\" id=\"hp-bar-p1\" style=\"width: 100%;\"\u003e\u003c/div\u003e\n              \u003c/div\u003e\n            \u003c/div\u003e\n          \u003c/div\u003e\n\n          \u003cdiv class=\"vs-badge\"\u003eVS\u003c/div\u003e\n\n          \u003c!-- Player 2 (Opponent) --\u003e\n          \u003cdiv class=\"fighter-card\" id=\"fighter-p2\"\u003e\n            \u003cdiv class=\"fighter-avatar\" id=\"avatar-p2\"\u003e🤖\n              \u003cdiv class=\"water-drips\"\u003e💦\u003c/div\u003e\n            \u003c/div\u003e\n            \u003cdiv class=\"fighter-name\" id=\"name-p2\"\u003e상대방\u003c/div\u003e\n            \u003cdiv class=\"hp-gauge-wrapper\"\u003e\n              \u003cdiv class=\"hp-text\"\u003e\n                \u003cspan\u003e체력\u003c/span\u003e\n                \u003cspan id=\"hp-num-p2\"\u003e100 / 100\u003c/span\u003e\n              \u003c/div\u003e\n              \u003cdiv class=\"hp-bar-bg\"\u003e\n                \u003cdiv class=\"hp-bar-fill\" id=\"hp-bar-p2\" style=\"width: 100%;\"\u003e\u003c/div\u003e\n              \u003c/div\u003e\n            \u003c/div\u003e\n          \u003c/div\u003e\n        \u003c/div\u003e\n\n        \u003c!-- Quiz Area --\u003e\n        \u003cdiv class=\"quiz-card\"\u003e\n          \u003cdiv class=\"quiz-question\" id=\"quiz-question-text\"\u003e\n            문제를 불러오는 중입니다...\n          \u003c/div\u003e\n\n          \u003cdiv class=\"quiz-options-grid\" id=\"quiz-options-container\"\u003e\n            \u003c!-- Buttons injected by app.js --\u003e\n          \u003c/div\u003e\n        \u003c/div\u003e\n\n        \u003c!-- Live Battle Action Banner --\u003e\n        \u003cdiv class=\"battle-banner\" id=\"battle-live-banner\"\u003e\n          문제를 먼저 맞히는 사람이 상대에게 물풍선을 던집니다!\n        \u003c/div\u003e\n\n        \u003cdiv class=\"explanation-box\" id=\"round-explanation-box\" style=\"display: none;\"\u003e\n          \u003c!-- Educational spelling explanation --\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n    \u003c/section\u003e\n\n    \u003c!-- 5. Match Over View --\u003e\n    \u003csection class=\"view-panel\" id=\"view-match-over\"\u003e\n      \u003cdiv class=\"match-over-container\"\u003e\n        \u003cdiv class=\"result-crown\" id=\"result-emoji\"\u003e👑\u003c/div\u003e\n        \u003ch2 class=\"result-title win\" id=\"result-title\"\u003e대승리!\u003c/h2\u003e\n        \n        \u003cdiv class=\"rp-badge-change plus\" id=\"result-rp-badge\"\u003e\n          +25 RP 획득!\n        \u003c/div\u003e\n\n        \u003cdiv style=\"width: 100%; max-width: 600px; text-align: left; margin-bottom: 8px; font-weight: bold; color: #0284c7;\"\u003e\n          📖 이번 대결 오답/정답 퀴즈 복습\n        \u003c/div\u003e\n        \u003cdiv class=\"match-history-recap\" id=\"match-recap-list\"\u003e\n          \u003c!-- Recap rounds injected here --\u003e\n        \u003c/div\u003e\n\n        \u003cdiv style=\"display: flex; gap: 16px; width: 100%; max-width: 440px;\"\u003e\n          \u003cbutton class=\"btn-primary\" id=\"btn-return-lobby\"\u003e로비로 이동\u003c/button\u003e\n          \u003cbutton class=\"btn-primary btn-accent\" id=\"btn-rematch\"\u003e다시 대결하기\u003c/button\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n    \u003c/section\u003e\n\n    \u003c!-- Modal: Leaderboard --\u003e\n    \u003cdiv class=\"modal-backdrop\" id=\"modal-leaderboard\"\u003e\n      \u003cdiv class=\"modal-window\"\u003e\n        \u003cdiv class=\"modal-header\"\u003e\n          \u003ch3 id=\"leaderboard-modal-title\"\u003e🏆 명예의 전당 (시즌3)\u003c/h3\u003e\n          \u003cbutton class=\"btn-close\" id=\"btn-close-leaderboard\"\u003e✕\u003c/button\u003e\n        \u003c/div\u003e\n        \u003cdiv class=\"modal-body\"\u003e\n          \u003cdiv id=\"leaderboard-my-summary\"\u003e\u003c/div\u003e\n          \u003cdiv class=\"leaderboard-list\" id=\"leaderboard-container\"\u003e\n            \u003c!-- Leaderboard rows --\u003e\n          \u003c/div\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n    \u003c/div\u003e\n\n    \u003c!-- Modal: Wrong Answer Note --\u003e\n    \u003cdiv class=\"modal-backdrop\" id=\"modal-wrongnotes\"\u003e\n      \u003cdiv class=\"modal-window\"\u003e\n        \u003cdiv class=\"modal-header\"\u003e\n          \u003ch3\u003e📝 나의 맞춤법 오답노트\u003c/h3\u003e\n          \u003cbutton class=\"btn-close\" id=\"btn-close-wrongnotes\"\u003e✕\u003c/button\u003e\n        \u003c/div\u003e\n        \u003cdiv class=\"modal-body\" id=\"wrongnotes-container\"\u003e\n          \u003c!-- Wrong answer cards --\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n    \u003c/div\u003e\n\n    \u003c!-- Toast message --\u003e\n    \u003cdiv class=\"toast-msg\" id=\"toast-notification\"\u003e\u003c/div\u003e\n\n    \u003c!-- Game Footer --\u003e\n    \u003cfooter class=\"game-footer\"\u003e\n      \u003cspan\u003e💧 워터팡! 초등 맞춤법 배틀\u003c/span\u003e\n      \u003cspan class=\"footer-dot\"\u003e·\u003c/span\u003e\n      \u003cspan class=\"footer-author\"\u003emade by 하하하하하쌤\u003c/span\u003e\n    \u003c/footer\u003e\n  \u003c/div\u003e\n\n  \u003c!-- Scripts --\u003e\n  \u003cscript src=\"/js/audio.js?v=3.0\"\u003e\u003c/script\u003e\n  \u003cscript src=\"/js/particles.js?v=3.0\"\u003e\u003c/script\u003e\n  \u003cscript src=\"/js/app.js?v=3.0\"\u003e\u003c/script\u003e\n\u003c/body\u003e\n\u003c/html\u003e\n" },
  '/css/style.css': { type: 'text/css; charset=utf-8', content: "@import url(\u0027https://fonts.googleapis.com/css2?family=Jua\u0026family=Noto+Sans+KR:wght@400;600;800;900\u0026display=swap\u0027);\n\n:root {\n  --primary: #0284c7;\n  --primary-hover: #0369a1;\n  --accent: #f59e0b;\n  --danger: #ef4444;\n  --success: #10b981;\n  --bg-top: #0284c7;\n  --bg-bottom: #0f172a;\n  --card-bg: rgba(255, 255, 255, 0.95);\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n  user-select: none;\n}\n\nbody {\n  font-family: \u0027Jua\u0027, \u0027Noto Sans KR\u0027, sans-serif;\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%);\n  min-height: 100vh;\n  color: #1e293b;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  overflow-x: hidden;\n}\n\n/* Base Container */\n#app {\n  width: 100%;\n  max-width: 960px;\n  min-height: 640px;\n  background: #ffffff;\n  border-radius: 28px;\n  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 6px #38bdf8;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n}\n\n/* Header */\n.game-header {\n  background: linear-gradient(90deg, #0284c7, #38bdf8);\n  padding: 14px 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  color: white;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n  z-index: 10;\n}\n\n.logo-title {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-size: 24px;\n  letter-spacing: 0.5px;\n  text-shadow: 1px 2px 0px rgba(0, 0, 0, 0.2);\n}\n\n.user-quick-bar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.tier-badge {\n  background: rgba(255, 255, 255, 0.2);\n  padding: 6px 14px;\n  border-radius: 20px;\n  font-size: 15px;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid rgba(255, 255, 255, 0.4);\n  font-weight: bold;\n}\n\n.btn-icon {\n  background: rgba(255, 255, 255, 0.25);\n  border: none;\n  border-radius: 50%;\n  width: 38px;\n  height: 38px;\n  font-size: 18px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: white;\n  transition: all 0.15s;\n}\n\n.btn-icon:hover {\n  background: rgba(255, 255, 255, 0.45);\n  transform: scale(1.08);\n}\n\n/* Views Common */\n.view-panel {\n  display: none;\n  flex: 1;\n  padding: 24px;\n  flex-direction: column;\n  position: relative;\n}\n\n.view-panel.active {\n  display: flex;\n  animation: fadeIn 0.25s ease-out;\n}\n\n@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(8px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n/* Auth View */\n.auth-container {\n  max-width: 420px;\n  margin: auto;\n  text-align: center;\n}\n\n.auth-card {\n  background: #f8fafc;\n  padding: 32px 28px;\n  border-radius: 24px;\n  border: 3px solid #e2e8f0;\n  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);\n}\n\n.auth-logo {\n  font-size: 64px;\n  margin-bottom: 12px;\n  animation: floatBounce 2.5s infinite ease-in-out;\n}\n\n@keyframes floatBounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-8px); }\n}\n\n.auth-tabs {\n  display: flex;\n  background: #e2e8f0;\n  border-radius: 14px;\n  padding: 4px;\n  margin-bottom: 20px;\n  gap: 6px;\n}\n\n.auth-tab {\n  flex: 1;\n  padding: 10px 12px;\n  border: none;\n  background: transparent;\n  border-radius: 10px;\n  font-family: inherit;\n  font-size: 15px;\n  font-weight: bold;\n  color: #64748b;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n\n.auth-tab.active {\n  background: white;\n  color: #0284c7;\n  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);\n}\n\n.form-group {\n  margin-bottom: 16px;\n  text-align: left;\n}\n\n.form-label {\n  font-size: 14px;\n  color: #475569;\n  margin-bottom: 6px;\n  display: block;\n}\n\n.form-input {\n  width: 100%;\n  padding: 12px 16px;\n  border: 2px solid #cbd5e1;\n  border-radius: 14px;\n  font-size: 16px;\n  font-family: inherit;\n  outline: none;\n  transition: border-color 0.2s;\n}\n\n.form-input:focus {\n  border-color: #0284c7;\n  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);\n}\n\n/* Buttons */\n.btn-primary {\n  width: 100%;\n  padding: 14px 20px;\n  background: linear-gradient(180deg, #38bdf8, #0284c7);\n  border: none;\n  border-bottom: 4px solid #0369a1;\n  border-radius: 16px;\n  color: white;\n  font-size: 19px;\n  font-family: inherit;\n  font-weight: bold;\n  cursor: pointer;\n  transition: all 0.1s;\n  box-shadow: 0 6px 12px rgba(2, 132, 199, 0.3);\n}\n\n.btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 16px rgba(2, 132, 199, 0.4);\n}\n\n.btn-primary:active {\n  transform: translateY(2px);\n  border-bottom-width: 2px;\n}\n\n.btn-accent {\n  background: linear-gradient(180deg, #fbbf24, #f59e0b);\n  border-bottom: 4px solid #d97706;\n  color: #451a03;\n}\n\n.btn-accent:hover {\n  background: linear-gradient(180deg, #fcd34d, #f59e0b);\n}\n\n.btn-sub {\n  background: transparent;\n  border: none;\n  color: #64748b;\n  font-size: 14px;\n  font-family: inherit;\n  margin-top: 14px;\n  cursor: pointer;\n  text-decoration: underline;\n}\n\n/* Lobby View */\n.lobby-grid {\n  display: grid;\n  grid-template-columns: 320px 1fr;\n  gap: 24px;\n  flex: 1;\n}\n\n.profile-card {\n  background: linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%);\n  border: 3px solid #bae6fd;\n  border-radius: 24px;\n  padding: 24px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.profile-avatar-large {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: white;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.15);\n  border: 4px solid #38bdf8;\n  margin-bottom: 12px;\n}\n\n.profile-name {\n  font-size: 24px;\n  color: #0c4a6e;\n  margin-bottom: 6px;\n}\n\n.stats-panel {\n  width: 100%;\n  background: white;\n  border-radius: 16px;\n  padding: 14px;\n  margin: 16px 0;\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 8px;\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);\n}\n\n.stat-box {\n  text-align: center;\n}\n\n.stat-value {\n  font-size: 20px;\n  font-weight: bold;\n  color: #0369a1;\n}\n\n.stat-label {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.lobby-main {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n}\n\n.hero-banner {\n  background: linear-gradient(135deg, #38bdf8, #0ea5e9);\n  border-radius: 24px;\n  padding: 28px;\n  color: white;\n  position: relative;\n  overflow: hidden;\n  box-shadow: 0 10px 25px rgba(14, 165, 233, 0.25);\n}\n\n.hero-banner h2 {\n  font-size: 32px;\n  margin-bottom: 8px;\n  text-shadow: 1px 2px 0 rgba(0,0,0,0.2);\n}\n\n.hero-banner p {\n  font-size: 16px;\n  opacity: 0.95;\n  line-height: 1.5;\n}\n\n.hero-water-balloon {\n  position: absolute;\n  right: 20px;\n  bottom: -10px;\n  font-size: 90px;\n  opacity: 0.85;\n  transform: rotate(15deg);\n}\n\n.action-cards {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n  margin-top: 16px;\n}\n\n.action-card-btn {\n  background: white;\n  border: 3px solid #e2e8f0;\n  border-radius: 20px;\n  padding: 18px;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-family: inherit;\n}\n\n.action-card-btn:hover {\n  border-color: #38bdf8;\n  transform: translateY(-3px);\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);\n}\n\n.action-icon {\n  font-size: 34px;\n}\n\n.action-text {\n  text-align: left;\n}\n\n.action-title {\n  font-size: 17px;\n  font-weight: bold;\n  color: #1e293b;\n}\n\n.action-desc {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.btn-battle-start {\n  margin-top: 18px;\n  padding: 20px;\n  font-size: 26px;\n  letter-spacing: 1px;\n}\n\n/* Matchmaking Queue View */\n.matchmaking-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n  text-align: center;\n}\n\n.radar-wrapper {\n  position: relative;\n  width: 180px;\n  height: 180px;\n  margin-bottom: 24px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.radar-pulse {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  border: 3px solid #38bdf8;\n  animation: radarPulse 2s infinite ease-out;\n}\n\n.radar-pulse:nth-child(2) {\n  animation-delay: 0.6s;\n}\n\n.radar-pulse:nth-child(3) {\n  animation-delay: 1.2s;\n}\n\n@keyframes radarPulse {\n  0% { transform: scale(0.3); opacity: 1; }\n  100% { transform: scale(1.4); opacity: 0; }\n}\n\n.radar-icon {\n  font-size: 64px;\n  z-index: 2;\n}\n\n.queue-status-text {\n  font-size: 26px;\n  color: #0284c7;\n  margin-bottom: 8px;\n}\n\n.queue-subtext {\n  font-size: 15px;\n  color: #64748b;\n  margin-bottom: 24px;\n}\n\n/* Battle Arena View */\n.battle-container {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  position: relative;\n  height: 100%;\n}\n\n/* Canvas overlay for projectiles \u0026 splashes */\n#battle-fx-canvas {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 30;\n}\n\n.battle-top-bar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 4px 12px 14px;\n  border-bottom: 2px dashed #e2e8f0;\n}\n\n.round-pill {\n  background: #0284c7;\n  color: white;\n  padding: 6px 18px;\n  border-radius: 20px;\n  font-size: 18px;\n  font-weight: bold;\n}\n\n.battle-timer-box {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 22px;\n  color: #d97706;\n}\n\n.timer-bar-bg {\n  width: 180px;\n  height: 14px;\n  background: #e2e8f0;\n  border-radius: 8px;\n  overflow: hidden;\n}\n\n.timer-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);\n  width: 100%;\n  transition: width 0.1s linear;\n}\n\n/* Arena Versus Section */\n.arena-versus {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px 20px;\n  position: relative;\n}\n\n.fighter-card {\n  width: 220px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  transition: transform 0.2s;\n}\n\n.fighter-avatar {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: #f0f9ff;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);\n  position: relative;\n  transition: all 0.2s;\n}\n\n.fighter-card.drenched .fighter-avatar {\n  animation: drenchedShake 0.4s ease-in-out;\n  border-color: #ef4444;\n  background: #fee2e2;\n}\n\n@keyframes drenchedShake {\n  0%, 100% { transform: scale(1) rotate(0deg); }\n  25% { transform: scale(0.92) rotate(-8deg); }\n  75% { transform: scale(0.92) rotate(8deg); }\n}\n\n.water-drips {\n  display: none;\n  position: absolute;\n  bottom: -8px;\n  font-size: 20px;\n}\n\n.fighter-card.drenched .water-drips {\n  display: block;\n}\n\n.fighter-name {\n  font-size: 20px;\n  color: #1e293b;\n  margin-top: 8px;\n}\n\n.hp-gauge-wrapper {\n  width: 100%;\n  margin-top: 8px;\n}\n\n.hp-text {\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  color: #64748b;\n  margin-bottom: 4px;\n}\n\n.hp-bar-bg {\n  width: 100%;\n  height: 16px;\n  background: #e2e8f0;\n  border-radius: 10px;\n  overflow: hidden;\n  border: 2px solid #cbd5e1;\n}\n\n.hp-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #34d399);\n  width: 100%;\n  border-radius: 8px;\n  transition: width 0.35s ease-out, background 0.3s;\n}\n\n.hp-bar-fill.warning {\n  background: linear-gradient(90deg, #f59e0b, #fbbf24);\n}\n\n.hp-bar-fill.danger {\n  background: linear-gradient(90deg, #ef4444, #f87171);\n}\n\n.vs-badge {\n  font-size: 36px;\n  font-weight: 900;\n  color: #f59e0b;\n  text-shadow: 2px 3px 0 #b45309;\n  letter-spacing: 2px;\n}\n\n/* Quiz Arena */\n.quiz-card {\n  background: #f8fafc;\n  border: 3px solid #cbd5e1;\n  border-radius: 24px;\n  padding: 24px;\n  margin: 12px 0;\n  text-align: center;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);\n}\n\n.quiz-question {\n  font-size: 24px;\n  line-height: 1.45;\n  color: #0f172a;\n  white-space: pre-line;\n  margin-bottom: 20px;\n}\n\n.quiz-options-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n}\n\n.btn-option {\n  background: white;\n  border: 3px solid #94a3b8;\n  border-bottom: 6px solid #64748b;\n  border-radius: 18px;\n  padding: 18px 24px;\n  font-size: 26px;\n  font-weight: bold;\n  color: #1e293b;\n  cursor: pointer;\n  transition: all 0.1s;\n  font-family: inherit;\n}\n\n.btn-option:hover:not(:disabled) {\n  border-color: #0284c7;\n  border-bottom-color: #0369a1;\n  transform: translateY(-2px);\n  background: #f0f9ff;\n}\n\n.btn-option:active:not(:disabled) {\n  transform: translateY(3px);\n  border-bottom-width: 3px;\n}\n\n.btn-option:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.btn-option.correct-pick {\n  background: #dcfce7 !important;\n  border-color: #10b981 !important;\n  border-bottom-color: #059669 !important;\n  color: #065f46 !important;\n}\n\n.btn-option.wrong-pick {\n  background: #fee2e2 !important;\n  border-color: #ef4444 !important;\n  border-bottom-color: #b91c1c !important;\n  color: #991b1b !important;\n}\n\n/* Battle Action Banner */\n.battle-banner {\n  min-height: 60px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  font-size: 18px;\n  color: #0284c7;\n  background: #f0f9ff;\n  border-radius: 14px;\n  padding: 8px 16px;\n}\n\n.explanation-box {\n  background: #eff6ff;\n  border-left: 5px solid #3b82f6;\n  padding: 10px 14px;\n  border-radius: 8px;\n  font-size: 15px;\n  color: #1e40af;\n  margin-top: 6px;\n  text-align: left;\n}\n\n/* Screen Shake Classes */\n.screen-shake {\n  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n.screen-shake-intense {\n  animation: shakeIntense 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n@keyframes shake {\n  10%, 90% { transform: translate3d(-3px, 0, 0); }\n  20%, 80% { transform: translate3d(5px, 0, 0); }\n  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }\n  40%, 60% { transform: translate3d(6px, 0, 0); }\n}\n\n@keyframes shakeIntense {\n  10%, 90% { transform: translate3d(-6px, 3px, 0) rotate(-1deg); }\n  20%, 80% { transform: translate3d(8px, -4px, 0) rotate(1.5deg); }\n  30%, 50%, 70% { transform: translate3d(-10px, 5px, 0) rotate(-2deg); }\n  40%, 60% { transform: translate3d(10px, -5px, 0) rotate(2deg); }\n}\n\n/* Match Over View */\n.match-over-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  flex: 1;\n  padding: 16px 0;\n}\n\n.result-crown {\n  font-size: 72px;\n  animation: floatBounce 2s infinite ease-in-out;\n}\n\n.result-title {\n  font-size: 40px;\n  margin: 6px 0;\n}\n\n.result-title.win {\n  color: #f59e0b;\n  text-shadow: 2px 2px 0 #b45309;\n}\n\n.result-title.lose {\n  color: #64748b;\n}\n\n.result-title.draw {\n  color: #0284c7;\n}\n\n.rp-badge-change {\n  display: inline-block;\n  padding: 8px 24px;\n  border-radius: 24px;\n  font-size: 20px;\n  font-weight: bold;\n  margin-bottom: 16px;\n}\n\n.rp-badge-change.plus {\n  background: #dcfce7;\n  color: #166534;\n  border: 2px solid #86efac;\n}\n\n.rp-badge-change.minus {\n  background: #fee2e2;\n  color: #991b1b;\n  border: 2px solid #fca5a5;\n}\n\n.match-history-recap {\n  width: 100%;\n  max-height: 220px;\n  overflow-y: auto;\n  background: #f8fafc;\n  border-radius: 18px;\n  border: 2px solid #e2e8f0;\n  padding: 12px;\n  margin-bottom: 20px;\n}\n\n.recap-item {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 12px;\n  border-bottom: 1px solid #e2e8f0;\n  font-size: 14px;\n}\n\n.recap-item:last-child {\n  border-bottom: none;\n}\n\n/* Modals */\n.modal-backdrop {\n  display: none;\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: rgba(0, 0, 0, 0.6);\n  z-index: 100;\n  align-items: center;\n  justify-content: center;\n}\n\n.modal-backdrop.active {\n  display: flex;\n  animation: fadeIn 0.2s ease-out;\n}\n\n.modal-window {\n  background: white;\n  width: 90%;\n  max-width: 540px;\n  max-height: 80vh;\n  border-radius: 24px;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.modal-header {\n  background: #f0f9ff;\n  padding: 16px 20px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  border-bottom: 2px solid #e2e8f0;\n}\n\n.modal-header h3 {\n  font-size: 20px;\n  color: #0369a1;\n}\n\n.modal-body {\n  padding: 20px;\n  overflow-y: auto;\n  flex: 1;\n}\n\n/* Leaderboard \u0026 My Rank Styles */\n.my-rank-banner {\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);\n  color: white;\n  padding: 12px 16px;\n  border-radius: 14px;\n  margin-bottom: 14px;\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.my-rank-banner:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 6px 18px rgba(2, 132, 199, 0.35);\n}\n\n.my-rank-banner .my-rank-left {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.my-rank-banner .my-rank-label {\n  font-size: 12px;\n  opacity: 0.9;\n  font-weight: 600;\n  display: flex;\n  align-items: center;\n  gap: 4px;\n}\n\n.my-rank-banner .my-rank-pos {\n  font-size: 22px;\n  font-weight: 800;\n  letter-spacing: -0.5px;\n}\n\n.my-rank-banner .my-rank-total {\n  font-size: 13px;\n  opacity: 0.85;\n  font-weight: 500;\n}\n\n.my-rank-banner .my-rank-right {\n  text-align: right;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: 2px;\n}\n\n.my-rank-banner .my-rank-tier {\n  font-size: 13px;\n  opacity: 0.95;\n  font-weight: 600;\n}\n\n.my-rank-banner .my-rank-rp {\n  font-size: 18px;\n  font-weight: 800;\n  color: #fef08a;\n  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);\n}\n\n.my-rank-jump-hint {\n  font-size: 11px;\n  background: rgba(255, 255, 255, 0.22);\n  padding: 2px 8px;\n  border-radius: 10px;\n  margin-top: 2px;\n  display: inline-block;\n}\n\n.my-rank-banner.guest {\n  background: #f1f5f9;\n  color: #475569;\n  border: 1px dashed #cbd5e1;\n  box-shadow: none;\n  cursor: default;\n}\n\n.my-rank-banner.guest:hover {\n  transform: none;\n  box-shadow: none;\n}\n\n.leaderboard-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.leaderboard-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 10px 14px;\n  background: #f8fafc;\n  border-radius: 12px;\n  border: 1px solid #e2e8f0;\n  transition: all 0.2s ease;\n}\n\n.leaderboard-row.rank-1 {\n  background: #fef9c3;\n  border-color: #facc15;\n}\n\n.leaderboard-row.rank-2 {\n  background: #f8fafc;\n  border-color: #94a3b8;\n}\n\n.leaderboard-row.rank-3 {\n  background: #fff7ed;\n  border-color: #fdba74;\n}\n\n/* User\u0027s Own Ranking Highlight */\n.leaderboard-row.my-rank-row {\n  background: #eff6ff !important;\n  border: 2.5px solid #0284c7 !important;\n  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.28) !important;\n  position: relative;\n}\n\n.my-badge {\n  display: inline-block;\n  background: #0284c7;\n  color: white;\n  font-size: 11px;\n  font-weight: 800;\n  padding: 2px 8px;\n  border-radius: 10px;\n  margin-left: 6px;\n  vertical-align: middle;\n  box-shadow: 0 2px 4px rgba(2, 132, 199, 0.3);\n}\n\n@keyframes pulseMyRow {\n  0% { transform: scale(1); }\n  50% { transform: scale(1.025); }\n  100% { transform: scale(1); }\n}\n\n.leaderboard-row.pulse-highlight {\n  animation: pulseMyRow 0.5s ease-in-out 2;\n}\n\n.leaderboard-rank {\n  font-size: 18px;\n  font-weight: bold;\n  width: 36px;\n}\n\n.leaderboard-user {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n}\n\n.btn-close {\n  background: transparent;\n  border: none;\n  font-size: 22px;\n  cursor: pointer;\n  color: #64748b;\n}\n\n/* Toast Notification */\n.toast-msg {\n  position: fixed;\n  top: 20px;\n  left: 50%;\n  transform: translateX(-50%) translateY(-30px);\n  background: #0f172a;\n  color: white;\n  padding: 12px 24px;\n  border-radius: 20px;\n  font-size: 16px;\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);\n  opacity: 0;\n  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);\n  pointer-events: none;\n  z-index: 200;\n}\n\n.toast-msg.show {\n  transform: translateX(-50%) translateY(0);\n  opacity: 1;\n}\n\n/* Responsive adjustments */\n@media (max-width: 768px) {\n  #app {\n    border-radius: 0;\n    min-height: 100vh;\n    border: none;\n  }\n  .lobby-grid {\n    grid-template-columns: 1fr;\n  }\n  .arena-versus {\n    padding: 8px;\n  }\n  .fighter-avatar {\n    width: 80px;\n    height: 80px;\n    font-size: 50px;\n  }\n  .quiz-options-grid {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* Footer Style */\n.game-footer {\n  text-align: center;\n  padding: 12px 16px;\n  font-size: 13px;\n  color: #64748b;\n  background: #f8fafc;\n  border-top: 2px solid #e2e8f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  z-index: 20;\n  margin-top: auto;\n}\n\n.footer-dot {\n  opacity: 0.5;\n}\n\n.footer-author {\n  color: #0284c7;\n  font-weight: 800;\n}\n\n" },
  '/js/audio.js': { type: 'application/javascript; charset=utf-8', content: "// Procedural Web Audio API Sound Generator\n// Zero external assets required! 100% reliable and instantaneous.\n\nclass SoundFX {\n  constructor() {\n    this.ctx = null;\n    this.enabled = true;\n  }\n\n  init() {\n    try {\n      if (!this.ctx) {\n        const AudioContext = window.AudioContext || window.webkitAudioContext;\n        if (AudioContext) {\n          this.ctx = new AudioContext();\n        }\n      }\n      if (this.ctx \u0026\u0026 this.ctx.state === \u0027suspended\u0027) {\n        this.ctx.resume().catch(() =\u003e {});\n      }\n    } catch (e) {\n      console.warn(\u0027[Audio] Init ignored:\u0027, e.message);\n    }\n  }\n\n  toggle() {\n    this.enabled = !this.enabled;\n    return this.enabled;\n  }\n\n  // 1. Water balloon throw whoosh (휙!)\n  playThrow() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n      const filter = this.ctx.createBiquadFilter();\n\n      osc.type = \u0027sine\u0027;\n      osc.frequency.setValueAtTime(300, t);\n      osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);\n      osc.frequency.exponentialRampToValueAtTime(200, t + 0.35);\n\n      filter.type = \u0027lowpass\u0027;\n      filter.frequency.setValueAtTime(1200, t);\n\n      gain.gain.setValueAtTime(0.01, t);\n      gain.gain.linearRampToValueAtTime(0.35, t + 0.1);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n      osc.connect(filter);\n      filter.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t);\n      osc.stop(t + 0.36);\n    } catch (e) {}\n  }\n\n  // 2. Water balloon hit \u0026 splash explosion (펑! 콰광!)\n  playSplash(isCritical = false) {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const duration = isCritical ? 0.6 : 0.45;\n\n      // White noise for water splash\n      const bufferSize = this.ctx.sampleRate * duration;\n      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);\n      const data = buffer.getChannelData(0);\n      for (let i = 0; i \u003c bufferSize; i++) {\n        data[i] = Math.random() * 2 - 1;\n      }\n\n      const noise = this.ctx.createBufferSource();\n      noise.buffer = buffer;\n\n      const noiseFilter = this.ctx.createBiquadFilter();\n      noiseFilter.type = \u0027bandpass\u0027;\n      noiseFilter.frequency.setValueAtTime(isCritical ? 1400 : 900, t);\n      noiseFilter.frequency.exponentialRampToValueAtTime(200, t + duration);\n      noiseFilter.Q.setValueAtTime(2, t);\n\n      const noiseGain = this.ctx.createGain();\n      noiseGain.gain.setValueAtTime(isCritical ? 0.9 : 0.65, t);\n      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);\n\n      noise.connect(noiseFilter);\n      noiseFilter.connect(noiseGain);\n      noiseGain.connect(this.ctx.destination);\n\n      // Deep sub-bass punch impact\n      const punchOsc = this.ctx.createOscillator();\n      const punchGain = this.ctx.createGain();\n      punchOsc.type = \u0027triangle\u0027;\n      punchOsc.frequency.setValueAtTime(isCritical ? 180 : 130, t);\n      punchOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);\n\n      punchGain.gain.setValueAtTime(isCritical ? 0.8 : 0.5, t);\n      punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);\n\n      punchOsc.connect(punchGain);\n      punchGain.connect(this.ctx.destination);\n\n      noise.start(t);\n      punchOsc.start(t);\n      punchOsc.stop(t + 0.31);\n    } catch (e) {}\n  }\n\n  // 3. Ding-Dong Correct Sound (딩동댕!)\n  playCorrect() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6\n      const t = this.ctx.currentTime;\n\n      notes.forEach((freq, i) =\u003e {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n\n        osc.type = \u0027sine\u0027;\n        osc.frequency.setValueAtTime(freq, t + i * 0.08);\n\n        gain.gain.setValueAtTime(0.001, t + i * 0.08);\n        gain.gain.linearRampToValueAtTime(0.3, t + i * 0.08 + 0.02);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + i * 0.08);\n        osc.stop(t + i * 0.08 + 0.45);\n      });\n    } catch (e) {}\n  }\n\n  // 4. Buzzer Wrong Sound (삐-익!)\n  playWrong() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n\n      const osc1 = this.ctx.createOscillator();\n      const osc2 = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc1.type = \u0027sawtooth\u0027;\n      osc2.type = \u0027sawtooth\u0027;\n\n      osc1.frequency.setValueAtTime(140, t);\n      osc2.frequency.setValueAtTime(147, t); // dissonant dissonance\n\n      gain.gain.setValueAtTime(0.25, t);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n      osc1.connect(gain);\n      osc2.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc1.start(t);\n      osc2.start(t);\n      osc1.stop(t + 0.36);\n      osc2.stop(t + 0.36);\n    } catch (e) {}\n  }\n\n  // 5. Timer tick\n  playTick() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc.type = \u0027triangle\u0027;\n      osc.frequency.setValueAtTime(800, t);\n\n      gain.gain.setValueAtTime(0.15, t);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);\n\n      osc.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t);\n      osc.stop(t + 0.06);\n    } catch (e) {}\n  }\n\n  // 6. Match Victory Fanfare\n  playVictory() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const chords = [\n        { notes: [523.25, 659.25], time: 0, dur: 0.18 },\n        { notes: [523.25, 659.25], time: 0.2, dur: 0.18 },\n        { notes: [523.25, 659.25], time: 0.4, dur: 0.18 },\n        { notes: [659.25, 783.99, 1046.50], time: 0.65, dur: 0.8 }\n      ];\n\n      chords.forEach(c =\u003e {\n        c.notes.forEach(freq =\u003e {\n          const osc = this.ctx.createOscillator();\n          const gain = this.ctx.createGain();\n          osc.type = \u0027triangle\u0027;\n          osc.frequency.setValueAtTime(freq, t + c.time);\n\n          gain.gain.setValueAtTime(0.01, t + c.time);\n          gain.gain.linearRampToValueAtTime(0.25, t + c.time + 0.03);\n          gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);\n\n          osc.connect(gain);\n          gain.connect(this.ctx.destination);\n\n          osc.start(t + c.time);\n          osc.stop(t + c.time + c.dur + 0.05);\n        });\n      });\n    } catch (e) {}\n  }\n\n  // 7. Defeat Sad sound\n  playDefeat() {\n    try {\n      if (!this.enabled) return;\n      this.init();\n      if (!this.ctx) return;\n      const t = this.ctx.currentTime;\n      const notes = [440, 415.3, 392, 349.2];\n      notes.forEach((freq, i) =\u003e {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n        osc.type = \u0027sawtooth\u0027;\n        osc.frequency.setValueAtTime(freq, t + i * 0.25);\n\n        gain.gain.setValueAtTime(0.18, t + i * 0.25);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.28);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + i * 0.25);\n        osc.stop(t + i * 0.25 + 0.3);\n      });\n    } catch (e) {}\n  }\n}\n\nwindow.soundFX = new SoundFX();\n" },
  '/js/particles.js': { type: 'application/javascript; charset=utf-8', content: "// Dynamic Water Balloon \u0026 Splash Particle FX Engine\n\nclass BattleFX {\n  constructor(canvasId) {\n    this.canvas = document.getElementById(canvasId);\n    this.ctx = this.canvas.getContext(\u00272d\u0027);\n    this.projectiles = [];\n    this.particles = [];\n    this.shockwaves = [];\n    this.floatingTexts = [];\n    this.animating = false;\n\n    this.resize();\n    window.addEventListener(\u0027resize\u0027, () =\u003e this.resize());\n    this.loop();\n  }\n\n  resize() {\n    if (!this.canvas) return;\n    const rect = this.canvas.parentElement.getBoundingClientRect();\n    this.canvas.width = rect.width;\n    this.canvas.height = rect.height;\n  }\n\n  // Launch a water balloon from player to opponent (or vice versa)\n  throwBalloon(fromPos, toPos, isCritical, damage, onHitCallback) {\n    window.soundFX.playThrow();\n\n    const duration = 650; // ms flight time\n    const heightArc = Math.min(180, Math.abs(toPos.x - fromPos.x) * 0.35 + 80);\n\n    const projectile = {\n      startX: fromPos.x,\n      startY: fromPos.y,\n      targetX: toPos.x,\n      targetY: toPos.y,\n      heightArc,\n      startTime: performance.now(),\n      duration,\n      isCritical,\n      damage,\n      onHitCallback,\n      color: isCritical ? \u0027#00e5ff\u0027 : \u0027#00b0ff\u0027,\n      tailParticles: []\n    };\n\n    this.projectiles.push(projectile);\n  }\n\n  // Create splash explosion at coordinates\n  createSplash(x, y, isCritical, damage) {\n    window.soundFX.playSplash(isCritical);\n\n    // Screen Shake effect\n    this.triggerScreenShake(isCritical ? 14 : 8);\n\n    // 1. Water Shockwave Ripple\n    this.shockwaves.push({\n      x,\n      y,\n      radius: 10,\n      maxRadius: isCritical ? 130 : 90,\n      opacity: 0.9,\n      color: isCritical ? \u0027rgba(0, 229, 255,\u0027 : \u0027rgba(56, 189, 248,\u0027\n    });\n\n    // 2. 45 Water Droplets Explosion\n    const dropletCount = isCritical ? 55 : 38;\n    for (let i = 0; i \u003c dropletCount; i++) {\n      const angle = Math.random() * Math.PI * 2;\n      const speed = Math.random() * (isCritical ? 14 : 10) + 3;\n      const size = Math.random() * 6 + 3;\n      this.particles.push({\n        x,\n        y,\n        vx: Math.cos(angle) * speed,\n        vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // bias upwards\n        size,\n        color: Math.random() \u003e 0.3 ? \u0027#38bdf8\u0027 : \u0027#e0f2fe\u0027,\n        alpha: 1,\n        decay: Math.random() * 0.02 + 0.015,\n        gravity: 0.38\n      });\n    }\n\n    // 3. Floating Damage / Critical Text\n    this.floatingTexts.push({\n      x: x + (Math.random() * 40 - 20),\n      y: y - 20,\n      text: isCritical ? `⚡-${damage} 치명타!` : `💥-${damage} HP`,\n      color: isCritical ? \u0027#facc15\u0027 : \u0027#ef4444\u0027,\n      fontSize: isCritical ? 34 : 26,\n      alpha: 1,\n      vy: -2.2,\n      scale: 1.4\n    });\n  }\n\n  triggerScreenShake(intensity = 10) {\n    const container = document.getElementById(\u0027game-arena\u0027) || document.body;\n    container.classList.remove(\u0027screen-shake\u0027, \u0027screen-shake-intense\u0027);\n    void container.offsetWidth; // trigger reflow\n    container.classList.add(intensity \u003e 10 ? \u0027screen-shake-intense\u0027 : \u0027screen-shake\u0027);\n    setTimeout(() =\u003e {\n      container.classList.remove(\u0027screen-shake\u0027, \u0027screen-shake-intense\u0027);\n    }, 450);\n  }\n\n  loop() {\n    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n    const now = performance.now();\n\n    // 1. Update \u0026 Draw Projectiles\n    for (let i = this.projectiles.length - 1; i \u003e= 0; i--) {\n      const p = this.projectiles[i];\n      const progress = Math.min(1, (now - p.startTime) / p.duration);\n\n      // Parabolic Arc calculation\n      const curX = p.startX + (p.targetX - p.startX) * progress;\n      const linearY = p.startY + (p.targetY - p.startY) * progress;\n      const arcY = -4 * p.heightArc * progress * (1 - progress);\n      const curY = linearY + arcY;\n\n      // Draw Water Balloon\n      this.ctx.save();\n      this.ctx.translate(curX, curY);\n\n      // Slight rotation \u0026 liquid squish effect\n      const squish = 1 + Math.sin(progress * Math.PI * 4) * 0.18;\n      this.ctx.scale(squish, 2 - squish);\n\n      // Water Balloon Body\n      const grad = this.ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);\n      grad.addColorStop(0, \u0027#ffffff\u0027);\n      grad.addColorStop(0.3, p.color);\n      grad.addColorStop(1, \u0027#0284c7\u0027);\n\n      this.ctx.beginPath();\n      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);\n      this.ctx.fillStyle = grad;\n      this.ctx.shadowColor = p.color;\n      this.ctx.shadowBlur = p.isCritical ? 18 : 10;\n      this.ctx.fill();\n\n      // Balloon tie knot\n      this.ctx.beginPath();\n      this.ctx.ellipse(progress \u003c 0.5 ? -15 : 15, 2, 4, 6, 0, 0, Math.PI * 2);\n      this.ctx.fillStyle = \u0027#0369a1\u0027;\n      this.ctx.fill();\n\n      this.ctx.restore();\n\n      // Water droplet trail\n      if (Math.random() \u003e 0.2) {\n        this.particles.push({\n          x: curX,\n          y: curY,\n          vx: (Math.random() - 0.5) * 2,\n          vy: Math.random() * 2,\n          size: Math.random() * 4 + 2,\n          color: \u0027#7dd3fc\u0027,\n          alpha: 0.8,\n          decay: 0.05,\n          gravity: 0.1\n        });\n      }\n\n      if (progress \u003e= 1) {\n        // Hit!\n        this.createSplash(p.targetX, p.targetY, p.isCritical, p.damage);\n        if (p.onHitCallback) p.onHitCallback();\n        this.projectiles.splice(i, 1);\n      }\n    }\n\n    // 2. Shockwaves\n    for (let i = this.shockwaves.length - 1; i \u003e= 0; i--) {\n      const sw = this.shockwaves[i];\n      sw.radius += (sw.maxRadius - sw.radius) * 0.18;\n      sw.opacity -= 0.035;\n\n      if (sw.opacity \u003c= 0 || sw.radius \u003e= sw.maxRadius - 2) {\n        this.shockwaves.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.beginPath();\n      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);\n      this.ctx.strokeStyle = `${sw.color}${sw.opacity})`;\n      this.ctx.lineWidth = 5 * sw.opacity;\n      this.ctx.stroke();\n      this.ctx.restore();\n    }\n\n    // 3. Water Particles\n    for (let i = this.particles.length - 1; i \u003e= 0; i--) {\n      const pt = this.particles[i];\n      pt.x += pt.vx;\n      pt.y += pt.vy;\n      pt.vy += pt.gravity;\n      pt.alpha -= pt.decay;\n\n      if (pt.alpha \u003c= 0) {\n        this.particles.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = pt.alpha;\n      this.ctx.fillStyle = pt.color;\n      this.ctx.beginPath();\n      this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);\n      this.ctx.fill();\n      this.ctx.restore();\n    }\n\n    // 4. Floating Damage Text\n    for (let i = this.floatingTexts.length - 1; i \u003e= 0; i--) {\n      const ft = this.floatingTexts[i];\n      ft.y += ft.vy;\n      ft.alpha -= 0.02;\n      ft.scale = Math.max(1, ft.scale - 0.03);\n\n      if (ft.alpha \u003c= 0) {\n        this.floatingTexts.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = ft.alpha;\n      this.ctx.font = `900 ${ft.fontSize * ft.scale}px \u0027Jua\u0027, \u0027Pretendard\u0027, sans-serif`;\n      this.ctx.textAlign = \u0027center\u0027;\n\n      // Outline\n      this.ctx.lineWidth = 5;\n      this.ctx.strokeStyle = \u0027#000000\u0027;\n      this.ctx.strokeText(ft.text, ft.x, ft.y);\n\n      // Fill\n      this.ctx.fillStyle = ft.color;\n      this.ctx.fillText(ft.text, ft.x, ft.y);\n      this.ctx.restore();\n    }\n\n    requestAnimationFrame(() =\u003e this.loop());\n  }\n}\n\nwindow.BattleFX = BattleFX;\n" },
  '/js/app.js': { type: 'application/javascript; charset=utf-8', content: "// -------------------------------------------------------------\n// Season 3 Storage Keys \u0026 Tier Definition\n// -------------------------------------------------------------\nconst STORAGE_KEYS = {\n  USER: \u0027waterpang_s3_user\u0027,\n  LEADERBOARD: \u0027waterpang_s3_leaderboard\u0027,\n  LEGACY_S2_USER: \u0027waterpang_s2_user\u0027,\n  LEGACY_S2_LEADERBOARD: \u0027waterpang_s2_leaderboard\u0027,\n  LEGACY_USER: \u0027waterpang_user\u0027,\n  LEGACY_LEADERBOARD: \u0027waterpang_leaderboard\u0027,\n  HALL_OF_FAME: \u0027waterpang_s1_hall_of_fame\u0027,\n  WRONG_NOTES_PREFIX: \u0027waterpang_wrongnotes_\u0027\n};\n\nfunction getTierInfo(rp) {\n  if (rp \u003e= 1400) {\n    return { name: \u0027맞춤법 제왕\u0027, rank: \u0027MASTER\u0027, badge: \u0027👑\u0027, color: \u0027#8b5cf6\u0027, min: 1400, max: 2000 };\n  } else if (rp \u003e= 900) {\n    return { name: \u0027번개 물대포\u0027, rank: \u0027DIAMOND\u0027, badge: \u0027⚡\u0027, color: \u0027#06b6d4\u0027, min: 900, max: 1399 };\n  } else if (rp \u003e= 500) {\n    return { name: \u0027파도 전사\u0027, rank: \u0027GOLD\u0027, badge: \u0027🌊\u0027, color: \u0027#eab308\u0027, min: 500, max: 899 };\n  } else if (rp \u003e= 200) {\n    return { name: \u0027꼬마 물풍선\u0027, rank: \u0027SILVER\u0027, badge: \u0027🎈\u0027, color: \u0027#3b82f6\u0027, min: 200, max: 499 };\n  } else {\n    return { name: \u0027물방울\u0027, rank: \u0027BRONZE\u0027, badge: \u0027💧\u0027, color: \u0027#10b981\u0027, min: 0, max: 199 };\n  }\n}\n\nlet lastLeaderboardFetch = 0;\nasync function refreshLeaderboardCache(force = false) {\n  const now = Date.now();\n  if (!force \u0026\u0026 now - lastLeaderboardFetch \u003c 60000) return;\n  lastLeaderboardFetch = now;\n  try {\n    const res = await fetch(\u0027/api/leaderboard\u0027);\n    if (res.ok) {\n      const data = await res.json();\n      if (data.ok \u0026\u0026 Array.isArray(data.leaderboard) \u0026\u0026 data.leaderboard.length \u003e 0) {\n        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));\n      }\n    }\n  } catch (e) {}\n}\n\n// Main Game Application Logic\n\nlet currentUser = null;\nlet currentRoomId = null;\nlet eventSource = null;\nlet battleFX = null;\nlet roundTimerInterval = null;\nlet roundTimeRemaining = 10;\nlet hasAnsweredCurrentRound = false;\n\n// DOM Elements\nconst views = {\n  auth: document.getElementById(\u0027view-auth\u0027),\n  lobby: document.getElementById(\u0027view-lobby\u0027),\n  matchmaking: document.getElementById(\u0027view-matchmaking\u0027),\n  battle: document.getElementById(\u0027view-battle\u0027),\n  matchOver: document.getElementById(\u0027view-match-over\u0027)\n};\n\nfunction showView(name) {\n  Object.values(views).forEach(v =\u003e v.classList.remove(\u0027active\u0027));\n  if (views[name]) {\n    views[name].classList.add(\u0027active\u0027);\n  }\n  if (name === \u0027battle\u0027 \u0026\u0026 battleFX) {\n    setTimeout(() =\u003e battleFX.resize(), 100);\n  }\n}\n\nfunction showToast(msg) {\n  const toast = document.getElementById(\u0027toast-notification\u0027);\n  toast.innerText = msg;\n  toast.classList.add(\u0027show\u0027);\n  setTimeout(() =\u003e toast.classList.remove(\u0027show\u0027), 2600);\n}\n\n// Prohibited word dictionary (Profanity, slurs, family insults, political/bypass terms)\n// Prohibited word dictionary (Profanity, slurs, disability insults, family insults, hate speech)\nconst PROHIBITED_KEYWORDS = [\n  // 1. Explicit disability insults \u0026 slurs (User requested: 다운증후군)\n  \u0027다운증후군\u0027, \u0027다운증\u0027,\n  \u0027장애인\u0027, \u0027장애련\u0027, \u0027장애새끼\u0027, \u0027장애자\u0027, \u0027지체장애\u0027, \u0027뇌병변\u0027,\n  \u0027저능아\u0027, \u0027저능\u0027, \u0027정박아\u0027, \u0027정박\u0027, \u0027자폐아\u0027, \u0027자폐증\u0027, \u0027백치\u0027,\n  \u0027정신병자\u0027, \u0027정신병\u0027, \u0027조현병\u0027, \u0027싸이코\u0027, \u0027사이코\u0027, \u0027정신병원\u0027,\n  \u0027애자\u0027,\n\n  // 2. Family insults / Pedrip (User requested: 엄마, 아빠 etc.)\n  \u0027엄마\u0027, \u0027아빠\u0027, \u0027느금\u0027, \u0027느금마\u0027, \u0027느검마\u0027, \u0027느개비\u0027, \u0027니애미\u0027, \u0027니애비\u0027,\n  \u0027애미\u0027, \u0027애비\u0027, \u0027어미\u0027, \u0027아비\u0027, \u0027모친\u0027, \u0027부친\u0027, \u0027패드립\u0027,\n  \u0027엠창\u0027, \u0027앰창\u0027, \u0027엄창\u0027, \u0027니엄마\u0027, \u0027니아빠\u0027,\n\n  // 3. Profanity / Slurs / Bullying\n  \u0027ㅄ\u0027, \u0027ㅂㅅ\u0027, \u0027병신\u0027, \u0027븅신\u0027, \u0027등신\u0027, \u0027호구\u0027, \u0027찐따\u0027, \u0027찌질이\u0027, \u0027왕따\u0027,\n  \u0027시발\u0027, \u0027씨발\u0027, \u0027ㅅㅂ\u0027, \u0027ㅆㅂ\u0027, \u0027시바\u0027, \u0027씨바\u0027, \u0027시팔\u0027, \u0027씨팔\u0027, \u0027씹\u0027, \u0027썅\u0027,\n  \u0027개새\u0027, \u0027새끼\u0027, \u0027ㅅㄲ\u0027, \u0027개년\u0027, \u0027개놈\u0027, \u0027미친놈\u0027, \u0027미친년\u0027,\n  \u0027좆\u0027, \u0027존나\u0027, \u0027졸라\u0027, \u0027ㅈㄴ\u0027, \u0027지랄\u0027, \u0027ㅈㄹ\u0027,\n  \u0027미친\u0027, \u0027ㅁㅊ\u0027, \u0027꺼져\u0027, \u0027닥쳐\u0027,\n\n  // 4. Sexual / Vulgar \u0026 Evasion variants\n  \u0027보지\u0027, \u0027자지\u0027, \u0027섹스\u0027, \u0027쎅스\u0027, \u0027자위\u0027, \u0027딸딸이\u0027, \u0027성관계\u0027, \u0027콘돔\u0027, \u0027성기\u0027, \u0027음경\u0027, \u0027사정\u0027, \u0027유두\u0027, \u0027젖꼭지\u0027, \u0027야동\u0027, \u0027포르노\u0027, \u0027강간\u0027, \u0027성폭행\u0027,\n  \u0027보즐지\u0027, \u0027보줄지\u0027, \u0027보즑지\u0027, \u0027보즐\u0027, \u0027보줄\u0027, \u0027보쥐\u0027, \u0027보찌\u0027, \u0027보쮜\u0027, \u0027보징\u0027,\n  \u0027자즐지\u0027, \u0027자줄지\u0027, \u0027자즑지\u0027, \u0027자즐\u0027, \u0027자줄\u0027, \u0027자쥐\u0027, \u0027자찌\u0027, \u0027자쮜\u0027, \u0027자징\u0027,\n\n  // 5. Violence / Self-harm\n  \u0027자살\u0027, \u0027뒈져\u0027, \u0027죽어라\u0027, \u0027죽어\u0027, \u0027살인\u0027, \u0027칼빵\u0027,\n\n  // 6. Hate speech, discrimination \u0026 meme troll terms\n  \u0027무현\u0027, \u0027노무현\u0027, \u0027운지\u0027, \u0027바이든\u0027, \u0027김정은\u0027, \u0027윤두창\u0027, \u0027문재앙\u0027, \u0027찢재명\u0027,\n  \u0027일베\u0027, \u0027메갈\u0027, \u0027워마드\u0027, \u0027한남\u0027, \u0027한녀\u0027, \u0027틀딱\u0027, \u0027맘충\u0027, \u0027급식충\u0027, \u0027틀니\u0027,\n  \u0027짱깨\u0027, \u0027쪽발이\u0027, \u0027조센징\u0027, \u0027흑형\u0027,\n\n  // 7. Foreign insults\n  \u0027ㅗ\u0027, \u0027fuck\u0027, \u0027shit\u0027, \u0027bitch\u0027, \u0027법규\u0027, \u0027창녀\u0027, \u0027걸레\u0027\n];\n\nconst EMOJI_REGEX = /[\\u{1F000}-\\u{1FAFF}\\u{1F300}-\\u{1F5FF}\\u{1F600}-\\u{1F64F}\\u{1F680}-\\u{1F6FF}\\u{1F700}-\\u{1F77F}\\u{1F780}-\\u{1F7FF}\\u{1F800}-\\u{1F8FF}\\u{1F900}-\\u{1F9FF}\\u{1FA00}-\\u{1FA6F}\\u{1FA70}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}\\u{2300}-\\u{23FF}\\u{2B50}\\u{200D}\\u{FE0F}\\u{FE0E}]/u;\n\nconst TEACHER_ACCOUNT = {\n  id: \u002701fdd103-ef91-43d5-b0d5-8f1867d98c3e\u0027,\n  nickname: \u0027하하하하하쌤\u0027\n};\n\nfunction isProhibitedNickname(nickname, userId = null) {\n  if (!nickname || typeof nickname !== \u0027string\u0027) return { prohibited: false };\n\n  // Emoji check (No emojis allowed in nicknames)\n  if (EMOJI_REGEX.test(nickname)) {\n    return { prohibited: true, matched: \u0027이모지 사용 불가\u0027 };\n  }\n\n  const clean = nickname.replace(/[\\s_.,~!@#$%^\u0026*()=+/\\\\|?:;\u0027\"\u003c\u003e-]/g, \u0027\u0027).toLowerCase();\n\n  // Authentic teacher account is allowed (Server will verify the teacher password: 990327)\n  if (nickname.trim() === TEACHER_ACCOUNT.nickname) {\n    return { prohibited: false };\n  }\n\n  // Teacher / Admin impersonation check (Blocks all unauthorized teacher/admin accounts)\n  if (clean.includes(\u0027하하하하하쌤\u0027) || /하하하+쌤/.test(clean) || /하하하+선생(?:님)?(?:$|[0-9_])/.test(clean) || /\\[?(?:gm|관리자|운영자)\\]?/i.test(nickname)) {\n    if (userId !== TEACHER_ACCOUNT.id) {\n      return { prohibited: true, matched: \u0027선생님/관리자 사칭 방지\u0027 };\n    }\n  }\n\n  for (const word of PROHIBITED_KEYWORDS) {\n    if (clean.includes(word.toLowerCase()) || nickname.toLowerCase().includes(word.toLowerCase())) {\n      return { prohibited: true, matched: word };\n    }\n  }\n\n  // Evasion regexes (insertion of chars/spaces)\n  if (/보[줄즐즑즞즤]지/.test(clean) || /자[줄즐즑즞즤]지/.test(clean)) {\n    return { prohibited: true, matched: \u0027비속어 우회 표현\u0027 };\n  }\n  if (/보[\\s\\d_]+[지쥐찌쮜]/.test(nickname) || /자[\\s\\d_]+[지쥐찌쮜]/.test(nickname)) {\n    return { prohibited: true, matched: \u0027비속어 우회 표현\u0027 };\n  }\n  if (/무[\\s\\d_]*현/.test(nickname)) {\n    return { prohibited: true, matched: \u0027부적절한 표현 (무현)\u0027 };\n  }\n  if (/바[\\s\\d_]*이[\\s\\d_]*든/.test(nickname)) {\n    return { prohibited: true, matched: \u0027부적절한 표현 (바이든)\u0027 };\n  }\n  if (/다[\\s\\d_]*운[\\s\\d_]*증/.test(nickname)) {\n    return { prohibited: true, matched: \u0027장애 비하 표현 (다운증후군)\u0027 };\n  }\n  if (/장[\\s\\d_]*애/.test(nickname)) {\n    return { prohibited: true, matched: \u0027장애 비하 표현\u0027 };\n  }\n\n  return { prohibited: false };\n}\n\n// -------------------------------------------------------------\n// Initialization \u0026 Auth\n// -------------------------------------------------------------\ndocument.addEventListener(\u0027DOMContentLoaded\u0027, () =\u003e {\n  battleFX = new BattleFX(\u0027battle-fx-canvas\u0027);\n\n  // Check Season 3 saved session or migrate seamlessly from Season 2 / Season 1\n  let saved = localStorage.getItem(STORAGE_KEYS.USER);\n  if (!saved) {\n    const prevSaved = localStorage.getItem(STORAGE_KEYS.LEGACY_S2_USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n    if (prevSaved) {\n      try {\n        const prevParsed = JSON.parse(prevSaved);\n        if (prevParsed \u0026\u0026 prevParsed.nickname) {\n          console.log(\u0027[Season 3] Migrating account to Season 3:\u0027, prevParsed.nickname);\n          const s3User = {\n            id: prevParsed.id || (\u0027user_\u0027 + Math.random().toString(36).substring(2, 9)),\n            nickname: prevParsed.nickname,\n            password: prevParsed.password || \u0027saved_user\u0027,\n            rp: 100,\n            wins: 0,\n            losses: 0,\n            draws: 0,\n            season: 3,\n            season1_rp: prevParsed.season1_rp || prevParsed.rp || 100,\n            avatar: prevParsed.avatar || \u0027👦\u0027,\n            tier: getTierInfo(100)\n          };\n          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(s3User));\n          saved = JSON.stringify(s3User);\n        }\n      } catch (e) {\n        console.warn(\u0027Legacy migration error:\u0027, e);\n      }\n    }\n  }\n\n  if (saved) {\n    try {\n      const parsed = JSON.parse(saved);\n      if (parsed \u0026\u0026 parsed.nickname) {\n        if (isProhibitedNickname(parsed.nickname, parsed.id).prohibited) {\n          localStorage.removeItem(STORAGE_KEYS.USER);\n          alert(\u0027❌ 부적절한 닉네임으로 인해 계정 이용이 제한되었습니다.\\n새로운 바른 닉네임으로 계정을 만들어주세요!\u0027);\n          showView(\u0027auth\u0027);\n          refreshLeaderboardCache();\n          setupEventListeners();\n          return;\n        }\n        currentUser = parsed;\n        updateUserData(parsed);\n        showView(\u0027lobby\u0027);\n        initSSE(parsed.id);\n        // Proactively restore and sync account + leaderboard with server, then fetch verified profile\n        syncUserWithServer(parsed).then(() =\u003e {\n          fetchProfile(parsed.id);\n        });\n        refreshLeaderboardCache();\n      }\n    } catch (e) {\n      console.warn(\u0027Session parse warning:\u0027, e);\n    }\n  } else {\n    refreshLeaderboardCache();\n  }\n\n  setupEventListeners();\n});\n\nfunction setupEventListeners() {\n  // Sound toggle\n  const btnSound = document.getElementById(\u0027btn-sound-toggle\u0027);\n  btnSound.addEventListener(\u0027click\u0027, () =\u003e {\n    const on = window.soundFX.toggle();\n    btnSound.innerText = on ? \u0027🔊\u0027 : \u0027🔇\u0027;\n    showToast(on ? \u0027소리가 켜졌습니다.\u0027 : \u0027소리가 꺼졌습니다.\u0027);\n  });\n\n  // Logout\n  document.getElementById(\u0027btn-logout\u0027).addEventListener(\u0027click\u0027, () =\u003e {\n    if (confirm(\u0027로그아웃 하시겠습니까?\u0027)) {\n      logout();\n    }\n  });\n\n  // Auth Form \u0026 Tabs\n  let authMode = \u0027login\u0027; // \u0027login\u0027 or \u0027register\u0027\n  const tabLogin = document.getElementById(\u0027tab-login\u0027);\n  const tabRegister = document.getElementById(\u0027tab-register\u0027);\n  const btnSubmitAuth = document.getElementById(\u0027btn-submit-auth\u0027);\n  const btnForgot = document.getElementById(\u0027btn-forgot-pw\u0027);\n\n  tabLogin.addEventListener(\u0027click\u0027, () =\u003e {\n    authMode = \u0027login\u0027;\n    tabLogin.classList.add(\u0027active\u0027);\n    tabRegister.classList.remove(\u0027active\u0027);\n    btnSubmitAuth.innerText = \u0027로그인하기\u0027;\n    if (btnForgot) btnForgot.style.display = \u0027block\u0027;\n  });\n\n  tabRegister.addEventListener(\u0027click\u0027, () =\u003e {\n    authMode = \u0027register\u0027;\n    tabRegister.classList.add(\u0027active\u0027);\n    tabLogin.classList.remove(\u0027active\u0027);\n    btnSubmitAuth.innerText = \u0027새 계정 생성하기\u0027;\n    if (btnForgot) btnForgot.style.display = \u0027none\u0027;\n  });\n\n  if (btnForgot) {\n    btnForgot.addEventListener(\u0027click\u0027, () =\u003e {\n      alert(\u0027💡 [비밀번호 안내]\\n\\n1. 서버 재시작으로 복원된 계정은 간편 비밀번호로 \"saved_user\"를 입력하시면 바로 접속됩니다!\\n2. 혹시 이미 다른 친구가 사용 중인 닉네임인지 확인해보세요.\\n3. 비밀번호를 완전히 잊으신 경우 선생님께 요청하시면 비밀번호를 초기화해주실 수 있습니다.\u0027);\n    });\n  }\n\n  document.getElementById(\u0027form-auth\u0027).addEventListener(\u0027submit\u0027, async (e) =\u003e {\n    e.preventDefault();\n    const nickname = document.getElementById(\u0027auth-nickname\u0027).value.trim();\n    const password = document.getElementById(\u0027auth-password\u0027).value;\n\n    if (!nickname || !password) return;\n\n    if (authMode === \u0027register\u0027 \u0026\u0026 isProhibitedNickname(nickname).prohibited) {\n      alert(\u0027❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 사용할 수 없습니다.\\n바르고 고운 닉네임을 사용해주세요!\u0027);\n      return;\n    }\n\n    try {\n      if (authMode === \u0027register\u0027) {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch(\u0027/api/register\u0027, {\n          method: \u0027POST\u0027,\n          headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok \u0026\u0026 data.user) {\n          showToast(`\u0027${data.user.nickname}\u0027 계정이 생성되었습니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || \u0027계정 생성에 실패했습니다.\u0027);\n        }\n      } else {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch(\u0027/api/login\u0027, {\n          method: \u0027POST\u0027,\n          headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok \u0026\u0026 data.user) {\n          showToast(`\u0027${data.user.nickname}\u0027 님 환영합니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || \u0027로그인에 실패했습니다.\u0027);\n        }\n      }\n    } catch (err) {\n      alert(\u0027서버 연결 오류가 발생했습니다.\u0027);\n    }\n  });\n\n  // Lobby actions\n  document.getElementById(\u0027btn-start-matching\u0027).addEventListener(\u0027click\u0027, startMatching);\n  document.getElementById(\u0027btn-cancel-matching\u0027).addEventListener(\u0027click\u0027, cancelMatching);\n  document.getElementById(\u0027btn-return-lobby\u0027).addEventListener(\u0027click\u0027, () =\u003e {\n    if (currentUser) fetchProfile(currentUser.id);\n    showView(\u0027lobby\u0027);\n  });\n  document.getElementById(\u0027btn-rematch\u0027).addEventListener(\u0027click\u0027, () =\u003e {\n    startMatching();\n  });\n\n  // Modals\n  document.getElementById(\u0027btn-open-leaderboard\u0027).addEventListener(\u0027click\u0027, openLeaderboard);\n  document.getElementById(\u0027btn-close-leaderboard\u0027).addEventListener(\u0027click\u0027, () =\u003e {\n    document.getElementById(\u0027modal-leaderboard\u0027).classList.remove(\u0027active\u0027);\n  });\n\n  document.getElementById(\u0027btn-open-wrongnotes\u0027).addEventListener(\u0027click\u0027, openWrongNotes);\n  document.getElementById(\u0027btn-close-wrongnotes\u0027).addEventListener(\u0027click\u0027, () =\u003e {\n    document.getElementById(\u0027modal-wrongnotes\u0027).classList.remove(\u0027active\u0027);\n  });\n}\n\nfunction updateUserData(user) {\n  currentUser = user;\n  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));\n\n  // Update Header\n  document.getElementById(\u0027header-user-bar\u0027).style.display = \u0027flex\u0027;\n  document.getElementById(\u0027header-nickname\u0027).innerText = user.nickname;\n  updateTierBadge(\u0027header-tier-badge\u0027, user.tier, user.rp);\n\n  // Update Lobby\n  updateLobbyUI(user);\n}\n\nfunction loginSuccess(user) {\n  updateUserData(user);\n  showView(\u0027lobby\u0027);\n\n  // Connect SSE\n  initSSE(user.id);\n\n  // Auto-sync and cache leaderboard in background\n  syncUserWithServer(user);\n  refreshLeaderboardCache();\n}\n\nfunction logout() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  if (eventSource) {\n    eventSource.close();\n    eventSource = null;\n  }\n  currentUser = null;\n  localStorage.removeItem(STORAGE_KEYS.USER);\n  document.getElementById(\u0027header-user-bar\u0027).style.display = \u0027none\u0027;\n  showView(\u0027auth\u0027);\n}\n\nasync function syncUserWithServer(userToSync) {\n  if (!userToSync || !userToSync.nickname) return;\n  try {\n    let leaderboardSnapshot = [];\n    try {\n      const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n      if (cached) leaderboardSnapshot = JSON.parse(cached);\n    } catch (e) {}\n\n    const res = await fetch(\u0027/api/user/sync\u0027, {\n      method: \u0027POST\u0027,\n      headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },\n      body: JSON.stringify({\n        user: userToSync,\n        leaderboardSnapshot\n      })\n    });\n    const data = await res.json();\n    if (data.ok \u0026\u0026 data.user) {\n      console.log(\u0027[Sync] Account successfully preserved \u0026 restored with server:\u0027, data.user.nickname);\n      updateUserData(data.user);\n      return data.user;\n    }\n  } catch (err) {\n    console.warn(\u0027[Sync] Server sync failed (offline or container starting):\u0027, err);\n  }\n}\n\nasync function fetchProfile(userId) {\n  try {\n    const res = await fetch(`/api/profile?userId=${userId}\u0026_t=${Date.now()}`);\n    const data = await res.json();\n    if (data.ok \u0026\u0026 data.user) {\n      // Anti-downgrade shield: Protect local verified RP from lower server value\n      if (currentUser \u0026\u0026 typeof currentUser.rp === \u0027number\u0027) {\n        if (data.user.rp \u003c currentUser.rp) {\n          console.warn(`[Profile] Anti-downgrade shield: Server RP (${data.user.rp}) is lower than local verified RP (${currentUser.rp}). Syncing higher RP to server.`);\n          await syncUserWithServer(currentUser);\n          return;\n        }\n      }\n      updateUserData(data.user);\n    } else if (currentUser) {\n      // Container restarted on Render! Automatically sync and resurrect account\n      await syncUserWithServer(currentUser);\n    }\n  } catch (err) {\n    console.warn(\u0027[Profile] fetch error, syncing with server:\u0027, err);\n    if (currentUser) {\n      await syncUserWithServer(currentUser);\n    }\n  }\n}\n\nfunction updateTierBadge(elementId, tier, rp) {\n  const el = document.getElementById(elementId);\n  if (!el || !tier) return;\n  el.innerText = `${tier.badge} ${tier.name} (${rp} RP)`;\n  el.style.borderColor = tier.color;\n}\n\nfunction updateLobbyUI(user) {\n  document.getElementById(\u0027lobby-nickname\u0027).innerText = user.nickname;\n  updateTierBadge(\u0027lobby-tier-badge\u0027, user.tier, user.rp);\n  document.getElementById(\u0027stat-wins\u0027).innerText = user.wins;\n  document.getElementById(\u0027stat-losses\u0027).innerText = user.losses;\n\n  const total = user.wins + user.losses;\n  const rate = total \u003e 0 ? Math.round((user.wins / total) * 100) : 0;\n  document.getElementById(\u0027stat-winrate\u0027).innerText = `${rate}%`;\n\n  const nextThreshold = user.tier ? user.tier.max + 1 : 200;\n  const needed = Math.max(0, nextThreshold - user.rp);\n  document.getElementById(\u0027tier-next-rp\u0027).innerText = `${needed} RP`;\n}\n\n// -------------------------------------------------------------\n// SSE Real-Time Communication\n// -------------------------------------------------------------\nfunction initSSE(userId) {\n  if (eventSource) {\n    if (eventSource.readyState !== EventSource.CLOSED \u0026\u0026 eventSource.url.includes(`userId=${userId}`)) {\n      return; // Already actively connected\n    }\n    eventSource.close();\n  }\n\n  eventSource = new EventSource(`/api/events?userId=${userId}`);\n\n  eventSource.onopen = () =\u003e {\n    console.log(\u0027[SSE] Stream connected successfully\u0027);\n  };\n\n  eventSource.onmessage = (event) =\u003e {\n    try {\n      const msg = JSON.parse(event.data);\n      handleServerEvent(msg.type, msg.payload);\n    } catch (e) {\n      console.error(\u0027[SSE] Parse error:\u0027, e);\n    }\n  };\n\n  eventSource.onerror = () =\u003e {\n    console.warn(\u0027[SSE] Connection lost, browser will auto-retry...\u0027);\n  };\n}\n\nfunction handleServerEvent(type, payload) {\n  console.log(\u0027[Game Event]\u0027, type, payload);\n\n  switch (type) {\n    case \u0027MATCH_FOUND\u0027:\n      onMatchFound(payload);\n      break;\n    case \u0027ROUND_START\u0027:\n      onRoundStart(payload);\n      break;\n    case \u0027ATTACK\u0027:\n    case \u0027ROUND_RESULT\u0027:\n      onRoundResult(payload);\n      break;\n    case \u0027WRONG_ANSWER\u0027:\n      onWrongAnswer(payload);\n      break;\n    case \u0027MATCH_OVER\u0027:\n      onMatchOver(payload);\n      break;\n  }\n}\n\n// -------------------------------------------------------------\n// -------------------------------------------------------------\n// Matchmaking Flow (Dual-Channel: SSE + Guaranteed Polling Fallback)\n// -------------------------------------------------------------\nlet matchPollingInterval = null;\nlet isMatchingInProgress = false;\n\nasync function startMatching() {\n  if (!currentUser || isMatchingInProgress) return;\n  isMatchingInProgress = true;\n\n  const btnStart = document.getElementById(\u0027btn-start-matching\u0027);\n  if (btnStart) btnStart.disabled = true;\n\n  initSSE(currentUser.id);\n\n  currentRoomId = null;\n  battleData = null;\n  showView(\u0027matchmaking\u0027);\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  try {\n    const res = await fetch(\u0027/api/match/join\u0027, {\n      method: \u0027POST\u0027,\n      headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n    const data = await res.json();\n    if (!data.ok) {\n      isMatchingInProgress = false;\n      if (btnStart) btnStart.disabled = false;\n      alert(data.error || \u0027매칭 시작 실패\u0027);\n      showView(\u0027lobby\u0027);\n      return;\n    }\n\n    // 1. Instant match returned directly in join response\n    if (data.result \u0026\u0026 data.result.status === \u0027MATCHED\u0027 \u0026\u0026 data.result.roomData) {\n      console.log(\u0027[Match] Instant match via join response:\u0027, data.result.roomData);\n      onMatchFound(data.result.roomData);\n      return;\n    }\n\n    // 2. Dual-channel polling check (every 1000ms) to ensure neither player ever gets stuck\n    matchPollingInterval = setInterval(async () =\u003e {\n      const viewEl = document.getElementById(\u0027view-matchmaking\u0027);\n      if (!viewEl || !viewEl.classList.contains(\u0027active\u0027)) {\n        clearInterval(matchPollingInterval);\n        matchPollingInterval = null;\n        isMatchingInProgress = false;\n        if (btnStart) btnStart.disabled = false;\n        return;\n      }\n\n      try {\n        const pollRes = await fetch(`/api/match/status?userId=${currentUser.id}\u0026_t=${Date.now()}`);\n        const pollData = await pollRes.json();\n        if (pollData.ok \u0026\u0026 pollData.status === \u0027MATCHED\u0027 \u0026\u0026 pollData.roomData) {\n          console.log(\u0027[Match] Polling detected match:\u0027, pollData.roomData);\n          clearInterval(matchPollingInterval);\n          matchPollingInterval = null;\n          onMatchFound(pollData.roomData);\n        }\n      } catch (e) {\n        // network polling error ignored\n      }\n    }, 1000);\n\n  } catch (e) {\n    isMatchingInProgress = false;\n    if (btnStart) btnStart.disabled = false;\n    alert(\u0027서버 연결 실패\u0027);\n    showView(\u0027lobby\u0027);\n  }\n}\n\nasync function cancelMatching() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  isMatchingInProgress = false;\n  const btnStart = document.getElementById(\u0027btn-start-matching\u0027);\n  if (btnStart) btnStart.disabled = false;\n\n  if (!currentUser) return;\n  try {\n    await fetch(\u0027/api/match/cancel\u0027, {\n      method: \u0027POST\u0027,\n      headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n  } catch (e) {}\n  showView(\u0027lobby\u0027);\n}\n\n// -------------------------------------------------------------\n// Battle Scene\n// -------------------------------------------------------------\nlet battleData = null;\nlet battleSyncInterval = null;\nlet currentClientRound = 0;\n\nfunction onMatchFound(data) {\n  isMatchingInProgress = false;\n  const btnStart = document.getElementById(\u0027btn-start-matching\u0027);\n  if (btnStart) btnStart.disabled = false;\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  // Prevent duplicate execution if both SSE and polling trigger simultaneously\n  if (battleData \u0026\u0026 currentRoomId === data.roomId \u0026\u0026 views.battle.classList.contains(\u0027active\u0027)) {\n    return;\n  }\n\n  battleData = data;\n  currentRoomId = data.roomId;\n\n  // Setup Fighters\n  const isMeP1 = (data.p1.id === currentUser.id);\n  const myData = isMeP1 ? data.p1 : data.p2;\n  const oppData = isMeP1 ? data.p2 : data.p1;\n\n  // Local leaderboard rank resolver fallback\n  function getCachedRank(playerObj) {\n    if (!playerObj) return null;\n    if (playerObj.rank) return playerObj.rank;\n    try {\n      const raw = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n      if (!raw) return null;\n      const lb = JSON.parse(raw);\n      if (!Array.isArray(lb)) return null;\n      const idx = lb.findIndex(u =\u003e (playerObj.id \u0026\u0026 u.id === playerObj.id) || (playerObj.nickname \u0026\u0026 u.nickname === playerObj.nickname));\n      return idx !== -1 ? (idx + 1) : null;\n    } catch (e) {\n      return null;\n    }\n  }\n\n  // Rank display next to nickname (No robot emoji)\n  const myRank = myData.rank || (currentUser \u0026\u0026 currentUser.rank) || getCachedRank(myData) || getCachedRank(currentUser);\n  const myRankText = myRank ? ` (${myRank}위)` : \u0027\u0027;\n  document.getElementById(\u0027name-p1\u0027).innerText = `${myData.nickname}${myRankText} (나)`;\n  const av1 = document.getElementById(\u0027avatar-p1\u0027);\n  if (av1 \u0026\u0026 av1.childNodes[0]) av1.childNodes[0].nodeValue = myData.avatar || \u0027👦\u0027;\n\n  const oppRank = oppData.rank || getCachedRank(oppData);\n  const oppRankText = oppData.isBot ? \u0027 (연습봇)\u0027 : (oppRank ? ` (${oppRank}위)` : \u0027\u0027);\n  document.getElementById(\u0027name-p2\u0027).innerText = `${oppData.nickname}${oppRankText}`;\n  const av2 = document.getElementById(\u0027avatar-p2\u0027);\n  if (av2 \u0026\u0026 av2.childNodes[0]) av2.childNodes[0].nodeValue = oppData.avatar || (oppData.isBot ? \u0027🤖\u0027 : \u0027👧\u0027);\n\n  updateHpUI(\u0027p1\u0027, 100, 100);\n  updateHpUI(\u0027p2\u0027, 100, 100);\n\n  document.getElementById(\u0027quiz-question-text\u0027).innerText = \u0027상대와 연결되었습니다! 곧 1라운드가 시작됩니다!\u0027;\n  document.getElementById(\u0027quiz-options-container\u0027).innerHTML = \u0027\u0027;\n  document.getElementById(\u0027battle-live-banner\u0027).innerText = \u0027💦 먼저 정답을 맞혀 물풍선을 던지세요!\u0027;\n  document.getElementById(\u0027round-explanation-box\u0027).style.display = \u0027none\u0027;\n  currentClientRound = 0;\n\n  // Dual-channel battle state backup polling: ensures round ALWAYS starts even if SSE lags or drops\n  if (battleSyncInterval) clearInterval(battleSyncInterval);\n  battleSyncInterval = setInterval(async () =\u003e {\n    if (!currentRoomId || !currentUser || !views.battle.classList.contains(\u0027active\u0027)) return;\n    try {\n      const res = await fetch(`/api/game/state?roomId=${currentRoomId}\u0026userId=${currentUser.id}\u0026_t=${Date.now()}`);\n      if (res.ok) {\n        const state = await res.json();\n        if (state.ok) {\n          if (state.isEnded) {\n            clearInterval(battleSyncInterval);\n            battleSyncInterval = null;\n            return;\n          }\n          if (state.round \u003e currentClientRound \u0026\u0026 state.quiz) {\n            console.log(\u0027[BattleSync] Syncing round state via polling:\u0027, state.round);\n            onRoundStart({\n              round: state.round,\n              totalRounds: state.totalRounds,\n              quiz: state.quiz,\n              timeLimit: 10,\n              p1: state.p1,\n              p2: state.p2\n            });\n          }\n        }\n      }\n    } catch (e) {\n      console.warn(\u0027[BattleSync] Polling error:\u0027, e.message);\n    }\n  }, 1000);\n\n  showView(\u0027battle\u0027);\n}\n\nfunction updateHpUI(target, curHp, maxHp) {\n  const percent = Math.max(0, Math.min(100, (curHp / maxHp) * 100));\n  const bar = document.getElementById(`hp-bar-${target}`);\n  const text = document.getElementById(`hp-num-${target}`);\n\n  if (bar) {\n    bar.style.width = `${percent}%`;\n    bar.className = \u0027hp-bar-fill\u0027;\n    if (percent \u003c 30) bar.classList.add(\u0027danger\u0027);\n    else if (percent \u003c 60) bar.classList.add(\u0027warning\u0027);\n  }\n  if (text) {\n    text.innerText = `${curHp} / ${maxHp}`;\n  }\n}\n\nfunction onRoundStart(data) {\n  try {\n    if (!data || !data.quiz) return;\n    currentClientRound = data.round;\n    hasAnsweredCurrentRound = false;\n\n    // Sync HP bars with server state\n    if (data.p1 \u0026\u0026 data.p2 \u0026\u0026 currentUser) {\n      const isMeP1 = (battleData \u0026\u0026 battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1.id === currentUser.id);\n      const myHp = isMeP1 ? data.p1.hp : data.p2.hp;\n      const oppHp = isMeP1 ? data.p2.hp : data.p1.hp;\n      updateHpUI(\u0027p1\u0027, typeof myHp === \u0027number\u0027 ? myHp : 100, 100);\n      updateHpUI(\u0027p2\u0027, typeof oppHp === \u0027number\u0027 ? oppHp : 100, 100);\n    }\n    const expBox = document.getElementById(\u0027round-explanation-box\u0027);\n    if (expBox) expBox.style.display = \u0027none\u0027;\n\n    // Round indicator\n    const roundInd = document.getElementById(\u0027battle-round-indicator\u0027);\n    if (roundInd) roundInd.innerText = `라운드 ${data.round} / ${data.totalRounds || 10}`;\n    const liveBanner = document.getElementById(\u0027battle-live-banner\u0027);\n    if (liveBanner) liveBanner.innerText = \u0027문제를 읽고 빠르게 정답을 누르세요!\u0027;\n\n    // Reset drenched cards\n    const cardP1 = document.getElementById(\u0027fighter-p1\u0027);\n    const cardP2 = document.getElementById(\u0027fighter-p2\u0027);\n    if (cardP1) cardP1.classList.remove(\u0027drenched\u0027);\n    if (cardP2) cardP2.classList.remove(\u0027drenched\u0027);\n\n    // Render question\n    const qText = document.getElementById(\u0027quiz-question-text\u0027);\n    if (qText) qText.innerText = data.quiz.question;\n\n    // Render Options\n    const container = document.getElementById(\u0027quiz-options-container\u0027);\n    if (container) {\n      container.innerHTML = \u0027\u0027;\n      let opts = Array.isArray(data.quiz.options) ? [...data.quiz.options] : [];\n      if (opts.length \u003e= 2 \u0026\u0026 opts[0].trim() === opts[1].trim()) {\n        opts[1] = opts[0] + \u0027 (오답)\u0027;\n      }\n      opts.forEach(opt =\u003e {\n        const btn = document.createElement(\u0027button\u0027);\n        btn.className = \u0027btn-option\u0027;\n        btn.innerText = opt;\n        btn.addEventListener(\u0027click\u0027, () =\u003e submitAnswer(opt, btn));\n        container.appendChild(btn);\n      });\n    }\n\n    // Start 10s Timer\n    startRoundTimer(data.timeLimit || 10);\n  } catch (err) {\n    console.error(\u0027[RoundStart] Error in onRoundStart:\u0027, err);\n  }\n}\n\nfunction startRoundTimer(seconds) {\n  clearInterval(roundTimerInterval);\n  roundTimeRemaining = seconds;\n\n  const timerNum = document.getElementById(\u0027battle-timer-num\u0027);\n  const timerFill = document.getElementById(\u0027battle-timer-fill\u0027);\n\n  if (timerNum) timerNum.innerText = roundTimeRemaining;\n  if (timerFill) timerFill.style.width = \u0027100%\u0027;\n\n  const totalMs = seconds * 1000;\n  const startAt = Date.now();\n\n  roundTimerInterval = setInterval(() =\u003e {\n    const elapsed = Date.now() - startAt;\n    const remaining = Math.max(0, totalMs - elapsed);\n    const sec = Math.ceil(remaining / 1000);\n\n    if (timerNum) timerNum.innerText = sec;\n    if (timerFill) timerFill.style.width = `${(remaining / totalMs) * 100}%`;\n\n    if (sec \u003c= 3 \u0026\u0026 sec \u003e 0 \u0026\u0026 remaining % 1000 \u003c 100) {\n      try { window.soundFX?.playTick(); } catch (e) {}\n    }\n\n    if (remaining \u003c= 0) {\n      clearInterval(roundTimerInterval);\n      // Disable buttons immediately on round timeout to prevent late click contamination\n      const buttons = document.querySelectorAll(\u0027.btn-option\u0027);\n      buttons.forEach(b =\u003e b.disabled = true);\n    }\n  }, 100);\n}\n\nasync function submitAnswer(answer, clickedBtn) {\n  if (hasAnsweredCurrentRound || !currentRoomId) return;\n  hasAnsweredCurrentRound = true;\n\n  // Disable all options\n  const buttons = document.querySelectorAll(\u0027.btn-option\u0027);\n  buttons.forEach(b =\u003e b.disabled = true);\n\n  try {\n    await fetch(\u0027/api/game/answer\u0027, {\n      method: \u0027POST\u0027,\n      headers: { \u0027Content-Type\u0027: \u0027application/json\u0027 },\n      body: JSON.stringify({\n        roomId: currentRoomId,\n        userId: currentUser.id,\n        answer\n      })\n    });\n  } catch (e) {\n    console.error(\u0027Answer send error:\u0027, e);\n  }\n}\n\nfunction onWrongAnswer(data) {\n  try {\n    const isMe = (data.userId === currentUser.id);\n\n    if (isMe) {\n      try { window.soundFX?.playWrong(); } catch (e) {}\n      showToast(\u0027❌ 아쉽게도 오답입니다! 이번 라운드는 기회가 끝났습니다.\u0027);\n\n      // Mark clicked button red\n      const buttons = document.querySelectorAll(\u0027.btn-option\u0027);\n      buttons.forEach(b =\u003e {\n        if (b.innerText === data.userAnswer) {\n          b.classList.add(\u0027wrong-pick\u0027);\n        }\n        b.disabled = true;\n      });\n\n      const banner = document.getElementById(\u0027battle-live-banner\u0027);\n      if (banner) banner.innerText = \u0027❌ 아쉽게도 오답입니다! 상대방에게 기회가 넘어갔습니다.\u0027;\n    } else {\n      const banner = document.getElementById(\u0027battle-live-banner\u0027);\n      if (banner) banner.innerText = `💦 상대방(${data.nickname || \u0027상대\u0027})이 오답을 선택했습니다! 서둘러 맞히세요!`;\n    }\n  } catch (e) {\n    console.error(\u0027[WrongAnswer] UI error:\u0027, e);\n  }\n}\n\nfunction onRoundResult(data) {\n  try {\n    clearInterval(roundTimerInterval);\n\n    // Show explanation box\n    const explBox = document.getElementById(\u0027round-explanation-box\u0027);\n    if (explBox \u0026\u0026 data.correctAnswer) {\n      explBox.style.display = \u0027block\u0027;\n      explBox.innerHTML = `\u003cstrong\u003e💡 정답: ${data.correctAnswer}\u003c/strong\u003e\u003cbr\u003e${data.explanation || \u0027\u0027}`;\n    }\n\n    // Highlight correct option button green\n    const buttons = document.querySelectorAll(\u0027.btn-option\u0027);\n    buttons.forEach(b =\u003e {\n      b.disabled = true;\n      if (b.innerText === data.correctAnswer) {\n        b.classList.add(\u0027correct-pick\u0027);\n      }\n    });\n\n    const hasWinner = (data.type === \u0027ATTACK\u0027 || !!data.winnerId);\n\n    if (hasWinner) {\n      const isMeWinner = (data.winnerId === currentUser.id);\n\n      // Resize FX canvas\n      if (battleFX) {\n        try { battleFX.resize(); } catch (e) {}\n      }\n\n      // In DOM, avatar-p1 is ALWAYS ME (left), avatar-p2 is ALWAYS OPPONENT (right)\n      const elP1 = document.getElementById(\u0027avatar-p1\u0027);\n      const elP2 = document.getElementById(\u0027avatar-p2\u0027);\n      const canvas = document.getElementById(\u0027battle-fx-canvas\u0027);\n\n      let p1Pos = { x: 120, y: 140 };\n      let p2Pos = { x: 420, y: 140 };\n\n      if (elP1 \u0026\u0026 elP2 \u0026\u0026 canvas) {\n        const p1Rect = elP1.getBoundingClientRect();\n        const p2Rect = elP2.getBoundingClientRect();\n        const cRect = canvas.getBoundingClientRect();\n\n        if (cRect.width \u003e 0 \u0026\u0026 cRect.height \u003e 0) {\n          p1Pos = {\n            x: p1Rect.left + p1Rect.width / 2 - cRect.left,\n            y: p1Rect.top + p1Rect.height / 2 - cRect.top\n          };\n          p2Pos = {\n            x: p2Rect.left + p2Rect.width / 2 - cRect.left,\n            y: p2Rect.top + p2Rect.height / 2 - cRect.top\n          };\n        }\n      }\n\n      // Fix Bug 1: Winner ALWAYS throws AT the loser!\n      // p1Pos is ME, p2Pos is OPPONENT\n      const fromPos = isMeWinner ? p1Pos : p2Pos;\n      const toPos = isMeWinner ? p2Pos : p1Pos;\n      const victimCardId = isMeWinner ? \u0027fighter-p2\u0027 : \u0027fighter-p1\u0027;\n\n      if (isMeWinner) {\n        try { window.soundFX?.playCorrect(); } catch (e) {}\n        const banner = document.getElementById(\u0027battle-live-banner\u0027);\n        if (banner) banner.innerHTML = `🎉 \u003cstrong\u003e정답!\u003c/strong\u003e 시원하게 물풍선을 투척합니다! 💦`;\n      } else {\n        try { window.soundFX?.playWrong(); } catch (e) {}\n        const banner = document.getElementById(\u0027battle-live-banner\u0027);\n        if (banner) banner.innerHTML = `💦 상대방(${data.winnerName || \u0027상대\u0027})이 정답을 맞혀 물풍선을 던집니다!`;\n      }\n\n      // Safe extraction of HP\n      const isRoomP1Me = (battleData \u0026\u0026 battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1 \u0026\u0026 data.p1.id === currentUser.id);\n      const p1Hp = (data.p1 \u0026\u0026 typeof data.p1.hp === \u0027number\u0027) ? data.p1.hp : (typeof data.p1Hp === \u0027number\u0027 ? data.p1Hp : 100);\n      const p2Hp = (data.p2 \u0026\u0026 typeof data.p2.hp === \u0027number\u0027) ? data.p2.hp : (typeof data.p2Hp === \u0027number\u0027 ? data.p2Hp : 100);\n\n      const myHp = isRoomP1Me ? p1Hp : p2Hp;\n      const oppHp = isRoomP1Me ? p2Hp : p1Hp;\n\n      const applyDamage = () =\u003e {\n        const victimCard = document.getElementById(victimCardId);\n        if (victimCard) victimCard.classList.add(\u0027drenched\u0027);\n        updateHpUI(\u0027p1\u0027, myHp, 100);\n        updateHpUI(\u0027p2\u0027, oppHp, 100);\n      };\n\n      if (battleFX) {\n        try {\n          battleFX.throwBalloon(fromPos, toPos, false, data.damage || 20, applyDamage);\n        } catch (e) {\n          applyDamage();\n        }\n        setTimeout(applyDamage, 700);\n      } else {\n        applyDamage();\n      }\n\n    } else {\n      // Both wrong or timeout\n      try { window.soundFX?.playWrong(); } catch (e) {}\n      const banner = document.getElementById(\u0027battle-live-banner\u0027);\n      if (banner) {\n        if (data.allWrong) {\n          banner.innerText = \u0027😅 양쪽 모두 오답입니다! 물풍선 없이 다음 라운드로 넘어갑니다.\u0027;\n        } else {\n          banner.innerText = data.timeout ? \u0027⌛ 시간 초과! 아무도 맞히지 못했습니다.\u0027 : \u0027😅 둘 다 오답으로 물풍선이 날아가지 않았습니다.\u0027;\n        }\n      }\n    }\n\n    // Client-side Round Transition Backup Timer:\n    // If next round (or match over) does not trigger within 3.2s, force sync state with server\n    const resolvedRound = data.round;\n    setTimeout(async () =\u003e {\n      if (currentClientRound === resolvedRound \u0026\u0026 currentRoomId \u0026\u0026 views.battle.classList.contains(\u0027active\u0027)) {\n        console.log(\u0027[TransitionSafety] Round\u0027, resolvedRound, \u0027transition did not arrive in 3.2s. Force-syncing state...\u0027);\n        try {\n          const res = await fetch(`/api/game/state?roomId=${currentRoomId}\u0026userId=${currentUser.id}\u0026_t=${Date.now()}`);\n          if (res.ok) {\n            const state = await res.json();\n            if (state.ok) {\n              if (state.isEnded) {\n                return;\n              }\n              if (state.round \u003e currentClientRound \u0026\u0026 state.quiz) {\n                console.log(\u0027[TransitionSafety] Advanced to round\u0027, state.round, \u0027via safety poll\u0027);\n                onRoundStart({\n                  round: state.round,\n                  totalRounds: state.totalRounds,\n                  quiz: state.quiz,\n                  timeLimit: 10,\n                  p1: state.p1,\n                  p2: state.p2\n                });\n              }\n            }\n          }\n        } catch (e) {\n          console.warn(\u0027[TransitionSafety] Sync failed:\u0027, e);\n        }\n      }\n    }, 3200);\n\n  } catch (err) {\n    console.error(\u0027[RoundResult] Error in onRoundResult:\u0027, err);\n  }\n}\n\nfunction onMatchOver(data) {\n  if (battleSyncInterval) {\n    clearInterval(battleSyncInterval);\n    battleSyncInterval = null;\n  }\n  clearInterval(roundTimerInterval);\n\n  setTimeout(() =\u003e {\n    showView(\u0027matchOver\u0027);\n\n    const isMeP1 = (data.p1.id === currentUser.id);\n    const myResult = isMeP1 ? data.p1 : data.p2;\n\n    const resultEmoji = document.getElementById(\u0027result-emoji\u0027);\n    const resultTitle = document.getElementById(\u0027result-title\u0027);\n    const rpBadge = document.getElementById(\u0027result-rp-badge\u0027);\n\n    // Extract clean numeric RP safely\n    let currentTotalRp = 100;\n    if (typeof myResult.newRp === \u0027number\u0027) {\n      currentTotalRp = myResult.newRp;\n    } else if (myResult.newRp \u0026\u0026 typeof myResult.newRp.rp === \u0027number\u0027) {\n      currentTotalRp = myResult.newRp.rp;\n    } else if (currentUser \u0026\u0026 typeof currentUser.rp === \u0027number\u0027) {\n      currentTotalRp = Math.max(0, currentUser.rp + (myResult.rpChange || 0));\n    }\n\n    // Keep currentUser in sync\n    if (currentUser) {\n      currentUser.rp = currentTotalRp;\n      try {\n        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));\n        updateUserData(currentUser);\n      } catch (e) {}\n    }\n\n    const changeVal = myResult.rpChange || 0;\n    const changeText = changeVal \u003e 0 ? `+${changeVal}` : `${changeVal}`;\n\n    isMatchingInProgress = false;\n    const btnStart = document.getElementById(\u0027btn-start-matching\u0027);\n    if (btnStart) btnStart.disabled = false;\n\n    if (myResult.result === \u0027WIN\u0027) {\n      try { window.soundFX?.playVictory(); } catch (e) {}\n      resultEmoji.innerText = \u0027👑\u0027;\n      resultTitle.innerText = \u0027짜릿한 승리!\u0027;\n      resultTitle.className = \u0027result-title win\u0027;\n      rpBadge.className = \u0027rp-badge-change plus\u0027;\n      rpBadge.innerText = `${changeText} RP 획득! (현재 ${currentTotalRp} RP)`;\n    } else if (myResult.result === \u0027LOSE\u0027) {\n      try { window.soundFX?.playDefeat(); } catch (e) {}\n      resultEmoji.innerText = \u0027💧\u0027;\n      resultTitle.innerText = \u0027아쉬운 패배!\u0027;\n      resultTitle.className = \u0027result-title lose\u0027;\n      rpBadge.className = \u0027rp-badge-change minus\u0027;\n      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;\n    } else {\n      resultEmoji.innerText = \u0027🤝\u0027;\n      resultTitle.innerText = \u0027무승부!\u0027;\n      resultTitle.className = \u0027result-title draw\u0027;\n      rpBadge.className = \u0027rp-badge-change plus\u0027;\n      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;\n    }\n\n    // Render Round Recap \u0026 Automatically save unsolved rounds to client wrong notes\n    const recapList = document.getElementById(\u0027match-recap-list\u0027);\n    recapList.innerHTML = \u0027\u0027;\n\n    // Save unsolved/wrong rounds to student\u0027s local wrong notes immediately\n    try {\n      const myKey = \u0027waterpang_wrongnotes_\u0027 + currentUser.id;\n      let existingNotes = [];\n      const savedNotes = localStorage.getItem(myKey);\n      if (savedNotes) {\n        try { existingNotes = JSON.parse(savedNotes); } catch (e) {}\n      }\n      if (!Array.isArray(existingNotes)) existingNotes = [];\n\n      const newUnsolved = [];\n      const nowFormatted = new Date().toLocaleDateString(\u0027ko-KR\u0027) + \u0027 \u0027 + new Date().toLocaleTimeString(\u0027ko-KR\u0027, { hour: \u00272-digit\u0027, minute: \u00272-digit\u0027 });\n\n      (data.history || []).forEach(h =\u003e {\n        if (!h || !h.quiz) return;\n        const isMyWin = (h.winnerId === currentUser.id);\n\n        if (!isMyWin) {\n          const userAns = (h.userAnswers \u0026\u0026 h.userAnswers[currentUser.id]) || (h.allWrong ? \u0027오답 선택\u0027 : (h.timeout ? \u0027시간 초과\u0027 : \u0027상대방 정답\u0027));\n          const itemNote = {\n            id: Date.now() + Math.random(),\n            user_id: currentUser.id,\n            quiz_id: h.quiz.id,\n            question: h.quiz.question,\n            explanation: h.quiz.explanation,\n            user_answer: userAns,\n            correct_answer: h.quiz.answer,\n            created_at: nowFormatted\n          };\n          // Remove old duplicate for this quiz so latest is at top\n          const dupIdx = existingNotes.findIndex(n =\u003e n.quiz_id === h.quiz.id);\n          if (dupIdx !== -1) existingNotes.splice(dupIdx, 1);\n          newUnsolved.push(itemNote);\n        }\n\n        const div = document.createElement(\u0027div\u0027);\n        div.className = \u0027recap-item\u0027;\n        div.innerHTML = `\n          \u003cdiv\u003e\n            \u003cstrong\u003e[R${h.round}] ${h.quiz.answer}\u003c/strong\u003e: ${h.quiz.question.replace(/\\n/g, \u0027 \u0027)}\n            \u003cdiv style=\"font-size: 12px; color: #0284c7; margin-top: 2px;\"\u003e💡 ${h.quiz.explanation}\u003c/div\u003e\n          \u003c/div\u003e\n          \u003cspan style=\"font-weight: bold; white-space: nowrap; color: ${isMyWin ? \u0027#10b981\u0027 : \u0027#64748b\u0027};\"\u003e\n            ${isMyWin ? \u0027내가 맞힘 🎯\u0027 : (h.winnerName ? `${h.winnerName} 정답` : \u0027오답/시간초과\u0027)}\n          \u003c/span\u003e\n        `;\n        recapList.appendChild(div);\n      });\n\n      const mergedNotes = [...newUnsolved, ...existingNotes].slice(0, 50);\n      localStorage.setItem(myKey, JSON.stringify(mergedNotes));\n    } catch (err) {\n      console.warn(\u0027Error saving local wrong notes in recap:\u0027, err);\n    }\n\n    // Refresh profile and leaderboard cache in background\n    fetchProfile(currentUser.id);\n    refreshLeaderboardCache();\n  }, 2200);\n}\n\n// -------------------------------------------------------------\n// Modals: Leaderboard \u0026 Wrong Answer Notes\n// -------------------------------------------------------------\nfunction scrollToMyRank() {\n  const myRow = document.getElementById(\u0027my-leaderboard-row\u0027);\n  if (myRow) {\n    myRow.scrollIntoView({ behavior: \u0027smooth\u0027, block: \u0027center\u0027 });\n    myRow.classList.add(\u0027pulse-highlight\u0027);\n    setTimeout(() =\u003e myRow.classList.remove(\u0027pulse-highlight\u0027), 1200);\n  }\n}\n\nfunction renderLeaderboardItems(list, container) {\n  const summaryBox = document.getElementById(\u0027leaderboard-my-summary\u0027);\n  const modalTitle = document.getElementById(\u0027leaderboard-modal-title\u0027);\n\n  if (!Array.isArray(list) || list.length === 0) {\n    if (modalTitle) modalTitle.innerText = \u0027🏆 명예의 전당 (시즌3)\u0027;\n    if (summaryBox) summaryBox.innerHTML = \u0027\u0027;\n    container.innerHTML = \u0027\u003cdiv style=\"text-align: center; color: #64748b; padding: 20px;\"\u003e아직 기록된 학생이 없습니다. 첫 번째 챔피언이 되어보세요!\u003c/div\u003e\u0027;\n    return;\n  }\n\n  if (modalTitle) {\n    modalTitle.innerText = `🏆 명예의 전당 (시즌3) (전체 ${list.length}명)`;\n  }\n\n  // Check currentUser rank\n  const myRankIdx = currentUser\n    ? list.findIndex(u =\u003e (u.id \u0026\u0026 u.id === currentUser.id) || (u.nickname \u0026\u0026 u.nickname === currentUser.nickname))\n    : -1;\n\n  if (summaryBox) {\n    if (myRankIdx !== -1) {\n      const myUser = list[myRankIdx];\n      const rankNum = myRankIdx + 1;\n      const medal = rankNum === 1 ? \u0027🥇 \u0027 : (rankNum === 2 ? \u0027🥈 \u0027 : (rankNum === 3 ? \u0027🥉 \u0027 : \u0027\u0027));\n      const badge = (myUser.tier \u0026\u0026 myUser.tier.badge) || \u0027💧\u0027;\n      const tierName = (myUser.tier \u0026\u0026 myUser.tier.name) || \u0027물방울\u0027;\n\n      summaryBox.innerHTML = `\n        \u003cdiv class=\"my-rank-banner\" onclick=\"scrollToMyRank()\" title=\"클릭하면 내 순위 위치로 이동합니다\"\u003e\n          \u003cdiv class=\"my-rank-left\"\u003e\n            \u003cdiv class=\"my-rank-label\"\u003e⭐ 내 순위 확인 (클릭하여 위치 이동)\u003c/div\u003e\n            \u003cdiv class=\"my-rank-pos\"\u003e${medal}${rankNum}위 \u003cspan class=\"my-rank-total\"\u003e/ 전체 ${list.length}명\u003c/span\u003e\u003c/div\u003e\n          \u003c/div\u003e\n          \u003cdiv class=\"my-rank-right\"\u003e\n            \u003cdiv class=\"my-rank-tier\"\u003e${badge} ${tierName}\u003c/div\u003e\n            \u003cdiv class=\"my-rank-rp\"\u003e${myUser.rp || 100} RP\u003c/div\u003e\n            \u003cspan class=\"my-rank-jump-hint\"\u003e📍 내 위치로 이동\u003c/span\u003e\n          \u003c/div\u003e\n        \u003c/div\u003e\n      `;\n    } else if (currentUser) {\n      summaryBox.innerHTML = `\n        \u003cdiv class=\"my-rank-banner guest\"\u003e\n          \u003cdiv class=\"my-rank-left\"\u003e\n            \u003cdiv class=\"my-rank-label\"\u003e⭐ ${currentUser.nickname}님의 순위\u003c/div\u003e\n            \u003cdiv class=\"my-rank-pos\"\u003e시즌 3 등록됨 \u003cspan class=\"my-rank-total\"\u003e(전체 ${list.length}명)\u003c/span\u003e\u003c/div\u003e\n          \u003c/div\u003e\n          \u003cdiv class=\"my-rank-right\"\u003e\n            \u003cdiv style=\"font-size: 12px; color: #64748b;\"\u003e게임을 플레이하여 RP를 올려보세요! 🎮\u003c/div\u003e\n          \u003c/div\u003e\n        \u003c/div\u003e\n      `;\n    } else {\n      summaryBox.innerHTML = \u0027\u0027;\n    }\n  }\n\n  container.innerHTML = \u0027\u0027;\n  list.forEach((user, idx) =\u003e {\n    const isMe = currentUser \u0026\u0026 ((user.id \u0026\u0026 user.id === currentUser.id) || (user.nickname \u0026\u0026 user.nickname === currentUser.nickname));\n    const isTop1 = (idx === 0);\n    const isTop2 = (idx === 1);\n    const isTop3 = (idx === 2);\n\n    let rowClass = \u0027leaderboard-row\u0027;\n    if (isTop1) rowClass += \u0027 rank-1\u0027;\n    else if (isTop2) rowClass += \u0027 rank-2\u0027;\n    else if (isTop3) rowClass += \u0027 rank-3\u0027;\n    if (isMe) rowClass += \u0027 my-rank-row\u0027;\n\n    const badge = (user.tier \u0026\u0026 user.tier.badge) || \u0027💧\u0027;\n    const tierName = (user.tier \u0026\u0026 user.tier.name) || \u0027물방울\u0027;\n    const rankLabel = isTop1 ? \u0027🥇\u0027 : (isTop2 ? \u0027🥈\u0027 : (isTop3 ? \u0027🥉\u0027 : `${idx + 1}위`));\n\n    const row = document.createElement(\u0027div\u0027);\n    row.className = rowClass;\n    if (isMe) row.id = \u0027my-leaderboard-row\u0027;\n\n    row.innerHTML = `\n      \u003cdiv class=\"leaderboard-rank\"\u003e${rankLabel}\u003c/div\u003e\n      \u003cdiv class=\"leaderboard-user\"\u003e\n        \u003cspan style=\"font-size: 20px;\"\u003e${badge}\u003c/span\u003e\n        \u003cdiv\u003e\n          \u003cdiv style=\"display: flex; align-items: center;\"\u003e\n            \u003cstrong\u003e${user.nickname}\u003c/strong\u003e\n            ${isMe ? \u0027\u003cspan class=\"my-badge\"\u003e나\u003c/span\u003e\u0027 : \u0027\u0027}\n          \u003c/div\u003e\n          \u003cdiv style=\"font-size: 11px; color: #64748b;\"\u003e${tierName} · 승률 ${user.win_rate || 0}% (${user.wins || 0}승 ${user.losses || 0}패)\u003c/div\u003e\n        \u003c/div\u003e\n      \u003c/div\u003e\n      \u003cdiv style=\"font-weight: bold; color: #0284c7; font-size: 16px;\"\u003e\n        ${user.rp || 100} RP\n      \u003c/div\u003e\n    `;\n    container.appendChild(row);\n  });\n}\n\nasync function openLeaderboard() {\n  const container = document.getElementById(\u0027leaderboard-container\u0027);\n  const modalTitle = document.getElementById(\u0027leaderboard-modal-title\u0027);\n  if (modalTitle) modalTitle.innerText = \u0027🏆 명예의 전당 (시즌3)\u0027;\n\n  // Show cached leaderboard immediately\n  try {\n    const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) \u0026\u0026 parsed.length \u003e 0) {\n        renderLeaderboardItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes() || container.innerText.includes(\u0027불러오는 중\u0027)) {\n    container.innerHTML = \u0027\u003cdiv style=\"text-align: center; color: #64748b; padding: 20px;\"\u003e불러오는 중...\u003c/div\u003e\u0027;\n  }\n  document.getElementById(\u0027modal-leaderboard\u0027).classList.add(\u0027active\u0027);\n\n  setTimeout(() =\u003e {\n    const myRow = document.getElementById(\u0027my-leaderboard-row\u0027);\n    if (myRow) myRow.scrollIntoView({ behavior: \u0027smooth\u0027, block: \u0027nearest\u0027 });\n  }, 200);\n\n  try {\n    const res = await fetch(\u0027/api/leaderboard\u0027);\n    if (res.status === 304) {\n      lastLeaderboardFetch = Date.now();\n      return;\n    }\n    const data = await res.json();\n    if (data.ok \u0026\u0026 data.leaderboard) {\n      if (data.leaderboard.length \u003e 0) {\n        lastLeaderboardFetch = Date.now();\n        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));\n        renderLeaderboardItems(data.leaderboard, container);\n        setTimeout(() =\u003e {\n          const myRow = document.getElementById(\u0027my-leaderboard-row\u0027);\n          if (myRow) myRow.scrollIntoView({ behavior: \u0027smooth\u0027, block: \u0027nearest\u0027 });\n        }, 150);\n      } else if (!container.hasChildNodes() || container.innerText.includes(\u0027불러오는 중\u0027)) {\n        renderLeaderboardItems([], container);\n      }\n    }\n  } catch (e) {\n    console.warn(\u0027Leaderboard fetch error, using cache:\u0027, e);\n  }\n}\n\nfunction renderWrongNotesItems(list, container) {\n  if (!Array.isArray(list) || list.length === 0) {\n    container.innerHTML = \u0027\u003cdiv style=\"text-align: center; padding: 35px 20px; color: #10b981; font-size: 17px; font-weight: bold;\"\u003e🎉 아직 틀린 문제가 없습니다! 아주 훌륭해요!\u003c/div\u003e\u0027;\n    return;\n  }\n  container.innerHTML = \u0027\u0027;\n  list.forEach(w =\u003e {\n    const item = document.createElement(\u0027div\u0027);\n    item.style.cssText = \u0027background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);\u0027;\n    \n    const qText = w.question ? `\u003cdiv style=\"font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 8px; line-height: 1.4;\"\u003e${w.question.replace(/\\n/g, \u0027\u003cbr\u003e\u0027)}\u003c/div\u003e` : \u0027\u0027;\n    const explText = w.explanation ? `\u003cdiv style=\"background: #eff6ff; border-left: 4px solid #3b82f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #1e40af; margin-top: 8px; line-height: 1.4;\"\u003e💡 \u003cstrong\u003e해설:\u003c/strong\u003e ${w.explanation}\u003c/div\u003e` : \u0027\u0027;\n\n    item.innerHTML = `\n      \u003cdiv style=\"display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;\"\u003e\n        \u003cspan\u003e📝 문제 #${w.quiz_id || \u0027\u0027}\u003c/span\u003e\n        \u003cspan\u003e${w.created_at || \u0027\u0027}\u003c/span\u003e\n      \u003c/div\u003e\n      ${qText}\n      \u003cdiv style=\"display: flex; gap: 16px; font-size: 15px; margin-bottom: 4px; flex-wrap: wrap;\"\u003e\n        \u003cspan style=\"color: #ef4444; font-weight: bold;\"\u003e❌ 내 선택: ${w.user_answer}\u003c/span\u003e\n        \u003cspan style=\"color: #10b981; font-weight: bold;\"\u003e⭕ 정답: ${w.correct_answer}\u003c/span\u003e\n      \u003c/div\u003e\n      ${explText}\n    `;\n    container.appendChild(item);\n  });\n}\n\nasync function openWrongNotes() {\n  if (!currentUser) return;\n  const container = document.getElementById(\u0027wrongnotes-container\u0027);\n\n  // Show cached wrong answers first if available\n  try {\n    const cached = localStorage.getItem(\u0027waterpang_wrongnotes_\u0027 + currentUser.id);\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) \u0026\u0026 parsed.length \u003e 0) {\n        renderWrongNotesItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes()) {\n    container.innerHTML = \u0027\u003cdiv style=\"text-align: center; color: #64748b; padding: 20px;\"\u003e불러오는 중...\u003c/div\u003e\u0027;\n  }\n  document.getElementById(\u0027modal-wrongnotes\u0027).classList.add(\u0027active\u0027);\n\n  try {\n    const res = await fetch(`/api/profile?userId=${currentUser.id}`);\n    const data = await res.json();\n    if (data.ok \u0026\u0026 Array.isArray(data.wrongAnswers)) {\n      localStorage.setItem(\u0027waterpang_wrongnotes_\u0027 + currentUser.id, JSON.stringify(data.wrongAnswers));\n      renderWrongNotesItems(data.wrongAnswers, container);\n    }\n  } catch (e) {\n    if (!container.hasChildNodes() || container.innerText.includes(\u0027불러오는 중\u0027)) {\n      container.innerHTML = \u0027\u003cdiv style=\"color: #ef4444; text-align: center; padding: 20px;\"\u003e오답노트를 불러오지 못했습니다. 다시 시도해주세요.\u003c/div\u003e\u0027;\n    }\n  }\n}\n" }
};

// Cache-busting URLs
EMBEDDED_FILES['/css/style.css?v=3.0'] = EMBEDDED_FILES['/css/style.css'];
EMBEDDED_FILES['/js/audio.js?v=3.0'] = EMBEDDED_FILES['/js/audio.js'];
EMBEDDED_FILES['/js/particles.js?v=3.0'] = EMBEDDED_FILES['/js/particles.js'];
EMBEDDED_FILES['/js/app.js?v=3.0'] = EMBEDDED_FILES['/js/app.js'];
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
    const p1Rank = (typeof db.getUserRank === 'function') ? db.getUserRank(this.p1.id, this.p1.nickname) : null;
    const p2Rank = (this.p2.isBot || typeof db.getUserRank !== 'function') ? null : db.getUserRank(this.p2.id, this.p2.nickname);

    broadcastToRoom(this, 'MATCH_FOUND', {
      roomId: this.id,
      totalRounds: this.totalRounds,
      p1: { id: this.p1.id, nickname: this.p1.nickname, rp: this.p1.rp, rank: p1Rank, avatar: this.p1.avatar, hp: this.p1.hp },
      p2: { id: this.p2.id, nickname: this.p2.nickname, rp: this.p2.rp, rank: p2Rank, avatar: this.p2.avatar, hp: this.p2.hp, isBot: this.p2.isBot }
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
      let quizOptions = [...this.currentQuiz.options];
      if (quizOptions.length >= 2 && quizOptions[0].trim() === quizOptions[1].trim()) {
        quizOptions[1] = quizOptions[0] + ' (오답)';
      }
      broadcastToRoom(this, 'ROUND_START', {
        round: this.currentRound,
        totalRounds: this.totalRounds,
        quiz: {
          id: this.currentQuiz.id,
          question: this.currentQuiz.question,
          options: quizOptions.sort(() => Math.random() - 0.5) // shuffle options
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
      const p1Rank = (typeof db.getUserRank === 'function') ? db.getUserRank(room.p1.id, room.p1.nickname) : null;
      const p2Rank = (room.p2.isBot || typeof db.getUserRank !== 'function') ? null : db.getUserRank(room.p2.id, room.p2.nickname);
      return {
        status: 'MATCHED',
        roomId: room.id,
        roomData: {
          roomId: room.id,
          totalRounds: room.totalRounds,
          p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, rank: p1Rank, avatar: room.p1.avatar, hp: room.p1.hp },
          p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, rank: p2Rank, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
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
    const p1Rank = (typeof db.getUserRank === 'function') ? db.getUserRank(room.p1.id, room.p1.nickname) : null;
    const p2Rank = (room.p2.isBot || typeof db.getUserRank !== 'function') ? null : db.getUserRank(room.p2.id, room.p2.nickname);
    return {
      status: 'MATCHED',
      roomId: room.id,
      roomData: {
        roomId: room.id,
        totalRounds: room.totalRounds,
        p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, rank: p1Rank, avatar: room.p1.avatar, hp: room.p1.hp },
        p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, rank: p2Rank, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
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

// Bandwidth Optimizer Helper: Gzip compression + ETag + 304 Not Modified
function sendOptimized(req, res, statusCode, headers, content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const etag = '"' + crypto.createHash('md5').update(buf).digest('hex') + '"';

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { 'ETag': etag });
    res.end();
    return;
  }

  const outHeaders = {
    ...headers,
    'ETag': etag,
    'Vary': 'Accept-Encoding'
  };

  const accept = req.headers['accept-encoding'] || '';
  if (accept.includes('gzip') && buf.length > 256) {
    zlib.gzip(buf, (err, gzipped) => {
      if (err) {
        outHeaders['Content-Length'] = buf.length;
        res.writeHead(statusCode, outHeaders);
        res.end(buf);
      } else {
        outHeaders['Content-Encoding'] = 'gzip';
        outHeaders['Content-Length'] = gzipped.length;
        res.writeHead(statusCode, outHeaders);
        res.end(gzipped);
      }
    });
  } else {
    outHeaders['Content-Length'] = buf.length;
    res.writeHead(statusCode, outHeaders);
    res.end(buf);
  }
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
        const p1Rank = (typeof db.getUserRank === 'function') ? db.getUserRank(room.p1.id) : null;
        const p2Rank = (room.p2.isBot || typeof db.getUserRank !== 'function') ? null : db.getUserRank(room.p2.id);

        sendToUser(userId, 'MATCH_FOUND', {
          roomId: room.id,
          totalRounds: room.totalRounds,
          p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, rank: p1Rank, avatar: room.p1.avatar, hp: room.p1.hp },
          p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, rank: p2Rank, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
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
    return res.end(JSON.stringify({ ok: true, message: 'All users reset to Season 3 (100 RP baseline)' }));
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
      const reqNick = body.nickname.trim();
      const reqPw = String(body.password).trim();

      // Teacher account registration/claim (Always allowed with 990327)
      if (reqNick === db.TEACHER_ACCOUNT.nickname || reqNick.replace(/\s+/g, '') === '하하하하하쌤') {
        if (reqPw === db.TEACHER_ACCOUNT.password) {
          db.ensureTeacherAccount();
          const teacher = db.getUserByNickname(db.TEACHER_ACCOUNT.nickname);
          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true, user: teacher }));
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: '❌ 선생님 계정 비밀번호가 올바르지 않습니다.' }));
        }
      }

      if (db.isProhibitedNickname(reqNick).prohibited) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 계정을 생성할 수 없습니다. 바르고 고운 닉네임을 사용해주세요!' }));
      }
      try {
        const existing = db.getUserByNickname(reqNick);
        if (existing) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: '❌ 이미 사용 중인 닉네임(아이디)입니다! [기존 아이디 로그인] 탭에서 로그인해주세요.' }));
        }

        let user;
        if (body.backupUser && body.backupUser.nickname === reqNick && body.backupUser.password === reqPw) {
          user = db.restoreOrSyncUser(body.backupUser, body.leaderboardSnapshot);
        } else {
          user = db.createUser(reqNick, reqPw);
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

      const reqNick = body.nickname.trim();
      const reqPw = String(body.password).trim();

      // 1. Teacher Account Instant Authentication (990327)
      if (reqNick === db.TEACHER_ACCOUNT.nickname || reqNick.replace(/\s+/g, '') === '하하하하하쌤') {
        if (reqPw === db.TEACHER_ACCOUNT.password) {
          db.ensureTeacherAccount();
          const teacher = db.getUserByNickname(db.TEACHER_ACCOUNT.nickname) || {
            id: db.TEACHER_ACCOUNT.id,
            nickname: db.TEACHER_ACCOUNT.nickname,
            password: db.TEACHER_ACCOUNT.password,
            rp: 100,
            wins: 0,
            losses: 0,
            draws: 0,
            season: 3,
            avatar: '👨‍🏫'
          };
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ ok: true, user: teacher }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
          return res.end(JSON.stringify({ error: '❌ 선생님 계정 비밀번호가 올바르지 않습니다.' }));
        }
      }

      // 2. Prohibited nickname check for non-teacher accounts
      let user = db.getUserByNickname(reqNick);
      if (!user && body.backupUser && body.backupUser.nickname === reqNick) {
        user = db.restoreOrSyncUser(body.backupUser, body.leaderboardSnapshot);
      }
      if (db.isProhibitedNickname(reqNick, user ? user.id : null).prohibited) {
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 부적절한 닉네임으로 이용이 제한된 계정입니다. 새 계정을 생성해주세요.' }));
      }
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 등록되지 않은 아이디입니다. [새 계정 만들기] 탭에서 먼저 계정을 생성해주세요!' }));
      }

      // 3. Robust Student Password Check
      // Matches exact password, universal recovery password ('1234' / 'saved_user'), or allows claiming placeholder '1234'/'saved_user'
      const isExact = (user.password === reqPw);
      const isMasterRecovery = (reqPw === '1234' || reqPw === 'saved_user');
      const isSeededDefault = (user.password === '1234' || user.password === 'saved_user');
      const isBackupMatch = (body.backupUser && body.backupUser.id === user.id && body.backupUser.password === reqPw);

      if (isExact || isMasterRecovery || isSeededDefault || isBackupMatch) {
        // If user was using default seed placeholder and student typed their own password, save it!
        if (isSeededDefault && !isMasterRecovery && reqPw.length >= 2) {
          db.updateUserPassword(user.id, reqPw);
          user.password = reqPw;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ ok: true, user }));
      }

      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({
        error: '❌ 비밀번호가 올바르지 않습니다.\n(기존 계정 초기 비밀번호는 1234 입니다. 비밀번호에 1234 또는 saved_user 를 입력하여 접속할 수 있습니다)'
      }));
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

    sendOptimized(req, res, 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-cache'
    }, JSON.stringify({ ok: true, user, matches, wrongAnswers }));
    return;
  }

  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    // Return all students with Gzip compression and short cache (15s)
    const list = db.getLeaderboard();
    sendOptimized(req, res, 200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=30'
    }, JSON.stringify({ ok: true, leaderboard: list }));
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
        const p1Rank = (typeof db.getUserRank === 'function') ? db.getUserRank(room.p1.id, room.p1.nickname) : null;
        const p2Rank = (room.p2.isBot || typeof db.getUserRank !== 'function') ? null : db.getUserRank(room.p2.id, room.p2.nickname);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          ok: true,
          status: 'MATCHED',
          roomId: room.id,
          roomData: {
            roomId: room.id,
            totalRounds: room.totalRounds,
            p1: { id: room.p1.id, nickname: room.p1.nickname, rp: room.p1.rp, rank: p1Rank, avatar: room.p1.avatar, hp: room.p1.hp },
            p2: { id: room.p2.id, nickname: room.p2.nickname, rp: room.p2.rp, rank: p2Rank, avatar: room.p2.avatar, hp: room.p2.hp, isBot: room.p2.isBot }
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

  // 4. Bulletproof Static File Serving (Disk first, Embedded fallback with Gzip & ETag caching)
  const normPath = pathname === '/' ? '/index.html' : pathname;
  const ext = path.extname(normPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const isHtml = (ext === '' || ext === '.html');
  const cacheHeader = isHtml
    ? 'no-cache'
    : 'public, max-age=86400, stale-while-revalidate=604800';

  const cleanRelative = normPath.replace(/^\//, '');
  const candidateDiskPaths = [
    path.join(PUBLIC_DIR, cleanRelative),
    path.join(__dirname, cleanRelative),
    path.join(__dirname, 'public', cleanRelative),
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
        sendOptimized(req, res, 200, {
          'Content-Type': contentType,
          'Cache-Control': cacheHeader
        }, content);
      }
    });
    return;
  }

  // Embedded assets fallback
  if (EMBEDDED_FILES[normPath]) {
    sendOptimized(req, res, 200, {
      'Content-Type': EMBEDDED_FILES[normPath].type,
      'Cache-Control': cacheHeader
    }, EMBEDDED_FILES[normPath].content);
    return;
  }

  if (isHtml && EMBEDDED_FILES['/index.html']) {
    sendOptimized(req, res, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }, EMBEDDED_FILES['/index.html'].content);
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
