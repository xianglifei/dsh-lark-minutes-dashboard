window.__ModuleLoader__.load({
  id: 'dsh-lark-minutes-dashboard',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useMemo, useRef, useCallback } = React

    let pluginCtx = null

    const API = '/lark-minutes'
    const FILTERS = [
      { id: 'all', label: '最新' },
      { id: 'pending', label: '待整理' },
      { id: 'ready', label: '已整理' },
      { id: 'failed', label: '失败' },
    ]
    const STAGE_LABEL = {
      discovered: '待整理',
      fetching: '读取逐字稿',
      summarizing: '生成纪要',
      delivering: '写入飞书文档',
      ready: '已整理',
      failed: '处理失败',
      skipped: '已跳过',
    }

    const isPending = (status) =>
      status === 'discovered' || status === 'fetching' || status === 'summarizing' || status === 'delivering'

    // ---------------------------------------------------------------- styles

    const CSS = `
.lm-root {
  --lm-bg: var(--dsw-alias-bg-base, #ffffff);
  --lm-surface: var(--dsw-alias-bg-layer-2, #ffffff);
  --lm-list-bg: var(--dsw-specific-sidebar-fill, #f9fafb);
  --lm-border: var(--dsw-alias-border-l2, rgba(0, 0, 0, .1));
  --lm-border-soft: var(--dsw-alias-border-l1, rgba(0, 0, 0, .04));
  --lm-text: var(--dsw-alias-label-primary, #0f1115);
  --lm-text-2: var(--dsw-alias-label-secondary, #61666b);
  --lm-text-3: var(--dsw-alias-label-tertiary, #81858c);
  --lm-caption: var(--dsw-alias-label-caption, #adb2b8);
  --lm-hover: var(--dsw-alias-interactive-bg-hover, rgba(38, 49, 72, .06));
  --lm-active: var(--dsw-alias-interactive-bg-active, rgba(38, 49, 72, .1));
  --lm-brand: var(--dsw-alias-brand-primary, #0f1115);
  --lm-on-brand: var(--dsw-alias-bg-base, #ffffff);
  --lm-link: var(--dsw-alias-link, #4176e6);
  --lm-ok: var(--dsw-alias-state-success-primary, #22c55e);
  --lm-warn: var(--dsw-alias-state-warn-primary, #f59e0b);
  --lm-err: var(--dsw-alias-state-error-primary, #ec1313);
  --lm-ok-ink: color-mix(in srgb, var(--lm-ok) 68%, var(--lm-text));
  --lm-warn-ink: color-mix(in srgb, var(--lm-warn) 70%, var(--lm-text));
  --lm-err-ink: color-mix(in srgb, var(--lm-err) 84%, var(--lm-text));
  --lm-shadow: var(--dsw-shadow-lv1, 0 1px 2px rgba(0, 0, 0, .05));
  --lm-shadow-pop: var(--dsw-elevation-prominent, 0 8px 28px rgba(0, 0, 0, .12));
  --lm-mono: var(--dsw-font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--lm-bg);
  color: var(--lm-text);
  font-family: var(--dsw-font-family, inherit);
  font-size: 13px;
  line-height: 20px;
  letter-spacing: 0;
  container-type: inline-size;
}
.lm-root *, .lm-root *::before, .lm-root *::after { box-sizing: border-box; }
.lm-root button { font: inherit; }
.lm-root a { color: var(--lm-link); }
.lm-root a.lm-btn { text-decoration: none; }
.lm-root :focus-visible { outline: 2px solid color-mix(in srgb, var(--lm-link) 70%, transparent); outline-offset: 1px; }

/* ---------------------------------------------------------------- header */
.lm-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 5px 16px 5px 14px;
  border-bottom: .5px solid var(--lm-border-soft);
  background: var(--lm-bg);
  z-index: 2;
}
.lm-brand { display: flex; align-items: center; gap: 9px; min-width: 0; flex: none; }
.lm-brand-mark {
  width: 27px; height: 27px; flex: none;
  display: grid; place-items: center;
  border-radius: 8px;
  background: var(--lm-brand);
  color: var(--lm-on-brand);
  box-shadow: inset 0 0 0 .5px rgba(255, 255, 255, .14);
}
.lm-brand-text { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
.lm-brand-title {
  font-size: 15px; line-height: 22px; font-weight: 600;
  letter-spacing: -.012em; white-space: nowrap;
}
.lm-head-spacer { flex: 1; min-width: 4px; }

.lm-search {
  position: relative;
  display: flex;
  align-items: center;
  width: 224px;
  height: 30px;
  flex: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--lm-text) 5%, transparent);
  border: .5px solid transparent;
  transition: background .15s ease, border-color .15s ease, box-shadow .15s ease;
}
.lm-search:focus-within {
  background: var(--lm-surface);
  border-color: color-mix(in srgb, var(--lm-text) 20%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lm-text) 5%, transparent);
}
.lm-search-icon { color: var(--lm-text-3); margin: 0 6px 0 9px; flex: none; display: inline-flex; }
.lm-search input {
  flex: 1; min-width: 0; height: 100%;
  border: 0; outline: 0; background: transparent;
  color: var(--lm-text); font: inherit; font-size: 12px;
  padding: 0;
}
.lm-search input::placeholder { color: var(--lm-text-3); }
.lm-search input:focus, .lm-search input:focus-visible { outline: none; box-shadow: none; }
.lm-search input::-webkit-search-cancel-button,
.lm-search input::-webkit-search-decoration { -webkit-appearance: none; appearance: none; }
.lm-search-clear {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; margin-right: 4px; padding: 0;
  border: 0; border-radius: 5px; background: transparent;
  color: var(--lm-caption); cursor: pointer; flex: none;
}
.lm-search-clear:hover { background: var(--lm-hover); color: var(--lm-text-2); }
.lm-kbd {
  margin-right: 7px; flex: none;
  height: 17px; padding: 0 4px;
  display: inline-flex; align-items: center;
  border: .5px solid var(--lm-border); border-radius: 4px;
  color: var(--lm-caption); font-size: 10px; line-height: 1;
  font-family: var(--lm-mono);
}
.lm-search:focus-within .lm-kbd { display: none; }

.lm-btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 5px; height: 28px; padding: 0 9px;
  border: .5px solid transparent; border-radius: 7px;
  background: transparent; color: var(--lm-text-2);
  font-size: 12px; line-height: 1; white-space: nowrap;
  cursor: pointer; transition: background .12s ease, color .12s ease, border-color .12s ease;
}
@media (hover: hover) {
  .lm-btn:hover { background: var(--lm-hover); color: var(--lm-text); }
  .lm-btn[aria-expanded="true"]:hover { background: var(--lm-hover); }
}
.lm-btn:active { background: var(--lm-active); }
.lm-btn:disabled { opacity: .5; cursor: default; background: transparent; }
.lm-btn svg { flex: none; }
.lm-btn-quiet { color: var(--lm-text-2); }
.lm-btn-link { color: var(--lm-link); }
@media (hover: hover) {
  .lm-btn-link:hover {
    color: var(--lm-link);
    background: color-mix(in srgb, var(--lm-link) 9%, transparent);
  }
}
.lm-btn-primary {
  height: 30px; padding: 0 12px;
  background: var(--lm-brand); color: var(--lm-on-brand);
  border-color: transparent; font-weight: 500;
  box-shadow: 0 1px 1px rgba(0, 0, 0, .06);
}
@media (hover: hover) {
  .lm-btn-primary:hover {
    background: color-mix(in srgb, var(--lm-brand) 88%, var(--lm-bg));
    color: var(--lm-on-brand);
  }
}
.lm-btn-primary:active { background: color-mix(in srgb, var(--lm-brand) 94%, var(--lm-text)); }
.lm-btn-primary:disabled { opacity: .55; background: var(--lm-brand); }
.lm-icon-btn { width: 28px; padding: 0; }
.lm-btn-outline { border-color: var(--lm-border); background: var(--lm-bg); }
@media (hover: hover) {
  .lm-btn-outline:hover { background: var(--lm-hover); border-color: var(--lm-border); }
}
.lm-spin { animation: lm-spin .9s linear infinite; }

/* ---------------------------------------------------------------- toolbar */
.lm-tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 43px;
  padding: 5px 16px;
  border-bottom: .5px solid var(--lm-border-soft);
  background: var(--lm-bg);
  z-index: 1;
}
.lm-tabs { display: flex; align-items: center; gap: 2px; min-width: 0; }
.lm-tab {
  display: inline-flex; align-items: center; gap: 5px;
  height: 28px; padding: 0 10px; flex: none;
  border: 0; border-radius: 7px;
  background: transparent; color: var(--lm-text-3);
  font-size: 12px; line-height: 1; cursor: pointer;
  transition: background .12s ease, color .12s ease;
}
@media (hover: hover) {
  .lm-tab:hover { background: var(--lm-hover); color: var(--lm-text-2); }
}
.lm-tab[aria-selected="true"] {
  background: color-mix(in srgb, var(--lm-text) 7%, transparent);
  color: var(--lm-text); font-weight: 500;
}
.lm-tab-count {
  min-width: 16px; height: 16px; padding: 0 4px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--lm-text) 6%, transparent);
  color: var(--lm-text-3);
  font-size: 10px; line-height: 1; font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.lm-tab[aria-selected="true"] .lm-tab-count {
  background: color-mix(in srgb, var(--lm-text) 11%, transparent);
  color: var(--lm-text-2);
}
.lm-tools-spacer { flex: 1; }
.lm-tool-meta {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; line-height: 18px; color: var(--lm-caption);
  white-space: nowrap; font-variant-numeric: tabular-nums;
}
/* 同步按钮：一个控件同时承担「动作 + 上次同步结果」 */
.lm-sync { gap: 6px; padding: 0 8px; }
.lm-sync-state { max-width: 168px; overflow: hidden; text-overflow: ellipsis; }
.lm-sync-state[data-tone="err"] { color: var(--lm-err-ink); }
.lm-sync-state[data-tone="warn"] { color: var(--lm-warn-ink); }
.lm-sync-failed, .lm-sync-failed .lm-btn-label { color: var(--lm-err-ink); }
/* 登录正常时不占位；只有登录失效才提示一句 */
.lm-auth-warn {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; line-height: 18px; color: var(--lm-err-ink);
  white-space: nowrap;
}

/* ---------------------------------------------------------------- banner */
.lm-banner {
  flex: none;
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 16px;
  border-bottom: .5px solid var(--lm-border-soft);
  font-size: 12px; line-height: 18px;
  background: color-mix(in srgb, var(--lm-err) 7%, transparent);
  color: var(--lm-err-ink);
}
.lm-banner[data-tone="warn"] {
  background: color-mix(in srgb, var(--lm-warn) 10%, transparent);
  color: var(--lm-warn-ink);
}
.lm-banner-icon { flex: none; margin-top: 1px; display: inline-flex; }
.lm-banner-body { flex: 1; min-width: 0; }
.lm-banner-title { font-weight: 500; }
.lm-banner-text { color: var(--lm-text-2); margin-top: 1px; word-break: break-word; }
.lm-banner-actions { display: inline-flex; align-items: center; gap: 2px; flex: none; }
.lm-banner .lm-btn { height: 24px; padding: 0 7px; color: inherit; }

/* ---------------------------------------------------------------- panes */
.lm-body { flex: 1; min-height: 0; display: flex; }
.lm-root[data-empty="true"] .lm-list-pane,
.lm-root[data-solo="true"] .lm-list-pane { width: 100%; border-right: 0; }
.lm-root[data-empty="true"] .lm-detail,
.lm-root[data-solo="true"] .lm-detail { display: none; }
.lm-root[data-empty="true"] .lm-list-foot { display: none; }
.lm-list-pane {
  width: 318px; flex: none; min-height: 0;
  display: flex; flex-direction: column;
  background: var(--lm-list-bg);
  border-right: .5px solid var(--lm-border);
}
.lm-list-scroll .lm-center { min-height: 100%; }
.lm-list-scroll {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: 7px 8px 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--dsw-alias-scrollbar-bg-l1, rgba(0,0,0,.16)) transparent;
}
.lm-list-scroll::-webkit-scrollbar,
.lm-detail-scroll::-webkit-scrollbar,
.lm-transcript-body::-webkit-scrollbar { width: 10px; height: 10px; }
.lm-list-scroll::-webkit-scrollbar-thumb,
.lm-detail-scroll::-webkit-scrollbar-thumb,
.lm-transcript-body::-webkit-scrollbar-thumb {
  background: var(--dsw-alias-scrollbar-bg-l1, rgba(0,0,0,.16));
  border: 3px solid transparent; border-radius: 6px; background-clip: content-box;
}
.lm-list-scroll::-webkit-scrollbar-thumb:hover,
.lm-detail-scroll::-webkit-scrollbar-thumb:hover {
  background: var(--dsw-alias-scrollbar-hover-l1, rgba(0,0,0,.28));
  border: 3px solid transparent; border-radius: 6px; background-clip: content-box;
}

.lm-row {
  position: relative;
  display: grid; grid-template-columns: auto 1fr; column-gap: 6px; row-gap: 4px;
  align-items: center; width: 100%;
  margin: 0 0 3px;
  padding: 12px 10px 12px 12px;
  border: .5px solid transparent; border-radius: 9px;
  background: transparent; text-align: left; cursor: pointer;
  transition: background .12s ease, box-shadow .12s ease, border-color .12s ease;
  -webkit-tap-highlight-color: transparent;
}
@media (hover: hover) {
  .lm-row:hover { background: color-mix(in srgb, var(--lm-text) 4%, transparent); }
}
.lm-row:active { background: color-mix(in srgb, var(--lm-text) 6%, transparent); }
.lm-row[aria-current="true"] {
  background: var(--lm-surface);
  border-color: var(--lm-border);
  box-shadow: var(--lm-shadow);
}
.lm-row[aria-current="true"]::before {
  content: '';
  position: absolute; left: 0; top: 50%;
  width: 2.5px; height: 20px; margin-top: -10px;
  border-radius: 0 2px 2px 0;
  background: var(--lm-brand);
}
.lm-row-flag { grid-column: 1; grid-row: 1; display: inline-flex; }
.lm-row-meta { grid-column: 2; grid-row: 1; display: flex; align-items: center; gap: 6px; min-width: 0; height: 17px; }
.lm-row-sep { flex: none; color: var(--lm-caption); font-size: 10px; line-height: 17px; }
.lm-row-flag[data-tone="ok"] { color: var(--lm-ok-ink); }
.lm-row-flag[data-tone="warn"] { color: var(--lm-warn-ink); }
.lm-row-flag[data-tone="err"] { color: var(--lm-err-ink); }
.lm-row-flag[data-tone="muted"] { color: var(--lm-caption); }
.lm-row-title {
  grid-column: 2; grid-row: 2; min-width: 0;
  font-size: 14px; line-height: 21px; font-weight: 500;
  color: var(--lm-text); letter-spacing: -.005em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lm-row-flag { flex: none; display: inline-flex; color: var(--lm-text-3); }
.lm-row-time {
  min-width: 0; font-size: 11px; line-height: 17px;
  color: var(--lm-text-3); font-variant-numeric: tabular-nums;
  letter-spacing: -.01em; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.lm-row-dur {
  flex: none;
  font-size: 11px; line-height: 17px;
  color: var(--lm-text-3); font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lm-list-foot {
  flex: none; padding: 8px 14px;
  border-top: .5px solid var(--lm-border-soft);
  display: flex; align-items: center; gap: 6px;
  font-size: 11px; line-height: 16px; color: var(--lm-text-3);
  background: var(--lm-list-bg);
}

/* ---------------------------------------------------------------- skeletons */
.lm-sk-row { padding: 10px 11px; margin-bottom: 2px; }
.lm-sk-line {
  height: 9px; border-radius: 5px; overflow: hidden; position: relative;
  background: var(--dsw-alias-bg-skeleton, rgba(0, 0, 0, .05));
}
.lm-sk-line + .lm-sk-line { margin-top: 8px; }
.lm-sk-line::after {
  content: ''; position: absolute; inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--lm-text) 6%, transparent), transparent);
  animation: lm-shimmer 1.5s ease-in-out infinite;
}
.lm-sk-block { height: 12px; margin-top: 12px; }
.lm-sk-block:nth-child(3n) { width: 82%; }
.lm-sk-block:nth-child(4n) { width: 64%; }

/* ---------------------------------------------------------------- empty */
.lm-center { flex: 1; min-height: 0; display: grid; place-items: center; padding: 28px; }
.lm-empty { max-width: 320px; text-align: center; }
.lm-empty-mark {
  width: 44px; height: 44px; margin: 0 auto 13px;
  display: grid; place-items: center;
  border-radius: 13px;
  background: color-mix(in srgb, var(--lm-text) 5%, transparent);
  color: var(--lm-text-3);
}
.lm-empty-title { font-size: 14px; line-height: 22px; font-weight: 600; letter-spacing: -.01em; }
.lm-empty-desc { margin-top: 5px; font-size: 12px; line-height: 19px; color: var(--lm-text-3); }
.lm-empty-actions { margin-top: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.lm-empty-steps {
  margin: 18px auto 0; padding-top: 14px;
  border-top: .5px solid var(--lm-border-soft);
  display: flex; align-items: center; justify-content: center; gap: 7px;
  font-size: 10.5px; color: var(--lm-caption); white-space: nowrap;
}
.lm-empty-steps svg { color: var(--lm-caption); }

/* ---------------------------------------------------------------- detail */
.lm-detail { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--lm-bg); }
.lm-detail-head {
  flex: none;
  padding: 14px 0 11px;
  border-bottom: .5px solid var(--lm-border-soft);
  background: var(--lm-bg);
}
.lm-detail-head-inner {
  width: 100%; max-width: 720px;
  margin: 0 auto; padding: 0 24px;
}
.lm-detail-top { display: flex; align-items: flex-start; gap: 10px; min-width: 0; }
.lm-back { display: none; width: 28px; padding: 0; flex: none; margin-left: -4px; }
.lm-detail-title {
  flex: 1; min-width: 0; margin: 0;
  font-size: 16px; line-height: 24px; font-weight: 600;
  letter-spacing: -.012em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lm-actions { display: flex; align-items: center; gap: 4px; flex: none; }
.lm-detail-meta {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: 4px 8px; margin-top: 6px;
  font-size: 12px; line-height: 19px; color: var(--lm-text-3);
}
.lm-meta-item { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.lm-meta-item svg { color: var(--lm-caption); }
.lm-sep { width: 2px; height: 2px; border-radius: 50%; background: var(--lm-caption); flex: none; }
.lm-pill {
  display: inline-flex; align-items: center; gap: 4px;
  height: 18px; padding: 0 7px; border-radius: 999px;
  font-size: 10.5px; line-height: 1; font-weight: 500;
  white-space: nowrap;
}
.lm-pill[data-tone="ok"] { background: color-mix(in srgb, var(--lm-ok) 13%, transparent); color: var(--lm-ok-ink); }
.lm-pill[data-tone="warn"] { background: color-mix(in srgb, var(--lm-warn) 15%, transparent); color: var(--lm-warn-ink); }
.lm-pill[data-tone="err"] { background: color-mix(in srgb, var(--lm-err) 11%, transparent); color: var(--lm-err-ink); }
.lm-pill[data-tone="muted"] { background: color-mix(in srgb, var(--lm-text) 6%, transparent); color: var(--lm-text-2); }
.lm-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex: none; }
.lm-pill[data-live="true"] .lm-pill-dot { animation: lm-pulse 1.6s ease-in-out infinite; }
.lm-delivery {
  display: flex; align-items: center; flex-wrap: wrap;
  gap: 4px 11px; margin-top: 8px;
  font-size: 11px; line-height: 17px; color: var(--lm-text-3);
}
.lm-del { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.lm-del svg { color: var(--lm-ok-ink); }
.lm-del[data-tone="muted"] svg { color: var(--lm-caption); }

.lm-detail-scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--dsw-alias-scrollbar-bg-l1, rgba(0,0,0,.16)) transparent; }
.lm-detail-inner {
  max-width: 720px; margin: 0 auto;
  padding: 20px 24px 52px;
  animation: lm-fade .2s ease-out;
}

/* ---------------------------------------------------------------- content */
.lm-quote {
  position: relative;
  padding: 13px 16px 13px 18px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--lm-brand) 4%, transparent);
  border: .5px solid color-mix(in srgb, var(--lm-brand) 9%, transparent);
}
.lm-quote::before {
  content: ''; position: absolute; left: 0; top: 12px; bottom: 12px;
  width: 2px; border-radius: 0 2px 2px 0; background: var(--lm-brand);
}
.lm-quote-label {
  font-size: 11px; line-height: 15px; font-weight: 500;
  letter-spacing: .06em; color: var(--lm-text-3);
  margin-bottom: 3px;
}
.lm-quote-text { font-size: 14.5px; line-height: 1.72; color: var(--lm-text); }

.lm-md { margin-top: 6px; font-size: 14px; line-height: 1.78; color: var(--lm-text); }
.lm-md p { margin: 8px 0; }
.lm-md h2 {
  display: flex; align-items: center; gap: 10px;
  margin: 24px 0 10px;
  font-size: 15px; line-height: 24px; font-weight: 600;
  letter-spacing: -.005em; color: var(--lm-text);
}
.lm-md h2::after { content: ''; flex: 1; height: .5px; background: var(--lm-border); }
.lm-md h3 { margin: 18px 0 6px; font-size: 14px; line-height: 22px; font-weight: 600; color: var(--lm-text); }
.lm-md h1 { margin: 20px 0 10px; font-size: 16.5px; line-height: 26px; font-weight: 600; }
.lm-md ul { list-style: none; margin: 5px 0 11px; padding: 0; }
.lm-md ul li { position: relative; padding-left: 16px; margin: 4px 0; }
.lm-md ul li::before {
  content: ''; position: absolute; left: 4px; top: .72em;
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--lm-caption);
}
.lm-md ol { margin: 4px 0 10px; padding-left: 20px; }
.lm-md ol li { margin: 4px 0; padding-left: 2px; }
.lm-md ol li::marker { color: var(--lm-caption); font-variant-numeric: tabular-nums; font-size: 12px; }
.lm-md strong { font-weight: 600; color: var(--lm-text); }
.lm-md em { font-style: italic; }
.lm-md code {
  padding: 1px 5px; border-radius: 4px;
  background: var(--dsw-alias-markdown-inline-code, rgba(0, 0, 0, .05));
  font-family: var(--lm-mono); font-size: 12.5px;
}
.lm-md a {
  color: var(--lm-link); text-decoration: none;
  border-bottom: .5px solid color-mix(in srgb, var(--lm-link) 35%, transparent);
}
.lm-md a:hover { border-bottom-color: var(--lm-link); }
.lm-md blockquote {
  margin: 8px 0; padding: 2px 0 2px 12px;
  border-left: 2px solid var(--lm-border);
  color: var(--lm-text-2);
}

.lm-section { margin-top: 24px; }
.lm-section-head { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.lm-section-title { font-size: 14px; line-height: 21px; font-weight: 600; letter-spacing: -.005em; }
.lm-count {
  min-width: 16px; height: 16px; padding: 0 4px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px; background: color-mix(in srgb, var(--lm-text) 6%, transparent);
  color: var(--lm-text-3); font-size: 10px; line-height: 1;
  font-variant-numeric: tabular-nums; font-weight: 400;
}

/* todos */
.lm-todos { display: flex; flex-direction: column; gap: 1px; }
.lm-todo {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 5px 7px 5px 5px; border-radius: 7px;
  transition: background .12s ease;
}
@media (hover: hover) { .lm-todo:hover { background: var(--lm-hover); } }
.lm-check {
  width: 17px; height: 17px; flex: none; margin-top: 2px; padding: 0;
  display: grid; place-items: center;
  border: 1.4px solid color-mix(in srgb, var(--lm-text) 24%, transparent);
  border-radius: 50%; background: transparent; color: transparent;
  cursor: pointer; transition: background .12s ease, border-color .12s ease, color .12s ease;
}
@media (hover: hover) { .lm-check:hover { border-color: var(--lm-brand); color: color-mix(in srgb, var(--lm-text) 25%, transparent); } }
.lm-todo[data-done="true"] .lm-check {
  background: var(--lm-brand); border-color: var(--lm-brand); color: var(--lm-on-brand);
}
.lm-todo-main { flex: 1; min-width: 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 7px; }
.lm-todo-text { flex: 0 1 auto; min-width: 0; font-size: 14px; line-height: 22px; color: var(--lm-text); }
.lm-todo[data-done="true"] .lm-todo-text {
  color: var(--lm-text-3);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--lm-text) 28%, transparent);
}
.lm-tag {
  display: inline-flex; align-items: center; gap: 3px;
  height: 19px; padding: 0 6px; border-radius: 5px;
  background: color-mix(in srgb, var(--lm-text) 5%, transparent);
  color: var(--lm-text-2); font-size: 11.5px; line-height: 1;
  white-space: nowrap;
}
.lm-tag[data-kind="due"] { background: color-mix(in srgb, var(--lm-warn) 12%, transparent); color: var(--lm-warn-ink); }
.lm-tag[data-kind="due"] svg { color: currentColor; }

/* topics */
.lm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.lm-chip {
  display: inline-flex; align-items: center;
  height: 23px; padding: 0 9px; border-radius: 999px;
  background: color-mix(in srgb, var(--lm-text) 5%, transparent);
  color: var(--lm-text-2); font-size: 11px; line-height: 1;
}
.lm-chip::before { content: '#'; margin-right: 2px; color: var(--lm-caption); }

/* transcript */
.lm-transcript-head { display: flex; align-items: center; gap: 6px; }
.lm-transcript-copy {
  height: 38px; width: 38px; flex: none;
  border: .5px solid var(--lm-border); border-radius: 9px;
}
.lm-transcript-toggle {
  display: flex; align-items: center; gap: 8px;
  flex: 1; min-width: 0; height: 38px; padding: 0 11px;
  border: .5px solid var(--lm-border); border-radius: 9px;
  background: transparent; cursor: pointer; text-align: left;
  color: var(--lm-text-2); font-size: 12.5px;
  transition: background .12s ease, border-color .12s ease;
}
@media (hover: hover) { .lm-transcript-toggle:hover { background: var(--lm-hover); } }
.lm-transcript-toggle[aria-expanded="true"] { border-color: var(--lm-border); background: color-mix(in srgb, var(--lm-text) 2.5%, transparent); }
.lm-chevron { flex: none; color: var(--lm-caption); transition: transform .16s ease; }
.lm-transcript-toggle[aria-expanded="true"] .lm-chevron { transform: rotate(90deg); }
.lm-transcript-meta { flex: 1; min-width: 0; color: var(--lm-text-3); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lm-transcript-toggle .lm-btn { height: 24px; }
.lm-transcript {
  margin-top: 8px; padding: 6px;
  border: .5px solid var(--lm-border-soft); border-radius: 10px;
  background: color-mix(in srgb, var(--lm-text) 1.6%, transparent);
}
.lm-transcript-body { max-height: 460px; overflow-y: auto; scrollbar-width: thin; }
.lm-turn { display: flex; gap: 9px; padding: 6px 8px; border-radius: 8px; }
@media (hover: hover) { .lm-turn:hover { background: color-mix(in srgb, var(--lm-text) 3%, transparent); } }
.lm-avatar {
  width: 24px; height: 24px; flex: none; margin-top: 1px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--tone, #4176e6) 16%, transparent);
  color: color-mix(in srgb, var(--tone, #4176e6) 68%, var(--lm-text));
  font-size: 10px; line-height: 1; font-weight: 600;
}
.lm-turn-main { flex: 1; min-width: 0; }
.lm-turn-head { display: flex; align-items: baseline; gap: 6px; }
.lm-turn-who { font-size: 12px; line-height: 18px; font-weight: 600; color: var(--lm-text-2); }
.lm-turn-time { font-size: 10.5px; line-height: 16px; color: var(--lm-text-3); font-family: var(--lm-mono); }
.lm-turn-text { margin-top: 2px; font-size: 13.5px; line-height: 1.72; color: var(--lm-text); word-break: break-word; }
.lm-transcript-more {
  width: 100%; height: 30px; margin-top: 4px;
  border: .5px solid var(--lm-border); border-radius: 7px;
  background: transparent; color: var(--lm-text-3);
  font-size: 11px; cursor: pointer;
}
@media (hover: hover) { .lm-transcript-more:hover { background: var(--lm-hover); color: var(--lm-text-2); } }

/* footer */
.lm-foot {
  margin-top: 28px; padding-top: 13px;
  border-top: .5px solid var(--lm-border-soft);
  display: flex; flex-wrap: wrap; align-items: center;
  gap: 5px 14px;
  font-size: 11px; line-height: 17px; color: var(--lm-text-3);
}
.lm-foot-item { display: inline-flex; align-items: center; gap: 4px; }
.lm-foot a { color: var(--lm-text-3); text-decoration: none; }
.lm-foot a:hover { color: var(--lm-link); }

/* ---------------------------------------------------------------- process */
.lm-progress {
  max-width: 460px; margin: 6px auto 0;
  padding: 17px 18px 15px;
  border: .5px solid var(--lm-border); border-radius: 12px;
  background: var(--lm-surface);
  box-shadow: var(--lm-shadow);
}
.lm-progress-head { display: flex; align-items: center; gap: 9px; }
.lm-progress-spinner {
  width: 20px; height: 20px; flex: none;
  display: grid; place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--lm-warn) 12%, transparent);
  color: var(--lm-warn-ink);
}
.lm-progress-title { font-size: 13.5px; font-weight: 600; letter-spacing: -.005em; }
.lm-progress-hint { margin-top: 3px; font-size: 11.5px; line-height: 18px; color: var(--lm-text-3); }
.lm-bar {
  height: 2px; margin: 14px 0 13px;
  border-radius: 2px; overflow: hidden;
  background: color-mix(in srgb, var(--lm-text) 7%, transparent);
}
.lm-bar span {
  display: block; width: 34%; height: 100%;
  border-radius: 2px; background: var(--lm-brand);
  animation: lm-indeterminate 1.4s ease-in-out infinite;
}
.lm-steps { display: flex; flex-direction: column; gap: 2px; }
.lm-step {
  display: flex; align-items: center; gap: 9px;
  padding: 4px 0; font-size: 12px; line-height: 18px; color: var(--lm-text-3);
}
.lm-step[data-state="done"] { color: var(--lm-text-2); }
.lm-step[data-state="active"] { color: var(--lm-text); font-weight: 500; }
.lm-step-mark {
  width: 16px; height: 16px; flex: none;
  display: grid; place-items: center;
  border-radius: 50%;
  border: 1.2px solid color-mix(in srgb, var(--lm-text) 18%, transparent);
  color: transparent;
}
.lm-step[data-state="done"] .lm-step-mark {
  border-color: var(--lm-ok); background: var(--lm-ok); color: #fff;
}
.lm-step[data-state="active"] .lm-step-mark { border-color: var(--lm-brand); }
.lm-step[data-state="active"] .lm-step-mark::after {
  content: ''; width: 6px; height: 6px; border-radius: 50%;
  background: var(--lm-brand); animation: lm-pulse 1.2s ease-in-out infinite;
}
.lm-step-note { margin-left: auto; font-size: 10.5px; color: var(--lm-caption); font-weight: 400; }

/* ---------------------------------------------------------------- failure */
.lm-fail {
  width: 100%; margin: 0 0 18px;
  border: .5px solid color-mix(in srgb, var(--lm-err) 22%, transparent);
  border-radius: 12px; overflow: hidden;
  background: color-mix(in srgb, var(--lm-err) 4%, transparent);
}
.lm-fail-head { display: flex; align-items: center; gap: 8px; padding: 12px 15px; color: var(--lm-err-ink); font-size: 13px; font-weight: 600; }
.lm-fail-body { padding: 0 15px 14px; }
.lm-fail-text {
  padding: 9px 11px; border-radius: 8px;
  background: var(--lm-bg); border: .5px solid var(--lm-border-soft);
  font-family: var(--lm-mono); font-size: 11px; line-height: 17px;
  color: var(--lm-text-2); word-break: break-word;
  max-height: 140px; overflow: auto;
}
.lm-fail-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.lm-fail-note { margin-top: 9px; font-size: 11px; line-height: 17px; color: var(--lm-text-3); }

/* ---------------------------------------------------------------- toast */
.lm-toast {
  position: absolute; left: 50%; bottom: 18px; z-index: 30;
  transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px;
  max-width: min(440px, calc(100% - 32px));
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--dsw-alias-toast-bg, #353638);
  color: var(--dsw-alias-toast-label, #fff);
  box-shadow: var(--lm-shadow-pop);
  font-size: 12px; line-height: 18px;
  animation: lm-toast-in .18s ease-out;
}
.lm-toast[data-tone="ok"] svg { color: #6ee7a3; }
.lm-toast[data-tone="err"] svg { color: #ff9b9b; }
.lm-toast[data-tone="warn"] svg { color: #ffd18a; }

/* ---------------------------------------------------------------- keyframes */
@keyframes lm-spin { to { transform: rotate(360deg); } }
@keyframes lm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@keyframes lm-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
@keyframes lm-indeterminate { 0% { transform: translateX(-110%); } 100% { transform: translateX(330%); } }
@keyframes lm-fade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@keyframes lm-toast-in { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }

@media (prefers-reduced-motion: reduce) {
  .lm-root *, .lm-root *::before, .lm-root *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
  .lm-bar span { width: 100%; }
}

/* ---------------------------------------------------------------- narrow */
@container (max-width: 800px) {
  .lm-list-pane { width: 300px; }
  .lm-search { width: 180px; }
  .lm-detail-head { padding: 12px 0 10px; }
  .lm-detail-head-inner { padding: 0 16px; }
  .lm-detail-inner { padding: 16px 16px 44px; }
}
@container (max-width: 700px) {
  .lm-list-pane { width: 100%; border-right: 0; }
  .lm-detail { display: none; }
  .lm-root[data-mobile-detail="true"] .lm-list-pane { display: none; }
  .lm-root[data-mobile-detail="true"] .lm-detail { display: flex; }
  .lm-root[data-mobile-detail="true"] .lm-head,
  .lm-root[data-mobile-detail="true"] .lm-tools { display: none; }
  .lm-back { display: inline-flex; }
  .lm-head { padding: 5px 10px 5px 12px; gap: 8px; min-height: 50px; }
  .lm-search { flex: 1; width: auto; min-width: 0; max-width: none; }
  .lm-search .lm-kbd { display: none; }
  .lm-tools { padding: 5px 10px; gap: 6px; }
  .lm-tabs { overflow-x: auto; scrollbar-width: none; }
  .lm-tabs::-webkit-scrollbar { display: none; }
  .lm-tab { padding: 0 8px; }
  .lm-tool-meta { display: none; }
  .lm-btn-label { display: none; }
  .lm-icon-btn { width: 30px; height: 30px; }
  .lm-list-scroll { padding: 6px 8px 10px; }
  .lm-detail-title { font-size: 15.5px; line-height: 23px; white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .lm-detail-meta { font-size: 11px; }
  .lm-detail-inner { padding: 14px 16px 40px; }
  .lm-quote-text { font-size: 13px; }
  .lm-md { font-size: 13px; line-height: 1.78; }
  .lm-transcript-body { max-height: 380px; }
  .lm-progress, .lm-fail { margin-top: 0; }
}
@container (max-width: 560px) {
  .lm-head { flex-wrap: wrap; row-gap: 6px; padding-bottom: 8px; }
  .lm-head-spacer { display: none; }
  .lm-search { order: 5; flex: 1 1 100%; width: 100%; }
  .lm-tools-spacer { min-width: 0; }
}
@container (max-width: 440px) {
  .lm-head { gap: 6px; }
  .lm-brand { gap: 7px; }
  .lm-brand-mark { width: 24px; height: 24px; border-radius: 7px; }
  .lm-brand-title { font-size: 14px; }
  .lm-btn { padding: 0 7px; }
  .lm-tab { gap: 4px; padding: 0 7px; }
  .lm-detail-head { padding: 10px 0 9px; }
  .lm-detail-head-inner { padding: 0 12px; }
  .lm-detail-inner { padding: 12px 12px 36px; }
  .lm-avatar { width: 22px; height: 22px; }
  .lm-transcript { padding: 2px; }
  .lm-turn { padding: 6px 5px; gap: 7px; }
}
@container (max-width: 380px) {
  .lm-detail-top { flex-wrap: wrap; row-gap: 6px; }
  .lm-actions { flex: 1 1 100%; justify-content: flex-end; }
  .lm-search { display: none; }
  .lm-brand-text { display: none; }
  .lm-tab-count { display: none; }
}
`

    function ensureStyles() {
      if (typeof document === 'undefined') return
      const id = 'dsh-lark-minutes-dashboard/styles'
      let tag = document.querySelector(`style[data-plugin-css="${id}"]`)
      if (!tag) {
        tag = document.createElement('style')
        tag.dataset.plugin = 'dsh-lark-minutes-dashboard'
        tag.dataset.pluginCss = id
        document.head.appendChild(tag)
      }
      if (tag.textContent !== CSS) tag.textContent = CSS
    }

    // ---------------------------------------------------------------- icons

    function Svg(props) {
      return h('svg', {
        width: props.size ?? 16,
        height: props.size ?? 16,
        viewBox: props.viewBox ?? '0 0 20 20',
        fill: 'none',
        'aria-hidden': 'true',
        focusable: 'false',
        className: props.className,
        style: props.style,
      }, props.children)
    }

    const stroke = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' }

    function IconWave(props) {
      return h(Svg, props,
        h('path', { d: 'M4 8.3v3.4M6.8 6.2v7.6M9.6 4.4v11.2M12.4 6.2v7.6M15.6 8.3v3.4', ...stroke, strokeWidth: 1.6 }))
    }

    function IconWaveSolid(props) {
      return h(Svg, props,
        h('path', { d: 'M4.2 8.1v3.8M7 5.6v8.8M9.9 7v6M12.8 5.2v9.6M15.7 8.3v3.4', ...stroke, strokeWidth: 1.9 }))
    }

    function IconChat(props) {
      return h(Svg, props,
        h('path', { d: 'M4 5.6h12v7.2H8.9L4.9 15.6v-2.8H4z', ...stroke }),
        h('path', { d: 'M6.8 8.3h6.4M6.8 10.5h4.2', ...stroke, strokeWidth: 1.2 }))
    }

    function IconSearch(props) {
      return h(Svg, props,
        h('circle', { cx: 8.7, cy: 8.7, r: 4.7, ...stroke }),
        h('path', { d: 'M12.2 12.2L16.2 16.2', ...stroke }))
    }

    function IconRefresh(props) {
      return h(Svg, props,
        h('path', { d: 'M15.6 8.2A5.9 5.9 0 1 0 16 10.6', ...stroke }),
        h('path', { d: 'M16.1 4.3v3.9h-3.9', ...stroke }))
    }

    function IconExternal(props) {
      return h(Svg, props,
        h('path', { d: 'M8.4 4.4H5.7A1.7 1.7 0 0 0 4 6.1v8.2A1.7 1.7 0 0 0 5.7 16h8.2a1.7 1.7 0 0 0 1.7-1.7v-2.7', ...stroke }),
        h('path', { d: 'M11.6 3.6h4.8v4.8', ...stroke }),
        h('path', { d: 'M16.4 3.6L9.2 10.8', ...stroke }))
    }

    function IconDoc(props) {
      return h(Svg, props,
        h('path', { d: 'M6 3.4h5l3.6 3.6v9.1a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5V4.9A1.5 1.5 0 0 1 6 3.4z', ...stroke }),
        h('path', { d: 'M10.8 3.6v3.6h3.6', ...stroke }),
        h('path', { d: 'M7.4 12.1l1.9 1.9 3.4-3.7', ...stroke }))
    }

    function IconCheck(props) {
      return h(Svg, props, h('path', { d: 'M4.6 10.4l3.5 3.5 7.3-7.8', ...stroke, strokeWidth: 1.6 }))
    }

    function IconCheckSmall(props) {
      return h(Svg, props, h('path', { d: 'M4.6 10.4l3.5 3.5 7.3-7.8', ...stroke, strokeWidth: 2 }))
    }

    function IconAlert(props) {
      return h(Svg, props,
        h('circle', { cx: 10, cy: 10, r: 6.6, ...stroke }),
        h('path', { d: 'M10 6.6v4.1', ...stroke }),
        h('path', { d: 'M10 13.4h.01', ...stroke, strokeWidth: 1.9 }))
    }

    function IconSparkle(props) {
      return h(Svg, props,
        h('path', { d: 'M10 3.4l1.45 4.05L15.5 8.9l-4.05 1.45L10 14.4 8.55 10.35 4.5 8.9l4.05-1.45L10 3.4z', ...stroke }),
        h('path', { d: 'M15.6 13.1l.55 1.55 1.55.55-1.55.55-.55 1.55-.55-1.55L13.5 15.2l1.55-.55.55-1.55z', ...stroke, strokeWidth: 1.1 }))
    }

    function IconChevron(props) {
      return h(Svg, props, h('path', { d: 'M7.8 4.8l5.2 5.2-5.2 5.2', ...stroke }))
    }

    function IconChevronDown(props) {
      return h(Svg, props, h('path', { d: 'M5.2 7.8L10.4 13l5.2-5.2', ...stroke }))
    }

    function IconBack(props) {
      return h(Svg, props,
        h('path', { d: 'M15.2 10H5', ...stroke }),
        h('path', { d: 'M9.2 5l-4.6 5 4.6 5', ...stroke }))
    }

    function IconClock(props) {
      return h(Svg, props,
        h('circle', { cx: 10, cy: 10, r: 6.4, ...stroke }),
        h('path', { d: 'M10 6.2v4.1l2.8 1.7', ...stroke }))
    }

    function IconUsers(props) {
      return h(Svg, props,
        h('circle', { cx: 8, cy: 7.3, r: 2.6, ...stroke }),
        h('path', { d: 'M3.4 15.4c.3-2.4 2.2-3.8 4.6-3.8s4.3 1.4 4.6 3.8', ...stroke }),
        h('path', { d: 'M13.2 5.2a2.4 2.4 0 0 1 0 4.5M14.2 12c1.4.4 2.3 1.6 2.5 3.4', ...stroke }))
    }

    function IconCopy(props) {
      return h(Svg, props,
        h('rect', { x: 7.2, y: 7.2, width: 8.4, height: 8.4, rx: 1.6, ...stroke }),
        h('path', { d: 'M12.6 7.2V5.8A1.6 1.6 0 0 0 11 4.2H5.8A1.6 1.6 0 0 0 4.2 5.8V11a1.6 1.6 0 0 0 1.6 1.6h1.4', ...stroke }))
    }

    function IconX(props) {
      return h(Svg, props,
        h('path', { d: 'M5.4 5.4l9.2 9.2M14.6 5.4l-9.2 9.2', ...stroke }))
    }

    function IconInbox(props) {
      return h(Svg, props,
        h('path', { d: 'M3.4 11.2h3.1l1.2 2h4.6l1.2-2h3.1v4.1a1.5 1.5 0 0 1-1.5 1.5H4.9a1.5 1.5 0 0 1-1.5-1.5v-4.1z', ...stroke }),
        h('path', { d: 'M4.7 11.2l2.1-6.4a1.2 1.2 0 0 1 1.15-.8h4.1a1.2 1.2 0 0 1 1.15.8l2.1 6.4', ...stroke }))
    }

    function IconSpinner(props) {
      return h(Svg, props,
        h('circle', { cx: 10, cy: 10, r: 6.4, ...stroke, opacity: .25 }),
        h('path', { d: 'M10 3.6a6.4 6.4 0 0 1 6.4 6.4', ...stroke, strokeWidth: 1.7 }))
    }

    // ---------------------------------------------------------------- utils

    function cx(...values) {
      return values.filter(Boolean).join(' ')
    }

    async function api(path, options) {
      const response = await fetch(`${API}${path}`, {
        headers: { 'content-type': 'application/json' },
        ...options,
      })
      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch {
        throw new Error(`接口返回异常（${response.status}）`)
      }
    }

    function pad(n) {
      return String(n).padStart(2, '0')
    }

    function relativeTime(ms) {
      if (!ms) return ''
      const date = new Date(ms)
      const today = new Date()
      const sameDay = date.toDateString() === today.toDateString()
      const yesterday = new Date(today.getTime() - 86400000)
      const isYesterday = date.toDateString() === yesterday.toDateString()
      const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`
      if (sameDay) return `今天 ${hm}`
      if (isYesterday) return `昨天 ${hm}`
      const sameYear = date.getFullYear() === today.getFullYear()
      return sameYear
        ? `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hm}`
        : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    }

    function durationText(ms) {
      if (!ms) return ''
      const minutes = Math.max(1, Math.round(ms / 60000))
      if (minutes < 60) return `${minutes} 分钟`
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest ? `${hours} 小时 ${rest} 分` : `${hours} 小时`
    }

    function syncLabel(ms) {
      if (!ms) return '尚未同步'
      const diff = Date.now() - ms
      if (diff < 60000) return '刚刚同步'
      if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} 分钟前同步`
      return `同步于 ${relativeTime(ms)}`
    }

    // 和「同步」按钮并排用的紧凑写法：只给「刚刚 / 3 分钟前 / 14:03」，避免「同步 同步」
    function syncShort(ms) {
      if (!ms) return ''
      const diff = Date.now() - ms
      if (diff < 60000) return '刚刚'
      if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))} 分钟前`
      return relativeTime(ms)
    }

    function remainingText(expiresAt) {
      const at = Date.parse(String(expiresAt ?? ''))
      if (!Number.isFinite(at)) return ''
      const diff = at - Date.now()
      if (diff <= 0) return '已过期'
      const minutes = Math.round(diff / 60000)
      if (minutes < 60) return `${Math.max(1, minutes)} 分钟后过期`
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      return rest ? `${hours} 小时 ${rest} 分后过期` : `${hours} 小时后过期`
    }

    function formatChars(n) {
      const value = Number(n) || 0
      return value >= 10000 ? `${(value / 10000).toFixed(1)} 万字` : `${value.toLocaleString('zh-CN')} 字`
    }

    function safeHref(value) {
      const url = String(value ?? '').trim()
      return /^https?:\/\//i.test(url) ? url : ''
    }

    function renderInline(text, keyPrefix) {
      const parts = String(text ?? '').split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g)
      return parts.filter(Boolean).map((part, index) => {
        const key = `${keyPrefix}-${index}`
        if (/^\*\*[^*]+\*\*$/.test(part)) return h('strong', { key }, part.slice(2, -2))
        if (/^`[^`]+`$/.test(part)) return h('code', { key }, part.slice(1, -1))
        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
        if (link) {
          const href = safeHref(link[2])
          return href
            ? h('a', { key, href, target: '_blank', rel: 'noreferrer' }, link[1])
            : h(React.Fragment, { key }, link[1])
        }
        return h(React.Fragment, { key }, part)
      })
    }

    function renderMarkdown(markdown) {
      const lines = String(markdown ?? '').split('\n')
      const blocks = []
      let list = null
      let listOrdered = false
      let blockIndex = 0

      const flush = () => {
        if (!list) return
        const items = list
        list = null
        const tag = listOrdered ? 'ol' : 'ul'
        blockIndex += 1
        blocks.push(h(tag, { key: `list-${blockIndex}` }, items.map((item, index) => h('li', {
          key: index,
          style: item.indent ? { marginLeft: item.indent * 14 } : undefined,
        }, renderInline(item.text, `li-${blockIndex}-${index}`)))))
        listOrdered = false
      }

      lines.forEach((raw, index) => {
        const line = raw.replace(/\s+$/, '')
        if (!line.trim()) {
          flush()
          return
        }
        const heading = /^(#{1,3})\s+(.*)$/.exec(line)
        if (heading) {
          flush()
          const level = heading[1].length
          blockIndex += 1
          blocks.push(h(`h${Math.min(3, level + 1)}`, { key: `h-${blockIndex}` }, renderInline(heading[2], `h-${blockIndex}`)))
          return
        }
        const bullet = /^(\s*)[-*]\s+(.+)$/.exec(line)
        if (bullet) {
          const indent = Math.min(3, Math.floor(bullet[1].length / 2))
          if (!list || listOrdered) {
            flush()
            list = []
            listOrdered = false
          }
          list.push({ text: bullet[2], indent })
          return
        }
        const number = /^\s*\d+[.)]\s+(.+)$/.exec(line)
        if (number) {
          if (!list || !listOrdered) {
            flush()
            list = []
            listOrdered = true
          }
          list.push({ text: number[1], indent: 0 })
          return
        }
        const quote = /^>\s?(.*)$/.exec(line)
        if (quote) {
          flush()
          blockIndex += 1
          blocks.push(h('blockquote', { key: `q-${blockIndex}` }, renderInline(quote[1], `q-${blockIndex}`)))
          return
        }
        flush()
        blockIndex += 1
        blocks.push(h('p', { key: `p-${blockIndex}` }, renderInline(line, `p-${blockIndex}`)))
      })
      flush()
      return blocks
    }

    function parseTranscript(raw) {
      const entries = []
      let current = null
      for (const rawLine of String(raw ?? '').split('\n')) {
        const line = rawLine.replace(/\s+$/, '')
        if (!line.trim()) continue
        if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(line)) {
          current = null
          continue
        }
        if (/^keywords?:/i.test(line)) {
          current = null
          continue
        }
        const match = /^(.{1,24}?)\s+(\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)\s*$/.exec(line)
        if (match && !/\d{1,2}:\d{2}:\d{2}/.test(match[1])) {
          current = { who: match[1].trim(), time: match[2], text: '' }
          entries.push(current)
          continue
        }
        if (current) current.text = current.text ? `${current.text} ${line.trim()}` : line.trim()
      }
      return entries.filter((entry) => entry.text)
    }

    function shortTimestamp(value) {
      const match = /^(\d{1,2}):(\d{2}):(\d{2})/.exec(String(value ?? ''))
      if (!match) return ''
      const hours = Number(match[1])
      return hours ? `${hours}:${match[2]}:${match[3]}` : `${Number(match[2])}:${match[3]}`
    }

    const SPEAKER_TONES = ['#4176e6', '#10b981', '#d97706', '#8b5cf6', '#e11d48', '#0d9488']

    function speakerTone(name) {
      let hash = 0
      const text = String(name ?? '')
      for (let index = 0; index < text.length; index += 1) hash = (hash * 31 + text.charCodeAt(index)) >>> 0
      return SPEAKER_TONES[hash % SPEAKER_TONES.length]
    }

    function speakerInitial(name) {
      const text = String(name ?? '').trim()
      if (!text) return '?'
      return /^[a-zA-Z]/.test(text) ? text[0].toUpperCase() : text[0]
    }

    function statusPill(item, working) {
      if (working) return { tone: 'warn', label: '正在整理', live: true }
      if (item.status === 'failed') return { tone: 'err', label: '处理失败' }
      if (item.status === 'skipped') return { tone: 'muted', label: '已跳过' }
      if (isPending(item.status)) {
        if (item.status === 'discovered') return { tone: 'warn', label: '待整理', live: false }
        return { tone: 'warn', label: `正在${STAGE_LABEL[item.status]}`, live: true }
      }
      return { tone: 'ok', label: '已整理' }
    }

    function todoStorageKey(token) {
      return `dsh-lark-minutes:todos:${token}`
    }

    // ---------------------------------------------------------------- shared

    function SkeletonList() {
      return h('div', { style: { padding: '2px 0' } },
        [0, 1, 2, 3, 4].map((index) => h('div', { key: index, className: 'lm-sk-row' },
          h('div', { className: 'lm-sk-line', style: { width: `${64 + (index % 3) * 9}%` } }),
          h('div', { className: 'lm-sk-line', style: { width: `${38 + (index % 2) * 12}%` } }))))
    }

    function SkeletonDetail() {
      return h('div', { className: 'lm-detail' },
        h('div', { className: 'lm-detail-head' },
          h('div', { className: 'lm-detail-head-inner' },
            h('div', { className: 'lm-sk-line', style: { width: '38%', height: 18, borderRadius: 6 } }),
            h('div', { className: 'lm-sk-line', style: { width: '24%', marginTop: 11 } }))),
        h('div', { className: 'lm-detail-scroll' },
          h('div', { className: 'lm-detail-inner' },
            h('div', { className: 'lm-sk-line', style: { width: '100%', height: 72, borderRadius: 10 } }),
            h('div', { style: { marginTop: 24 } },
              [0, 1, 2, 3, 4, 5, 6, 7].map((index) => h('div', {
                key: index,
                className: 'lm-sk-line lm-sk-block',
                style: { width: `${[96, 88, 72, 93, 84, 61, 90, 66][index]}%` },
              }))))))
    }

    function EmptyState(props) {
      return h('div', { className: 'lm-center' },
        h('div', { className: 'lm-empty' },
          h('div', { className: 'lm-empty-mark' }, props.icon || h(IconInbox, { size: 21 })),
          h('div', { className: 'lm-empty-title' }, props.title),
          props.desc ? h('div', { className: 'lm-empty-desc' }, props.desc) : null,
          props.actions ? h('div', { className: 'lm-empty-actions' }, props.actions) : null,
          props.steps ? h('div', { className: 'lm-empty-steps' }, props.steps) : null))
    }

    function Toast(props) {
      const tone = props.toast.tone || 'ok'
      return h('div', { className: 'lm-toast', 'data-tone': tone, role: 'status', 'aria-live': 'polite' },
        tone === 'ok' ? h(IconCheck, { size: 15 })
          : tone === 'err' ? h(IconAlert, { size: 15 })
            : h(IconClock, { size: 15 }),
        h('span', null, props.toast.text))
    }

    // ---------------------------------------------------------------- list row

    function ListRow(props) {
      const item = props.item
      const selected = props.selected
      const time = relativeTime(item.createTime)
      const duration = durationText(item.durationMs)
      // 状态标记统一放在标题右侧（与「文件+对号」同一位置），左侧不再画圆点
      const flag = item.docUrl
        ? { tone: 'ok', icon: IconDoc, title: '已生成纪要文档' }
        : item.status === 'failed'
          ? { tone: 'err', icon: IconAlert, title: item.error || '处理失败' }
          : item.status === 'skipped'
            ? { tone: 'muted', icon: IconClock, title: '已跳过：逐字稿太短' }
            : isPending(item.status)
              ? {
                tone: 'warn',
                icon: item.status === 'discovered' ? IconSparkle : IconSpinner,
                title: item.status === 'discovered' ? '待整理' : (STAGE_LABEL[item.status] || '处理中'),
              }
              : null
      return h('button', {
        type: 'button',
        id: `lm-row-${item.token}`,
        className: 'lm-row',
        title: item.status === 'failed' ? (item.error || '处理失败') : (item.oneLiner || item.title),
        'aria-current': selected ? 'true' : undefined,
        onClick: () => props.onSelect(item.token),
        onKeyDown: (event) => props.onKeyDown(event, item),
      },
      // 网格：图标占第一列，元信息与标题都从第二列起笔，标题自然和日期左对齐
      flag
        ? h('span', { className: 'lm-row-flag', 'data-tone': flag.tone, title: flag.title },
          h(flag.icon, {
            size: 13,
            className: flag.icon === IconSpinner ? 'lm-spin' : undefined,
          }))
        : null,
      h('span', { className: 'lm-row-meta' },
        time ? h('span', { className: 'lm-row-time' }, time) : null,
        time && duration ? h('span', { className: 'lm-row-sep' }, '·') : null,
        duration ? h('span', { className: 'lm-row-dur' }, duration) : null),
      h('span', { className: 'lm-row-title' }, item.title))
    }

    // ---------------------------------------------------------------- detail

    function ProgressCard(props) {
      const stage = props.stage
      const steps = ['读取逐字稿', '生成标题与纪要', '写入飞书文档与索引']
      const active = stage === 'fetching' ? 0 : stage === 'summarizing' ? 1 : stage === 'delivering' ? 2 : 0
      const rows = steps.map((label, index) => h('div', {
        key: label,
        className: 'lm-step',
        'data-state': index < active ? 'done' : index === active ? 'active' : 'todo',
      },
      h('span', { className: 'lm-step-mark' }, index < active ? h(IconCheckSmall, { size: 10 }) : null),
      h('span', null, label),
      index < active ? h('span', { className: 'lm-step-note' }, '完成') : null))
      return h('div', { className: 'lm-progress', role: 'status', 'aria-live': 'polite' },
        h('div', { className: 'lm-progress-head' },
          h('span', { className: 'lm-progress-spinner' }, h(IconSpinner, { size: 13, className: 'lm-spin' })),
          h('div', null,
            h('div', { className: 'lm-progress-title' }, '正在生成纪要'),
            h('div', { className: 'lm-progress-hint' }, '基于完整逐字稿生成标题、结论与分节纪要，通常需要 20–60 秒。'))),
        h('div', { className: 'lm-bar' }, h('span')),
        h('div', { className: 'lm-steps' }, rows))
    }

    function FailureCard(props) {
      const item = props.item
      const note = props.hasContent
        ? '上次生成的纪要已保留，这次失败只影响本次更新。'
        : item.transcriptChars
          ? `逐字稿已保存在本地（${formatChars(item.transcriptChars)}），可以直接重试，不必重新读取妙记。`
          : '可以直接重试；如果反复失败，先检查飞书登录状态和文档权限。'
      return h('div', { className: 'lm-fail' },
        h('div', { className: 'lm-fail-head' }, h(IconAlert, { size: 16 }), '这次没有整理成功'),
        h('div', { className: 'lm-fail-body' },
          h('div', { className: 'lm-fail-text' }, item.error || '未知错误'),
          h('div', { className: 'lm-fail-actions' },
            h('button', {
              type: 'button',
              className: 'lm-btn lm-btn-outline',
              onClick: props.onProcess,
              disabled: props.busy || props.busyElsewhere,
              title: props.busyElsewhere ? '正在整理另一条妙记，请稍候' : '重试整理',
            }, props.busy ? h(IconSpinner, { size: 14, className: 'lm-spin' }) : h(IconRefresh, { size: 14 }), props.busy ? '重试中…' : '重试整理')),
          h('div', { className: 'lm-fail-note' }, note)))
    }

    function StartCard(props) {
      return h(EmptyState, {
        title: '这条妙记还没整理',
        desc: '基于完整逐字稿生成标题、一句话结论和分节纪要，并写入飞书文档。',
        icon: h(IconSparkle, { size: 21 }),
        actions: [
          h('button', {
            key: 'start',
            type: 'button',
            className: 'lm-btn lm-btn-primary',
            onClick: props.onProcess,
            disabled: props.busy,
            title: props.busy ? '正在整理，请稍候' : '生成纪要',
          }, props.busy ? h(IconSpinner, { size: 14, className: 'lm-spin' }) : h(IconSparkle, { size: 14 }), props.busy ? '正在整理…' : '生成纪要'),
        ],
      })
    }

    function TranscriptBlock(props) {
      const [expanded, setExpanded] = useState(false)
      const [visible, setVisible] = useState(80)
      if (!props.raw && !props.chars) return null
      const turns = props.turns
      const shown = turns.slice(0, visible)
      const rest = turns.length - shown.length
      const label = turns.length
        ? `${turns.length} 段${props.speakers.length ? ` · ${props.speakers.length} 位发言人` : ''} · ${formatChars(props.chars)}`
        : formatChars(props.chars)
      return h('div', { className: 'lm-section' },
        h('div', { className: 'lm-transcript-head' },
          h('button', {
            type: 'button',
            className: 'lm-transcript-toggle',
            'aria-expanded': expanded ? 'true' : 'false',
            onClick: () => {
              setExpanded(!expanded)
              if (!expanded) setVisible(80)
            },
          },
          h(IconChevron, { size: 13, className: 'lm-chevron' }),
          h('span', null, '逐字稿'),
          h('span', { className: 'lm-transcript-meta' }, label)),
          props.raw
            ? h('button', {
              type: 'button',
              className: 'lm-btn lm-icon-btn lm-transcript-copy',
              title: '复制逐字稿',
              'aria-label': '复制逐字稿',
              onClick: props.onCopy,
            }, h(IconCopy, { size: 14 }))
            : null),
        expanded
          ? h('div', { className: 'lm-transcript' },
            turns.length
              ? h('div', { className: 'lm-transcript-body' },
                shown.map((turn, index) => h('div', { key: index, className: 'lm-turn' },
                  h('span', {
                    className: 'lm-avatar',
                    style: { '--tone': speakerTone(turn.who) },
                  }, speakerInitial(turn.who)),
                  h('div', { className: 'lm-turn-main' },
                    h('div', { className: 'lm-turn-head' },
                      h('span', { className: 'lm-turn-who' }, turn.who),
                      h('span', { className: 'lm-turn-time' }, shortTimestamp(turn.time))),
                    h('div', { className: 'lm-turn-text' }, turn.text)))),
                rest > 0
                  ? h('button', {
                    type: 'button',
                    className: 'lm-transcript-more',
                    onClick: () => setVisible((value) => value + 200),
                  }, `继续显示剩余 ${rest} 段`)
                  : null)
              : h('div', { style: { padding: '14px 12px', fontSize: 12, color: 'var(--lm-text-3)' } },
                props.raw ? '逐字稿格式无法解析，已按原文展示。' : '本地没有留存逐字稿。'),
            !turns.length && props.raw
              ? h('pre', { style: { margin: '0 8px 8px', whiteSpace: 'pre-wrap', fontSize: 11.5, lineHeight: 1.7, color: 'var(--lm-text-2)', fontFamily: 'var(--lm-mono)', maxHeight: 300, overflow: 'auto' } }, props.raw)
              : null)
          : null)
    }

    function DetailContent(props) {
      const detail = props.detail
      const item = detail.item
      const generated = detail.generated
      const transcriptRaw = detail.transcript || ''
      const turns = useMemo(() => parseTranscript(transcriptRaw), [transcriptRaw])
      const [doneTodos, setDoneTodos] = useState({})

      useEffect(() => {
        let stored = {}
        try {
          stored = JSON.parse(localStorage.getItem(todoStorageKey(item.token)) || '{}') || {}
        } catch {
          stored = {}
        }
        setDoneTodos(stored)
      }, [item.token])

      const toggleTodo = useCallback((index) => {
        setDoneTodos((previous) => {
          const next = { ...previous, [index]: !previous[index] }
          try {
            localStorage.setItem(todoStorageKey(item.token), JSON.stringify(next))
          } catch {}
          return next
        })
      }, [item.token])

      const todos = Array.isArray(generated.todos) ? generated.todos : []
      const topics = Array.isArray(generated.topics) ? generated.topics : []
      const doneCount = todos.filter((todo, index) => doneTodos[index]).length
      const model = detail.model || ''
      const updatedAt = detail.updatedAt ? new Date(detail.updatedAt) : null

      return h(React.Fragment, null,
        generated.oneLiner
          ? h('div', { className: 'lm-quote' },
            h('div', { className: 'lm-quote-label' }, '一句话'),
            h('div', { className: 'lm-quote-text' }, generated.oneLiner))
          : null,
        h('div', { className: 'lm-md' }, renderMarkdown(generated.summaryMd)),
        todos.length
          ? h('div', { className: 'lm-section' },
            h('div', { className: 'lm-section-head' },
              h('span', { className: 'lm-section-title' }, '待办'),
              h('span', { className: 'lm-count' }, doneCount ? `${doneCount}/${todos.length}` : String(todos.length))),
            h('div', { className: 'lm-todos' }, todos.map((todo, index) => h('div', {
              key: index,
              className: 'lm-todo',
              'data-done': doneTodos[index] ? 'true' : 'false',
            },
            h('button', {
              type: 'button',
              className: 'lm-check',
              'aria-label': doneTodos[index] ? '标记为未完成' : '标记为完成',
              'aria-pressed': doneTodos[index] ? 'true' : 'false',
              onClick: () => toggleTodo(index),
            }, doneTodos[index] ? h(IconCheckSmall, { size: 10 }) : null),
            h('div', { className: 'lm-todo-main' },
              h('span', { className: 'lm-todo-text' }, todo.what || ''),
              todo.who ? h('span', { className: 'lm-tag' }, todo.who) : null,
              todo.due
                ? h('span', { className: 'lm-tag', 'data-kind': 'due' }, h(IconClock, { size: 10 }), todo.due)
                : null)))))
          : null,
        topics.length
          ? h('div', { className: 'lm-section' },
            h('div', { className: 'lm-section-head' }, h('span', { className: 'lm-section-title' }, '主题')),
            h('div', { className: 'lm-chips' }, topics.map((topic, index) => h('span', { key: index, className: 'lm-chip' }, topic))))
          : null,
        h(TranscriptBlock, {
          turns,
          raw: transcriptRaw,
          chars: item.transcriptChars || transcriptRaw.length,
          speakers: item.speakers || [],
          onCopy: props.onCopyTranscript,
        }),
        h('div', { className: 'lm-foot' },
          model ? h('span', { className: 'lm-foot-item' }, `模型 ${model}`) : null,
          generated.fromDoc ? h('span', { className: 'lm-foot-item' }, '正文回读自飞书文档') : null,
          (item.transcriptChars && !transcriptRaw)
            ? h('span', { className: 'lm-foot-item' }, `逐字稿 ${formatChars(item.transcriptChars)} 未留存`)
            : null,
          item.originalTitle && item.originalTitle !== item.title
            ? h('span', { className: 'lm-foot-item' }, `原名「${item.originalTitle}」`)
            : null,
          // 妙记链接只在头部操作区出现一次，这里不再重复
          updatedAt ? h('span', { className: 'lm-foot-item' }, `更新于 ${relativeTime(updatedAt.getTime())}`) : null))
    }

    function Detail(props) {
      const detail = props.detail
      const state = props.state
      const item = detail?.item

      if (!item) {
        if (props.loading) return SkeletonDetail()
        return h(EmptyState, {
          title: '从左侧选一条妙记',
          desc: '选中的妙记会在这里显示标题、一句话结论、分节纪要和完整逐字稿。',
          icon: h(IconWaveSolid, { size: 21 }),
        })
      }

      const generated = detail.generated
      const working = props.working === item.token
      const serverProcessing = item.status === 'fetching' || item.status === 'summarizing' || item.status === 'delivering'
      const processing = working || serverProcessing
      const busyElsewhere = Boolean(props.busyAny) && !processing
      const pill = statusPill(item, processing && !serverProcessing ? true : working)
      const meta = [
        h('span', { key: 'time', className: 'lm-meta-item' }, h(IconClock, { size: 12 }), relativeTime(item.createTime) || '时间未知'),
        item.durationMs ? h('span', { key: 'dur', className: 'lm-meta-item' }, durationText(item.durationMs)) : null,
        item.speakers?.length
          ? h('span', { key: 'spk', className: 'lm-meta-item' }, h(IconUsers, { size: 12 }), `${item.speakers.length} 位发言人`)
          : null,
      ].filter(Boolean)

      // 交付徽标只表达状态：跳转入口统一放在头部操作区，避免同一个链接在一屏里出现两次
      const delivery = []
      if (item.docUrl) {
        delivery.push(h('span', { key: 'doc', className: 'lm-del' },
          h(IconCheck, { size: 11 }),
          h('span', null, item.adoptedAt ? '纪要在其他设备已生成' : '纪要文档已生成')))
      } else if (!isPending(item.status) && item.status !== 'failed') {
        delivery.push(h('span', { key: 'nodoc', className: 'lm-del', 'data-tone': 'muted' }, h(IconDoc, { size: 11 }), '未生成纪要文档'))
      }
      if (item.docUrl && item.titleWrittenBack) {
        delivery.push(h('span', { key: 'title', className: 'lm-del' }, h(IconCheck, { size: 11 }), '标题已写回'))
      }
      if (item.docUrl && state?.index?.url) {
        delivery.push(h('span', { key: 'index', className: 'lm-del' },
          h(IconCheck, { size: 11 }),
          h('span', null, '索引已更新')))
      }

      const progressStage = serverProcessing
        ? item.status
        : item.status === 'discovered' || item.status === 'ready'
          ? 'fetching'
          : item.status
      const content = generated
        ? h(DetailContent, {
          key: item.token,
          detail,
          onCopyTranscript: props.onCopyTranscript,
        })
        : null
      // 走到这里说明「文档存在但正文没读回来」（接口失败/无权限/文档被清空）
      const adoptedCard = !generated && item.docUrl
        ? h(EmptyState, {
          title: '没能读回纪要正文',
          desc: detail.hydrateError
            ? `已找到飞书文档，但读取失败：${detail.hydrateError}`
            : '已找到飞书文档，但这次没读到正文，可以重试一次。',
          icon: h(IconAlert, { size: 21 }),
          actions: h('div', { className: 'lm-actions' },
            h('button', {
              type: 'button',
              className: 'lm-btn lm-btn-primary',
              onClick: props.onReload,
              disabled: props.loading,
            }, props.loading ? h(IconSpinner, { size: 14, className: 'lm-spin' }) : h(IconRefresh, { size: 14 }), '重新拉取'),
            h('a', {
              className: 'lm-btn lm-btn-quiet',
              href: item.docUrl,
              target: '_blank',
              rel: 'noreferrer',
            }, h(IconDoc, { size: 14 }), '打开飞书文档'),
            h('button', {
              type: 'button',
              className: 'lm-btn lm-btn-quiet',
              onClick: props.onProcess,
              disabled: processing || busyElsewhere,
              title: '在本机重新生成，会覆盖同一篇飞书文档',
            }, h(IconSparkle, { size: 14 }), '本机重新生成')),
        })
        : null
      const body = processing
        ? h(ProgressCard, { stage: progressStage })
        : item.status === 'failed'
          ? h('div', null,
            h(FailureCard, {
              item,
              busy: processing,
              busyElsewhere,
              hasContent: Boolean(generated),
              onProcess: props.onProcess,
            }),
            content)
          : item.status === 'skipped'
            ? h(EmptyState, {
              title: '这段录音太短，已跳过',
              desc: '逐字稿不足 200 字，通常不值得单独整理。你仍然可以打开妙记听原文。',
              icon: h(IconClock, { size: 21 }),
              actions: item.url
                ? h('a', {
                  className: 'lm-btn lm-btn-primary',
                  href: item.url,
                  target: '_blank',
                  rel: 'noreferrer',
                }, h(IconExternal, { size: 14 }), '打开妙记')
                : null,
            })
            : content || adoptedCard || h(StartCard, {
              busy: processing || busyElsewhere,
              onProcess: props.onProcess,
            })

      const canProcess = !processing && !busyElsewhere && item.status !== 'skipped'
      const actionLabel = processing
        ? '处理中'
        : item.status === 'failed'
          ? '重试整理'
          : generated || item.docUrl
            ? '重新生成'
            : '生成纪要'
      const canSend = Boolean(item.docUrl || generated) && item.status !== 'skipped'
      const actions = h('div', { className: 'lm-actions' },
        item.url
          ? h('a', {
            className: 'lm-btn lm-btn-quiet',
            href: item.url,
            target: '_blank',
            rel: 'noreferrer',
            title: '打开妙记',
            'aria-label': '打开妙记',
          }, h(IconExternal, { size: 14 }), h('span', { className: 'lm-btn-label' }, '妙记'))
          : null,
        item.docUrl
          ? h('a', {
            className: 'lm-btn lm-btn-quiet',
            href: item.docUrl,
            target: '_blank',
            rel: 'noreferrer',
            title: '打开纪要文档',
            'aria-label': '打开纪要文档',
          }, h(IconDoc, { size: 14 }), h('span', { className: 'lm-btn-label' }, '纪要'))
          : null,
        item.status === 'skipped'
          ? null
          : h('button', {
            type: 'button',
            className: canSend ? 'lm-btn lm-btn-quiet' : 'lm-btn lm-btn-primary',
            onClick: props.onProcess,
            disabled: !canProcess,
            title: processing
              ? '正在整理这条妙记，请稍候'
              : busyElsewhere
                ? '正在整理另一条妙记，请稍候'
                : item.status === 'failed'
                  ? '重新整理这条妙记'
                  : generated
                    ? '重新生成纪要'
                    : '生成纪要',
          },
          processing
            ? h(IconSpinner, { size: 14, className: 'lm-spin' })
            : item.status === 'failed'
              ? h(IconRefresh, { size: 14 })
              : h(IconSparkle, { size: 14 }),
          h('span', null, actionLabel)),
        // 主动作固定贴在操作区最右侧
        canSend
          ? h('button', {
            type: 'button',
            className: 'lm-btn lm-btn-primary',
            onClick: () => props.onSendToChat(item.token),
            disabled: Boolean(props.sending) || processing,
            title: '在新会话里打开：两份 md 附件（总结 + 逐字稿）+ 预填提示词，不会自动发送',
          },
          props.sending === item.token
            ? h(IconSpinner, { size: 14, className: 'lm-spin' })
            : h(IconChat, { size: 14 }),
          h('span', { className: 'lm-btn-label' }, '发送到对话'))
          : null)

      const metaRow = h('div', { className: 'lm-detail-meta' },
        meta.map((node, index) => h(React.Fragment, { key: index }, index ? h('span', { className: 'lm-sep' }) : null, node)),
        meta.length ? h('span', { className: 'lm-sep' }) : null,
        h('span', {
          className: 'lm-pill',
          'data-tone': pill.tone,
          'data-live': pill.live ? 'true' : undefined,
        }, h('span', { className: 'lm-pill-dot' }), pill.label))

      const head = h('div', { className: 'lm-detail-head' },
        h('div', { className: 'lm-detail-head-inner' },
        h('div', { className: 'lm-detail-top' },
          h('button', {
            type: 'button',
            className: 'lm-btn lm-icon-btn lm-back',
            title: '返回列表',
            'aria-label': '返回列表',
            onClick: props.onBack,
          }, h(IconBack, { size: 16 })),
          h('h2', { className: 'lm-detail-title', title: item.title }, item.title),
          actions),
        metaRow,
        delivery.length ? h('div', { className: 'lm-delivery' }, delivery) : null))

      return h('div', { className: 'lm-detail' },
        head,
        h('div', { className: 'lm-detail-scroll', ref: props.scrollRef },
          h('div', { className: 'lm-detail-inner' }, body)))
    }

    // ---------------------------------------------------------------- panel

    function Panel() {
      ensureStyles()
      const [state, setState] = useState(null)
      const [listData, setListData] = useState({ items: [], total: 0, counts: null })
      const [selected, setSelected] = useState('')
      const [detail, setDetail] = useState(null)
      const [loadingDetail, setLoadingDetail] = useState(false)
      const [syncing, setSyncing] = useState(false)
      const [sending, setSending] = useState('')
      const [working, setWorking] = useState('')
      const [error, setError] = useState('')
      const [toast, setToast] = useState(null)
      const [tick, setTick] = useState(0)
      const [query, setQuery] = useState('')
      const [filter, setFilter] = useState('all')
      const [mobileDetail, setMobileDetail] = useState(false)
      const selectedRef = useRef('')
      const workingRef = useRef('')
      const sendingRef = useRef('')
      const syncingRef = useRef(false)
      const listRef = useRef(null)
      const detailScrollRef = useRef(null)
      const searchRef = useRef(null)
      const queryRef = useRef('')
      const rootRef = useRef(null)

      useEffect(() => {
        selectedRef.current = selected
      }, [selected])

      useEffect(() => {
        queryRef.current = query
      }, [query])

      const pushToast = useCallback((tone, text) => {
        setToast({ tone, text, at: Date.now() })
      }, [])

      // list + plugin state
      useEffect(() => {
        let alive = true
        function load() {
          // The list is the critical path; auth status runs against lark-cli and
          // can be slow, so it must not hold the list back.
          const listTask = api('/list')
            .then((listRes) => {
              if (!alive) return
              if (listRes?.ok) {
                setListData({
                  items: Array.isArray(listRes.items) ? listRes.items : [],
                  total: listRes.total || 0,
                  counts: listRes.counts || null,
                })
                setError('')
                setSelected((previous) => previous || (listRes.items?.[0]?.token ?? ''))
              } else {
                setError(listRes?.error || '读取列表失败')
              }
            })
            .catch((loadError) => {
              if (alive) setError(loadError.message)
            })
          const stateTask = api('/state')
            .then((stateRes) => {
              if (alive && stateRes?.ok !== false) setState(stateRes)
            })
            .catch(() => {})
          return Promise.allSettled([listTask, stateTask])
        }
        load()
        const timer = setInterval(load, 20000)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [tick])

      // detail
      useEffect(() => {
        if (!selected) {
          setDetail(null)
          return undefined
        }
        let alive = true
        setLoadingDetail(true)
        setDetail((previous) => (previous?.item?.token === selected ? previous : null))
        api(`/item?token=${encodeURIComponent(selected)}`)
          .then((result) => {
            if (!alive) return
            if (result.ok) {
              setDetail(result)
              setError('')
            } else {
              setError(result.error || '读取详情失败')
            }
          })
          .catch((fetchError) => {
            if (alive) setError(fetchError.message)
          })
          .finally(() => {
            if (alive) setLoadingDetail(false)
          })
        return () => {
          alive = false
        }
      }, [selected, tick])

      // keep progress fresh while a record is being processed
      useEffect(() => {
        if (!working) return undefined
        const token = working
        let alive = true
        const timer = setInterval(async () => {
          try {
            const [detailRes, listRes] = await Promise.all([
              api(`/item?token=${encodeURIComponent(token)}`),
              api('/list'),
            ])
            if (!alive) return
            if (detailRes?.ok && selectedRef.current === token) setDetail(detailRes)
            if (listRes?.ok) {
              setListData({
                items: Array.isArray(listRes.items) ? listRes.items : [],
                total: listRes.total || 0,
                counts: listRes.counts || null,
              })
            }
          } catch {}
        }, 2500)
        return () => {
          alive = false
          clearInterval(timer)
        }
      }, [working])

      // toast auto dismiss
      useEffect(() => {
        if (!toast) return undefined
        const timer = setTimeout(() => setToast(null), 3800)
        return () => clearTimeout(timer)
      }, [toast])

      // a new record starts reading from the top
      useEffect(() => {
        if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0
      }, [selected])

      // a new filter/search starts from the top of the list
      useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = 0
      }, [filter, query])

      // ⌘K / "/" search, Esc — only while the panel is the visible surface
      useEffect(() => {
        function onKeyDown(event) {
          const root = rootRef.current
          if (!root || root.offsetParent === null) return
          const active = document.activeElement
          const inside = root.contains(active) || active === document.body
          if (!inside) return
          const modifier = event.metaKey || event.ctrlKey
          if (modifier && (event.key === 'k' || event.key === 'K')) {
            event.preventDefault()
            searchRef.current?.focus()
            searchRef.current?.select?.()
            return
          }
          if (event.key === '/' && active !== searchRef.current) {
            const tag = String(active?.tagName || '').toLowerCase()
            if (tag === 'input' || tag === 'textarea' || active?.isContentEditable) return
            event.preventDefault()
            searchRef.current?.focus()
            return
          }
          if (event.key === 'Escape' && active === searchRef.current) {
            if (queryRef.current) {
              setQuery('')
            } else {
              searchRef.current?.blur()
            }
          }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [])

      const items = listData.items
      const total = listData.total || items.length
      const counts = useMemo(() => {
        if (listData.counts && items.length >= total) {
          return {
            all: listData.counts.all ?? total,
            pending: listData.counts.pending ?? 0,
            ready: listData.counts.ready ?? 0,
            failed: listData.counts.failed ?? 0,
          }
        }
        const local = { all: items.length, pending: 0, ready: 0, failed: 0 }
        for (const item of items) {
          if (item.status === 'failed') local.failed += 1
          else if (item.status === 'ready') local.ready += 1
          else local.pending += 1
        }
        return local
      }, [listData, items, total])

      const matched = useMemo(() => {
        const keyword = query.trim().toLowerCase()
        return items.filter((item) => {
          if (filter === 'pending' && !(isPending(item.status) || item.status === 'skipped')) return false
          if (filter === 'ready' && item.status !== 'ready') return false
          if (filter === 'failed' && item.status !== 'failed') return false
          if (!keyword) return true
          const haystack = `${item.title} ${item.originalTitle} ${item.oneLiner} ${item.error || ''}`.toLowerCase()
          return haystack.includes(keyword)
        })
      }, [items, filter, query])

      // 「最新」就是窗口内发现的全部记录（Host 已经按时间窗口过滤过），
      // 不再按条数分页；筛选和搜索只是在同一批记录上收敛。
      const searching = filter !== 'all' || Boolean(query.trim())
      const visible = matched

      // when narrowing the list, keep a visible selection
      useEffect(() => {
        if (!visible.length) return
        if (!visible.some((item) => item.token === selected)) {
          setSelected(visible[0].token)
          setMobileDetail(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [filter, query])

      const selectItem = useCallback((token) => {
        setSelected(token)
        setMobileDetail(true)
      }, [])

      const onRowKeyDown = useCallback((event, item) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
        event.preventDefault()
        const index = visible.findIndex((row) => row.token === item.token)
        if (index < 0) return
        let nextIndex = index
        if (event.key === 'ArrowDown') nextIndex = Math.min(visible.length - 1, index + 1)
        if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1)
        if (event.key === 'Home') nextIndex = 0
        if (event.key === 'End') nextIndex = visible.length - 1
        const next = visible[nextIndex]
        if (!next || next.token === item.token) return
        setSelected(next.token)
        requestAnimationFrame(() => {
          const node = document.getElementById(`lm-row-${next.token}`)
          node?.focus()
          node?.scrollIntoView({ block: 'nearest' })
        })
      }, [visible])

      const syncNow = useCallback(async () => {
        if (syncingRef.current) return
        syncingRef.current = true
        setSyncing(true)
        setError('')
        try {
          const result = await api('/sync', { method: 'POST', body: '{}' })
          if (!result.ok) {
            setError(result.error || '同步失败')
            pushToast('err', result.error || '同步失败')
          } else {
            pushToast('ok', result.added ? `同步完成，新增 ${result.added} 篇妙记` : '已是最新，无新增妙记')
          }
          setTick((value) => value + 1)
        } catch (syncError) {
          setError(syncError.message)
          pushToast('err', syncError.message)
        } finally {
          syncingRef.current = false
          setSyncing(false)
        }
      }, [pushToast])

      const runProcess = useCallback(async () => {
        const token = selectedRef.current
        if (!token || workingRef.current) return
        workingRef.current = token
        setWorking(token)
        setError('')
        setListData((previous) => ({
          ...previous,
          items: previous.items.map((row) => (row.token === token ? { ...row, status: 'fetching' } : row)),
        }))
        setDetail((previous) => (
          previous && previous.item?.token === token
            ? { ...previous, item: { ...previous.item, status: 'fetching' } }
            : previous
        ))
        try {
          const result = await api('/process', { method: 'POST', body: JSON.stringify({ token }) })
          if (!result.ok) {
            setError(result.error || '处理失败')
            pushToast('err', result.error || '处理失败')
          } else if (result.skipped) {
            pushToast('warn', '逐字稿太短，已跳过这条妙记')
          } else {
            pushToast('ok', '纪要已生成，并写入飞书文档与索引')
          }
          setTick((value) => value + 1)
        } catch (processError) {
          setError(processError.message)
          pushToast('err', processError.message)
        } finally {
          workingRef.current = ''
          setWorking('')
        }
      }, [pushToast])

      const sendToChat = useCallback(async (token) => {
        if (sendingRef.current) return
        sendingRef.current = token
        setSending(token)
        try {
          const exported = await api('/export', { method: 'POST', body: JSON.stringify({ token }) })
          if (!exported?.ok) {
            const message = String(exported?.error || '导出会议文件失败')
            // 典型的「客户端已更新、Host 还是旧进程」：旧版没有这个路由
            if (message.includes('unknown route')) throw new Error('DSH 还在运行旧版插件（Host 半没有热更新），重启 DSH 后再试')
            throw new Error(message)
          }
          trace('exported', `${exported.summaryName} / ${exported.transcriptName} / ${exported.transcriptChars} chars`)
          const [summaryBlob, transcriptBlob] = await Promise.all([
            fetchExportFile(token, 'summary'),
            fetchExportFile(token, 'transcript'),
          ])
          trace('downloaded', `${summaryBlob.size} + ${transcriptBlob.size} bytes`)
          const files = [
            new File([summaryBlob], exported.summaryName, { type: 'text/markdown' }),
            new File([transcriptBlob], exported.transcriptName, { type: 'text/markdown' }),
          ]
          await openMeetingChat(files, exported.prompt)
          trace('done', 'ok')
          pushToast('ok', '已在新会话里放好两份附件，补上你的问题就能发')
        } catch (error) {
          trace('error', error?.message || String(error))
          pushToast('err', error?.message || '发送到对话失败')
        } finally {
          sendingRef.current = ''
          setSending('')
        }
      }, [pushToast])

      const copyTranscript = useCallback(async () => {
        const raw = detail?.transcript || ''
        if (!raw) {
          pushToast('warn', '本地没有留存逐字稿')
          return
        }
        try {
          await navigator.clipboard.writeText(raw)
          pushToast('ok', '逐字稿已复制')
        } catch {
          pushToast('err', '复制失败，请手动选择文本复制')
        }
      }, [detail, pushToast])

      const auth = state?.auth
      // 登录正常时不展示身份（名字/绿点属噪音）；失效才提示一句，原因放 tooltip
      const authBroken = auth ? auth.ok === false : false
      const authTitle = !auth
        ? '正在读取 lark-cli 登录状态'
        : auth.ok
          ? [auth.name, remainingText(auth.expiresAt)].filter(Boolean).join(' · ')
          : (auth.message || '请在终端运行 lark-cli auth login 重新登录')
      const syncText = syncLabel(state?.lastSync)
      const syncBadge = !state
        ? ''
        : state.lastError
          ? '上次失败'
          : syncShort(state.lastSync)

      const showEmpty = !items.length && !error
      const noItems = !items.length && Boolean(state || error)
      const solo = !visible.length && Boolean(state || error)
      const selectedItem = detail?.item || items.find((item) => item.token === selected)
      const narrowDetail = mobileDetail && Boolean(selectedItem)

      return h('div', {
        ref: rootRef,
        className: 'lm-root',
        'data-mobile-detail': narrowDetail ? 'true' : 'false',
        'data-empty': noItems ? 'true' : 'false',
        'data-solo': solo ? 'true' : 'false',
      },
      h('div', { className: 'lm-head' },
        h('div', { className: 'lm-brand' },
          h('span', { className: 'lm-brand-mark' }, h(IconWaveSolid, { size: 16 })),
          h('div', { className: 'lm-brand-text' },
            h('span', { className: 'lm-brand-title' }, '妙记工作台'))),
        h('div', { className: 'lm-head-spacer' }),
        h('label', { className: 'lm-search' },
          h('span', { className: 'lm-search-icon' }, h(IconSearch, { size: 14 })),
          h('input', {
            ref: searchRef,
            type: 'search',
            value: query,
            placeholder: '搜索标题或结论',
            'aria-label': '搜索妙记',
            title: '搜索全部已发现的妙记（标题、结论、错误）',
            onChange: (event) => setQuery(event.target.value),
          }),
          query
            ? h('button', {
              type: 'button',
              className: 'lm-search-clear',
              title: '清除搜索',
              'aria-label': '清除搜索',
              onClick: () => {
                setQuery('')
                searchRef.current?.focus()
              },
            }, h(IconX, { size: 12 }))
            : h('span', { className: 'lm-kbd' }, '⌘K')),
        state?.index?.url ? h('a', {
          className: 'lm-btn lm-btn-link',
          href: state.index.url,
          target: '_blank',
          rel: 'noreferrer',
          title: '妙记与纪要对照表',
          'aria-label': '打开妙记与纪要对照表',
        }, h(IconDoc, { size: 14 }), h('span', { className: 'lm-btn-label' }, '索引')) : null,
        h('button', {
          type: 'button',
          className: cx('lm-btn', 'lm-btn-quiet', 'lm-sync', state?.lastError ? 'lm-sync-failed' : null),
          onClick: syncNow,
          disabled: syncing,
          // 状态和动作放在同一个控件上：失败时这里就是「重试同步」
          title: syncing
            ? '正在同步…'
            : state?.lastError
              ? `上次同步失败：${state.lastError}\n点击重试`
              : state?.lastWarning
                ? `${state.lastWarning}\n点击再同步一次`
                : `立即同步（${syncText}）`,
          'aria-label': state?.lastError ? '重试同步' : '立即同步',
        },
        syncing
          ? h(IconSpinner, { size: 14, className: 'lm-spin' })
          : state?.lastError
            ? h(IconAlert, { size: 14 })
            : h(IconRefresh, { size: 14 }),
        h('span', { className: 'lm-btn-label' }, syncing ? '同步中' : state?.lastError ? '重试同步' : '同步'),
        syncBadge
          ? h('span', {
            className: 'lm-tool-meta lm-sync-state',
            'data-tone': state?.lastError ? 'err' : state?.lastWarning ? 'warn' : 'muted',
          }, `· ${syncBadge}`)
          : null)),
      h('div', { className: 'lm-tools' },
        h('div', { className: 'lm-tabs', role: 'tablist', 'aria-label': '按状态筛选' },
          FILTERS.map((entry, index) => h('button', {
            key: entry.id,
            type: 'button',
            role: 'tab',
            className: 'lm-tab',
            'aria-selected': filter === entry.id ? 'true' : 'false',
            tabIndex: filter === entry.id ? 0 : -1,
            onClick: () => setFilter(entry.id),
            onKeyDown: (event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              event.preventDefault()
              const step = event.key === 'ArrowRight' ? 1 : -1
              const next = FILTERS[(index + step + FILTERS.length) % FILTERS.length]
              setFilter(next.id)
              requestAnimationFrame(() => {
                const tabs = rootRef.current?.querySelectorAll('.lm-tab') ?? []
                const target = tabs[FILTERS.findIndex((item) => item.id === next.id)]
                target?.focus()
              })
            },
          }, entry.label, h('span', { className: 'lm-tab-count' }, String(counts[entry.id] ?? 0))))),
        h('div', { className: 'lm-tools-spacer' }),
        authBroken
          ? h('span', { className: 'lm-auth-warn', title: authTitle },
            h(IconAlert, { size: 12 }), '登录失效')
          : null),
      error
        ? h('div', { className: 'lm-banner', 'data-tone': auth?.ok === false ? 'warn' : undefined },
          h('span', { className: 'lm-banner-icon' }, h(IconAlert, { size: 15 })),
          h('div', { className: 'lm-banner-body' },
            h('div', { className: 'lm-banner-title' }, auth?.ok === false ? '飞书登录已失效' : '操作没有完成'),
            h('div', { className: 'lm-banner-text' }, error),
            auth?.ok === false
              ? h('div', { className: 'lm-banner-text' }, '在终端运行 lark-cli auth login 完成登录，然后点“重试”。')
              : null),
          h('div', { className: 'lm-banner-actions' },
            h('button', {
              type: 'button',
              className: 'lm-btn',
              onClick: () => setTick((value) => value + 1),
            }, '重试'),
            h('button', {
              type: 'button',
              className: 'lm-btn lm-icon-btn',
              title: '忽略',
              'aria-label': '忽略这条错误',
              onClick: () => setError(''),
            }, h(IconX, { size: 13 }))))
        : null,
      h('div', { className: 'lm-body' },
        h('aside', { className: 'lm-list-pane' },
          h('div', { className: 'lm-list-scroll', ref: listRef },
            !state && !items.length
              ? h(SkeletonList)
              : visible.length
                ? visible.map((item) => h(ListRow, {
                  key: item.token,
                  item,
                  selected: item.token === selected,
                  onSelect: selectItem,
                  onKeyDown: onRowKeyDown,
                }))
                : error && !items.length
                  ? h(EmptyState, {
                    title: '暂时读不到妙记',
                    desc: auth?.ok === false
                      ? '飞书登录已失效。在终端运行 lark-cli auth login 后，点上方「重试」。'
                      : '列表读取失败，通常是 lark-cli 短暂异常。点上方「重试」再试一次。',
                    icon: h(IconAlert, { size: 21 }),
                    actions: h('button', {
                      type: 'button',
                      className: 'lm-btn lm-btn-primary',
                      onClick: () => setTick((value) => value + 1),
                    }, h(IconRefresh, { size: 14 }), '重试'),
                  })
                  : showEmpty
                    ? h(EmptyState, {
                      title: '还没有妙记',
                      desc: '在手机上录一段飞书妙记，60 秒内会自动出现在这里。',
                      icon: h(IconInbox, { size: 21 }),
                      actions: h('button', {
                        type: 'button',
                        className: 'lm-btn lm-btn-primary',
                        onClick: syncNow,
                        disabled: syncing,
                      }, h(IconRefresh, { size: 14, className: syncing ? 'lm-spin' : undefined }), '立即同步'),
                      steps: [
                        h('span', { key: 'a' }, '手机录音'),
                        h(IconChevron, { key: 's1', size: 12 }),
                        h('span', { key: 'b' }, '自动整理'),
                        h(IconChevron, { key: 's2', size: 12 }),
                        h('span', { key: 'c' }, '飞书文档'),
                      ],
                    })
                    : h(EmptyState, {
                      title: query ? '没有匹配的妙记' : '这个分组还是空的',
                      desc: query ? `没有找到包含「${query}」的标题或结论。` : '切换到「全部」看看，或者等下一段录音。',
                      icon: h(IconSearch, { size: 21 }),
                      actions: h('button', {
                        type: 'button',
                        className: 'lm-btn lm-btn-primary',
                        onClick: () => {
                          setQuery('')
                          setFilter('all')
                        },
                      }, '清除筛选'),
                    })),
          // 只在搜索/筛选时给个计数；索引入口统一放在顶部（同一个文档，别放两处）
          query || filter !== 'all'
            ? h('div', { className: 'lm-list-foot' },
              h('span', null, query ? `匹配 ${matched.length} 篇` : `筛选 ${matched.length} 篇`))
            : null),
        h(Detail, {
          detail,
          state,
          loading: loadingDetail || !state,
          working,
          busyAny: Boolean(working),
          onProcess: runProcess,
          onSendToChat: sendToChat,
          sending,
          onReload: () => setTick((value) => value + 1),
          onBack: () => setMobileDetail(false),
          onCopyTranscript: copyTranscript,
          scrollRef: detailScrollRef,
        })),
      toast ? h(Toast, { toast }) : null)
    }

    // ------------------------------------------------------- send to chat
    // 把「总结 + 逐字稿」两份 md 附件放进一个**新会话**，并预填提示词（不自动发送）。
    // 会话/附件/输入框都是 DSH 客户端服务：不同版本的方法名可能有差异，全部做了兜底探测。

    // 出问题时有据可查：每一步上报到 Host 的 client-trace.log
    function trace(step, detail) {
      try {
        fetch(`${API}/trace`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ step, detail: typeof detail === 'string' ? detail : JSON.stringify(detail ?? '') }),
        }).catch(() => {})
      } catch {}
    }

    function currentWorkspaceId() {
      try {
        const uiWorkspace = pluginCtx?.get('uiWorkspace')
        const sessions = pluginCtx?.get('sessions')
        const workspaces = pluginCtx?.get('workspaces')
        const currentId = uiWorkspace?.selection?.getSnapshot?.()?.sessionId
          ?? uiWorkspace?.current?.getSnapshot?.()?.sessionId
        const summary = currentId ? sessions?.list?.getSnapshot?.()?.byId?.[currentId] : undefined
        const items = workspaces?.list?.getSnapshot?.()?.items ?? []
        const match = (summary?.cwd ? items.find((item) => item.path === summary.cwd) : undefined) ?? items[0]
        return match?.workspaceId ?? ''
      } catch {
        return ''
      }
    }

    function readMainSessionId() {
      try {
        const ref = pluginCtx?.get('uiWorkspace')?.mainReference
        if (ref?.sessionId) return ref.sessionId
      } catch {}
      try {
        const binding = pluginCtx?.get('uiSession')?.current?.getSnapshot?.()
        if (binding?.sessionId) return binding.sessionId
      } catch {}
      return ''
    }

    /**
     * 等「新会话成为当前会话」。注意 DSH 可能复用当前这个空白会话（id 不变），
     * 所以除了看 id 变化，也接受「当前会话的草稿里已经出现我们的提示词」。
     */
    function waitForTargetSession(previousId, marker, timeoutMs = 12000) {
      return new Promise((resolve) => {
        const started = Date.now()
        const attempt = () => {
          const current = readMainSessionId()
          if (current && current !== previousId) return resolve(current)
          if (current) {
            try {
              const binding = pluginCtx?.get('sessions')?.binding?.(current)
              const shell = binding ? pluginCtx?.get('conversation')?.input?.shellFor?.(binding) : undefined
              if (shell?.projection?.clipboardText?.includes(marker)) return resolve(current)
            } catch {}
          }
          if (Date.now() - started >= timeoutMs) return resolve('')
          setTimeout(attempt, 150)
        }
        attempt()
      })
    }

    /**
     * 新会话 + 两份附件 + 预填提示词。
     * 走 DSH 自己的 startSession 通道（它会新建/复用 blank、切过去、并把 prompt 写进
     * 真实挂载的输入框），不再自己 new 一个游离的 shell——那样切过去会被空草稿覆盖。
     */
    async function openMeetingChat(files, prompt) {
      const uiWorkspace = pluginCtx?.get('uiWorkspace')
      const conversation = pluginCtx?.get('conversation')
      const sessions = pluginCtx?.get('sessions')
      if (!uiWorkspace || !conversation) throw new Error('当前 DSH 版本没有会话服务，无法新建会话')
      if (typeof uiWorkspace.startSession !== 'function') throw new Error('当前 DSH 版本不支持新建会话')

      const workspaceId = currentWorkspaceId() || undefined
      const previousId = readMainSessionId()
      trace('start', `${workspaceId || '(current)'} prev=${previousId || '(none)'}`)

      uiWorkspace.startSession(workspaceId, { prompt, whenDraftExists: 'replace' })
      const sessionId = await waitForTargetSession(previousId, '我需要你')
      trace('session', sessionId || 'timeout')
      if (!sessionId) throw new Error('新会话没有打开（导航超时），请再试一次')

      // 导航刚完成时 binding 可能还没挂上，等一小会儿
      let binding
      for (let i = 0; i < 40 && !binding; i += 1) {
        binding = sessions?.binding?.(sessionId)
        if (!binding) await new Promise((resolve) => setTimeout(resolve, 150))
      }
      const shell = binding ? conversation.input?.shellFor?.(binding) : undefined
      trace('shell', shell ? 'ready' : 'missing')

      if (files.length) {
        const drafts = conversation.createDrafts(sessionId, files, true)
        trace('drafts', drafts.map((draft) => `${draft.file?.name}:${draft.id}`).join(','))
        if (!shell || typeof shell.addAttachments !== 'function') {
          conversation.releaseDraftAttachments?.(drafts)
          throw new Error('新会话的输入框没有就绪，附件没能挂上')
        }
        const added = shell.addAttachments(drafts.map((draft) => draft.id))
        trace('addAttachments', added)
        if (!added) {
          conversation.releaseDraftAttachments?.(drafts)
          throw new Error('附件没有挂上输入框（会话正在发送或锁定）')
        }
      }

      // prompt 已由 startSession 写进草稿；这里只做兜底校验
      await new Promise((resolve) => setTimeout(resolve, 400))
      try {
        const text = shell?.projection?.clipboardText ?? ''
        if (!text.includes('我需要你')) {
          shell?.setDraft?.(prompt)
          trace('setDraft-retry', `${prompt.length} chars`)
        }
      } catch (error) {
        trace('verify-failed', error?.message ?? String(error))
      }
      return sessionId
    }

    async function fetchExportFile(token, kind) {
      const response = await fetch(`${API}/export-file?token=${encodeURIComponent(token)}&kind=${kind}`)
      if (!response.ok) throw new Error(`${kind === 'summary' ? '总结' : '逐字稿'}下载失败（${response.status}）`)
      return response.blob()
    }

    // 单个注册点失败不能拖垮整个客户端入口：DSH 认为必需入口未激活时会整体中断
    // web boot，连界面都打不开。注册失败时退回 slots.inject 生命周期方式，再失败就只记日志。
    function contribute(ctx, declaration, component, what) {
      const register = () => ctx.slots.register(declaration, component)
      try {
        return register()
      } catch (error) {
        console.error(`[lark-minutes] 注册${what}失败：`, error)
      }
      try {
        if (typeof ctx.slots.inject === 'function') return ctx.slots.inject(declaration.name, register)
      } catch (error) {
        console.error(`[lark-minutes] 以 inject 方式注册${what}也失败：`, error)
      }
      return undefined
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        pluginCtx = ctx
        try {
          ensureStyles()
        } catch (error) {
          console.error('[lark-minutes] 注入样式失败：', error)
        }
        try {
          fetch(`${API}/client-alive`, { method: 'POST' }).catch(() => {})
        } catch {}
        contribute(ctx, { name: 'sidebar.panellist', id: 'lark-minutes', order: 20, label: () => '妙记工作台' }, IconWave, '侧边栏入口')
        contribute(ctx, { name: 'main', key: 'lark-minutes' }, Panel, '主面板')
      },
    }
  },
})
