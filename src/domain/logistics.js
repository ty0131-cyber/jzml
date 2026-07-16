/**
 * 物流领域逻辑 —— 纯函数,不依赖浏览器/DOM。
 * 订单创建时一次性生成全部里程碑时间戳,之后所有状态都由「当前时间 vs 里程碑」推导。
 *
 * 时效参数依据(2026-04 国家邮政局通告 2025 年实测数据):
 *   快递全程平均时限 51.22h = 寄出地处理 7.88h + 运输 31.45h + 寄达地处理 8.8h + 投递 3.09h
 *   商家发货:平台默认规则 48h 内揽收,实际多数 24h 内发出
 * 由此建模:支付→发货 8~36h;发货→签收 ≈ 45~56h;全程约 2.5~4 天。
 *
 * ★ 两种「时间」:
 *   - 触发时间(m 中除 _display 外的字段):状态机用,演示模式压缩到分钟级
 *   - 展示时间(m._display 或 m 本身):UI 渲染用,始终是看起来合理的真实时间跨度
 *   演示模式下两套时间分离:触发快、展示真。正常模式只一套即可。
 */

export const H = 3600e3;
export const D = 24 * H;
export const M = 60e3;

export const COURIERS = ['韵通快递', '申达快运', '圆通速运', '中达快递', '百通快运'];
export const HUBS = ['杭州转运中心', '广州华南分拨中心', '武汉华中处理中心', '成都西南集散中心', '郑州中原转运中心', '义乌华东分拨中心', '东莞华南处理中心', '昆山华东转运中心'];
export const STATIONS = ['菜鸟驿站【耀华滨江公寓店】', '菜鸟驿站【上城花苑店】', '丰巢智能柜', '菜鸟驿站【翠苑新邨店】', '小区门卫代收'];
export const STAFF_NAMES = ['张师傅', '李师傅', '王师傅', '刘师傅', '陈师傅', '赵师傅', '周师傅'];
export const STAFF_PHONES = ['138****5678', '159****2341', '177****8902', '136****4512', '185****7230', '139****0876'];

export const STAGE_TXT = {
  created: '商家备货中',
  confirmed: '仓库处理中',
  shipped: '已发货',
  picked: '已揽件',
  departed: '运输中',
  transit: '运输中',
  arrived: '到达寄达城市',
  delivering: '派送中',
  signed: '已签收'
};

/** 所有物流阶段(按时间正序),stageOf 按此顺序取最后一个已到达的节点 */
const STAGE_ORDER = ['confirmed', 'picked', 'shipped', 'departed', 'transit', 'arrived', 'delivering', 'signed'];

/** 冷静期时长:签收后 7 天(演示模式下 review 已直接写入里程碑) */
export const COOLDOWN = 7 * D;

const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 生成物流里程碑(严格递增)。
 * @param {number} t0 下单(支付成功)时间戳
 * @param {boolean} demo 演示模式:触发时间压缩到分钟级,展示时间为真实的 3~4 天跨度
 */
export function genMilestones(t0, demo = false) {
  if (demo) {
    const m = {
      confirmed: t0 + 0.5 * M,
      shipped: t0 + 1 * M,
      picked: t0 + 1.5 * M,
      departed: t0 + 2 * M,
      transit1: t0 + 2.5 * M,
      transit2: t0 + 3 * M,
      arriving: t0 + 3.5 * M,
      delivering: t0 + 4.5 * M,
      signed: t0 + 5.5 * M,
      review: t0 + 7 * M,
      _display: _makeDemoDisplay(t0)
    };
    return m;
  }
  const shipped = t0 + rnd(8, 36) * H;
  const confirmed = t0 + rnd(0.5, 3) * H;
  const picked = shipped - rnd(2, 8) * H;
  const departed = shipped + rnd(2, 6) * H;
  const transit1 = shipped + rnd(4, 10) * H;
  const transit2 = shipped + rnd(36, 44) * H;
  const arriving = transit2 + rnd(1, 4) * H;
  const delivering = transit2 + rnd(4, 8) * H;
  const signed = delivering + rnd(1.5, 4) * H;
  return { confirmed, shipped, picked, departed, transit1, transit2, arriving, delivering, signed, review: 0 };
}

/** 演示模式展示时间:下单后 3~4 天的时间跨度,每个节点间隔几小时 */
function _makeDemoDisplay(t0) {
  const hours = [1.5, 12, 14, 18, 28, 44, 48, 54, 66];
  const keys = ['confirmed', 'shipped', 'picked', 'departed', 'transit1', 'transit2', 'arriving', 'delivering', 'signed'];
  const d = {};
  for (let i = 0; i < keys.length; i++) {
    d[keys[i]] = t0 + hours[i] * H + rnd(-1.5, 1.5) * H;
  }
  d.review = d.signed + 7 * D;
  return d;
}

