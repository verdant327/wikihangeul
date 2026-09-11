// Main Game Application Logic

let currentUser = null;
let currentRoomId = null;
let eventSource = null;
let battleFX = null;
let roundTimerInterval = null;
let roundTimeRemaining = 10;
let hasAnsweredCurrentRound = false;

// DOM Elements
const views = {
  auth: document.getElementById('view-auth'),
  lobby: document.getElementById('view-lobby'),
  matchmaking: document.getElementById('view-matchmaking'),
  battle: document.getElementById('view-battle'),
  matchOver: document.getElementById('view-match-over')
};

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  if (views[name]) {
    views[name].classList.add('active');
  }
  if (name === 'battle' && battleFX) {
    setTimeout(() => battleFX.resize(), 100);
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

// -------------------------------------------------------------
// Initialization & Auth
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  battleFX = new BattleFX('battle-fx-canvas');

  // Check saved session
  const saved = localStorage.getItem('waterpang_user');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      fetchProfile(parsed.id);
    } catch (e) {
      localStorage.removeItem('waterpang_user');
    }
  }

  setupEventListeners();
});

function setupEventListeners() {
  // Sound toggle
  const btnSound = document.getElementById('btn-sound-toggle');
  btnSound.addEventListener('click', () => {
    const on = window.soundFX.toggle();
    btnSound.innerText = on ? '🔊' : '🔇';
    showToast(on ? '소리가 켜졌습니다.' : '소리가 꺼졌습니다.');
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      logout();
    }
  });

  // Auth Form
  document.getElementById('form-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('auth-nickname').value.trim();
    const password = document.getElementById('auth-password').value;

    try {
      // First try login, if fail then register
      let res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password })
      });
      let data = await res.json();

      if (!res.ok) {
        // Try register
        res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname, password })
        });
        data = await res.json();
      }

      if (data.ok && data.user) {
        loginSuccess(data.user);
      } else {
        alert(data.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      alert('서버 연결 오류가 발생했습니다.');
    }
  });

  // Quick Guest
  document.getElementById('btn-quick-guest').addEventListener('click', async () => {
    const prefixes = ['날쌘', '용감한', '번개', '튼튼한', '지혜로운', '귀여운', '신나는', '힘찬'];
    const names = ['돌고래', '다람쥐', '물방울', '거북이', '호랑이', '토끼', '수달', '펭귄'];
    const randomNick = prefixes[Math.floor(Math.random() * prefixes.length)] +
      names[Math.floor(Math.random() * names.length)] +
      Math.floor(Math.random() * 90 + 10);
    const pin = '1234';

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: randomNick, password: pin })
      });
      const data = await res.json();
      if (data.ok && data.user) {
        loginSuccess(data.user);
        showToast(`'${randomNick}' 계정으로 바로 입장했습니다!`);
      }
    } catch (err) {
      alert('서버 연결 오류가 발생했습니다.');
    }
  });

  // Lobby actions
  document.getElementById('btn-start-matching').addEventListener('click', startMatching);
  document.getElementById('btn-cancel-matching').addEventListener('click', cancelMatching);
  document.getElementById('btn-return-lobby').addEventListener('click', () => {
    if (currentUser) fetchProfile(currentUser.id);
    showView('lobby');
  });
  document.getElementById('btn-rematch').addEventListener('click', () => {
    startMatching();
  });

  // Modals
  document.getElementById('btn-open-leaderboard').addEventListener('click', openLeaderboard);
  document.getElementById('btn-close-leaderboard').addEventListener('click', () => {
    document.getElementById('modal-leaderboard').classList.remove('active');
  });

  document.getElementById('btn-open-wrongnotes').addEventListener('click', openWrongNotes);
  document.getElementById('btn-close-wrongnotes').addEventListener('click', () => {
    document.getElementById('modal-wrongnotes').classList.remove('active');
  });
}

function loginSuccess(user) {
  currentUser = user;
  localStorage.setItem('waterpang_user', JSON.stringify(user));

  // Update Header
  document.getElementById('header-user-bar').style.display = 'flex';
  document.getElementById('header-nickname').innerText = user.nickname;
  updateTierBadge('header-tier-badge', user.tier, user.rp);

  // Update Lobby
  updateLobbyUI(user);
  showView('lobby');

  // Connect SSE
  initSSE(user.id);
}

