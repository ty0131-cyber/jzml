<script setup>
import { ref, computed } from 'vue';
import { store, go, notify, saveSettings, wipeAll, replaceAll, recharge, addPayMethod, removePayMethod } from '../store/useStore.js';
import { exportJSON, parseImport } from '../store/storage.js';
import { computeSavings } from '../domain/savings.js';
import { totalSpent } from '../domain/wallet.js';
import { money } from '../domain/format.js';

const name = ref(store.settings.name);
const phone = ref(store.settings.phone);
const addr = ref(store.settings.addr);
const demo = ref(store.settings.demo);

const savings = computed(() => computeSavings(store.orders));
const spentAll = computed(() => totalSpent(store.orders));

function submit() {
  saveSettings({
    name: name.value.trim(),
    phone: phone.value.trim(),
    addr: addr.value.trim(),
    demo: demo.value
  });
  notify('已保存');
  if (store.draft) go('confirm');
}

/* ---------- 钱包 ---------- */
function doRecharge() {
  const v = prompt('充值金额(模拟,可作为本期消费额度)', '1000');
  if (v === null) return;
  if (!recharge(v)) notify('请输入有效金额');
}
function doAddCard() {
  const v = prompt('卡片名称(仅展示用,如「招商 ·1234」)', '');
  if (v === null) return;
  if (!addPayMethod(v)) notify('名称不能为空');
}

/* ---------- 备份 ---------- */
function doExport() {
  const text = exportJSON({ orders: store.orders, settings: store.settings });
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `买了吗备份-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
function doImport(e) {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const data = parseImport(reader.result);
    if (!data) {
      notify('文件格式不对,导入失败');
      return;
    }
    if (confirm(`导入 ${data.orders.length} 个订单?将覆盖当前数据(截图不含在备份中)。`)) {
      replaceAll(data);
      notify('导入成功');
      go('home');
    }
  };
  reader.readAsText(f);
  e.target.value = '';
}

function doWipe() {
  if (confirm('确定清空所有订单、余额和省钱账本?此操作不可恢复。')) {
    wipeAll();
    go('home');
  }
}
</script>

<template>
  <div class="nav">
    <button v-if="store.draft" class="back" aria-label="返回订单" @click="go('confirm')">‹</button>
    <div v-else style="width:40px"></div>
    <div class="title">我的</div>
    <div style="width:40px"></div>
  </div>

  <div class="ledger">
    <div class="lab">已为你拦截</div>
    <div class="amt"><small>¥</small>{{ money(savings.banked) }}</div>
    <div class="pend">
      <span>冷静期验证中 ¥{{ money(savings.pending) }}</span>
      <span>累计消费 ¥{{ money(spentAll) }}</span>
    </div>
  </div>

  <div class="sethd">钱包(虚拟,兼作消费额度)</div>
  <div class="sheet">
    <div class="frow">
      <label class="grow">余额
        <div class="sub" :class="{ od: store.settings.balance < 0 }">
          ¥{{ money(store.settings.balance) }}<template v-if="store.settings.balance < 0">(已透支)</template>
        </div>
      </label>
      <button class="mini" @click="doRecharge">充值</button>
    </div>
    <div v-for="p in store.settings.payMethods" :key="p.id" class="frow">
      <label class="grow">{{ p.name }}<div class="sub">展示用,支付统一扣余额</div></label>
      <button class="mini danger" @click="removePayMethod(p.id)">删除</button>
    </div>
    <div class="frow"><button @click="doAddCard">＋ 添加银行卡(虚构)</button></div>
  </div>

  <div class="sethd">收货地址(只存本机,用来让确认订单页更像真的)</div>
  <div class="sheet">
    <div class="frow"><label>收货人</label><input v-model="name" placeholder="姓名" /></div>
    <div class="frow"><label>手机号</label><input v-model="phone" placeholder="手机号" /></div>
    <div class="frow"><label>地址</label><input v-model="addr" placeholder="省市区 + 详细地址" /></div>
  </div>

  <div class="sethd">测试</div>
  <div class="sheet">
    <div class="frow">
      <label class="grow">演示模式
        <div class="sub">新订单物流按“分钟”走完,方便体验全流程</div>
      </label>
      <div class="switch" :class="{ on: demo }" role="switch" :aria-checked="demo" @click="demo = !demo"></div>
    </div>
  </div>

  <div class="sethd">数据备份(订单/余额/账本,不含截图)</div>
  <div class="sheet">
    <div class="frow"><button @click="doExport">导出数据到文件</button></div>
    <div class="frow" style="position:relative">
      <button>从文件导入(覆盖当前)</button>
      <input type="file" accept="application/json,.json" style="position:absolute;inset:0;opacity:0" @change="doImport" />
    </div>
  </div>

  <div class="sheet">
    <div class="frow"><button class="danger" @click="doWipe">清空全部数据</button></div>
  </div>

  <button class="cta green" @click="submit">保存</button>
</template>
