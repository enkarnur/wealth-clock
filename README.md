# 财富时钟

![CI](https://github.com/enkarnur/wealth-clock/actions/workflows/ci.yml/badge.svg)

一个给自己用、也适合放在桌面常驻的小工具：实时查看今天已经赚了多少钱，顺手记几笔支出，再看看这个月离存钱目标还有多远。

作者：**恩卡尔·努尔（[@enkarnur](https://github.com/enkarnur)）**

## 功能亮点

- **实时工资进度**：按照月薪或日薪、上下班时间、午休时间自动换算今天已赚金额
- **轻量记账**：快速记录每日支出，按月份汇总查看
- **存钱目标**：对比预计收入、累计支出与月度目标，直观看净结余进度
- **桌面友好**：支持背景图与置顶偏好，适合做成桌面小面板
- **本地数据保存**：使用 SQLite 存储设置和账单记录

## 技术栈

- 前端：React + Vite + TypeScript + Arco Design
- 后端：Go + net/http
- 数据库：SQLite
- 接口说明：`app/api/api.yaml`

## 本地运行

### 1. 启动前端开发环境

```bash
cd app/frontend
pnpm install
pnpm dev
```

默认会将 `/api` 代理到 `http://127.0.0.1:3000`。

### 2. 启动后端

```bash
go run ./app/server-go
```

可用环境变量：

- `PORT`：服务端口，默认 `3000`
- `WEALTH_CLOCK_DATA_DIR`：SQLite 数据目录，默认 `./data`

### 3. 生产构建

前端：

```bash
cd app/frontend
pnpm install
pnpm run build
```

后端：

```bash
go build ./...
```

## GitHub Actions

仓库已内置 GitHub Actions 持续集成流程：

- 前端：安装依赖、运行 Vitest、执行生产构建
- 后端：在 Ubuntu / macOS / Windows 三个平台执行 `go build ./...`
- 冒烟检查：启动服务并验证 `/api/settings` 与首页 HTML 是否正常返回

工作流文件：`.github/workflows/ci.yml`

## 目录结构

```text
app/
├─ api/                 # API 说明
├─ dist/                # 前端构建产物（构建后生成）
├─ frontend/            # React 前端
│  └─ src/
│     ├─ api/           # 前端请求封装
│     ├─ lib/           # 通用 hooks / 提示工具
│     └─ pages/         # 首页与设置页
└─ server-go/           # Go 服务与 SQLite 存储
```

## 截图

- 首页截图：_待补充_
- 设置页截图：_待补充_

## API 简介

项目提供三组核心接口：

- `GET/PUT /api/settings`：读取与保存工资、工时、目标和背景设置
- `GET /api/dashboard`：读取当月预计收入、支出、净额和目标进度
- `GET/POST/DELETE /api/expenses`：查询、新增、删除支出记录

详细字段请参考：[app/api/api.yaml](app/api/api.yaml)

## License

[MIT](LICENSE)
