import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const BALLS = 10;
export const GRAVITY = 600;
/** Seconds of holding to go from no power to full power. The meter then falls back. */
export const CHARGE_TIME = 1.2;
export const MIN_SPEED = 400;
export const MAX_SPEED = 900;
/** Wind is a sideways push on the ball, in px/s², between -MAX_WIND and MAX_WIND. */
export const MAX_WIND = 150;
export const BALL_RADIUS = 9;
export const DUNK_TIME = 1;
export const THROWER = { x: 90, y: 400 } as const;
export const TARGET = { x: 650, y: 250, radius: 22 } as const;
const ANGLE = Math.PI / 4;
const SEAT = { x: 700, y: 230 } as const;
const TANK = { x: 600, y: 300, width: 190, height: 150 } as const;

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface DunkTankState {
  balls: number;
  ball: Ball | null;
  /** Seconds the button has been held, or null when it is not held. */
  charge: number | null;
  wind: number;
  score: number;
  dunks: number;
  /** Seconds since the last dunk, or null while nobody is falling in. */
  dunkAge: number | null;
  phase: 'playing' | 'over';
}

/** A random wind for the next throw, rounded to 10 px/s². */
export function rollWind(random: () => number = Math.random): number {
  return Math.round(((random() * 2 - 1) * MAX_WIND) / 10) * 10;
}

export function createState(random: () => number = Math.random): DunkTankState {
  return {
    balls: BALLS,
    ball: null,
    charge: null,
    wind: rollWind(random),
    score: 0,
    dunks: 0,
    dunkAge: null,
    phase: 'playing',
  };
}

/** Power from 0 to 1 for how long the button was held. It rises, then falls back. */
export function powerFor(charge: number): number {
  const t = (charge / CHARGE_TIME) % 2;
  return t <= 1 ? t : 2 - t;
}

/** A dunk scores 10, plus 5 for every 50 px/s² of wind it beat, rounded up. */
export function scoreForDunk(wind: number): number {
  return 10 + 5 * Math.ceil(Math.abs(wind) / 50);
}

export function isHit(ball: Ball): boolean {
  return Math.hypot(ball.x - TARGET.x, ball.y - TARGET.y) <= TARGET.radius + BALL_RADIUS;
}

/** Starts filling the power meter. Returns false if a throw can't start now. */
export function startCharge(state: DunkTankState): boolean {
  if (state.phase !== 'playing' || state.balls === 0 || state.ball || state.charge !== null) {
    return false;
  }
  state.charge = 0;
  return true;
}

/** Throws the ball with the power on the meter. Returns false if nothing was thrown. */
export function release(state: DunkTankState): boolean {
  if (state.charge === null) return false;
  const speed = MIN_SPEED + powerFor(state.charge) * (MAX_SPEED - MIN_SPEED);
  state.charge = null;
  state.ball = {
    x: THROWER.x,
    y: THROWER.y,
    vx: Math.cos(ANGLE) * speed,
    vy: -Math.sin(ANGLE) * speed,
  };
  state.balls -= 1;
  return true;
}

/** Advances the game by `dt` seconds. A new wind blows after every throw lands. */
export function step(state: DunkTankState, dt: number, random: () => number = Math.random): void {
  if (state.charge !== null) state.charge += dt;

  if (state.dunkAge !== null) {
    state.dunkAge += dt;
    if (state.dunkAge >= DUNK_TIME) state.dunkAge = null;
  }

  const ball = state.ball;
  if (ball) {
    ball.vx += state.wind * dt;
    ball.vy += GRAVITY * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    const hit = isHit(ball);
    if (hit) {
      state.score += scoreForDunk(state.wind);
      state.dunks += 1;
      state.dunkAge = 0;
    }
    if (hit || ball.y > HEIGHT + BALL_RADIUS || ball.x > WIDTH + BALL_RADIUS || ball.x < 0) {
      state.ball = null;
      state.wind = rollWind(random);
    }
  }

  if (state.balls === 0 && !state.ball && state.dunkAge === null) state.phase = 'over';
}

