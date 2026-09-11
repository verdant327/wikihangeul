const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');
const crypto = require('node:crypto');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Load Quizzes
let allQuizzes = [];
try {
  const data = fs.readFileSync(path.join(__dirname, 'quizzes.json'), 'utf8');
  allQuizzes = JSON.parse(data);
  console.log(`[Quiz] Loaded ${allQuizzes.length} quiz questions.`);
} catch (err) {
  console.error('[Quiz] Failed to load quizzes.json:', err);
  allQuizzes = [];
}

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

// MIME types
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

// -------------------------------------------------------------
// Matchmaker Engine
// -------------------------------------------------------------
function addToMatchQueue(user) {
  // Remove if already in queue
  removeFromMatchQueue(user.id);

  // Check if currently in an active room
  for (const [roomId, room] of activeRooms) {
    if ((room.p1.id === user.id || room.p2.id === user.id) && !room.isEnded) {
      return { inProgress: true, roomId };
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
    createMatchRoom(opponent, queueEntry, false);
    return { status: 'MATCHED' };
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

    // Pick quiz
    const available = allQuizzes.filter(q => !this.usedQuizIds.has(q.id));
    const pool = available.length > 0 ? available : allQuizzes;
    const quiz = pool[Math.floor(Math.random() * pool.length)];
    this.usedQuizIds.add(quiz.id);
    this.currentQuiz = quiz;
    this.roundStartTime = Date.now();

    // Broadcast question to both players (without answer key)
    broadcastToRoom(this, 'ROUND_START', {
      round: this.currentRound,
      totalRounds: this.totalRounds,
      quiz: {
        id: quiz.id,
        question: quiz.question,
        options: [...quiz.options].sort(() => Math.random() - 0.5) // shuffle options
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
    const cfg = this.p2.botConfig;
    const delay = Math.floor(Math.random() * (cfg.maxDelay - cfg.minDelay)) + cfg.minDelay;

    this.botAnswerTimer = setTimeout(() => {
      if (this.isRoundResolved || this.isEnded) return;

      const isCorrect = Math.random() < cfg.accuracy;
      let botChoice = this.currentQuiz.answer;
      if (!isCorrect) {
        const wrongOptions = this.currentQuiz.options.filter(o => o !== this.currentQuiz.answer);
        botChoice = wrongOptions[Math.floor(Math.random() * wrongOptions.length)] || this.currentQuiz.answer;
      }
      this.submitAnswer(this.p2.id, botChoice);
    }, delay);
  }

  submitAnswer(userId, answer) {
    if (this.isRoundResolved || this.isEnded) return;

    const isP1 = (userId === this.p1.id);
    const player = isP1 ? this.p1 : this.p2;
    const opponent = isP1 ? this.p2 : this.p1;

    if (player.answered) return; // already locked

    const timeTaken = ((Date.now() - this.roundStartTime) / 1000).toFixed(1);
    const isCorrect = (answer === this.currentQuiz.answer);

    if (isCorrect) {
      // First player to get it right!
      this.isRoundResolved = true;
      clearTimeout(this.roundTimer);
      clearTimeout(this.botAnswerTimer);

      player.answered = true;
      player.score++;

      // Speed bonus: < 2.5s gives 20 dmg, otherwise 15
      const isCritical = timeTaken < 2.5;
      const damage = isCritical ? 20 : 15;
      opponent.hp = Math.max(0, opponent.hp - damage);

      // Record round history for review
      this.history.push({
        round: this.currentRound,
        quiz: this.currentQuiz,
        winnerId: player.id,
        winnerName: player.nickname,
        winnerAnswer: answer,
        damage,
        isCritical,
        timeTaken
      });

      // Broadcast Attack & Splash Event
      broadcastToRoom(this, 'ROUND_RESULT', {
        type: 'ATTACK',
        winnerId: player.id,
        winnerName: player.nickname,
        loserId: opponent.id,
        damage,
        isCritical,
        timeTaken,
        correctAnswer: this.currentQuiz.answer,
        explanation: this.currentQuiz.explanation,
        p1Hp: this.p1.hp,
        p2Hp: this.p2.hp
      });

      // Give 2.8 seconds to enjoy the water balloon splash animation & read explanation
      this.transitionTimer = setTimeout(() => {
        this.nextRound();
      }, 2800);

    } else {
      // Wrong answer
      player.wrongAttempts++;
      player.answered = true; // locked for this round

      // Save wrong answer record for user review
      if (!player.isBot) {
        try {
          db.recordWrongAnswer(player.id, this.currentQuiz.id, answer, this.currentQuiz.answer);
        } catch (e) {}
      }

      broadcastToRoom(this, 'WRONG_ANSWER', {
        userId: player.id,
        nickname: player.nickname,
        userAnswer: answer
      });

      // If both players got it wrong, end round as double miss
      if (opponent.answered) {
        this.handleBothFailed();
      }
    }
  }

  handleBothFailed() {
    this.isRoundResolved = true;
    clearTimeout(this.roundTimer);
    clearTimeout(this.botAnswerTimer);

    this.history.push({
      round: this.currentRound,
      quiz: this.currentQuiz,
      winnerId: null,
      winnerName: '무승부',
      damage: 0,
      timeTaken: 10
    });

    broadcastToRoom(this, 'ROUND_RESULT', {
      type: 'DRAW',
      correctAnswer: this.currentQuiz.answer,
      explanation: this.currentQuiz.explanation,
      p1Hp: this.p1.hp,
      p2Hp: this.p2.hp
    });

    this.transitionTimer = setTimeout(() => {
      this.nextRound();
    }, 2800);
  }

  handleRoundTimeout() {
    if (this.isRoundResolved || this.isEnded) return;

    this.isRoundResolved = true;
    clearTimeout(this.botAnswerTimer);

    this.history.push({
      round: this.currentRound,
      quiz: this.currentQuiz,
      winnerId: null,
      winnerName: '시간 초과',
      damage: 0,
      timeTaken: 10
    });

    broadcastToRoom(this, 'ROUND_RESULT', {
      type: 'TIMEOUT',
      correctAnswer: this.currentQuiz.answer,
      explanation: this.currentQuiz.explanation,
      p1Hp: this.p1.hp,
      p2Hp: this.p2.hp
    });

    this.transitionTimer = setTimeout(() => {
      this.nextRound();
    }, 2800);
  }

  endMatch() {
    if (this.isEnded) return;
    this.isEnded = true;

    clearTimeout(this.roundTimer);
    clearTimeout(this.botAnswerTimer);
    clearTimeout(this.transitionTimer);

    let winnerId = null;
    let p1Result = 'DRAW';
    let p2Result = 'DRAW';
    let p1RpChange = 5;
    let p2RpChange = 5;

    if (this.p1.hp > this.p2.hp) {
      winnerId = this.p1.id;
      p1Result = 'WIN';
      p2Result = 'LOSE';
      p1RpChange = 25;
      p2RpChange = -12;
    } else if (this.p2.hp > this.p1.hp) {
      winnerId = this.p2.id;
      p1Result = 'LOSE';
      p2Result = 'WIN';
      p1RpChange = -12;
      p2RpChange = 25;
    }

    // Update DB for human players
    let p1Updated = null;
    let p2Updated = null;

    try {
      p1Updated = db.updateUserStats(this.p1.id, p1Result, p1RpChange);
      db.saveMatch(this.p1.id, this.p2.nickname, this.p2.isBot, p1Result, this.p1.score, this.p2.score, p1RpChange);

      if (!this.p2.isBot) {
        p2Updated = db.updateUserStats(this.p2.id, p2Result, p2RpChange);
        db.saveMatch(this.p2.id, this.p1.nickname, false, p2Result, this.p2.score, this.p1.score, p2RpChange);
      }
    } catch (e) {
      console.error('[DB] Error saving match record:', e);
    }

    // Broadcast Final Match Over Event
    broadcastToRoom(this, 'MATCH_OVER', {
      winnerId,
      p1: {
        id: this.p1.id,
        nickname: this.p1.nickname,
        score: this.p1.score,
        hp: this.p1.hp,
        result: p1Result,
        rpChange: p1RpChange,
        newRp: p1Updated ? p1Updated.rp : this.p1.rp,
        tier: p1Updated ? p1Updated.tier : null
      },
      p2: {
        id: this.p2.id,
        nickname: this.p2.nickname,
        score: this.p2.score,
        hp: this.p2.hp,
        result: p2Result,
        rpChange: p2RpChange,
        newRp: p2Updated ? p2Updated.rp : this.p2.rp,
        tier: p2Updated ? p2Updated.tier : null,
        isBot: this.p2.isBot
      },
      history: this.history
    });

    // Cleanup room after 10 seconds
    setTimeout(() => {
      activeRooms.delete(this.id);
    }, 10000);
  }
}

function createMatchRoom(p1, p2, isBotMatch) {
  const roomId = 'room_' + crypto.randomBytes(6).toString('hex');
  const room = new Room(roomId, p1, p2, isBotMatch);
  activeRooms.set(roomId, room);
  room.start();
  return room;
}

// -------------------------------------------------------------
// HTTP Server & Router
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
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
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('\n');

    clients.set(userId, { res, userId, lastSeen: Date.now() });
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
      clients.delete(userId);
      removeFromMatchQueue(userId);
      console.log(`[SSE] User ${userId} disconnected. Total active streams: ${clients.size}`);
    });
    return;
  }

  // 2. Helper for JSON Request Body
  function parseJsonBody(callback) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {};
        callback(null, data);
      } catch (err) {
        callback(err);
      }
    });
  }

  // 3. REST API Routes
  if (pathname === '/api/register' && req.method === 'POST') {
    parseJsonBody((err, body) => {
      if (err || !body.nickname || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '닉네임과 비밀번호를 입력해주세요.' }));
      }
      try {
        const user = db.createUser(body.nickname, body.password);
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
      const user = db.getUserByNickname(body.nickname);
      if (!user || user.password !== body.password) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: '닉네임 또는 비밀번호가 올바르지 않습니다.' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, user }));
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

  // 4. Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        }
      });
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`💧 워터팡! 맞춤법 배틀 서버가 시작되었습니다!`);
  console.log(`🌐 접속 주소: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
