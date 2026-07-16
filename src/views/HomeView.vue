<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { store, go } from '../store/useStore.js';
import { monthSpent } from '../domain/wallet.js';
import { stageOf } from '../domain/logistics.js';
import { money } from '../domain/format.js';
import OrderCard from '../components/OrderCard.vue';

const now = ref(Date.now());
let timer = null;
onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 30e3);
  document.addEventListener('visibilitychange', refresh);
});
onUnmounted(() => {
  clearInterval(timer);
  document.removeEventListener('visibilitychange', refresh);
});
function refresh() {
  if (!document.hidden) now.value = Date.now();
}

const tab = ref('all');
const TABS = { all: '全部', doing: '进行中', done: '已签收' };

const spentThisMonth = computed(() => monthSpent(store.orders, now.value));
const list = computed(() => {
  let l = store.orders.slice().sort((a, b) => b.t0 - a.t0);
  if (tab.value === 'doing') l = l.filter((o) => stageOf(o, now.value) !== 'signed');
  if (tab.value === 'done') l = l.filter((o) => stageOf(o, now.value) === 'signed');
  return l;
});
</script>

<template>
  <div class="nav">
    <div style="width:40px"></div>
    <div class="title">买了吗</div>
    <div style="width:40px"></div>
  </div>

  <div class="spend">
    <div class="lab">本月您已消费</div>
    <div class="amt"><small>¥</small>{{ money(spentThisMonth) }}</div>
    <div class="pend">
      <span>余额 ¥{{ money(store.settings.balance) }}</span>
      <span>{{ store.orders.length }} 单</span>
    </div>
  </div>

  <div class="tabs">
    <button v-for="(label, key) in TABS" :key="key" :class="{ on: tab === key }" @click="tab = key">
      {{ label }}
    </button>
  </div>

  <div class="olist">
    <template v-if="list.length">
      <OrderCard v-for="o in list" :key="o.id" :order="o" :now="now" @click="go('detail', o.id)" />
    </template>
    <div v-else class="empty">
      <div class="big">🛒</div>
      下次想剁手的时候,<br />来这里“买”一单试试。
    </div>
  </div>

  <button class="fab" @click="go('create')">＋ 立即购买</button>
</template>
