import { describe, expect, it } from 'vitest';
import {
  BALLS,
  CHARGE_TIME,
  DUNK_TIME,
  MAX_WIND,
  THROWER,
  TARGET,
  createState,
  isHit,
  powerFor,
  release,
  rollWind,
  scoreForDunk,
  startCharge,
  step,
  type DunkTankState,
} from './game';

const calm = () => 0.5;

/** Holds for `charge` seconds, throws, and lets the ball fly. Returns true on a dunk. */
function throwWith(state: DunkTankState, charge: number): boolean {
  const dunks = state.dunks;
  startCharge(state);
  state.charge = charge;
  release(state);
  for (let i = 0; i < 1000 && state.ball; i++) step(state, 1 / 120, calm);
  return state.dunks > dunks;
}

/** Every hold time, in steps of 0.01 s over one full rise of the meter, that dunks. */
function dunkingCharges(wind: number): number[] {
  const hits: number[] = [];
  for (let charge = 0; charge <= CHARGE_TIME; charge += 0.01) {
    const state = createState(calm);
    state.wind = wind;
    if (throwWith(state, charge)) hits.push(charge);
  }
  return hits;
}

describe('dunk tank', () => {
  it('starts with every ball and no score', () => {
    const state = createState(calm);
    expect(state.balls).toBe(BALLS);
    expect(state.score).toBe(0);
    expect(state.ball).toBeNull();
    expect(state.phase).toBe('playing');
  });

  it('rolls wind both ways, never past the limit', () => {
    expect(rollWind(() => 0)).toBe(-MAX_WIND);
    expect(rollWind(() => 0.5)).toBe(0);
    expect(rollWind(() => 0.999)).toBe(MAX_WIND);
  });

  it('fills the power meter while held, then lets it fall back', () => {
    expect(powerFor(0)).toBe(0);
    expect(powerFor(CHARGE_TIME / 2)).toBeCloseTo(0.5);
    expect(powerFor(CHARGE_TIME)).toBeCloseTo(1);
    expect(powerFor(CHARGE_TIME * 1.5)).toBeCloseTo(0.5);
  });

  it('charges only while the button is held', () => {
    const state = createState(calm);
    startCharge(state);
    step(state, 0.3, calm);
    expect(state.charge).toBeCloseTo(0.3);
  });

  it('throws one ball on release, harder for a longer hold', () => {
    const soft = createState(calm);
    startCharge(soft);
    soft.charge = 0.1;
    expect(release(soft)).toBe(true);
    expect(soft.balls).toBe(BALLS - 1);
    expect(soft.ball).toMatchObject({ x: THROWER.x, y: THROWER.y });

    const hard = createState(calm);
    startCharge(hard);
    hard.charge = 1;
    release(hard);
    expect(hard.ball!.vx).toBeGreaterThan(soft.ball!.vx);
  });

  it('does not release without a hold, or charge while a ball is in the air', () => {
    const state = createState(calm);
    expect(release(state)).toBe(false);
    startCharge(state);
    release(state);
    expect(startCharge(state)).toBe(false);
  });

  it('cannot throw once every ball is gone', () => {
    const state = createState(calm);
    state.balls = 0;
    expect(startCharge(state)).toBe(false);
  });

  it('dunks with the right power on a calm day', () => {
    expect(dunkingCharges(0).length).toBeGreaterThan(0);
  });

  it('makes the player counter the wind with a different power', () => {
    const calmHits = dunkingCharges(0);
    const headwind = dunkingCharges(-MAX_WIND);
    const tailwind = dunkingCharges(MAX_WIND);
    expect(headwind.length).toBeGreaterThan(0);
    expect(tailwind.length).toBeGreaterThan(0);
    // A headwind needs more power than calm, a tailwind less.
    const middle = (hits: number[]) => (Math.min(...hits) + Math.max(...hits)) / 2;
    expect(middle(headwind)).toBeGreaterThan(middle(calmHits));
    expect(middle(tailwind)).toBeLessThan(middle(calmHits));
    // The throw that dunks on a calm day falls short into a strong headwind.
    expect(headwind).not.toContain(calmHits[Math.floor(calmHits.length / 2)]);
  });

  it('blows the ball sideways', () => {
    const still = createState(calm);
    const windy = createState(calm);
    windy.wind = -MAX_WIND;
    for (const state of [still, windy]) {
      startCharge(state);
      state.charge = 0.5;
      release(state);
      step(state, 0.5, calm);
    }
    expect(windy.ball!.x).toBeLessThan(still.ball!.x);
  });

  it('scores a dunk, more for beating a stronger wind', () => {
    const state = createState(calm);
    state.wind = 100;
    state.ball = { x: TARGET.x, y: TARGET.y, vx: 0, vy: 0 };
    step(state, 0, calm);
    expect(state.score).toBe(scoreForDunk(100));
    expect(state.dunks).toBe(1);
    expect(state.ball).toBeNull();
    expect(scoreForDunk(0)).toBe(10);
    expect(scoreForDunk(-150)).toBeGreaterThan(scoreForDunk(40));
  });

  it('rolls a new wind after each throw lands', () => {
    const state = createState(calm);
    state.wind = 100;
    state.ball = { x: 300, y: 600, vx: 0, vy: 0 };
    step(state, 0.01, () => 0);
    expect(state.ball).toBeNull();
    expect(state.wind).toBe(-MAX_WIND);
  });

  it('detects a hit on the target and a miss beside it', () => {
    expect(isHit({ x: TARGET.x + 10, y: TARGET.y, vx: 0, vy: 0 })).toBe(true);
    expect(isHit({ x: TARGET.x + 60, y: TARGET.y, vx: 0, vy: 0 })).toBe(false);
  });

  it('ends after the last ball lands and the splash settles', () => {
    const state = createState(calm);
    state.balls = 0;
    state.dunkAge = 0;
    step(state, DUNK_TIME / 2, calm);
    expect(state.phase).toBe('playing');
    step(state, DUNK_TIME, calm);
    expect(state.phase).toBe('over');
  });

  it('keeps playing while the last ball is in the air', () => {
    const state = createState(calm);
    state.balls = 0;
    state.ball = { x: 200, y: 200, vx: 0, vy: 0 };
    step(state, 0.01, calm);
    expect(state.phase).toBe('playing');
  });
});
