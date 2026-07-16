/** 展示层格式化 —— 纯函数 */

/** 金额格式化;非法输入(undefined/NaN/字符串垃圾)安全返回 '0.00' */
export function money(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : '0.00';
}

export function fmtTime(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
