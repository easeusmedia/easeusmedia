/* Easeus Media — shared behaviour */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- footer year ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- nav state + mobile bar: measured once, painted once per frame ---------- */
  var nav = document.getElementById('nav');
  var mbar = document.getElementById('mbar');
  var hero = document.querySelector('.hero, .whero');
  var heroCut = 0, ticking = false, solid = null, shown = null;

  function measure() { heroCut = hero ? hero.offsetHeight * 0.7 : 400; }
  function paint() {
    ticking = false;
    var y = window.scrollY || document.documentElement.scrollTop;
    var isSolid = y > 40;
    if (nav && isSolid !== solid) { nav.classList.toggle('solid', isSolid); solid = isSolid; }
    if (mbar) {
      var isShown = y > heroCut;
      if (isShown !== shown) { mbar.classList.toggle('on', isShown); shown = isShown; }
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  measure(); paint();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); });
  window.addEventListener('load', measure);

  /* ---------- reveal on scroll ---------- */
  var rv = document.querySelectorAll('.rv');
  if (!reduced && 'IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { ro.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- marquees: duplicate once for a seamless loop ---------- */
  ['.chips-track', '.reels-track', '.mq-track'].forEach(function (sel) {
    var track = document.querySelector(sel);
    if (track && !reduced) track.insertAdjacentHTML('beforeend', track.innerHTML);
  });

  /* trailer deck: pinned cards scale down as the next one covers them */
  var deck = Array.prototype.slice.call(document.querySelectorAll('.deck .trailer'));
  if (deck.length > 1 && !reduced) {
    var deckTicking = false, vh = window.innerHeight;
    var arriveAt = (parseFloat(getComputedStyle(deck[0]).top) || 100) + 64;
    function deckMeasure() {
      vh = window.innerHeight;
      arriveAt = (parseFloat(getComputedStyle(deck[0]).top) || 100) + 64;
    }
    function deckUpdate() {
      deckTicking = false;
      var tops = [];
      for (var i = 1; i < deck.length; i++) tops.push(deck[i].getBoundingClientRect().top);
      for (var j = 0; j < tops.length; j++) {
        var p = Math.max(0, Math.min(1, (vh - tops[j]) / (vh - arriveAt)));
        deck[j].style.transform = 'scale(' + (1 - 0.2 * p).toFixed(4) + ')';
      }
    }
    window.addEventListener('scroll', function () {
      if (!deckTicking) { deckTicking = true; requestAnimationFrame(deckUpdate); }
    }, { passive: true });
    window.addEventListener('resize', function () { deckMeasure(); deckUpdate(); });
    deckUpdate();
  }

  /* ---------- reels: load and play only while the strip is in view ---------- */
  var strip = document.querySelector('.reels');
  function reels() { return document.querySelectorAll('.reel'); }
  if (reduced) {
    reels().forEach(function (v) { v.setAttribute('controls', ''); });
  } else if (strip && 'IntersectionObserver' in window) {
    /* watch the strip, not each tile: tiles slide past constantly and a
       pause() landing on a pending play() aborts playback */
    new IntersectionObserver(function (entries) {
      var on = entries[0].isIntersecting;
      reels().forEach(function (v) {
        if (on) { v.play().catch(function () {}); }
        else if (!v.paused) { v.pause(); }
      });
    }, { threshold: 0, rootMargin: '300px 0px' }).observe(strip);
  }

  /* ---------- counters ---------- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, to = parseInt(el.getAttribute('data-count'), 10), t0 = null;
        (function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min((ts - t0) / 900, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(step);
        })(performance.now());
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { n.textContent = '0'; io.observe(n); });
  }

  /* ---------- capture bars grow when they arrive ---------- */
  var bars = document.querySelector('.bars');
  if (bars) {
    var spans = bars.querySelectorAll('span');
    spans.forEach(function (s) { s.style.height = reduced ? (s.style.getPropertyValue('--h') || '0') : '0'; });
    if (!reduced && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          spans.forEach(function (s, i) {
            setTimeout(function () { s.style.height = s.style.getPropertyValue('--h'); }, i * 45);
          });
          obs.unobserve(e.target);
        });
      }, { threshold: 0.35 }).observe(bars);
    }
  }

  /* ---------- the arithmetic: aim each strand at the row it belongs to ---------- */
  var arms = document.querySelector('.fan-arms');
  var fanSvg = arms && arms.querySelector('svg');
  if (fanSvg) {
    var paths = fanSvg.querySelectorAll('path');
    var drawFan = function () {
      var w = arms.clientWidth, h = arms.clientHeight;
      if (!w || !h) return;
      fanSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var base = arms.getBoundingClientRect();
      function band(sel) {
        var el = document.querySelector(sel);
        if (!el) return [h / 2, h / 2, h / 2];
        var r = el.getBoundingClientRect(), t = r.top - base.top, b = t + r.height;
        var inset = Math.min(14, r.height / 3);
        return [t + inset, (t + b) / 2, b - inset];
      }
      var start = h / 2;
      band('.fan-row.published .fan-items').concat(band('.fan-row.missing .fan-items')).forEach(function (y, i) {
        paths[i].setAttribute('d', 'M0,' + start + ' C' + (w * 0.62) + ',' + start + ' ' + (w * 0.38) + ',' + y + ' ' + w + ',' + y);
      });
    };
    drawFan();
    window.addEventListener('resize', drawFan);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawFan);
  }

  /* ---------- video lightbox ---------- */
  var overlay = document.getElementById('vl-overlay');
  var frame = document.getElementById('vl-wrap');
  var iframe = document.getElementById('vl-iframe');

  function ytId(url) {
    var m = (url || '').match(/(?:shorts\/|youtu\.be\/|[?&]v=|embed\/|live\/)([\w-]{6,})/);
    return m ? m[1] : (/^[\w-]{11}$/.test(url) ? url : '');
  }
  window.openVideo = function (url, orientation) {
    var id = ytId(url);
    if (!id || !overlay) return;
    frame.className = 'vl-wrap ' + (orientation === 'vertical' ? 'vl-vertical' : 'vl-horizontal');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    overlay.classList.add('on');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.vl-close').focus();
  };
  window.closeVideo = function () {
    if (!overlay) return;
    overlay.classList.remove('on');
    iframe.src = '';
    document.body.style.overflow = '';
  };
  if (overlay) {
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeVideo(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeVideo(); });
  }

  /* play buttons on every card that carries a video */
  document.querySelectorAll('[data-video]').forEach(function (card) {
    var url = (card.getAttribute('data-video') || '').trim();
    if (!url) return;
    if (card.classList.contains('trailer')) card.classList.add('has-video');
    var play = document.createElement('span');
    play.className = 'reel-play';
    play.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,5 19,12 8,19"/></svg>';
    card.appendChild(play);
    card.setAttribute('aria-label', 'Play video');
    card.addEventListener('click', function () { openVideo(url, card.dataset.o); });
  });

  /* thumbnails for cards that only carry a YouTube id */
  document.querySelectorAll('[data-yt]').forEach(function (el) {
    var id = ytId(el.dataset.yt);
    if (!id) { el.remove(); return; }
    var orientation = el.dataset.o || 'vertical';
    el.innerHTML = '<img src="https://img.youtube.com/vi/' + id + '/maxresdefault.jpg"' +
      ' onerror="this.onerror=null;this.src=\'https://img.youtube.com/vi/' + id + '/hqdefault.jpg\'"' +
      ' alt="" loading="lazy"><span class="reel-play"><svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="8,5 19,12 8,19"/></svg></span>' +
      (el.dataset.title ? '<span class="vid-t">' + el.dataset.title + '</span>' : '');
    el.setAttribute('aria-label', 'Play video' + (el.dataset.title ? ': ' + el.dataset.title : ''));
    el.addEventListener('click', function () { openVideo(id, orientation); });
  });

  /* grids centre themselves on however many cards survived */
  document.querySelectorAll('.wgrid:not(.long)').forEach(function (g) {
    var n = g.children.length;
    g.style.setProperty('--cd', (n >= 7 || n % 4 === 0) ? 4 : 3);
    g.style.setProperty('--cm', (n === 3 || n >= 9) ? 3 : 2);
  });
})();

/* ---------- FAQ: one open at a time ---------- */
function faq(btn) {
  var item = btn.closest('.fi');
  var wasOpen = item.classList.contains('open');
  document.querySelectorAll('.fi.open').forEach(function (other) {
    other.classList.remove('open');
    other.querySelector('.fq').setAttribute('aria-expanded', 'false');
  });
  if (!wasOpen) {
    item.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}
