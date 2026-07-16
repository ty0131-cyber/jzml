import { describe, it, expect } from 'vitest';
import { money, fmtTime } from '../src/domain/format.js';

describe('money', () => {
  it('正常格式化两位小数', () => {
    expect(money(9.9)).toBe('9.90');
    expect(money(0)).toBe('0.00');
    expect(money('12.5')).toBe('12.50');
  });
  it('非法输入安全返回0.00(DeepSeek 问题2)', () => {
    expect(money(undefined)).toBe('0.00');
    expect(money(NaN)).toBe('0.00');
    expect(money('abc')).toBe('0.00');
    expect(money(null)).toBe('0.00'); // Number(null)=0
  });
  it('负数保留符号(透支展示)', () => {
    expect(money(-3.5)).toBe('-3.50');
  });
});

describe('fmtTime', () => {
  it('输出 月-日 时:分', () => {
    expect(fmtTime(new Date('2026-07-05T09:07:00').getTime())).toBe('7-05 09:07');
  });
});
