import { describe, expect, it } from 'vitest';
import { exampleGoals as goalsOf, exampleHealth as healthOf, exampleRetirement as retirementOf } from './examples';
import { monthlySavingFactor } from './goals';
import { projectRetirement } from './retirement';
import { isGoal, isHealthInput, isRetirementInput, isSnapshot, parseBackup } from './schema';

const exampleHealth = healthOf('INR');
const exampleGoals = goalsOf('INR');
const exampleRetirement = retirementOf('INR');
const backup = (data: unknown) => JSON.stringify({ app: 'finealth', version: 1, exportedAt: '2026-11-11', data });

describe('backup validation', () => {
  it('accepts the built-in examples', () => {
    expect(isHealthInput(exampleHealth)).toBe(true);
    expect(isRetirementInput(exampleRetirement)).toBe(true);
    expect(exampleGoals.every(isGoal)).toBe(true);
  });

  it('rejects a hostile backup with huge ages and years', () => {
    const r = parseBackup(backup({
      retirement: { ...exampleRetirement, retireAge: 1e12 },
      goals: [{ ...exampleGoals[0], years: 1e10, stepUpPct: 10 }],
    }));
    expect(r.ok).toBe(false);
  });

  it('keeps the good sections and drops the bad ones', () => {
    const r = parseBackup(backup({ health: exampleHealth, retirement: { ...exampleRetirement, planToAge: 500 } }));
    expect(r.ok && Object.keys(r.sections)).toEqual(['health']);
  });

  it('rejects out-of-range snapshot pillars', () => {
    const snap = { at: '2026-11-11', score: 70, pillars: { saving: 80 }, currency: 'INR', netWorth: 100 };
    expect(isSnapshot(snap)).toBe(true);
    expect(isSnapshot({ ...snap, pillars: { saving: 1e9 } })).toBe(false);
    expect(isSnapshot({ ...snap, pillars: { saving: 'x' } })).toBe(false);
  });
});

describe('planner loops stay bounded whatever the input', () => {
  it('retirement caps the plan at 120 years', () => {
    const t = Date.now();
    const p = projectRetirement({ ...exampleRetirement, currentAge: 0, retireAge: 1e12, planToAge: 2e12 });
    expect(p.corpusAtRetirement).toBe(projectRetirement({ ...exampleRetirement, currentAge: 0, retireAge: 120, planToAge: 120 }).corpusAtRetirement);
    expect(Date.now() - t).toBeLessThan(1000);
  });

  it('goal step-up caps at 1,200 months', () => {
    expect(monthlySavingFactor(0, 1e10, 1)).toBe(monthlySavingFactor(0, 100, 1));
  });
});