function logout() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  currentUser = null;
  localStorage.removeItem('waterpang_user');
  document.getElementById('header-user-bar').style.display = 'none';
  showView('auth');
}

async function fetchProfile(userId) {
  try {
    const res = await fetch(`/api/profile?userId=${userId}`);
    const data = await res.json();
    if (data.ok && data.user) {
      loginSuccess(data.user);
    } else {
      logout();
    }
  } catch (err) {
    logout();
  }
}

function updateTierBadge(elementId, tier, rp) {
  const el = document.getElementById(elementId);
  if (!el || !tier) return;
  el.innerText = `${tier.badge} ${tier.name} (${rp} RP)`;
  el.style.borderColor = tier.color;
}

function updateLobbyUI(user) {
  document.getElementById('lobby-nickname').innerText = user.nickname;
  updateTierBadge('lobby-tier-badge', user.tier, user.rp);
  document.getElementById('stat-wins').innerText = user.wins;
  document.getElementById('stat-losses').innerText = user.losses;

  const total = user.wins + user.losses;
  const rate = total > 0 ? Math.round((user.wins / total) * 100) : 0;
  document.getElementById('stat-winrate').innerText = `${rate}%`;

  const nextThreshold = user.tier ? user.tier.max + 1 : 200;
  const needed = Math.max(0, nextThreshold - user.rp);
  document.getElementById('tier-next-rp').innerText = `${needed} RP`;
}

// -------------------------------------------------------------
// SSE Real-Time Communication
// -------------------------------------------------------------
function initSSE(userId) {
  if (eventSource) eventSource.close();

  eventSource = new EventSource(`/api/events?userId=${userId}`);

  eventSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerEvent(msg.type, msg.payload);
    } catch (e) {
      console.error('[SSE] Parse error:', e);
    }
  };

  eventSource.onerror = () => {
    console.warn('[SSE] Connection lost, retrying...');
  };
}

function handleServerEvent(type, payload) {
  console.log('[Game Event]', type, payload);

  switch (type) {
    case 'MATCH_FOUND':
      onMatchFound(payload);
      break;
    case 'ROUND_START':
      onRoundStart(payload);
      break;
    case 'ATTACK':
    case 'ROUND_RESULT':
      onRoundResult(payload);
      break;
    case 'WRONG_ANSWER':
      onWrongAnswer(payload);
      break;
    case 'MATCH_OVER':
      onMatchOver(payload);
      break;
  }
}

