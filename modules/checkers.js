
(function CheckersModule() {
  const canvas      = document.getElementById('ck-board');
  const ctx         = canvas.getContext('2d');
  const btnReset    = document.getElementById('ck-reset');
  const statRed     = document.getElementById('ck-red-count');
  const statBlack   = document.getElementById('ck-black-count');
  const statTurn    = document.getElementById('ck-turn');
  const statusBar   = document.getElementById('ck-status');

  const BOARD_SIZE = 8;
  const CELL = canvas.width / BOARD_SIZE; // 60px

  // Piece types
  const EMPTY = 0, RED = 1, BLACK = 2, RED_K = 3, BLACK_K = 4;
  const AI_DEPTH = 6; // Minimax search depth

  let board = [];
  let selectedPiece = null;    // { r, c }
  let validMoves = [];         // [{ from:{r,c}, to:{r,c}, captures:[{r,c}] }]
  let currentTurn = RED;       // RED or BLACK
  let gameOver = false;
  let aiThinking = false;

  // ---------- Board Initialization ----------
  function initBoard() {
    board = Array.from({ length: 8 }, () => Array(8).fill(EMPTY));
    // Black pieces on rows 0-2
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 8; c++)
        if ((r + c) % 2 === 1) board[r][c] = BLACK;
    // Red pieces on rows 5-7
    for (let r = 5; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if ((r + c) % 2 === 1) board[r][c] = RED;

    currentTurn = RED;
    selectedPiece = null;
    validMoves = [];
    gameOver = false;
    aiThinking = false;
    updateUI();
    renderBoard();
    statusBar.textContent = 'Select a red piece to begin.';
  }

  // ---------- Rendering ----------
  function renderBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // Cell color
        const isDark = (r + c) % 2 === 1;
        ctx.fillStyle = isDark ? '#2d3748' : '#718096';
        ctx.fillRect(c * CELL, r * CELL, CELL, CELL);

        // Highlight valid move destination
        if (isDark && validMoves.some(m => m.to.r === r && m.to.c === c)) {
          ctx.fillStyle = 'rgba(99,179,237,0.35)';
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }

        // Highlight selected piece
        if (selectedPiece && selectedPiece.r === r && selectedPiece.c === c) {
          ctx.fillStyle = 'rgba(246,224,94,0.45)';
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }

        // Draw piece
        const piece = board[r][c];
        if (piece !== EMPTY) drawPiece(r, c, piece);
      }
    }
  }

  function drawPiece(r, c, piece) {
    const x = c * CELL + CELL / 2;
    const y = r * CELL + CELL / 2;
    const radius = CELL * 0.38;
    const isKing = piece === RED_K || piece === BLACK_K;
    const isRed  = piece === RED || piece === RED_K;

    // Shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // Body gradient
    const grad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
    if (isRed) {
      grad.addColorStop(0, '#fc8181');
      grad.addColorStop(1, '#c53030');
    } else {
      grad.addColorStop(0, '#a0aec0');
      grad.addColorStop(1, '#2d3748');
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // King crown
    if (isKing) {
      ctx.font = `bold ${CELL * 0.38}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isRed ? '#fff' : '#f6e05e';
      ctx.fillText('♛', x, y);
    }
  }

  // ---------- Move Generation ----------
  /**
   * Returns all valid moves for a given player on the given board.
   * Jumps (captures) are mandatory if available.
   */
  function getMovesForPlayer(b, player) {
    const pieces = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if ((b[r][c] === player) || (b[r][c] === player + 2)) // piece or king
          pieces.push({ r, c });

    const jumps = [];
    const slides = [];

    for (const { r, c } of pieces) {
      const j = getJumps(b, r, c, []);
      const s = getSlides(b, r, c);
      jumps.push(...j);
      slides.push(...s);
    }
    return jumps.length > 0 ? jumps : slides;
  }

  function dirs(piece) {
    if (piece === RED)     return [[-1, -1], [-1, 1]];
    if (piece === BLACK)   return [[1, -1],  [1, 1]];
    if (piece === RED_K || piece === BLACK_K) return [[-1,-1],[-1,1],[1,-1],[1,1]];
    return [];
  }

  function getSlides(b, r, c) {
    const piece = b[r][c];
    const moves = [];
    for (const [dr, dc] of dirs(piece)) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && b[nr][nc] === EMPTY)
        moves.push({ from: { r, c }, to: { r: nr, c: nc }, captures: [] });
    }
    return moves;
  }

  function getJumps(b, r, c, captured) {
    const piece = b[r][c];
    const jumps = [];
    for (const [dr, dc] of dirs(piece)) {
      const mr = r + dr, mc = c + dc; // midpoint (enemy)
      const nr = r + 2 * dr, nc = c + 2 * dc; // landing
      if (!inBounds(nr, nc)) continue;
      if (b[nr][nc] !== EMPTY) continue;
      if (b[mr][mc] === EMPTY) continue;
      const midPiece = b[mr][mc];
      const isEnemy = isEnemyPiece(piece, midPiece);
      const alreadyCaptured = captured.some(cap => cap.r === mr && cap.c === mc);
      if (!isEnemy || alreadyCaptured) continue;

      // Do the jump temporarily
      const newB = cloneBoard(b);
      newB[nr][nc] = newB[r][c];
      newB[r][c] = EMPTY;
      newB[mr][mc] = EMPTY;
      // Kinging
      if (newB[nr][nc] === RED && nr === 0)  newB[nr][nc] = RED_K;
      if (newB[nr][nc] === BLACK && nr === 7) newB[nr][nc] = BLACK_K;

      const newCaptures = [...captured, { r: mr, c: mc }];
      const furtherJumps = getJumps(newB, nr, nc, newCaptures);

      if (furtherJumps.length > 0) {
        jumps.push(...furtherJumps.map(j => ({ from: { r, c }, to: j.to, captures: [{ r: mr, c: mc }, ...j.captures.slice(newCaptures.length - 1)] })));
        // Simpler: attach first capture
        jumps.push(...furtherJumps);
      } else {
        jumps.push({ from: { r, c }, to: { r: nr, c: nc }, captures: newCaptures });
      }
    }
    return jumps;
  }

  function isEnemyPiece(myPiece, other) {
    if (other === EMPTY) return false;
    const myIsRed = myPiece === RED || myPiece === RED_K;
    const otherIsRed = other === RED || other === RED_K;
    return myIsRed !== otherIsRed;
  }

  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function cloneBoard(b) { return b.map(row => [...row]); }

  // ---------- Apply Move ----------
  function applyMove(b, move) {
    const nb = cloneBoard(b);
    nb[move.to.r][move.to.c] = nb[move.from.r][move.from.c];
    nb[move.from.r][move.from.c] = EMPTY;
    for (const cap of move.captures) nb[cap.r][cap.c] = EMPTY;
    // Kinging
    if (nb[move.to.r][move.to.c] === RED && move.to.r === 0)   nb[move.to.r][move.to.c] = RED_K;
    if (nb[move.to.r][move.to.c] === BLACK && move.to.r === 7) nb[move.to.r][move.to.c] = BLACK_K;
    return nb;
  }

  // ---------- Evaluation Function ----------
  function evaluate(b) {
    let score = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        if (p === BLACK)   score += 1.0;
        if (p === BLACK_K) score += 1.5;
        if (p === RED)     score -= 1.0;
        if (p === RED_K)   score -= 1.5;
      }
    return score;
  }

  function countPieces(b, player) {
    let count = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (b[r][c] === player || b[r][c] === player + 2) count++;
    return count;
  }

  // ---------- Minimax with Alpha-Beta Pruning ----------
  /**
   * @param {Array} b       - Board state
   * @param {number} depth  - Remaining search depth
   * @param {number} alpha  - Best score for MAX (BLACK AI)
   * @param {number} beta   - Best score for MIN (RED Human)
   * @param {boolean} isMax - Is it AI's (BLACK) turn?
   * @returns {number} - Evaluated score
   */
  function minimax(b, depth, alpha, beta, isMax) {
    const redCount = countPieces(b, RED);
    const blackCount = countPieces(b, BLACK);

    if (redCount === 0)   return  1000 + depth; // Black wins
    if (blackCount === 0) return -1000 - depth; // Red wins

    if (depth === 0) return evaluate(b);

    const currentPlayer = isMax ? BLACK : RED;
    const moves = getMovesForPlayer(b, currentPlayer);

    if (moves.length === 0) return isMax ? -1000 : 1000; // No moves = loss

    if (isMax) {
      let best = -Infinity;
      for (const move of moves) {
        const nb = applyMove(b, move);
        best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // Beta cutoff (pruning)
      }
      return best;
    } else {
      let best = Infinity;
      for (const move of moves) {
        const nb = applyMove(b, move);
        best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true));
        beta = Math.min(beta, best);
        if (beta <= alpha) break; // Alpha cutoff (pruning)
      }
      return best;
    }
  }

  function getBestAIMove() {
    const moves = getMovesForPlayer(board, BLACK);
    if (moves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = null;

    for (const move of moves) {
      const nb = applyMove(board, move);
      const score = minimax(nb, AI_DEPTH - 1, -Infinity, Infinity, false);
      if (score > bestScore) { bestScore = score; bestMove = move; }
    }
    return bestMove;
  }

  // ---------- Human Turn ----------
  canvas.addEventListener('click', e => {
    if (currentTurn !== RED || gameOver || aiThinking) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top)  * scaleY;
    const c = Math.floor(x / CELL);
    const r = Math.floor(y / CELL);

    // Clicking a valid destination
    if (selectedPiece) {
      const move = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (move) {
        board = applyMove(board, move);
        selectedPiece = null;
        validMoves = [];
        updateUI();
        renderBoard();
        checkWin();
        if (!gameOver) { currentTurn = BLACK; runAI(); }
        return;
      }
    }

    // Selecting a red piece
    if (board[r][c] === RED || board[r][c] === RED_K) {
      selectedPiece = { r, c };
      const allRedMoves = getMovesForPlayer(board, RED);
      // Mandatory jumps: if any jump exists, non-jumping pieces can't be selected
      const hasJump = allRedMoves.some(m => m.captures.length > 0);
      const pieceMoves = allRedMoves.filter(m => m.from.r === r && m.from.c === c);
      validMoves = hasJump ? pieceMoves.filter(m => m.captures.length > 0) : pieceMoves;

      if (validMoves.length === 0) {
        selectedPiece = null;
        statusBar.textContent = hasJump ? 'Must make a jump move!' : 'No valid moves for that piece.';
      } else {
        statusBar.textContent = `Piece at (${r},${c}) selected — ${validMoves.length} move(s) available.`;
      }
      renderBoard();
    } else {
      selectedPiece = null;
      validMoves = [];
      renderBoard();
    }
  });

  // ---------- AI Turn ----------
  async function runAI() {
    if (gameOver) return;
    aiThinking = true;
    statusBar.textContent = '🤖 AI is thinking...';
    statTurn.textContent = 'Black (AI)';
    renderBoard();
    await sleep(150); // allow render + delay for UX

    const move = getBestAIMove();
    if (!move) {
      statusBar.textContent = '🏆 Red wins! AI has no moves.';
      gameOver = true;
      aiThinking = false;
      return;
    }

    board = applyMove(board, move);
    aiThinking = false;
    currentTurn = RED;
    updateUI();
    renderBoard();
    checkWin();
    if (!gameOver) statusBar.textContent = 'Your turn — select a red piece.';
  }

  // ---------- Win Check ----------
  function checkWin() {
    const redMoves = getMovesForPlayer(board, RED);
    const blackMoves = getMovesForPlayer(board, BLACK);
    const redCount = countPieces(board, RED);
    const blackCount = countPieces(board, BLACK);

    if (redCount === 0 || redMoves.length === 0) {
      statusBar.textContent = '🤖 AI (Black) wins! Better luck next time.';
      gameOver = true;
    } else if (blackCount === 0 || blackMoves.length === 0) {
      statusBar.textContent = '🏆 You win! Congratulations!';
      gameOver = true;
    }
  }

  // ---------- UI Update ----------
  function updateUI() {
    statRed.textContent   = countPieces(board, RED);
    statBlack.textContent = countPieces(board, BLACK);
    statTurn.textContent  = currentTurn === RED ? 'Red (You)' : 'Black (AI)';
  }

  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  btnReset.addEventListener('click', initBoard);

  // ---------- Init ----------
  initBoard();

})(); // end CheckersModule
