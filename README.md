# 童课

个人使用的儿童培训课程管理 PWA。手机优先、纯本地存储（IndexedDB）、离线可用、无登录无后端。

**核心价值：5 秒内记录一节课，随时知道每门课还剩几节。**

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS 4 · Dexie (IndexedDB) · PWA (vite-plugin-pwa)

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 类型检查 + 打包到 dist/
npm run preview    # 预览打包产物
npm test           # 单元测试（vitest）
```

开发模式下可在「我的 → 关于」页面点「填充演示数据」生成示例数据。

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库，推送代码到 `main` 分支（仓库需开启 Pages 权限，工作流会自动配置）
2. 仓库 Settings → Pages → Source 选 **GitHub Actions**
3. 每次推送 `main` 自动构建部署

由于 `base: './'` 为相对路径，也可把 `dist/` 部署到任何静态托管（Cloudflare Pages、Vercel 等）。

## iPhone 使用

1. Safari 打开部署地址
2. 分享 → **添加到主屏幕**
3. 桌面出现「童课」图标，点击后以 App 模式（standalone）全屏运行，支持完全离线

> ⚠️ 数据安全：数据只存在本机浏览器 IndexedDB 中。**未安装到主屏幕**时，Safari 可能因长期不访问清理站点数据。请定期在「我的 → 数据备份」导出 JSON 备份，并安装到主屏幕。

## 目录结构

```
src/
├── components/   # ui 基础组件 + 业务组件（course/record/child/layout）
├── pages/        # 页面（5 Tab + 子页面）
├── db/           # Dexie schema + 演示数据
├── services/     # 业务规则与事务（课程/记录/备份/提醒）
├── hooks/        # 全局状态与 live query
├── types/        # 数据模型
├── utils/        # 日期（字符串运算，Safari 兼容）与统计
└── constants/    # 类别/色板/阈值等常量
```

## 数据一致性设计

- `ClassRecord` 是历史事实；`Course.usedLessons` 是可重建数据
- 所有记录写路径在 Dexie 事务内自动 `recalculateCourseUsage`
- 创建课程时录入的「已用课时」会生成一条初始记录，保证可追溯
- 「我的 → 数据备份 → 重新统计课程课时」可随时全量修复漂移