// -------------------------------------------------------------
// Matchmaking Flow
// -------------------------------------------------------------
async function startMatching() {
  if (!currentUser) return;
  showView('matchmaking');

  try {
    const res = await fetch('/api/match/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const data = await res.json();
    if (!data.ok) {
      alert(data.error || '매칭 시작 실패');
      showView('lobby');
    }
  } catch (e) {
    alert('서버 연결 실패');
    showView('lobby');
  }
}

async function cancelMatching() {
  if (!currentUser) return;
  try {
    await fetch('/api/match/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
  } catch (e) {}
  showView('lobby');
}

// -------------------------------------------------------------
// Battle Scene
// -------------------------------------------------------------
let battleData = null;

function onMatchFound(data) {
  battleData = data;
  currentRoomId = data.roomId;

  // Setup Fighters
  const isMeP1 = (data.p1.id === currentUser.id);
  const myData = isMeP1 ? data.p1 : data.p2;
  const oppData = isMeP1 ? data.p2 : data.p1;

  document.getElementById('name-p1').innerText = `${myData.nickname} (나)`;
  document.getElementById('avatar-p1').childNodes[0].nodeValue = myData.avatar || '👦';

  document.getElementById('name-p2').innerText = oppData.nickname + (oppData.isBot ? ' 🤖' : '');
  document.getElementById('avatar-p2').childNodes[0].nodeValue = oppData.avatar || (oppData.isBot ? '🤖' : '👧');

  updateHpUI('p1', 100, 100);
  updateHpUI('p2', 100, 100);

  document.getElementById('quiz-question-text').innerText = '상대와 연결되었습니다! 곧 1라운드가 시작됩니다!';
  document.getElementById('quiz-options-container').innerHTML = '';
  document.getElementById('battle-live-banner').innerText = '💦 먼저 정답을 맞혀 물풍선을 던지세요!';
  document.getElementById('round-explanation-box').style.display = 'none';

  showView('battle');
}

function updateHpUI(target, curHp, maxHp) {
  const percent = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
  const bar = document.getElementById(`hp-bar-${target}`);
  const text = document.getElementById(`hp-num-${target}`);

  if (bar) {
    bar.style.width = `${percent}%`;
    bar.className = 'hp-bar-fill';
    if (percent < 30) bar.classList.add('danger');
    else if (percent < 60) bar.classList.add('warning');
  }
  if (text) {
    text.innerText = `${curHp} / ${maxHp}`;
  }
}

function onRoundStart(data) {
  hasAnsweredCurrentRound = false;
  document.getElementById('round-explanation-box').style.display = 'none';

  // Round indicator
  document.getElementById('battle-round-indicator').innerText = `라운드 ${data.round} / ${data.totalRounds}`;
  document.getElementById('battle-live-banner').innerText = '문제를 읽고 빠르게 정답을 누르세요!';

  // Reset drenched cards
  document.getElementById('fighter-p1').classList.remove('drenched');
  document.getElementById('fighter-p2').classList.remove('drenched');

  // Render question
  document.getElementById('quiz-question-text').innerText = data.quiz.question;

  // Render Options
  const container = document.getElementById('quiz-options-container');
  container.innerHTML = '';

  data.quiz.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'btn-option';
    btn.innerText = opt;
    btn.addEventListener('click', () => submitAnswer(opt, btn));
    container.appendChild(btn);
  });

  // Start 10s Timer
  startRoundTimer(data.timeLimit || 10);
}

function startRoundTimer(seconds) {
  clearInterval(roundTimerInterval);
  roundTimeRemaining = seconds;

  const timerNum = document.getElementById('battle-timer-num');
  const timerFill = document.getElementById('battle-timer-fill');

  timerNum.innerText = roundTimeRemaining;
  timerFill.style.width = '100%';

  const totalMs = seconds * 1000;
  const startAt = Date.now();

  roundTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startAt;
    const remaining = Math.max(0, totalMs - elapsed);
    const sec = Math.ceil(remaining / 1000);

    timerNum.innerText = sec;
    timerFill.style.width = `${(remaining / totalMs) * 100}%`;

    if (sec <= 3 && sec > 0 && remaining % 1000 < 100) {
      window.soundFX.playTick();
    }

    if (remaining <= 0) {
      clearInterval(roundTimerInterval);
    }
  }, 100);
}

async function submitAnswer(answer, clickedBtn) {
  if (hasAnsweredCurrentRound || !currentRoomId) return;
  hasAnsweredCurrentRound = true;

  // Disable all options
  const buttons = document.querySelectorAll('.btn-option');
  buttons.forEach(b => b.disabled = true);

  try {
    await fetch('/api/game/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: currentRoomId,
        userId: currentUser.id,
        answer
      })
    });
  } catch (e) {
    console.error('Answer send error:', e);
  }
}

function onWrongAnswer(data) {
  if (data.userId === currentUser.id) {
    window.soundFX.playWrong();
    showToast('아쉽게도 틀렸습니다! 이번 라운드는 기회가 끝났습니다.');

    // Mark clicked button red
    const buttons = document.querySelectorAll('.btn-option');
    buttons.forEach(b => {
      if (b.innerText === data.userAnswer) {
        b.classList.add('wrong-pick');
      }
      b.disabled = true;
    });

    document.getElementById('battle-live-banner').innerText = '❌ 오답입니다! 상대방에게 기회가 넘어갔습니다.';
  } else {
    document.getElementById('battle-live-banner').innerText = `상대(${data.nickname})가 틀렸습니다! 서둘러 맞히세요!`;
  }
}

