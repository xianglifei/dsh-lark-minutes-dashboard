/**
 * 妙记工作台 —— Host 半。
 *
 * 职责：发现妙记（60s 轮询）、拉逐字稿、调 LLM 生成标题与纪要、写飞书文档、
 * 维护索引文档、写回标题，并通过 HTTP 路由把数据交给 Client 半。
 */
import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const DEFAULTS = {
  pollIntervalSec: 60,
  listSize: 10,
  autoWriteTitle: true,
  createDocs: true,
  minTranscriptChars: 200,
  docTitleSuffix: ' · 妙记纪要',
  indexTitle: '妙记工作台 · 索引',
  model: '',
  provider: '',
  larkCliPath: '',
}

const DEFAULT_TITLE_PATTERNS = [
  /^新录音\s*\d*$/,
  /^未命名.*$/,
  /^new recording\s*\d*$/i,
  /^recording\s*\d*$/i,
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/,
]

function now() {
  return Date.now()
}

function clampText(value, max) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function readTitleFromSearchItem(item) {
  const display = String(item?.display_info ?? '')
  const first = display.split('\n')[0] ?? ''
  return first.trim()
}

function parseDurationFromDescription(description) {
  const match = /时长:\s*(\d+)\s*分(?:钟)?\s*(\d+)?\s*秒?/.exec(String(description ?? ''))
  if (!match) return 0
  return (Number(match[1]) * 60 + Number(match[2] ?? 0)) * 1000
}

