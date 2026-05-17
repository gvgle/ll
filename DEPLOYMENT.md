# 部署指南

## 本地运行

1. 安装依赖:
   ```bash
   npm install
   ```

2. 配置环境变量 (可选):
   - 如果需要使用 Gemini AI 功能,在 `.env.local` 中设置 `GEMINI_API_KEY`
   - 从 https://aistudio.google.com/apikey 获取 API 密钥

3. 启动开发服务器:
   ```bash
   npm run dev
   ```
   应用将运行在 http://localhost:3000

4. 构建生产版本:
   ```bash
   npm run build
   ```
   构建输出在 `dist/app/browser/` 目录

## 部署到静态托管

由于已禁用 SSR,此应用可以部署到任何静态托管服务:

### GitHub Pages

1. 构建应用:
   ```bash
   npm run build
   ```

2. 将 `dist/app/browser/` 目录内容推送到 `gh-pages` 分支

### Vercel / Netlify

1. 连接 GitHub 仓库
2. 设置构建命令: `npm run build`
3. 设置输出目录: `dist/app/browser`
4. 部署

## 技术栈

- Angular 21
- TypeScript
- Tailwind CSS
- Canvas API (游戏渲染)

## 修复记录

- **2026-05-17**: 禁用 SSR 以解决 Canvas API 构建错误
  - 移除了服务器端渲染配置
  - 应用现在作为纯客户端应用运行
