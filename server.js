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
  console.warn('[DB] node:sqlite not available. Switching to persistent JSON store:', err.message);
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
    throw new Error('비밀번호는 2자 이상 입력해주세요.');
  }

  const existing = getUserByNickname(trimmed);
  if (existing) {
    throw new Error('❌ 이미 사용 중인 닉네임(아이디)입니다! 다른 닉네임을 사용해주세요.');
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

  try {
    const stmt = db.prepare(`
      INSERT INTO users (id, nickname, password, rp, wins, losses, draws, created_at)
      VALUES (?, ?, ?, 100, 0, 0, 0, datetime('now', 'localtime'))
    `);
    stmt.run(id, trimmed, password);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      throw new Error('❌ 이미 사용 중인 닉네임(아이디)입니다! 다른 닉네임을 사용해주세요.');
    }
    throw e;
  }

  return getUserById(id);
}

function getUserByNickname(nickname) {
  const clean = nickname.trim();
  if (useJsonFallback) {
    const user = jsonStore.users.find(u => u.nickname.trim().toLowerCase() === clean.toLowerCase());
    if (user) {
      return { ...user, tier: getTierInfo(user.rp) };
    }
    return null;
  }

  const stmt = db.prepare(`SELECT * FROM users WHERE TRIM(nickname) = ? COLLATE NOCASE`);
  const user = stmt.get(clean);
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

function restoreOrSyncUser(userData, leaderboardSnapshot = []) {
  if (!userData || !userData.nickname) return null;
  const cleanNick = userData.nickname.trim();
  let existing = getUserByNickname(cleanNick);

  if (existing) {
    let needsUpdate = false;
    let newRp = existing.rp;
    let newWins = existing.wins;
    let newLosses = existing.losses;
    let newDraws = existing.draws;

    if (userData.rp && userData.rp > existing.rp) {
      newRp = userData.rp;
      needsUpdate = true;
    }
    if (userData.wins && userData.wins > existing.wins) {
      newWins = userData.wins;
      needsUpdate = true;
    }
    if (userData.losses && userData.losses > existing.losses) {
      newLosses = userData.losses;
      needsUpdate = true;
    }

    if (needsUpdate) {
      if (useJsonFallback) {
        const idx = jsonStore.users.findIndex(u => u.id === existing.id);
        if (idx !== -1) {
          jsonStore.users[idx].rp = newRp;
          jsonStore.users[idx].wins = newWins;
          jsonStore.users[idx].losses = newLosses;
          jsonStore.users[idx].draws = newDraws;
          saveJsonStore();
        }
      } else {
        const stmt = db.prepare(`UPDATE users SET rp = ?, wins = ?, losses = ?, draws = ? WHERE id = ?`);
        stmt.run(newRp, newWins, newLosses, newDraws, existing.id);
      }
    }
  } else {
    const id = userData.id || crypto.randomUUID();
    const password = userData.password || '1234';
    const rp = typeof userData.rp === 'number' ? userData.rp : 100;
    const wins = typeof userData.wins === 'number' ? userData.wins : 0;
    const losses = typeof userData.losses === 'number' ? userData.losses : 0;
    const draws = typeof userData.draws === 'number' ? userData.draws : 0;
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
        created_at: createdAt
      });
      saveJsonStore();
    } else {
      try {
        const stmt = db.prepare(`
          INSERT INTO users (id, nickname, password, rp, wins, losses, draws, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
        `);
        stmt.run(id, cleanNick, password, rp, wins, losses, draws);
      } catch (e) {
        console.error('[DB] Resurrect error:', e.message);
      }
    }
  }

  // Restore cached leaderboard peers if provided
  if (Array.isArray(leaderboardSnapshot)) {
    for (const item of leaderboardSnapshot) {
      if (item && item.nickname) {
        const nick = item.nickname.trim();
        const found = getUserByNickname(nick);
        if (!found) {
          const lId = item.id || crypto.randomUUID();
          const lRp = typeof item.rp === 'number' ? item.rp : 100;
          const lWins = typeof item.wins === 'number' ? item.wins : 0;
          const lLosses = typeof item.losses === 'number' ? item.losses : 0;
          const lDraws = typeof item.draws === 'number' ? item.draws : 0;
          if (useJsonFallback) {
            jsonStore.users.push({
              id: lId,
              nickname: nick,
              password: 'saved_user',
              rp: lRp,
              wins: lWins,
              losses: lLosses,
              draws: lDraws,
              created_at: new Date().toISOString()
            });
          } else {
            try {
              const stmt = db.prepare(`
                INSERT INTO users (id, nickname, password, rp, wins, losses, draws, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
              `);
              stmt.run(lId, nick, 'saved_user', lRp, lWins, lLosses, lDraws);
            } catch (e) {}
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
  recordWrongAnswer,
  getWrongAnswers,
  getTierInfo,
  restoreOrSyncUser
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
  '/index.html': { type: 'text/html; charset=utf-8', content: "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>워터팡! 초등 맞춤법 퀴즈 배틀</title>\n  <link rel=\"stylesheet\" href=\"/css/style.css?v=2.0\">\n  <link rel=\"icon\" href=\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💧</text></svg>\">\n</head>\n<body>\n  <div id=\"app\">\n    <!-- Game Header -->\n    <header class=\"game-header\">\n      <div class=\"logo-title\">\n        <span>💧</span>\n        <span>워터팡! 맞춤법 배틀</span>\n      </div>\n      <div class=\"user-quick-bar\" id=\"header-user-bar\" style=\"display: none;\">\n        <span class=\"tier-badge\" id=\"header-tier-badge\">💧 물방울 (100 RP)</span>\n        <span id=\"header-nickname\" style=\"font-size: 16px; font-weight: bold;\"></span>\n        <button class=\"btn-icon\" id=\"btn-sound-toggle\" title=\"소리 켜기/끄기\">🔊</button>\n        <button class=\"btn-icon\" id=\"btn-logout\" title=\"로그아웃\">🚪</button>\n      </div>\n    </header>\n\n    <!-- 1. Auth View (Login / Register / Quick Guest) -->\n    <section class=\"view-panel active\" id=\"view-auth\">\n      <div class=\"auth-container\">\n        <div class=\"auth-logo\">🎈💦</div>\n        <div class=\"auth-card\">\n          <h2 style=\"font-size: 26px; color: #0284c7; margin-bottom: 8px;\">신나는 맞춤법 퀴즈 대결!</h2>\n          <p style=\"font-size: 14px; color: #64748b; margin-bottom: 20px;\">\n            친구들과 1대 1로 물풍선을 던지며 맞춤법 왕이 되어보세요!\n          </p>\n\n          <!-- Auth Mode Tabs -->\n          <div class=\"auth-tabs\">\n            <button type=\"button\" class=\"auth-tab active\" id=\"tab-login\">기존 아이디 로그인</button>\n            <button type=\"button\" class=\"auth-tab\" id=\"tab-register\">새 계정 만들기</button>\n          </div>\n\n          <form id=\"form-auth\">\n            <div class=\"form-group\">\n              <label class=\"form-label\" for=\"auth-nickname\">내 닉네임 (아이디)</label>\n              <input type=\"text\" id=\"auth-nickname\" class=\"form-input\" placeholder=\"예: 번개람쥐 (2~10자)\" maxlength=\"12\" required>\n            </div>\n            <div class=\"form-group\">\n              <label class=\"form-label\" for=\"auth-password\">간편 비밀번호</label>\n              <input type=\"password\" id=\"auth-password\" class=\"form-input\" placeholder=\"비밀번호 (2자 이상)\" required>\n            </div>\n\n            <button type=\"submit\" class=\"btn-primary\" id=\"btn-submit-auth\">로그인하기</button>\n          </form>\n        </div>\n      </div>\n    </section>\n\n    <!-- 2. Lobby View -->\n    <section class=\"view-panel\" id=\"view-lobby\">\n      <div class=\"lobby-grid\">\n        <!-- Profile Column -->\n        <div class=\"profile-card\">\n          <div class=\"profile-avatar-large\" id=\"lobby-avatar\">👦</div>\n          <h3 class=\"profile-name\" id=\"lobby-nickname\">학생</h3>\n          <div class=\"tier-badge\" id=\"lobby-tier-badge\" style=\"margin-bottom: 8px;\">💧 물방울 (100 RP)</div>\n          \n          <div class=\"stats-panel\">\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-wins\">0</div>\n              <div class=\"stat-label\">승리</div>\n            </div>\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-losses\">0</div>\n              <div class=\"stat-label\">패배</div>\n            </div>\n            <div class=\"stat-box\">\n              <div class=\"stat-value\" id=\"stat-winrate\">0%</div>\n              <div class=\"stat-label\">승률</div>\n            </div>\n          </div>\n\n          <div style=\"font-size: 13px; color: #64748b; width: 100%; text-align: left; margin-top: 4px;\">\n            다음 티어까지: <span id=\"tier-next-rp\" style=\"font-weight: bold; color: #0284c7;\">100 RP</span> 남음!\n          </div>\n        </div>\n\n        <!-- Main Action Column -->\n        <div class=\"lobby-main\">\n          <div class=\"hero-banner\">\n            <h2>실시간 1대 1 물풍선 배틀!</h2>\n            <p>\n              문제를 먼저 맞혀 물풍선을 날려보세요! 💥<br>\n              10문제를 풀고 승리하면 티어가 올라갑니다.\n            </p>\n            <div class=\"hero-water-balloon\">🎈</div>\n          </div>\n\n          <div class=\"action-cards\">\n            <button class=\"action-card-btn\" id=\"btn-open-leaderboard\">\n              <div class=\"action-icon\">🏆</div>\n              <div class=\"action-text\">\n                <div class=\"action-title\">명예의 전당 (랭킹)</div>\n                <div class=\"action-desc\">전체 학생 티어 순위 보기</div>\n              </div>\n            </button>\n\n            <button class=\"action-card-btn\" id=\"btn-open-wrongnotes\">\n              <div class=\"action-icon\">📝</div>\n              <div class=\"action-text\">\n                <div class=\"action-title\">나의 오답노트</div>\n                <div class=\"action-desc\">틀렸던 맞춤법 복습하기</div>\n              </div>\n            </button>\n          </div>\n\n          <button class=\"btn-primary btn-battle-start\" id=\"btn-start-matching\">\n            🚀 1대1 대결 시작! (랜덤 매칭)\n          </button>\n        </div>\n      </div>\n    </section>\n\n    <!-- 3. Matchmaking Queue View -->\n    <section class=\"view-panel\" id=\"view-matchmaking\">\n      <div class=\"matchmaking-container\">\n        <div class=\"radar-wrapper\">\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-pulse\"></div>\n          <div class=\"radar-icon\">🎯</div>\n        </div>\n        <h2 class=\"queue-status-text\">대결 상대를 찾는 중...</h2>\n        <p class=\"queue-subtext\">\n          매칭을 기다리는 친구가 없으면 <strong>3초 후 AI 봇</strong>과 대결이 시작됩니다!\n        </p>\n        <button class=\"btn-primary btn-accent\" id=\"btn-cancel-matching\" style=\"max-width: 240px;\">\n          매칭 취소\n        </button>\n      </div>\n    </section>\n\n    <!-- 4. Battle Arena View -->\n    <section class=\"view-panel\" id=\"view-battle\">\n      <div class=\"battle-container\" id=\"game-arena\">\n        <!-- Canvas for water balloons & particle explosions -->\n        <canvas id=\"battle-fx-canvas\"></canvas>\n\n        <!-- Battle Header -->\n        <div class=\"battle-top-bar\">\n          <div class=\"round-pill\" id=\"battle-round-indicator\">라운드 1 / 10</div>\n          <div class=\"battle-timer-box\">\n            <span>⏱️</span>\n            <span id=\"battle-timer-num\">10</span>s\n            <div class=\"timer-bar-bg\">\n              <div class=\"timer-bar-fill\" id=\"battle-timer-fill\"></div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Versus Arena Section -->\n        <div class=\"arena-versus\">\n          <!-- Player 1 (Me) -->\n          <div class=\"fighter-card\" id=\"fighter-p1\">\n            <div class=\"fighter-avatar\" id=\"avatar-p1\">👦\n              <div class=\"water-drips\">💦</div>\n            </div>\n            <div class=\"fighter-name\" id=\"name-p1\">나</div>\n            <div class=\"hp-gauge-wrapper\">\n              <div class=\"hp-text\">\n                <span>체력</span>\n                <span id=\"hp-num-p1\">100 / 100</span>\n              </div>\n              <div class=\"hp-bar-bg\">\n                <div class=\"hp-bar-fill\" id=\"hp-bar-p1\" style=\"width: 100%;\"></div>\n              </div>\n            </div>\n          </div>\n\n          <div class=\"vs-badge\">VS</div>\n\n          <!-- Player 2 (Opponent) -->\n          <div class=\"fighter-card\" id=\"fighter-p2\">\n            <div class=\"fighter-avatar\" id=\"avatar-p2\">🤖\n              <div class=\"water-drips\">💦</div>\n            </div>\n            <div class=\"fighter-name\" id=\"name-p2\">상대방</div>\n            <div class=\"hp-gauge-wrapper\">\n              <div class=\"hp-text\">\n                <span>체력</span>\n                <span id=\"hp-num-p2\">100 / 100</span>\n              </div>\n              <div class=\"hp-bar-bg\">\n                <div class=\"hp-bar-fill\" id=\"hp-bar-p2\" style=\"width: 100%;\"></div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <!-- Quiz Area -->\n        <div class=\"quiz-card\">\n          <div class=\"quiz-question\" id=\"quiz-question-text\">\n            문제를 불러오는 중입니다...\n          </div>\n\n          <div class=\"quiz-options-grid\" id=\"quiz-options-container\">\n            <!-- Buttons injected by app.js -->\n          </div>\n        </div>\n\n        <!-- Live Battle Action Banner -->\n        <div class=\"battle-banner\" id=\"battle-live-banner\">\n          문제를 먼저 맞히는 사람이 상대에게 물풍선을 던집니다!\n        </div>\n\n        <div class=\"explanation-box\" id=\"round-explanation-box\" style=\"display: none;\">\n          <!-- Educational spelling explanation -->\n        </div>\n      </div>\n    </section>\n\n    <!-- 5. Match Over View -->\n    <section class=\"view-panel\" id=\"view-match-over\">\n      <div class=\"match-over-container\">\n        <div class=\"result-crown\" id=\"result-emoji\">👑</div>\n        <h2 class=\"result-title win\" id=\"result-title\">대승리!</h2>\n        \n        <div class=\"rp-badge-change plus\" id=\"result-rp-badge\">\n          +25 RP 획득!\n        </div>\n\n        <div style=\"width: 100%; max-width: 600px; text-align: left; margin-bottom: 8px; font-weight: bold; color: #0284c7;\">\n          📖 이번 대결 오답/정답 퀴즈 복습\n        </div>\n        <div class=\"match-history-recap\" id=\"match-recap-list\">\n          <!-- Recap rounds injected here -->\n        </div>\n\n        <div style=\"display: flex; gap: 16px; width: 100%; max-width: 440px;\">\n          <button class=\"btn-primary\" id=\"btn-return-lobby\">로비로 이동</button>\n          <button class=\"btn-primary btn-accent\" id=\"btn-rematch\">다시 대결하기</button>\n        </div>\n      </div>\n    </section>\n\n    <!-- Modal: Leaderboard -->\n    <div class=\"modal-backdrop\" id=\"modal-leaderboard\">\n      <div class=\"modal-window\">\n        <div class=\"modal-header\">\n          <h3>🏆 명예의 전당 (티어 랭킹)</h3>\n          <button class=\"btn-close\" id=\"btn-close-leaderboard\">✕</button>\n        </div>\n        <div class=\"modal-body\">\n          <div class=\"leaderboard-list\" id=\"leaderboard-container\">\n            <!-- Leaderboard rows -->\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <!-- Modal: Wrong Answer Note -->\n    <div class=\"modal-backdrop\" id=\"modal-wrongnotes\">\n      <div class=\"modal-window\">\n        <div class=\"modal-header\">\n          <h3>📝 나의 맞춤법 오답노트</h3>\n          <button class=\"btn-close\" id=\"btn-close-wrongnotes\">✕</button>\n        </div>\n        <div class=\"modal-body\" id=\"wrongnotes-container\">\n          <!-- Wrong answer cards -->\n        </div>\n      </div>\n    </div>\n\n    <!-- Toast message -->\n    <div class=\"toast-msg\" id=\"toast-notification\"></div>\n\n    <!-- Game Footer -->\n    <footer class=\"game-footer\">\n      <span>💧 워터팡! 초등 맞춤법 배틀</span>\n      <span class=\"footer-dot\">·</span>\n      <span class=\"footer-author\">made by 하하하하하쌤</span>\n    </footer>\n  </div>\n\n  <!-- Scripts -->\n  <script src=\"/js/audio.js?v=2.0\"></script>\n  <script src=\"/js/particles.js?v=2.0\"></script>\n  <script src=\"/js/app.js?v=2.0\"></script>\n</body>\n</html>\n" },
  '/css/style.css': { type: 'text/css; charset=utf-8', content: "@import url('https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;600;800;900&display=swap');\n\n:root {\n  --primary: #0284c7;\n  --primary-hover: #0369a1;\n  --accent: #f59e0b;\n  --danger: #ef4444;\n  --success: #10b981;\n  --bg-top: #0284c7;\n  --bg-bottom: #0f172a;\n  --card-bg: rgba(255, 255, 255, 0.95);\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n  user-select: none;\n}\n\nbody {\n  font-family: 'Jua', 'Noto Sans KR', sans-serif;\n  background: linear-gradient(135deg, #0284c7 0%, #0369a1 40%, #0f172a 100%);\n  min-height: 100vh;\n  color: #1e293b;\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  overflow-x: hidden;\n}\n\n/* Base Container */\n#app {\n  width: 100%;\n  max-width: 960px;\n  min-height: 640px;\n  background: #ffffff;\n  border-radius: 28px;\n  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 6px #38bdf8;\n  display: flex;\n  flex-direction: column;\n  position: relative;\n  overflow: hidden;\n}\n\n/* Header */\n.game-header {\n  background: linear-gradient(90deg, #0284c7, #38bdf8);\n  padding: 14px 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  color: white;\n  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);\n  z-index: 10;\n}\n\n.logo-title {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-size: 24px;\n  letter-spacing: 0.5px;\n  text-shadow: 1px 2px 0px rgba(0, 0, 0, 0.2);\n}\n\n.user-quick-bar {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.tier-badge {\n  background: rgba(255, 255, 255, 0.2);\n  padding: 6px 14px;\n  border-radius: 20px;\n  font-size: 15px;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid rgba(255, 255, 255, 0.4);\n  font-weight: bold;\n}\n\n.btn-icon {\n  background: rgba(255, 255, 255, 0.25);\n  border: none;\n  border-radius: 50%;\n  width: 38px;\n  height: 38px;\n  font-size: 18px;\n  cursor: pointer;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: white;\n  transition: all 0.15s;\n}\n\n.btn-icon:hover {\n  background: rgba(255, 255, 255, 0.45);\n  transform: scale(1.08);\n}\n\n/* Views Common */\n.view-panel {\n  display: none;\n  flex: 1;\n  padding: 24px;\n  flex-direction: column;\n  position: relative;\n}\n\n.view-panel.active {\n  display: flex;\n  animation: fadeIn 0.25s ease-out;\n}\n\n@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(8px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n/* Auth View */\n.auth-container {\n  max-width: 420px;\n  margin: auto;\n  text-align: center;\n}\n\n.auth-card {\n  background: #f8fafc;\n  padding: 32px 28px;\n  border-radius: 24px;\n  border: 3px solid #e2e8f0;\n  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);\n}\n\n.auth-logo {\n  font-size: 64px;\n  margin-bottom: 12px;\n  animation: floatBounce 2.5s infinite ease-in-out;\n}\n\n@keyframes floatBounce {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-8px); }\n}\n\n.auth-tabs {\n  display: flex;\n  background: #e2e8f0;\n  border-radius: 14px;\n  padding: 4px;\n  margin-bottom: 20px;\n  gap: 6px;\n}\n\n.auth-tab {\n  flex: 1;\n  padding: 10px 12px;\n  border: none;\n  background: transparent;\n  border-radius: 10px;\n  font-family: inherit;\n  font-size: 15px;\n  font-weight: bold;\n  color: #64748b;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n\n.auth-tab.active {\n  background: white;\n  color: #0284c7;\n  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);\n}\n\n.form-group {\n  margin-bottom: 16px;\n  text-align: left;\n}\n\n.form-label {\n  font-size: 14px;\n  color: #475569;\n  margin-bottom: 6px;\n  display: block;\n}\n\n.form-input {\n  width: 100%;\n  padding: 12px 16px;\n  border: 2px solid #cbd5e1;\n  border-radius: 14px;\n  font-size: 16px;\n  font-family: inherit;\n  outline: none;\n  transition: border-color 0.2s;\n}\n\n.form-input:focus {\n  border-color: #0284c7;\n  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.2);\n}\n\n/* Buttons */\n.btn-primary {\n  width: 100%;\n  padding: 14px 20px;\n  background: linear-gradient(180deg, #38bdf8, #0284c7);\n  border: none;\n  border-bottom: 4px solid #0369a1;\n  border-radius: 16px;\n  color: white;\n  font-size: 19px;\n  font-family: inherit;\n  font-weight: bold;\n  cursor: pointer;\n  transition: all 0.1s;\n  box-shadow: 0 6px 12px rgba(2, 132, 199, 0.3);\n}\n\n.btn-primary:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 8px 16px rgba(2, 132, 199, 0.4);\n}\n\n.btn-primary:active {\n  transform: translateY(2px);\n  border-bottom-width: 2px;\n}\n\n.btn-accent {\n  background: linear-gradient(180deg, #fbbf24, #f59e0b);\n  border-bottom: 4px solid #d97706;\n  color: #451a03;\n}\n\n.btn-accent:hover {\n  background: linear-gradient(180deg, #fcd34d, #f59e0b);\n}\n\n.btn-sub {\n  background: transparent;\n  border: none;\n  color: #64748b;\n  font-size: 14px;\n  font-family: inherit;\n  margin-top: 14px;\n  cursor: pointer;\n  text-decoration: underline;\n}\n\n/* Lobby View */\n.lobby-grid {\n  display: grid;\n  grid-template-columns: 320px 1fr;\n  gap: 24px;\n  flex: 1;\n}\n\n.profile-card {\n  background: linear-gradient(160deg, #f0f9ff 0%, #e0f2fe 100%);\n  border: 3px solid #bae6fd;\n  border-radius: 24px;\n  padding: 24px;\n  text-align: center;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n}\n\n.profile-avatar-large {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: white;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.15);\n  border: 4px solid #38bdf8;\n  margin-bottom: 12px;\n}\n\n.profile-name {\n  font-size: 24px;\n  color: #0c4a6e;\n  margin-bottom: 6px;\n}\n\n.stats-panel {\n  width: 100%;\n  background: white;\n  border-radius: 16px;\n  padding: 14px;\n  margin: 16px 0;\n  display: grid;\n  grid-template-columns: 1fr 1fr 1fr;\n  gap: 8px;\n  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.04);\n}\n\n.stat-box {\n  text-align: center;\n}\n\n.stat-value {\n  font-size: 20px;\n  font-weight: bold;\n  color: #0369a1;\n}\n\n.stat-label {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.lobby-main {\n  display: flex;\n  flex-direction: column;\n  justify-content: space-between;\n}\n\n.hero-banner {\n  background: linear-gradient(135deg, #38bdf8, #0ea5e9);\n  border-radius: 24px;\n  padding: 28px;\n  color: white;\n  position: relative;\n  overflow: hidden;\n  box-shadow: 0 10px 25px rgba(14, 165, 233, 0.25);\n}\n\n.hero-banner h2 {\n  font-size: 32px;\n  margin-bottom: 8px;\n  text-shadow: 1px 2px 0 rgba(0,0,0,0.2);\n}\n\n.hero-banner p {\n  font-size: 16px;\n  opacity: 0.95;\n  line-height: 1.5;\n}\n\n.hero-water-balloon {\n  position: absolute;\n  right: 20px;\n  bottom: -10px;\n  font-size: 90px;\n  opacity: 0.85;\n  transform: rotate(15deg);\n}\n\n.action-cards {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n  margin-top: 16px;\n}\n\n.action-card-btn {\n  background: white;\n  border: 3px solid #e2e8f0;\n  border-radius: 20px;\n  padding: 18px;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n  cursor: pointer;\n  transition: all 0.2s;\n  font-family: inherit;\n}\n\n.action-card-btn:hover {\n  border-color: #38bdf8;\n  transform: translateY(-3px);\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);\n}\n\n.action-icon {\n  font-size: 34px;\n}\n\n.action-text {\n  text-align: left;\n}\n\n.action-title {\n  font-size: 17px;\n  font-weight: bold;\n  color: #1e293b;\n}\n\n.action-desc {\n  font-size: 12px;\n  color: #64748b;\n}\n\n.btn-battle-start {\n  margin-top: 18px;\n  padding: 20px;\n  font-size: 26px;\n  letter-spacing: 1px;\n}\n\n/* Matchmaking Queue View */\n.matchmaking-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  flex: 1;\n  text-align: center;\n}\n\n.radar-wrapper {\n  position: relative;\n  width: 180px;\n  height: 180px;\n  margin-bottom: 24px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n\n.radar-pulse {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  border-radius: 50%;\n  border: 3px solid #38bdf8;\n  animation: radarPulse 2s infinite ease-out;\n}\n\n.radar-pulse:nth-child(2) {\n  animation-delay: 0.6s;\n}\n\n.radar-pulse:nth-child(3) {\n  animation-delay: 1.2s;\n}\n\n@keyframes radarPulse {\n  0% { transform: scale(0.3); opacity: 1; }\n  100% { transform: scale(1.4); opacity: 0; }\n}\n\n.radar-icon {\n  font-size: 64px;\n  z-index: 2;\n}\n\n.queue-status-text {\n  font-size: 26px;\n  color: #0284c7;\n  margin-bottom: 8px;\n}\n\n.queue-subtext {\n  font-size: 15px;\n  color: #64748b;\n  margin-bottom: 24px;\n}\n\n/* Battle Arena View */\n.battle-container {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  position: relative;\n  height: 100%;\n}\n\n/* Canvas overlay for projectiles & splashes */\n#battle-fx-canvas {\n  position: absolute;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  z-index: 30;\n}\n\n.battle-top-bar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 4px 12px 14px;\n  border-bottom: 2px dashed #e2e8f0;\n}\n\n.round-pill {\n  background: #0284c7;\n  color: white;\n  padding: 6px 18px;\n  border-radius: 20px;\n  font-size: 18px;\n  font-weight: bold;\n}\n\n.battle-timer-box {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  font-size: 22px;\n  color: #d97706;\n}\n\n.timer-bar-bg {\n  width: 180px;\n  height: 14px;\n  background: #e2e8f0;\n  border-radius: 8px;\n  overflow: hidden;\n}\n\n.timer-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);\n  width: 100%;\n  transition: width 0.1s linear;\n}\n\n/* Arena Versus Section */\n.arena-versus {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 16px 20px;\n  position: relative;\n}\n\n.fighter-card {\n  width: 220px;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  transition: transform 0.2s;\n}\n\n.fighter-avatar {\n  font-size: 72px;\n  width: 110px;\n  height: 110px;\n  background: #f0f9ff;\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);\n  position: relative;\n  transition: all 0.2s;\n}\n\n.fighter-card.drenched .fighter-avatar {\n  animation: drenchedShake 0.4s ease-in-out;\n  border-color: #ef4444;\n  background: #fee2e2;\n}\n\n@keyframes drenchedShake {\n  0%, 100% { transform: scale(1) rotate(0deg); }\n  25% { transform: scale(0.92) rotate(-8deg); }\n  75% { transform: scale(0.92) rotate(8deg); }\n}\n\n.water-drips {\n  display: none;\n  position: absolute;\n  bottom: -8px;\n  font-size: 20px;\n}\n\n.fighter-card.drenched .water-drips {\n  display: block;\n}\n\n.fighter-name {\n  font-size: 20px;\n  color: #1e293b;\n  margin-top: 8px;\n}\n\n.hp-gauge-wrapper {\n  width: 100%;\n  margin-top: 8px;\n}\n\n.hp-text {\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  color: #64748b;\n  margin-bottom: 4px;\n}\n\n.hp-bar-bg {\n  width: 100%;\n  height: 16px;\n  background: #e2e8f0;\n  border-radius: 10px;\n  overflow: hidden;\n  border: 2px solid #cbd5e1;\n}\n\n.hp-bar-fill {\n  height: 100%;\n  background: linear-gradient(90deg, #10b981, #34d399);\n  width: 100%;\n  border-radius: 8px;\n  transition: width 0.35s ease-out, background 0.3s;\n}\n\n.hp-bar-fill.warning {\n  background: linear-gradient(90deg, #f59e0b, #fbbf24);\n}\n\n.hp-bar-fill.danger {\n  background: linear-gradient(90deg, #ef4444, #f87171);\n}\n\n.vs-badge {\n  font-size: 36px;\n  font-weight: 900;\n  color: #f59e0b;\n  text-shadow: 2px 3px 0 #b45309;\n  letter-spacing: 2px;\n}\n\n/* Quiz Arena */\n.quiz-card {\n  background: #f8fafc;\n  border: 3px solid #cbd5e1;\n  border-radius: 24px;\n  padding: 24px;\n  margin: 12px 0;\n  text-align: center;\n  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);\n}\n\n.quiz-question {\n  font-size: 24px;\n  line-height: 1.45;\n  color: #0f172a;\n  white-space: pre-line;\n  margin-bottom: 20px;\n}\n\n.quiz-options-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n}\n\n.btn-option {\n  background: white;\n  border: 3px solid #94a3b8;\n  border-bottom: 6px solid #64748b;\n  border-radius: 18px;\n  padding: 18px 24px;\n  font-size: 26px;\n  font-weight: bold;\n  color: #1e293b;\n  cursor: pointer;\n  transition: all 0.1s;\n  font-family: inherit;\n}\n\n.btn-option:hover:not(:disabled) {\n  border-color: #0284c7;\n  border-bottom-color: #0369a1;\n  transform: translateY(-2px);\n  background: #f0f9ff;\n}\n\n.btn-option:active:not(:disabled) {\n  transform: translateY(3px);\n  border-bottom-width: 3px;\n}\n\n.btn-option:disabled {\n  opacity: 0.6;\n  cursor: not-allowed;\n}\n\n.btn-option.correct-pick {\n  background: #dcfce7 !important;\n  border-color: #10b981 !important;\n  border-bottom-color: #059669 !important;\n  color: #065f46 !important;\n}\n\n.btn-option.wrong-pick {\n  background: #fee2e2 !important;\n  border-color: #ef4444 !important;\n  border-bottom-color: #b91c1c !important;\n  color: #991b1b !important;\n}\n\n/* Battle Action Banner */\n.battle-banner {\n  min-height: 60px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  text-align: center;\n  font-size: 18px;\n  color: #0284c7;\n  background: #f0f9ff;\n  border-radius: 14px;\n  padding: 8px 16px;\n}\n\n.explanation-box {\n  background: #eff6ff;\n  border-left: 5px solid #3b82f6;\n  padding: 10px 14px;\n  border-radius: 8px;\n  font-size: 15px;\n  color: #1e40af;\n  margin-top: 6px;\n  text-align: left;\n}\n\n/* Screen Shake Classes */\n.screen-shake {\n  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n.screen-shake-intense {\n  animation: shakeIntense 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;\n}\n\n@keyframes shake {\n  10%, 90% { transform: translate3d(-3px, 0, 0); }\n  20%, 80% { transform: translate3d(5px, 0, 0); }\n  30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }\n  40%, 60% { transform: translate3d(6px, 0, 0); }\n}\n\n@keyframes shakeIntense {\n  10%, 90% { transform: translate3d(-6px, 3px, 0) rotate(-1deg); }\n  20%, 80% { transform: translate3d(8px, -4px, 0) rotate(1.5deg); }\n  30%, 50%, 70% { transform: translate3d(-10px, 5px, 0) rotate(-2deg); }\n  40%, 60% { transform: translate3d(10px, -5px, 0) rotate(2deg); }\n}\n\n/* Match Over View */\n.match-over-container {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  text-align: center;\n  flex: 1;\n  padding: 16px 0;\n}\n\n.result-crown {\n  font-size: 72px;\n  animation: floatBounce 2s infinite ease-in-out;\n}\n\n.result-title {\n  font-size: 40px;\n  margin: 6px 0;\n}\n\n.result-title.win {\n  color: #f59e0b;\n  text-shadow: 2px 2px 0 #b45309;\n}\n\n.result-title.lose {\n  color: #64748b;\n}\n\n.result-title.draw {\n  color: #0284c7;\n}\n\n.rp-badge-change {\n  display: inline-block;\n  padding: 8px 24px;\n  border-radius: 24px;\n  font-size: 20px;\n  font-weight: bold;\n  margin-bottom: 16px;\n}\n\n.rp-badge-change.plus {\n  background: #dcfce7;\n  color: #166534;\n  border: 2px solid #86efac;\n}\n\n.rp-badge-change.minus {\n  background: #fee2e2;\n  color: #991b1b;\n  border: 2px solid #fca5a5;\n}\n\n.match-history-recap {\n  width: 100%;\n  max-height: 220px;\n  overflow-y: auto;\n  background: #f8fafc;\n  border-radius: 18px;\n  border: 2px solid #e2e8f0;\n  padding: 12px;\n  margin-bottom: 20px;\n}\n\n.recap-item {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 8px 12px;\n  border-bottom: 1px solid #e2e8f0;\n  font-size: 14px;\n}\n\n.recap-item:last-child {\n  border-bottom: none;\n}\n\n/* Modals */\n.modal-backdrop {\n  display: none;\n  position: fixed;\n  top: 0;\n  left: 0;\n  width: 100%;\n  height: 100%;\n  background: rgba(0, 0, 0, 0.6);\n  z-index: 100;\n  align-items: center;\n  justify-content: center;\n}\n\n.modal-backdrop.active {\n  display: flex;\n  animation: fadeIn 0.2s ease-out;\n}\n\n.modal-window {\n  background: white;\n  width: 90%;\n  max-width: 540px;\n  max-height: 80vh;\n  border-radius: 24px;\n  border: 4px solid #38bdf8;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);\n  display: flex;\n  flex-direction: column;\n  overflow: hidden;\n}\n\n.modal-header {\n  background: #f0f9ff;\n  padding: 16px 20px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  border-bottom: 2px solid #e2e8f0;\n}\n\n.modal-header h3 {\n  font-size: 20px;\n  color: #0369a1;\n}\n\n.modal-body {\n  padding: 20px;\n  overflow-y: auto;\n  flex: 1;\n}\n\n.leaderboard-list {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n\n.leaderboard-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 10px 14px;\n  background: #f8fafc;\n  border-radius: 12px;\n  border: 1px solid #e2e8f0;\n}\n\n.leaderboard-row.rank-1 {\n  background: #fef9c3;\n  border-color: #facc15;\n}\n\n.leaderboard-rank {\n  font-size: 18px;\n  font-weight: bold;\n  width: 32px;\n}\n\n.leaderboard-user {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: 1;\n}\n\n.btn-close {\n  background: transparent;\n  border: none;\n  font-size: 22px;\n  cursor: pointer;\n  color: #64748b;\n}\n\n/* Toast Notification */\n.toast-msg {\n  position: fixed;\n  top: 20px;\n  left: 50%;\n  transform: translateX(-50%) translateY(-30px);\n  background: #0f172a;\n  color: white;\n  padding: 12px 24px;\n  border-radius: 20px;\n  font-size: 16px;\n  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);\n  opacity: 0;\n  transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);\n  pointer-events: none;\n  z-index: 200;\n}\n\n.toast-msg.show {\n  transform: translateX(-50%) translateY(0);\n  opacity: 1;\n}\n\n/* Responsive adjustments */\n@media (max-width: 768px) {\n  #app {\n    border-radius: 0;\n    min-height: 100vh;\n    border: none;\n  }\n  .lobby-grid {\n    grid-template-columns: 1fr;\n  }\n  .arena-versus {\n    padding: 8px;\n  }\n  .fighter-avatar {\n    width: 80px;\n    height: 80px;\n    font-size: 50px;\n  }\n  .quiz-options-grid {\n    grid-template-columns: 1fr;\n  }\n}\n\n/* Footer Style */\n.game-footer {\n  text-align: center;\n  padding: 12px 16px;\n  font-size: 13px;\n  color: #64748b;\n  background: #f8fafc;\n  border-top: 2px solid #e2e8f0;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  z-index: 20;\n  margin-top: auto;\n}\n\n.footer-dot {\n  opacity: 0.5;\n}\n\n.footer-author {\n  color: #0284c7;\n  font-weight: 800;\n}\n\n" },
  '/js/audio.js': { type: 'application/javascript; charset=utf-8', content: "// Procedural Web Audio API Sound Generator\n// Zero external assets required! 100% reliable and instantaneous.\n\nclass SoundFX {\n  constructor() {\n    this.ctx = null;\n    this.enabled = true;\n  }\n\n  init() {\n    if (!this.ctx) {\n      const AudioContext = window.AudioContext || window.webkitAudioContext;\n      this.ctx = new AudioContext();\n    }\n    if (this.ctx && this.ctx.state === 'suspended') {\n      this.ctx.resume();\n    }\n  }\n\n  toggle() {\n    this.enabled = !this.enabled;\n    return this.enabled;\n  }\n\n  // 1. Water balloon throw whoosh (휙!)\n  playThrow() {\n    if (!this.enabled) return;\n    this.init();\n    const t = this.ctx.currentTime;\n\n    const osc = this.ctx.createOscillator();\n    const gain = this.ctx.createGain();\n    const filter = this.ctx.createBiquadFilter();\n\n    osc.type = 'sine';\n    osc.frequency.setValueAtTime(300, t);\n    osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);\n    osc.frequency.exponentialRampToValueAtTime(200, t + 0.35);\n\n    filter.type = 'lowpass';\n    filter.frequency.setValueAtTime(1200, t);\n\n    gain.gain.setValueAtTime(0.01, t);\n    gain.gain.linearRampToValueAtTime(0.35, t + 0.1);\n    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n    osc.connect(filter);\n    filter.connect(gain);\n    gain.connect(this.ctx.destination);\n\n    osc.start(t);\n    osc.stop(t + 0.36);\n  }\n\n  // 2. Water balloon hit & splash explosion (펑! 콰광!)\n  playSplash(isCritical = false) {\n    if (!this.enabled) return;\n    this.init();\n    const t = this.ctx.currentTime;\n    const duration = isCritical ? 0.6 : 0.45;\n\n    // White noise for water splash\n    const bufferSize = this.ctx.sampleRate * duration;\n    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);\n    const data = buffer.getChannelData(0);\n    for (let i = 0; i < bufferSize; i++) {\n      data[i] = Math.random() * 2 - 1;\n    }\n\n    const noise = this.ctx.createBufferSource();\n    noise.buffer = buffer;\n\n    const noiseFilter = this.ctx.createBiquadFilter();\n    noiseFilter.type = 'bandpass';\n    noiseFilter.frequency.setValueAtTime(isCritical ? 1400 : 900, t);\n    noiseFilter.frequency.exponentialRampToValueAtTime(200, t + duration);\n    noiseFilter.Q.setValueAtTime(2, t);\n\n    const noiseGain = this.ctx.createGain();\n    noiseGain.gain.setValueAtTime(isCritical ? 0.9 : 0.65, t);\n    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);\n\n    noise.connect(noiseFilter);\n    noiseFilter.connect(noiseGain);\n    noiseGain.connect(this.ctx.destination);\n\n    // Deep sub-bass punch impact\n    const punchOsc = this.ctx.createOscillator();\n    const punchGain = this.ctx.createGain();\n    punchOsc.type = 'triangle';\n    punchOsc.frequency.setValueAtTime(isCritical ? 180 : 130, t);\n    punchOsc.frequency.exponentialRampToValueAtTime(35, t + 0.3);\n\n    punchGain.gain.setValueAtTime(isCritical ? 0.8 : 0.5, t);\n    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);\n\n    punchOsc.connect(punchGain);\n    punchGain.connect(this.ctx.destination);\n\n    noise.start(t);\n    punchOsc.start(t);\n    punchOsc.stop(t + 0.31);\n  }\n\n  // 3. Ding-Dong Correct Sound (딩동댕!)\n  playCorrect() {\n    if (!this.enabled) return;\n    this.init();\n    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6\n    const t = this.ctx.currentTime;\n\n    notes.forEach((freq, i) => {\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n\n      osc.type = 'sine';\n      osc.frequency.setValueAtTime(freq, t + i * 0.08);\n\n      gain.gain.setValueAtTime(0.001, t + i * 0.08);\n      gain.gain.linearRampToValueAtTime(0.3, t + i * 0.08 + 0.02);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.4);\n\n      osc.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t + i * 0.08);\n      osc.stop(t + i * 0.08 + 0.45);\n    });\n  }\n\n  // 4. Buzzer Wrong Sound (삐-익!)\n  playWrong() {\n    if (!this.enabled) return;\n    this.init();\n    const t = this.ctx.currentTime;\n\n    const osc1 = this.ctx.createOscillator();\n    const osc2 = this.ctx.createOscillator();\n    const gain = this.ctx.createGain();\n\n    osc1.type = 'sawtooth';\n    osc2.type = 'sawtooth';\n\n    osc1.frequency.setValueAtTime(140, t);\n    osc2.frequency.setValueAtTime(147, t); // dissonant dissonance\n\n    gain.gain.setValueAtTime(0.25, t);\n    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);\n\n    osc1.connect(gain);\n    osc2.connect(gain);\n    gain.connect(this.ctx.destination);\n\n    osc1.start(t);\n    osc2.start(t);\n    osc1.stop(t + 0.36);\n    osc2.stop(t + 0.36);\n  }\n\n  // 5. Timer tick\n  playTick() {\n    if (!this.enabled) return;\n    this.init();\n    const t = this.ctx.currentTime;\n    const osc = this.ctx.createOscillator();\n    const gain = this.ctx.createGain();\n\n    osc.type = 'triangle';\n    osc.frequency.setValueAtTime(800, t);\n\n    gain.gain.setValueAtTime(0.15, t);\n    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);\n\n    osc.connect(gain);\n    gain.connect(this.ctx.destination);\n\n    osc.start(t);\n    osc.stop(t + 0.06);\n  }\n\n  // 6. Match Victory Fanfare\n  playVictory() {\n    if (!this.enabled) return;\n    this.init();\n    const t = this.ctx.currentTime;\n    const chords = [\n      { notes: [523.25, 659.25], time: 0, dur: 0.18 },\n      { notes: [523.25, 659.25], time: 0.2, dur: 0.18 },\n      { notes: [523.25, 659.25], time: 0.4, dur: 0.18 },\n      { notes: [659.25, 783.99, 1046.50], time: 0.65, dur: 0.8 }\n    ];\n\n    chords.forEach(c => {\n      c.notes.forEach(freq => {\n        const osc = this.ctx.createOscillator();\n        const gain = this.ctx.createGain();\n        osc.type = 'triangle';\n        osc.frequency.setValueAtTime(freq, t + c.time);\n\n        gain.gain.setValueAtTime(0.01, t + c.time);\n        gain.gain.linearRampToValueAtTime(0.25, t + c.time + 0.03);\n        gain.gain.exponentialRampToValueAtTime(0.001, t + c.time + c.dur);\n\n        osc.connect(gain);\n        gain.connect(this.ctx.destination);\n\n        osc.start(t + c.time);\n        osc.stop(t + c.time + c.dur + 0.05);\n      });\n    });\n  }\n\n  // 7. Defeat Sad sound\n  playDefeat() {\n    if (!this.enabled) return;\n    this.init();\n    const t = this.ctx.currentTime;\n    const notes = [440, 415.3, 392, 349.2];\n    notes.forEach((freq, i) => {\n      const osc = this.ctx.createOscillator();\n      const gain = this.ctx.createGain();\n      osc.type = 'sawtooth';\n      osc.frequency.setValueAtTime(freq, t + i * 0.25);\n\n      gain.gain.setValueAtTime(0.18, t + i * 0.25);\n      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.28);\n\n      osc.connect(gain);\n      gain.connect(this.ctx.destination);\n\n      osc.start(t + i * 0.25);\n      osc.stop(t + i * 0.25 + 0.3);\n    });\n  }\n}\n\nwindow.soundFX = new SoundFX();\n" },
  '/js/particles.js': { type: 'application/javascript; charset=utf-8', content: "// Dynamic Water Balloon & Splash Particle FX Engine\n\nclass BattleFX {\n  constructor(canvasId) {\n    this.canvas = document.getElementById(canvasId);\n    this.ctx = this.canvas.getContext('2d');\n    this.projectiles = [];\n    this.particles = [];\n    this.shockwaves = [];\n    this.floatingTexts = [];\n    this.animating = false;\n\n    this.resize();\n    window.addEventListener('resize', () => this.resize());\n    this.loop();\n  }\n\n  resize() {\n    if (!this.canvas) return;\n    const rect = this.canvas.parentElement.getBoundingClientRect();\n    this.canvas.width = rect.width;\n    this.canvas.height = rect.height;\n  }\n\n  // Launch a water balloon from player to opponent (or vice versa)\n  throwBalloon(fromPos, toPos, isCritical, damage, onHitCallback) {\n    window.soundFX.playThrow();\n\n    const duration = 650; // ms flight time\n    const heightArc = Math.min(180, Math.abs(toPos.x - fromPos.x) * 0.35 + 80);\n\n    const projectile = {\n      startX: fromPos.x,\n      startY: fromPos.y,\n      targetX: toPos.x,\n      targetY: toPos.y,\n      heightArc,\n      startTime: performance.now(),\n      duration,\n      isCritical,\n      damage,\n      onHitCallback,\n      color: isCritical ? '#00e5ff' : '#00b0ff',\n      tailParticles: []\n    };\n\n    this.projectiles.push(projectile);\n  }\n\n  // Create splash explosion at coordinates\n  createSplash(x, y, isCritical, damage) {\n    window.soundFX.playSplash(isCritical);\n\n    // Screen Shake effect\n    this.triggerScreenShake(isCritical ? 14 : 8);\n\n    // 1. Water Shockwave Ripple\n    this.shockwaves.push({\n      x,\n      y,\n      radius: 10,\n      maxRadius: isCritical ? 130 : 90,\n      opacity: 0.9,\n      color: isCritical ? 'rgba(0, 229, 255,' : 'rgba(56, 189, 248,'\n    });\n\n    // 2. 45 Water Droplets Explosion\n    const dropletCount = isCritical ? 55 : 38;\n    for (let i = 0; i < dropletCount; i++) {\n      const angle = Math.random() * Math.PI * 2;\n      const speed = Math.random() * (isCritical ? 14 : 10) + 3;\n      const size = Math.random() * 6 + 3;\n      this.particles.push({\n        x,\n        y,\n        vx: Math.cos(angle) * speed,\n        vy: Math.sin(angle) * speed - (Math.random() * 5 + 3), // bias upwards\n        size,\n        color: Math.random() > 0.3 ? '#38bdf8' : '#e0f2fe',\n        alpha: 1,\n        decay: Math.random() * 0.02 + 0.015,\n        gravity: 0.38\n      });\n    }\n\n    // 3. Floating Damage / Critical Text\n    this.floatingTexts.push({\n      x: x + (Math.random() * 40 - 20),\n      y: y - 20,\n      text: isCritical ? `⚡-${damage} 치명타!` : `💥-${damage} HP`,\n      color: isCritical ? '#facc15' : '#ef4444',\n      fontSize: isCritical ? 34 : 26,\n      alpha: 1,\n      vy: -2.2,\n      scale: 1.4\n    });\n  }\n\n  triggerScreenShake(intensity = 10) {\n    const container = document.getElementById('game-arena') || document.body;\n    container.classList.remove('screen-shake', 'screen-shake-intense');\n    void container.offsetWidth; // trigger reflow\n    container.classList.add(intensity > 10 ? 'screen-shake-intense' : 'screen-shake');\n    setTimeout(() => {\n      container.classList.remove('screen-shake', 'screen-shake-intense');\n    }, 450);\n  }\n\n  loop() {\n    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);\n    const now = performance.now();\n\n    // 1. Update & Draw Projectiles\n    for (let i = this.projectiles.length - 1; i >= 0; i--) {\n      const p = this.projectiles[i];\n      const progress = Math.min(1, (now - p.startTime) / p.duration);\n\n      // Parabolic Arc calculation\n      const curX = p.startX + (p.targetX - p.startX) * progress;\n      const linearY = p.startY + (p.targetY - p.startY) * progress;\n      const arcY = -4 * p.heightArc * progress * (1 - progress);\n      const curY = linearY + arcY;\n\n      // Draw Water Balloon\n      this.ctx.save();\n      this.ctx.translate(curX, curY);\n\n      // Slight rotation & liquid squish effect\n      const squish = 1 + Math.sin(progress * Math.PI * 4) * 0.18;\n      this.ctx.scale(squish, 2 - squish);\n\n      // Water Balloon Body\n      const grad = this.ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);\n      grad.addColorStop(0, '#ffffff');\n      grad.addColorStop(0.3, p.color);\n      grad.addColorStop(1, '#0284c7');\n\n      this.ctx.beginPath();\n      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);\n      this.ctx.fillStyle = grad;\n      this.ctx.shadowColor = p.color;\n      this.ctx.shadowBlur = p.isCritical ? 18 : 10;\n      this.ctx.fill();\n\n      // Balloon tie knot\n      this.ctx.beginPath();\n      this.ctx.ellipse(progress < 0.5 ? -15 : 15, 2, 4, 6, 0, 0, Math.PI * 2);\n      this.ctx.fillStyle = '#0369a1';\n      this.ctx.fill();\n\n      this.ctx.restore();\n\n      // Water droplet trail\n      if (Math.random() > 0.2) {\n        this.particles.push({\n          x: curX,\n          y: curY,\n          vx: (Math.random() - 0.5) * 2,\n          vy: Math.random() * 2,\n          size: Math.random() * 4 + 2,\n          color: '#7dd3fc',\n          alpha: 0.8,\n          decay: 0.05,\n          gravity: 0.1\n        });\n      }\n\n      if (progress >= 1) {\n        // Hit!\n        this.createSplash(p.targetX, p.targetY, p.isCritical, p.damage);\n        if (p.onHitCallback) p.onHitCallback();\n        this.projectiles.splice(i, 1);\n      }\n    }\n\n    // 2. Shockwaves\n    for (let i = this.shockwaves.length - 1; i >= 0; i--) {\n      const sw = this.shockwaves[i];\n      sw.radius += (sw.maxRadius - sw.radius) * 0.18;\n      sw.opacity -= 0.035;\n\n      if (sw.opacity <= 0 || sw.radius >= sw.maxRadius - 2) {\n        this.shockwaves.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.beginPath();\n      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);\n      this.ctx.strokeStyle = `${sw.color}${sw.opacity})`;\n      this.ctx.lineWidth = 5 * sw.opacity;\n      this.ctx.stroke();\n      this.ctx.restore();\n    }\n\n    // 3. Water Particles\n    for (let i = this.particles.length - 1; i >= 0; i--) {\n      const pt = this.particles[i];\n      pt.x += pt.vx;\n      pt.y += pt.vy;\n      pt.vy += pt.gravity;\n      pt.alpha -= pt.decay;\n\n      if (pt.alpha <= 0) {\n        this.particles.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = pt.alpha;\n      this.ctx.fillStyle = pt.color;\n      this.ctx.beginPath();\n      this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);\n      this.ctx.fill();\n      this.ctx.restore();\n    }\n\n    // 4. Floating Damage Text\n    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {\n      const ft = this.floatingTexts[i];\n      ft.y += ft.vy;\n      ft.alpha -= 0.02;\n      ft.scale = Math.max(1, ft.scale - 0.03);\n\n      if (ft.alpha <= 0) {\n        this.floatingTexts.splice(i, 1);\n        continue;\n      }\n\n      this.ctx.save();\n      this.ctx.globalAlpha = ft.alpha;\n      this.ctx.font = `900 ${ft.fontSize * ft.scale}px 'Jua', 'Pretendard', sans-serif`;\n      this.ctx.textAlign = 'center';\n\n      // Outline\n      this.ctx.lineWidth = 5;\n      this.ctx.strokeStyle = '#000000';\n      this.ctx.strokeText(ft.text, ft.x, ft.y);\n\n      // Fill\n      this.ctx.fillStyle = ft.color;\n      this.ctx.fillText(ft.text, ft.x, ft.y);\n      this.ctx.restore();\n    }\n\n    requestAnimationFrame(() => this.loop());\n  }\n}\n\nwindow.BattleFX = BattleFX;\n" },
  '/js/app.js': { type: 'application/javascript; charset=utf-8', content: "async function refreshLeaderboardCache() {\n  try {\n    const res = await fetch('/api/leaderboard');\n    if (res.ok) {\n      const data = await res.json();\n      if (data.ok && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {\n        localStorage.setItem('waterpang_leaderboard', JSON.stringify(data.leaderboard));\n      }\n    }\n  } catch (e) {}\n}\n\n// Main Game Application Logic\n\nlet currentUser = null;\nlet currentRoomId = null;\nlet eventSource = null;\nlet battleFX = null;\nlet roundTimerInterval = null;\nlet roundTimeRemaining = 10;\nlet hasAnsweredCurrentRound = false;\n\n// DOM Elements\nconst views = {\n  auth: document.getElementById('view-auth'),\n  lobby: document.getElementById('view-lobby'),\n  matchmaking: document.getElementById('view-matchmaking'),\n  battle: document.getElementById('view-battle'),\n  matchOver: document.getElementById('view-match-over')\n};\n\nfunction showView(name) {\n  Object.values(views).forEach(v => v.classList.remove('active'));\n  if (views[name]) {\n    views[name].classList.add('active');\n  }\n  if (name === 'battle' && battleFX) {\n    setTimeout(() => battleFX.resize(), 100);\n  }\n}\n\nfunction showToast(msg) {\n  const toast = document.getElementById('toast-notification');\n  toast.innerText = msg;\n  toast.classList.add('show');\n  setTimeout(() => toast.classList.remove('show'), 2600);\n}\n\n// -------------------------------------------------------------\n// Initialization & Auth\n// -------------------------------------------------------------\ndocument.addEventListener('DOMContentLoaded', () => {\n  battleFX = new BattleFX('battle-fx-canvas');\n\n  // Check saved session\n  const saved = localStorage.getItem('waterpang_user');\n  if (saved) {\n    try {\n      const parsed = JSON.parse(saved);\n      if (parsed && parsed.nickname) {\n        currentUser = parsed;\n        updateUserData(parsed);\n        showView('lobby');\n        initSSE(parsed.id);\n        // Proactively restore and sync account + leaderboard with server immediately on page open\n        syncUserWithServer(parsed);\n        fetchProfile(parsed.id);\n        refreshLeaderboardCache();\n      }\n    } catch (e) {\n      console.warn('Session parse warning:', e);\n    }\n  } else {\n    refreshLeaderboardCache();\n  }\n\n  setupEventListeners();\n});\n\nfunction setupEventListeners() {\n  // Sound toggle\n  const btnSound = document.getElementById('btn-sound-toggle');\n  btnSound.addEventListener('click', () => {\n    const on = window.soundFX.toggle();\n    btnSound.innerText = on ? '🔊' : '🔇';\n    showToast(on ? '소리가 켜졌습니다.' : '소리가 꺼졌습니다.');\n  });\n\n  // Logout\n  document.getElementById('btn-logout').addEventListener('click', () => {\n    if (confirm('로그아웃 하시겠습니까?')) {\n      logout();\n    }\n  });\n\n  // Auth Form & Tabs\n  let authMode = 'login'; // 'login' or 'register'\n  const tabLogin = document.getElementById('tab-login');\n  const tabRegister = document.getElementById('tab-register');\n  const btnSubmitAuth = document.getElementById('btn-submit-auth');\n\n  tabLogin.addEventListener('click', () => {\n    authMode = 'login';\n    tabLogin.classList.add('active');\n    tabRegister.classList.remove('active');\n    btnSubmitAuth.innerText = '로그인하기';\n  });\n\n  tabRegister.addEventListener('click', () => {\n    authMode = 'register';\n    tabRegister.classList.add('active');\n    tabLogin.classList.remove('active');\n    btnSubmitAuth.innerText = '새 계정 생성하기';\n  });\n\n  document.getElementById('form-auth').addEventListener('submit', async (e) => {\n    e.preventDefault();\n    const nickname = document.getElementById('auth-nickname').value.trim();\n    const password = document.getElementById('auth-password').value;\n\n    if (!nickname || !password) return;\n\n    try {\n      if (authMode === 'register') {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem('waterpang_user');\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem('waterpang_leaderboard');\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch('/api/register', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok && data.user) {\n          showToast(`'${data.user.nickname}' 계정이 생성되었습니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || '계정 생성에 실패했습니다.');\n        }\n      } else {\n        let backupUser = null;\n        let leaderboardSnapshot = [];\n        try {\n          const u = localStorage.getItem('waterpang_user');\n          if (u) backupUser = JSON.parse(u);\n          const lb = localStorage.getItem('waterpang_leaderboard');\n          if (lb) leaderboardSnapshot = JSON.parse(lb);\n        } catch(e){}\n\n        const res = await fetch('/api/login', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })\n        });\n        const data = await res.json();\n        if (data.ok && data.user) {\n          showToast(`'${data.user.nickname}' 님 환영합니다!`);\n          loginSuccess(data.user);\n        } else {\n          alert(data.error || '로그인에 실패했습니다.');\n        }\n      }\n    } catch (err) {\n      alert('서버 연결 오류가 발생했습니다.');\n    }\n  });\n\n  // Lobby actions\n  document.getElementById('btn-start-matching').addEventListener('click', startMatching);\n  document.getElementById('btn-cancel-matching').addEventListener('click', cancelMatching);\n  document.getElementById('btn-return-lobby').addEventListener('click', () => {\n    if (currentUser) fetchProfile(currentUser.id);\n    showView('lobby');\n  });\n  document.getElementById('btn-rematch').addEventListener('click', () => {\n    startMatching();\n  });\n\n  // Modals\n  document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);\n  document.getElementById('btn-close-leaderboard').addEventListener('click', () => {\n    document.getElementById('modal-leaderboard').classList.remove('active');\n  });\n\n  document.getElementById('btn-open-wrongnotes').addEventListener('click', openWrongNotes);\n  document.getElementById('btn-close-wrongnotes').addEventListener('click', () => {\n    document.getElementById('modal-wrongnotes').classList.remove('active');\n  });\n}\n\nfunction updateUserData(user) {\n  currentUser = user;\n  localStorage.setItem('waterpang_user', JSON.stringify(user));\n\n  // Update Header\n  document.getElementById('header-user-bar').style.display = 'flex';\n  document.getElementById('header-nickname').innerText = user.nickname;\n  updateTierBadge('header-tier-badge', user.tier, user.rp);\n\n  // Update Lobby\n  updateLobbyUI(user);\n}\n\nfunction loginSuccess(user) {\n  updateUserData(user);\n  showView('lobby');\n\n  // Connect SSE\n  initSSE(user.id);\n\n  // Auto-sync and cache leaderboard in background\n  syncUserWithServer(user);\n  refreshLeaderboardCache();\n}\n\nfunction logout() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  if (eventSource) {\n    eventSource.close();\n    eventSource = null;\n  }\n  currentUser = null;\n  localStorage.removeItem('waterpang_user');\n  document.getElementById('header-user-bar').style.display = 'none';\n  showView('auth');\n}\n\nasync function syncUserWithServer(userToSync) {\n  if (!userToSync || !userToSync.nickname) return;\n  try {\n    let leaderboardSnapshot = [];\n    try {\n      const cached = localStorage.getItem('waterpang_leaderboard');\n      if (cached) leaderboardSnapshot = JSON.parse(cached);\n    } catch (e) {}\n\n    const res = await fetch('/api/user/sync', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        user: userToSync,\n        leaderboardSnapshot\n      })\n    });\n    const data = await res.json();\n    if (data.ok && data.user) {\n      console.log('[Sync] Account successfully preserved & restored with server:', data.user.nickname);\n      updateUserData(data.user);\n      return data.user;\n    }\n  } catch (err) {\n    console.warn('[Sync] Server sync failed (offline or container starting):', err);\n  }\n}\n\nasync function fetchProfile(userId) {\n  try {\n    const res = await fetch(`/api/profile?userId=${userId}`);\n    const data = await res.json();\n    if (data.ok && data.user) {\n      updateUserData(data.user);\n    } else if (currentUser) {\n      // Container restarted on Render! Automatically sync and resurrect account\n      await syncUserWithServer(currentUser);\n    }\n  } catch (err) {\n    console.warn('[Profile] fetch error, syncing with server:', err);\n    if (currentUser) {\n      await syncUserWithServer(currentUser);\n    }\n  }\n}\n\nfunction updateTierBadge(elementId, tier, rp) {\n  const el = document.getElementById(elementId);\n  if (!el || !tier) return;\n  el.innerText = `${tier.badge} ${tier.name} (${rp} RP)`;\n  el.style.borderColor = tier.color;\n}\n\nfunction updateLobbyUI(user) {\n  document.getElementById('lobby-nickname').innerText = user.nickname;\n  updateTierBadge('lobby-tier-badge', user.tier, user.rp);\n  document.getElementById('stat-wins').innerText = user.wins;\n  document.getElementById('stat-losses').innerText = user.losses;\n\n  const total = user.wins + user.losses;\n  const rate = total > 0 ? Math.round((user.wins / total) * 100) : 0;\n  document.getElementById('stat-winrate').innerText = `${rate}%`;\n\n  const nextThreshold = user.tier ? user.tier.max + 1 : 200;\n  const needed = Math.max(0, nextThreshold - user.rp);\n  document.getElementById('tier-next-rp').innerText = `${needed} RP`;\n}\n\n// -------------------------------------------------------------\n// SSE Real-Time Communication\n// -------------------------------------------------------------\nfunction initSSE(userId) {\n  if (eventSource) {\n    if (eventSource.readyState !== EventSource.CLOSED && eventSource.url.includes(`userId=${userId}`)) {\n      return; // Already actively connected\n    }\n    eventSource.close();\n  }\n\n  eventSource = new EventSource(`/api/events?userId=${userId}`);\n\n  eventSource.onopen = () => {\n    console.log('[SSE] Stream connected successfully');\n  };\n\n  eventSource.onmessage = (event) => {\n    try {\n      const msg = JSON.parse(event.data);\n      handleServerEvent(msg.type, msg.payload);\n    } catch (e) {\n      console.error('[SSE] Parse error:', e);\n    }\n  };\n\n  eventSource.onerror = () => {\n    console.warn('[SSE] Connection lost, browser will auto-retry...');\n  };\n}\n\nfunction handleServerEvent(type, payload) {\n  console.log('[Game Event]', type, payload);\n\n  switch (type) {\n    case 'MATCH_FOUND':\n      onMatchFound(payload);\n      break;\n    case 'ROUND_START':\n      onRoundStart(payload);\n      break;\n    case 'ATTACK':\n    case 'ROUND_RESULT':\n      onRoundResult(payload);\n      break;\n    case 'WRONG_ANSWER':\n      onWrongAnswer(payload);\n      break;\n    case 'MATCH_OVER':\n      onMatchOver(payload);\n      break;\n  }\n}\n\n// -------------------------------------------------------------\n// Matchmaking Flow (Dual-Channel: SSE + Guaranteed Polling Fallback)\n// -------------------------------------------------------------\nlet matchPollingInterval = null;\n\nasync function startMatching() {\n  if (!currentUser) return;\n  initSSE(currentUser.id);\n\n  currentRoomId = null;\n  battleData = null;\n  showView('matchmaking');\n\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  try {\n    const res = await fetch('/api/match/join', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n    const data = await res.json();\n    if (!data.ok) {\n      alert(data.error || '매칭 시작 실패');\n      showView('lobby');\n      return;\n    }\n\n    // 1. Instant match returned directly in join response\n    if (data.result && data.result.status === 'MATCHED' && data.result.roomData) {\n      console.log('[Match] Instant match via join response:', data.result.roomData);\n      onMatchFound(data.result.roomData);\n      return;\n    }\n\n    // 2. Dual-channel polling check (every 1000ms) to ensure neither player ever gets stuck\n    matchPollingInterval = setInterval(async () => {\n      const viewEl = document.getElementById('view-matchmaking');\n      if (!viewEl || !viewEl.classList.contains('active')) {\n        clearInterval(matchPollingInterval);\n        matchPollingInterval = null;\n        return;\n      }\n\n      try {\n        const pollRes = await fetch(`/api/match/status?userId=${currentUser.id}`);\n        const pollData = await pollRes.json();\n        if (pollData.ok && pollData.status === 'MATCHED' && pollData.roomData) {\n          console.log('[Match] Polling detected match:', pollData.roomData);\n          clearInterval(matchPollingInterval);\n          matchPollingInterval = null;\n          onMatchFound(pollData.roomData);\n        }\n      } catch (e) {\n        // network polling error ignored\n      }\n    }, 1000);\n\n  } catch (e) {\n    alert('서버 연결 실패');\n    showView('lobby');\n  }\n}\n\nasync function cancelMatching() {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n  if (!currentUser) return;\n  try {\n    await fetch('/api/match/cancel', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ userId: currentUser.id })\n    });\n  } catch (e) {}\n  showView('lobby');\n}\n\n// -------------------------------------------------------------\n// Battle Scene\n// -------------------------------------------------------------\nlet battleData = null;\nlet battleSyncInterval = null;\nlet currentClientRound = 0;\n\nfunction onMatchFound(data) {\n  if (matchPollingInterval) {\n    clearInterval(matchPollingInterval);\n    matchPollingInterval = null;\n  }\n\n  // Prevent duplicate execution if both SSE and polling trigger simultaneously\n  if (battleData && currentRoomId === data.roomId && views.battle.classList.contains('active')) {\n    return;\n  }\n\n  battleData = data;\n  currentRoomId = data.roomId;\n\n  // Setup Fighters\n  const isMeP1 = (data.p1.id === currentUser.id);\n  const myData = isMeP1 ? data.p1 : data.p2;\n  const oppData = isMeP1 ? data.p2 : data.p1;\n\n  document.getElementById('name-p1').innerText = `${myData.nickname} (나)`;\n  document.getElementById('avatar-p1').childNodes[0].nodeValue = myData.avatar || '👦';\n\n  document.getElementById('name-p2').innerText = oppData.nickname + (oppData.isBot ? ' 🤖' : '');\n  document.getElementById('avatar-p2').childNodes[0].nodeValue = oppData.avatar || (oppData.isBot ? '🤖' : '👧');\n\n  updateHpUI('p1', 100, 100);\n  updateHpUI('p2', 100, 100);\n\n  document.getElementById('quiz-question-text').innerText = '상대와 연결되었습니다! 곧 1라운드가 시작됩니다!';\n  document.getElementById('quiz-options-container').innerHTML = '';\n  document.getElementById('battle-live-banner').innerText = '💦 먼저 정답을 맞혀 물풍선을 던지세요!';\n  document.getElementById('round-explanation-box').style.display = 'none';\n  currentClientRound = 0;\n\n  // Dual-channel battle state backup polling: ensures round ALWAYS starts even if SSE lags or drops\n  if (battleSyncInterval) clearInterval(battleSyncInterval);\n  battleSyncInterval = setInterval(async () => {\n    if (!currentRoomId || !currentUser || !views.battle.classList.contains('active')) return;\n    try {\n      const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}`);\n      if (res.ok) {\n        const state = await res.json();\n        if (state.ok && state.round > currentClientRound && state.quiz) {\n          console.log('[BattleSync] Syncing round state via polling:', state.round);\n          onRoundStart({\n            round: state.round,\n            totalRounds: state.totalRounds,\n            quiz: state.quiz,\n            timeLimit: 10,\n            p1: state.p1,\n            p2: state.p2\n          });\n        }\n      }\n    } catch (e) {\n      console.warn('[BattleSync] Polling error:', e.message);\n    }\n  }, 1000);\n\n  showView('battle');\n}\n\nfunction updateHpUI(target, curHp, maxHp) {\n  const percent = Math.max(0, Math.min(100, (curHp / maxHp) * 100));\n  const bar = document.getElementById(`hp-bar-${target}`);\n  const text = document.getElementById(`hp-num-${target}`);\n\n  if (bar) {\n    bar.style.width = `${percent}%`;\n    bar.className = 'hp-bar-fill';\n    if (percent < 30) bar.classList.add('danger');\n    else if (percent < 60) bar.classList.add('warning');\n  }\n  if (text) {\n    text.innerText = `${curHp} / ${maxHp}`;\n  }\n}\n\nfunction onRoundStart(data) {\n  currentClientRound = data.round;\n  hasAnsweredCurrentRound = false;\n  document.getElementById('round-explanation-box').style.display = 'none';\n\n  // Round indicator\n  document.getElementById('battle-round-indicator').innerText = `라운드 ${data.round} / ${data.totalRounds}`;\n  document.getElementById('battle-live-banner').innerText = '문제를 읽고 빠르게 정답을 누르세요!';\n\n  // Reset drenched cards\n  document.getElementById('fighter-p1').classList.remove('drenched');\n  document.getElementById('fighter-p2').classList.remove('drenched');\n\n  // Render question\n  document.getElementById('quiz-question-text').innerText = data.quiz.question;\n\n  // Render Options\n  const container = document.getElementById('quiz-options-container');\n  container.innerHTML = '';\n\n  data.quiz.options.forEach(opt => {\n    const btn = document.createElement('button');\n    btn.className = 'btn-option';\n    btn.innerText = opt;\n    btn.addEventListener('click', () => submitAnswer(opt, btn));\n    container.appendChild(btn);\n  });\n\n  // Start 10s Timer\n  startRoundTimer(data.timeLimit || 10);\n}\n\nfunction startRoundTimer(seconds) {\n  clearInterval(roundTimerInterval);\n  roundTimeRemaining = seconds;\n\n  const timerNum = document.getElementById('battle-timer-num');\n  const timerFill = document.getElementById('battle-timer-fill');\n\n  timerNum.innerText = roundTimeRemaining;\n  timerFill.style.width = '100%';\n\n  const totalMs = seconds * 1000;\n  const startAt = Date.now();\n\n  roundTimerInterval = setInterval(() => {\n    const elapsed = Date.now() - startAt;\n    const remaining = Math.max(0, totalMs - elapsed);\n    const sec = Math.ceil(remaining / 1000);\n\n    timerNum.innerText = sec;\n    timerFill.style.width = `${(remaining / totalMs) * 100}%`;\n\n    if (sec <= 3 && sec > 0 && remaining % 1000 < 100) {\n      window.soundFX.playTick();\n    }\n\n    if (remaining <= 0) {\n      clearInterval(roundTimerInterval);\n    }\n  }, 100);\n}\n\nasync function submitAnswer(answer, clickedBtn) {\n  if (hasAnsweredCurrentRound || !currentRoomId) return;\n  hasAnsweredCurrentRound = true;\n\n  // Disable all options\n  const buttons = document.querySelectorAll('.btn-option');\n  buttons.forEach(b => b.disabled = true);\n\n  try {\n    await fetch('/api/game/answer', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({\n        roomId: currentRoomId,\n        userId: currentUser.id,\n        answer\n      })\n    });\n  } catch (e) {\n    console.error('Answer send error:', e);\n  }\n}\n\nfunction onWrongAnswer(data) {\n  if (data.userId === currentUser.id) {\n    window.soundFX.playWrong();\n    showToast('아쉽게도 틀렸습니다! 이번 라운드는 기회가 끝났습니다.');\n\n    // Mark clicked button red\n    const buttons = document.querySelectorAll('.btn-option');\n    buttons.forEach(b => {\n      if (b.innerText === data.userAnswer) {\n        b.classList.add('wrong-pick');\n      }\n      b.disabled = true;\n    });\n\n    document.getElementById('battle-live-banner').innerText = '❌ 오답입니다! 상대방에게 기회가 넘어갔습니다.';\n  } else {\n    document.getElementById('battle-live-banner').innerText = `상대(${data.nickname})가 틀렸습니다! 서둘러 맞히세요!`;\n  }\n}\n\nfunction onRoundResult(data) {\n  clearInterval(roundTimerInterval);\n\n  // Show explanation box\n  const explBox = document.getElementById('round-explanation-box');\n  explBox.style.display = 'block';\n  explBox.innerHTML = `<strong>💡 정답: ${data.correctAnswer}</strong><br>${data.explanation}`;\n\n  // Highlight correct option button\n  const buttons = document.querySelectorAll('.btn-option');\n  buttons.forEach(b => {\n    b.disabled = true;\n    if (b.innerText === data.correctAnswer) {\n      b.classList.add('correct-pick');\n    }\n  });\n\n  if (data.type === 'ATTACK') {\n    const isMeWinner = (data.winnerId === currentUser.id);\n\n    // Calculate canvas coordinates for throw\n    const p1Card = document.getElementById('avatar-p1').getBoundingClientRect();\n    const p2Card = document.getElementById('avatar-p2').getBoundingClientRect();\n    const canvasRect = document.getElementById('battle-fx-canvas').getBoundingClientRect();\n\n    const p1Pos = {\n      x: p1Card.left + p1Card.width / 2 - canvasRect.left,\n      y: p1Card.top + p1Card.height / 2 - canvasRect.top\n    };\n    const p2Pos = {\n      x: p2Card.left + p2Card.width / 2 - canvasRect.left,\n      y: p2Card.top + p2Card.height / 2 - canvasRect.top\n    };\n\n    const fromPos = isMeWinner ? p1Pos : p2Pos;\n    const toPos = isMeWinner ? p2Pos : p1Pos;\n    const victimCardId = isMeWinner ? 'fighter-p2' : 'fighter-p1';\n\n    if (isMeWinner) {\n      window.soundFX.playCorrect();\n      document.getElementById('battle-live-banner').innerHTML =\n        `🎉 <strong>정답!</strong> ${data.timeTaken}초 만에 물풍선을 투척합니다!`;\n    } else {\n      document.getElementById('battle-live-banner').innerHTML =\n        `💦 상대방(${data.winnerName})이 정답을 맞혀 물풍선을 던집니다!`;\n    }\n\n    // Launch Animated Water Balloon\n    battleFX.throwBalloon(fromPos, toPos, data.isCritical, data.damage, () => {\n      // On Hit Callback:\n      const victimCard = document.getElementById(victimCardId);\n      victimCard.classList.add('drenched');\n\n      // Update HP\n      if (battleData) {\n        const isMeP1 = (battleData.p1.id === currentUser.id);\n        const myHp = isMeP1 ? data.p1Hp : data.p2Hp;\n        const oppHp = isMeP1 ? data.p2Hp : data.p1Hp;\n        updateHpUI('p1', myHp, 100);\n        updateHpUI('p2', oppHp, 100);\n      }\n    });\n\n  } else if (data.type === 'DRAW' || data.type === 'TIMEOUT') {\n    window.soundFX.playWrong();\n    document.getElementById('battle-live-banner').innerText =\n      data.type === 'TIMEOUT' ? '⌛ 시간 초과! 아무도 맞히지 못했습니다.' : '😅 둘 다 오답으로 물풍선이 바닥에 터졌습니다!';\n  }\n}\n\n// -------------------------------------------------------------\n// Match Over\n// -------------------------------------------------------------\nfunction onMatchOver(data) {\n  if (battleSyncInterval) {\n    clearInterval(battleSyncInterval);\n    battleSyncInterval = null;\n  }\n  clearInterval(roundTimerInterval);\n\n  setTimeout(() => {\n    showView('matchOver');\n\n    const isMeP1 = (data.p1.id === currentUser.id);\n    const myResult = isMeP1 ? data.p1 : data.p2;\n\n    const resultEmoji = document.getElementById('result-emoji');\n    const resultTitle = document.getElementById('result-title');\n    const rpBadge = document.getElementById('result-rp-badge');\n\n    if (myResult.result === 'WIN') {\n      window.soundFX.playVictory();\n      resultEmoji.innerText = '👑';\n      resultTitle.innerText = '짜릿한 승리!';\n      resultTitle.className = 'result-title win';\n      rpBadge.className = 'rp-badge-change plus';\n      rpBadge.innerText = `+${myResult.rpChange} RP 획득! (현재 ${myResult.newRp} RP)`;\n    } else if (myResult.result === 'LOSE') {\n      window.soundFX.playDefeat();\n      resultEmoji.innerText = '💧';\n      resultTitle.innerText = '아쉬운 패배!';\n      resultTitle.className = 'result-title lose';\n      rpBadge.className = 'rp-badge-change minus';\n      rpBadge.innerText = `${myResult.rpChange} RP (현재 ${myResult.newRp} RP)`;\n    } else {\n      resultEmoji.innerText = '🤝';\n      resultTitle.innerText = '무승부!';\n      resultTitle.className = 'result-title draw';\n      rpBadge.className = 'rp-badge-change plus';\n      rpBadge.innerText = `+${myResult.rpChange} RP (현재 ${myResult.newRp} RP)`;\n    }\n\n    // Render Round Recap\n    const recapList = document.getElementById('match-recap-list');\n    recapList.innerHTML = '';\n\n    (data.history || []).forEach(h => {\n      const div = document.createElement('div');\n      div.className = 'recap-item';\n      div.innerHTML = `\n        <div>\n          <strong>[R${h.round}] ${h.quiz.answer}</strong>: ${h.quiz.question.replace(/\\n/g, ' ')}\n          <div style=\"font-size: 12px; color: #0284c7; margin-top: 2px;\">💡 ${h.quiz.explanation}</div>\n        </div>\n        <span style=\"font-weight: bold; white-space: nowrap; color: ${h.winnerId === currentUser.id ? '#10b981' : '#64748b'};\">\n          ${h.winnerId === currentUser.id ? '내가 맞힘 🎯' : (h.winnerName || '무승부')}\n        </span>\n      `;\n      recapList.appendChild(div);\n    });\n\n    // Refresh profile and leaderboard cache in background\n    fetchProfile(currentUser.id);\n    refreshLeaderboardCache();\n  }, 2200);\n}\n\n// -------------------------------------------------------------\n// Modals: Leaderboard & Wrong Answer Notes\n// -------------------------------------------------------------\nfunction renderLeaderboardItems(list, container) {\n  if (!Array.isArray(list) || list.length === 0) {\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b; padding: 20px;\">아직 기록된 학생이 없습니다. 첫 번째 챔피언이 되어보세요!</div>';\n    return;\n  }\n  container.innerHTML = '';\n  list.forEach((user, idx) => {\n    const row = document.createElement('div');\n    row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;\n    const badge = (user.tier && user.tier.badge) || '💧';\n    const tierName = (user.tier && user.tier.name) || '물방울';\n    row.innerHTML = `\n      <div class=\"leaderboard-rank\">${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}위`))}</div>\n      <div class=\"leaderboard-user\">\n        <span style=\"font-size: 20px;\">${badge}</span>\n        <div>\n          <strong>${user.nickname}</strong>\n          <div style=\"font-size: 11px; color: #64748b;\">${tierName} · 승률 ${user.win_rate || 0}% (${user.wins || 0}승 ${user.losses || 0}패)</div>\n        </div>\n      </div>\n      <div style=\"font-weight: bold; color: #0284c7; font-size: 16px;\">\n        ${user.rp || 100} RP\n      </div>\n    `;\n    container.appendChild(row);\n  });\n}\n\nasync function openLeaderboard() {\n  const container = document.getElementById('leaderboard-container');\n  \n  // Show cached leaderboard immediately\n  try {\n    const cached = localStorage.getItem('waterpang_leaderboard');\n    if (cached) {\n      const parsed = JSON.parse(cached);\n      if (Array.isArray(parsed) && parsed.length > 0) {\n        renderLeaderboardItems(parsed, container);\n      }\n    }\n  } catch (e) {}\n\n  if (!container.hasChildNodes()) {\n    container.innerHTML = '<div style=\"text-align: center; color: #64748b;\">불러오는 중...</div>';\n  }\n  document.getElementById('modal-leaderboard').classList.add('active');\n\n  try {\n    const res = await fetch('/api/leaderboard');\n    const data = await res.json();\n    if (data.ok && data.leaderboard) {\n      if (data.leaderboard.length > 0) {\n        localStorage.setItem('waterpang_leaderboard', JSON.stringify(data.leaderboard));\n        renderLeaderboardItems(data.leaderboard, container);\n      } else if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {\n        renderLeaderboardItems([], container);\n      }\n    }\n  } catch (e) {\n    console.warn('Leaderboard fetch error, using cache:', e);\n  }\n}\n\nasync function openWrongNotes() {\n  if (!currentUser) return;\n  const container = document.getElementById('wrongnotes-container');\n  container.innerHTML = '<div style=\"text-align: center; color: #64748b;\">불러오는 중...</div>';\n  document.getElementById('modal-wrongnotes').classList.add('active');\n\n  try {\n    const res = await fetch(`/api/profile?userId=${currentUser.id}`);\n    const data = await res.json();\n    if (data.ok && data.wrongAnswers) {\n      if (data.wrongAnswers.length === 0) {\n        container.innerHTML = '<div style=\"text-align: center; padding: 30px; color: #10b981; font-size: 17px;\">🎉 아직 틀린 문제가 없습니다! 아주 훌륭해요!</div>';\n        return;\n      }\n      container.innerHTML = '';\n      data.wrongAnswers.forEach(w => {\n        const item = document.createElement('div');\n        item.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 10px;';\n        item.innerHTML = `\n          <div style=\"display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;\">\n            <span>오답 기록</span>\n            <span>${w.created_at}</span>\n          </div>\n          <div style=\"font-size: 15px; margin-bottom: 4px;\">\n            <span style=\"color: #ef4444; font-weight: bold;\">내가 고른 답: ${w.user_answer} ❌</span>\n          </div>\n          <div style=\"font-size: 16px; color: #059669; font-weight: bold; margin-bottom: 6px;\">\n            정답: ${w.correct_answer} ⭕\n          </div>\n        `;\n        container.appendChild(item);\n      });\n    }\n  } catch (e) {\n    container.innerHTML = '<div style=\"color: red; text-align: center;\">불러오기 실패</div>';\n  }\n}\n" }
};

// Also support cache-busting URLs
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

    // Pick quiz from 120 curated questions
    try {
      const available = allQuizzes.filter(q => !this.usedQuizIds.has(q.id));
      const recentSet = new Set(recentGlobalQuizIds);
      // Prioritize questions not played in recent rounds across games
      const freshPool = available.filter(q => !recentSet.has(q.id));
      const pool = freshPool.length >= 5 ? freshPool : (available.length > 0 ? available : allQuizzes);
      const quiz = pool[Math.floor(Math.random() * pool.length)];
      this.usedQuizIds.add(quiz.id);
      recordRecentQuiz(quiz.id);
      this.currentQuiz = quiz;
    } catch (e) {
      console.error('[Room] Error selecting quiz, falling back:', e);
      this.currentQuiz = allQuizzes[0];
    }
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

    const isCorrect = (answer === this.currentQuiz.answer);

    if (isCorrect) {
      this.isRoundResolved = true;
      player.answered = true;
      player.score += 10;
      clearTimeout(this.roundTimer);
      clearTimeout(this.botAnswerTimer);

      // Deal 20 damage to opponent
      opponent.hp = Math.max(0, opponent.hp - 20);

      // Record round history
      this.history.push({
        round: this.currentRound,
        quiz: this.currentQuiz,
        winnerId: player.id,
        winnerName: player.nickname,
        p1Hp: this.p1.hp,
        p2Hp: this.p2.hp
      });

      // Broadcast Attack & Round Result
      broadcastToRoom(this, 'ROUND_RESULT', {
        round: this.currentRound,
        winnerId: player.id,
        winnerName: player.nickname,
        userAnswer: answer,
        correctAnswer: this.currentQuiz.answer,
        explanation: this.currentQuiz.explanation,
        p1: { id: this.p1.id, hp: this.p1.hp, score: this.p1.score },
        p2: { id: this.p2.id, hp: this.p2.hp, score: this.p2.score }
      });

      // Next round after 2.5s transition
      this.transitionTimer = setTimeout(() => {
        this.nextRound();
      }, 2500);

    } else {
      // Wrong answer
      player.wrongAttempts++;
      if (!player.isBot) {
        try {
          db.saveWrongAnswer(player.id, this.currentQuiz.id, answer, this.currentQuiz.answer);
        } catch (e) {}
      }

      sendToUser(player.id, 'WRONG_ANSWER', {
        round: this.currentRound,
        userAnswer: answer,
        message: '틀렸습니다! 다시 생각해보세요.'
      });
    }
  }

  handleRoundTimeout() {
    if (this.isEnded || this.isRoundResolved) return;
    this.isRoundResolved = true;

    // Record draw round
    this.history.push({
      round: this.currentRound,
      quiz: this.currentQuiz,
      winnerId: null,
      winnerName: null,
      p1Hp: this.p1.hp,
      p2Hp: this.p2.hp
    });

    broadcastToRoom(this, 'ROUND_RESULT', {
      round: this.currentRound,
      winnerId: null,
      winnerName: null,
      timeout: true,
      correctAnswer: this.currentQuiz.answer,
      explanation: this.currentQuiz.explanation,
      p1: { id: this.p1.id, hp: this.p1.hp, score: this.p1.score },
      p2: { id: this.p2.id, hp: this.p2.hp, score: this.p2.score }
    });

    this.transitionTimer = setTimeout(() => {
      this.nextRound();
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

    // Update Player 1 DB
    let p1NewRp = this.p1.rp + p1RpChange;
    try {
      p1NewRp = db.updateUserStats(this.p1.id, p1Result, p1RpChange);
      db.saveMatch(this.p1.id, this.p2.nickname, this.p2.isBot, p1Result, this.p1.score, this.p2.score, p1RpChange);
    } catch (e) {
      console.error('[Match] Error saving P1 stats:', e);
    }

    // Update Player 2 DB if human
    let p2NewRp = this.p2.rp + p2RpChange;
    if (!this.p2.isBot) {
      try {
        p2NewRp = db.updateUserStats(this.p2.id, p2Result, p2RpChange);
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

  // Force-cleanup any active rooms for this user
  for (const [roomId, room] of activeRooms) {
    if (room.p1.id === user.id || room.p2.id === user.id) {
      if (!room.isEnded) {
        room.isEnded = true;
        clearTimeout(room.roundTimer);
        clearTimeout(room.botAnswerTimer);
        clearTimeout(room.transitionTimer);
      }
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
  if (pathname === '/api/register' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (err || !body.nickname || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '닉네임과 비밀번호를 입력해주세요.' }));
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
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 등록되지 않은 아이디입니다. [새 계정 만들기] 탭에서 먼저 계정을 생성해주세요!' }));
      }
      if (user.password !== body.password) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '❌ 비밀번호가 올바르지 않습니다. 다시 확인해주세요!' }));
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
    const user = db.getUserById(userId);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'User not found' }));
    }
    const matches = db.getMatchHistory(userId, 10);
    const wrongAnswers = db.getWrongAnswers(userId, 15);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, user, matches, wrongAnswers }));
    return;
  }

  if (pathname === '/api/leaderboard' && req.method === 'GET') {
    const list = db.getLeaderboard(15);
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
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Game room not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
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
