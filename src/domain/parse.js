/**
 * OCR 文本解析 —— 纯函数,与 OCR 引擎解耦。
 * 输入整段识别文本,启发式提取 {title, price, shipFrom},提不出的字段返回 null。
 */

/** 购物页常见 UI 噪声词:含这些词的行不作为标题候选 */
const UI_NOISE = /领券|收藏|加入购物车|立即购买|立即抢购|评价|已售|月销|销量|发货|运费|退货|退款|客服|店铺|首页|详情|参数|保障|优惠|满减|直播|关注|分享|七天|假一|正品|旗舰|自营|排行|搜索|包邮|配送|送达|次日|小时达/;

const CJK = /[一-龥]/g;

/* ---------------- OCR 文本清理 ---------------- */

/**
 * 清理 OCR 输出:去除汉字间空格、合并断行、删除常见 OCR 乱码。
 * 注意:CJK 字符之间的空白是 OCR 引擎在中文单字识别模式下产生的,
 * 不影响实际阅读,但会干扰标题提取(把一句话切成多个短 token)。
 */
export function cleanOCRText(text) {
  if (!text) return '';
  return text
    // 删除每行首尾空白
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    // 去除 CJK 字符之间的空格: "包  裹  转  运" → "包裹转运"
    .replace(/([一-龥])\s+([一-龥])/g, '$1$2')
    // 去除 CJK 与数字之间的多余空格: "¥ 299 .00" → "¥299.00"
    .replace(/([一-龥])\s+(\d)/g, '$1$2')
    .replace(/(\d)\s+([一-龥])/g, '$1$2')
    // 连接被断开的金额: "299 . 00" → "299.00"
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
    // 合并 CJK 被 OCR 断开的行(短行 + 下一行也是 CJK → 合并)
    .replace(/([一-龥]{2,})[。，？！,]\n([一-龥])/g, '$1$2')
    .replace(/[|{}[\]◇◆○●◎◇◆※]/g, '')
    // 删除纯标点/空白行,保留有意义内容
    .split('\n').filter(l => l.replace(/[\s,.，。、：:；;!！?？'"'""【】《》\-—/\\]+/g, '').length >= 2).join('\n');
}

/* ---------------- 价格提取 ---------------- */

/** 提取价格:优先「到手/券后/秒杀/活动价」附近的数字,否则取首个 ¥ 金额 */
export function extractPrice(text) {
  const pri = text.match(/(?:到手价?|券后价?|秒杀价?|活动价|现价|拼单价|预估到手)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/);
  if (pri) return parseFloat(pri[1]);
  const m = text.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/);
  if (m) return parseFloat(m[1]);
  // 兜底:纯数字价格(如 "299.00" 独立出现)
  const fallback = text.match(/(?:^|\n)\s*(\d{2,4}\.\d{2})\s*(?:$|\n)/);
  if (fallback) return parseFloat(fallback[1]);
  return null;
}

/* ---------------- 标题提取 ---------------- */

/** 提取标题:中文字符最多、不含 UI 噪声词的行 */
export function extractTitle(text) {
  let best = null;
  let bestLen = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length < 6 || UI_NOISE.test(line)) continue;
    const cjkCount = (line.match(CJK) || []).length;
    if (cjkCount >= 4 && cjkCount > bestLen) {
      best = line;
      bestLen = cjkCount;
    }
  }
  return best;
}

/* ---------------- 发货地提取 ---------------- */

/** 提取发货地:支持「xx发货」「发货地:xx」「发货 xx」「xx | N小时内发货」等形态 */
export function extractShipFrom(text) {
  let m;
  // "发货地: 广东广州" / "发货地:上海"
  m = text.match(/发货地?[:：]\s*([一-龥]{2,8})/);
  if (m) return m[1];
  // "广东广州 发货" / "广州发货"
  m = text.match(/([一-龥]{2,8})\s*发货/);
  if (m && !/极速|当日|次日|今日|明天|小时|付款|承诺|小时内|预计|24|48/.test(m[1])) return m[1];
  // "发货 广东广州" (无"地"字,无冒号)
  m = text.match(/发货\s*([一-龥]{2,8})/);
  if (m && !/极速|当日|次日|今日|明天|小时|付款|承诺|小时内|预计|24|48/.test(m[1])) return m[1];
  // "广州 | 2小时内发货" → 取管道符左边城市名
  m = text.match(/([一-龥]{2,5})\s*\|/);
  if (m && !/极速|当日|次日|品牌|正品|免邮/.test(m[1])) return m[1];
  return null;
}

/* ---------------- 主入口 ---------------- */

export function parseProductText(text) {
  if (!text || typeof text !== 'string') return { title: null, price: null, shipFrom: null };
  return {
    title: extractTitle(text),
    price: extractPrice(text),
    shipFrom: extractShipFrom(text)
  };
}
