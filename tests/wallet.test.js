import { describe, it, expect } from 'vitest';
import { totalSpent, monthSpent, wouldOverdraw } from '../src/domain/wallet.js';

const mk = (price, qty, t0) => ({ price, qty, t0 });
const JUL = new Date('2026-07-15T12:00:00').getTime();
const JUN = new Date('2026-06-15T12:00:00').getTime();

describe('wallet', () => {
  it('totalSpent 为全部订单毛额', () => {
    expect(totalSpent([mk(100, 2, JUL), mk(50, 1, JUN)])).toBe(250);
  });
  it('monthSpent 只统计当前自然月', () => {
    expect(monthSpent([mk(100, 2, JUL), mk(50, 1, JUN)], JUL)).toBe(200);
  });
  it('跨年同月不混算', () => {
    const JUL_LAST_YEAR = new Date('2025-07-15T12:00:00').getTime();
    expect(monthSpent([mk(100, 1, JUL_LAST_YEAR)], JUL)).toBe(0);
  });
  it('wouldOverdraw 判断透支', () => {
    expect(wouldOverdraw(100, 100)).toBe(false);
    expect(wouldOverdraw(100, 100.01)).toBe(true);
    expect(wouldOverdraw(-5, 1)).toBe(true);
  });
  it('空订单为0', () => {
    expect(totalSpent([])).toBe(0);
    expect(monthSpent([], JUL)).toBe(0);
  });
});
