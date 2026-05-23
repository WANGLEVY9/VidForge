# VidForge - 电商场景AIGC带货视频生成系统

面向TikTok Shop等跨境电商商家的AIGC带货视频生成全链路系统，基于React、Node.js、TypeScript技术栈，对接火山引擎OpenAPI与开源大模型能力，实现素材管理、剧本智能生成、视频一键创作全流程自动化，支持商家快速生成符合平台规则、高转化潜力的带货短视频。

## ✨ 功能特性

### 核心功能
- 📁 **素材管理**：支持图片、视频、音频多类型素材上传，自动结构化处理与标签提取，支持关键词搜索
- 📝 **智能剧本生成**：输入商品信息，自动生成包含完整分镜、台词、BGM的带货剧本，支持8种视频风格选择
- 🎬 **视频一键创作**：基于剧本自动合成短视频，支持多分辨率、多格式导出，异步队列处理长耗时任务
- ⏱️ **实时进度追踪**：视频生成过程实时展示进度，支持失败重试、断点续传
- 📱 **多端适配**：响应式设计，完美适配PC端和移动端
- 🔍 **数据看板**：视频效果分析、转化数据统计、模板效果对比（开发中）

### 技术栈
| 技术域 | 选型方案 |
|--------|----------|
| 前端 | React 18 + TypeScript + Vite + Ant Design |
| 后端 | NestJS + TypeScript + PostgreSQL + Redis |
| 媒体处理 | FFmpeg + BullMQ 异步任务队列 |
| AI能力 | 火山引擎OpenAPI（文生图、文生视频、TTS、内容审核） + 开源大模型 |
| 存储 | 对象存储（OSS） + 向量数据库（Milvus） |
| 部署 | Docker + Kubernetes + GPU弹性调度 |

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- PostgreSQL >= 14.0
- Redis >= 7.0
- FFmpeg >= 5.0

### 安装依赖
```bash
# 安装所有依赖
pnpm install
```

### 配置环境变量
复制 `apps/backend/.env` 并填写真实配置信息：
```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/vidforge
# Redis配置
REDIS_URL=redis://localhost:6379
# JWT配置
JWT_SECRET=your_jwt_secret_key
# 火山引擎配置
VOLC_ENGINE_ACCESS_KEY=your_access_key
VOLC_ENGINE_SECRET_KEY=your_secret_key
# OSS配置
OSS_ACCESS_KEY=your_oss_access_key
OSS_SECRET_KEY=your_oss_secret_key
```

### 启动开发环境
```bash
# 启动前端开发服务（端口3000）
pnpm --filter=@vidforge/frontend dev

# 启动后端开发服务（端口3001）
pnpm --filter=@vidforge/backend start:dev

# 或者同时启动前后端
pnpm dev
```

### 访问地址
- 前端页面：http://localhost:3000
- 后端API：http://localhost:3001/api
- Swagger文档：http://localhost:3001/api/docs

## 📁 项目结构
```
├── apps
│   ├── frontend          # 前端应用
│   │   ├── src
│   │   │   ├── api       # API接口定义
│   │   │   ├── components # 公共组件
│   │   │   ├── pages     # 页面组件
│   │   │   ├── types     # TypeScript类型定义
│   │   │   └── utils     # 工具函数
│   └── backend           # 后端应用
│       ├── src
│       │   ├── modules   # 业务模块
│       │   │   ├── material # 素材模块
│       │   │   ├── script   # 剧本模块
│       │   │   ├── creation # 视频创作模块
│       │   │   ├── common   # 公共模块
│       │   │   └── auth     # 鉴权模块
│       │   └── main.ts   # 应用入口
├── packages              # 公共包
│   └── common            # 跨端通用类型、工具函数
├── docs                  # 项目文档
└── package.json
```

## 📖 使用流程

### 1. 上传素材
进入「素材管理」页面，上传商品主图、视频、参考素材等，系统会自动进行格式校验和结构化处理。

### 2. 生成剧本
进入「剧本生成」页面，输入商品名称、核心卖点、目标人群、使用场景等信息，选择视频风格，点击生成即可自动生成完整的带货剧本，包含多分镜脚本。

### 3. 创建视频任务
进入「视频创作」页面，点击「生成视频」，选择要使用的剧本、分辨率、视频比例、导出格式，提交后系统会自动开始视频生成。

### 4. 查看进度与导出
任务创建后可实时查看生成进度，生成完成后支持在线预览和下载导出。

## 🔧 构建部署
```bash
# 构建前端
pnpm --filter=@vidforge/frontend build

# 构建后端
pnpm --filter=@vidforge/backend build

# 生产环境启动
pnpm --filter=@vidforge/backend start:prod
```

## 🤝 开发规范
- 代码提交前必须通过ESLint、Prettier校验
- 遵循Conventional Commits提交规范
- 接口变更必须更新Swagger文档
- 新增功能必须补充对应的测试用例

## 📄 相关文档
- [技术实现规划](./docs/电商场景AIGC带货视频生成系统实现规划.md)
- [占位符记录](./docs/占位符记录.md)
- [项目记忆文档](./docs/项目记忆.md)
- [架构说明文档](./docs/架构说明.md)

## 📄 许可证
MIT License

## 🤝 贡献
欢迎提交Issue和Pull Request！
