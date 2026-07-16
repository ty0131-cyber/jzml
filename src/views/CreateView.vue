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
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image'));
  if (item) setImg(item.getAsFile());
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
