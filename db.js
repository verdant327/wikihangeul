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
  sanitizeProhibitedUsers();
  ensureTeacherAccount();
  console.log('[DB] node:sqlite database initialized successfully at', DB_PATH);
} catch (err) {
  console.warn('[DB] node:sqlite not available. Switching to persistent JSON store:', err.message);
  useJsonFallback = true;
  loadJsonStore();
  initSeason2Data();
  sanitizeProhibitedUsers();
  ensureTeacherAccount();
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
    user.season = user.season || 3;
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
    user.season = user.season || 3;
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

// Season 3 Leaderboard (Active)
function getLeaderboard(limit = null) {
  if (useJsonFallback) {
    const validUsers = (jsonStore.users || []).filter(u => u && u.nickname && !isProhibitedNickname(u.nickname, u.id).prohibited && (u.season === 3 || u.season === 2 || !u.season));
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

    // Allow Season 3 & 2 points to update users!
    // Absolute Anti-Downgrade: NEVER downgrade RP, wins, losses, draws!
    const isCurrentSeason = (userData.season === 3 || userData.season === 2 || !userData.season);

    if (isCurrentSeason) {
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
    // If incoming user is from Season 1 without season=2/3, start Season 3 at 100 RP!
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

        const isItemValid = (item.season === 3 || item.season === 2 || !item.season);
        const peerRp = (isItemValid && typeof item.rp === 'number') ? item.rp : 100;
        const peerWins = (isItemValid && typeof item.wins === 'number') ? item.wins : 0;
        const peerLosses = (isItemValid && typeof item.losses === 'number') ? item.losses : 0;
        const peerDraws = (isItemValid && typeof item.draws === 'number') ? item.draws : 0;

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
        } else if (isItemValid) {
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

module.exports = {
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
  resetToSeason3: resetToSeason2,
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
