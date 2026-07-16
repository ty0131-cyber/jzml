<script setup>
import { ref, computed, onMounted } from 'vue';
import { imageURL } from '../store/storage.js';
import { stageOf, needsReview, STAGE_TXT } from '../domain/logistics.js';
import { money } from '../domain/format.js';

const props = defineProps({
  order: { type: Object, required: true },
  now: { type: Number, required: true }
});

const imgUrl = ref(null);
onMounted(async () => {
  imgUrl.value = await imageURL(props.order.id);
});

const stage = computed(() => stageOf(props.order, props.now));
const review = computed(() => needsReview(props.order, props.now));
const statusText = computed(() => {
  if (props.order.verdict === 'saved') return '已入账 ✓';
  if (props.order.verdict === 'want') return '已转真实购买';
  return STAGE_TXT[stage.value];
});
const statusClass = computed(() => {
  if (props.order.verdict === 'saved') return 'green';
  if (stage.value !== 'signed' && stage.value !== 'created') return 'hot';
  return '';
});
</script>

<template>
  <div class="ocard">
    <span v-if="review" class="badge">待确认</span>
    <div class="thumb" :style="imgUrl ? { backgroundImage: `url(${imgUrl})` } : {}">
      <template v-if="!imgUrl">🛍</template>
    </div>
    <div class="mid">
      <div class="nm">{{ order.name }}</div>
      <div class="shop">{{ order.shop || '模拟商城自营店' }}</div>
      <div class="row2">
        <span class="pr"><small>¥</small>{{ money(order.price) }}<template v-if="order.qty > 1"> ×{{ order.qty }}</template></span>
        <span class="st" :class="statusClass">{{ statusText }}</span>
      </div>
    </div>
  </div>
</template>
