# 买了吗

对抗冲动消费的模拟购物 PWA。详细架构与维护规则见 CLAUDE.md。

## 首次运行

```bash
npm install
npm run dev        # 终端会显示 Local 和 Network 两个地址
```

手机连同一 WiFi,浏览器打开 Network 那个地址即可真机调试。

## 测试与构建

```bash
npm test           # 单元测试,改完代码必跑
npm run build      # 产物在 dist/
```

## 部署(推荐流程)

1. 推到 GitHub 仓库
2. Cloudflare Pages → Create → 连接该仓库
   - 构建命令: `npm run build`
   - 输出目录: `dist`
3. 之后每次 push 自动部署;每个分支有独立预览网址

## 在线访问

https://maile-ma.pages.dev

## 数据说明

- 数据全存在浏览器本地,旧单文件版的数据(localStorage key `jzml_v1`)会被自动识别并继续使用
- 设置页提供导出/导入备份(不含截图)
- 请固定用同一浏览器访问,清浏览器数据前先导出备份
