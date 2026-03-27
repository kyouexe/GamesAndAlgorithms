/**
 * PATHFINDER.JS — A* Search Algorithm Visualizer
 * 
 * Algorithm:  A* with Manhattan Distance heuristic
 * State Space: 20x20 grid cells (up to 400 nodes)
 * Heuristic:  h(n) = |x - goalX| + |y - goalY|  (admissible for 4-directional grids)
 */

(function PathfinderModule() {
  const ROWS = 20, COLS = 20;
  const CELL_SIZE = 28; // pixels (matches CSS)

  // Node states
  const STATE = { EMPTY: 0, WALL: 1, START: 2, END: 3, OPEN: 4, CLOSED: 5, PATH: 6 };
  const CLASS  = ['', 'wall', 'start', 'end', 'open', 'closed', 'path'];

  let grid = [];       // 2D array of state values
  let cellEls = [];    // 2D array of <div> elements
  let startPos = { r: 10, c: 2 };
  let endPos   = { r: 10, c: 17 };
  let isRunning = false;
  let isMouseDown = false;
  let dragTarget = null; // 'start' | 'end' | null
  let animSpeed = 18;    // ms per step

  const container = document.getElementById('pf-grid-container');
  const btnStart  = document.getElementById('pf-start');
  const btnClear  = document.getElementById('pf-clear');
  const btnClearW = document.getElementById('pf-clear-walls');
  const statVisited = document.getElementById('pf-visited');
  const statPath    = document.getElementById('pf-path-len');

  // ---------- Grid Initialization ----------
  function initGrid() {
    grid = [];
    cellEls = [];
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${COLS}, ${CELL_SIZE}px)`;
    container.style.gridTemplateRows    = `repeat(${ROWS}, ${CELL_SIZE}px)`;

    for (let r = 0; r < ROWS; r++) {
      grid.push([]);
      cellEls.push([]);
      for (let c = 0; c < COLS; c++) {
        grid[r].push(STATE.EMPTY);
        const cell = document.createElement('div');
        cell.className = 'pf-cell';
        cell.dataset.r = r;
        cell.dataset.c = c;
        container.appendChild(cell);
        cellEls[r].push(cell);

        // Mouse events for wall drawing & node dragging
        cell.addEventListener('mousedown', e => onMouseDown(e, r, c));
        cell.addEventListener('mouseenter', () => onMouseEnter(r, c));
        cell.addEventListener('mouseup', () => { isMouseDown = false; dragTarget = null; });
      }
    }

    // Set start & end
    setCell(startPos.r, startPos.c, STATE.START);
    setCell(endPos.r,   endPos.c,   STATE.END);
    statVisited.textContent = '0';
    statPath.textContent = '0';
  }

  function setCell(r, c, state) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    grid[r][c] = state;
    const el = cellEls[r][c];
    el.className = 'pf-cell';
    if (CLASS[state]) el.classList.add(CLASS[state]);
    // Labels
    if (state === STATE.START) el.setAttribute('data-label', 'S');
    else if (state === STATE.END) el.setAttribute('data-label', 'E');
    else el.removeAttribute('data-label');
  }

  function clearPath() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c] === STATE.OPEN || grid[r][c] === STATE.CLOSED || grid[r][c] === STATE.PATH)
          setCell(r, c, STATE.EMPTY);
  }

  // ---------- Mouse Interaction ----------
  function onMouseDown(e, r, c) {
    e.preventDefault();
    isMouseDown = true;
    if (isRunning) return;

    if (grid[r][c] === STATE.START) { dragTarget = 'start'; return; }
    if (grid[r][c] === STATE.END)   { dragTarget = 'end';   return; }
    dragTarget = null;
    clearPath();
    toggleWall(r, c);
  }

  function onMouseEnter(r, c) {
    if (!isMouseDown || isRunning) return;
    if (dragTarget === 'start') {
      setCell(startPos.r, startPos.c, STATE.EMPTY);
      startPos = { r, c };
      setCell(r, c, STATE.START);
    } else if (dragTarget === 'end') {
      setCell(endPos.r, endPos.c, STATE.EMPTY);
      endPos = { r, c };
      setCell(r, c, STATE.END);
    } else {
      if (grid[r][c] !== STATE.START && grid[r][c] !== STATE.END)
        toggleWall(r, c);
    }
  }

  function toggleWall(r, c) {
    if (grid[r][c] === STATE.WALL)  setCell(r, c, STATE.EMPTY);
    else if (grid[r][c] === STATE.EMPTY) setCell(r, c, STATE.WALL);
  }

  document.addEventListener('mouseup', () => { isMouseDown = false; dragTarget = null; });

  // ---------- A* Algorithm ----------
  /**
   * Priority Queue using a min-heap for efficiency
   */
  class MinHeap {
    constructor() { this.heap = []; }
    push(node) {
      this.heap.push(node);
      this._bubbleUp(this.heap.length - 1);
    }
    pop() {
      const top = this.heap[0];
      const last = this.heap.pop();
      if (this.heap.length > 0) { this.heap[0] = last; this._sinkDown(0); }
      return top;
    }
    get size() { return this.heap.length; }
    _bubbleUp(i) {
      while (i > 0) {
        const p = Math.floor((i - 1) / 2);
        if (this.heap[p].f <= this.heap[i].f) break;
        [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
        i = p;
      }
    }
    _sinkDown(i) {
      const n = this.heap.length;
      while (true) {
        let smallest = i, l = 2*i+1, r = 2*i+2;
        if (l < n && this.heap[l].f < this.heap[smallest].f) smallest = l;
        if (r < n && this.heap[r].f < this.heap[smallest].f) smallest = r;
        if (smallest === i) break;
        [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
        i = smallest;
      }
    }
  }

  function manhattan(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  }

  async function runAStar() {
    if (isRunning) return;
    isRunning = true;
    btnStart.disabled = true;
    clearPath();

    const sr = startPos.r, sc = startPos.c;
    const er = endPos.r,   ec = endPos.c;

    // Each node: { r, c, g, h, f, parent }
    const gScore = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
    const parent = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const closedSet = Array.from({ length: ROWS }, () => Array(COLS).fill(false));

    gScore[sr][sc] = 0;
    const h0 = manhattan(sr, sc, er, ec);
    const openSet = new MinHeap();
    openSet.push({ r: sr, c: sc, g: 0, h: h0, f: h0 });

    let visitedCount = 0;
    const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

    while (openSet.size > 0) {
      const curr = openSet.pop();
      const { r, c } = curr;

      if (closedSet[r][c]) continue;
      closedSet[r][c] = true;

      // Visualize closed
      if (!(r === sr && c === sc) && !(r === er && c === ec)) {
        setCell(r, c, STATE.CLOSED);
        visitedCount++;
        statVisited.textContent = visitedCount;
        await sleep(animSpeed);
      }

      // Goal reached
      if (r === er && c === ec) {
        await tracePath(er, ec, parent, sr, sc);
        isRunning = false;
        btnStart.disabled = false;
        return;
      }

      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (closedSet[nr][nc] || grid[nr][nc] === STATE.WALL) continue;

        const tentG = gScore[r][c] + 1;
        if (tentG < gScore[nr][nc]) {
          gScore[nr][nc] = tentG;
          parent[nr][nc] = { r, c };
          const h = manhattan(nr, nc, er, ec);
          const f = tentG + h;
          openSet.push({ r: nr, c: nc, g: tentG, h, f });

          // Visualize open set
          if (!(nr === sr && nc === sc) && !(nr === er && nc === ec)) {
            setCell(nr, nc, STATE.OPEN);
          }
        }
      }
    }

    // No path found
    isRunning = false;
    btnStart.disabled = false;
    statPath.textContent = 'No path';
  }

  async function tracePath(er, ec, parent, sr, sc) {
    const path = [];
    let cur = { r: er, c: ec };
    while (cur && !(cur.r === sr && cur.c === sc)) {
      path.push(cur);
      cur = parent[cur.r][cur.c];
    }
    path.reverse();
    statPath.textContent = path.length;
    for (const { r, c } of path) {
      if (!(r === er && c === ec)) setCell(r, c, STATE.PATH);
      await sleep(animSpeed * 1.5);
    }
  }

  // ---------- Utilities ----------
  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  // ---------- Events ----------
  btnStart.addEventListener('click', runAStar);
  btnClear.addEventListener('click', () => { if (!isRunning) { isRunning = false; initGrid(); } });
  btnClearW.addEventListener('click', () => {
    if (isRunning) return;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (grid[r][c] === STATE.WALL) setCell(r, c, STATE.EMPTY);
    clearPath();
  });

  // ---------- Init ----------
  initGrid();

})(); // end PathfinderModule IIFE
