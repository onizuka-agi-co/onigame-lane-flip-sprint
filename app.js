const arena = document.getElementById('arena');
const playerEl = document.getElementById('player');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const retryBtn = document.getElementById('retry-btn');
const overlay = document.getElementById('overlay');
const resultTitle = document.getElementById('result-title');
const resultReason = document.getElementById('result-reason');
const stateLabel = document.getElementById('state-label');
const timeLabel = document.getElementById('time-label');
const scoreLabel = document.getElementById('score-label');
const laneLabel = document.getElementById('lane-label');
const runCue = document.getElementById('run-cue');

const laneCount = 3;
const runSeconds = 45;
const readySeconds = 1.2;
const hazardSize = 56;
const liveCueFallbackMs = 1800;
const firstSpawnDelaySeconds = 0.72;

let laneIndex = 1;
let state = 'READY';
let timeLeft = runSeconds;
let readyLeft = readySeconds;
let score = 0;
let spawnTimer = 0;
let animationId = null;
let hazards = [];
let lastTs = 0;
let laneFeedbackTimer = null;
let laneBlockedFeedbackTimer = null;
let runCueTimer = null;
let liveCueWaitingForFirstMove = false;
let readyLockedCueCooldownUntil = 0;
let stateFeedbackTimer = null;
let queuedMoveDelta = 0;

function showRunCue(text, durationMs = 1300) {
  if (!runCue) {
    return;
  }
  runCue.textContent = text;
  runCue.hidden = false;
  if (runCueTimer) {
    clearTimeout(runCueTimer);
  }
  runCueTimer = setTimeout(() => {
    runCue.hidden = true;
    runCueTimer = null;
  }, durationMs);
}

function hideRunCue() {
  if (!runCue) {
    return;
  }
  if (runCueTimer) {
    clearTimeout(runCueTimer);
    runCueTimer = null;
  }
  runCue.hidden = true;
}

function showReadyLockedCue(queuedDelta = 0) {
  const now = performance.now();
  if (now < readyLockedCueCooldownUntil) {
    return;
  }
  readyLockedCueCooldownUntil = now + 420;

  const remain = Math.max(0, readyLeft);
  const queuedText =
    queuedDelta < 0 ? ' (queued left)' : queuedDelta > 0 ? ' (queued right)' : '';
  showRunCue(`Input locked - LIVE in ${remain.toFixed(1)}s${queuedText}`, 900);
  stateLabel.classList.add('state-feedback');
  if (stateFeedbackTimer) {
    clearTimeout(stateFeedbackTimer);
  }
  stateFeedbackTimer = setTimeout(() => {
    stateLabel.classList.remove('state-feedback');
    stateFeedbackTimer = null;
  }, 160);
}

function laneCenterPx(index) {
  const laneWidth = arena.clientWidth / laneCount;
  return laneWidth * index + laneWidth / 2;
}

function setState(next) {
  state = next;
  stateLabel.textContent = next;
  stateLabel.className = '';
  stateLabel.classList.add(`state-${next.toLowerCase()}`);
}

function updateHud() {
  timeLabel.textContent = timeLeft.toFixed(1);
  scoreLabel.textContent = `${score}`;
}

function renderPlayer() {
  const x = laneCenterPx(laneIndex);
  playerEl.style.left = `${x}px`;
  laneLabel.textContent = `${laneIndex + 1} / ${laneCount}`;
}

function clearHazards() {
  hazards.forEach((h) => h.el.remove());
  hazards = [];
}

function spawnHazard() {
  const lane = Math.floor(Math.random() * laneCount);
  const el = document.createElement('div');
  el.className = 'hazard';
  el.style.left = `${laneCenterPx(lane)}px`;
  arena.appendChild(el);
  hazards.push({ lane, y: -hazardSize, speed: 180 + Math.random() * 90, el });
}

