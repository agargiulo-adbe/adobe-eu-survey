/* Intro chapter — refined count-up for stat numbers, gated on slide activation. */
(function () {
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function fmt(v, decimals) {
    return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
  }

  function countUp(el) {
    const to = parseFloat(el.dataset.to);
    if (isNaN(to)) return;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = +el.dataset.decimals || 0;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = prefix + fmt(to, decimals) + suffix; return; }
    const dur = 1100, t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = prefix + fmt(to * easeOut(t), decimals) + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + fmt(to, decimals) + suffix;
    }
    requestAnimationFrame(step);
  }

  function run(slide) {
    if (!slide || !slide.classList || !slide.classList.contains('intro')) return;
    slide.querySelectorAll('.stat-num[data-to]').forEach(el => {
      // small delay so numbers count up after their tile has risen in
      const d = parseFloat((el.closest('[style*="--d"]') || el).style.getPropertyValue('--d')) || 0;
      setTimeout(() => countUp(el), 220 + d * 1000);
    });
  }

  function attach() {
    const deck = document.querySelector('deck-stage');
    if (!deck) { setTimeout(attach, 100); return; }
    deck.addEventListener('slidechange', e => run(e.detail && e.detail.slide));
    const act = deck.querySelector('.intro[data-deck-active]');
    if (act) run(act);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
