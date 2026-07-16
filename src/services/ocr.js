/**
 * OCR 服务 —— 引擎抽象层。
 * 当前实现:Tesseract.js(纯前端,chi_sim 中文模型)。
 * 引擎懒加载:只有用户点了「识别」才 import,避免首屏背上 ~15MB 模型。
 */
import { cleanOCRText } from '../domain/parse.js';

const MAX_DIM = 1800;

/**
 * 识别图片,返回整段文本(已清理空格)。
 * 预处理:灰度化 + 对比度增强 + 缩放,提升中文识别率。
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
 * 图片预处理:灰度化 + 对比度拉伸 + 缩放。
 * 彩色 UI 截图直接送 OCR 效果很差(尤其中文),先转灰度并拉伸对比度,
 * 让文字与背景分离,再缩放到合理尺寸。
 */
async function preprocessImage(file) {
  const bmp = await createImageBitmap(file);
  const { width: w0, height: h0 } = bmp;

  // 缩放:最大边不超过 MAX_DIM
  const scale = Math.min(1, MAX_DIM / Math.max(w0, h0));
  const w = Math.round(w0 * scale);
  const h = Math.round(h0 * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  // 灰度化 + 对比度拉伸
  const imageData = ctx.getImageData(0, 0, w, h);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    // 加权灰度:人眼对绿色最敏感
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    // 对比度拉伸:以 128 为中点,暗的更暗、亮的更亮
    const stretched = Math.round((gray - 128) * 1.8 + 128);
    const clamped = Math.max(0, Math.min(255, stretched));
    pixels[i] = pixels[i + 1] = pixels[i + 2] = clamped;
    // alpha 不变
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new File([blob], file.name || 'img.png', { type: 'image/png' });
}
