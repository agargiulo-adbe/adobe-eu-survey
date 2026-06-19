/* Drill-down overview for fast slide jumping (presentation mode).
   Press G → level 1: the phases (Intro, Stage 01…07, Closing). Click a phase
   → level 2: its slides; click one to jump. Esc steps back / closes. T toggles
   the thumbnail rail. */
(function () {
  let deck = null, ov = null, open = false, railOn = false;
  let groups = [], view = 'groups', activeGroup = -1;

  const STAGE_COLORS = {
    'Stage 01': '#FF7E00', 'Stage 02': '#E1251B', 'Stage 03': '#3B63FB',
    'Stage 04': '#2680EB', 'Stage 05': '#6236FF', 'Stage 06': '#0D9F6E',
    'Stage 07': '#2E8B40',
  };

  function sections() { return [...document.querySelectorAll('deck-stage > section')]; }
  function esc(t) { return (t || '').replace(/</g, '&lt;'); }

  /* Build the 2-level model from the section list. */
  function buildGroups() {
    groups = [];
    let cur = { title: 'Intro', sub: 'Setup & scenario', color: '#8A8E96', items: [] };
    sections().forEach((s, i) => {
      const label = s.getAttribute('data-label') || ('Slide ' + (i + 1));
      const isDivider = s.classList.contains('divider');
      if (isDivider && STAGE_COLORS[label]) {
        if (cur.items.length) groups.push(cur);
        const num = (s.querySelector('.big-num') || {}).textContent || '';
        const h2 = (s.querySelector('h2') || {}).textContent || label;
        cur = { title: (num ? num + ' · ' : '') + h2.trim(), sub: 'Phase', color: STAGE_COLORS[label], items: [] };
      } else if (label === 'Marketecture') {
        if (cur.items.length) groups.push(cur);
        cur = { title: 'Closing', sub: 'Marketecture', color: '#1D1D1D', items: [] };
      }
      cur.items.push({ i: i, label: label });
    });
    if (cur.items.length) groups.push(cur);
  }

  function build() {
    ov = document.createElement('div');
    ov.id = 'ov-grid';
    ov.innerHTML = '<div class="ov-head"><button class="ov-back" type="button">\u2039 All phases</button><span class="ov-t"></span><span class="ov-hint"></span></div><div class="ov-body"></div>';
    document.body.appendChild(ov);
    const st = document.createElement('style');
    st.textContent = `
      #ov-grid{position:fixed;inset:0;z-index:2147483600;background:rgba(14,16,18,.94);backdrop-filter:blur(8px);
        display:none;flex-direction:column;font-family:'Source Sans 3',-apple-system,sans-serif;opacity:0;transition:opacity .2s ease}
      #ov-grid[data-open]{display:flex;opacity:1}
      #ov-grid .ov-head{flex:none;display:flex;align-items:center;gap:18px;padding:26px 44px 18px;color:#fff}
      #ov-grid .ov-back{appearance:none;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);color:#fff;
        font:inherit;font-size:15px;font-weight:700;padding:9px 16px;border-radius:9px;cursor:pointer;display:none}
      #ov-grid .ov-back:hover{background:rgba(255,255,255,.2)}
      #ov-grid[data-view="detail"] .ov-back{display:inline-block}
      #ov-grid .ov-t{font-size:26px;font-weight:800;letter-spacing:-.01em}
      #ov-grid .ov-hint{margin-left:auto;font-size:15px;color:rgba(255,255,255,.5);font-weight:600}
      #ov-grid .ov-body{flex:1;overflow-y:auto;padding:8px 44px 50px;display:grid;gap:16px;align-content:start}
      #ov-grid[data-view="groups"] .ov-body{grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
      #ov-grid[data-view="detail"] .ov-body{grid-template-columns:repeat(auto-fill,minmax(200px,1fr))}
      #ov-grid .ov-cell{position:relative;background:#1C1E22;border:1px solid rgba(255,255,255,.12);border-radius:14px;
        padding:18px 20px;cursor:pointer;color:#fff;display:flex;flex-direction:column;justify-content:space-between;
        transition:border-color .15s ease,background .15s ease,transform .1s ease;overflow:hidden}
      #ov-grid .ov-cell:hover{background:#26282E;border-color:rgba(255,255,255,.34);transform:translateY(-2px)}
      #ov-grid .ov-cell[data-current]{border-color:#fff;box-shadow:0 0 0 1px #fff}
      #ov-grid .ov-cell .ov-bar{position:absolute;left:0;top:0;bottom:0;width:5px}
      /* phase cards */
      #ov-grid .ov-grp{min-height:128px;padding-left:26px}
      #ov-grid .ov-grp .gk{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;opacity:.55}
      #ov-grid .ov-grp .gt{font-size:23px;font-weight:800;line-height:1.15;margin-top:10px}
      #ov-grid .ov-grp .gc{margin-top:14px;font-size:14px;font-weight:700;color:rgba(255,255,255,.55);display:flex;align-items:center;gap:8px}
      #ov-grid .ov-grp .gc .dot{width:7px;height:7px;border-radius:50%}
      /* slide cells */
      #ov-grid .ov-slide{min-height:84px;padding-left:24px}
      #ov-grid .ov-slide .ov-n{font-size:13px;font-weight:800;color:rgba(255,255,255,.45);font-variant-numeric:tabular-nums}
      #ov-grid .ov-slide[data-current] .ov-n{color:#fff}
      #ov-grid .ov-slide .ov-l{font-size:16px;font-weight:700;line-height:1.25;margin-top:8px}
      #ov-grid .ov-body::-webkit-scrollbar{width:10px}
      #ov-grid .ov-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
    `;
    document.head.appendChild(st);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('.ov-back').addEventListener('click', () => showGroups());
  }

  function groupOf(slideIdx) {
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].items.some(it => it.i === slideIdx)) return g;
    }
    return -1;
  }

  function showGroups() {
    view = 'groups'; activeGroup = -1;
    ov.setAttribute('data-view', 'groups');
    ov.querySelector('.ov-t').textContent = 'Jump to a phase';
    ov.querySelector('.ov-hint').textContent = 'click a phase \u00b7 Esc to close';
    const body = ov.querySelector('.ov-body');
    body.innerHTML = '';
    const curG = groupOf(deck.index);
    groups.forEach((g, gi) => {
      const cell = document.createElement('div');
      cell.className = 'ov-cell ov-grp';
      if (gi === curG) cell.setAttribute('data-current', '');
      cell.innerHTML =
        '<span class="ov-bar" style="background:' + g.color + '"></span>' +
        '<div><div class="gk">' + esc(g.sub) + '</div><div class="gt">' + esc(g.title) + '</div></div>' +
        '<div class="gc"><span class="dot" style="background:' + g.color + '"></span>' + g.items.length + ' slide' + (g.items.length === 1 ? '' : 's') + '</div>';
      cell.addEventListener('click', () => showDetail(gi));
      body.appendChild(cell);
    });
    body.scrollTop = 0;
    const c = body.querySelector('[data-current]');
    if (c) c.scrollIntoView({ block: 'nearest' });
  }

  function showDetail(gi) {
    view = 'detail'; activeGroup = gi;
    const g = groups[gi];
    ov.setAttribute('data-view', 'detail');
    ov.querySelector('.ov-t').textContent = g.title;
    ov.querySelector('.ov-hint').textContent = 'click a slide \u00b7 Esc for phases';
    const body = ov.querySelector('.ov-body');
    body.innerHTML = '';
    g.items.forEach(it => {
      const cell = document.createElement('div');
      cell.className = 'ov-cell ov-slide';
      if (it.i === deck.index) cell.setAttribute('data-current', '');
      cell.innerHTML =
        '<span class="ov-bar" style="background:' + g.color + '"></span>' +
        '<span class="ov-n">' + String(it.i + 1).padStart(2, '0') + '</span>' +
        '<span class="ov-l">' + esc(it.label) + '</span>';
      cell.addEventListener('click', () => { deck.goTo(it.i); close(); });
      body.appendChild(cell);
    });
    body.scrollTop = 0;
    const c = body.querySelector('[data-current]');
    if (c) c.scrollIntoView({ block: 'center' });
  }

  function openGrid() { if (!deck) return; buildGroups(); showGroups(); ov.setAttribute('data-open', ''); open = true; }
  function close() { if (ov) ov.removeAttribute('data-open'); open = false; }

  function onKey(e) {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault(); e.stopImmediatePropagation();
      open ? close() : openGrid();
    } else if (e.key === 't' || e.key === 'T') {
      e.preventDefault(); e.stopImmediatePropagation();
      toggleRail();
    } else if (open && (e.key === 'Escape' || e.key === 'Backspace')) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (view === 'detail') showGroups(); else close();
    }
  }

  function setRail(on) {
    railOn = on;
    try { window.postMessage({ type: '__deck_rail_visible', on: on }, '*'); } catch (e) {}
  }
  function toggleRail() { setRail(!railOn); }

  function attach() {
    deck = document.querySelector('deck-stage');
    if (!deck) { setTimeout(attach, 100); return; }
    build();
    try { railOn = localStorage.getItem('deck-stage.railVisible') === '1'; } catch (e) { railOn = false; }
    window.addEventListener('keydown', onKey, true);
    // Enforce the stored preference on load. The rail defaults to visible once
    // enabled, so without this it would re-appear every reload.
    setRail(railOn);
    setTimeout(() => setRail(railOn), 350);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
