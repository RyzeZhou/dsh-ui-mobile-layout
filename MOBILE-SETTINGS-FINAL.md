# DSH 手机端原生设置界面 —— 最终设计文档与 18 版迭代复盘

> 项目：`dsh-ui-mobile-layout` 插件（bundle 形态）
> 目标（用户原话）：点设置→全屏显示设置列表→点条目进入具体设置项，每级左上角左箭头返回，顶部标题，设置项在标题下方。手机原生设置习惯。
> 结论：已达成，5070 测试台全链路通过。这是"基本功能"适配——DSH 本身是 PC 优先的 React 应用，手机端每接一个插件都可能出现新的层级/事件冲突，本方案通过"不动 React 树 + 自建 overlay + 官方活内容透明露出"把这个风险降到最低。

---

## 1. 一句话结论

**在 body 上自建一个全屏 overlay（top 栏 + 我们的条目列表）作为"设置首页"，点条目后用 CSS 把 overlay 变透明、露出官方 dialog 的原生活内容作为"详情页"；所有我们自己的按钮直接用 `addEventListener` 绑定（这是本环境唯一可靠的事件机制）。**

- 列表页 = 我们自己的 DOM（可靠点击）
- 详情页 = 官方 React 内容（按钮滑块全活）
- 返回 = 我们 overlay 自己切（详情→列表），列表→关闭走官方三路关闭

---

## 2. 最终架构

```
手机窄视口 (<768px)
├─ frame 三列 → 单列 ([data-mobile-layout])
├─ sidebar → 左侧抽屉 (left 位移，transform:none)
│
├─ 官方 dialog (永远 fullscreen fixed, z 1000)
│   ├─ nav 隐藏
│   └─ content (:last-child) 填满滚动 —— 这就是"详情页"
│
└─ 我们的 overlay (document.body 直挂, z 2000)
    ├─ [data-mobile-topbar] 返回键 + 标题
    ├─ [data-mobile-list]   我们渲染的条目按钮 (root 态显示)
    └─ data-screen=detail 时: background:transparent + pointer-events:none
       (只有 topbar 保持 pointer-events:auto) → 露出官方活内容
```

### 关键交互流程

| 动作 | 实现 |
|---|---|
| 打开设置 | `MutationObserver` 发现 `[role=dialog] nav` → `setupSettings()` 建 overlay + 渲染列表 |
| 点条目 | 我们按钮的原生 click → 官方对应 `navCell.click()`（React 切 active section）+ `setMode('detail')`（overlay 变透明） |
| 详情返回列表 | `setMode('root')`（overlay 恢复不透明显示列表） |
| 列表关闭 | `onBack()`：立即隐藏 overlay → 三路关官方（Escape→dialog、mask.click()、close.click()）→ dispose |
| 关闭后防重建 | `S.disposing=true` 800ms，`setupSettings` 开头 `if(S.disposing) return` |

---

## 3. 18 版迭代复盘（按时间线，含每个坑）

| 版本 | 做了什么 | 为什么失败/如何推进 |
|---|---|---|
| v7 | 官方面板全屏 + 双态 CSS（root 隐藏 content 显示 nav 列表 / detail 隐藏 nav 显示 content）+ 注入 topbar 进 dialog | 基础思路对，但"插 topbar 进 dialog""reparent""事件委托"三件事全踩雷 |
| v9 | reparent 官方 overlay 到 body host，绕开 sidebar transform | 全屏修好了（361x598 at(0,0)），但 React 树与真实 DOM 脱节 → **官方 nav 点击全断** |
| v12 | **放弃 reparent**，CSS `transform:none !important` 消灭 sidebar containing block | 全屏 + React 树完整；topbar 移出 dialog（避免 React 调和打乱 children） |
| v13 | "上列表下内容"单屏 | 能点击切换了，但不是两层；content 可能被 nav 撑成 0（`max-height` 修） |
| v14 | data-mobile-settings=root/detail 双态 + dialog 上事件委托 | topbar 插 dialog 又断；**往 dialog 内插 DOM = React children 调和错乱** |
| v15 | topbar 挂 `document.body` | dialog children 保持官方原样，但点击仍无效 |
| v16 | **document 级 capture 全局监听**（onNavCapture + 计数器） | 探针 `docClicks=0` 铁证：**document 级 capture 收不到任何点击**（事件被上层系统吃掉）。全局兜底监听在此环境不可用 |
| v17 | **自建 overlay + 所有按钮直接 `addEventListener`** | ✅ 条目能点动、detail 可见、返回可用（第一次真正贯通） |
| v18 | **去 clone**：detail 态 overlay 透明露出官方活内容 | ✅ 内容不再慢一拍、按钮滑块全活（不再克隆静态快照） |
| v18.4 | 闭包修复（标题全成"侧边卡片"）+ 三路关闭（返回点两次） | ✅ 标题跟随条目、返回一次关闭 |