function draw(ctx: CanvasRenderingContext2D, state: DunkTankState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // Wind: an arrow that points the way it blows, longer when it blows harder.
  const windY = 80;
  const length = (state.wind / MAX_WIND) * 120;
  ctx.strokeStyle = colors.muted;
  ctx.fillStyle = colors.muted;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2, windY);
  ctx.lineTo(WIDTH / 2 + length, windY);
  ctx.stroke();
  if (state.wind !== 0) {
    const tip = WIDTH / 2 + length;
    const dir = Math.sign(state.wind);
    ctx.beginPath();
    ctx.moveTo(tip + dir * 10, windY);
    ctx.lineTo(tip - dir * 4, windY - 9);
    ctx.lineTo(tip - dir * 4, windY + 9);
    ctx.fill();
  }
  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('small', 'bold');
  ctx.textAlign = 'center';
  const windLabel =
    state.wind === 0 ? 'calm' : `${Math.abs(state.wind)} ${state.wind > 0 ? '→' : '←'}`;
  ctx.fillText(`Wind ${windLabel}`, WIDTH / 2, windY + 30);

  // The tank, with the dunkee sinking into it after a dunk.
  ctx.fillStyle = colors.water;
  ctx.globalAlpha = 0.6;
  ctx.fillRect(TANK.x, TANK.y, TANK.width, TANK.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 3;
  ctx.strokeRect(TANK.x, TANK.y, TANK.width, TANK.height);
  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.fillText('tessl.io', TANK.x + TANK.width / 2, TANK.y + TANK.height - 20);

  const sink = state.dunkAge === null ? 0 : Math.min(state.dunkAge / 0.3, 1) * 110;
  ctx.fillStyle = colors.wood;
  ctx.fillRect(SEAT.x - 40, SEAT.y + 30, 80, 8);
  ctx.fillStyle = colors.accent;
  ctx.fillRect(SEAT.x - 14, SEAT.y - 10 + sink, 28, 40);
  ctx.beginPath();
  ctx.arc(SEAT.x, SEAT.y - 24 + sink, 14, 0, Math.PI * 2);
  ctx.fill();
  if (state.dunkAge !== null) {
    ctx.strokeStyle = colors.water;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1 - state.dunkAge / DUNK_TIME;
    ctx.beginPath();
    ctx.arc(SEAT.x, TANK.y, 10 + state.dunkAge * 80, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The target on its arm.
  ctx.fillStyle = colors.wood;
  ctx.fillRect(TARGET.x - 4, TARGET.y, 8, TANK.y - TARGET.y);
  for (const [scale, color] of [
    [1, colors.stripeB],
    [0.6, colors.stripeA],
    [0.25, colors.stripeB],
  ] as const) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(TARGET.x, TARGET.y, TARGET.radius * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // The thrower's spot and the power meter beside it.
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.arc(THROWER.x, THROWER.y, 20, 0, Math.PI * 2);
  ctx.fill();
  const meter = { x: 30, y: 280, width: 14, height: 140 };
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 2;
  ctx.strokeRect(meter.x, meter.y, meter.width, meter.height);
  if (state.charge !== null) {
    const filled = powerFor(state.charge) * meter.height;
    ctx.fillStyle = colors.danger;
    ctx.fillRect(meter.x, meter.y + meter.height - filled, meter.width, filled);
  }

  if (state.ball) {
    ctx.fillStyle = colors.text;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Balls ${state.balls}/${BALLS}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`${state.dunks} dunks! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const dunkTank: CarnivalGame = {
  id: 'dunk-tank',
  name: 'tessl.io Dunk Tank',
  description: 'Hold to charge your throw, read the wind, and dunk the dev into the tank.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = () => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        startCharge(state);
      }
    };
    const onUp = () => release(state);
    canvas.addEventListener('pointerdown', onDown);
    // Listen on the window so letting go outside the canvas still throws.
    window.addEventListener('pointerup', onUp);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(dunkTank.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  },
};

export default dunkTank;
