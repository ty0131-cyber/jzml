<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { store, go, notify } from '../store/useStore.js';
import { recognizeImage } from '../services/ocr.js';
import { parseProductText } from '../domain/parse.js';

const name = ref('');
const price = ref('');
const qty = ref(1);
const shop = ref('');
const link = ref('');
const shipFrom = ref('');
const img = ref(null); // File
const imgPreview = ref(null); // objectURL

const ocrState = ref('idle'); // idle | running | done | fail
const ocrProgress = ref(0);
const pasteText = ref('');
const showPaste = ref(false);

/* 若从确认页返回,恢复草稿 */
onMounted(() => {
  const d = store.draft;
  if (d) {
    name.value = d.name;
    price.value = d.price;
    qty.value = d.qty;
    shop.value = d.shop;
    link.value = d.link;
    shipFrom.value = d.shipFrom || '';
    if (d.img) setImg(d.img);
  }
  document.addEventListener('paste', onPaste);
});
onUnmounted(() => {
  document.removeEventListener('paste', onPaste);
  if (imgPreview.value) URL.revokeObjectURL(imgPreview.value);
});

function setImg(file) {
  img.value = file;
  if (imgPreview.value) URL.revokeObjectURL(imgPreview.value);
  imgPreview.value = URL.createObjectURL(file);
  ocrState.value = 'idle';
}
function onFile(e) {
  const f = e.target.files && e.target.files[0];
  if (f) setImg(f);
}
function onPaste(e) {
  const items = [...(e.clipboardData?.items || [])];
  const imgItem = items.find((i) => i.type.startsWith('image'));
  if (imgItem) { setImg(imgItem.getAsFile()); return; }
  // 没有图片时检查文本:如果用户从系统OCR复制了文字,粘贴即解析
  const textItem = items.find((i) => i.type === 'text/plain');
  if (textItem) {
    textItem.getAsString((s) => {
      pasteText.value = s;
      showPaste.value = true;
      applyPastedText(s);
    });
  }
}

/** 将粘贴/输入的OCR文本解析并预填字段 */
function applyPastedText(text) {
  if (!text || !text.trim()) return;
  const r = parseProductText(text);
  if (r.title && !name.value.trim()) name.value = r.title;
  if (r.price != null && !String(price.value).trim()) price.value = r.price;
  if (r.shipFrom && !shipFrom.value.trim()) shipFrom.value = r.shipFrom;
  if (r.title || r.price != null) {
    notify('已从粘贴文字中提取信息,请核对');
  } else {
    notify('未能从文字中识别出商品信息,请检查');
  }
}

/* OCR 识别预填:只填当前为空的字段,不覆盖用户已填内容 */
async function runOcr() {
  if (!img.value || ocrState.value === 'running') return;
  ocrState.value = 'running';
  ocrProgress.value = 0;
  try {
    const text = await recognizeImage(img.value, (p) => (ocrProgress.value = p));
    const r = parseProductText(text);
    if (r.title && !name.value.trim()) name.value = r.title;
    if (r.price != null && !String(price.value).trim()) price.value = r.price;
    if (r.shipFrom && !shipFrom.value.trim()) shipFrom.value = r.shipFrom;
    ocrState.value = 'done';
    notify(r.title || r.price != null ? '识别完成,请核对预填内容' : '没识别出有效信息,请手动填写');
  } catch (e) {
    console.error('[ocr]', e);
    ocrState.value = 'fail';
    notify('识别失败(首次需联网下载模型),可手动填写');
  }
}

function submit() {
  const p = parseFloat(price.value);
  const q = Math.max(1, parseInt(qty.value) || 1);
  if (!name.value.trim() || !(p >= 0)) {
    notify('请填写商品名称和价格');
    return;
  }
  store.draft = {
    name: name.value.trim(),
    price: p,
    qty: q,
    shop: shop.value.trim(),
    link: link.value.trim(),
    shipFrom: shipFrom.value.trim(),
    img: img.value
  };
  go('confirm');
}
</script>

<template>
  <div class="nav">
    <button class="back" aria-label="返回" @click="store.draft = null; go('home')">‹</button>
    <div class="title">买一单</div>
    <div style="width:40px"></div>
  </div>

  <div class="imgdrop">
    <template v-if="imgPreview">
      <img :src="imgPreview" alt="商品截图" />
      <div class="re">重选</div>
    </template>
    <template v-else>
      <div style="font-size:30px">📷</div>
      <div>粘贴或选择商品截图</div>
      <div style="font-size:11.5px;color:#c4c4cd">在购物App里长截图,回来贴在这里</div>
    </template>
    <input type="file" accept="image/*" @change="onFile" />
  </div>

  <button v-if="imgPreview" class="ocrbtn" :disabled="ocrState === 'running'" @click="runOcr">
    <template v-if="ocrState === 'running'">识别中 {{ Math.round(ocrProgress * 100) }}%…</template>
    <template v-else-if="ocrState === 'done'">重新识别</template>
    <template v-else>🔍 识别截图,自动预填</template>
  </button>

  <!-- 粘贴文字入口:系统OCR(如iPhone实况文本)识别率更高,可直接粘贴 -->
  <div class="paste-area">
    <button v-if="!showPaste" class="paste-toggle" @click="showPaste = true">
      📋 或用系统OCR复制后粘贴文字
    </button>
    <template v-else>
      <textarea
        v-model="pasteText"
        class="paste-input"
        placeholder="在购物App截图→用系统OCR复制文字→贴在这里"
        rows="4"
      />
      <div class="paste-actions">
        <button class="paste-apply" @click="applyPastedText(pasteText)">解析文字</button>
        <button class="paste-clear" @click="pasteText = ''; showPaste = false">收起</button>
      </div>
    </template>
  </div>

  <div class="sheet">
    <div class="frow"><label>商品名称</label><input v-model="name" placeholder="必填,可由识别预填" /></div>
    <div class="frow"><label>价格 ¥</label><input v-model="price" type="number" inputmode="decimal" step="0.01" min="0" placeholder="必填" /></div>
    <div class="frow"><label>数量</label><input v-model="qty" type="number" inputmode="numeric" min="1" /></div>
    <div class="frow"><label>店铺</label><input v-model="shop" placeholder="选填" /></div>
    <div class="frow"><label>发货地</label><input v-model="shipFrom" placeholder="选填,可由识别预填" /></div>
    <div class="frow"><label>商品链接</label><input v-model="link" placeholder="选填,7天后想买时一键跳回" /></div>
  </div>
  <div class="hint">所有信息只存在你自己的手机里,不会发生任何真实支付。首次识别需下载中文模型(约15MB)。</div>

  <button class="cta" @click="submit">立即购买</button>
</template>
