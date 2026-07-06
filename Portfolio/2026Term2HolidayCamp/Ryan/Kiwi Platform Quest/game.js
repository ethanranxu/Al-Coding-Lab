const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const coinEl = document.querySelector("#coins");
const livesEl = document.querySelector("#lives");
const timeEl = document.querySelector("#time");
const restartBtn = document.querySelector("#restart");
const audioToggleBtn = document.querySelector("#audio-toggle");

const W = canvas.width;
const H = canvas.height;
const tile = 36;
const gravity = 1800;
const keys = new Set();
const spritesheet = new Image();
spritesheet.src = "./kiwi-platform-quest-assets.png";
const sprites = {
  kiwi: { x: 28, y: 28, w: 286, h: 414 },
  star: { x: 485, y: 132, w: 368, h: 368 },
  monster: { x: 946, y: 99, w: 456, h: 422 },
  door: { x: 30, y: 558, w: 362, h: 417 },
  platform: { x: 438, y: 674, w: 478, h: 307 },
  spikes: { x: 970, y: 685, w: 392, h: 296 },
};
const palette = {
  dirt: "#8e552a",
  dirtDark: "#673514",
  grass: "#2fae59",
  grassDark: "#1d783b",
  brick: "#bf5b2c",
  brickDark: "#773116",
  question: "#f5b844",
  coin: "#ffd84f",
  pipe: "#22994d",
  pipeDark: "#126b35",
  flag: "#f8f2dc",
  red: "#d33232",
  blue: "#2474c9",
  skin: "#ffd4a3",
  black: "#1a1b22",
};

const audio = {
  ctx: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  timer: null,
  beat: 0,
  muted: false,
  started: false,
  melody: [
    392, 523.25, 659.25, 523.25,
    440, 587.33, 698.46, 587.33,
    329.63, 493.88, 659.25, 493.88,
    349.23, 440, 587.33, 523.25,
  ],
  bass: [130.81, 130.81, 196, 196, 146.83, 146.83, 220, 220],
};

const level = {
  width: 4200,
  spawn: { x: 120, y: 260 },
  flagX: 3920,
  solids: [
    rect(0, 468, 4200, 72, "ground"),
    rect(420, 390, 144, 36, "platform"),
    rect(690, 330, 72, 36, "starBlock", "star"),
    rect(850, 330, 72, 36, "platform"),
    rect(1000, 390, 144, 36, "platform"),
    rect(1280, 420, 86, 48, "platform"),
    rect(1600, 360, 180, 36, "platform"),
    rect(1880, 310, 72, 36, "starBlock", "power"),
    rect(2180, 400, 216, 36, "platform"),
    rect(2480, 346, 144, 36, "starBlock", "star"),
    rect(2750, 420, 108, 48, "platform"),
    rect(3030, 390, 252, 36, "platform"),
    rect(3360, 340, 180, 36, "platform"),
  ],
  hazards: [
    hazard(1160, 424, 132, 44),
    hazard(1788, 424, 132, 44),
    hazard(2640, 424, 132, 44),
    hazard(3570, 424, 132, 44),
  ],
  coins: [
    coin(455, 330), coin(505, 330), coin(725, 270), coin(1035, 330),
    coin(1090, 330), coin(1640, 300), coin(1700, 300), coin(2240, 340),
    coin(2300, 340), coin(2520, 286), coin(3080, 330), coin(3140, 330),
    coin(3430, 280), coin(3500, 280),
  ],
  enemies: [
    enemy(620, 432, 500, 820),
    enemy(1450, 432, 1390, 1740),
    enemy(2350, 432, 2180, 2580),
    enemy(3180, 432, 3020, 3300),
  ],
};

let state;

function rect(x, y, w, h, kind, prize = null) {
  return { x, y, w, h, kind, prize, used: false, bump: 0 };
}

function coin(x, y) {
  return { x, y, r: 12, taken: false, spin: Math.random() * Math.PI };
}

function enemy(x, y, min, max) {
  return { x, y, w: 30, h: 30, vx: -70, min, max, alive: true, squash: 0 };
}

function hazard(x, y, w, h) {
  return { x, y, w, h };
}

function reset() {
  state = {
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      w: 28,
      h: 42,
      vx: 0,
      vy: 0,
      grounded: false,
      facing: 1,
      invincible: 0,
      big: false,
    },
    camera: 0,
    coins: 0,
    lives: 3,
    time: 300,
    win: false,
    gameOver: false,
    message: "",
    particles: [],
  };
  level.solids.forEach((s) => {
    s.used = false;
    s.bump = 0;
  });
  level.coins.forEach((c) => (c.taken = false));
  level.enemies.forEach((e, i) => {
    e.x = [620, 1450, 2350, 3180][i];
    e.y = 432;
    e.vx = -70;
    e.alive = true;
    e.squash = 0;
  });
  updateHud();
}

