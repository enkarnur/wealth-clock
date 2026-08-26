# 财富时钟

![CI](https://github.com/enkarnur/wealth-clock/actions/workflows/ci.yml/badge.svg)

一个给自己用、也适合放在桌面常驻的小工具：实时查看今天已经赚了多少钱，顺手记几笔支出，再看看这个月离存钱目标还有多远。

作者：**恩卡尔·努尔（[@enkarnur](https://github.com/enkarnur)）**

## 功能亮点

- **实时工资进度**：按照月薪或日薪、上下班时间、午休时间自动换算今天已赚金额
- **轻量记账**：快速记录每日支出，按月份汇总查看
- **存钱目标**：对比预计收入、累计支出与月度目标，直观看净结余进度
- **桌面友好**：支持背景图与置顶偏好，适合做成桌面小面板
- **安卓可安装**：新增 Android APK 打包能力，下载后可直接安装到手机
- **本地数据保存**：使用 SQLite 存储设置和账单记录

## 技术栈

- 前端：React + Vite + TypeScript + Arco Design
- 后端：Go + net/http
- 桌面封装：Wails v2
- 移动封装：Capacitor Android
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
go build ./app/server-go
```

### 4. 桌面版开发与构建

先安装 Wails CLI：

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.1
```

开发模式：

```bash
wails dev
```

本地桌面构建：

```bash
wails build -clean
```

桌面版会把数据默认存到当前用户系统配置目录下的 `wealth-clock` 目录中；如需自定义位置，可设置 `WEALTH_CLOCK_DATA_DIR`。

### 5. Android 开发与 APK 构建

先安装前端依赖并同步 Android 工程：

```bash
cd app/frontend
pnpm install
pnpm run android:sync
```

如需本地打开 Android 工程：

```bash
cd app/frontend
pnpm run android:open
```

说明：

- Android 版会复用现有 React 界面
- 手机端不依赖 Go 服务，设置与记账记录保存在当前手机本地存储中
- GitHub Actions 会自动构建可下载安装的 APK

## GitHub Actions

仓库已内置三套 GitHub Actions：

- `ci.yml`：前端测试与构建、后端多平台编译、基础冒烟检查
- `desktop-build.yml`：桌面版构建与发布
- `android-build.yml`：Android APK 构建与发布

桌面版工作流使用方式：

- **手动构建**：在 GitHub Actions 页面手动触发 `Desktop Build`
- **自动发布**：推送 tag（例如 `v0.1.0`）后，会自动构建 Windows / macOS / Linux 桌面产物并附加到 GitHub Release

Android 工作流使用方式：

- **手动构建**：在 GitHub Actions 页面手动触发 `Android Build`
- **自动发布**：推送 tag 后，会自动构建 `wealth-clock-android.apk` 并附加到 GitHub Release

给别人安装时，推荐直接发 GitHub Release 页面：

1. 创建并推送版本 tag，例如 `git tag v0.1.0 && git push origin v0.1.0`
2. 等待 `Desktop Build` 工作流完成
3. 在 Releases 页面下载对应平台产物
4. 把下载链接发给使用者安装

## 目录结构

```text
.github/workflows/       # CI、桌面构建与 Android APK 构建工作流
app/
├─ api/                 # API 说明
├─ dist/                # 前端构建产物（构建后生成）
├─ frontend/            # React 前端 + Capacitor Android 工程
│  ├─ android/          # Android 原生工程
│  ├─ src/
│  │  ├─ api/           # 前端请求封装与移动端本地数据适配
│  │  ├─ lib/           # 通用 hooks / 平台检测 / 桌面桥接
│  │  └─ pages/         # 首页与设置页
│  └─ capacitor.config.ts
└─ server-go/           # Web 模式下的 Go 服务与 SQLite 存储
build/                  # Wails 桌面打包资源
internal/backend/       # 桌面版复用的内嵌 API 服务
main.go                 # Wails 桌面入口
wails.json              # Wails 构建配置
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
