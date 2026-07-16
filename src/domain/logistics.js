/**
 * 物流领域逻辑 —— 纯函数,不依赖浏览器/DOM。
 * 订单创建时一次性生成全部里程碑时间戳,之后所有状态都由「当前时间 vs 里程碑」推导。
 *
 * 时效参数依据(2026-04 国家邮政局通告 2025 年实测数据):
 *   快递全程平均时限 51.22h = 寄出地处理 7.88h + 运输 31.45h + 寄达地处理 8.8h + 投递 3.09h
 *   商家发货:平台默认规则 48h 内揽收,实际多数 24h 内发出
 * 由此建模:支付→发货 8~36h;发货→签收 ≈ 45~56h;全程约 2.5~4 天。
 */

export const H = 3600e3;
export const D = 24 * H;
export const M = 60e3;

export const COURIERS = ['迅达快运', '飞驰速递', '云鸟快递', '极兔速运'];
export const HUBS = ['杭州', '广州', '武汉', '成都', '郑州', '义乌', '东莞', '昆山'];

export const STAGE_TXT = {
  created: '商家备货中',
  shipped: '已发货',
  transit: '运输中',
  delivering: '派送中',
  signed: '已签收'
};

/** 冷静期时长:签收后 7 天(演示模式下 review 已直接写入里程碑) */
export const COOLDOWN = 7 * D;

const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * 生成物流里程碑(严格递增)。
 * @param {number} t0 下单(支付成功)时间戳
 * @param {boolean} demo 演示模式:整个流程压缩到分钟级
 */
export function genMilestones(t0, demo = false) {
  if (demo) {
    return {
      shipped: t0 + 1 * M,
      transit1: t0 + 2 * M,
      transit2: t0 + 3 * M,
      delivering: t0 + 4 * M,
      signed: t0 + 5 * M,
      review: t0 + 7 * M
    };
  }
  const shipped = t0 + rnd(8, 36) * H;              // 商家发货(含当天发/次日发两种主流情形)
  const transit1 = shipped + rnd(4, 10) * H;        // 寄出地处理+首程,官方均值 7.88h
  const transit2 = shipped + rnd(36, 44) * H;       // 干线运输后到达寄达城市,官方运输均值 31.45h
  const delivering = transit2 + rnd(4, 8) * H;      // 寄达地处理,官方均值 8.8h
  const signed = delivering + rnd(1.5, 4) * H;      // 投递,官方均值 3.09h
  return { shipped, transit1, transit2, delivering, signed, review: 0 };
}

/** 冷静期回访时间点 */
export function reviewAt(order) {
  return order.m.review || order.m.signed + COOLDOWN;
}

/** 当前物流阶段 */
export function stageOf(order, now = Date.now()) {
  if (now >= order.m.signed) return 'signed';
  if (now >= order.m.delivering) return 'delivering';
  if (now >= order.m.transit1) return 'transit';
  if (now >= order.m.shipped) return 'shipped';
  return 'created';
}

/** 是否处于「冷静期已到、等待用户裁决」状态 */
export function needsReview(order, now = Date.now()) {
  return stageOf(order, now) === 'signed' && !order.verdict && now >= reviewAt(order);
}

/** 生成模拟运单号(SIM 前缀,明确标识非真实运单) */
export function makeTrackingNo() {
  return 'SIM' + String(Math.floor(rnd(1e11, 9e11)));
}

/** 时间线展示节点(按时间正序,6 节点,含寄达地处理环节) */
export function timelineSteps(order) {
  const total = order.price * order.qty;
  const from = order.shipFrom || order.hub1;
  return [
    { key: 'created', t: order.t0, title: '订单已提交', desc: `商家备货中 · 支付 ¥${total.toFixed(2)}` },
    { key: 'shipped', t: order.m.shipped, title: '已发货', desc: `【${from}】您的快件已由商家发出 · ${order.courier} ${order.trackingNo}` },
    { key: 'transit', t: order.m.transit1, title: '运输中', desc: `快件已到达【${order.hub2}转运中心】,正发往您的城市` },
    { key: 'arrived', t: order.m.transit2, title: '到达寄达城市', desc: '快件已到达您所在城市的处理中心,准备派送' },
    { key: 'delivering', t: order.m.delivering, title: '派送中', desc: '快递员正在为您派送,请保持电话畅通' },
    { key: 'signed', t: order.m.signed, title: '已签收', desc: `您的快件已签收,感谢使用${order.courier}` }
  ];
}
