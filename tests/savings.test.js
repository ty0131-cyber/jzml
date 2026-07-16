import { describe, it, expect } from 'vitest';
import { computeSavings, orderTotal } from '../src/domain/savings.js';

const o = (price, qty, verdict) => ({ price, qty, verdict });

describe('computeSavings', () => {
  it('只有 verdict=saved 计入已拦截', () => {
    const { banked } = computeSavings([o(100, 1, 'saved'), o(50, 2, null), o(30, 1, 'want')]);
    expect(banked).toBe(100);
  });
  it('未裁决的计入冷静期验证中', () => {
    const { pending } = computeSavings([o(100, 1, 'saved'), o(50, 2, null), o(30, 1, 'want')]);
    expect(pending).toBe(100);
  });
  it('verdict=want 两边都不计入', () => {
    const s = computeSavings([o(30, 1, 'want')]);
    expect(s.banked).toBe(0);
    expect(s.pending).toBe(0);
  });
  it('空列表返回0', () => {
    expect(computeSavings([])).toEqual({ banked: 0, pending: 0 });
  });
  it('金额按数量放大', () => {
    expect(orderTotal(o(9.9, 3))).toBeCloseTo(29.7);
  });
});
