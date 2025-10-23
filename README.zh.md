# 画布协作 - 实时多人绘画板

一个实时协作绘画应用，允许多个用户同时在同一画布上绘画。采用 Vue 3、Vite、Node.js、Koa2 和 Socket.IO 构建，实现无缝的实时同步。

## 功能特性

- 实时多人协作绘画
- 绘画工具：画笔和橡皮擦
- 颜色选择器（包含预设颜色）
- 可调节的画笔和橡皮擦大小
- 绘画风格选择（实线、虚线、点线）
- 清空画布功能
- 保存和加载绘画
- 背景图片选择
- 响应式设计（桌面和移动模式）
- 全屏模式支持
- 实时用户数显示
- 基于 WebSocket 的实时同步 

## 技术栈

### 前端
- Vue 3 Composition API
- Vite 构建工具
- Socket.IO 客户端（实时通信）
- Canvas API（绘画）
- iconfont（图标）

### 后端
- Node.js 运行时
- Koa2 Web 框架
- Socket.IO（WebSocket 通信）
- CORS 跨域支持

## 项目结构

```
canvasSketch/
├── canvas/                          # 前端应用
│   ├── src/
│   │   ├── components/
│   │   │   ├── CanvasBoard.vue     # 主画板组件
│   │   │   └── CanvasBoard.css     # 画板样式
│   │   ├── utils/
│   │   │   ├── canvasDrawing.js    # 绘画工具函数
│   │   │   └── websocket.js        # WebSocket 客户端
│   │   ├── assets/
│   │   │   └── iconfont.css        # 图标字体
│   │   ├── App.vue                 # 根组件
│   │   └── main.js                 # 入口文件
│   ├── package.json
│   └── vite.config.js
│
└── server/                          # 后端应用
    ├── src/
    │   ├── app.js                  # Koa 应用入口
    │   ├── config.js               # 配置文件
    │   └── websocket.js            # WebSocket 服务器
    ├── package.json
    └── .env.example                # 环境变量示例
```

## 安装步骤

### 前置要求

- Node.js 14.0 或更高版本
- npm 或 yarn 包管理器

### 后端服务器安装

1. 进入服务器目录：
```bash
cd server
```

2. 安装依赖：
```bash
npm install
```

3. 启动服务器：
```bash
npm start
```

服务器将在 http://localhost:3000 启动

### 前端应用安装

1. 进入前端目录：
```bash
cd canvas
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

应用将在 http://localhost:5174 可用（如果 5173 被占用，将使用下一个可用端口）

## 使用说明

### 基本绘画

1. 在浏览器中打开应用
2. 从工具栏选择绘画工具（画笔或橡皮擦）
3. 使用颜色选择器选择颜色
4. 使用大小滑块调节画笔/橡皮擦大小
5. 在画布上点击并拖动进行绘画

### 多人协作

1. 在多个浏览器窗口或标签页中打开应用
2. 在一个窗口中开始绘画 - 绘画内容将实时显示在所有其他窗口中
3. 所有用户可以同时绘画
4. 在线用户数显示在状态指示器中

### 画布操作

- 清空画布：点击清空按钮移除所有绘画内容
- 保存绘画：点击保存按钮将画布下载为图片
- 加载背景：点击背景按钮添加背景图片
- 全屏模式：点击全屏按钮进入全屏绘画模式
- 手机模式：点击手机模式按钮切换到触摸友好的界面

### 绘画风格

从风格下拉菜单中选择不同的绘画风格：
- 实线：连续线条
- 虚线：虚线图案
- 点线：点线图案

## 开发说明

### 项目依赖

#### 前端
- vue: ^3.3.0
- socket.io-client: ^4.8.1
- vite: ^5.0.0

#### 后端
- koa: ^2.14.0
- @koa/cors: ^5.0.0
- socket.io: ^4.8.1

### WebSocket 事件

应用使用以下 WebSocket 事件进行实时同步：

- `draw:stroke`: 发送/接收绘画笔画数据
- `draw:clear`: 清空所有客户端的画布
- `user:join`: 用户加入会话
- `user:leave`: 用户离开会话
- `user:count`: 更新在线用户数
- `sync:request`: 请求画布状态同步
- `sync:state`: 接收画布状态

### CORS 配置

后端配置为接受来自以下地址的请求：
- http://localhost:5173
- http://localhost:5174

如需修改，请编辑 `server/src/config.js` 中的 CORS 设置。

## 浏览器支持

- Chrome/Chromium（最新版本）
- Firefox（最新版本）
- Safari（最新版本）
- Edge（最新版本）

## 性能考虑

- 应用针对最多 10 个并发用户进行了优化
- 绘画数据以最小延迟实时传输
- 新用户加入时自动同步画布状态
- 连接丢失时自动重新连接

## 故障排查

### WebSocket 连接失败
- 确保后端服务器在端口 3000 上运行
- 检查防火墙设置以允许端口 3000
- 验证 server/src/config.js 中的 CORS 配置

### 绘画不同步
- 检查浏览器控制台是否有错误
- 验证状态指示器中的 WebSocket 连接状态
- 刷新页面后重试

### 端口已被占用
- 前端将自动尝试下一个可用端口
- 要使用特定端口，请修改 vite.config.js

## 许可证

本项目是开源项目，采用 MIT 许可证。

## 贡献

欢迎贡献！请随时提交拉取请求或为错误和功能请求开启问题。

