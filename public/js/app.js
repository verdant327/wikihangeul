// -------------------------------------------------------------
// Season 3 Storage Keys & Tier Definition
// -------------------------------------------------------------
const STORAGE_KEYS = {
  USER: 'waterpang_s3_user',
  LEADERBOARD: 'waterpang_s3_leaderboard',
  LEGACY_S2_USER: 'waterpang_s2_user',
  LEGACY_S2_LEADERBOARD: 'waterpang_s2_leaderboard',
  LEGACY_USER: 'waterpang_user',
  LEGACY_LEADERBOARD: 'waterpang_leaderboard',
  HALL_OF_FAME: 'waterpang_s1_hall_of_fame',
  WRONG_NOTES_PREFIX: 'waterpang_wrongnotes_'
};

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

let lastLeaderboardFetch = 0;
async function refreshLeaderboardCache(force = false) {
  const now = Date.now();
  if (!force && now - lastLeaderboardFetch < 60000) return;
  lastLeaderboardFetch = now;
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      if (data.ok && Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));
      }
    }
  } catch (e) {}
}

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

// Prohibited word dictionary (Profanity, slurs, family insults, political/bypass terms)
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
  nickname: '하하하하하쌤'
};

function isProhibitedNickname(nickname, userId = null) {
  if (!nickname || typeof nickname !== 'string') return { prohibited: false };

  // Emoji check (No emojis allowed in nicknames)
  if (EMOJI_REGEX.test(nickname)) {
    return { prohibited: true, matched: '이모지 사용 불가' };
  }

  const clean = nickname.replace(/[\s_.,~!@#$%^&*()=+/\\|?:;'"<>-]/g, '').toLowerCase();

  // Authentic teacher account is allowed (Server will verify the teacher password: 990327)
  if (nickname.trim() === TEACHER_ACCOUNT.nickname) {
    return { prohibited: false };
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

// -------------------------------------------------------------
// Initialization & Auth
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  battleFX = new BattleFX('battle-fx-canvas');

  // Check Season 3 saved session or migrate seamlessly from Season 2 / Season 1
  let saved = localStorage.getItem(STORAGE_KEYS.USER);
  if (!saved) {
    const prevSaved = localStorage.getItem(STORAGE_KEYS.LEGACY_S2_USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);
    if (prevSaved) {
      try {
        const prevParsed = JSON.parse(prevSaved);
        if (prevParsed && prevParsed.nickname) {
          console.log('[Season 3] Migrating account to Season 3:', prevParsed.nickname);
          const s3User = {
            id: prevParsed.id || ('user_' + Math.random().toString(36).substring(2, 9)),
            nickname: prevParsed.nickname,
            password: prevParsed.password || 'saved_user',
            rp: 100,
            wins: 0,
            losses: 0,
            draws: 0,
            season: 3,
            season1_rp: prevParsed.season1_rp || prevParsed.rp || 100,
            avatar: prevParsed.avatar || '👦',
            tier: getTierInfo(100)
          };
          localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(s3User));
          saved = JSON.stringify(s3User);
        }
      } catch (e) {
        console.warn('Legacy migration error:', e);
      }
    }
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.nickname) {
        if (isProhibitedNickname(parsed.nickname, parsed.id).prohibited) {
          localStorage.removeItem(STORAGE_KEYS.USER);
          alert('❌ 부적절한 닉네임으로 인해 계정 이용이 제한되었습니다.\n새로운 바른 닉네임으로 계정을 만들어주세요!');
          showView('auth');
          refreshLeaderboardCache();
          setupEventListeners();
          return;
        }
        currentUser = parsed;
        updateUserData(parsed);
        showView('lobby');
        initSSE(parsed.id);
        // Proactively restore and sync account + leaderboard with server, then fetch verified profile
        syncUserWithServer(parsed).then(() => {
          fetchProfile(parsed.id);
        });
        refreshLeaderboardCache();
      }
    } catch (e) {
      console.warn('Session parse warning:', e);
    }
  } else {
    refreshLeaderboardCache();
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

  // Auth Form & Tabs
  let authMode = 'login'; // 'login' or 'register'
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const btnSubmitAuth = document.getElementById('btn-submit-auth');
  const btnForgot = document.getElementById('btn-forgot-pw');

  tabLogin.addEventListener('click', () => {
    authMode = 'login';
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    btnSubmitAuth.innerText = '로그인하기';
    if (btnForgot) btnForgot.style.display = 'block';
  });

  tabRegister.addEventListener('click', () => {
    authMode = 'register';
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    btnSubmitAuth.innerText = '새 계정 생성하기';
    if (btnForgot) btnForgot.style.display = 'none';
  });

  if (btnForgot) {
    btnForgot.addEventListener('click', () => {
      alert('💡 [비밀번호 안내]\n\n1. 서버 재시작으로 복원된 계정은 간편 비밀번호로 "saved_user"를 입력하시면 바로 접속됩니다!\n2. 혹시 이미 다른 친구가 사용 중인 닉네임인지 확인해보세요.\n3. 비밀번호를 완전히 잊으신 경우 선생님께 요청하시면 비밀번호를 초기화해주실 수 있습니다.');
    });
  }

  document.getElementById('form-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nickname = document.getElementById('auth-nickname').value.trim();
    const password = document.getElementById('auth-password').value;

    if (!nickname || !password) return;

    if (authMode === 'register' && isProhibitedNickname(nickname).prohibited) {
      alert('❌ 닉네임에 부적절한 단어(욕설, 비속어, 가족 지칭 등)가 포함되어 있어 사용할 수 없습니다.\n바르고 고운 닉네임을 사용해주세요!');
      return;
    }

    try {
      if (authMode === 'register') {
        let backupUser = null;
        let leaderboardSnapshot = [];
        try {
          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);
          if (u) backupUser = JSON.parse(u);
          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);
          if (lb) leaderboardSnapshot = JSON.parse(lb);
        } catch(e){}

        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })
        });
        const data = await res.json();
        if (data.ok && data.user) {
          showToast(`'${data.user.nickname}' 계정이 생성되었습니다!`);
          loginSuccess(data.user);
        } else {
          alert(data.error || '계정 생성에 실패했습니다.');
        }
      } else {
        let backupUser = null;
        let leaderboardSnapshot = [];
        try {
          const u = localStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.LEGACY_USER);
          if (u) backupUser = JSON.parse(u);
          const lb = localStorage.getItem(STORAGE_KEYS.LEADERBOARD) || localStorage.getItem(STORAGE_KEYS.LEGACY_LEADERBOARD);
          if (lb) leaderboardSnapshot = JSON.parse(lb);
        } catch(e){}

        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nickname, password, backupUser, leaderboardSnapshot })
        });
        const data = await res.json();
        if (data.ok && data.user) {
          showToast(`'${data.user.nickname}' 님 환영합니다!`);
          loginSuccess(data.user);
        } else {
          alert(data.error || '로그인에 실패했습니다.');
        }
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

