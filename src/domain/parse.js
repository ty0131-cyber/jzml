/**
 * OCR 文本解析 —— 纯函数,与 OCR 引擎解耦。
 * 输入整段识别文本,启发式提取 {title, price, shipFrom},提不出的字段返回 null。
 * 结果仅用于「预填」,允许不完美,用户可修改。
 */

/** 购物页常见 UI 噪声词:含这些词的行不作为标题候选 */
const UI_NOISE = /领券|收藏|加入购物车|立即购买|立即抢购|评价|已售|月销|销量|发货|运费|退货|退款|客服|店铺|首页|详情|参数|保障|优惠|满减|直播|关注|分享|七天|假一|正品|旗舰|自营|排行|搜索/;

const CJK = /[\u4e00-\u9fa5]/g;

/** 提取价格:优先「到手/券后/秒杀/活动价」附近的数字,否则取首个 ¥ 金额 */
export function extractPrice(text) {
  const pri = text.match(/(?:到手价?|券后价?|秒杀价?|活动价|现价|拼单价)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/);
  if (pri) return parseFloat(pri[1]);
  const m = text.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/);
  if (m) return parseFloat(m[1]);
  return null;
}

/** 提取标题:中文字符最多、不含 UI 噪声词的行 */
export function extractTitle(text) {
  let best = null;
  let bestLen = 0;
  for (const raw of text.split(/\n+/)) {
    const line = raw.trim();
    if (line.length < 6 || UI_NOISE.test(line)) continue;
    const cjkCount = (line.match(CJK) || []).length;
    if (cjkCount >= 5 && cjkCount > bestLen) {
      best = line;
      bestLen = cjkCount;
    }
  }
  return best;
}

/** 提取发货地:「xx发货」或「发货地: xx」两种形态 */
export function extractShipFrom(text) {
  let m = text.match(/发货地?[:：]\s*([\u4e00-\u9fa5]{2,10})/);
  if (m) return m[1];
  m = text.match(/([\u4e00-\u9fa5]{2,10})\s*发货/);
  if (m && !/极速|当日|次日|今日|明日|小时|付款|承诺/.test(m[1])) return m[1];
  return null;
}

export function parseProductText(text) {
  if (!text || typeof text !== 'string') return { title: null, price: null, shipFrom: null };
  return {
    title: extractTitle(text),
    price: extractPrice(text),
    shipFrom: extractShipFrom(text)
  };
}