---

## 4. 本环境（DSH 移动端插件）事件可靠性铁律

这些是 18 版调试积累的硬经验，任何 DSH 移动端插件都应遵守：

1. **`document.addEventListener('click', fn, true)` 全局 capture 在此环境不触发** —— 用计数器验证过 `docClicks=0`，点击事件在到达 document 前就被上层系统吃掉。
   → **只在自己的 body 级自建元素上直接 `addEventListener('click')`**（返回键、列表按钮都是这么工作的，100% 可靠）。
2. **绝不 reparent React 管理的节点**（如把官方 dialog/overlay 移到 body）——React 合成事件断裂，官方 nav 点击无反应。
   → 用 CSS 消灭 containing block（`transform:none !important`），让节点留在 React 树里。
3. **绝不往 React 管理的 dialog 内插入自己的 DOM**（topbar / 按钮）——React children 调和会打乱顺序，点击失效。
   → 自己的 UI 一律挂 `document.body`。
4. **MutationObserver 要监听 `attributes:true + attributeFilter`**，否则改 data-* 属性的状态切换不会触发你的回调/探针，造成"明明改了却像没改"的假阴性。
5. **for 循环闭包必须 IIFE 传参捕获**（`(function(idx, text){...})(j, lbl)`）——否则所有闭包共享循环最后的值（本项目标题全变"侧边卡片"就是这个 bug）。
6. **返回键要"一次生效"**：先立即隐藏 overlay（不等 observer），再 dispatch Escape 到 dialog 本身（React 委托在 root 容器，target=document 的事件不经 root 故不触发）+ mask.click() + close.click() 三路兜底，最后才 dispose；用 `disposing` 标记挡 observer 竞态重建。

---

## 5. 诊断方法论（复用之）

遇到"改了没效果/点击没反应"时，三件套探针一次定位，不再盲猜：

1. **版本指纹**：client.js 注入 `DML_REV`，探针 POST 回 host 读 diag —— 验证浏览器到底跑的是不是新 bundle（排除缓存/加载链问题）。
2. **document 点击计数器**：`document.addEventListener('click', fn, true)` 无条件 +1 —— 验证事件有没有到 document 层（本项目靠它确认了 `docClicks=0` 的真相）。
3. **环境探针**：`isTop` + `iframeCount` —— 排除 iframe 隔离（DSH 有 `dsh-pv-frame` 预览沙盒 iframe，但主 document 未被隔离）。

> 探针在最终发布版已移除；诊断期它是"唯一事实来源"，曾避免 16 版盲猜。

---

## 6. 已知边界（诚实声明）

- **这是"基本功能"适配，不是完美移动端**：DSH 是 PC 优先的 React 应用，深层的模态/弹层/拖拽/多选等交互在手机上可能仍需要每个插件各自的移动适配。
- **官方 dialog 结构若升级**（SettingsRoot 的 nav/content/close 类名变化）可能影响 overlay 的 `navCell.click()` 与关闭路径——需要回归。
- **只适配了官方设置面板 + stats 行 tap**；其他插件自己的弹层仍需逐个处理（这正是用户预判的"加上更多插件就很难说"）。

---

## 7. 文件清单

```
lib/index.js     host 半，最小实现（逻辑都在 client）
lib/client.js    client 半：CSS 注入 + overlay/两层导航/行为层（样式唯一事实源）
mobile.css       与 client.js 内嵌 CSS 镜像（发布/阅读用，改布局两处要同步）
cordis.patch.yml 插件装载 patch
README.md        给用户/发布看的功能与安装说明
package.json     exports: ./client 供 client half 装载
```
