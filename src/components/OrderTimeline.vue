<script setup>
import { ref, computed } from 'vue';
import { timelineSteps } from '../domain/logistics.js';
import { fmtRelative } from '../domain/format.js';

const props = defineProps({
  order: { type: Object, required: true },
  now: { type: Number, required: true }
});

const collapsed = ref(true);
const COLLAPSE_AT = 6; // 超过此数量可折叠

const steps = computed(() => timelineSteps(props.order));
const doneIdx = computed(() =>
  steps.value.reduce((acc, s, i) => (props.now >= s.t ? i : acc), -1)
);

const visible = computed(() => {
  if (!collapsed.value || steps.value.length <= COLLAPSE_AT + 1) return steps.value;
  // 折叠时显示前4个 + 当前节点 + 最后2个
  const head = steps.value.slice(0, 4);
  const tail = steps.value.slice(-2);
  const mid = steps.value.slice(4, -2);
  // 从 mid 中取当前节点(如果有)
  const nowInMid = mid.filter((_, i) => (4 + i) === doneIdx.value);
  if (nowInMid.length) head.push(nowInMid[0]);
  return [...head, ...tail];
});

function cls(item, idx) {
  if (props.now < item.t) return '';
  return idx === doneIdx.value ? 'now' : 'done';
}

function toggle() {
  collapsed.value = !collapsed.value;
}
</script>

<template>
  <div class="lt-wrap">
    <!-- 地图头 -->
    <div class="lt-map">
      <div class="lt-river" />
      <div class="lt-road r1" /><div class="lt-road r2" />
      <span class="lt-city c1">{{ order.hub1?.split('转运')[0] || '发货地' }}</span>
      <span class="lt-city c2">{{ order.hub2?.split('转运')[0] || '目的地' }}</span>
    </div>

    <!-- 时间轴 -->
    <div class="lt-track">
      <div
        v-for="(item, i) in visible"
        :key="item.key"
        class="lt-step"
        :class="cls(item, steps.indexOf(item))"
      >
        <span class="lt-dot" />
        <div class="lt-head" :class="{ timeonly: !item.title || steps.indexOf(item) > doneIdx }">
          <span v-if="item.title && steps.indexOf(item) <= doneIdx" class="stat">{{ item.title }}</span>
          <span class="time">{{ fmtRelative(item.t, now) }}</span>
        </div>
        <div class="lt-desc">{{ item.desc }}</div>

        <!-- 签收回执卡片 -->
        <div v-if="item.key === 'signed' && doneIdx >= steps.findIndex(s => s.key === 'signed')" class="lt-receipt">
          <span class="emoji">📦</span>
          <div class="txt">
            <div class="t1">已送货上门</div>
            <div class="t2">感谢使用{{ order.courier }}</div>
          </div>
        </div>
      </div>

      <div v-if="steps.length > COLLAPSE_AT + 1" class="lt-collapse" @click="toggle">
        {{ collapsed ? `展开全部 ${steps.length} 条物流明细 ⌄` : '收起更多物流明细 ⌃' }}
      </div>
    </div>

    <!-- 底部地址 -->
    <div class="lt-foot">
      <span class="loc">📍</span>
      <div class="addr">
        送至 {{ order.shipFrom || order.hub1 || '' }}
        <div class="small">{{ order.trackingNo }} · 虚拟号保护中</div>
      </div>
    </div>
  </div>
</template>
