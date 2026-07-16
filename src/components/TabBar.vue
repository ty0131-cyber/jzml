<script setup>
import { store, go } from '../store/useStore.js';
</script>

<template>
  <nav class="tabbar">
    <button :class="{ on: store.view.name === 'home' }" @click="go('home')">
      <span class="ic">🛒</span><span>购物</span>
    </button>
    <button :class="{ on: store.view.name === 'mine' }" @click="go('mine')">
      <span class="ic">👤</span><span>我的</span>
    </button>
  </nav>
</template>