function onRoundResult(data) {
  clearInterval(roundTimerInterval);

  // Show explanation box
  const explBox = document.getElementById('round-explanation-box');
  explBox.style.display = 'block';
  explBox.innerHTML = `<strong>💡 정답: ${data.correctAnswer}</strong><br>${data.explanation}`;

  // Highlight correct option button
  const buttons = document.querySelectorAll('.btn-option');
  buttons.forEach(b => {
    b.disabled = true;
    if (b.innerText === data.correctAnswer) {
      b.classList.add('correct-pick');
    }
  });

  if (data.type === 'ATTACK') {
    const isMeWinner = (data.winnerId === currentUser.id);

    // Calculate canvas coordinates for throw
    const p1Card = document.getElementById('avatar-p1').getBoundingClientRect();
    const p2Card = document.getElementById('avatar-p2').getBoundingClientRect();
    const canvasRect = document.getElementById('battle-fx-canvas').getBoundingClientRect();

    const p1Pos = {
      x: p1Card.left + p1Card.width / 2 - canvasRect.left,
      y: p1Card.top + p1Card.height / 2 - canvasRect.top
    };
    const p2Pos = {
      x: p2Card.left + p2Card.width / 2 - canvasRect.left,
      y: p2Card.top + p2Card.height / 2 - canvasRect.top
    };

    const fromPos = isMeWinner ? p1Pos : p2Pos;
    const toPos = isMeWinner ? p2Pos : p1Pos;
    const victimCardId = isMeWinner ? 'fighter-p2' : 'fighter-p1';

    if (isMeWinner) {
      window.soundFX.playCorrect();
      document.getElementById('battle-live-banner').innerHTML =
        `🎉 <strong>정답!</strong> ${data.timeTaken}초 만에 물풍선을 투척합니다!`;
    } else {
      document.getElementById('battle-live-banner').innerHTML =
        `💦 상대방(${data.winnerName})이 정답을 맞혀 물풍선을 던집니다!`;
    }

    // Launch Animated Water Balloon
    battleFX.throwBalloon(fromPos, toPos, data.isCritical, data.damage, () => {
      // On Hit Callback:
      const victimCard = document.getElementById(victimCardId);
      victimCard.classList.add('drenched');

      // Update HP
      if (battleData) {
        const isMeP1 = (battleData.p1.id === currentUser.id);
        const myHp = isMeP1 ? data.p1Hp : data.p2Hp;
        const oppHp = isMeP1 ? data.p2Hp : data.p1Hp;
        updateHpUI('p1', myHp, 100);
        updateHpUI('p2', oppHp, 100);
      }
    });

  } else if (data.type === 'DRAW' || data.type === 'TIMEOUT') {
    window.soundFX.playWrong();
    document.getElementById('battle-live-banner').innerText =
      data.type === 'TIMEOUT' ? '⌛ 시간 초과! 아무도 맞히지 못했습니다.' : '😅 둘 다 오답으로 물풍선이 바닥에 터졌습니다!';
  }
}

