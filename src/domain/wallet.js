/**
 * 钱包/额度领域逻辑 —— 纯函数。
 * 规则:
 *   - 每笔模拟支付从虚拟余额扣减(无论展示上选了哪个"付款方式")
 *   - 冷静期裁决「不想要了」(saved) 时,该单金额退回余额 —— 拦截成功 = 额度失而复得
 *   - 「您已消费」按订单流水的毛额统计(不因退回而减少),余额才反映退回
 */
import { orderTotal } from './savings.js';

/** 累计消费(全部订单毛额) */
export function totalSpent(orders) {
  return orders.reduce((s, o) => s + orderTotal(o), 0);
}

/** 指定时间所在自然月的消费毛额 */
export function monthSpent(orders, now = Date.now()) {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  return orders.reduce((s, o) => {
    const t = new Date(o.t0);
    return t.getFullYear() === y && t.getMonth() === m ? s + orderTotal(o) : s;
  }, 0);
}

/** 支付后余额是否透支 */
export function wouldOverdraw(balance, amount) {
  return balance - amount < 0;
}
