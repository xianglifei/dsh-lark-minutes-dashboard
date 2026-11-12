(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- 主题 */

  var themeToggle = document.getElementById('themeToggle');
  var storedTheme = null;
  try { storedTheme = localStorage.getItem('lm-theme'); } catch (e) {}

  function syncThemeButton() {
    if (!themeToggle) return;
    var dark = root.dataset.theme === 'dark';
    themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeToggle.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
  }

  function setTheme(next, persist) {
    root.dataset.theme = next;
    syncThemeButton();
    if (persist) {
      try { localStorage.setItem('lm-theme', next); } catch (e) {}
    }
    var color = next === 'dark' ? '#0b0d10' : '#ffffff';
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) {
      metas[i].setAttribute('content', color);
      metas[i].removeAttribute('media');
    }
  }

  syncThemeButton();

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  }

  // 用户没手动选过时，跟随系统切换。
  var scheme = window.matchMedia('(prefers-color-scheme: dark)');
  var onScheme = function (event) {
    var saved = null;
    try { saved = localStorage.getItem('lm-theme'); } catch (e) {}
    if (!saved) setTheme(event.matches ? 'dark' : 'light', false);
  };
  if (scheme.addEventListener) scheme.addEventListener('change', onScheme);
  else if (scheme.addListener) scheme.addListener(onScheme);

  /* ------------------------------------------------------------- 导航吸顶 */

  var nav = document.getElementById('nav');

  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('is-stuck', window.scrollY > 8);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------- 入场 */

  var revealItems = document.querySelectorAll('.reveal');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    for (var r = 0; r < revealItems.length; r++) revealItems[r].classList.add('in');
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    for (var j = 0; j < revealItems.length; j++) revealObserver.observe(revealItems[j]);
  }

  /* ------------------------------------------------------------- 当前章节 */

  var navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  var sections = [];
  for (var k = 0; k < navLinks.length; k++) {
    var target = document.querySelector(navLinks[k].getAttribute('href'));
    if (target) sections.push({ link: navLinks[k], el: target });
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        for (var s = 0; s < sections.length; s++) {
          sections[s].link.classList.toggle('is-active', sections[s].el === entry.target);
        }
      });
    }, { rootMargin: '-42% 0px -52% 0px', threshold: 0 });

    for (var s2 = 0; s2 < sections.length; s2++) activeObserver.observe(sections[s2].el);
  }

  /* ------------------------------------------------------------- 复制 */

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(area);
    return ok;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return fallbackCopy(text) ? undefined : Promise.reject();
      });
    }
    return fallbackCopy(text) ? Promise.resolve() : Promise.reject();
  }

  var copyButtons = document.querySelectorAll('[data-copy]');
  for (var c = 0; c < copyButtons.length; c++) {
    (function (button) {
      var label = button.querySelector('span');
      var timer = null;
      button.addEventListener('click', function () {
        copyText(button.getAttribute('data-copy')).then(function () {
          if (label) label.textContent = '已复制';
          button.classList.add('is-done');
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            if (label) label.textContent = '复制';
            button.classList.remove('is-done');
          }, 1600);
        }).catch(function () {
          if (label) label.textContent = '复制失败';
          window.clearTimeout(timer);
          timer = window.setTimeout(function () {
            if (label) label.textContent = '复制';
          }, 1600);
        });
      });
    })(copyButtons[c]);
  }
  // 所有初始化完成；head 里的兜底计时器看到它就不再强制显示内容。
  window.__lmReady = true;
})();
