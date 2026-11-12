(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    var visibleSections = [];
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var index = visibleSections.indexOf(entry.target);
        if (entry.isIntersecting && index === -1) visibleSections.push(entry.target);
        else if (!entry.isIntersecting && index !== -1) visibleSections.splice(index, 1);
      });

      // 没有任何章节落在中间带时，清空高亮；否则取文档顺序里最靠后的那一节。
      var activeEl = null;
      for (var s = 0; s < sections.length; s++) {
        if (visibleSections.indexOf(sections[s].el) !== -1) activeEl = sections[s].el;
      }
      for (var t = 0; t < sections.length; t++) {
        sections[t].link.classList.toggle('is-active', sections[t].el === activeEl);
      }
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
