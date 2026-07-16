/**
 * 省钱账本领域逻辑 —— 纯函数。
 * 规则:只有冷静期后用户明确选择「不想要了」(verdict === 'saved')的订单金额才计入「已拦截」;
 * 尚未裁决的订单计入「冷静期验证中」;选择「还想要」(verdict === 'want')的不计入任何一边。
 */

export function orderTotal(order) {
  return order.price * order.qty;
}

export function computeSavings(orders) {
  let banked = 0;
  let pending = 0;
  for (const o of orders) {
    const amt = orderTotal(o);
    if (o.verdict === 'saved') banked += amt;
    else if (!o.verdict) pending += amt;
  }
  return { banked, pending };
}
