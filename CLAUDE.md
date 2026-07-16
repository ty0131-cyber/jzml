# 买了吗 — 项目说明(人 & AI 维护者必读)

## 这是什么

一个对抗冲动消费的个人工具:用户想剁手时,来这里"假装"完成一次购物——模拟下单、
支付动画、假物流、假签收,但不发生任何真实交易。签收 7 天后回访"还想要吗?",
选"不想要了"金额才计入省钱账本;选"还想要"则跳回真实商品链接购买。

每笔模拟支付从虚拟余额扣减(余额兼作消费额度,可透支以示警);「不想要了」时金额退回余额。

纯前端 PWA,无后端,所有数据存用户浏览器本地(localStorage + IndexedDB)。
OCR(Tesseract.js)与 vConsole 均为按需动态加载,不进首屏。

## 技术栈与命令

- Vue 3 (composition API, `<script setup>`) + Vite + Vitest
- `npm run dev` 本地开发(已配置 host,手机连同一WiFi可访问)
- `npm test` 跑单元测试 —— **任何改动后必须跑,全绿才能部署**
- `npm run build` 构建到 `dist/`,部署平台构建命令用它

## 目录职责(改代码前先确认改的是哪一层)

```
src/domain/     纯函数业务逻辑,禁止 import 任何浏览器API/DOM/Vue。
                logistics.js 物流里程碑与状态 | savings.js 账本规则 | wallet.js 钱包/额度
                parse.js OCR文本解析启发式 | format.js 格式化
src/store/      storage.js 是全项目唯一能碰 localStorage/IndexedDB 的文件
                migrations.js 数据结构版本迁移 | useStore.js 全局状态+所有业务动作
src/services/   外部能力抽象。ocr.js 是唯一OCR入口(当前Tesseract.js实现,可整体替换)
src/views/      5个页面组件(home/create/confirm/detail/mine),保持"薄"
src/components/ 复用组件:PaySheet(支付,支付宝风格) OrderTimeline OrderCard NotiBanner TabBar
tests/          针对 domain 与 migrations 的单元测试
```

## ★ 数据契约(铁律,违反会毁掉用户的真实数据)

1. localStorage key 永远是 `jzml_v1`,不得更改
2. 订单对象已有字段(id/name/price/qty/shop/link/t0/m/courier/trackingNo/hub1/hub2/verdict
   /payMethod/shipFrom)的名称与含义不得修改,只允许新增字段;
   settings 字段:name/phone/addr/demo/balance/payMethods
3. 任何数据结构变更必须:`CURRENT_SCHEMA` +1,在 migrations.js 新增迁移函数,并补测试
4. IndexedDB 库名 `jzml`、store 名 `imgs`、以订单 id 为 key,不得更改

## 核心业务规则(改动前理解,改动时勿破坏)

- 物流里程碑在订单创建时**一次性生成**存入 `order.m`,之后一切状态由
  「当前时间 vs 里程碑」推导,不存在后台任务
- 真实模式冷静期 = 签收 + 7 天(`m.review === 0` 时);演示模式 `m.review` 直接给出
- 账本规则:只有 `verdict === 'saved'` 计入"已拦截";`null` 计入"验证中";`'want'` 不计入
- 钱包规则:支付一律扣虚拟余额(payMethod仅展示);`saved` 退回余额;删除订单不回溯余额
  (防止删单刷余额);"您已消费"按毛额统计,退回只体现在余额
- 物流时效参数依据国家邮政局2025年实测(全程51.22h,分环节7.88/31.45/8.8/3.09h),
  改动时保持数量级与出处注释
- 支付页为"支付宝风格"但不得加入支付宝logo/字样,必须保留"模拟支付"角标,
  真实感不得达到可截图冒充付款凭证的程度
- 运单号必须保留 `SIM` 前缀,快递公司名必须使用虚构名——本产品刻意不冒充真实
  支付机构/快递公司,支付页也不得模仿微信支付/支付宝的商标与配色

## 修改流程(AI 会话请遵守)

1. 读本文件 → 定位要改的层 → 只改该层
2. domain 层改动必须同步补/改测试
3. `npm test` 全绿 → commit(信息写清改了什么、为什么)→ push 到分支看预览
4. 手机上验证预览网址无误后再合并到主分支
5. 涉及数据结构的改动,在本文件"数据契约"处同步更新字段清单

## 多模型交叉复核（AI 协作协议）

1. 审 diff，不审全量 —— 复核时给另一模型的输入是 `git diff main..分支` + `CLAUDE.md`，不是整个项目。token 省一个量级，且 diff 自带版本锚点，从根上杜绝"审到旧文件"
2. 发现必须可定位、可验证 —— 复核方输出格式为「文件:行号 + 问题描述 + 验证方法」，无法给出行号的发现视为存疑
3. 执行方核实后再动手 —— 任何模型拿到审查报告，第一步是逐条 grep 核实与当前代码相符，两分钟避免反向修改（教训见 v2.1.1 vconsole 误报）

## 调试

- 网址加 `?debug` 参数启用 vConsole 手机调试面板
- 全局错误会在页面顶部显示红条(main.js),白屏时先看红条和 vConsole
