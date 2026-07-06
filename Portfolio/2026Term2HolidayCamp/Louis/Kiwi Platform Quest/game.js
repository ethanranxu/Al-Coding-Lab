const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const starsEl = document.getElementById("stars");
const livesEl = document.getElementById("lives");
const timeEl = document.getElementById("time");

const W = canvas.width;
const H = canvas.height;
const WORLD_W = 2940;
const GROUND_Y = 548;
const GRAVITY = 0.58;
const MOVE = 3.8;
const JUMP = 14.2;

const sheet = new Image();
sheet.src = "Kiwi-Platform-Quest-assets.png";

const sprites = {
  kiwi: { sx: 18, sy: 28, sw: 286, sh: 420 },
  star: { sx: 486, sy: 130, sw: 334, sh: 364 },
  monster: { sx: 945, sy: 98, sw: 458, sh: 424 },
  door: { sx: 31, sy: 559, sw: 361, sh: 417 },
  block: { sx: 439, sy: 675, sw: 507, sh: 306 },
  spikes: { sx: 972, sy: 686, sw: 388, sh: 295 }
};

const keys = new Set();
const held = new Set();
let running = false;
let won = false;
let last = 0;
let cameraX = 0;
let elapsed = 0;

const player = {
  x: 70,
  y: 420,
  w: 58,
  h: 88,
  vx: 0,
  vy: 0,
  grounded: false,
  dir: 1,
  lives: 3,
  inv: 0,
  stars: 0
};

const platforms = [
  { x: -40, y: GROUND_Y, w: 760, h: 92 },
  { x: 820, y: GROUND_Y, w: 420, h: 92 },
  { x: 1380, y: GROUND_Y, w: 470, h: 92 },
  { x: 2000, y: GROUND_Y, w: 920, h: 92 },
  { x: 460, y: 430, w: 230, h: 58 },
  { x: 860, y: 352, w: 240, h: 58 },
  { x: 1260, y: 442, w: 230, h: 58 },
  { x: 1680, y: 354, w: 240, h: 58 },
  { x: 2150, y: 430, w: 240, h: 58 }
];

const hazards = [
  { x: 720, y: 494, w: 112, h: 64 },
  { x: 1245, y: 494, w: 120, h: 64 },
  { x: 1868, y: 494, w: 132, h: 64 }
];

const enemies = [
  { x: 980, y: 462, w: 76, h: 72, left: 860, right: 1160, vx: 0.9 },
  { x: 1580, y: 462, w: 76, h: 72, left: 1460, right: 1810, vx: -1.05 },
  { x: 2280, y: 462, w: 76, h: 72, left: 2050, right: 2500, vx: 1.1 }
];

const collectibles = [
  { x: 535, y: 350, r: 24, got: false },
  { x: 960, y: 270, r: 24, got: false },
  { x: 1335, y: 365, r: 24, got: false },
  { x: 1760, y: 274, r: 24, got: false },
  { x: 2250, y: 350, r: 24, got: false }
];

const door = { x: 2680, y: 383, w: 104, h: 166 };

function resetLevel(full = false) {
  player.x = 70;
  player.y = 420;
  player.vx = 0;
  player.vy = 0;
  player.grounded = false;
  player.inv = 80;
  cameraX = 0;
  elapsed = 0;
  won = false;
  if (full) {
    player.lives = 3;
    player.stars = 0;
    collectibles.forEach((star) => (star.got = false));
  }
}

function rectsHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function drawSprite(sprite, x, y, w, h, flip = false, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (flip) {
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 0, 0, w, h);
  } else {
    ctx.drawImage(sheet, sprite.sx, sprite.sy, sprite.sw, sprite.sh, x, y, w, h);
  }
  ctx.restore();
}

