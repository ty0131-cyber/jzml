/** 展示层格式化 —— 纯函数 */

/** 金额格式化;非法输入(undefined/NaN/字符串垃圾)安全返回 '0.00' */
export function money(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x.toFixed(2) : '0.00';
}

/** 时间戳格式化为 MM-DD HH:mm */
export function fmtTime(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 相对时间格式化:今天→"今天 15:30",明天→"明天 08:00",其他→"07-19 11:30"
 * @param {number} t 目标时间戳
 * @param {number} [now] 当前时间,默认 Date.now()
 */
export function fmtRelative(t, now = Date.now()) {
  const d = new Date(t);
  const today = new Date(now);
  const p = (n) => String(n).padStart(2, '0');
  const timeStr = `${p(d.getHours())}:${p(d.getMinutes())}`;

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const tomorrowStart = todayStart + 86400000;

  if (t >= todayStart && t < tomorrowStart) return `今天 ${timeStr}`;
  if (t >= tomorrowStart && t < tomorrowStart + 86400000) return `明天 ${timeStr}`;
  return `${d.getMonth() + 1}-${p(d.getDate())} ${timeStr}`;
}
