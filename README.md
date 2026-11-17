<p align="center">
  <img width="450" height="120" align="center" src=".github/logo.svg">
  <br>
  <div align="center">
    <img alt="Visitor Badge" src="https://api.visitorbadge.io/api/visitors?path=https://github.com/Ralex91/Razzia/edit/main/README.md&countColor=%23FF9900">
    <img src="https://img.shields.io/docker/pulls/ralex91/razzia?style=for-the-badge&color=FF9900" alt="Docker Pulls">
  </div>
</p>

## 中文课堂定制版

本仓库由 [HoraceLuBFA](https://github.com/HoraceLuBFA) 维护，基于 [Ralex91/Razzia](https://github.com/Ralex91/Razzia) **4.1.0** 定制，保留原版功能、项目历史和 MIT 许可证。当前开发、拉取、推送与问题反馈以 **[HoraceLuBFA/Razzia](https://github.com/HoraceLuBFA/Razzia)** 为主仓库，默认分支为 `main`。下方继续保留公版项目介绍、截图与使用说明。

### 本 Fork 已完成的功能

| 功能           | 当前行为                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 简体中文       | 管理后台、学生入场、答题、揭晓、排名、题库编辑、媒体库、错误提示和成绩分析共 272 条中文文案；支持 `zh-CN` 识别、手动切换及刷新保存 |
| 主持端名单     | 学生提前加入、增删与重连时，主持大厅使用同一份共享名单更新人数和昵称                                                               |
| 图片加载       | 默认背景改为 WebP 并预加载，体积从约 2.78 MB 减至 88 KB；课堂配图采用 WebP，保持原始像素尺寸                                       |
| 色彩题         | 红、蓝、黄、绿选项按内容配色，主持端、参与端、答案揭晓、历史记录和编辑器共用配色；黄色选项使用黑字                                 |
| 个人成绩       | 最终排名、总分、正确率、答对／答错／未答题数、已答题数与完成率；支持搜索和排序                                                     |
| 整场与逐题分析 | 人数、题数、平均正确率、平均分、最高分及逐题正确率；点击题目进入对应详情                                                           |
| CSV 导出       | 导出完整名单，使用 UTF-8 BOM、CSV 引号转义和公式前缀保护；中文模式导出中文表头                                                     |
| 同名参与者     | 新场次按稳定参与者 ID 关联答案；旧同名记录保留排名与得分，并标记答题统计待区分                                                     |
| 中文课堂题库   | 五题基线范本及“导论 Quiz 20261117”十题范本；滤色片题作答 60 秒、附压缩配图，末题双倍分值                                           |

正确率按“答对题数 ÷ 本场总题数”计算，完成率按“已答题数 ÷ 本场总题数”计算。最终排名和总分读取保存成绩，保留答题速度与题目分值的影响。问卷场次展示参与和完成情况。

### 运行本 Fork

本 Fork 使用 **Node.js 26** 和 **pnpm 11.28.7**，依赖版本以 `package.json` 与锁文件为准。

```bash
git clone https://github.com/HoraceLuBFA/Razzia.git
cd Razzia
pnpm install --frozen-lockfile
cp .env.example .env
```

编辑 `.env`，设置管理密码 `MANAGER_PASSWORD`，并为 `JWT_SECRET` 填入固定的随机值。可通过 `openssl rand -hex 32` 生成会话密钥，然后运行：

```bash
pnpm dev
```

教师入口为 <http://localhost:3000/manager>，学生入口为 <http://localhost:3000/>。使用手机时，主持端和参与端都打开本机当前局域网地址，主持大厅二维码会使用该网页地址生成。生产运行可执行 `pnpm build` 后再执行 `pnpm start`。

本 Fork 的 Docker 构建使用 [compose.fork.yml](compose.fork.yml) 覆盖公版镜像配置，从当前检出的源码构建：

```bash
docker compose -f compose.yml -f compose.fork.yml up -d --build
```

下方公版说明中的 Docker Hub 与 GHCR 镜像提供原版 Razzia。使用上述源码构建命令可获得本 Fork 的中文、成绩分析及课堂定制功能。现有腾讯云部署配置保存在 [deploy/](deploy/)，其中域名、端口、静态资源和服务端发布目录对应既有现场，迁移时按目标环境配置。

### 使用课堂题库

[五题中文范本](docs/examples/classroom-baseline.zh.json) 用于验证答对、答错、超时、中文长文本和最终排名。[十题导论题库](docs/quizzes/intro-quiz-20241022.json) 的显示标题为“导论 Quiz 20261117”，内部 ID 保留来源标识。为新环境准备十题及配图时，可在启动服务前执行：

```bash
mkdir -p config/quizz config/media
cp docs/quizzes/intro-quiz-20241022.json config/quizz/
cp docs/quizzes/media/*.webp config/media/
```

题库也可通过“题库管理 → 导入题库 JSON”导入，图片放入运行目录 `config/media/` 后即可按题库中的 `/media/` 路径加载。图片内容更新时使用新文件名，便于长期缓存更新。题目、选项、正确答案、计时与配图来源见 [来源清单](docs/quizzes/intro-quiz-20241022.source.json)；第 2 题图片在原资料中标注署名为 Jose A. Bernat Bacete/Moment/Getty Images。代码沿用 MIT 许可证，课堂素材的来源与署名按清单保留。

### 验证与维护

当前定制已通过 **237 项单元／集成测试、56 项 Playwright 浏览器测试**，覆盖中文切换、多个参与者、答题与排名、旧成绩兼容、同名参与者、CSV 和颜色选项。线上另核对过 30 人、10 道题的历史成绩与中文导出，以及桌面和 390 × 844 手机视口。新环境可执行：

```bash
pnpm lint
pnpm format
pnpm test
pnpm --filter @razzia/e2e exec playwright install chromium
pnpm test:e2e
```

浏览器测试自行启动 3000／3001 端口上的隔离服务，运行前保持这两个端口空闲。测试只使用隔离测试数据。运行凭据、学生成绩、上传媒体、私有发布清单及本地验收记录保存在 Git 忽略的本地目录中；仓库中的课堂配图为明确随范本提供的素材。

本地 `main` 跟踪 `origin/main`，`origin` 指向本 Fork，后续同步可使用：

```bash
git switch main
git pull --ff-only
# 完成修改、验证并提交后：
git push
```

原始公版远端保留为 `public-source`，用于按需对照和选择性合并。项目问题和功能请求提交至 [本 Fork Issues](https://github.com/HoraceLuBFA/Razzia/issues)，开发约定见 [贡献指南](.github/CONTRIBUTING.md)。

---

## 🧩 What is this project?

Razzia is a straightforward and open-source quiz platform, allowing users to host it on their own server for smaller events.

> **Disclaimer**: Razzia is an independent, open-source software project. It is not affiliated with, endorsed by, or sponsored by any third-party quiz platform or service. Any resemblance to other quiz platforms is purely incidental.

<p align="center">
  <img width="30%" src=".github/previews/1.png" alt="Login">
  <img width="30%" src=".github/previews/2.png" alt="Manager Room">
  <img width="30%" src=".github/previews/3.png" alt="Question Screen">
</p>

## 📖 Getting Started

### 🐳 Using Docker (Recommended)

Requires Docker and Docker Compose.

> The image is also available on GHCR: `ghcr.io/ralex91/razzia:latest`.

1. Create a `compose.yml`:

```yaml
services:
  razzia:
    image: ralex91/razzia:latest
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
    env_file:
      - .env
```

2. Create a `.env` next to it:

```bash
MANAGER_PASSWORD=your-password
```

3. Start it:

```bash
docker compose up -d
```

Open http://localhost:3000 to play and http://localhost:3000/manager to host a game.

Your quizzes and results are stored in `./config`, created on first run with an example quiz. Edit them from your host, they persist across updates.

<details>
<summary>Without Compose</summary>

```bash
docker run -d \
  -p 3000:3000 \
  -e MANAGER_PASSWORD=your-password \
  -v ./config:/app/config \
  ralex91/razzia:latest
```

</details>

### 🛠️ Without Docker

Requires Node.js 26 and [pnpm](https://pnpm.io/) 10.16+.

1. Clone and install:

```bash
git clone https://github.com/Ralex91/Razzia.git
cd Razzia
pnpm install
```

2. Create your `.env` and set `MANAGER_PASSWORD` in it. `WEB_PORT` (default `3000`) and `SOCKET_PORT` (default `3001`) are optional:

```bash
cp .env.example .env
```

3. Build and start:

```bash
pnpm build
pnpm start
```

Open http://localhost:3000 to play and http://localhost:3000/manager to host a game.

> Want to work on the code? See [CONTRIBUTING.md](.github/CONTRIBUTING.md) to run it in development mode.

## 📚 Documentation

- [Configuration](docs/configuration.md): environment variables and the `config` folder.
- [Quiz](docs/quiz.md): creating and structuring quizzes.
- [Branding](docs/branding.md): optional custom theming.
- [Reverse Proxy](docs/reverse-proxy.md): running behind Traefik, Nginx, Caddy, or another reverse proxy.
- [WebSocket Protocol](docs/websocket-protocol.md): build a custom client (e.g. an ESP32 physical buzzer).
- [HTTP API](docs/http-api.md): the `/api` surface — sessions, quiz and result CRUD, game creation.

Full index in [docs/](docs/README.md).

## 🎮 How to Play

1. Access the manager interface at http://localhost:3000/manager
2. Enter the manager password (defined by `MANAGER_PASSWORD`)
3. Share the game URL (http://localhost:3000) and room code with participants
4. Wait for players to join
5. Click the start button to begin the game

## 📝 Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](.github/CONTRIBUTING.md) guide before submitting a pull request.

For bug reports or feature requests, please [create an issue](https://github.com/Ralex91/Razzia/issues).

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Ralex91/Razzia&type=date&logscale=&legend=bottom-right)](https://www.star-history.com/#Ralex91/Razzia&type=date&logscale=&legend=bottom-right)
