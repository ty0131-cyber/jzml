<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { store, go, finalizeDraft, notify } from '../store/useStore.js';
import { wouldOverdraw } from '../domain/wallet.js';
import { money } from '../domain/format.js';
import PaySheet from '../components/PaySheet.vue';

const phase = ref('confirm'); // confirm | opening | pay | paid

const imgPreview = ref(null);

onMounted(() => {
  if (!store.draft) {
    go('home');
    return;
  }
  if (store.draft.img) imgPreview.value = URL.createObjectURL(store.draft.img);
});
onUnmounted(() => {
  if (imgPreview.value) URL.revokeObjectURL(imgPreview.value);
});

const total = computed(() => (store.draft ? store.draft.price * store.draft.qty : 0));

function submit() {
  if (wouldOverdraw(store.settings.balance, total.value)) {
    const ok = confirm(
      `余额不足:当前 ¥${money(store.settings.balance)},本单 ¥${money(total.value)}。继续支付将透支,确定吗?`
    );
    if (!ok) return;
  }
  phase.value = 'opening';
  setTimeout(() => { phase.value = 'pay'; }, 800);
}

async function onPaid(method) {
  const order = await finalizeDraft(method);
  if (order) {
    notify('您的订单已付款，商家备货中');
    go('detail', order.id);
  }
}

async function onPayAndHome(method) {
  const order = await finalizeDraft(method);
  if (order) {
    notify(`已支付 ¥${money(total.value)}(模拟) · 订单已创建`);
    go('home');
  }
}
</script>

<template>
  <template v-if="store.draft">
    <div class="nav">
      <button class="back" aria-label="返回" @click="go('create')">‹</button>
      <div class="title">确认订单</div>
      <div style="width:40px"></div>
    </div>

    <div class="sheet" @click="go('mine')">
      <div class="addr">
        <div class="pin">📍</div>
        <div>
          <div class="who">
            {{ store.settings.name || '点这里填写收货人' }}
            <span>{{ store.settings.phone }}</span>
          </div>
          <div class="where">{{ store.settings.addr || '（去「我的」填一个真实地址,仪式感会更足）' }}</div>
        </div>
      </div>
    </div>

    <div class="sheet">
      <div class="citem">
        <div class="thumb" :style="imgPreview ? { backgroundImage: `url(${imgPreview})` } : {}"></div>
        <div style="flex:1">
          <div class="nm">{{ store.draft.name }}</div>
          <div class="shop">{{ store.draft.shop || '模拟商城自营店' }}<template v-if="store.draft.shipFrom"> · {{ store.draft.shipFrom }}发货</template></div>
          <div class="row2">
            <span class="pr"><small>¥</small>{{ money(store.draft.price) }}</span>
            <span style="color:var(--ink2);font-size:13px">×{{ store.draft.qty }}</span>
          </div>
        </div>
      </div>
      <div class="sumrow"><span>运费</span><b>免运费</b></div>
      <div class="sumrow"><span>优惠</span><b class="neg">-¥0.00</b></div>
      <div class="sumrow"><span>合计</span><b class="neg">¥{{ money(total) }}</b></div>
    </div>

    <div style="height:80px"></div>
    <div class="paybar" v-if="phase === 'confirm'">
      <span class="tot">合计 <b>¥{{ money(total) }}</b></span>
      <button @click="submit">提交订单</button>
    </div>

    <!-- 正在打开支付软件过渡 -->
    <div v-if="phase === 'opening'" class="opening-mask">
      <div class="opening-card">
        <div class="opening-icon">💳</div>
        <div class="opening-text">正在打开支付软件…</div>
        <div class="opening-spin"></div>
      </div>
    </div>

    <PaySheet v-if="phase === 'pay'" :amount="total" @success="onPaid" @home="onPayAndHome" @close="phase = 'confirm'" />
  </template>
</template>