function toIsoSeconds(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function escapeCell(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function apply(ctx, config = {}) {
  const settings = { ...DEFAULTS, ...(config ?? {}) }
  const dataDir = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'lark-minutes')
  const storePath = join(dataDir, 'store.json')
  // lark-cli 的 --output-dir / @file 只允许 cwd、/tmp、~/files 三处
  const workDir = '/tmp/dsh-lark-minutes'
  const transcriptDir = join(workDir, 'transcripts')
  mkdirSync(transcriptDir, { recursive: true })

  const cliPath = settings.larkCliPath
    || (existsSync('/opt/homebrew/bin/lark-cli') ? '/opt/homebrew/bin/lark-cli' : 'lark-cli')

  // ---------------------------------------------------------------- store

  let store = { items: {}, order: [], index: { token: '', url: '' }, lastSync: 0, lastError: null, auth: null }

  function loadStore() {
    try {
      if (existsSync(storePath)) {
        const parsed = JSON.parse(readFileSync(storePath, 'utf8'))
        store = { ...store, ...parsed, index: { token: '', url: '', ...(parsed.index ?? {}) } }
      }
    } catch (error) {
      console.error('[lark-minutes] 读取本地库失败，使用空库：', error?.message ?? error)
    }
  }

  let saveTimer = null
  function saveStore() {
    if (saveTimer) return
    saveTimer = setTimeout(() => {
      saveTimer = null
      try {
        mkdirSync(dirname(storePath), { recursive: true })
        const tmp = `${storePath}.${now()}.tmp`
        writeFileSync(tmp, JSON.stringify(store, null, 2))
        renameSync(tmp, storePath)
      } catch (error) {
        console.error('[lark-minutes] 写入本地库失败：', error?.message ?? error)
      }
    }, 150)
  }

  function listRecords() {
    const all = Object.values(store.items)
    all.sort((a, b) => (b.feishu?.createTime ?? 0) - (a.feishu?.createTime ?? 0))
    return all
  }

  function stageCounts(records) {
    const counts = { all: records.length, pending: 0, ready: 0, failed: 0, skipped: 0 }
    for (const record of records) {
      const stage = record.processing?.stage ?? 'discovered'
      if (stage === 'ready') counts.ready += 1
      else if (stage === 'failed') counts.failed += 1
      else if (stage === 'skipped') counts.skipped += 1
      else counts.pending += 1
    }
    return counts
  }

  function publicRecord(record) {
    return {
      token: record.token,
      title: record.generated?.title || record.feishu?.title || '(未命名)',
      originalTitle: record.original?.title || record.feishu?.title || '',
      oneLiner: record.generated?.oneLiner ?? '',
      createTime: record.feishu?.createTime ?? 0,
      durationMs: record.feishu?.durationMs ?? 0,
      url: record.feishu?.url ?? '',
      docUrl: record.delivery?.docUrl ?? '',
      status: record.processing?.stage ?? 'discovered',
      error: record.processing?.lastError ?? null,
      titleWrittenBack: Boolean(record.delivery?.titleAt),
      docCreatedAt: record.delivery?.docAt ?? 0,
      speakers: record.transcript?.speakers ?? [],
      transcriptChars: record.transcript?.chars ?? 0,
    }
  }

  // ---------------------------------------------------------------- cli

  function runCli(args, timeoutMs = 180000) {
    return new Promise((resolve) => {
      execFile(cliPath, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          let payload = null
          try {
            payload = JSON.parse(String(stdout || stderr))
          } catch {
            payload = null
          }
          resolve({ ok: false, error: payload?.error ?? { message: error.message }, raw: String(stdout || stderr) })
          return
        }
        try {
          resolve({ ok: true, data: JSON.parse(String(stdout)) })
        } catch (parseError) {
          resolve({ ok: false, error: { message: `输出无法解析：${parseError.message}` }, raw: String(stdout) })
        }
      })
    })
  }

  async function readAuth() {
    const result = await runCli(['auth', 'status', '--json'], 20000)
    if (!result.ok) {
      return { ok: false, message: result.error?.message ?? '无法读取登录状态' }
    }
    const identity = result.data?.identities?.user ?? {}
    const available = Boolean(identity.available)
    return {
      ok: available,
      name: identity.userName ?? '',
      openId: identity.openId ?? '',
      expiresAt: identity.expiresAt ?? '',
      message: available ? '' : (identity.message ?? '未登录'),
    }
  }

  // ---------------------------------------------------------------- discovery

  async function syncOnce() {
    const search = await runCli([
      'minutes', '+search',
      '--owner-ids', 'me',
      '--page-size', '30',
      '--format', 'json',
    ], 40000)

    if (!search.ok) {
      store.lastError = search.error?.message ?? '搜索失败'
      saveStore()
      return { ok: false, error: store.lastError, added: 0 }
    }

    store.lastSync = now()
    store.lastError = null

    const items = search.data?.data?.items ?? []
    let added = 0
    for (const item of items) {
      const token = item?.token
      if (!token) continue
      const existing = store.items[token]
      if (existing) {
        existing.lastSeenAt = now()
        continue
      }
      store.items[token] = {
        token,
        source: { kind: 'poll', at: now() },
        feishu: {
          title: readTitleFromSearchItem(item),
          url: item?.meta_data?.app_link ?? '',
          createTime: 0,
          durationMs: parseDurationFromDescription(item?.meta_data?.description),
        },
        generated: null,
        transcript: null,
        delivery: {},
        processing: { stage: 'discovered', attempts: 0, lastError: null },
        createdAt: now(),
        updatedAt: now(),
      }
      added += 1
    }

    // 补全基础信息（只对新记录、且数量有限）
    const missing = listRecords().filter((r) => !r.feishu?.createTime || !r.feishu?.url).slice(0, 12)
    for (const record of missing) {
      const detail = await runCli([
        'minutes', 'minutes', 'get',
        '--params', JSON.stringify({ minute_token: record.token }),
        '--format', 'json',
      ], 30000)
      if (!detail.ok) continue
      const minute = detail.data?.data?.minute ?? {}
      record.feishu = {
        ...record.feishu,
        title: minute.title ?? record.feishu.title,
        url: minute.url ?? record.feishu.url,
        createTime: Number(minute.create_time ?? 0) || record.feishu.createTime,
        durationMs: Number(minute.duration ?? 0) || record.feishu.durationMs,
        status: minute.status,
      }
      record.updatedAt = now()
    }

    saveStore()
    return { ok: true, added, total: Object.keys(store.items).length }
  }

  // ---------------------------------------------------------------- llm

  function currentModel() {
    try {
      const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
      if (selection?.provider && selection?.model) return { provider: selection.provider, model: selection.model }
    } catch {}
    return { provider: settings.provider, model: settings.model }
  }

  async function summarize(transcriptText) {
    const llm = ctx.get('llm')
    if (!llm) throw new Error('当前环境没有 llm 服务')
    const { provider, model } = currentModel()
    if (!provider || !model) throw new Error('没有可用的默认模型，请先在设置里选择模型')

    const system = [
      '你是会议纪要助理。用户会给你一段飞书妙记的逐字稿（含说话人与时间戳）。',
      '请基于逐字稿独立分析，不要臆造逐字稿里没有的事实。',
      '只输出一个 JSON 对象，不要加代码块标记，字段：',
      '{"title":"≤16字的主题式标题，不要用“会议/讨论/沟通”这类空词","oneLiner":"≤40字的一句话结论",',
      '"summaryMd":"Markdown 正文，用 ## 分节写关键内容与决定/风险；不要写待办（待办用 todos 字段）、不要重复一句话结论；只用 #、##、###、**粗体**、- 列表、1. 有序列表",',
      '"todos":[{"who":"负责人，识别不到就留空","what":"要做的事","due":"时间，识别不到就留空"}],',
      '"topics":["2-4 个主题词"]}',
    ].join('\n')

    const body = transcriptText.length > 60000
      ? `${transcriptText.slice(0, 60000)}\n\n（逐字稿过长，以上为前 60000 字）`
      : transcriptText

    const chunks = []
    for await (const chunk of llm.stream({
      provider,
      model,
      system,
      messages: [{ role: 'user', content: [{ type: 'text', text: body }] }],
      maxTokens: 4000,
      temperature: 0.3,
      purpose: 'lark-minutes-summary',
    })) {
      if (chunk?.type === 'text-delta') chunks.push(chunk.text)
    }
    const text = chunks.join('')
    const jsonStart = text.indexOf('{')
    const jsonEnd = text.lastIndexOf('}')
    if (jsonStart < 0 || jsonEnd <= jsonStart) throw new Error('模型没有返回 JSON')
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1))
  }

  // ---------------------------------------------------------------- docs

  async function createDoc(title, markdown) {
    mkdirSync(workDir, { recursive: true })
    const dir = await mkdtemp(join(workDir, 'doc-'))
    const file = join(dir, 'doc.md')
    writeFileSync(file, markdown)
    const result = await runCli([
      'docs', '+create',
      '--title', title,
      '--doc-format', 'markdown',
      '--content', `@${file}`,
      '--format', 'json',
    ], 120000)
    if (!result.ok) throw new Error(result.error?.message ?? '创建文档失败')
    const document = result.data?.data?.document ?? {}
    return { token: document.document_id, url: document.url }
  }

  async function overwriteDoc(docToken, markdown) {
    mkdirSync(workDir, { recursive: true })
    const dir = await mkdtemp(join(workDir, 'doc-'))
    const file = join(dir, 'doc.md')
    writeFileSync(file, markdown)
    const result = await runCli([
      'docs', '+update',
      '--doc', docToken,
      '--command', 'overwrite',
      '--doc-format', 'markdown',
      '--content', `@${file}`,
      '--format', 'json',
    ], 120000)
    if (!result.ok) throw new Error(result.error?.message ?? '更新文档失败')
    return result.data?.data?.document ?? {}
  }

  async function rebuildIndex() {
    if (!store.index.token) {
      const created = await createDoc(settings.indexTitle, '# 妙记工作台 · 索引\n')
      store.index = { token: created.token, url: created.url }
    }
    const rows = listRecords().filter((record) => record.delivery?.docUrl)
    const lines = [
      '# 妙记工作台 · 索引',
      '',
      `> 由「妙记工作台」自动维护 · 最后更新 ${toIsoSeconds(now())} · 共 ${rows.length} 条`,
      '',
      '| 时间 | 标题 | 时长 | 妙记 | 纪要文档 |',
      '|---|---|---|---|---|',
    ]
    for (const record of rows) {
      const minutes = Math.max(1, Math.round((record.feishu?.durationMs ?? 0) / 60000))
      lines.push(`| ${escapeCell(toIsoSeconds(record.feishu?.createTime ?? record.createdAt))} | ${escapeCell(record.generated?.title ?? record.feishu?.title ?? '')} | ${minutes}m | [妙记](${record.feishu?.url ?? ''}) | [纪要](${record.delivery.docUrl}) |`)
    }
    mkdirSync(workDir, { recursive: true })
    const dir = await mkdtemp(join(workDir, 'index-'))
    const file = join(dir, 'index.md')
    writeFileSync(file, lines.join('\n'))
    const result = await runCli([
      'docs', '+update',
      '--doc', store.index.token,
      '--command', 'overwrite',
      '--doc-format', 'markdown',
      '--content', `@${file}`,
      '--format', 'json',
    ], 120000)
    if (!result.ok) throw new Error(result.error?.message ?? '更新索引失败')
    saveStore()
  }

  // ---------------------------------------------------------------- pipeline

  const running = new Map()

  function buildDocMarkdown(record) {
    const generated = record.generated ?? {}
    const when = toIsoSeconds(record.feishu?.createTime ?? record.createdAt)
    const minutes = Math.max(1, Math.round((record.feishu?.durationMs ?? 0) / 60000))
    const speakers = record.transcript?.speakers ?? []
    const lines = [
      `# ${generated.title ?? record.feishu?.title ?? ''}`,
      '',
      `> ${when} · ${minutes} 分钟${speakers.length ? ` · ${speakers.length} 位发言人` : ''}`,
      `> 妙记原文：${record.feishu?.url ?? ''}`,
      '',
      `**一句话**：${generated.oneLiner ?? ''}`,
      '',
      generated.summaryMd ?? '',
    ]
    if (Array.isArray(generated.todos) && generated.todos.length) {
      lines.push('', '## 待办')
      for (const todo of generated.todos) {
        const who = todo.who ? `${todo.who}：` : ''
        const due = todo.due ? `（${todo.due}）` : ''
        lines.push(`- ${who}${todo.what ?? ''}${due}`)
      }
    }
    return lines.join('\n')
  }

  function isDefaultTitle(title) {
    const text = String(title ?? '').trim()
    if (!text) return true
    return DEFAULT_TITLE_PATTERNS.some((pattern) => pattern.test(text))
  }

  async function processRecord(token, options = {}) {
    const record = store.items[token]
    if (!record) throw new Error('找不到这条妙记')
    if (running.has(token)) return { ok: false, error: '这条妙记正在处理中' }

    running.set(token, true)
    record.processing = { ...record.processing, stage: 'fetching', attempts: (record.processing?.attempts ?? 0) + 1, lastError: null }
    saveStore()

    try {
      const detail = await runCli([
        'minutes', '+detail',
        '--minute-tokens', token,
        '--transcript',
        '--summary',
        '--output-dir', transcriptDir,
        '--overwrite',
        '--format', 'json',
      ], 240000)
      if (!detail.ok) throw new Error(detail.error?.message ?? '读取妙记失败')
      const entry = detail.data?.data?.minutes?.[0] ?? {}
      const transcriptFile = entry?.artifacts?.transcript_file
      if (!transcriptFile || !existsSync(transcriptFile)) throw new Error('没有拿到逐字稿文件')
      const transcriptText = readFileSync(transcriptFile, 'utf8')

      const speakers = new Set()
      for (const line of transcriptText.split('\n')) {
        const match = /^([^\s]+)\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s*$/.exec(line)
        if (match) speakers.add(match[1])
      }
      record.transcript = { file: transcriptFile, chars: transcriptText.length, speakers: [...speakers] }

      if (transcriptText.replace(/\s/g, '').length < settings.minTranscriptChars) {
        record.processing = { ...record.processing, stage: 'skipped', lastError: '逐字稿太短，已跳过' }
        saveStore()
        return { ok: true, skipped: true }
      }

      record.processing = { ...record.processing, stage: 'summarizing' }
      saveStore()

      const generated = await summarize(transcriptText)
      record.generated = {
        title: clampText(generated.title, 40),
        oneLiner: clampText(generated.oneLiner, 120),
        summaryMd: String(generated.summaryMd ?? ''),
        todos: Array.isArray(generated.todos) ? generated.todos : [],
        topics: Array.isArray(generated.topics) ? generated.topics : [],
      }
      record.processing = { ...record.processing, stage: 'delivering', lastError: null, model: currentModel().model }
      saveStore()

      if (settings.createDocs !== false) {
        const docTitle = `${record.generated.title}${settings.docTitleSuffix}`
        const markdown = buildDocMarkdown(record)
        if (record.delivery?.docToken) {
          await overwriteDoc(record.delivery.docToken, markdown)
          record.delivery = { ...record.delivery, docAt: now(), docError: null }
        } else {
          const doc = await createDoc(docTitle, markdown)
          record.delivery = { ...record.delivery, docToken: doc.token, docUrl: doc.url, docAt: now(), docError: null }
        }
        await rebuildIndex()
      }

      // 默认标题，或这条妙记的标题曾经由本插件写过 → 允许改写
      const canRewriteTitle = isDefaultTitle(record.feishu?.title) || Boolean(record.delivery?.titleAt)
      if (settings.autoWriteTitle !== false && options.writeTitle !== false && canRewriteTitle) {
        const renamed = await runCli([
          'minutes', '+update',
          '--minute-token', token,
          '--topic', record.generated.title,
          '--format', 'json',
        ], 30000)
        if (renamed.ok) {
          record.delivery = { ...record.delivery, titleAt: now(), titleError: null, writtenTitle: record.generated.title }
          record.original = { ...(record.original ?? {}), title: record.feishu?.title }
          record.feishu = { ...record.feishu, title: record.generated.title }
        } else {
          record.delivery = { ...record.delivery, titleError: renamed.error?.message ?? '标题写回失败' }
        }
      }

      record.processing = { ...record.processing, stage: 'ready', lastError: null }
      record.updatedAt = now()
      saveStore()
      return { ok: true, record: publicRecord(record) }
    } catch (error) {
      record.processing = { ...record.processing, stage: 'failed', lastError: error?.message ?? String(error) }
      record.updatedAt = now()
      saveStore()
      return { ok: false, error: record.processing.lastError }
    } finally {
      running.delete(token)
    }
  }

  // ---------------------------------------------------------------- http

  function sendJson(res, status, value) {
    const body = JSON.stringify(value)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  }

  async function readBody(req) {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    if (!chunks.length) return {}
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
      return {}
    }
  }

  const route = {
    kind: 'prefix',
    path: '/lark-minutes',
    handler: async (req, res) => {
      const url = new URL(req.url ?? '/lark-minutes', 'http://127.0.0.1')
      const path = url.pathname
      try {
        if (req.method === 'POST' && path === '/lark-minutes/client-alive') {
          store.stats = { ...(store.stats ?? {}), clientAlive: now(), clientAliveCount: (store.stats?.clientAliveCount ?? 0) + 1 }
          saveStore()
          return sendJson(res, 200, { ok: true })
        }
        if (req.method === 'GET' && path === '/lark-minutes/state') {
          const auth = await readAuth()
          store.auth = auth
          return sendJson(res, 200, {
            ok: true,
            auth,
            lastSync: store.lastSync,
            lastError: store.lastError,
            index: store.index,
            client: store.stats ?? {},
            listSize: settings.listSize,
            pollIntervalSec: settings.pollIntervalSec,
          })
        }
        if (req.method === 'GET' && path === '/lark-minutes/list') {
          const size = Number(url.searchParams.get('size') ?? settings.listSize) || settings.listSize
          const all = listRecords()
          const records = all.slice(0, size).map(publicRecord)
          return sendJson(res, 200, {
            ok: true,
            items: records,
            total: all.length,
            counts: stageCounts(all),
          })
        }
        if (req.method === 'GET' && path === '/lark-minutes/item') {
          const token = url.searchParams.get('token') ?? ''
          const record = store.items[token]
          if (!record) return sendJson(res, 404, { ok: false, error: '找不到这条妙记' })
          let transcript = ''
          if (record.transcript?.file && existsSync(record.transcript.file)) {
            transcript = readFileSync(record.transcript.file, 'utf8').slice(0, 200000)
          }
          return sendJson(res, 200, {
            ok: true,
            item: publicRecord(record),
            generated: record.generated,
            transcript,
            original: record.original ?? null,
            delivery: record.delivery ?? {},
            model: record.processing?.model ?? '',
            updatedAt: record.updatedAt ?? 0,
          })
        }
        if (req.method === 'POST' && path === '/lark-minutes/sync') {
          const result = await syncOnce()
          return sendJson(res, 200, result)
        }
        if (req.method === 'POST' && path === '/lark-minutes/process') {
          const body = await readBody(req)
          const token = String(body.token ?? '')
          if (!token) return sendJson(res, 400, { ok: false, error: '缺少 token' })
          const result = await processRecord(token, { writeTitle: body.writeTitle })
          return sendJson(res, 200, result)
        }
        return sendJson(res, 404, { ok: false, error: 'unknown route' })
      } catch (error) {
        return sendJson(res, 500, { ok: false, error: error?.message ?? String(error) })
      }
    },
  }

  // ---------------------------------------------------------------- lifecycle

  loadStore()

  ctx.effect(() => {
    const server = ctx.get('webServer')
    if (!server || typeof server.register !== 'function') {
      console.error('[lark-minutes] 没有 webServer 服务，面板拿不到数据')
      return () => {}
    }
    // 注册失败（例如同一进程里已被另一个实例占用该路径）不能让插件激活失败：
    // 激活失败会被 DSH 判为启动错误，整机都进不了界面。
    try {
      return server.register(route)
    } catch (error) {
      console.error('[lark-minutes] 注册 /lark-minutes 路由失败：', error?.message ?? error)
      return () => {}
    }
  })

  ctx.effect(() => {
    let stopped = false
    const tick = async () => {
      if (stopped) return
      try {
        await syncOnce()
      } catch (error) {
        store.lastError = error?.message ?? String(error)
        saveStore()
      }
      if (!stopped) timer = setTimeout(tick, Math.max(15, Number(settings.pollIntervalSec) || 60) * 1000)
    }
    let timer = setTimeout(tick, 2000)
    return () => {
      stopped = true
      clearTimeout(timer)
      if (saveTimer) clearTimeout(saveTimer)
    }
  })

  console.log('[lark-minutes] 妙记工作台已启动，数据目录：', dataDir)
}