/**
 * 取某个里程碑的展示时间。
 * 演示模式有 _display 就用它,否则回退到里程碑时间戳本身。
 * 注意:部分里程碑值可为0(如 review),必须用 !=null 而非 || 判断。
 */
export function displayTime(order, key) {
  const m = order.m;
  if (m._display && m._display[key] != null) return m._display[key];
  if (key === 'transit') return m.transit1 != null ? m.transit1 : order.t0;
  if (key === 'arrived') return m.arriving != null ? m.arriving : m.transit2 != null ? m.transit2 : order.t0;
  if (key === 'departed') return m.departed != null ? m.departed : m.shipped;
  return m[key] != null ? m[key] : order.t0;
}

/** 冷静期回访时间点(展示时间) */
export function reviewAt(order) {
  const r = displayTime(order, 'review');
  if (r && r > 0) return r;
  return displayTime(order, 'signed') + COOLDOWN;
}

/** 当前物流阶段 */
export function stageOf(order, now = Date.now()) {
  const m = order.m;
  for (let i = STAGE_ORDER.length - 1; i >= 0; i--) {
    const key = STAGE_ORDER[i];
    const mk = _mk(m, key);
    if (mk && now >= m[mk]) return key;
  }
  return 'created';
}

/** 映射阶段名到里程碑字段名(兼容旧订单缺少新字段的情况) */
function _mk(m, key) {
  if (key === 'transit') return m.transit1 != null ? 'transit1' : null;
  if (key === 'arrived') return m.arriving != null ? 'arriving' : m.transit2 != null ? 'transit2' : null;
  return m[key] != null ? key : null;
}

/** 是否处于「冷静期已到、等待用户裁决」状态 */
export function needsReview(order, now = Date.now()) {
  return stageOf(order, now) === 'signed' && !order.verdict && now >= reviewAt(order);
}

/** 生成模拟运单号(SIM 前缀,明确标识非真实运单) */
export function makeTrackingNo() {
  return 'SIM' + String(Math.floor(rnd(1e10, 9e10)));
}

/** 生成随机的快递员信息(虚构,不会与真实快递员重合) */
export function makeCourierStaff() {
  return { name: pick(STAFF_NAMES), phone: pick(STAFF_PHONES) };
}

/**
 * 时间线展示节点(8 节点,菜鸟风格)。
 * 展示时间使用 displayTime(),旧订单缺少新字段时自动跳过。
 */
export function timelineSteps(order) {
  const total = order.price * order.qty;
  const from = order.shipFrom || order.hub1;
  const hub1 = order.hub1 || pick(HUBS);
  const hub2 = order.hub2 || pick(HUBS);
  const station = order.station || pick(STATIONS);
  const staff = order.courierStaff || makeCourierStaff();

  const nodes = [
    { key: 'created', t: order.t0, title: '已下单', desc: `您提交了订单，商家开始处理 · 支付 ¥${total.toFixed(2)}` }
  ];

  if (order.m.confirmed) {
    nodes.push({ key: 'confirmed', t: displayTime(order, 'confirmed'), title: '仓库处理中', desc: '商品出库打印完成，等待快递揽收' });
  }

  nodes.push({ key: 'shipped', t: displayTime(order, 'shipped'), title: '已发货', desc: `包裹正在等待揽收 · ${order.courier || pick(COURIERS)} ${order.trackingNo || makeTrackingNo()}` });

  if (order.m.picked) {
    nodes.push({ key: 'picked', t: displayTime(order, 'picked'), title: '已揽件', desc: `快件在【${from || '卖家所在地'}】已揽收，揽收人：${staff.name} (${staff.phone})` });
  }

  if (order.m.departed) {
    nodes.push({ key: 'departed', t: displayTime(order, 'departed'), title: '运输中', desc: `快件离开【${from}】，已发往【${hub1}】` });
  }

  nodes.push({ key: 'transit', t: displayTime(order, 'transit'), title: '运输中', desc: `快件已到达【${hub1}】，下一站【${hub2}】` });

  if (order.m.arriving) {
    nodes.push({ key: 'arrived', t: displayTime(order, 'arrived'), title: '到达寄达城市', desc: `快件已到达【${hub2}】，准备派送` });
  }

  nodes.push({ key: 'delivering', t: displayTime(order, 'delivering'), title: '派送中', desc: `【${hub2}】的快递员${staff.name}(${staff.phone})正在为您派件` });

  nodes.push({ key: 'signed', t: displayTime(order, 'signed'), title: '已签收', desc: `包裹已送货上门，放至家门口。服务由${station}提供` });

  return nodes;
}
