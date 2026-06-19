/* Journey demo controller.
   - Content visible by default (static-correct for export / reduced motion).
   - On activation a demo enters STEP MODE: content reveals on CLICK, the
     bottom caption updates per step, and a guiding cursor glides along a
     natural CURVED path to the active area.
   - Morph-in (2s) runs via the `.play` class.
   Driven by deck-stage's `slidechange` event. */
(function () {
  const CONFIG = {
    'wf-planning': { type: { sel: '.wf-prompt', speed: 22, start: 450,
        text: 'Plan the Green Home Upgrade spring launch — promote the solar + battery bundle to homeowners, drive sign-ups across email, web and app, and lead with the average −23% monthly bill saving.' },
      steps: [
      { cap: 'Six campaigns are already running in the <b>Green Home Upgrade</b> programme.', cur: '.wf-prompt-box' },
      { cap: 'The <b>AI Assistant</b> reads a plain-language brief and offers to structure it.', cur: '.wf-action' },
      { cap: 'One click adds a new <b>Green Home Upgrade — Launch</b> record at the top of the grid.', cur: '.wf-row.gen' },
      { cap: 'The record is created — <b>structured and ready</b> in seconds.', cur: '.wf-toast' },
      { cap: 'Open the record to find a <b>full campaign brief</b> — messaging, tagline, theme and creative direction.', cur: '.wd-title' },
    ]},
    'wf-timeline': { steps: [
      { cap: 'The launch plan opens as <b>one shared timeline</b>.', cur: '.gantt-head' },
      { cap: 'Concept and <b>asset production</b> line up across teams.', cur: '.gantt-row:nth-child(2) .gantt-bar' },
      { cap: 'Review gates and <b>go-live</b> — aligned for everyone.', cur: '.gantt-row:nth-child(4) .gantt-bar' },
    ]},
    'wf-resource': { onStep: (slide, n) => {
        slide.classList.toggle('rb-heatmap', n >= 1);
        slide.classList.toggle('rb-sara', n >= 2);
        const dnd = n >= 3;
        slide.classList.toggle('rb-dnd', dnd);
        const drag = slide.querySelector('.rb-drag');
        const src = slide.querySelector('.rb-bar.drag-src');
        const tgt = slide.querySelector('.rb-cell-target');
        const cur = slide.querySelector('.demo-cursor');
        if (!drag || !src || !tgt) return;
        if (drag._anim) { try { drag._anim.cancel(); } catch (e) {} drag._anim = null; }
        if (cur && cur._anim) { try { cur._anim.cancel(); } catch (e) {} cur._anim = null; }
        if (dnd) {
          const sc = slide.getBoundingClientRect().width / 1920 || 1;
          const sR = src.getBoundingClientRect(), tR = tgt.getBoundingClientRect();
          // chip: placed over the Final Copy bar (coords relative to its offsetParent = toolwin-body)
          const pp = drag.offsetParent.getBoundingClientRect();
          drag.style.left = ((sR.left - pp.left) / sc) + 'px';
          drag.style.top = ((sR.top - pp.top) / sc) + 'px';
          drag.style.width = (sR.width / sc) + 'px';
          const cdx = ((tR.left + tR.width / 2) - (sR.left + sR.width / 2)) / sc;
          const cdy = ((tR.top + tR.height / 2) - (sR.top + sR.height / 2)) / sc;
          drag.style.opacity = '0';
          drag._anim = drag.animate([
            { transform: 'translate(0px,0px)', opacity: 0, offset: 0 },
            { transform: 'translate(0px,0px)', opacity: 1, offset: 0.18 },
            { transform: `translate(${cdx.toFixed(1)}px,${cdy.toFixed(1)}px)`, opacity: 1, offset: 0.86 },
            { transform: `translate(${cdx.toFixed(1)}px,${cdy.toFixed(1)}px)`, opacity: 0, offset: 1 },
          ], { duration: 1500, easing: 'cubic-bezier(.4,.1,.2,1)', fill: 'forwards' });
          // cursor: grabs the bar then drags down to Marcus's cell, in sync with the chip
          if (cur) {
            const st = cur.offsetParent.getBoundingClientRect();
            const cx = parseFloat(cur.dataset.x) || 0, cy = parseFloat(cur.dataset.y) || 0;
            const TIPX = 9.5, TIPY = 4;
            const ex = (tR.left - st.left) / sc + Math.min(tR.width / sc * 0.5, 40) - TIPX;
            const ey = (tR.top - st.top) / sc + tR.height / sc * 0.5 - TIPY;
            cur._anim = cur.animate([
              { transform: `translate(${cx}px,${cy}px)`, offset: 0 },
              { transform: `translate(${cx}px,${cy}px)`, offset: 0.18 },
              { transform: `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px)`, offset: 0.86 },
              { transform: `translate(${ex.toFixed(1)}px,${ey.toFixed(1)}px)`, offset: 1 },
            ], { duration: 1500, easing: 'cubic-bezier(.4,.1,.2,1)', fill: 'forwards' });
            cur.dataset.x = ex; cur.dataset.y = ey;
          }
        } else {
          drag.style.opacity = '0'; drag.style.transform = 'translate(0px,0px)';
        }
      }, steps: [
      { cap: 'Team allocation for the <b>Green Home Upgrade — Email</b> sprint, day by day.', cur: '.rb-camp' },
      { cap: 'Switch to the <b>heatmap</b> to read each person\u2019s real workload.', cur: '.rb-mode.m-heat' },
      { cap: 'The load jumps out: <b>Sara is over-allocated</b> across the sprint.', cur: '.rb-mem-over' },
      { cap: 'Drag <b>Final Copy</b> down onto a free day for Marcus — workload <b>rebalances</b> live.', cur: '.rb-bar.drag-src' },
    ]},
    'wf-health': { onStep: (slide, n) => {
        slide.classList.toggle('ph-open', n >= 1);
        slide.classList.toggle('ph-sched', n >= 2);
      }, steps: [
      { cap: 'A complete <b>Project Overview</b> for the Green Home Upgrade launch.', cur: '.ph-ovh' },
      { cap: 'One click on <b>Project Health</b> opens the AI assistant — score <b>65, Moderate</b>.', cur: '.ph-btn' },
      { cap: 'Expand <b>Schedule</b>: AI flags it <b>At Risk</b> — underestimated tasks and slipping dates.', cur: '.phs-row.sched .phs-head' },
    ]},
    'wf-fusion': { steps: [
      { cap: 'When the plan is approved, <b>Fusion takes over</b>.', cur: '.fus-node.trigger' },
      { cap: 'It auto-creates folders, tasks and <b>assigns owners</b> by workload.', cur: '.fus-node:nth-of-type(2)' },
      { cap: 'Approved assets sync straight to the <b>DAM</b> — no manual handoffs.', cur: '.fus-node:nth-of-type(4)' },
    ]},
    'wf-source': { onStep: (slide, n) => {
        slide.classList.toggle('src-checked', n >= 2);
      }, steps: [
      { cap: 'The approved brief — <b>claims, sustainability and pricing</b> constraints flagged.', cur: '.src-doc-h' },
      { cap: 'AI extracts the regulatory requirements into a <b>compliance checklist</b>.', cur: '.src-card.si[data-step="1"]' },
      { cap: 'Each requirement becomes a <b>production task</b> with an owner and due date.', cur: '.src-card.si[data-step="2"]' },
    ]},
    'ex-brand': { onStep: (slide, n) => {
        slide.classList.toggle('eb-focus-colors', n === 1);
        slide.classList.toggle('eb-focus-assets', n >= 2);
      }, steps: [
      { cap: 'Elyra\u2019s <b>brand hub</b> — logos, colours, fonts and templates, governed in one place.', cur: '.eb-tabs' },
      { cap: 'Brand-locked <b>colours and fonts</b> keep every asset consistent.', cur: '.eb-col-colors' },
      { cap: 'Approved <b>Elyra assets</b>, ready to remix with Firefly.', cur: '.eb-col-assets' },
    ]},
    'ac-docs': { steps: [
      { cap: 'The source brief opens in a <b>shared</b> Acrobat Studio PDF Space.', cur: '.ac-page' },
      { cap: 'AI Assistant <b>summarizes</b> the document into key points.', cur: '.ac-ans' },
      { cap: 'It suggests <b>starting content blocks</b> to kick off production.', cur: '.ac-blocks-h' },
      { cap: 'The team <b>reviews and comments together</b>, in context — no email handoffs.', cur: '.ac-comment' },
    ]},
    'ex-template': { onStep: (slide, n) => { slide.classList.toggle('tc-resolved', n >= 3); }, steps: [
      { cap: 'An on-brand template, built from the team\u2019s earlier collaboration.', cur: '.tc-art' },
      { cap: 'Define <b>usage, styles and variations</b> — once, on-brand.', cur: '.tc-vars' },
      { cap: 'Express runs <b>automated checks</b> against the brand guidelines.', cur: '.tc-checks' },
      { cap: 'Actionable feedback is resolved — ready for <b>stakeholder review</b>.', cur: '.tc-submit' },
    ]},
    'wf-review': { onStep: (slide, n) => { slide.classList.toggle('rv-opened', n >= 1); slide.classList.toggle('rv-approved', n >= 2); }, steps: [
      { cap: 'A <b>review request</b> arrives for the approvers.', cur: '.rv-card' },
      { cap: 'Open it — the proposed campaign loads in <b>Frame.io</b>.', cur: '.rv-canvas' },
      { cap: 'Approvers respond — comments &amp; versions stay <b>in sync</b>.', cur: '.rv-rev.si' },
      { cap: '<b>Attention</b> — 2 days to go-live; one approval still pending.', cur: '.rv-risk' },
    ]},
    'gen-variants': { steps: [
      { cap: 'Start from the <b>approved core asset</b>.', cur: '.gv-core' },
      { cap: 'GenStudio assembles variants for <b>paid social, display and email</b>.', cur: '.gv-chan' },
      { cap: '<b>GenExpand</b> resizes to every placement — starter templates do the rest.', cur: '.gv-expand' },
      { cap: 'Multi-asset <b>Meta ad activation</b> — ready to ship.', cur: '.gv-meta' },
    ]},
    'ex-adapt': { onStep: (slide, n) => { const sel = n >= 1; slide.classList.toggle('ca-asset', sel); const fm = slide.querySelector('.ca-team'); if (fm) fm.classList.toggle('on', sel); }, steps: [
      { cap: 'A locked brand template — empty and <b>on-brand by default</b>.', cur: '.ca-canvas' },
      { cap: 'Field marketing picks it up — an <b>approved AEM asset</b> fills the frame, ready to localize.', cur: '.ca-team' },
      { cap: '<b>Remix with Firefly</b> within brand guardrails.', cur: '.ca-firefly' },
    ]},
    'aem-publish': { onStep: (slide, n) => { slide.classList.toggle('pb-syncing', n >= 1); }, steps: [
      { cap: 'A final asset is <b>approved</b> in Workfront.', cur: '.pb-card' },
      { cap: '<b>Auto-sync</b> to AEM Assets runs continuously — no manual handoff.', cur: '.pb-pipe' },
      { cap: 'It lands in the DAM and <b>metadata is auto-enriched</b>.', cur: '.pb-asset' },
    ]},
    'aem-gov': { onStep: (slide, n) => { slide.classList.toggle('gov-tax', n >= 2); }, steps: [
      { cap: 'The asset\u2019s <b>governance record</b> in AEM Assets.', cur: '.gov-asset' },
      { cap: '<b>Rights management</b> — licence, usage rights and expiry.', cur: '.gov-rights' },
      { cap: '<b>Taxonomy and a compliance workflow</b> keep it controlled.', cur: '.gov-compliance' },
      { cap: 'A full <b>audit log</b> — who did what, and when.', cur: '.gov-right-h' },
    ]},
    'aem-smarttags': { onStep: (slide, n) => { slide.classList.toggle('st-scanning', n === 1); }, steps: [
      { cap: 'Open an asset — <b>AI reads the image</b>.', cur: '.st-photo' },
      { cap: '<b>Smart Tags</b> are auto-generated — no manual tagging.', cur: '.st-tags' },
      { cap: '<b>Meaning-based search</b> finds it by intent, not filename.', cur: '.st-search' },
      { cap: 'Near-duplicates surface — <b>cut duplicate asset spend</b>.', cur: '.st-dedup' },
    ]},
    'aem-localize': { steps: [
      { cap: 'One approved <b>master</b> — the single source of truth.', cur: '.loc-master' },
      { cap: '<b>Auto-translate &amp; adapt</b> to every market — one source, many languages.', cur: '.loc-grid' },
      { cap: '<b>Local-language intent search</b> finds the right asset in each market.', cur: '.loc-srch-list' },
    ]},
    'aep-identity': { onStep: (slide, n) => { slide.classList.toggle('idr-stitch', n >= 1); slide.classList.toggle('idr-dedup', n >= 2); }, steps: [
      { cap: 'Identities are scattered across <b>web, app, call center, field, CRM and billing</b>.', cur: '.idr-src' },
      { cap: '<b>Identity stitching</b> links every signal to one person.', cur: '.idr-graph' },
      { cap: 'One <b>Real-Time Customer Profile</b> — duplicate profiles eliminated.', cur: '.idr-card' },
      { cap: '<b>Consent-aware governance</b> protects sensitive energy data.', cur: '.idr-consent' },
    ]},
    'aep-segments': { steps: [
      { cap: 'The <b>AEP Segment Builder</b> — attributes and events on the left.', cur: '.seg-fields' },
      { cap: 'Drag rules onto the canvas — <b>loyalty, app usage, tenure</b>.', cur: '.seg-canvas' },
      { cap: 'The audience <b>resolves in real time</b> — 428,500 profiles.', cur: '.seg-size' },
      { cap: '<b>Lifecycle segments</b> ready, with sources &amp; destinations in view.', cur: '.seg-seg-h' },
    ]},
    'ajo-logic': { steps: [
      { cap: 'The journey starts from an <b>AEP audience</b> — no code.', cur: '.jl-node.trigger' },
      { cap: 'Add a <b>condition</b> on the intent signal.', cur: '.jl-node.si[data-step="1"]' },
      { cap: 'Insert a <b>wait</b> — time the next touch.', cur: '.jl-node.wait' },
      { cap: 'Branch into channels by <b>intent</b>.', cur: '.jl-branch .jl-leg:first-child .jl-node' },
      { cap: 'AI suggests the <b>next best action</b>.', cur: '.jl-ai' },
    ]},
    'ajo-channels': { onStep: (slide, n) => { const i = Math.min(n, 2); const ch = ['email','sms','push'][i]; slide.classList.remove('ce-ch-email','ce-ch-sms','ce-ch-push'); slide.classList.add('ce-ch-' + ch); slide.querySelectorAll('.ce-tab').forEach((t, k) => t.classList.toggle('on', k === i)); }, steps: [
      { cap: 'Compose the <b>email</b> — template and editor together.', cur: '.ce-tab.t-email' },
      { cap: 'Open the <b>SMS</b> tab — concise, with emoji.', cur: '.ce-tab.t-sms' },
      { cap: 'Open the <b>Push</b> tab — title, body and deep link.', cur: '.ce-tab.t-push' },
    ]},
    'ajo-content': { steps: [
      { cap: 'Content modules from <b>AEM Assets &amp; Dynamic Media</b>.', cur: '.cm-col:first-child' },
      { cap: 'Map modules to each <b>journey step</b>.', cur: '.cm-col.mid' },
      { cap: '<b>Dynamic blocks</b> driven by AEP profile attributes.', cur: '.cm-tok-card' },
      { cap: '<b>Governance-approved</b> usage only.', cur: '.cm-gov' },
    ]},
    'ajo-agent': { type: { sel: '.ja-ptxt', speed: 15, start: 450, text: 'Create a 3-step nurture for the Green Home Upgrade · Loyalty audience: send the hero email, wait 2 days, then trigger an SMS reminder for anyone who didn\u2019t open — and keep it on-brand with approved AEM content.' }, steps: [
      { cap: 'Describe the journey in <b>plain language</b>.', cur: '.ja-prompt' },
      { cap: 'The agent <b>reasons</b> over the audience and goal.', cur: '.ja-reason' },
      { cap: 'It <b>assembles the journey</b> — entry, email, wait, SMS.', cur: '.ja-jflow' },
      { cap: 'Review, refine and <b>add to the canvas</b>.', cur: '.ja-apply' },
    ]},
    'ajo-preflight': { onStep: (slide, n) => { const gates = [...slide.querySelectorAll('.pf-gate')]; (slide._pfT || []).forEach(clearTimeout); slide._pfT = []; if (n >= 1) { slide.classList.add('pf-checking'); slide.classList.remove('pf-ready'); gates.forEach(g => { g.classList.remove('passed'); g.classList.add('checking'); }); gates.forEach((g, i) => { slide._pfT.push(setTimeout(() => { g.classList.remove('checking'); g.classList.add('passed'); if (i === gates.length - 1) slide.classList.add('pf-ready'); }, 2000 + i * 450)); }); } else { slide.classList.remove('pf-checking', 'pf-ready'); gates.forEach(g => g.classList.remove('checking', 'passed')); } }, steps: [
      { cap: 'Review the journey summary — linked to the <b>approval record</b>.', cur: '.pf-meta' },
      { cap: '<b>Check before publish</b> — gates run, then Publish unlocks.', cur: '.pf-checkbtn' },
    ]},
    'cja-kpi': { steps: [
      { cap: 'Reporting tied to <b>downstream outcomes</b> — conversion, churn, support.', cur: '.kpi-tiles' },
      { cap: 'Conversion <b>trend by week</b>.', cur: '.kpi-chart' },
      { cap: '<b>Trending topics</b> across the journey, AI-surfaced.', cur: '.kpi-tlist' },
      { cap: 'Drill into <b>subtopics</b> — emerging issues surface early.', cur: '.kpi-sub' },
    ]},
    'ca-content': { steps: [
      { cap: 'See <b>content performance</b> across every channel.', cur: '.cap-cards' },
      { cap: 'AI <b>auto-tags</b> every asset — no manual labels.', cur: '.cap-card.top .cap-tags' },
      { cap: 'The top performer\u2019s <b>channel breakdown</b>.', cur: '.cap-pie' },
      { cap: 'An actionable <b>insight</b> to act on.', cur: '.cap-ins' },
    ]},
    'cja-journey': { steps: [
      { cap: 'The journey <b>funnel</b> — sent to converted.', cur: '.jp-fun' },
      { cap: '<b>High-performing channels</b>, ranked.', cur: '.jp-pie' },
      { cap: '<b>Campaign results</b> at a glance.', cur: '.jp-res' },
      { cap: 'The <b>winning channel</b> stands out.', cur: '.jp-best' },
    ]},
    'llm-discovery': { onStep: (slide, n) => { slide.classList.toggle('llm-grow', n >= 1); }, steps: [
      { cap: 'Referrer traffic from <b>AI interfaces</b> — ChatGPT, Perplexity, Gemini.', cur: '.llm-srcs' },
      { cap: 'AI-driven discovery is <b>growing fast</b>.', cur: '.llm-hl' },
      { cap: 'Segment it and <b>compare vs organic</b>.', cur: '.llm-segs' },
      { cap: '<b>LLM Optimizer</b> prioritizes where to invest.', cur: '.llm-opt' },
    ]},
  };

  let deck = null;
  const rafMap = new WeakMap();
  const typeMap = new WeakMap();
  const easeInOut = t => (t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2);

  function stopType(slide) {
    const id = typeMap.get(slide);
    if (id) { clearTimeout(id); typeMap.delete(slide); }
  }
  function startType(slide, cfg) {
    stopType(slide);
    const el = slide.querySelector(cfg.sel);
    if (!el) return;
    const full = cfg.text;
    el.textContent = '';
    let i = 0;
    const tick = () => {
      i++;
      el.textContent = full.slice(0, i);
      if (i < full.length) typeMap.set(slide, setTimeout(tick, cfg.speed));
      else typeMap.delete(slide);
    };
    typeMap.set(slide, setTimeout(tick, cfg.start || 400));
  }

  function ripple(cur) { cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); }

  function moveCursor(slide, sel, instant) {
    const cur = slide.querySelector('.demo-cursor');
    const tgt = sel && slide.querySelector(sel);
    if (!cur || !tgt) return;
    const sr = slide.getBoundingClientRect();
    const scale = sr.width / 1920 || 1;
    const stage = cur.offsetParent || slide;       // .demo-stage (cursor's positioning context)
    const pr = stage.getBoundingClientRect();
    const tr = tgt.getBoundingClientRect();
    const TIPX = 9.5, TIPY = 4;                      // pointer tip offset inside the 46px cursor
    const offX = Math.min(tr.width / scale * 0.5, 58);
    const offY = tr.height / scale * 0.5;            // true vertical centre of the target
    const ex = (tr.left - pr.left) / scale + offX - TIPX;
    const ey = (tr.top - pr.top) / scale + offY - TIPY;
    let sx = parseFloat(cur.dataset.x), sy = parseFloat(cur.dataset.y);
    if (rafMap.get(cur)) cancelAnimationFrame(rafMap.get(cur));
    if (instant || isNaN(sx)) {
      cur.dataset.x = ex; cur.dataset.y = ey;
      cur.style.transform = `translate(${ex}px, ${ey}px)`;
      ripple(cur); return;
    }
    // quadratic bezier with perpendicular control offset → soft natural arc
    const mx = (sx+ex)/2, my = (sy+ey)/2;
    const dx = ex-sx, dy = ey-sy; const dist = Math.hypot(dx,dy) || 1;
    const off = Math.min(dist * 0.28, 220) * (((sx+sy) % 2 < 1) ? 1 : -1);
    const px = mx + (-dy/dist)*off, py = my + (dx/dist)*off;
    const dur = 1100, t0 = performance.now();
    (function step(now) {
      let t = (now - t0) / dur; if (t > 1) t = 1;
      const e = easeInOut(t);
      const x = (1-e)*(1-e)*sx + 2*(1-e)*e*px + e*e*ex;
      const y = (1-e)*(1-e)*sy + 2*(1-e)*e*py + e*e*ey;
      cur.style.transform = `translate(${x}px, ${y}px)`;
      if (t < 1) rafMap.set(cur, requestAnimationFrame(step));
      else { cur.dataset.x = ex; cur.dataset.y = ey; ripple(cur); }
    })(t0);
  }

  function buildDots(slide, n) {
    const wrap = slide.querySelector('.demo-step-dots');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (let i = 0; i < n; i++) wrap.appendChild(document.createElement('i'));
  }

  function applyStep(slide, n, instant) {
    const cfg = CONFIG[slide.getAttribute('data-demo')];
    if (!cfg) return;
    const last = cfg.steps.length - 1;
    n = Math.max(0, Math.min(n, last));
    slide.dataset.cur = n;
    if (slide._revT) { clearTimeout(slide._revT); slide._revT = null; }
    // 1) cursor moves FIRST (and progress dots advance immediately)
    moveCursor(slide, cfg.steps[n].cur, instant);
    slide.querySelectorAll('.demo-step-dots i').forEach((d, i) => d.classList.toggle('on', i === n));
    // 2) the actual reveal / caption / effects happen AFTER the cursor arrives ("click, then animation")
    const reveal = () => {
      slide.querySelectorAll('.si').forEach(el => {
        el.classList.toggle('revealed', (+el.dataset.step || 0) <= n);
      });
      const cap = slide.querySelector('.dc-txt');
      if (cap) { cap.style.opacity = '0'; setTimeout(() => { cap.innerHTML = cfg.steps[n].cap; cap.style.opacity = '1'; }, 170); }
      slide.classList.toggle('done-steps', n >= last);
      // settle cursor onto its target BEFORE running per-demo effects (so drag choreography starts from the right spot)
      if (cfg.steps[n].cur) moveCursor(slide, cfg.steps[n].cur, true);
      if (cfg.onStep) cfg.onStep(slide, n);
    };
    if (instant || n === 0) reveal();
    else slide._revT = setTimeout(reveal, 1150);   // ~ cursor travel time
  }

  function enter(slide) {
    const cfg = CONFIG[slide.getAttribute('data-demo')];
    slide.classList.remove('play', 'done-steps');
    void slide.offsetWidth;
    slide.classList.add('play');
    if (!cfg) return;
    slide.classList.add('stepped');
    buildDots(slide, cfg.steps.length);
    slide.dataset.cur = 0;
    const curEl = slide.querySelector('.demo-cursor');
    if (curEl) { delete curEl.dataset.x; delete curEl.dataset.y; }
    applyStep(slide, 0, true);
    setTimeout(() => moveCursor(slide, cfg.steps[+slide.dataset.cur || 0].cur, true), 240);
    if (cfg.type) startType(slide, cfg.type);
  }

  function leave(slide) {
    slide.classList.remove('play', 'stepped', 'done-steps');
    const cfg = CONFIG[slide.getAttribute('data-demo')];
    if (cfg && cfg.type) {
      stopType(slide);
      const el = slide.querySelector(cfg.type.sel);
      if (el) el.textContent = cfg.type.text;   // restore full text (static-correct)
    }
  }

  function advance(slide) {
    const cfg = CONFIG[slide.getAttribute('data-demo')];
    if (!cfg) return;
    const cur = +slide.dataset.cur || 0;
    const last = cfg.steps.length - 1;
    if (cur < last) applyStep(slide, cur + 1, false);
    else if (deck) {
      const idx = +slide.getAttribute('data-deck-slide');
      if (!isNaN(idx)) deck.goTo(idx + 1);
    }
  }

  function handle(e) {
    const cur = e.detail && e.detail.slide;
    const prev = e.detail && e.detail.previousSlide;
    if (prev && prev.classList && prev.classList.contains('demo')) leave(prev);
    if (cur && cur.classList && cur.classList.contains('demo')) enter(cur);
    if (prev && prev.classList && prev.classList.contains('video-slide')) resetVid(prev);
    if (cur && cur.classList && cur.classList.contains('video-slide')) resetVid(cur);
  }

  /* ---- video helpers ---- */
  function resetVid(slide) {
    const v = slide.querySelector('.vid');
    if (!v) return;
    slide.classList.remove('playing');
    v.removeAttribute('controls');
    // Static cover: a poster attribute shows reliably; load() re-displays it
    // after a previous play, with no dependency on decoding a live frame.
    if (v.getAttribute('poster')) {
      try { v.pause(); v.load(); } catch (e) {}
      return;
    }
    const pt = parseFloat(v.dataset.posterTime) || 0;
    if (pt && !v.dataset.primed) {
      v.dataset.primed = '1';
      v.muted = true;
      const settle = () => { try { v.pause(); v.currentTime = pt; } catch (e) {} };
      const p = v.play();
      if (p && p.then) { p.then(() => setTimeout(settle, 60)).catch(() => { try { v.currentTime = pt; } catch (e) {} }); }
      else { setTimeout(settle, 60); }
      return;
    }
    try { v.pause(); if (Math.abs(v.currentTime - pt) > 0.05) v.currentTime = pt; } catch (e) {}
  }
  function playVid(slide) {
    const v = slide.querySelector('.vid'); if (!v) return;
    v.muted = false;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  }
  function toggleVid(slide) {
    const v = slide.querySelector('.vid'); if (!v) return;
    if (v.paused) playVid(slide); else v.pause();
  }

  function curSlide() {
    return deck && (deck.querySelector('section[data-deck-active]') ||
      deck.querySelector('.demo[data-deck-active], .video-slide[data-deck-active]'));
  }

  /* forward on an animation slide: returns true if it consumed the action */
  function stepForward(slide) {
    const cfg = CONFIG[slide.getAttribute('data-demo')];
    if (!cfg) return false;
    const cur = +slide.dataset.cur || 0;
    if (cur < cfg.steps.length - 1) { applyStep(slide, cur + 1, false); return true; }
    return false;
  }
  function stepBack(slide) {
    const cfg = CONFIG[slide.getAttribute('data-demo')];
    if (!cfg) return false;
    const cur = +slide.dataset.cur || 0;
    if (cur > 0) { applyStep(slide, cur - 1, false); return true; }
    return false;
  }

  const FINE = matchMedia('(pointer: fine)');
  const NAV_SKIP = 'a[href],button,input,select,textarea,[role="button"],[contenteditable]';

  function onNavKey(e) {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || ''))) return;
    const s = curSlide(); if (!s) return;
    const k = e.key;
    if (s.classList.contains('video-slide')) {
      if (k === ' ' || k === 'Spacebar') { e.preventDefault(); e.stopImmediatePropagation(); toggleVid(s); }
      return; // arrows fall through to deck → change slide
    }
    if (s.classList.contains('demo')) {
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Spacebar') {
        if (stepForward(s)) { e.preventDefault(); e.stopImmediatePropagation(); }
      } else if (k === 'ArrowLeft' || k === 'PageUp') {
        if (stepBack(s)) { e.preventDefault(); e.stopImmediatePropagation(); }
      }
    }
  }

  function onNavClick(e) {
    if (!FINE.matches) return;                 // touch handled by deck-stage taps
    const path = e.composedPath ? e.composedPath() : [];
    for (const n of path) {
      if (n === deck) break;
      if (n.nodeType === 1) {
        if (n.hasAttribute && n.hasAttribute('data-omelette-chrome')) return;  // deck chrome/rail
        if (n.matches && n.matches(NAV_SKIP)) return;                          // interactive content
      }
    }
    const s = curSlide(); if (!s) return;
    if (s.classList.contains('video-slide')) {
      const v = s.querySelector('.vid');
      const overVideo = v && path.indexOf(v) !== -1;
      if (overVideo) { if (v.paused) playVid(s); return; }   // click video → play; while playing, leave native controls
      deck.next();                                            // click margin → next slide
      return;
    }
    if (s.classList.contains('demo')) {
      if (!stepForward(s)) deck.next();
      return;
    }
    deck.next();                                              // normal slide → next
  }

  function attach() {
    deck = document.querySelector('deck-stage');
    if (!deck) { setTimeout(attach, 100); return; }
    deck.addEventListener('slidechange', handle);
    // video: keep overlay in sync with play state + reveal native controls on hover
    deck.querySelectorAll('.video-slide').forEach(slide => {
      const v = slide.querySelector('.vid');
      if (!v) return;
      // Cover frame: park the (paused) video on data-poster-time. A paused
      // <video> paints whatever frame it's parked on, so this shows that
      // frame instead of the black frame-0. Re-applied on every readiness
      // event because a late buffer can snap it back to 0.
      const pt = parseFloat(v.dataset.posterTime);
      if (pt) {
        const park = () => { if (!slide.classList.contains('playing') && Math.abs(v.currentTime - pt) > 0.05) { try { v.currentTime = pt; } catch (e) {} } };
        v.addEventListener('loadedmetadata', park);
        v.addEventListener('loadeddata', park);
        v.addEventListener('canplay', park);
        v.addEventListener('canplaythrough', park);
        if (v.readyState >= 1) park(); else { try { v.load(); } catch (e) {} }
      }
      v.addEventListener('play', () => slide.classList.add('playing'));
      v.addEventListener('pause', () => slide.classList.remove('playing'));
      v.addEventListener('mouseenter', () => v.setAttribute('controls', ''));
      v.addEventListener('mouseleave', () => v.removeAttribute('controls'));
    });
    // unified navigation: arrows AND click advance steps then slides
    window.addEventListener('keydown', onNavKey, true);
    deck.addEventListener('click', onNavClick);
    const act = deck.querySelector('.demo[data-deck-active]');
    if (act) enter(act);
    const actv = deck.querySelector('.video-slide[data-deck-active]');
    if (actv) resetVid(actv);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
