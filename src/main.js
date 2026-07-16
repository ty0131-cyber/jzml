import { createApp } from 'vue';
import App from './App.vue';
import { initStore } from './store/useStore.js';
import './styles/global.css';

/* ---------- 全局错误兜底:任何未捕获异常都显示红条,而不是无声白屏 ---------- */
function showError(msg) {
  let bar = document.getElementById('errbar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'errbar';
    bar.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;' +
      'font-size:12px;padding:8px 12px;font-family:monospace;word-break:break-all';
    bar.onclick = () => bar.remove();
    document.body.appendChild(bar);
  }
  bar.textContent = '⚠ ' + msg + '(点击关闭)';
}
window.addEventListener('error', (e) => showError(e.message));
window.addEventListener('unhandledrejection', (e) => showError(String(e.reason)));

/* ---------- 调试面板:网址加 ?debug 启用 vConsole(本地打包,动态加载) ---------- */
if (location.search.includes('debug')) {
  import('vconsole').then((m) => new m.default()).catch((e) => console.error('vConsole 加载失败', e));
}

initStore();

const app = createApp(App);
app.config.errorHandler = (err) => {
  console.error(err);
  showError(err && err.message ? err.message : String(err));
};
app.mount('#app');
