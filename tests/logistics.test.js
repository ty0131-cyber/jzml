import { describe, it, expect } from 'vitest';
import {
  genMilestones, stageOf, reviewAt, needsReview, timelineSteps,
  makeTrackingNo, H, D, M, COOLDOWN
} from '../src/domain/logistics.js';

const T0 = 1700000000000;

function fakeOrder(overrides = {}) {
  return {
    id: 'o1', name: '测试商品', price: 100, qty: 2,
    shop: '', link: '', t0: T0,
    m: { shipped: T0 + 3 * H, transit1: T0 + 10 * H, transit2: T0 + 36 * H, delivering: T0 + 2.4 * D, signed: T0 + 2.7 * D, review: 0 },
    courier: '迅达快运', trackingNo: 'SIM123', hub1: '杭州', hub2: '广州',
    verdict: null,
    ...overrides
  };
}

describe('genMilestones', () => {
  it('真实模式:发货8~36h,发货到签收约45~56h(对齐邮政局51.22h均值),严格递增', () => {
    for (let i = 0; i < 50; i++) {
      const m = genMilestones(T0, false);
      expect(m.shipped).toBeGreaterThanOrEqual(T0 + 8 * H);
      expect(m.shipped).toBeLessThanOrEqual(T0 + 36 * H);
      const courierHours = (m.signed - m.shipped) / H;
      expect(courierHours).toBeGreaterThanOrEqual(41);
      expect(courierHours).toBeLessThanOrEqual(56);
      expect(m.transit1).toBeGreaterThan(m.shipped);
      expect(m.transit2).toBeGreaterThan(m.transit1);
      expect(m.delivering).toBeGreaterThan(m.transit2);
      expect(m.signed).toBeGreaterThan(m.delivering);
      expect(m.review).toBe(0);
    }
  });

  it('演示模式:分钟级压缩且 review 直接给出', () => {
    const m = genMilestones(T0, true);
    expect(m.shipped).toBe(T0 + 1 * M);
    expect(m.signed).toBe(T0 + 5 * M);
    expect(m.review).toBe(T0 + 7 * M);
  });
});

describe('stageOf', () => {
  const o = fakeOrder();
  it('刚下单是备货中', () => expect(stageOf(o, T0 + 1 * H)).toBe('created'));
  it('过了发货点是已发货', () => expect(stageOf(o, T0 + 4 * H)).toBe('shipped'));
  it('过了中转点是运输中', () => expect(stageOf(o, T0 + 12 * H)).toBe('transit'));
  it('过了派送点是派送中', () => expect(stageOf(o, T0 + 2.5 * D)).toBe('delivering'));
  it('过了签收点是已签收', () => expect(stageOf(o, T0 + 3 * D)).toBe('signed'));
});

describe('冷静期', () => {
  const o = fakeOrder();
  it('真实模式 review = 签收 + 7天', () => {
    expect(reviewAt(o)).toBe(o.m.signed + COOLDOWN);
  });
  it('签收后未满7天不触发回访', () => {
    expect(needsReview(o, o.m.signed + 6 * D)).toBe(false);
  });
  it('签收满7天且未裁决时触发回访', () => {
    expect(needsReview(o, o.m.signed + 7 * D + 1)).toBe(true);
  });
  it('已裁决的订单不再触发回访', () => {
    const done = fakeOrder({ verdict: 'saved' });
    expect(needsReview(done, done.m.signed + 8 * D)).toBe(false);
  });
  it('演示模式使用里程碑中的 review 时间', () => {
    const demo = fakeOrder({ m: { ...fakeOrder().m, review: T0 + 7 * M } });
    expect(reviewAt(demo)).toBe(T0 + 7 * M);
  });
});

describe('timelineSteps', () => {
  it('返回6个节点且按时间正序', () => {
    const steps = timelineSteps(fakeOrder());
    expect(steps).toHaveLength(6);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i].t).toBeGreaterThan(steps[i - 1].t);
    }
  });
  it('金额展示为 price × qty', () => {
    const steps = timelineSteps(fakeOrder());
    expect(steps[0].desc).toContain('200.00');
  });
});

describe('makeTrackingNo', () => {
  it('以 SIM 开头,标识模拟运单', () => {
    expect(makeTrackingNo()).toMatch(/^SIM\d+$/);
  });
});