function updateHud() {
  coinEl.textContent = state.coins;
  livesEl.textContent = state.lives;
  timeEl.textContent = Math.max(0, Math.ceil(state.time));
}

function ensureAudio() {
  if (audio.muted) return;
  if (!audio.ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audio.ctx = new AudioContextClass();
    audio.master = audio.ctx.createGain();
    audio.musicGain = audio.ctx.createGain();
    audio.sfxGain = audio.ctx.createGain();
    audio.master.gain.value = 0.72;
    audio.musicGain.gain.value = 0.18;
    audio.sfxGain.gain.value = 0.42;
    audio.musicGain.connect(audio.master);
    audio.sfxGain.connect(audio.master);
    audio.master.connect(audio.ctx.destination);
  }
  if (audio.ctx.state === "suspended") audio.ctx.resume();
  startMusic();
}

function startMusic() {
  if (!audio.ctx || audio.started || audio.muted) return;
  audio.started = true;
  scheduleMusicBeat();
  audio.timer = window.setInterval(scheduleMusicBeat, 220);
}

function scheduleMusicBeat() {
  if (!audio.ctx || audio.muted) return;
  const now = audio.ctx.currentTime;
  const note = audio.melody[audio.beat % audio.melody.length];
  const bass = audio.bass[Math.floor(audio.beat / 2) % audio.bass.length];
  playTone(note, 0.14, "square", audio.musicGain, now, 0.22);
  if (audio.beat % 2 === 0) playTone(bass, 0.2, "triangle", audio.musicGain, now, 0.16);
  audio.beat += 1;
}

function playTone(freq, duration, type, destination, startTime, volume) {
  if (!audio.ctx || !destination || audio.muted) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.03);
}

function playStarSound() {
  ensureAudio();
  if (!audio.ctx || audio.muted) return;
  const now = audio.ctx.currentTime;
  [659.25, 880, 1174.66, 1567.98].forEach((freq, i) => {
    playTone(freq, 0.12, "sine", audio.sfxGain, now + i * 0.045, 0.32);
  });
}

function setAudioMuted(muted) {
  audio.muted = muted;
  audioToggleBtn.classList.toggle("is-muted", muted);
  audioToggleBtn.textContent = muted ? "♪" : "♫";
  audioToggleBtn.setAttribute("aria-pressed", String(!muted));
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.72;
  if (!muted) ensureAudio();
}

function tick(dt) {
  if (state.win || state.gameOver) {
    updateParticles(dt);
    return;
  }
  state.time -= dt;
  if (state.time <= 0) hurtPlayer(true);
  movePlayer(dt);
  checkHazards();
  updateEnemies(dt);
  collectCoins();
  updateParticles(dt);
  state.camera = clamp(state.player.x - W * 0.42, 0, level.width - W);
  if (state.player.x > level.flagX) {
    state.win = true;
    state.message = "星门开启！";
    pop(state.player.x, state.player.y, "#ffd84f", 36);
  }
  updateHud();
}

function movePlayer(dt) {
  const p = state.player;
  const run = keys.has("Shift") || keys.has("run");
  const accel = run ? 1850 : 1400;
  const max = run ? 320 : 230;
  const friction = p.grounded ? 0.82 : 0.94;
  const dir = (keys.has("ArrowRight") || keys.has("d") || keys.has("right") ? 1 : 0) -
    (keys.has("ArrowLeft") || keys.has("a") || keys.has("left") ? 1 : 0);

  if (dir) {
    p.vx += dir * accel * dt;
    p.facing = dir;
  } else {
    p.vx *= friction;
  }
  p.vx = clamp(p.vx, -max, max);
  p.vy += gravity * dt;
  if ((keys.has(" ") || keys.has("ArrowUp") || keys.has("w") || keys.has("jump")) && p.grounded) {
    p.vy = run ? -690 : -620;
    p.grounded = false;
  }

  p.x += p.vx * dt;
  collideAxis(p, "x");
  p.y += p.vy * dt;
  p.grounded = false;
  collideAxis(p, "y");
  p.x = clamp(p.x, 12, level.width - p.w - 12);
  if (p.y > H + 160) hurtPlayer(true);
  p.invincible = Math.max(0, p.invincible - dt);
}

