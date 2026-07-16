/**
 * 数据迁移 —— 纯函数,可测试。
 *
 * ★ 数据契约(铁律,见 CLAUDE.md):
 *   - localStorage key 永远是 'jzml_v1',不得更改
 *   - 已有字段的名称和含义不得修改,只允许新增字段
 *   - 任何结构变更必须:CURRENT_SCHEMA +1,并新增一个对应的迁移函数
 *
 * 版本史:
 *   v1  orders + settings{name,phone,addr,demo}
 *   v2  settings 新增 balance(虚拟余额,元)、payMethods(虚构卡片 [{id,name}]);
 *       订单新增可选字段 payMethod、shipFrom(增量,旧订单缺省不影响)
 */

export const CURRENT_SCHEMA = 2;

const V1_SETTINGS = { name: '', phone: '', addr: '', demo: false };
export const DEFAULT_SETTINGS = { ...V1_SETTINGS, balance: 0, payMethods: [] };

/** v0(最初的单文件版,无 schemaVersion 字段)→ v1 */
function m0to1(d) {
  return {
    schemaVersion: 1,
    orders: Array.isArray(d.orders) ? d.orders : [],
    settings: Object.assign({}, V1_SETTINGS, d.settings || {})
  };
}

/** v1 → v2:补钱包字段 */
function m1to2(d) {
  return {
    schemaVersion: 2,
    orders: d.orders,
    settings: Object.assign({ balance: 0, payMethods: [] }, d.settings)
  };
}

/**
 * 把任意历史版本的数据升级到当前版本。
 * 对损坏/空数据返回全新的默认结构,绝不抛错 —— 打不开数据比丢功能严重得多。
 */
export function migrate(raw) {
  let d = raw && typeof raw === 'object' ? raw : {};
  const v = Number(d.schemaVersion) || 0;
  if (v < 1) d = m0to1(d);
  if (v < 2) d = m1to2(d);
  return d;
}
