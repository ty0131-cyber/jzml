<script setup>
import { ref, computed } from 'vue';
import { store } from '../store/useStore.js';
import { money } from '../domain/format.js';

const props = defineProps({
  amount: { type: Number, required: true }
});
const emit = defineEmits(['success', 'close']);

/* keypad | method | processing | success */
const phase = ref('keypad');
const pin = ref('');
const method = ref('余额');

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const methods = computed(() => [
  { id: 'bal', name: '余额', sub: `¥${money(store.settings.balance)}` },
  ...store.settings.payMethods.map((p) => ({ id: p.id, name: p.name, sub: '' }))
]);

function press(k) {
  if (phase.value !== 'keypad') return;
  if (pin.value.length < 6) pin.value += k;
  if (pin.value.length === 6) {
    phase.value = 'processing';
    setTimeout(() => {
      phase.value = 'success';
      if (navigator.vibrate) navigator.vibrate(30);
      setTimeout(() => emit('success', method.value), 1500);
    }, 1300);
  }
}
function del() {
  pin.value = pin.value.slice(0, -1);
}
function chooseMethod(name) {
  method.value = name;
  phase.value = 'keypad';
}
</script>

<template>
  <div class="paymask">
    <div class="paysheet ap">
      <template v-if="phase === 'keypad'">
        <div class="ph">
          <button class="x" @click="emit('close')">✕</button>
          <span>确认付款</span>
          <span style="width:32px"></span>
        </div>
        <div class="payamt"><small>¥</small>{{ money(amount) }}</div>
        <button class="ap-method" @click="phase = 'method'">
          <span class="k">付款方式</span>
          <span class="v">{{ method }} ›</span>
        </button>
        <div class="dots">
          <i v-for="i in 6" :key="i" :class="{ f: i <= pin.length }"></i>
        </div>
        <div class="pad ap-pad">
          <button v-for="k in KEYS" :key="k" @click="press(k)">{{ k }}</button>
          <button class="zero" @click="press('0')">0</button>
          <button @click="del">⌫</button>
        </div>
        <div class="ap-sim">模拟支付,不会发生真实扣款</div>
      </template>

      <template v-else-if="phase === 'method'">
        <div class="ph">
          <button class="x" @click="phase = 'keypad'">‹</button>
          <span>选择付款方式</span>
          <span style="width:32px"></span>
        </div>
        <div class="ap-mlist">
          <button v-for="m in methods" :key="m.id" @click="chooseMethod(m.name)">
            <span>{{ m.name }} <small v-if="m.sub">{{ m.sub }}</small></span>
            <i :class="{ sel: method === m.name }"></i>
          </button>
        </div>
        <div class="ap-sim">展示用途;统一从虚拟余额扣减以便统计</div>
      </template>

      <div v-else-if="phase === 'processing'" class="payload">
        <div class="spin ap-spin"></div>
        <div>正在付款…</div>
      </div>

      <div v-else class="okwrap">
        <div class="okring ap-ok">
          <svg viewBox="0 0 40 40"><path d="M11 21 L18 28 L30 13" /></svg>
        </div>
        <div class="oktxt">支付成功</div>
        <div class="okamt">{{ method }} ¥{{ money(amount) }}</div>
      </div>
    </div>
  </div>
</template>