function applyLaneDelta(delta) {
  const previousLane = laneIndex;
  laneIndex = Math.max(0, Math.min(laneCount - 1, laneIndex + delta));
  if (laneIndex !== previousLane) {
    if (liveCueWaitingForFirstMove) {
      liveCueWaitingForFirstMove = false;
      hideRunCue();
    }
    laneLabel.classList.add('lane-feedback');
    if (laneFeedbackTimer) {
      clearTimeout(laneFeedbackTimer);
    }
    laneFeedbackTimer = setTimeout(() => {
      laneLabel.classList.remove('lane-feedback');
    }, 120);
  } else {
    laneLabel.classList.add('lane-feedback-blocked');
    if (laneBlockedFeedbackTimer) {
      clearTimeout(laneBlockedFeedbackTimer);
    }
    laneBlockedFeedbackTimer = setTimeout(() => {
      laneLabel.classList.remove('lane-feedback-blocked');
    }, 160);
  }
  renderPlayer();
}

function moveLane(delta) {
  // Lock lane movement until the run actually starts to avoid accidental
  // pre-start drift right after retry.
  if (state !== 'LIVE') {
    if (state === 'READY') {
      queuedMoveDelta = delta;
      showReadyLockedCue(delta);
    }
    return;
  }
  applyLaneDelta(delta);
}

function endRun(reason, won) {
  setState('OVER');
  overlay.hidden = false;
  resultTitle.textContent = won ? 'Clear!' : 'Game Over';
  resultReason.textContent = won ? 'Reason: Survived 45s' : `Reason: ${reason}`;
  retryBtn.focus();
}

function collide(hazard) {
  const playerY = arena.clientHeight - 16 - 56;
  const yDiff = Math.abs(hazard.y - playerY);
  return hazard.lane === laneIndex && yDiff < 40;
}

function loop(ts) {
  if (!lastTs) {
    lastTs = ts;
  }
  const dt = Math.min((ts - lastTs) / 1000, 0.05);
  lastTs = ts;

  if (state === 'READY') {
    readyLeft -= dt;
    timeLeft = runSeconds;
    score = 0;
    if (readyLeft <= 0) {
      setState('LIVE');
      liveCueWaitingForFirstMove = true;
      showRunCue('LIVE - flip now', liveCueFallbackMs);
      if (queuedMoveDelta !== 0) {
        applyLaneDelta(queuedMoveDelta);
        queuedMoveDelta = 0;
      }
    }
  } else if (state === 'LIVE') {
    timeLeft = Math.max(0, timeLeft - dt);
    score += Math.floor(dt * 10);

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnHazard();
      spawnTimer = 0.32 + Math.random() * 0.35;
    }

    hazards = hazards.filter((h) => {
      h.y += h.speed * dt;
      h.el.style.transform = `translateY(${h.y}px)`;

      if (collide(h)) {
        endRun('Hit by hazard', false);
        return false;
      }

      if (h.y > arena.clientHeight + 80) {
        h.el.remove();
        return false;
      }
      return true;
    });

    if (timeLeft <= 0) {
      endRun('Survived all lanes', true);
    }
  }

  updateHud();
  if (state !== 'OVER') {
    animationId = requestAnimationFrame(loop);
  }
}

function resetGame() {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  laneIndex = 1;
  timeLeft = runSeconds;
  readyLeft = readySeconds;
  score = 0;
  // Give a short reaction window right after LIVE starts.
  spawnTimer = firstSpawnDelaySeconds;
  lastTs = 0;
  liveCueWaitingForFirstMove = false;
  queuedMoveDelta = 0;
  clearHazards();
  overlay.hidden = true;
  setState('READY');
  showRunCue('New run started');
  renderPlayer();
  updateHud();
  animationId = requestAnimationFrame(loop);
}

leftBtn.addEventListener('click', () => moveLane(-1));
rightBtn.addEventListener('click', () => moveLane(1));
retryBtn.addEventListener('click', resetGame);

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    moveLane(-1);
  }
  if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    moveLane(1);
  }
  if (event.key === ' ' && state === 'OVER') {
    event.preventDefault();
    resetGame();
  }
});

window.addEventListener('resize', () => {
  hazards.forEach((h) => {
    h.el.style.left = `${laneCenterPx(h.lane)}px`;
  });
  renderPlayer();
});

resetGame();
