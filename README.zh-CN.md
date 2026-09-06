# SVG Drawing Player

**让 SVG 画面与完整源码并排展开。** 在浏览器本地运行的绘制播放器，采用暖白网格、砖红进度条与可调整宽度的双栏界面。

[English](README.md)

## 本地运行

安装 Node.js 22.12+ 或 24+，在本目录执行：

```sh
npm ci
npm run dev
```

打开终端给出的本地网址，拖入一份 SVG，或点击“体验建筑示例”。导入后自动开始约 60 秒的演示。文件不上传，不使用账号、统计服务或在线字体。

## 功能

- 快速演示：30／60／120 秒，密集小元素按顺序成批渐进出现；完整逐笔：每个对象独立分配时间。
- 播放、暂停、重播、逐元素前后查看、进度拖动、0.25×—16× 倍速。调速不改变时间轴刻度，单独显示预计剩余时间。
- 完整源码按当前元素／批次逐字符点亮，与暂停、调速、回拖保持同步。手动滚动后暂停跟随，点击“回到当前步骤”恢复。只渲染可见行，适合复杂 SVG。
- 默认镜头按章节完整边界和实际画布比例居中取景，每侧留约 10% 边距。头发、包等小章节可以超过原来的 2.6 倍放大，极小几何保留 20 倍保护上限。章节内保持固定；切换章节或调整画布尺寸时重新适配。可切换全览视角，手动缩放和平移后停止跟随。
- 下方尚未绘制的源码统一淡化，已绘制部分保持明亮；完成时全部点亮，回拖时恢复相应淡色状态。页头使用 Azur. 标识和紧凑标题，移除副标题。
- 全览小窗显示完整成稿及当前取景框，可关闭或重新开启。章节默认显示为左侧半透明窄栏，支持开关，点击章节后保持显示；桌面画布为其留出空间，手机采用浮层。支持画布全屏、调整桌面双栏宽度、手机画面／代码标签切换。
- 播放中可实时调速，源码自动滚动不会关闭选择菜单。选择器支持鼠标、方向键和 Escape。标题优先使用 Helvetica 系列字体，关键文字放大，灰色面板区分窗口层级。
- 空格播放暂停，左右键逐笔查看；聚焦控件或弹窗时不抢占快捷键。切到后台自动暂停。
- 中英文切换，只在本地存储语言偏好。

演示根据 SVG 成稿及其元素顺序重建，**不是 AI 或作者真实编辑历史的录像**。下载不包含临时描边、笔尖或当前镜头变换。

## 兼容性与安全处理

通过浏览器原生几何接口支持相对路径、圆弧、多子路径、基础形状、嵌套分组、变换、渐变和裁切。文字、内嵌 PNG/JPEG/GIF/WebP 与普通复杂效果淡入；普通的整体合成分组作为一个播放单元。带有 `data-trace-chapter`、`data-trace-order` 和 `data-trace-role="fill|stroke"` 标记的 trace-contract SVG，即使路径位于整体滤镜或仅透明度分组内，也会继续逐路径播放；`data-trace-role="static"` 与 `data-trace-exclude="true"` 的元素不会进入时间轴。defs 内的定义不会被重复计为绘制对象。

DOMPurify 处理标记，CSS 语法树白名单处理样式，带限制策略的沙箱 iframe 隔离画布。移除脚本、事件、foreignObject、SVG 内置动画、feImage、外链及远程字体。导入提示说明规范化或降级；代码和下载文件均为相同的处理后版本，不承诺对依赖外部资源的输入保持原貌。

镜头切换采用约 650 毫秒平滑过渡；系统开启“减少动态效果”时即时取景。系统字体可能与原作者环境不同。多子路径使用原生描边，会同时展开子轮廓，不模拟轮廓之间的抬笔移动。

限制为 10 MiB、20,000 个 XML 元素，并限制引用深度与展开数量。拒绝 DTD、实体声明和循环 use 引用。高复杂度滤镜在低性能设备上仍可能较慢。

## 构建与上线

```sh
npm run build
npm run preview
```

将 `dist/` 上传到静态托管服务即可，资源使用相对路径，支持 GitHub 仓库子路径。请通过 HTTP 服务访问，不能直接双击开发用 HTML。

### Cloudflare Pages

推荐使用 Cloudflare Pages 部署这个静态 Vite 网站。使用 Git 集成连接 GitHub 仓库后，填写：

| 配置项 | 值 |
| --- | --- |
| 生产分支 | `main` |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 根目录 | 仓库根目录 |

如果要本地或通过 CI 直接上传，先在 Cloudflare 创建 Pages 项目，再执行：

```sh
npm ci
npm run deploy:cloudflare -- --project-name=svg-drawing-player
```

仓库中的 `.github/workflows/cloudflare-pages.yml` 会构建 Pull Request；当仓库配置了 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID` 两个 Actions Secret 时，推送到 `main` 会自动部署。API Token 需要 Account → Cloudflare Pages → Edit 权限。如果 Pages 项目名称不是 `svg-drawing-player`，可以设置仓库变量 `CLOUDFLARE_PAGES_PROJECT`。生产环境请选择 Git 集成或直接上传工作流中的一种，避免重复部署。

GitHub Pages：将**本文件夹中的内容作为新仓库根目录**，默认分支使用 `main`，在 Settings → Pages 中选择 GitHub Actions。附带工作流会在 PR 上测试构建，在 main 更新时部署。仓库创建和实际发布需要自行配置目标仓库；本实现未进行远程发布。

## 测试与源码组织

```sh
npx playwright install chromium
npm test
npm run test:production
```

也可以设置 `CHROME_PATH` 使用本机 Chrome。测试覆盖导入、安全处理、回放一致性、元素去重、交互、中英文与响应式布局。若本机存在 `../svg-reconstruction/building.svg`，自动增加复杂建筑回归测试；该文件不会进入公开构建。

代码按导入解析、时间轴播放器、虚拟源码视图、界面与镜头状态分开。播放器统一提供 load／play／pause／seek／step／jump／restart／setSpeed／configure，通过 change 事件更新界面。仅开发模式启用测试接口。

## 开源许可

版本记录见 [CHANGELOG](CHANGELOG.md)。Git 保留 v1.0.0 基线与 v1.1.0 升级标签。后续更新按 [维护规则](AGENTS.md) 执行：更新版本号、完成验证、记录变更、提交并打标签；远程发布单独处理。

代码采用 [MIT](LICENSE)。新绘制的内置简洁建筑示例采用 [CC0](public/examples/LICENSE.txt)。旧项目中的建筑不是本次发行素材，公开加入之前应确认授权。用户导入文件的权利归原权利人所有。仓库按公开开源发布；不要提交 Cloudflare Token、账号凭据或私有 SVG 文件。
