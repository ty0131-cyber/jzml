import { describe, it, expect } from 'vitest';
import { parseProductText, extractPrice, extractTitle, extractShipFrom } from '../src/domain/parse.js';

const SAMPLE = `
首页 详情 评价 推荐
无印良品风简约棉麻连衣裙女夏季新款宽松显瘦
¥299.00 券后价 ¥259.00
已售 2.3万+ 好评率98%
浙江杭州 发货 · 运费险
领券 收藏 加入购物车 立即购买
`;

describe('extractPrice', () => {
  it('优先取券后/到手价', () => {
    expect(extractPrice(SAMPLE)).toBe(259);
  });
  it('无关键词时取首个¥金额', () => {
    expect(extractPrice('原价 ¥99.90 包邮')).toBe(99.9);
  });
  it('全角￥也识别', () => {
    expect(extractPrice('￥45')).toBe(45);
  });
  it('无价格返回null', () => {
    expect(extractPrice('这里没有金额')).toBe(null);
  });
});

describe('extractTitle', () => {
  it('取中文最长且无UI噪声的行', () => {
    expect(extractTitle(SAMPLE)).toBe('无印良品风简约棉麻连衣裙女夏季新款宽松显瘦');
  });
  it('全是噪声行时返回null', () => {
    expect(extractTitle('领券 收藏\n加入购物车 立即购买')).toBe(null);
  });
});

describe('extractShipFrom', () => {
  it('识别「xx 发货」', () => {
    expect(extractShipFrom(SAMPLE)).toBe('浙江杭州');
  });
  it('识别「发货地: xx」', () => {
    expect(extractShipFrom('发货地：广东深圳')).toBe('广东深圳');
  });
  it('不把时效词当发货地', () => {
    expect(extractShipFrom('承诺48小时发货')).toBe(null);
  });
});

describe('parseProductText', () => {
  it('综合解析', () => {
    const r = parseProductText(SAMPLE);
    expect(r.price).toBe(259);
    expect(r.title).toContain('连衣裙');
    expect(r.shipFrom).toBe('浙江杭州');
  });
  it('空输入安全返回', () => {
    expect(parseProductText(null)).toEqual({ title: null, price: null, shipFrom: null });
  });
});
