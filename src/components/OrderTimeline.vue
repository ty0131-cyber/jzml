<script setup>
import { ref, computed } from 'vue';
import { timelineSteps, stageOf, STAGE_TXT } from '../domain/logistics.js';
import { fmtRelative } from '../domain/format.js';

const props = defineProps({
  order: { type: Object, required: true },
  now: { type: Number, required: true }
});

// 时间线节点展示顺序,用于判断"已过"vs"未到"
const STEP_ORDER = ['created', 'confirmed', 'shipped', 'picked', 'departed', 'transit', 'arrived', 'delivering', 'signed'];

const collapsed = ref(true);
const COLLAPSE_AT = 6;

const allSteps = computed(() => timelineSteps(props.order));

// 当前物流阶段:用触发时间(演示模式压缩到分钟)判断,不用展示时间
const currentStage = computed(() => stageOf(props.order, props.now));
const currentIdx = computed(() => STEP_ORDER.indexOf(currentStage.value));

// 仅展示已到达的节点 + 当前节点,未来的不暴露
const activeSteps = computed(() =>
  allSteps.value.filter(s => {
    const idx = STEP_ORDER.indexOf(s.key);
    return idx >= 0 && idx <= currentIdx.value;
  })
);

const visible = computed(() => {
  const st = activeSteps.value;
  if (!collapsed.value || st.length <= COLLAPSE_AT + 1) return st;
  const head = st.slice(0, 4);
  const tail = st.slice(-2);
  const mid = st.slice(4, -2);
  const nowInMid = mid.filter(s => s.key === currentStage.value);
  if (nowInMid.length) head.push(nowInMid[0]);
  return [...head, ...tail];
});

function cls(item) {
  const idx = STEP_ORDER.indexOf(item.key);
  if (idx < currentIdx.value) return 'done';
  if (idx === currentIdx.value) return 'now';
  return '';
}

/** 从转运中心名称中提取城市名 */
function cityOf(hub) {
  if (!hub) return null;
  const m = hub.match(/^([一-鿿]{2,3})/);
  return m ? m[1] : hub;
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
      <span class="lt-city c1">{{ order.shipFrom || cityOf(order.hub1) || '发货地' }}</span>
      <span class="lt-city c2">{{ cityOf(order.hub2) || '目的地' }}</span>
    </div>

    <!-- 时间轴 -->
    <div class="lt-track">
      <div
        v-for="item in visible"
        :key="item.key"
        class="lt-step"
        :class="cls(item)"
      >
        <span class="lt-dot" />
        <div class="lt-head">
          <span class="stat">{{ item.title }}</span>
          <span class="time">{{ fmtRelative(item.t, now) }}</span>
        </div>
        <div class="lt-desc">{{ item.desc }}</div>

        <!-- 签收回执卡片 -->
        <div v-if="item.key === 'signed' && currentStage === 'signed'" class="lt-receipt">
          <span class="emoji">📦</span>
          <div class="txt">
            <div class="t1">已送货上门</div>
            <div class="t2">感谢使用{{ order.courier }}</div>
          </div>
        </div>
      </div>

      <div v-if="activeSteps.length > COLLAPSE_AT + 1" class="lt-collapse" @click="toggle">
        {{ collapsed ? `展开全部 ${activeSteps.length} 条物流明细 ⌄` : '收起更多物流明细 ⌃' }}
      </div>
    </div>

    <!-- 底部地址 -->
    <div class="lt-foot">
      <span class="loc">📍</span>
      <div class="addr">
        送至 {{ order.destAddr || order.shipFrom || order.hub1 || '' }}
        <div class="small">{{ order.trackingNo }} · 虚拟号保护中</div>
      </div>
    </div>
  </div>
</template>