function updateUserData(user) {
  currentUser = user;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  // Update Header
  document.getElementById('header-user-bar').style.display = 'flex';
  document.getElementById('header-nickname').innerText = user.nickname;
  updateTierBadge('header-tier-badge', user.tier, user.rp);

  // Update Lobby
  updateLobbyUI(user);
}

function loginSuccess(user) {
  updateUserData(user);
  showView('lobby');

  // Connect SSE
  initSSE(user.id);

  // Auto-sync and cache leaderboard in background
  syncUserWithServer(user);
  refreshLeaderboardCache();
}

function logout() {
  if (matchPollingInterval) {
    clearInterval(matchPollingInterval);
    matchPollingInterval = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.USER);
  document.getElementById('header-user-bar').style.display = 'none';
  showView('auth');
}

async function syncUserWithServer(userToSync) {
  if (!userToSync || !userToSync.nickname) return;
  try {
    let leaderboardSnapshot = [];
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
      if (cached) leaderboardSnapshot = JSON.parse(cached);
    } catch (e) {}

    const res = await fetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userToSync,
        leaderboardSnapshot
      })
    });
    const data = await res.json();
    if (data.ok && data.user) {
      console.log('[Sync] Account successfully preserved & restored with server:', data.user.nickname);
      updateUserData(data.user);
      return data.user;
    }
  } catch (err) {
    console.warn('[Sync] Server sync failed (offline or container starting):', err);
  }
}

