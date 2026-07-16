/**
 * OCR 服务 —— 引擎抽象层。
 * 当前实现:Tesseract.js(纯前端,chi_sim 中文模型)。
 * 引擎懒加载:只有用户点了「识别」才 import,避免首屏背上 ~15MB 模型。
 */
import { cleanOCRText } from '../domain/parse.js';

const MAX_DIM = 1800;

/**
 * 识别图片,返回整段文本(已清理空格)。
 * 预处理:缩放大图提速,保留原图色彩。
 * @param {File|Blob} image
 * @param {(p:number)=>void} [onProgress] 0~1 进度回调
 */
export async function recognizeImage(image, onProgress) {
  const preprocessed = await preprocessImage(image);
  const { default: Tesseract } = await import('tesseract.js');
  const { data } = await Tesseract.recognize(preprocessed, 'chi_sim+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress || 0);
    }
  });
  return cleanOCRText(data.text);
}

/**
 * 图片预处理:缩放至合理尺寸,减少 OCR 计算量。
 * 保持原图色彩:Tesseract 对彩色中文 UI 的识别依赖颜色区分文字与背景,
 * 灰度化反而会抹掉关键对比度。
 */
async function preprocessImage(file) {
  const bmp = await createImageBitmap(file);
  const { width: w0, height: h0 } = bmp;

  if (w0 <= MAX_DIM && h0 <= MAX_DIM) return file;

  const scale = MAX_DIM / Math.max(w0, h0);
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  return new File([blob], file.name || 'img.jpg', { type: 'image/jpeg' });
}
