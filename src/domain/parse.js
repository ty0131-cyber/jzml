/**
 * OCR 文本解析 —— 纯函数,与 OCR 引擎解耦。
 * 输入整段识别文本,启发式提取 {title, price, shipFrom},提不出的字段返回 null。
 */

/** 购物页常见 UI 噪声词:含这些词的行不作为标题候选 */
const UI_NOISE = /领券|收藏|加入购物车|立即购买|立即抢购|评价|已售|月销|销量|发货|运费|退货|退款|客服|店铺|首页|详情|参数|保障|优惠|满减|直播|关注|分享|七天|假一|正品|旗舰|自营|排行|搜索|包邮|配送|送达|次日|小时达|联系卖家|进店逛逛|综合体验|宝贝评价|全部|追评|图片/;

/** 规格/参数类噪声:含这些词的行会降权,但不直接排除 */
const SPEC_NOISE = /颜色|尺码|规格|型号|尺寸|大小|重量|材质|面料|成分|款式|版本|内存|容量|套餐|组合|分类|适用|新旧|成色|保修|质保|发票|包装|数量|件数|起售|最小/;

const CJK = /[一-龥]/g;
const PRICE_LIKE = /[¥￥]\s*\d|券后|到手|秒杀|活动价|现价|预估|拍下|\d+\.?\d{0,2}\s*元/;

/* ---------------- OCR 文本清理 ---------------- */

/**
 * 清理 OCR 输出:去除汉字间空格、合并断行、删除常见 OCR 乱码。
 */
export function cleanOCRText(text) {
  if (!text) return '';
  return text
    .split('\n').map(l => l.trim()).filter(Boolean).join('\n')
    .replace(/([一-龥])\s+([一-龥])/g, '$1$2')
    .replace(/([一-龥])\s+(\d)/g, '$1$2')
    .replace(/(\d)\s+([一-龥])/g, '$1$2')
    .replace(/(\d)\s*\.\s*(\d)/g, '$1.$2')
    .replace(/([一-龥]{2,})[。，？！,]\n([一-龥])/g, '$1$2')
    .replace(/[|{}[\]◇◆○●◎◇◆※]/g, '')
    .split('\n').filter(l => l.replace(/[\s,.，。、：:；;!！?？'"'""【】《》\-—/\\]+/g, '').length >= 2).join('\n')
    // 最后统一删除所有行内空格:OCR输出中空格无任何语义价值
    .split('\n').map(l => l.replace(/[ \t　 \f\r]+/g, '')).join('\n');
}

/* ---------------- 价格提取 ---------------- */

/** 提取价格:优先促销价,其次 ¥ 金额,最后兜底独立数字 */
export function extractPrice(text) {
  // 促销关键词 + 可选¥ + 金额
  const promo = text.match(/(?:到手价?|券后价?|秒杀价?|活动价|现价|拼单价|预估到手|预估到手价|拍下|券后)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/);
  if (promo) return parseFloat(promo[1]);
  // 任意 ¥/￥ 后金额(取匹配到的第一个)
  const yen = text.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/);
  if (yen) return parseFloat(yen[1]);
  // 兜底: 行首独立出现的两位数以上金额 "299.00"
  const lone = text.match(/(?:^|\n)\s*(\d{2,5}\.\d{2})\s*(?:$|\n)/m);
  if (lone) return parseFloat(lone[1]);
  // 二次兜底: "价格: XX" 或 "价格 ¥XX"
  const label = text.match(/(?:价格|售价|单价)[:：]\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/);
  if (label) return parseFloat(label[1]);
  return null;
}

/* ---------------- 标题提取 ---------------- */

/**
 * 提取标题:基于 CJK 密度、位置、长度的加权评分。
 * 规则:
 *   - 基础分 = CJK 字符数
 *   - 位置加成:前1/3的行 +20%
 *   - 长度惩罚:CJK>30 惩罚 30%,CJK>50 惩罚 60%(长描述,非标题)
 *   - 含价格金额的行不做候选
 *   - 规格词行降权 -30%
 *   - UI 噪声行直接排除
 */
export function extractTitle(text) {
  const lines = text.split('\n');
  let best = null;
  let bestScore = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 6 || UI_NOISE.test(line)) continue;
    if (PRICE_LIKE.test(line)) continue; // 价格行不可能是标题
    const cjkCount = (line.match(CJK) || []).length;
    if (cjkCount < 4) continue;
    let score = cjkCount;
    // 位置加成:标题通常在前部
    if (i < lines.length / 3) score *= 1.2;
    // 长度惩罚:很长的行一般是描述/参数
    if (cjkCount > 50) score *= 0.4;
    else if (cjkCount > 30) score *= 0.7;
    // 规格词降权
    if (SPEC_NOISE.test(line)) score *= 0.7;
    if (score > bestScore) {
      best = line;
      bestScore = score;
    }
  }
  return best ? best.replace(/^[^一-龥]+/, '') : null;
}

/* ---------------- 发货地提取 ---------------- */

/** 提取发货地:6种显式模式 + 省份城市名兜底扫描 */
export function extractShipFrom(text) {
  let m;
  // 1) "发货地:广东广州" / "发货地:上海"
  m = text.match(/发货地?[:：]\s*([一-龥]{2,8})/);
  if (m) return m[1];
  // 2) "所在地:广东广州" / "所在地区:上海"
  m = text.match(/所在地(?:区)?[:：]?\s*([一-龥]{2,8})/);
  if (m && !/\d/.test(m[1])) return m[1];
  // 3) "广东广州发货" / "广州发货"
  m = text.match(/([一-龥]{2,8})\s*发货/);
  if (m && !/极速|当日|次日|今日|明天|小时|付款|承诺|小时内|预计|24|48|闪电/.test(m[1])) return m[1];
  // 4) "发货广东广州" (无"地"字,无冒号)
  m = text.match(/发货\s*([一-龥]{2,8})/);
  if (m && !/极速|当日|次日|今日|明天|小时|付款|承诺|小时内|预计|24|48|闪电/.test(m[1])) return m[1];
  // 5) "发货地址:广东广州"
  m = text.match(/发货地址[:：]\s*([一-龥]{2,8})/);
  if (m) return m[1];
  // 6) "广州|2小时内发货" → 管道符左边城市名
  m = text.match(/([一-龥]{2,5})\s*\|/);
  if (m && !/极速|当日|次日|品牌|正品|免邮/.test(m[1])) return m[1];
  // 7) 兜底:扫描"省份名开头+城市名"组合(如"广东广州"、"浙江杭州")
  for (const w of text.split(/[\n,，。、|·]+/)) {
    if (w.length >= 4 && w.length <= 7 && PROVINCE_PREFIX.test(w)) {
      if (!/极速|当日|次日|品牌|正品|免邮|退货|退款|包邮/.test(w)) return w;
    }
  }
  return null;
}

/** 常见省份/直辖市/自治区首部,用于匹配"省份+城市"格式的发货地 */
const PROVINCE_PREFIX = /^(?:北京|天津|上海|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|内蒙)/;

/* ---------------- 主入口 ---------------- */

export function parseProductText(text) {
  if (!text || typeof text !== 'string') return { title: null, price: null, shipFrom: null };
  return {
    title: extractTitle(text),
    price: extractPrice(text),
    shipFrom: extractShipFrom(text)
  };
}
