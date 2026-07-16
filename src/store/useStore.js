/**
 * 全局状态与业务动作(actions)。
 * 视图组件保持「薄」:只渲染和转发事件,状态变更一律调用这里的函数。
 */
import { reactive } from 'vue';
import { loadState, persist, putImage, delImage } from './storage.js';
import { DEFAULT_SETTINGS } from './migrations.js';
import { genMilestones, makeTrackingNo, pick, COURIERS, HUBS } from '../domain/logistics.js';
import { orderTotal } from '../domain/savings.js';
import { money } from '../domain/format.js';

export const store = reactive({
  orders: [],
  settings: { ...DEFAULT_SETTINGS },
  view: { name: 'home', param: null },
  draft: null, // 新建流程中的临时订单 {name, price, qty, shop, link, img:File|null, shipFrom}
  noti: { msg: '', seq: 0 }
});

export function initStore() {
  const s = loadState();
  store.orders = s.orders;
  store.settings = s.settings;
}

function save() {
  persist({ orders: store.orders, settings: store.settings });
}

/* ---------------- 导航 ---------------- */

export function go(name, param = null) {
  store.view = { name, param };
  window.scrollTo(0, 0);
}

/* ---------------- 通知横幅 ---------------- */

export function notify(msg) {
  store.noti = { msg, seq: store.noti.seq + 1 };
}

/* ---------------- 订单动作 ---------------- */

/**
 * 支付成功后:草稿转正式订单。
 * 统一从虚拟余额扣减(payMethod 仅作展示记录),余额允许为负 —— 透支本身就是提示。
 */
export async function finalizeDraft(payMethod = '余额') {
  const d = store.draft;
  if (!d) return null;
  const t0 = Date.now();
  const order = {
    id: 'o' + t0 + Math.random().toString(36).slice(2, 6),
    name: d.name,
    price: d.price,
    qty: d.qty,
    shop: d.shop,
    link: d.link,
    t0,
    m: genMilestones(t0, store.settings.demo),
    courier: pick(COURIERS),
    trackingNo: makeTrackingNo(),
    hub1: pick(HUBS),
    hub2: pick(HUBS),
    shipFrom: d.shipFrom || '',
    payMethod,
    verdict: null
  };
  if (d.img) {
    try {
      await putImage(order.id, d.img);
    } catch (e) {
      console.error('[order] 截图保存失败,订单继续创建', e);
    }
  }
  store.orders.push(order);
  store.settings.balance = +(store.settings.balance - orderTotal(order)).toFixed(2);
  save();
  store.draft = null;
  notify(`已支付 ¥${money(orderTotal(order))}(模拟)· 余额 ¥${money(store.settings.balance)}`);
  return order;
}

export function getOrder(id) {
  return store.orders.find((o) => o.id === id) || null;
}

/** 冷静期裁决:不想要了 → 入账,并把金额退回虚拟余额(拦截成功 = 额度失而复得) */
export function markSaved(id) {
  const o = getOrder(id);
  if (!o || o.verdict) return;
  o.verdict = 'saved';
  store.settings.balance = +(store.settings.balance + orderTotal(o)).toFixed(2);
  save();
  notify(`+¥${money(orderTotal(o))} 已入省钱账本,并退回余额`);
}

/** 冷静期裁决:还想要 → 转真实购买(不退回,这笔"消费"成立) */
export function markWant(id) {
  const o = getOrder(id);
  if (!o || o.verdict) return;
  o.verdict = 'want';
  save();
}

/** 删除订单:不回溯调整余额(避免删单变成刷余额的漏洞) */
export function removeOrder(id) {
  store.orders = store.orders.filter((o) => o.id !== id);
  save();
  delImage(id);
}

/* ---------------- 钱包 ---------------- */

export function recharge(amount) {
  const a = Number(amount);
  if (!Number.isFinite(a) || a <= 0) return false;
  store.settings.balance = +(store.settings.balance + a).toFixed(2);
  save();
  notify(`余额充值 ¥${money(a)}(模拟)`);
  return true;
}

export function addPayMethod(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  store.settings.payMethods.push({ id: 'pm' + Date.now(), name: n });
  save();
  return true;
}

export function removePayMethod(id) {
  store.settings.payMethods = store.settings.payMethods.filter((p) => p.id !== id);
  save();
}

/* ---------------- 设置 ---------------- */

export function saveSettings(patch) {
  Object.assign(store.settings, patch);
  save();
}

/** 危险操作:清空全部 */
export function wipeAll() {
  for (const o of store.orders) delImage(o.id);
  store.orders = [];
  store.settings.balance = 0;
  save();
}

/** 导入数据(覆盖现有) */
export function replaceAll({ orders, settings }) {
  store.orders = orders;
  store.settings = Object.assign({ ...DEFAULT_SETTINGS }, settings);
  save();
}