function collideAxis(p, axis) {
  for (const s of level.solids) {
    if (!overlap(p, s)) continue;
    if (axis === "x") {
      if (p.vx > 0) p.x = s.x - p.w;
      if (p.vx < 0) p.x = s.x + s.w;
      p.vx = 0;
    } else {
      if (p.vy > 0) {
        p.y = s.y - p.h;
        p.vy = 0;
        p.grounded = true;
      } else if (p.vy < 0) {
        p.y = s.y + s.h;
        p.vy = 0;
        bumpBlock(s);
      }
    }
  }
}

function bumpBlock(s) {
  if (s.kind === "starBlock" && !s.used) {
    s.used = true;
    s.bump = 10;
    if (s.prize === "star") {
      state.coins += 1;
      pop(s.x + s.w / 2, s.y - 12, palette.coin, 12);
    }
    if (s.prize === "power") {
      state.player.big = true;
      state.player.h = 52;
      state.coins += 3;
      pop(s.x + s.w / 2, s.y - 18, "#ff6b4a", 22);
    }
  }
}

function checkHazards() {
  for (const h of level.hazards) {
    if (overlap(state.player, h)) hurtPlayer(false);
  }
}

function updateEnemies(dt) {
  for (const e of level.enemies) {
    if (!e.alive) {
      e.squash -= dt;
      continue;
    }
    e.x += e.vx * dt;
    if (e.x < e.min || e.x + e.w > e.max) e.vx *= -1;
    if (!overlap(state.player, e)) continue;
    const p = state.player;
    if (p.vy > 120 && p.y + p.h - e.y < 24) {
      e.alive = false;
      e.squash = 0.28;
      p.vy = -420;
      state.coins += 1;
      pop(e.x + e.w / 2, e.y, "#ffffff", 10);
    } else {
      hurtPlayer(false);
    }
  }
}

function hurtPlayer(force) {
  const p = state.player;
  if (!force && p.invincible > 0) return;
  if (!force && p.big) {
    p.big = false;
    p.h = 42;
    p.invincible = 1.4;
    pop(p.x + p.w / 2, p.y, "#ff6b4a", 18);
    return;
  }
  state.lives -= 1;
  if (state.lives <= 0) {
    state.gameOver = true;
    state.message = "游戏结束";
    return;
  }
  p.x = Math.max(80, state.camera + 60);
  p.y = 220;
  p.vx = 0;
  p.vy = 0;
  p.invincible = 1.8;
}

function collectCoins() {
  const p = state.player;
  for (const c of level.coins) {
    if (c.taken) continue;
    c.spin += 0.12;
    const cx = c.x;
    const cy = c.y;
    if (cx > p.x - c.r && cx < p.x + p.w + c.r && cy > p.y - c.r && cy < p.y + p.h + c.r) {
      c.taken = true;
      state.coins += 1;
      pop(cx, cy, palette.coin, 8);
    }
  }
}

function pop(x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 230,
      vy: -Math.random() * 260 - 40,
      life: Math.random() * 0.45 + 0.28,
      color,
    });
  }
}

function updateParticles(dt) {
  state.particles = state.particles.filter((p) => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 700 * dt;
    return p.life > 0;
  });
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawBackground();
  ctx.save();
  ctx.translate(-state.camera, 0);
  drawLevel();
  drawCoins();
  drawEnemies();
  drawPlayer();
  drawParticles();
  drawFlag();
  ctx.restore();
  if (state.message) drawMessage(state.message);
}

function drawBackground() {
  const cam = state.camera;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#69bbff");
  grad.addColorStop(0.72, "#afe6ff");
  grad.addColorStop(0.72, "#76c967");
  grad.addColorStop(1, "#59ad52");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawCloud(120 - cam * 0.18, 74, 1.1);
  drawCloud(520 - cam * 0.12, 112, 0.8);
  drawCloud(900 - cam * 0.2, 64, 1);
  drawHill(160 - cam * 0.09, 468, 210, "#52a858");
  drawHill(620 - cam * 0.07, 468, 280, "#3d944d");
  drawHill(1020 - cam * 0.1, 468, 170, "#60bd61");
}

