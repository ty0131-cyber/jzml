<script setup>
import { ref, watch } from 'vue';
import { store } from '../store/useStore.js';

const show = ref(false);
let timer = null;

watch(
  () => store.noti.seq,
  () => {
    if (!store.noti.msg) return;
    show.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => (show.value = false), 3200);
  }
);
</script>

<template>
  <div class="noti" :class="{ show }">
    <div class="t"><span>买了吗</span><span>现在</span></div>
    <div class="b">{{ store.noti.msg }}</div>
  </div>
</template>