function drawBlock(x, y, w, h) {
  const cap = Math.min(64, h);
  ctx.drawImage(sheet, sprites.block.sx, sprites.block.sy, sprites.block.sw, sprites.block.sh, x, y, w, h);
  ctx.fillStyle = "rgba(35, 111, 43, 0.2)";
  ctx.fillRect(x + 8, y + cap - 8, w - 16, 8);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#7fd2ff");
  gradient.addColorStop(0.62, "#dff6ff");
  gradient.addColorStop(0.63, "#75bf63");
  gradient.addColorStop(1, "#3e8d45");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  for (let i = 0; i < 9; i++) {
    const x = ((i * 420 - cameraX * 0.28) % (W + 260)) - 130;
    const y = 60 + (i % 3) * 58;
    ctx.beginPath();
    ctx.ellipse(x, y, 62, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 46, y + 4, 44, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 45, y + 7, 38, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function updateHud() {
  starsEl.textContent = `Stars ${player.stars}/5`;
  livesEl.textContent = `Lives ${player.lives}`;
  timeEl.textContent = `Time ${String(Math.floor(elapsed)).padStart(3, "0")}`;
}

function hurt() {
  if (player.inv > 0 || won) return;
  player.lives -= 1;
  if (player.lives <= 0) {
    overlay.classList.remove("hidden");
    overlay.querySelector("h1").textContent = "Try Again";
    overlay.querySelector("p").textContent = "The spikes and monsters got the kiwi. Restart level one.";
    startButton.textContent = "Restart";
    running = false;
    resetLevel(true);
  } else {
    resetLevel(false);
  }
}

function finish() {
  won = true;
  running = false;
  overlay.classList.remove("hidden");
  overlay.querySelector("h1").textContent = "Level 1 Clear!";
  overlay.querySelector("p").textContent = `You collected all stars in ${Math.floor(elapsed)} seconds.`;
  startButton.textContent = "Play Again";
}

function physics() {
  const left = keys.has("ArrowLeft") || keys.has("KeyA") || held.has("left");
  const right = keys.has("ArrowRight") || keys.has("KeyD") || held.has("right");
  const jump = keys.has("ArrowUp") || keys.has("KeyW") || keys.has("Space") || held.has("jump");

  player.vx = 0;
  if (left) {
    player.vx = -MOVE;
    player.dir = -1;
  }
  if (right) {
    player.vx = MOVE;
    player.dir = 1;
  }
  if (jump && player.grounded) {
    player.vy = -JUMP;
    player.grounded = false;
  }

  player.x += player.vx;
  player.x = Math.max(0, Math.min(player.x, WORLD_W - player.w));

  player.vy += GRAVITY;
  player.y += player.vy;
  player.grounded = false;

  for (const p of platforms) {
    const wasAbove = player.y + player.h - player.vy <= p.y + 8;
    if (rectsHit(player, p) && player.vy >= 0 && wasAbove) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.grounded = true;
    }
  }

  if (player.y > H + 120) hurt();

  for (const star of collectibles) {
    if (!star.got) {
      const dx = player.x + player.w / 2 - star.x;
      const dy = player.y + player.h / 2 - star.y;
      if (Math.hypot(dx, dy) < star.r + 44) {
        star.got = true;
        player.stars += 1;
      }
    }
  }

  for (const hazard of hazards) {
    if (rectsHit(player, hazard)) hurt();
  }

  for (const enemy of enemies) {
    enemy.x += enemy.vx;
    if (enemy.x < enemy.left || enemy.x > enemy.right) enemy.vx *= -1;
    if (rectsHit(player, enemy)) {
      if (player.vy > 5 && player.y + player.h - enemy.y < 32) {
        player.vy = -11;
        enemy.x = enemy.vx > 0 ? enemy.left : enemy.right;
      } else {
        hurt();
      }
    }
  }

  if (rectsHit(player, door) && player.stars === collectibles.length) finish();

  player.inv = Math.max(0, player.inv - 1);
  cameraX = Math.max(0, Math.min(player.x - W * 0.38, WORLD_W - W));
}

function draw() {
  drawBackground();
  ctx.save();
  ctx.translate(-cameraX, 0);

  platforms.forEach((p) => drawBlock(p.x, p.y, p.w, p.h));

  ctx.fillStyle = "rgba(19, 32, 52, 0.16)";
  for (let x = 0; x < WORLD_W; x += 120) {
    ctx.fillRect(x, GROUND_Y + 76, 70, 10);
  }

  hazards.forEach((h) => drawSprite(sprites.spikes, h.x, h.y - 32, h.w, h.h + 34));
  collectibles.forEach((star, index) => {
    if (!star.got) {
      const pulse = 1 + Math.sin(performance.now() / 220 + index) * 0.08;
      drawSprite(sprites.star, star.x - 30 * pulse, star.y - 30 * pulse, 60 * pulse, 60 * pulse);
    }
  });

  enemies.forEach((enemy) => {
    drawSprite(sprites.monster, enemy.x - 8, enemy.y - 22, enemy.w + 16, enemy.h + 28, enemy.vx < 0);
  });

  drawSprite(sprites.door, door.x, door.y, door.w, door.h);
  if (player.stars < collectibles.length) {
    ctx.fillStyle = "rgba(19, 32, 52, 0.78)";
    ctx.font = "800 20px Segoe UI, sans-serif";
    ctx.fillText(`${collectibles.length - player.stars} stars`, door.x - 8, door.y - 14);
  }

  const blink = player.inv > 0 && Math.floor(player.inv / 6) % 2 === 0;
  drawSprite(sprites.kiwi, player.x - 14, player.y - 20, player.w + 28, player.h + 28, player.dir < 0, blink ? 0.55 : 1);

  ctx.restore();
}

function loop(now) {
  if (!last) last = now;
  const delta = Math.min(32, now - last);
  last = now;
  if (running) {
    elapsed += delta / 1000;
    physics();
  }
  draw();
  updateHud();
  requestAnimationFrame(loop);
}

function startGame() {
  overlay.classList.add("hidden");
  startButton.textContent = "Start Level 1";
  resetLevel(true);
  running = true;
  won = false;
  last = performance.now();
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === "KeyR") startGame();
});

window.addEventListener("keyup", (event) => keys.delete(event.code));
startButton.addEventListener("click", startGame);

document.querySelectorAll("[data-hold]").forEach((button) => {
  const action = button.dataset.hold;
  const begin = (event) => {
    event.preventDefault();
    held.add(action);
  };
  const end = (event) => {
    event.preventDefault();
    held.delete(action);
  };
  button.addEventListener("pointerdown", begin);
  button.addEventListener("pointerup", end);
  button.addEventListener("pointercancel", end);
  button.addEventListener("pointerleave", end);
});

sheet.addEventListener("load", () => {
  draw();
  updateHud();
  requestAnimationFrame(loop);
});
