/**
 * OCR 服务 —— 引擎抽象层。
 * 当前实现:Tesseract.js(纯前端,chi_sim 中文模型)。
 * 引擎懒加载:只有用户点了「识别」才 import,避免首屏背上 ~15MB 模型。
 * 注意:tesseract.js 的 wasm 核心与语言数据默认从 jsDelivr CDN 拉取,
 * 首次识别需联网且较慢;若日后升级云端 OCR,只需替换本文件,接口不变。
 */

/**
 * 识别图片,返回整段文本。
 * @param {File|Blob} image
 * @param {(p:number)=>void} [onProgress] 0~1 进度回调
 */
export async function recognizeImage(image, onProgress) {
  const { default: Tesseract } = await import('tesseract.js');
  const { data } = await Tesseract.recognize(image, 'chi_sim', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress || 0);
    }
  });
  return data.text || '';
}
