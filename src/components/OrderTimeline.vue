<script setup>
import { computed } from 'vue';
import { timelineSteps } from '../domain/logistics.js';
import { fmtRelative } from '../domain/format.js';

const props = defineProps({
  order: { type: Object, required: true },
  now: { type: Number, required: true }
});

const steps = computed(() => timelineSteps(props.order));
/** 当前进行到的节点下标 */
const doneIdx = computed(() =>
  steps.value.reduce((acc, s, i) => (props.now >= s.t ? i : acc), 0)
);
/** 展示按时间倒序(最新在上) */
const display = computed(() =>
  steps.value.map((s, i) => ({ ...s, idx: i })).slice().reverse()
);
function cls(item) {
  if (props.now < item.t) return '';
  return item.idx === doneIdx.value ? 'now' : 'done';
}
</script>

<template>
  <div class="tl">
    <h4>物流跟踪 <span>{{ order.courier }} · {{ order.trackingNo }}</span></h4>
    <div v-for="item in display" :key="item.key" class="tli" :class="cls(item)">
      <div class="dot"></div>
      <div>
        <div class="tt">{{ item.title }}<template v-if="now < item.t">（预计）</template></div>
        <div class="ts">{{ fmtRelative(item.t, now) }}<template v-if="now >= item.t"> · {{ item.desc }}</template></div>
      </div>
    </div>
  </div>
</template>
