# 妙记工作台 · 介绍页

这是 GitHub Pages 站点的源文件。纯静态，没有构建步骤，也没有外部字体和运行时依赖。

## 本地预览

```sh
cd docs
python3 -m http.server 8765
```

打开 <http://127.0.0.1:8765/>。深色模式由右上角的月亮按钮切换，选择会记在 `localStorage`。

## 发布

两种都行，推荐第一种：站点跟代码留在同一个分支，改版时不用维护第二条分支。

**A. 合并回 `main`（推荐）**

1. 把 `site` 合并回 `main`；
2. Settings → Pages → Build and deployment；
3. Source 选 **Deploy from a branch**，Branch 选 **main**，目录选 **/docs**；
4. 等一分钟，站点地址：<https://xianglifei.github.io/dsh-lark-minutes-dashboard/>。

**B. 站点独立在 `site` 分支**

不合并，Pages 里 Branch 选 **site**、目录选 **/docs**。以后页面改动只推 `site`。

两种方式 URL 相同，都只在第一次发布时点一次设置；之后推送 `docs/` 就会自动更新。

## 文件

| 文件 | 作用 |
|---|---|
| `index.html` | 页面结构、中文文案、内联 SVG 图标 |
| `style.css` | 与插件同一套视觉：近白底、14px 圆角浮卡、只在首屏产品图周围保留 22px 点阵点缀、深浅色 |
| `app.js` | 主题切换、吸顶导航、入场动画、复制命令 |
| `assets/workbench-light.png` | 浅色界面截图（来自 `assets/ui-0.5.0.png`） |
| `assets/workbench-dark.png` | 深色界面截图（本地设计记录） |
| `og.png` | 1200×630 社交分享图 |

## 维护提示

- 版本号写在 `index.html` 的 hero eyebrow（`v0.6.0`）、页脚和 JSON-LD 里，发版时一起改。
- 安装命令、默认配置和「已知限制」都来自仓库 README；改默认值后记得同步这两处。
- 截图更新时替换 `docs/assets/` 下的两张图，保持原始比例即可，卡片会自动缩放。
- 页面底色是 `#ffffff`；点阵只出现在首屏产品图的 `::before` 光环里。想彻底去掉，删掉 `.hero-figure::before` 即可。
- 不需要 Jekyll，`.nojekyll` 已就位。
