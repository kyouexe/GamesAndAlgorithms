/**
 * HANOI.JS — Tower of Hanoi using Recursive State-Space Search
 *
 * Algorithm:  Recursive solve(n, src, dst, aux) → optimal move sequence
 * State Space: Distribution of N disks across 3 pegs (3^N total states)
 * Optimal:    2^N - 1 moves
 */

(function HanoiModule() {
  const canvas    = document.getElementById('hanoi-canvas');
  const ctx       = canvas.getContext('2d');
  const selectN   = document.getElementById('hanoi-disks');
  const btnSolve  = document.getElementById('hanoi-solve');
  const btnReset  = document.getElementById('hanoi-reset');
  const sliderSpd = document.getElementById('hanoi-speed');
  const statMove  = document.getElementById('hanoi-move-num');
  const statTotal = document.getElementById('hanoi-total-moves');
  const logPanel  = document.getElementById('hanoi-log');

  const W = canvas.width, H = canvas.height;
  const PEG_NAMES = ['A', 'B', 'C'];

  let pegs = [[], [], []]; // pegs[i] = array of disk sizes (bottom first)
  let moves = [];
  let currentMoveIdx = 0;
  let animTimer = null;
  let N = 3;

  // ---------- Colors for disks ----------
  const DISK_COLORS = [
    '#E53E3E','#DD6B20','#D69E2E','#38A169','#3182CE','#805AD5'
  ];

  // ---------- Recursive Algorithm ----------
  /**
   * Recursively generates optimal move sequence.
   * @param {number} n     - number of disks
   * @param {number} src   - source peg index
   * @param {number} dst   - destination peg index
   * @param {number} aux   - auxiliary peg index
   */
  function hanoi(n, src, dst, aux) {
    if (n === 0) return;
    hanoi(n - 1, src, aux, dst);
    moves.push([src, dst]);
    hanoi(n - 1, aux, dst, src);
  }

  // ---------- Rendering ----------
  const PEG_X   = [W * 0.18, W * 0.5, W * 0.82];
  const BASE_Y  = H - 30;
  const PEG_H   = H - 70;
  const MAX_DISK_W = 130;
  const MIN_DISK_W = 30;
  const DISK_H     = 20;

  function diskWidth(size, n) {
    return MIN_DISK_W + ((size - 1) / (n - 1 || 1)) * (MAX_DISK_W - MIN_DISK_W);
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, W, H);
    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);
  }

  function drawPegs() {
    PEG_X.forEach((x, i) => {
      // Base
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.roundRect(x - MAX_DISK_W / 2 - 10, BASE_Y - 8, MAX_DISK_W + 20, 12, 4);
      ctx.fill();

      // Rod
      ctx.fillStyle = 'rgba(255,255,255,0.20)';
      ctx.fillRect(x - 5, BASE_Y - PEG_H, 10, PEG_H);

      // Label
      ctx.fillStyle = '#718096';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Peg ${PEG_NAMES[i]}`, x, BASE_Y + 18);
    });
  }

  function drawDisks() {
    pegs.forEach((peg, pi) => {
      const pegX = PEG_X[pi];
      peg.forEach((diskSize, di) => {
        const dw = diskWidth(diskSize, N);
        const dx = pegX - dw / 2;
        const dy = BASE_Y - DISK_H - di * (DISK_H + 3) - 8;

        const color = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length];

        // Draw disk
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(dx, dy, dw, DISK_H, 4);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.roundRect(dx + 4, dy + 2, dw - 8, 6, 2);
        ctx.fill();

        // Size label
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = 'bold 11px Fira Code, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(diskSize, pegX, dy + 14);
      });
    });
  }

  function render() {
    clearCanvas();
    drawPegs();
    drawDisks();
  }

  // ---------- Init ----------
  function initHanoi() {
    N = parseInt(selectN.value);
    pegs = [[], [], []];
    moves = [];
    currentMoveIdx = 0;
    if (animTimer) { clearTimeout(animTimer); animTimer = null; }

    // Stack all disks on peg A (largest at bottom)
    for (let i = N; i >= 1; i--) pegs[0].push(i);

    const totalMoves = Math.pow(2, N) - 1;
    statMove.textContent = '0';
    statTotal.textContent = totalMoves;
    logPanel.innerHTML = '';
    addLog(`Initialized with ${N} disks. Optimal moves: ${totalMoves}`, 'info');
    render();
    btnSolve.disabled = false;
  }

  // ---------- Solve ----------
  function solve() {
    if (currentMoveIdx > 0) { initHanoi(); return; }
    hanoi(N, 0, 2, 1);
    btnSolve.disabled = true;
    playNextMove();
  }

  function getSpeed() {
    // Slider max=1200 → slowest, min=100 → fastest
    return parseInt(sliderSpd.value);
  }

  function playNextMove() {
    if (currentMoveIdx >= moves.length) {
      addLog(`✓ Complete! All ${N} disks moved to Peg C in ${moves.length} moves.`, 'ok');
      btnSolve.disabled = false;
      return;
    }

    const [src, dst] = moves[currentMoveIdx];
    const disk = pegs[src].pop();
    pegs[dst].push(disk);

    currentMoveIdx++;
    statMove.textContent = currentMoveIdx;

    const msg = `Move ${currentMoveIdx}: Disk ${disk}: Peg ${PEG_NAMES[src]} → Peg ${PEG_NAMES[dst]}`;
    addLog(msg, 'info');
    render();

    animTimer = setTimeout(playNextMove, getSpeed());
  }

  function addLog(msg, type) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type || 'info'}`;
    entry.textContent = msg;
    logPanel.prepend(entry);
  }

  // ---------- Events ----------
  btnSolve.addEventListener('click', solve);
  btnReset.addEventListener('click', initHanoi);
  selectN.addEventListener('change', initHanoi);

  // ---------- Init ----------
  initHanoi();

})(); // end HanoiModule
