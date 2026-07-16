<script setup>
import { computed } from 'vue';
import { store } from './store/useStore.js';
import HomeView from './views/HomeView.vue';
import CreateView from './views/CreateView.vue';
import ConfirmView from './views/ConfirmView.vue';
import DetailView from './views/DetailView.vue';
import MineView from './views/MineView.vue';
import NotiBanner from './components/NotiBanner.vue';
import TabBar from './components/TabBar.vue';

const VIEWS = {
  home: HomeView,
  create: CreateView,
  confirm: ConfirmView,
  detail: DetailView,
  mine: MineView,
  settings: MineView // 旧路由名兼容
};
const current = computed(() => VIEWS[store.view.name] || HomeView);
const showTabs = computed(() => store.view.name === 'home' || store.view.name === 'mine');
</script>

<template>
  <component :is="current" :param="store.view.param" />
  <TabBar v-if="showTabs" />
  <NotiBanner />
</template>
