<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { go, getOrder, markSaved, markWant, removeOrder } from '../store/useStore.js';
import { stageOf, needsReview, reviewAt, displayTime, STAGE_TXT } from '../domain/logistics.js';
import { orderTotal } from '../domain/savings.js';
import { money, fmtRelative } from '../domain/format.js';
import { imageURL } from '../store/storage.js';
import OrderTimeline from '../components/OrderTimeline.vue';

const props = defineProps({ param: { type: String, default: null } });

const now = ref(Date.now());
let timer = null;
const imgUrl = ref(null);

onMounted(async () => {
  if (!order.value) {
    go('home');
    return;
  }
  timer = setInterval(() => (now.value = Date.now()), 20e3);
  imgUrl.value = await imageURL(props.param);
});
onUnmounted(() => clearInterval(timer));

const order = computed(() => getOrder(props.param));
const stage = computed(() => (order.value ? stageOf(order.value, now.value) : 'created'));
const review = computed(() => order.value && needsReview(order.value, now.value));
const total = computed(() => (order.value ? orderTotal(order.value) : 0));
const rAt = computed(() => (order.value ? reviewAt(order.value) : 0));

const bannerTitle = computed(() => {
  if (!order.value) return '';
  if (order.value.verdict === 'saved') return '省下了 ✓';
  if (order.value.verdict === 'want') return '已转真实购买';
  return STAGE_TXT[stage.value];
});
const bannerSub = computed(() => {
  if (!order.value) return '';
  if (stage.value !== 'signed') return '这是一单模拟消费,收货全程不花一分钱';
  if (order.value.verdict) return '这一单已复盘完成';
  if (now.value >= rAt.value) return '冷静期已到,做个决定吧';
  return `冷静期至 ${fmtRelative(rAt.value, now.value)},到时问你还想不想要`;
});

function onWant() {
  markWant(props.param);
}
function onKeep() {
  markSaved(props.param);
}
function onDelete() {
  if (confirm('删除这一单?省钱账本会同步扣减。')) {
    removeOrder(props.param);
    go('home');
  }
}
</script>

<template>
  <template v-if="order">
    <div class="nav">
      <button class="back" aria-label="返回" @click="go('home')">‹</button>
      <div class="title">订单详情</div>
      <div style="width:40px"></div>
    </div>

    <div class="stbanner" :class="{ green: stage === 'signed' }">
      {{ bannerTitle }}
      <div class="sub">{{ bannerSub }}</div>
    </div>

    <div v-if="review" class="review">
      <h3>收货 7 天了,还想要它吗?</h3>
      <p>{{ order.name }} · ¥{{ money(total) }}</p>
      <div class="btns">
        <a v-if="order.link" class="want" :href="order.link" target="_blank" rel="noopener" @click="onWant">还想要,去真买</a>
        <button v-else class="want" @click="onWant">还想要,去真买</button>
        <button class="keep" @click="onKeep">不想要了,入账 ¥{{ money(total) }}</button>
      </div>
    </div>

    <div v-if="order.verdict === 'saved'" class="verdict">
      ✓ 冷静期后确认不需要,已入账 <b>¥{{ money(total) }}</b>。这就是没花出去的钱。
    </div>
    <div v-if="order.verdict === 'want'" class="verdict w">
      你在冷静期后仍然想要它——那它大概率是真需求,买得安心。
    </div>

    <div class="sheet">
      <div class="citem">
        <div class="thumb" :style="imgUrl ? { backgroundImage: `url(${imgUrl})` } : {}"></div>
        <div style="flex:1">
          <div class="nm">{{ order.name }}</div>
          <div class="shop">{{ order.shop || '模拟商城自营店' }}</div>
          <div class="row2">
            <span class="pr"><small>¥</small>{{ money(order.price) }}</span>
            <span style="color:var(--ink2);font-size:13px">×{{ order.qty }}</span>
          </div>
        </div>
      </div>
    </div>

    <OrderTimeline :order="order" :now="now" />

    <button class="del" @click="onDelete">删除这一单</button>
  </template>
</template>
