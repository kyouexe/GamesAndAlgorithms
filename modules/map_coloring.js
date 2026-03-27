

(function MapColoringModule() {
  // ---------- Constants ----------
  const COLORS      = ['#E53E3E', '#38A169', '#3182CE', '#D69E2E'];
  const COLOR_NAMES = ['Red', 'Green', 'Blue', 'Yellow'];
  const UNASSIGNED  = null;

  // ---------- Map Graph ----------
  // A realistic-looking hexagonal map made of polygon regions
  // Each region has a polygon points string for SVG + a centroid for labels/dots
  const REGIONS = [
    { id: 0, name: 'Region A', cx: 100, cy: 110 },
    { id: 1, name: 'Region B', cx: 260, cy:  80 },
    { id: 2, name: 'Region C', cx: 410, cy: 110 },
    { id: 3, name: 'Region D', cx: 100, cy: 270 },
    { id: 4, name: 'Region E', cx: 260, cy: 290 },
    { id: 5, name: 'Region F', cx: 410, cy: 270 },
  ];

  // SVG polygon shapes for each region (realistic map look)
  const REGION_PATHS = [
    // A — top-left
    '20,20  175,20  195,95  155,190  20,190',
    // B — top-center
    '180,20  350,20  375,45  375,140  310,160  195,155  175,60',
    // C — top-right
    '360,20  480,20  480,200  455,200  375,145  375,45',
    // D — bottom-left
    '20,195  160,195  200,380  20,380',
    // E — bottom-center
    '165,200  315,160  375,150  385,380  205,380',
    // F — bottom-right
    '380,150  480,205  480,380  390,380  375,155',
  ];

  // Adjacency
  const EDGES = [
    [0,1],[1,2],[0,3],[1,3],[1,4],[2,4],[2,5],[3,4],[4,5],[1,5]
  ];

  const ADJACENCY = {};
  REGIONS.forEach(r => { ADJACENCY[r.id] = []; });
  EDGES.forEach(([a, b]) => {
    ADJACENCY[a].push(b);
    ADJACENCY[b].push(a);
  });

  // ---------- State ----------
  let assignment    = {};  // { regionId: colorIndex }
  let userAssigned  = {};  // { regionId: true } — regions user manually colored
  let selectedRegion = null;
  let aiSolving     = false;
  let stepLog       = [];
  let stepIndex     = 0;
  let backtracks    = 0;

  // ---------- DOM Refs ----------
  const svg        = document.getElementById('mc-svg');
  const btnReset   = document.getElementById('mc-reset');
  const btnStep    = document.getElementById('mc-step');
  const btnSolve   = document.getElementById('mc-solve');
  const statSteps  = document.getElementById('mc-steps');
  const statBt     = document.getElementById('mc-backtracks');
  const logPanel   = document.getElementById('mc-log');

  // ---------- Color Picker (dynamic UI injected) ----------
  const colorPicker = document.getElementById('mc-color-picker');

  function buildColorPicker() {
    colorPicker.innerHTML = '';
    COLORS.forEach((clr, i) => {
      const btn = document.createElement('button');
      btn.className  = 'mc-color-btn';
      btn.title      = COLOR_NAMES[i];
      btn.style.background = clr;
      btn.dataset.colorIdx = i;
      btn.addEventListener('click', () => onColorPick(i));
      colorPicker.appendChild(btn);
    });
    updateColorPickerState();
  }

  function updateColorPickerState() {
    const enabled = selectedRegion !== null && !aiSolving;
    colorPicker.querySelectorAll('.mc-color-btn').forEach(btn => {
      const ci = parseInt(btn.dataset.colorIdx);
      // Disable colors that conflict with assigned neighbors
      let conflicts = false;
      if (enabled && selectedRegion !== null) {
        for (const nb of ADJACENCY[selectedRegion]) {
          if (assignment[nb] === ci) { conflicts = true; break; }
        }
      }
      btn.disabled = !enabled || conflicts;
      btn.classList.toggle('mc-color-conflict', conflicts);
      btn.classList.toggle('mc-color-active',
        enabled && assignment[selectedRegion] === ci);
    });
  }

  // ---------- SVG Rendering ----------
  function renderSVG() {
    svg.innerHTML = '';

    // Shadow / glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="region-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
      <filter id="region-selected" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#fff" flood-opacity="0.85"/>
      </filter>`;
    svg.appendChild(defs);

    // Draw regions
    REGIONS.forEach((region, idx) => {
      const colorIdx = assignment[region.id];
      const isSelected  = selectedRegion === region.id;
      const isUserColor = userAssigned[region.id];
      const fillColor   = (colorIdx !== undefined && colorIdx !== UNASSIGNED)
        ? COLORS[colorIdx]
        : '#1e2a3a';

      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', REGION_PATHS[idx]);
      poly.setAttribute('fill', fillColor);
      poly.setAttribute('stroke', isSelected ? '#fff' : 'rgba(255,255,255,0.18)');
      poly.setAttribute('stroke-width', isSelected ? '3' : '1.5');
      poly.setAttribute('filter', isSelected ? 'url(#region-selected)' : 'url(#region-shadow)');
      poly.setAttribute('class', 'mc-region' + (aiSolving ? '' : ' mc-region-interactive'));
      poly.setAttribute('id', `region-poly-${region.id}`);
      poly.style.cursor = aiSolving ? 'default' : 'pointer';
      poly.style.transition = 'fill 0.4s ease';

      // User-assigned badge ring
      if (isUserColor) {
        poly.setAttribute('stroke', isSelected ? '#fff' : '#ffd700');
        poly.setAttribute('stroke-width', isSelected ? '3.5' : '2.5');
        poly.setAttribute('stroke-dasharray', '6 3');
      }

      poly.addEventListener('click', () => onRegionClick(region.id));
      svg.appendChild(poly);

      // Region label
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', region.cx);
      label.setAttribute('y', region.cy - 8);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'mc-region-label');
      label.setAttribute('fill', (colorIdx !== undefined && colorIdx !== UNASSIGNED)
        ? (shouldUseDark(COLORS[colorIdx]) ? '#111' : '#fff')
        : '#8baac8');
      label.setAttribute('font-size', '13');
      label.setAttribute('font-weight', '600');
      label.setAttribute('pointer-events', 'none');
      label.textContent = region.name;
      svg.appendChild(label);

      // Color name sub-label
      if (colorIdx !== undefined && colorIdx !== UNASSIGNED) {
        const sub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        sub.setAttribute('x', region.cx);
        sub.setAttribute('y', region.cy + 12);
        sub.setAttribute('text-anchor', 'middle');
        sub.setAttribute('class', 'mc-region-label');
        sub.setAttribute('font-size', '11');
        sub.setAttribute('fill', shouldUseDark(COLORS[colorIdx]) ? '#333' : '#eee');
        sub.setAttribute('pointer-events', 'none');
        sub.textContent = COLOR_NAMES[colorIdx] + (isUserColor ? ' ★' : '');
        svg.appendChild(sub);
      }

      // "Click me" hint for unassigned
      if (colorIdx === undefined || colorIdx === UNASSIGNED) {
        const hint = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        hint.setAttribute('x', region.cx);
        hint.setAttribute('y', region.cy + 14);
        hint.setAttribute('text-anchor', 'middle');
        hint.setAttribute('font-size', '10');
        hint.setAttribute('fill', isSelected ? '#ffe77a' : '#4a7fa5');
        hint.setAttribute('pointer-events', 'none');
        hint.textContent = isSelected ? '← pick a color' : 'click to select';
        svg.appendChild(hint);
      }

      // Selection crown indicator
      if (isSelected) {
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        ring.setAttribute('x', region.cx);
        ring.setAttribute('y', region.cy - 28);
        ring.setAttribute('text-anchor', 'middle');
        ring.setAttribute('font-size', '18');
        ring.setAttribute('pointer-events', 'none');
        ring.textContent = '▼';
        ring.setAttribute('fill', '#ffe77a');
        svg.appendChild(ring);
      }
    });

    // Draw edges (on top of regions for visibility)
    EDGES.forEach(([a, b]) => {
      const rA = REGIONS[a], rB = REGIONS[b];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', rA.cx); line.setAttribute('y1', rA.cy);
      line.setAttribute('x2', rB.cx); line.setAttribute('y2', rB.cy);
      line.setAttribute('stroke', 'rgba(255,255,255,0.10)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-dasharray', '4 4');
      line.setAttribute('pointer-events', 'none');
      svg.appendChild(line);
    });
  }

  // Luminance check — use dark text on light backgrounds
  function shouldUseDark(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    return (0.299*r + 0.587*g + 0.114*b) > 160;
  }

  // ---------- Interaction ----------
  function onRegionClick(id) {
    if (aiSolving) return;
    selectedRegion = (selectedRegion === id) ? null : id;
    renderSVG();
    updateColorPickerState();
    updateStatusBar(id);
  }

  function onColorPick(colorIdx) {
    if (selectedRegion === null || aiSolving) return;

    // Assign user choice
    assignment[selectedRegion]   = colorIdx;
    userAssigned[selectedRegion] = true;

    addLog(`You assigned ${REGIONS[selectedRegion].name} = ${COLOR_NAMES[colorIdx]}`, 'user');

    // Deselect and render
    const justAssigned = selectedRegion;
    selectedRegion = null;
    renderSVG();
    updateColorPickerState();
    updateHint();

    // Check if all assigned by user
    const unassigned = REGIONS.filter(r => assignment[r.id] === undefined);
    if (unassigned.length === 0) {
      addLog('✓ All regions colored by you!', 'ok');
      return;
    }

    // Trigger AI to solve remainder
    triggerAISolve(justAssigned);
  }

  function updateStatusBar(clickedId) {
    const bar = document.getElementById('mc-status-bar');
    if (!bar) return;
    if (selectedRegion !== null) {
      bar.textContent = `${REGIONS[selectedRegion].name} selected — pick a color from the palette`;
    } else {
      bar.textContent = 'Click any uncolored region to select it, then choose a color.';
    }
  }

  function updateHint() {
    const bar = document.getElementById('mc-status-bar');
    if (!bar) return;
    const unassigned = REGIONS.filter(r => assignment[r.id] === undefined);
    if (unassigned.length > 0) {
      bar.textContent = `AI is solving… ${unassigned.length} region(s) remaining`;
    } else {
      bar.textContent = '✓ Map fully colored! Press Reset to try again.';
    }
  }

  // ---------- CSP Solver (AI) ----------
  function initDomains(existingAssignment) {
    const d = {};
    REGIONS.forEach(r => {
      if (existingAssignment[r.id] !== undefined) {
        d[r.id] = [existingAssignment[r.id]]; // already fixed
      } else {
        d[r.id] = [0, 1, 2, 3];
      }
    });
    return d;
  }

  function forwardCheck(varId, colorIdx, domainsSnap, assignSnap) {
    const nd = {};
    for (const k in domainsSnap) nd[k] = [...domainsSnap[k]];
    for (const nb of ADJACENCY[varId]) {
      if (assignSnap[nb] !== undefined) continue;
      nd[nb] = nd[nb].filter(c => c !== colorIdx);
      if (nd[nb].length === 0) return null;
    }
    return nd;
  }

  function deepDomains(d) {
    const out = {};
    for (const k in d) out[k] = [...d[k]];
    return out;
  }

  function backtrack(assignSnap, domSnap, varList, index, log) {
    if (index === varList.length) {
      log.push({ assignment: { ...assignSnap }, msg: '✓ AI found a valid coloring!', type: 'ok' });
      return true;
    }

    const varId = varList[index];

    // If already assigned (user choice), skip
    if (assignSnap[varId] !== undefined) {
      return backtrack(assignSnap, domSnap, varList, index + 1, log);
    }

    for (const colorIdx of domSnap[varId]) {
      let ok = true;
      for (const nb of ADJACENCY[varId]) {
        if (assignSnap[nb] === colorIdx) { ok = false; break; }
      }
      if (!ok) continue;

      assignSnap[varId] = colorIdx;
      const nd = forwardCheck(varId, colorIdx, domSnap, assignSnap);

      log.push({
        assignment: { ...assignSnap },
        msg: `AI: Assign ${REGIONS[varId].name} = ${COLOR_NAMES[colorIdx]}`,
        type: nd ? 'info' : 'err'
      });

      if (nd) {
        if (backtrack(assignSnap, nd, varList, index + 1, log)) return true;
      }

      delete assignSnap[varId];
      backtracks++;
      log.push({
        assignment: { ...assignSnap },
        msg: `AI: Backtrack from ${REGIONS[varId].name} (${COLOR_NAMES[colorIdx]})`,
        type: 'err'
      });
    }
    return false;
  }

  async function triggerAISolve(lastUserRegion) {
    aiSolving = true;
    updateColorPickerState();

    stepLog   = [];
    backtracks = 0;

    const assignSnap = { ...assignment };
    const domains    = initDomains(assignSnap);
    const varOrder   = REGIONS.map(r => r.id);

    const found = backtrack(assignSnap, domains, varOrder, 0, stepLog);

    if (!found) {
      addLog('✗ No solution with your color choice! Try resetting.', 'err');
      aiSolving = false;
      updateColorPickerState();
      return;
    }

    // Animate AI steps
    for (let i = 0; i < stepLog.length; i++) {
      const snap = stepLog[i];
      // Only update AI-assigned (not user region)
      for (const [rid, cidx] of Object.entries(snap.assignment)) {
        if (!userAssigned[+rid]) {
          assignment[+rid] = cidx;
        }
      }
      statSteps.textContent  = i + 1;
      statBt.textContent     = backtracks;
      renderSVG();
      addLog(snap.msg, snap.type);
      await sleep(320);
    }

    aiSolving = false;
    updateColorPickerState();
    updateHint();
    const bar = document.getElementById('mc-status-bar');
    if (bar) bar.textContent = '✓ Map fully colored! Click Reset to try a different choice.';
  }

  // ---------- Manual Step Mode ----------
  function stepOnce() {
    if (aiSolving) return;
    if (stepLog.length === 0) {
      addLog('Pick a region & color first to start the CSP.', 'info');
      return;
    }
    if (stepIndex < stepLog.length) {
      const snap = stepLog[stepIndex];
      for (const [rid, cidx] of Object.entries(snap.assignment)) {
        if (!userAssigned[+rid]) assignment[+rid] = cidx;
      }
      statSteps.textContent = stepIndex + 1;
      statBt.textContent    = backtracks;
      renderSVG();
      addLog(snap.msg, snap.type);
      stepIndex++;
    }
  }

  // ---------- Reset ----------
  function resetModule() {
    assignment     = {};
    userAssigned   = {};
    selectedRegion = null;
    aiSolving      = false;
    stepLog        = [];
    stepIndex      = 0;
    backtracks     = 0;
    statSteps.textContent = '0';
    statBt.textContent    = '0';
    logPanel.innerHTML    = '';
    const bar = document.getElementById('mc-status-bar');
    if (bar) bar.textContent = 'Click any region to select it, then choose a color from the palette.';
    renderSVG();
    updateColorPickerState();
  }

  // ---------- Helpers ----------
  function addLog(msg, type) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type || 'info'}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logPanel.prepend(entry);
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  // ---------- Event Bindings ----------
  btnReset.addEventListener('click', resetModule);
  btnStep.addEventListener('click', stepOnce);
  // "Solve CSP" now auto-assigns a random region then solves the rest
  btnSolve.addEventListener('click', () => {
    if (aiSolving) return;
    resetModule();
    // Pick a random region + color to demonstrate AI solving
    const ridx = Math.floor(Math.random() * REGIONS.length);
    const cidx = Math.floor(Math.random() * COLORS.length);
    assignment[ridx]    = cidx;
    userAssigned[ridx]  = true;
    addLog(`Demo: ${REGIONS[ridx].name} = ${COLOR_NAMES[cidx]} (AI will color the rest)`, 'user');
    renderSVG();
    triggerAISolve(ridx);
  });

  // ---------- Init ----------
  buildColorPicker();
  resetModule();

})();
