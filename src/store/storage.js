/**
 * 持久化层 —— 全项目唯一允许直接接触 localStorage / IndexedDB 的文件。
 * 其他任何代码要读写数据,必须经过这里。
 */
import { migrate, CURRENT_SCHEMA } from './migrations.js';

const LS_KEY = 'jzml_v1'; // ★ 数据契约:不得更改

/* ---------------- localStorage:订单与设置 ---------------- */

export function loadState() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  } catch (e) {
    console.error('[storage] 本地数据解析失败,已重置为默认结构', e);
  }
  return migrate(raw);
}

export function persist({ orders, settings }) {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA, orders, settings })
    );
  } catch (e) {
    console.error('[storage] 写入失败', e);
  }
}

/* ---------------- 备份:导出 / 导入 ---------------- */

export function exportJSON({ orders, settings }) {
  return JSON.stringify(
    { app: 'jiazhuang-maile', exportedAt: Date.now(), schemaVersion: CURRENT_SCHEMA, orders, settings },
    null,
    2
  );
}

/** 校验并解析导入文件;不合法时返回 null */
export function parseImport(text) {
  try {
    const d = JSON.parse(text);
    if (d && d.app === 'jiazhuang-maile' && Array.isArray(d.orders)) return migrate(d);
  } catch (e) {
    /* fallthrough */
  }
  return null;
}

/* ---------------- IndexedDB:商品截图 ---------------- */

let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('jzml', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('imgs');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function putImage(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('imgs', 'readwrite');
    tx.objectStore('imgs').put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function delImage(id) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction('imgs', 'readwrite');
      tx.objectStore('imgs').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  } catch (e) {
    /* 图片删除失败不阻塞主流程 */
  }
}

const urlCache = {};
/** 取图片的 objectURL,无图返回 null */
export async function imageURL(id) {
  if (urlCache[id]) return urlCache[id];
  try {
    const db = await openDB();
    const blob = await new Promise((resolve) => {
      const q = db.transaction('imgs').objectStore('imgs').get(id);
      q.onsuccess = () => resolve(q.result || null);
      q.onerror = () => resolve(null);
    });
    if (!blob) return null;
    urlCache[id] = URL.createObjectURL(blob);
    return urlCache[id];
  } catch (e) {
    return null;
  }
}