async function fetchProfile(userId) {
  try {
    const res = await fetch(`/api/profile?userId=${userId}&_t=${Date.now()}`);
    const data = await res.json();
    if (data.ok && data.user) {
      // Anti-downgrade shield: Protect local verified RP from lower server value
      if (currentUser && typeof currentUser.rp === 'number') {
        if (data.user.rp < currentUser.rp) {
          console.warn(`[Profile] Anti-downgrade shield: Server RP (${data.user.rp}) is lower than local verified RP (${currentUser.rp}). Syncing higher RP to server.`);
          await syncUserWithServer(currentUser);
          return;
        }
      }
      updateUserData(data.user);
    } else if (currentUser) {
      // Container restarted on Render! Automatically sync and resurrect account
      await syncUserWithServer(currentUser);
    }
  } catch (err) {
    console.warn('[Profile] fetch error, syncing with server:', err);
    if (currentUser) {
      await syncUserWithServer(currentUser);
    }
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
  if (eventSource) {
    if (eventSource.readyState !== EventSource.CLOSED && eventSource.url.includes(`userId=${userId}`)) {
      return; // Already actively connected
    }
    eventSource.close();
  }

  eventSource = new EventSource(`/api/events?userId=${userId}`);

  eventSource.onopen = () => {
    console.log('[SSE] Stream connected successfully');
  };

  eventSource.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleServerEvent(msg.type, msg.payload);
    } catch (e) {
      console.error('[SSE] Parse error:', e);
    }
  };

  eventSource.onerror = () => {
    console.warn('[SSE] Connection lost, browser will auto-retry...');
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
// -------------------------------------------------------------
// Matchmaking Flow (Dual-Channel: SSE + Guaranteed Polling Fallback)
// -------------------------------------------------------------
let matchPollingInterval = null;
let isMatchingInProgress = false;

async function startMatching() {
  if (!currentUser || isMatchingInProgress) return;
  isMatchingInProgress = true;

  const btnStart = document.getElementById('btn-start-matching');
  if (btnStart) btnStart.disabled = true;

  initSSE(currentUser.id);

  currentRoomId = null;
  battleData = null;
  showView('matchmaking');

  if (matchPollingInterval) {
    clearInterval(matchPollingInterval);
    matchPollingInterval = null;
  }

  try {
    const res = await fetch('/api/match/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id })
    });
    const data = await res.json();
    if (!data.ok) {
      isMatchingInProgress = false;
      if (btnStart) btnStart.disabled = false;
      alert(data.error || '매칭 시작 실패');
      showView('lobby');
      return;
    }

    // 1. Instant match returned directly in join response
    if (data.result && data.result.status === 'MATCHED' && data.result.roomData) {
      console.log('[Match] Instant match via join response:', data.result.roomData);
      onMatchFound(data.result.roomData);
      return;
    }

    // 2. Dual-channel polling check (every 1000ms) to ensure neither player ever gets stuck
    matchPollingInterval = setInterval(async () => {
      const viewEl = document.getElementById('view-matchmaking');
      if (!viewEl || !viewEl.classList.contains('active')) {
        clearInterval(matchPollingInterval);
        matchPollingInterval = null;
        isMatchingInProgress = false;
        if (btnStart) btnStart.disabled = false;
        return;
      }

      try {
        const pollRes = await fetch(`/api/match/status?userId=${currentUser.id}&_t=${Date.now()}`);
        const pollData = await pollRes.json();
        if (pollData.ok && pollData.status === 'MATCHED' && pollData.roomData) {
          console.log('[Match] Polling detected match:', pollData.roomData);
          clearInterval(matchPollingInterval);
          matchPollingInterval = null;
          onMatchFound(pollData.roomData);
        }
      } catch (e) {
        // network polling error ignored
      }
    }, 1000);

  } catch (e) {
    isMatchingInProgress = false;
    if (btnStart) btnStart.disabled = false;
    alert('서버 연결 실패');
    showView('lobby');
  }
}

