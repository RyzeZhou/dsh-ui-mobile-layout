# DSH Mobile UI Layout

[![License: MIT](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/RyzeZhou/dsh-ui-mobile-layout?style=flat&logo=github&label=stars)](https://github.com/RyzeZhou/dsh-ui-mobile-layout/stargazers)

[English](https://github.com/RyzeZhou/dsh-ui-mobile-layout/blob/main/README.en.md)

让 DeepSeek Harness 在手机上真正能用：窄视口下把桌面三栏重排为单栏 + 左侧抽屉，
并把官方设置面板改造成**手机原生两层导航**——点设置进入全屏条目列表 → 点条目进入
该条目设置页 → 每级左上角左箭头返回。桌面宽屏完全不受影响。

[能做什么](#能做什么) · [准备](#准备) · [安装](#安装) · [使用](#使用) ·
[注意事项与插件冲突](#注意事项与插件冲突) · [更新与卸载](#更新与卸载) · [原理](#原理)

如果它帮到了你，欢迎在 [GitHub 仓库](https://github.com/RyzeZhou/dsh-ui-mobile-layout)右上角点一下 **Star**。

## 能做什么

- **手机单栏布局**：`<768px` 时导航栏收为左侧抽屉（`left` 位移，非 `transform`），
  对话区占满整屏，不用在三列间左右横跳；
- **手机原生设置界面**：设置面板全屏化，呈现"设置 → 条目列表 → 具体设置页"的
  二级导航，完全符合手机原生设置习惯（iOS/Android 设置都长这样）；
- **标题跟随条目**：进入哪个设置项，顶部标题就显示哪个条目名；
- **详情页完全可交互**：条目里的开关、滑块全部原生可用（复用官方 React 渲染，不克隆）；
- **大触控目标**：顶部返回键、列表条目均为 ≥44px 触控区，适应手指操作；
- **安全区适配**：适配刘海屏/底部手势条的 `safe-area-inset`，全屏时内容不被遮挡。
- **桌面零回归**：`>767px` 桌面宽屏不注入任何移动样式，布局与原来完全一致。

## 准备

- DeepSeek Harness `0.1.0-rc.6` / `0.1.0-rc.7`（桌面版或官方 CLI 方式均可）；
- 建议先在独立测试实例验证，再应用到日常实例。

> 本插件的真实运行形态是 **client bundle 插件**（责任在浏览器端），并**不修改/替换**
> 官方任何 slot 的占用者——它只在窄视口下对 frame 外壳做样式重排、并为官方设置面板
> 叠加一个自有的全屏 overlay。桌面端不注册任何行为。

## 安装

### 手动安装（Windows，PowerShell）

把插件目录（或 tgz 解压后目录）放到目标实例的 profile `node_modules` 下，然后在
profile 的 `package.json` 登记依赖与 bundle，最后重启该实例：

```powershell
# dependencies 添加
#     "dsh-ui-mobile-layout": "file:./node_modules/dsh-ui-mobile-layout"
# dsh.profile.bundles 数组添加
#     "dsh-ui-mobile-layout"
```

重启使插件生效：

```powershell
restart-5070.ps1   # 或你惯用的重启脚本/方式
```

> 也可以用 `dsh plugin --profile web add dsh-ui-mobile-layout` 风格命令安装（由你所选
> DSH 版本的插件机制决定）。

### 交给 Agent 安装

把下面的说明直接发给 Agent：

```text
安装 dsh-ui-mobile-layout 插件到 DSH web profile：
1. 将包复制到 <profile>/node_modules/dsh-ui-mobile-layout
2. 在 profile package.json 的 dependencies 添加 "dsh-ui-mobile-layout": "file:./node_modules/dsh-ui-mobile-layout"
3. 在 dsh.profile.bundles 数组添加 "dsh-ui-mobile-layout"
4. 重启该实例并验证 HTTP 200 与插件在 boot graph 中
```

## 使用

安装重启后即自动生效，无需任何开关：

1. 用手机（或 DevTools 窄视口）打开 DSH；
2. 左侧抽屉：从屏幕左缘滑出（或点左上菜单按钮）；
3. 点左上角设置入口 → 全屏设置列表；
4. 点任意条目 → 进入该条目具体设置页（标题 = 条目名）；
5. 左箭头返回：详情 → 回到列表；列表 → 关闭设置。

## 注意事项与插件冲突

> **重要** —— 本插件在"基本功能"层面可用，但 DSH 是 PC 优先的 React 应用，
> 手机端适配存在边界。

- **已验证的插件环境**：本插件在自带官方基础插件（shell / ui-settings-general /
  ui-layout 等）的环境实测可用；在**该环境下**抽屉、两层设置导航、详情交互全部通过。
- **注意其他插件的冲突**：由于实现方式是对全局 frame 与官方设置面板做样式/行为叠加，
  若同时安装以下类型插件，**可能冲突、需要逐个验证**：
  - 也做**移动端**样式重排的插件（如社区 `dsh-ui-mobile` 类）——若它对 sidebar 施加
    `transform`，会困住 fixed 弹窗，需二选一或核对覆盖顺序；
  - 也**重写/替换官方设置面板**或 `role="dialog"` 结构的插件；
  - 使用**极高 `z-index` 全屏浮层**的插件（本插件 overlay 用 `z-index:2000`，若对方的
    弹层在其上方可能遮挡设置）。
  - 遇到冲突时：先在独立实例（如 5070 测试台）加载本插件 + 冲突插件做对照，确认后再
    应用到日常实例；本插件的抽屉用 `left` 位移而非 `transform`，这是避免 fixed 弹窗
    被困的关键约定，**请勿改回 transform**。
- **升级 DSH 需回归**：官方 SettingsRoot 的 nav/content/close 结构若变化，可能需要
  轻微适配（详情见仓库 `MOBILE-SETTINGS-FINAL.md`）。

## 更新与卸载

| 操作 | 方式 |
| --- | --- |
| 更新 | 用新版本替换 `node_modules/dsh-ui-mobile-layout` 目录后重启实例 |
| 卸载 | 复制/移动整个包目录一份留档 → 从 `package.json` 移除依赖与 bundle 条目 → 重启 |

## 原理

手机设置两层导航的核心思路（完整设计文档见仓库 `MOBILE-SETTINGS-FINAL.md`）：

```
窄视口 (<768px)
├─ frame 三列 → 单列
├─ sidebar → 左侧抽屉 (left 位移, transform:none 避免困住 fixed 弹窗)
├─ 官方 dialog 全屏 → "详情页"（原生活内容, 按钮滑块全可交互）
└─ 我们自建的 body 级 overlay → "设置列表页"
    ├─ top 栏（返回键 + 标题）
    ├─ 条目列表（自建按钮, 直接 addEventListener —— 唯一可靠事件机制）
    └─ detail 态: overlay 透明 + pointer-events:none, 露出官方活内容
```

为什么这样设计？因为在本环境里：
- `document` 级事件委托不可靠（点击到不了 document 层）；
- reparent / 向 React 管理的 dialog 插 DOM 会断 React 合成事件与调和；
- 克隆官方内容会得到无事件的静态快照。

所以：**我们的列表用自建元素直接绑 click，详情直接露出官方 React 活内容**——
两条路都不碰 React 树。

## 结构

```
lib/index.js       host 半（最小实现；本插件逻辑都在 client）
lib/client.js      client 半：CSS 注入 + overlay / 两层导航 / 行为层（样式唯一事实源）
mobile.css         与 client.js 内嵌 CSS 镜像（发布/阅读用，改布局两处要同步）
cordis.patch.yml   插件装载 patch
```

> 注意：`lib/client.js` 内嵌的 CSS 是实际运行时生效的样式，`mobile.css` 是为发布/阅读
> 同步的镜像。改动布局请两处一起改。

## License

MIT
