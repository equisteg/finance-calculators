import { describe, expect, it } from 'vitest';
import { clampInput, parseInput } from '../src/lib/input';

// TC-M-CLC-004: number fields read what people type, in either decimal style, and show the number the plan uses.
describe('number fields', () => {
  it('reads grouped numbers in Indian and Western style', () => {
    expect(parseInput('1,00,000')).toBe(100000);
    expect(parseInput('1,000,000')).toBe(1000000);
    expect(parseInput(' 2 500 ')).toBe(2500);
    expect(parseInput('-12.5')).toBe(-12.5);
  });

  it('reads a decimal comma and a half-typed number', () => {
    expect(parseInput('12,5')).toBe(12.5);
    expect(parseInput('1,25')).toBe(1.25);
    expect(parseInput('7.')).toBe(7);
    expect(parseInput('.5')).toBe(0.5);
    expect(parseInput('')).toBe(0);
    expect(parseInput('-')).toBe(0);
  });

  it('refuses what is not a number', () => {
    for (const s of ['abc', '1.2.3', '12a', '1e5', '--1']) expect(parseInput(s)).toBeNull();
  });

  it('clamps to the field limits (min defaults to 0)', () => {
    expect(clampInput(1000, 0, 100)).toBe(100);
    expect(clampInput(-5)).toBe(0);
    expect(clampInput(-5, -10)).toBe(-5);
    expect(clampInput(50, 0, 100)).toBe(50);
  });
});