function drawCloud(x, y, s) {
  x = ((x % (W + 260)) + W + 260) % (W + 260) - 150;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(x, y + 18 * s, 24 * s, 0, Math.PI * 2);
  ctx.arc(x + 30 * s, y, 30 * s, 0, Math.PI * 2);
  ctx.arc(x + 66 * s, y + 17 * s, 24 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawHill(x, base, r, color) {
  x = ((x % (W + 500)) + W + 500) % (W + 500) - 240;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, base + 72, r, Math.PI, Math.PI * 2);
  ctx.fill();
}

function drawLevel() {
  for (const s of level.solids) {
    const y = s.y - s.bump;
    s.bump = Math.max(0, s.bump - 0.7);
    if (s.kind === "ground") drawGround(s);
    if (s.kind === "platform") drawPlatform(s.x, y, s.w, s.h);
    if (s.kind === "starBlock") drawStarBlock(s.x, y, s.w, s.h, s.used);
  }
  drawHazards();
}

function drawGround(s) {
  for (let x = s.x; x < s.x + s.w; x += 180) {
    drawSprite("platform", x, s.y - 18, 186, s.h + 90);
  }
}

function drawPlatform(x, y, w, h) {
  drawSprite("platform", x, y - h * 0.58, w, h * 1.95);
}

function drawStarBlock(x, y, w, h, used) {
  drawPlatform(x, y - 2, w, h + 10);
  ctx.globalAlpha = used ? 0.45 : 1;
  drawSprite("star", x + w * 0.18, y - h * 0.2, w * 0.64, h * 1.12);
  ctx.globalAlpha = 1;
}

function drawHazards() {
  for (const h of level.hazards) {
    drawSprite("spikes", h.x, h.y - 20, h.w, h.h + 20);
  }
}

function drawCoins() {
  for (const c of level.coins) {
    if (c.taken) continue;
    const size = 35 + Math.abs(Math.cos(c.spin)) * 5;
    drawSprite("star", c.x - size / 2, c.y - size / 2, size, size);
  }
}

function drawEnemies() {
  for (const e of level.enemies) {
    if (!e.alive && e.squash <= 0) continue;
    const h = e.alive ? e.h : 12;
    drawSprite("monster", e.x - 13, e.y + e.h - h - 18, 58, h + 26);
  }
}

function drawPlayer() {
  const p = state.player;
  if (p.invincible > 0 && Math.floor(performance.now() / 90) % 2 === 0) return;
  const x = p.x;
  const y = p.y;
  const h = p.h;
  const visualW = p.w + 26;
  const visualH = h + 24;
  const visualX = x + p.w / 2 - visualW / 2;
  const visualY = y + h - visualH;
  ctx.save();
  if (p.facing < 0) {
    ctx.translate(x + p.w / 2, 0);
    ctx.scale(-1, 1);
    drawSprite("kiwi", -visualW / 2, visualY, visualW, visualH);
  } else {
    drawSprite("kiwi", visualX, visualY, visualW, visualH);
  }
  ctx.restore();
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = clamp(p.life * 2, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 5, 5);
  }
  ctx.globalAlpha = 1;
}

function drawFlag() {
  const x = level.flagX + 60;
  drawSprite("door", x - 40, 286, 125, 182);
}

function drawMessage(text) {
  ctx.fillStyle = "rgba(23, 33, 51, 0.76)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff7df";
  ctx.font = "bold 58px Trebuchet MS, Microsoft YaHei";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, H / 2 - 24);
  ctx.font = "bold 22px Trebuchet MS, Microsoft YaHei";
  ctx.fillText("按 ↻ 或 R 重新开始", W / 2, H / 2 + 40);
}

function drawSprite(name, dx, dy, dw, dh) {
  const s = sprites[name];
  if (!spritesheet.complete || !s) return;
  ctx.drawImage(spritesheet, s.x, s.y, s.w, s.h, dx, dy, dw, dh);
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(event.key)) event.preventDefault();
  if (event.key.toLowerCase() === "r") reset();
  keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});

document.querySelectorAll("[data-hold]").forEach((btn) => {
  const key = btn.dataset.hold;
  const down = (event) => {
    event.preventDefault();
    keys.add(key);
  };
  const up = (event) => {
    event.preventDefault();
    keys.delete(key);
  };
  btn.addEventListener("pointerdown", down);
  btn.addEventListener("pointerup", up);
  btn.addEventListener("pointerleave", up);
  btn.addEventListener("pointercancel", up);
});

document.querySelectorAll("[data-tap]").forEach((btn) => {
  btn.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    keys.add(btn.dataset.tap);
  });
  btn.addEventListener("pointerup", (event) => {
    event.preventDefault();
    keys.delete(btn.dataset.tap);
  });
});

restartBtn.addEventListener("click", reset);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  tick(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