// -------------------------------------------------------------
// Match Over
// -------------------------------------------------------------
function onMatchOver(data) {
  clearInterval(roundTimerInterval);

  setTimeout(() => {
    showView('matchOver');

    const isMeP1 = (data.p1.id === currentUser.id);
    const myResult = isMeP1 ? data.p1 : data.p2;

    const resultEmoji = document.getElementById('result-emoji');
    const resultTitle = document.getElementById('result-title');
    const rpBadge = document.getElementById('result-rp-badge');

    if (myResult.result === 'WIN') {
      window.soundFX.playVictory();
      resultEmoji.innerText = '👑';
      resultTitle.innerText = '짜릿한 승리!';
      resultTitle.className = 'result-title win';
      rpBadge.className = 'rp-badge-change plus';
      rpBadge.innerText = `+${myResult.rpChange} RP 획득! (현재 ${myResult.newRp} RP)`;
    } else if (myResult.result === 'LOSE') {
      window.soundFX.playDefeat();
      resultEmoji.innerText = '💧';
      resultTitle.innerText = '아쉬운 패배!';
      resultTitle.className = 'result-title lose';
      rpBadge.className = 'rp-badge-change minus';
      rpBadge.innerText = `${myResult.rpChange} RP (현재 ${myResult.newRp} RP)`;
    } else {
      resultEmoji.innerText = '🤝';
      resultTitle.innerText = '무승부!';
      resultTitle.className = 'result-title draw';
      rpBadge.className = 'rp-badge-change plus';
      rpBadge.innerText = `+${myResult.rpChange} RP (현재 ${myResult.newRp} RP)`;
    }

    // Render Round Recap
    const recapList = document.getElementById('match-recap-list');
    recapList.innerHTML = '';

    (data.history || []).forEach(h => {
      const div = document.createElement('div');
      div.className = 'recap-item';
      div.innerHTML = `
        <div>
          <strong>[R${h.round}] ${h.quiz.answer}</strong>: ${h.quiz.question.replace(/\n/g, ' ')}
          <div style="font-size: 12px; color: #0284c7; margin-top: 2px;">💡 ${h.quiz.explanation}</div>
        </div>
        <span style="font-weight: bold; white-space: nowrap; color: ${h.winnerId === currentUser.id ? '#10b981' : '#64748b'};">
          ${h.winnerId === currentUser.id ? '내가 맞힘 🎯' : (h.winnerName || '무승부')}
        </span>
      `;
      recapList.appendChild(div);
    });

    // Refresh profile in background
    fetchProfile(currentUser.id);
  }, 2200);
}

// -------------------------------------------------------------
// Modals: Leaderboard & Wrong Answer Notes
// -------------------------------------------------------------
async function openLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  container.innerHTML = '<div style="text-align: center; color: #64748b;">불러오는 중...</div>';
  document.getElementById('modal-leaderboard').classList.add('active');

  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    if (data.ok && data.leaderboard) {
      if (data.leaderboard.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">아직 기록된 학생이 없습니다. 첫 번째 챔피언이 되어보세요!</div>';
        return;
      }
      container.innerHTML = '';
      data.leaderboard.forEach((user, idx) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row ${idx === 0 ? 'rank-1' : ''}`;
        row.innerHTML = `
          <div class="leaderboard-rank">${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}위`))}</div>
          <div class="leaderboard-user">
            <span style="font-size: 20px;">${user.tier.badge}</span>
            <div>
              <strong>${user.nickname}</strong>
              <div style="font-size: 11px; color: #64748b;">${user.tier.name} · 승률 ${user.win_rate}% (${user.wins}승 ${user.losses}패)</div>
            </div>
          </div>
          <div style="font-weight: bold; color: #0284c7; font-size: 16px;">
            ${user.rp} RP
          </div>
        `;
        container.appendChild(row);
      });
    }
  } catch (e) {
    container.innerHTML = '<div style="color: red; text-align: center;">불러오기 실패</div>';
  }
}

async function openWrongNotes() {
  if (!currentUser) return;
  const container = document.getElementById('wrongnotes-container');
  container.innerHTML = '<div style="text-align: center; color: #64748b;">불러오는 중...</div>';
  document.getElementById('modal-wrongnotes').classList.add('active');

  try {
    const res = await fetch(`/api/profile?userId=${currentUser.id}`);
    const data = await res.json();
    if (data.ok && data.wrongAnswers) {
      if (data.wrongAnswers.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #10b981; font-size: 17px;">🎉 아직 틀린 문제가 없습니다! 아주 훌륭해요!</div>';
        return;
      }
      container.innerHTML = '';
      data.wrongAnswers.forEach(w => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 10px;';
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
            <span>오답 기록</span>
            <span>${w.created_at}</span>
          </div>
          <div style="font-size: 15px; margin-bottom: 4px;">
            <span style="color: #ef4444; font-weight: bold;">내가 고른 답: ${w.user_answer} ❌</span>
          </div>
          <div style="font-size: 16px; color: #059669; font-weight: bold; margin-bottom: 6px;">
            정답: ${w.correct_answer} ⭕
          </div>
        `;
        container.appendChild(item);
      });
    }
  } catch (e) {
    container.innerHTML = '<div style="color: red; text-align: center;">불러오기 실패</div>';
  }
}
