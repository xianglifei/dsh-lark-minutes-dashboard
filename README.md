# 妙记工作台（dsh-lark-minutes-dashboard）

DSH Web 插件。把手机录的飞书妙记变成「能看懂标题 + 完整会议纪要 + 飞书文档 + 索引表」。

- 面板位置：左侧栏底部面板图标（声波图标），面板名「妙记工作台」
- 收件箱：默认最新 10 篇（可切 20 / 50），60 秒轮询一次
- 每条妙记：一个「生成纪要」按钮 → 逐字稿 → LLM 生成标题/纪要 → 飞书文档 → 索引表加一行 → 标题写回
- 索引文档：`妙记工作台 · 索引`，表格维护 `妙记链接 ↔ 纪要文档`

## 界面

工作台按「收件箱 + 阅读器」组织，而不是一张平铺的列表：

- **最新 / 待整理 / 已整理 / 失败**：默认「最新」只看最新 N 篇；切到状态筛选会检索插件已发现的全部妙记。顶部搜索同样覆盖全部妙记（标题、结论、错误原因），快捷键 `⌘K` / `Ctrl+K`，列表里 `↑` `↓` 切换、`Esc` 清空。
- **列表行**：状态点、标题、交付标记、相对时间、一句话结论、时长。失败行直接露出原因。
- **详情阅读**：标题与元信息、交付状态、「一句话」结论卡片、分节纪要、待办（可勾选、本地记忆）、主题、逐字稿。
- **生成过程**：三步进度（读取逐字稿 → 生成标题与纪要 → 写入飞书文档与索引），处理中每 2.5 秒刷新真实阶段；可以切走，完成后自动更新。
- **失败不丢内容**：重新生成失败时保留上一次成功的纪要，只在上方提示原因，可重试。
- **逐字稿**：按发言人分块、彩色头像、时间戳，首次渲染 80 段，可继续展开或一键复制。
- **主题与尺寸**：颜色全部走 DSH 设计 token，自动跟随浅色 / 深色；面板宽度小于 700px 时自动切单栏并出现返回按钮。

## 安装（本地开发）

```sh
dsh --profile desktop plugin add link:/absolute/path/to/dsh-lark-minutes-dashboard
```

或者在 DSH 里用插件管理器安装该目录。装完刷新页面，左侧栏出现声波图标。

## 依赖

- `lark-cli` ≥ 1.0.99，且 user 身份已登录（`lark-cli auth status`）
- lark-cli 的 `--output-dir` / `@file` 只接受 **cwd 内的相对路径**（绝对路径会报 `--output must be a relative path within the current directory`）。插件把所有 lark-cli 调用的 `cwd` 设成 `/tmp/dsh-lark-minutes`，参数传相对路径（`transcripts`、`doc-xxx/doc.md`），本地读写再拼回绝对路径。

## 数据

- 本地库：`$DSH_HOME/lark-minutes/store.json`（记录、状态、索引文档 token）
- 逐字稿：`/tmp/dsh-lark-minutes/transcripts/`
- 待办勾选：浏览器 `localStorage`（`dsh-lark-minutes:todos:<token>`，只影响界面）
- 飞书侧：每条妙记一篇 `<标题> · 妙记纪要` 文档 + 一篇索引文档

## 接口（Host 半注册在 `/lark-minutes` 前缀下）

路由会先过 DSH 的 Host/Origin 与浏览器登录校验（`ctx.connection.requestRejection`），未登录、跨站或 DNS rebinding 的请求会被 401/403 拒绝；因此这些接口只供面板自身同源调用，终端 `curl` 不再能直接读。

```
GET  /lark-minutes/state                 认证状态、最后同步、索引文档
GET  /lark-minutes/list?size=10          列表（total + 各状态 counts）
GET  /lark-minutes/item?token=obcn...    详情（含逐字稿、model、updatedAt）
POST /lark-minutes/sync                  立即同步一次
POST /lark-minutes/process {token}       生成纪要（建/更新文档 + 索引 + 标题写回）
```

## 已知限制

- **发现范围是「最近 30 天 + 本地库历史」**：`+search` 不带时间范围时，返回结果既不是按时间排序、也不包含刚生成的最新妙记（要等通用索引刷新），所以同步固定按最近 30 天窗口查询（接口上限 1 个月），并按 `has_more` / `page_token` 翻页取全；列表顺序用搜索结果 `description` 里的「开始时间」当场解析，不依赖首屏顺序。
- 只发现**我拥有的**妙记（`--owner-ids me`）；别人拥有、我只是参与的妙记不会进列表。
- **事件通道不可用**：`minutes.minute.generated_v1` 被 lark-cli 的 console 预检误判拦截（用户身份事件不出现在 `app_versions.event_infos`，见 larksuite/cli#2833），因此改为 60 秒轮询。
- 标题写回前会先读远端当前标题：只有「原标题是默认名（新录音 N 等）」或「当前标题仍是上次我们写的那个」时才写回，用户在飞书里改过的名字不会被覆盖。
- DSH 退出或插件重载时，停在「读取逐字稿 / 生成纪要 / 写入文档」的记录会在下次启动时转成「处理失败」，可直接重试；不会永远转圈。
- 模型调用有总超时（`llmTimeoutMs`，默认 180 秒），超时会记为失败并保留上一次成功的正文。
- 重新生成会**覆盖**同一篇纪要文档，不会产生第二篇。
- 纪要用的是 DSH 当前默认模型（`agentDefaultModel`，含推理档位），可在设置里换模型。
- `GET /list` 的 `counts` 与 `GET /item` 的 `model` / `updatedAt` 是 v0.2 新增的 Host 字段；旧进程里没有这三个字段时，界面会自动退化为「按已拉取列表统计」并隐藏模型行，不影响使用。

## 结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半：轮询发现、调 lark-cli、LLM 总结、文档/索引维护、HTTP 路由 |
| `client.js` | Client 半：`sidebar.panellist` 图标 + `main` 面板；样式以受控 `<style>` 注入，全部使用 DSH token |
| `cordis.patch.yml` | 插件行与默认配置 |
| `locale/*.json` | 插件管理器里的标题与描述 |
