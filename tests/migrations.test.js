import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_SCHEMA, DEFAULT_SETTINGS } from '../src/store/migrations.js';

describe('migrate', () => {
  it('v0 单文件版数据(无 schemaVersion)升级后订单原样保留', () => {
    const old = {
      orders: [{ id: 'o1', name: '旧订单', price: 88, qty: 1, verdict: null }],
      settings: { name: '张三', phone: '', addr: '', demo: true }
    };
    const d = migrate(old);
    expect(d.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(d.orders).toHaveLength(1);
    expect(d.orders[0].name).toBe('旧订单');
    expect(d.settings.name).toBe('张三');
    expect(d.settings.demo).toBe(true);
  });

  it('空数据返回默认结构而不抛错', () => {
    const d = migrate(null);
    expect(d.orders).toEqual([]);
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('损坏数据(非对象)返回默认结构', () => {
    expect(migrate('garbage').orders).toEqual([]);
    expect(migrate(42).orders).toEqual([]);
  });

  it('老 settings 缺字段时用默认值补齐', () => {
    const d = migrate({ orders: [], settings: { name: '李四' } });
    expect(d.settings.demo).toBe(false);
    expect(d.settings.addr).toBe('');
  });

  it('当前版本数据迁移后不变', () => {
    const cur = { schemaVersion: CURRENT_SCHEMA, orders: [{ id: 'x' }], settings: { ...DEFAULT_SETTINGS } };
    const d = migrate(cur);
    expect(d.orders).toHaveLength(1);
  });
it('v1 数据升级到 v2:补钱包字段,原有内容不动', () => {
    const v1 = {
      schemaVersion: 1,
      orders: [{ id: 'o1', name: '旧单', price: 10, qty: 1 }],
      settings: { name: '张三', phone: '', addr: '', demo: false }
    };
    const d = migrate(v1);
    expect(d.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(d.settings.balance).toBe(0);
    expect(d.settings.payMethods).toEqual([]);
    expect(d.settings.name).toBe('张三');
    expect(d.orders[0].name).toBe('旧单');
  });

  it('v2 数据不被重复迁移(余额保留)', () => {
    const v2 = { schemaVersion: 2, orders: [], settings: { ...DEFAULT_SETTINGS, balance: 520 } };
    expect(migrate(v2).settings.balance).toBe(520);
  });
});
