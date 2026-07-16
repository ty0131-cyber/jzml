/**
 * OCR 服务 —— 引擎抽象层。
 * 当前实现:Tesseract.js(纯前端,chi_sim 中文模型)。
 * 引擎懒加载:只有用户点了「识别」才 import,避免首屏背上 ~15MB 模型。
 */
import { cleanOCRText } from '../domain/parse.js';

/**
 * 识别图片,返回整段文本(已清理空格)。
 * 预处理:压缩大图提速并提升准确率。
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
 * 图片预处理:缩小过大图片,减少 OCR 计算量,同时滤除部分噪声。
 * 保持宽高比,最大边不超过 1500px。
 */
async function preprocessImage(file) {
  const MAX = 1500;
  const bmp = await createImageBitmap(file);
  if (bmp.width <= MAX && bmp.height <= MAX) return file;

  const scale = MAX / Math.max(bmp.width, bmp.height);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  return new File([blob], file.name || 'img.jpg', { type: 'image/jpeg' });
}