async function cancelMatching() {
  if (matchPollingInterval) {
    clearInterval(matchPollingInterval);
    matchPollingInterval = null;
  }
  isMatchingInProgress = false;
  const btnStart = document.getElementById('btn-start-matching');
  if (btnStart) btnStart.disabled = false;

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
let battleSyncInterval = null;
let currentClientRound = 0;

function onMatchFound(data) {
  isMatchingInProgress = false;
  const btnStart = document.getElementById('btn-start-matching');
  if (btnStart) btnStart.disabled = false;

  if (matchPollingInterval) {
    clearInterval(matchPollingInterval);
    matchPollingInterval = null;
  }

  // Prevent duplicate execution if both SSE and polling trigger simultaneously
  if (battleData && currentRoomId === data.roomId && views.battle.classList.contains('active')) {
    return;
  }

  battleData = data;
  currentRoomId = data.roomId;

  // Setup Fighters
  const isMeP1 = (data.p1.id === currentUser.id);
  const myData = isMeP1 ? data.p1 : data.p2;
  const oppData = isMeP1 ? data.p2 : data.p1;

  // Rank display next to nickname (No robot emoji)
  const myRank = myData.rank || (currentUser && currentUser.rank);
  const myRankText = myRank ? ` (${myRank}위)` : '';
  document.getElementById('name-p1').innerText = `${myData.nickname}${myRankText} (나)`;
  const av1 = document.getElementById('avatar-p1');
  if (av1 && av1.childNodes[0]) av1.childNodes[0].nodeValue = myData.avatar || '👦';

  const oppRankText = oppData.isBot ? ' (연습봇)' : (oppData.rank ? ` (${oppData.rank}위)` : '');
  document.getElementById('name-p2').innerText = `${oppData.nickname}${oppRankText}`;
  const av2 = document.getElementById('avatar-p2');
  if (av2 && av2.childNodes[0]) av2.childNodes[0].nodeValue = oppData.avatar || (oppData.isBot ? '🤖' : '👧');

  updateHpUI('p1', 100, 100);
  updateHpUI('p2', 100, 100);

  document.getElementById('quiz-question-text').innerText = '상대와 연결되었습니다! 곧 1라운드가 시작됩니다!';
  document.getElementById('quiz-options-container').innerHTML = '';
  document.getElementById('battle-live-banner').innerText = '💦 먼저 정답을 맞혀 물풍선을 던지세요!';
  document.getElementById('round-explanation-box').style.display = 'none';
  currentClientRound = 0;

  // Dual-channel battle state backup polling: ensures round ALWAYS starts even if SSE lags or drops
  if (battleSyncInterval) clearInterval(battleSyncInterval);
  battleSyncInterval = setInterval(async () => {
    if (!currentRoomId || !currentUser || !views.battle.classList.contains('active')) return;
    try {
      const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}&_t=${Date.now()}`);
      if (res.ok) {
        const state = await res.json();
        if (state.ok) {
          if (state.isEnded) {
            clearInterval(battleSyncInterval);
            battleSyncInterval = null;
            return;
          }
          if (state.round > currentClientRound && state.quiz) {
            console.log('[BattleSync] Syncing round state via polling:', state.round);
            onRoundStart({
              round: state.round,
              totalRounds: state.totalRounds,
              quiz: state.quiz,
              timeLimit: 10,
              p1: state.p1,
              p2: state.p2
            });
          }
        }
      }
    } catch (e) {
      console.warn('[BattleSync] Polling error:', e.message);
    }
  }, 1000);

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
  try {
    if (!data || !data.quiz) return;
    currentClientRound = data.round;
    hasAnsweredCurrentRound = false;

    // Sync HP bars with server state
    if (data.p1 && data.p2 && currentUser) {
      const isMeP1 = (battleData && battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1.id === currentUser.id);
      const myHp = isMeP1 ? data.p1.hp : data.p2.hp;
      const oppHp = isMeP1 ? data.p2.hp : data.p1.hp;
      updateHpUI('p1', typeof myHp === 'number' ? myHp : 100, 100);
      updateHpUI('p2', typeof oppHp === 'number' ? oppHp : 100, 100);
    }
    const expBox = document.getElementById('round-explanation-box');
    if (expBox) expBox.style.display = 'none';

    // Round indicator
    const roundInd = document.getElementById('battle-round-indicator');
    if (roundInd) roundInd.innerText = `라운드 ${data.round} / ${data.totalRounds || 10}`;
    const liveBanner = document.getElementById('battle-live-banner');
    if (liveBanner) liveBanner.innerText = '문제를 읽고 빠르게 정답을 누르세요!';

    // Reset drenched cards
    const cardP1 = document.getElementById('fighter-p1');
    const cardP2 = document.getElementById('fighter-p2');
    if (cardP1) cardP1.classList.remove('drenched');
    if (cardP2) cardP2.classList.remove('drenched');

    // Render question
    const qText = document.getElementById('quiz-question-text');
    if (qText) qText.innerText = data.quiz.question;

    // Render Options
    const container = document.getElementById('quiz-options-container');
    if (container) {
      container.innerHTML = '';
      (data.quiz.options || []).forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-option';
        btn.innerText = opt;
        btn.addEventListener('click', () => submitAnswer(opt, btn));
        container.appendChild(btn);
      });
    }

    // Start 10s Timer
    startRoundTimer(data.timeLimit || 10);
  } catch (err) {
    console.error('[RoundStart] Error in onRoundStart:', err);
  }
}

function startRoundTimer(seconds) {
  clearInterval(roundTimerInterval);
  roundTimeRemaining = seconds;

  const timerNum = document.getElementById('battle-timer-num');
  const timerFill = document.getElementById('battle-timer-fill');

  if (timerNum) timerNum.innerText = roundTimeRemaining;
  if (timerFill) timerFill.style.width = '100%';

  const totalMs = seconds * 1000;
  const startAt = Date.now();

  roundTimerInterval = setInterval(() => {
    const elapsed = Date.now() - startAt;
    const remaining = Math.max(0, totalMs - elapsed);
    const sec = Math.ceil(remaining / 1000);

    if (timerNum) timerNum.innerText = sec;
    if (timerFill) timerFill.style.width = `${(remaining / totalMs) * 100}%`;

    if (sec <= 3 && sec > 0 && remaining % 1000 < 100) {
      try { window.soundFX?.playTick(); } catch (e) {}
    }

    if (remaining <= 0) {
      clearInterval(roundTimerInterval);
      // Disable buttons immediately on round timeout to prevent late click contamination
      const buttons = document.querySelectorAll('.btn-option');
      buttons.forEach(b => b.disabled = true);
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
  try {
    const isMe = (data.userId === currentUser.id);

    if (isMe) {
      try { window.soundFX?.playWrong(); } catch (e) {}
      showToast('❌ 아쉽게도 오답입니다! 이번 라운드는 기회가 끝났습니다.');

      // Mark clicked button red
      const buttons = document.querySelectorAll('.btn-option');
      buttons.forEach(b => {
        if (b.innerText === data.userAnswer) {
          b.classList.add('wrong-pick');
        }
        b.disabled = true;
      });

      const banner = document.getElementById('battle-live-banner');
      if (banner) banner.innerText = '❌ 아쉽게도 오답입니다! 상대방에게 기회가 넘어갔습니다.';
    } else {
      const banner = document.getElementById('battle-live-banner');
      if (banner) banner.innerText = `💦 상대방(${data.nickname || '상대'})이 오답을 선택했습니다! 서둘러 맞히세요!`;
    }
  } catch (e) {
    console.error('[WrongAnswer] UI error:', e);
  }
}

function onRoundResult(data) {
  try {
    clearInterval(roundTimerInterval);

    // Show explanation box
    const explBox = document.getElementById('round-explanation-box');
    if (explBox && data.correctAnswer) {
      explBox.style.display = 'block';
      explBox.innerHTML = `<strong>💡 정답: ${data.correctAnswer}</strong><br>${data.explanation || ''}`;
    }

    // Highlight correct option button green
    const buttons = document.querySelectorAll('.btn-option');
    buttons.forEach(b => {
      b.disabled = true;
      if (b.innerText === data.correctAnswer) {
        b.classList.add('correct-pick');
      }
    });

    const hasWinner = (data.type === 'ATTACK' || !!data.winnerId);

    if (hasWinner) {
      const isMeWinner = (data.winnerId === currentUser.id);

      // Resize FX canvas
      if (battleFX) {
        try { battleFX.resize(); } catch (e) {}
      }

      // In DOM, avatar-p1 is ALWAYS ME (left), avatar-p2 is ALWAYS OPPONENT (right)
      const elP1 = document.getElementById('avatar-p1');
      const elP2 = document.getElementById('avatar-p2');
      const canvas = document.getElementById('battle-fx-canvas');

      let p1Pos = { x: 120, y: 140 };
      let p2Pos = { x: 420, y: 140 };

      if (elP1 && elP2 && canvas) {
        const p1Rect = elP1.getBoundingClientRect();
        const p2Rect = elP2.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();

        if (cRect.width > 0 && cRect.height > 0) {
          p1Pos = {
            x: p1Rect.left + p1Rect.width / 2 - cRect.left,
            y: p1Rect.top + p1Rect.height / 2 - cRect.top
          };
          p2Pos = {
            x: p2Rect.left + p2Rect.width / 2 - cRect.left,
            y: p2Rect.top + p2Rect.height / 2 - cRect.top
          };
        }
      }

      // Fix Bug 1: Winner ALWAYS throws AT the loser!
      // p1Pos is ME, p2Pos is OPPONENT
      const fromPos = isMeWinner ? p1Pos : p2Pos;
      const toPos = isMeWinner ? p2Pos : p1Pos;
      const victimCardId = isMeWinner ? 'fighter-p2' : 'fighter-p1';

      if (isMeWinner) {
        try { window.soundFX?.playCorrect(); } catch (e) {}
        const banner = document.getElementById('battle-live-banner');
        if (banner) banner.innerHTML = `🎉 <strong>정답!</strong> 시원하게 물풍선을 투척합니다! 💦`;
      } else {
        try { window.soundFX?.playWrong(); } catch (e) {}
        const banner = document.getElementById('battle-live-banner');
        if (banner) banner.innerHTML = `💦 상대방(${data.winnerName || '상대'})이 정답을 맞혀 물풍선을 던집니다!`;
      }

      // Safe extraction of HP
      const isRoomP1Me = (battleData && battleData.p1) ? (battleData.p1.id === currentUser.id) : (data.p1 && data.p1.id === currentUser.id);
      const p1Hp = (data.p1 && typeof data.p1.hp === 'number') ? data.p1.hp : (typeof data.p1Hp === 'number' ? data.p1Hp : 100);
      const p2Hp = (data.p2 && typeof data.p2.hp === 'number') ? data.p2.hp : (typeof data.p2Hp === 'number' ? data.p2Hp : 100);

      const myHp = isRoomP1Me ? p1Hp : p2Hp;
      const oppHp = isRoomP1Me ? p2Hp : p1Hp;

      const applyDamage = () => {
        const victimCard = document.getElementById(victimCardId);
        if (victimCard) victimCard.classList.add('drenched');
        updateHpUI('p1', myHp, 100);
        updateHpUI('p2', oppHp, 100);
      };

      if (battleFX) {
        try {
          battleFX.throwBalloon(fromPos, toPos, false, data.damage || 20, applyDamage);
        } catch (e) {
          applyDamage();
        }
        setTimeout(applyDamage, 700);
      } else {
        applyDamage();
      }

    } else {
      // Both wrong or timeout
      try { window.soundFX?.playWrong(); } catch (e) {}
      const banner = document.getElementById('battle-live-banner');
      if (banner) {
        if (data.allWrong) {
          banner.innerText = '😅 양쪽 모두 오답입니다! 물풍선 없이 다음 라운드로 넘어갑니다.';
        } else {
          banner.innerText = data.timeout ? '⌛ 시간 초과! 아무도 맞히지 못했습니다.' : '😅 둘 다 오답으로 물풍선이 날아가지 않았습니다.';
        }
      }
    }

    // Client-side Round Transition Backup Timer:
    // If next round (or match over) does not trigger within 3.2s, force sync state with server
    const resolvedRound = data.round;
    setTimeout(async () => {
      if (currentClientRound === resolvedRound && currentRoomId && views.battle.classList.contains('active')) {
        console.log('[TransitionSafety] Round', resolvedRound, 'transition did not arrive in 3.2s. Force-syncing state...');
        try {
          const res = await fetch(`/api/game/state?roomId=${currentRoomId}&userId=${currentUser.id}&_t=${Date.now()}`);
          if (res.ok) {
            const state = await res.json();
            if (state.ok) {
              if (state.isEnded) {
                return;
              }
              if (state.round > currentClientRound && state.quiz) {
                console.log('[TransitionSafety] Advanced to round', state.round, 'via safety poll');
                onRoundStart({
                  round: state.round,
                  totalRounds: state.totalRounds,
                  quiz: state.quiz,
                  timeLimit: 10,
                  p1: state.p1,
                  p2: state.p2
                });
              }
            }
          }
        } catch (e) {
          console.warn('[TransitionSafety] Sync failed:', e);
        }
      }
    }, 3200);

  } catch (err) {
    console.error('[RoundResult] Error in onRoundResult:', err);
  }
}

function onMatchOver(data) {
  if (battleSyncInterval) {
    clearInterval(battleSyncInterval);
    battleSyncInterval = null;
  }
  clearInterval(roundTimerInterval);

  setTimeout(() => {
    showView('matchOver');

    const isMeP1 = (data.p1.id === currentUser.id);
    const myResult = isMeP1 ? data.p1 : data.p2;

    const resultEmoji = document.getElementById('result-emoji');
    const resultTitle = document.getElementById('result-title');
    const rpBadge = document.getElementById('result-rp-badge');

    // Extract clean numeric RP safely
    let currentTotalRp = 100;
    if (typeof myResult.newRp === 'number') {
      currentTotalRp = myResult.newRp;
    } else if (myResult.newRp && typeof myResult.newRp.rp === 'number') {
      currentTotalRp = myResult.newRp.rp;
    } else if (currentUser && typeof currentUser.rp === 'number') {
      currentTotalRp = Math.max(0, currentUser.rp + (myResult.rpChange || 0));
    }

    // Keep currentUser in sync
    if (currentUser) {
      currentUser.rp = currentTotalRp;
      try {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
        updateUserData(currentUser);
      } catch (e) {}
    }

    const changeVal = myResult.rpChange || 0;
    const changeText = changeVal > 0 ? `+${changeVal}` : `${changeVal}`;

    isMatchingInProgress = false;
    const btnStart = document.getElementById('btn-start-matching');
    if (btnStart) btnStart.disabled = false;

    if (myResult.result === 'WIN') {
      try { window.soundFX?.playVictory(); } catch (e) {}
      resultEmoji.innerText = '👑';
      resultTitle.innerText = '짜릿한 승리!';
      resultTitle.className = 'result-title win';
      rpBadge.className = 'rp-badge-change plus';
      rpBadge.innerText = `${changeText} RP 획득! (현재 ${currentTotalRp} RP)`;
    } else if (myResult.result === 'LOSE') {
      try { window.soundFX?.playDefeat(); } catch (e) {}
      resultEmoji.innerText = '💧';
      resultTitle.innerText = '아쉬운 패배!';
      resultTitle.className = 'result-title lose';
      rpBadge.className = 'rp-badge-change minus';
      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;
    } else {
      resultEmoji.innerText = '🤝';
      resultTitle.innerText = '무승부!';
      resultTitle.className = 'result-title draw';
      rpBadge.className = 'rp-badge-change plus';
      rpBadge.innerText = `${changeText} RP (현재 ${currentTotalRp} RP)`;
    }

    // Render Round Recap & Automatically save unsolved rounds to client wrong notes
    const recapList = document.getElementById('match-recap-list');
    recapList.innerHTML = '';

    // Save unsolved/wrong rounds to student's local wrong notes immediately
    try {
      const myKey = 'waterpang_wrongnotes_' + currentUser.id;
      let existingNotes = [];
      const savedNotes = localStorage.getItem(myKey);
      if (savedNotes) {
        try { existingNotes = JSON.parse(savedNotes); } catch (e) {}
      }
      if (!Array.isArray(existingNotes)) existingNotes = [];

      const newUnsolved = [];
      const nowFormatted = new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

      (data.history || []).forEach(h => {
        if (!h || !h.quiz) return;
        const isMyWin = (h.winnerId === currentUser.id);

        if (!isMyWin) {
          const userAns = (h.userAnswers && h.userAnswers[currentUser.id]) || (h.allWrong ? '오답 선택' : (h.timeout ? '시간 초과' : '상대방 정답'));
          const itemNote = {
            id: Date.now() + Math.random(),
            user_id: currentUser.id,
            quiz_id: h.quiz.id,
            question: h.quiz.question,
            explanation: h.quiz.explanation,
            user_answer: userAns,
            correct_answer: h.quiz.answer,
            created_at: nowFormatted
          };
          // Remove old duplicate for this quiz so latest is at top
          const dupIdx = existingNotes.findIndex(n => n.quiz_id === h.quiz.id);
          if (dupIdx !== -1) existingNotes.splice(dupIdx, 1);
          newUnsolved.push(itemNote);
        }

        const div = document.createElement('div');
        div.className = 'recap-item';
        div.innerHTML = `
          <div>
            <strong>[R${h.round}] ${h.quiz.answer}</strong>: ${h.quiz.question.replace(/\n/g, ' ')}
            <div style="font-size: 12px; color: #0284c7; margin-top: 2px;">💡 ${h.quiz.explanation}</div>
          </div>
          <span style="font-weight: bold; white-space: nowrap; color: ${isMyWin ? '#10b981' : '#64748b'};">
            ${isMyWin ? '내가 맞힘 🎯' : (h.winnerName ? `${h.winnerName} 정답` : '오답/시간초과')}
          </span>
        `;
        recapList.appendChild(div);
      });

      const mergedNotes = [...newUnsolved, ...existingNotes].slice(0, 50);
      localStorage.setItem(myKey, JSON.stringify(mergedNotes));
    } catch (err) {
      console.warn('Error saving local wrong notes in recap:', err);
    }

    // Refresh profile and leaderboard cache in background
    fetchProfile(currentUser.id);
    refreshLeaderboardCache();
  }, 2200);
}

// -------------------------------------------------------------
// Modals: Leaderboard & Wrong Answer Notes
// -------------------------------------------------------------
function scrollToMyRank() {
  const myRow = document.getElementById('my-leaderboard-row');
  if (myRow) {
    myRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    myRow.classList.add('pulse-highlight');
    setTimeout(() => myRow.classList.remove('pulse-highlight'), 1200);
  }
}

function renderLeaderboardItems(list, container) {
  const summaryBox = document.getElementById('leaderboard-my-summary');
  const modalTitle = document.getElementById('leaderboard-modal-title');

  if (!Array.isArray(list) || list.length === 0) {
    if (modalTitle) modalTitle.innerText = '🏆 명예의 전당 (시즌3)';
    if (summaryBox) summaryBox.innerHTML = '';
    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">아직 기록된 학생이 없습니다. 첫 번째 챔피언이 되어보세요!</div>';
    return;
  }

  if (modalTitle) {
    modalTitle.innerText = `🏆 명예의 전당 (시즌3) (전체 ${list.length}명)`;
  }

  // Check currentUser rank
  const myRankIdx = currentUser
    ? list.findIndex(u => (u.id && u.id === currentUser.id) || (u.nickname && u.nickname === currentUser.nickname))
    : -1;

  if (summaryBox) {
    if (myRankIdx !== -1) {
      const myUser = list[myRankIdx];
      const rankNum = myRankIdx + 1;
      const medal = rankNum === 1 ? '🥇 ' : (rankNum === 2 ? '🥈 ' : (rankNum === 3 ? '🥉 ' : ''));
      const badge = (myUser.tier && myUser.tier.badge) || '💧';
      const tierName = (myUser.tier && myUser.tier.name) || '물방울';

      summaryBox.innerHTML = `
        <div class="my-rank-banner" onclick="scrollToMyRank()" title="클릭하면 내 순위 위치로 이동합니다">
          <div class="my-rank-left">
            <div class="my-rank-label">⭐ 내 순위 확인 (클릭하여 위치 이동)</div>
            <div class="my-rank-pos">${medal}${rankNum}위 <span class="my-rank-total">/ 전체 ${list.length}명</span></div>
          </div>
          <div class="my-rank-right">
            <div class="my-rank-tier">${badge} ${tierName}</div>
            <div class="my-rank-rp">${myUser.rp || 100} RP</div>
            <span class="my-rank-jump-hint">📍 내 위치로 이동</span>
          </div>
        </div>
      `;
    } else if (currentUser) {
      summaryBox.innerHTML = `
        <div class="my-rank-banner guest">
          <div class="my-rank-left">
            <div class="my-rank-label">⭐ ${currentUser.nickname}님의 순위</div>
            <div class="my-rank-pos">시즌 3 등록됨 <span class="my-rank-total">(전체 ${list.length}명)</span></div>
          </div>
          <div class="my-rank-right">
            <div style="font-size: 12px; color: #64748b;">게임을 플레이하여 RP를 올려보세요! 🎮</div>
          </div>
        </div>
      `;
    } else {
      summaryBox.innerHTML = '';
    }
  }

  container.innerHTML = '';
  list.forEach((user, idx) => {
    const isMe = currentUser && ((user.id && user.id === currentUser.id) || (user.nickname && user.nickname === currentUser.nickname));
    const isTop1 = (idx === 0);
    const isTop2 = (idx === 1);
    const isTop3 = (idx === 2);

    let rowClass = 'leaderboard-row';
    if (isTop1) rowClass += ' rank-1';
    else if (isTop2) rowClass += ' rank-2';
    else if (isTop3) rowClass += ' rank-3';
    if (isMe) rowClass += ' my-rank-row';

    const badge = (user.tier && user.tier.badge) || '💧';
    const tierName = (user.tier && user.tier.name) || '물방울';
    const rankLabel = isTop1 ? '🥇' : (isTop2 ? '🥈' : (isTop3 ? '🥉' : `${idx + 1}위`));

    const row = document.createElement('div');
    row.className = rowClass;
    if (isMe) row.id = 'my-leaderboard-row';

    row.innerHTML = `
      <div class="leaderboard-rank">${rankLabel}</div>
      <div class="leaderboard-user">
        <span style="font-size: 20px;">${badge}</span>
        <div>
          <div style="display: flex; align-items: center;">
            <strong>${user.nickname}</strong>
            ${isMe ? '<span class="my-badge">나</span>' : ''}
          </div>
          <div style="font-size: 11px; color: #64748b;">${tierName} · 승률 ${user.win_rate || 0}% (${user.wins || 0}승 ${user.losses || 0}패)</div>
        </div>
      </div>
      <div style="font-weight: bold; color: #0284c7; font-size: 16px;">
        ${user.rp || 100} RP
      </div>
    `;
    container.appendChild(row);
  });
}

async function openLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  const modalTitle = document.getElementById('leaderboard-modal-title');
  if (modalTitle) modalTitle.innerText = '🏆 명예의 전당 (시즌3)';

  // Show cached leaderboard immediately
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderLeaderboardItems(parsed, container);
      }
    }
  } catch (e) {}

  if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {
    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">불러오는 중...</div>';
  }
  document.getElementById('modal-leaderboard').classList.add('active');

  setTimeout(() => {
    const myRow = document.getElementById('my-leaderboard-row');
    if (myRow) myRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 200);

  try {
    const res = await fetch('/api/leaderboard');
    if (res.status === 304) {
      lastLeaderboardFetch = Date.now();
      return;
    }
    const data = await res.json();
    if (data.ok && data.leaderboard) {
      if (data.leaderboard.length > 0) {
        lastLeaderboardFetch = Date.now();
        localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));
        renderLeaderboardItems(data.leaderboard, container);
        setTimeout(() => {
          const myRow = document.getElementById('my-leaderboard-row');
          if (myRow) myRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      } else if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {
        renderLeaderboardItems([], container);
      }
    }
  } catch (e) {
    console.warn('Leaderboard fetch error, using cache:', e);
  }
}

function renderWrongNotesItems(list, container) {
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 35px 20px; color: #10b981; font-size: 17px; font-weight: bold;">🎉 아직 틀린 문제가 없습니다! 아주 훌륭해요!</div>';
    return;
  }
  container.innerHTML = '';
  list.forEach(w => {
    const item = document.createElement('div');
    item.style.cssText = 'background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.03);';
    
    const qText = w.question ? `<div style="font-size: 15px; font-weight: bold; color: #1e293b; margin-bottom: 8px; line-height: 1.4;">${w.question.replace(/\n/g, '<br>')}</div>` : '';
    const explText = w.explanation ? `<div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #1e40af; margin-top: 8px; line-height: 1.4;">💡 <strong>해설:</strong> ${w.explanation}</div>` : '';

    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
        <span>📝 문제 #${w.quiz_id || ''}</span>
        <span>${w.created_at || ''}</span>
      </div>
      ${qText}
      <div style="display: flex; gap: 16px; font-size: 15px; margin-bottom: 4px; flex-wrap: wrap;">
        <span style="color: #ef4444; font-weight: bold;">❌ 내 선택: ${w.user_answer}</span>
        <span style="color: #10b981; font-weight: bold;">⭕ 정답: ${w.correct_answer}</span>
      </div>
      ${explText}
    `;
    container.appendChild(item);
  });
}

async function openWrongNotes() {
  if (!currentUser) return;
  const container = document.getElementById('wrongnotes-container');

  // Show cached wrong answers first if available
  try {
    const cached = localStorage.getItem('waterpang_wrongnotes_' + currentUser.id);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        renderWrongNotesItems(parsed, container);
      }
    }
  } catch (e) {}

  if (!container.hasChildNodes()) {
    container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">불러오는 중...</div>';
  }
  document.getElementById('modal-wrongnotes').classList.add('active');

  try {
    const res = await fetch(`/api/profile?userId=${currentUser.id}`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.wrongAnswers)) {
      localStorage.setItem('waterpang_wrongnotes_' + currentUser.id, JSON.stringify(data.wrongAnswers));
      renderWrongNotesItems(data.wrongAnswers, container);
    }
  } catch (e) {
    if (!container.hasChildNodes() || container.innerText.includes('불러오는 중')) {
      container.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">오답노트를 불러오지 못했습니다. 다시 시도해주세요.</div>';
    }
  }
}
