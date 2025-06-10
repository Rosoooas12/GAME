document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    const newGameButton = document.getElementById('new-game-button');
    const whiteTimerDisplay = document.getElementById('white-timer');
    const blackTimerDisplay = document.getElementById('black-timer');
    const turnIndicator = document.getElementById('turn-indicator');
    let selectedSquare = null;

    // Representação do tabuleiro de xadrez no estado inicial com símbolos Unicode
    const initialBoard = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'], // Peças pretas
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'], // Peões pretos
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'], // Peões brancos
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']  // Peças brancas
    ];

    // Mapeamento de peças para o array de tabuleiro (estado atual do jogo)
    let boardState = initialBoard.map(row => [...row]);

    let isWhiteTurn = true; // true para branco, false para preto

    // --- Variáveis do Relógio ---
    const initialTime = 5 * 60; // 5 minutos em segundos por jogador
    let whiteTime = initialTime;
    let blackTime = initialTime;
    let timerInterval; // Variável para armazenar o ID do setInterval

    // --- Variáveis para rastrear movimentos para o Roque (Castling) ---
    let hasWhiteKingMoved = false;
    let hasBlackKingMoved = false;
    let hasWhiteRookKingSideMoved = false;  // Torre do lado do Rei branco (h1)
    let hasWhiteRookQueenSideMoved = false; // Torre do lado da Rainha branca (a1)
    let hasBlackRookKingSideMoved = false;  // Torre do lado do Rei preto (h8)
    let hasBlackRookQueenSideMoved = false; // Torre do lado da Rainha preta (a8)

    // --- Variável para controle da Promoção de Peão ---
    let pawnToPromote = null; // Guarda a posição do peão que precisa ser promovido

    // --- Variáveis de Controle de Fim de Jogo ---
    let isGameOver = false; // Flag para indicar se o jogo acabou

    // --- Funções Auxiliares para Regras de Movimento ---

    function isWhitePiece(piece) {
        return ['♔', '♕', '♖', '♗', '♘', '♙'].includes(piece);
    }

    function isBlackPiece(piece) {
        return ['♚', '♛', '♜', '♝', '♞', '♟'].includes(piece);
    }

    function getPieceColor(piece) {
        if (isWhitePiece(piece)) return 'white';
        if (isBlackPiece(piece)) return 'black';
        return null; // Retorna null para casas vazias
    }

    function isOpponent(piece1, piece2) {
        // Verifica se ambas as peças existem e têm cores diferentes
        if (!piece1 || !piece2 || piece1 === '' || piece2 === '') return false;
        return getPieceColor(piece1) !== getPieceColor(piece2);
    }

    function isValidPosition(r, c) {
        // Verifica se a linha e coluna estão dentro dos limites do tabuleiro (0 a 7)
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // --- Funções de Movimento para Cada Tipo de Peça (Movimentos Brutos) ---

    function getPawnMoves(row, col, color) {
        const moves = [];
        const direction = (color === 'white') ? -1 : 1;
        const startRow = (color === 'white') ? 6 : 1;

        const oneStepForwardRow = row + direction;
        if (isValidPosition(oneStepForwardRow, col) && boardState[oneStepForwardRow][col] === '') {
            moves.push({ r: oneStepForwardRow, c: col });

            const twoStepsForwardRow = row + 2 * direction;
            if (row === startRow && isValidPosition(twoStepsForwardRow, col) && boardState[twoStepsForwardRow][col] === '') {
                moves.push({ r: twoStepsForwardRow, c: col });
            }
        }

        const captureCols = [col - 1, col + 1];
        for (const c of captureCols) {
            const targetRow = row + direction;
            if (isValidPosition(targetRow, c) && isOpponent(boardState[row][col], boardState[targetRow][c])) {
                moves.push({ r: targetRow, c: c });
            }
        }
        return moves;
    }

    function getRookMoves(row, col, color) {
        const moves = [];
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        const piece = boardState[row][col];

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break;

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(piece, targetPiece)) {
                        moves.push({ r: newRow, c: newCol });
                    }
                    break;
                }
            }
        }
        return moves;
    }

    function getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
        ];
        const piece = boardState[row][col];

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break;

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(piece, targetPiece)) {
                        moves.push({ r: newRow, c: newCol });
                    }
                    break;
                }
            }
        }
        return moves;
    }

    function getQueenMoves(row, col, color) {
        return [...getRookMoves(row, col, color), ...getBishopMoves(row, col, color)];
    }

    function getKnightMoves(row, col, color) {
        const moves = [];
        const knightLMoves = [
            { dr: -2, dc: -1 }, { dr: -2, dc: 1 },
            { dr: -1, dc: -2 }, { dr: -1, dc: 2 },
            { dr: 1, dc: -2 }, { dr: 1, dc: 2 },
            { dr: 2, dc: -1 }, { dr: 2, dc: 1 }
        ];
        const piece = boardState[row][col];

        for (const move of knightLMoves) {
            const newRow = row + move.dr;
            const newCol = col + move.dc;

            if (isValidPosition(newRow, newCol)) {
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '' || isOpponent(piece, targetPiece)) {
                    moves.push({ r: newRow, c: newCol });
                }
            }
        }
        return moves;
    }

    function getKingMoves(row, col, color) {
        const moves = [];
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 0 }, { dr: -1, dc: 1 },
            { dr: 0, dc: -1 },                       { dr: 0, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }
        ];
        const piece = boardState[row][col];

        for (const dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;

            if (isValidPosition(newRow, newCol)) {
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '' || isOpponent(piece, targetPiece)) {
                    moves.push({ r: newRow, c: newCol });
                }
            }
        }

        // --- LÓGICA DO ROQUE (CASTLING) ---
        if (color === 'white') {
            // Roque Lado do Rei (King-side Castling - para g1)
            if (!hasWhiteKingMoved && !hasWhiteRookKingSideMoved) {
                if (boardState[7][5] === '' && boardState[7][6] === '') {
                    if (!isKingInCheck('white')) {
                        boardState[7][5] = '♔'; boardState[7][4] = '';
                        const isPassingThroughCheck = isKingInCheck('white');
                        boardState[7][4] = '♔'; boardState[7][5] = '';

                        if (!isPassingThroughCheck) {
                            boardState[7][6] = '♔'; boardState[7][4] = '';
                            const isEndingInCheck = isKingInCheck('white');
                            boardState[7][4] = '♔'; boardState[7][6] = '';

                            if (!isEndingInCheck) {
                                moves.push({ r: 7, c: 6, isCastling: true, rookFrom: {r: 7, c: 7}, rookTo: {r: 7, c: 5} });
                            }
                        }
                    }
                }
            }

            // Roque Lado da Rainha (Queen-side Castling - para c1)
            if (!hasWhiteKingMoved && !hasWhiteRookQueenSideMoved) {
                if (boardState[7][1] === '' && boardState[7][2] === '' && boardState[7][3] === '') {
                    if (!isKingInCheck('white')) {
                        boardState[7][3] = '♔'; boardState[7][4] = '';
                        const isPassingThroughCheck = isKingInCheck('white');
                        boardState[7][4] = '♔'; boardState[7][3] = '';

                        if (!isPassingThroughCheck) {
                            boardState[7][2] = '♔'; boardState[7][4] = '';
                            const isEndingInCheck = isKingInCheck('white');
                            boardState[7][4] = '♔'; boardState[7][2] = '';

                            if (!isEndingInCheck) {
                                moves.push({ r: 7, c: 2, isCastling: true, rookFrom: {r: 7, c: 0}, rookTo: {r: 7, c: 3} });
                            }
                        }
                    }
                }
            }
        } else { // Roque para as peças pretas
            // Roque Lado do Rei (King-side Castling - para g8)
            if (!hasBlackKingMoved && !hasBlackRookKingSideMoved) {
                if (boardState[0][5] === '' && boardState[0][6] === '') {
                    if (!isKingInCheck('black')) {
                        boardState[0][5] = '♚'; boardState[0][4] = '';
                        const isPassingThroughCheck = isKingInCheck('black');
                        boardState[0][4] = '♚'; boardState[0][5] = '';

                        if (!isPassingThroughCheck) {
                            boardState[0][6] = '♚'; boardState[0][4] = '';
                            const isEndingInCheck = isKingInCheck('black');
                            boardState[0][4] = '♚'; boardState[0][6] = '';

                            if (!isEndingInCheck) {
                                moves.push({ r: 0, c: 6, isCastling: true, rookFrom: {r: 0, c: 7}, rookTo: {r: 0, c: 5} });
                            }
                        }
                    }
                }
            }

            // Roque Lado da Rainha (Queen-side Castling - para c8)
            if (!hasBlackKingMoved && !hasBlackRookQueenSideMoved) {
                if (boardState[0][1] === '' && boardState[0][2] === '' && boardState[0][3] === '') {
                    if (!isKingInCheck('black')) {
                        boardState[0][3] = '♚'; boardState[0][4] = '';
                        const isPassingThroughCheck = isKingInCheck('black');
                        boardState[0][4] = '♚'; boardState[0][3] = '';

                        if (!isPassingThroughCheck) {
                            boardState[0][2] = '♚'; boardState[0][4] = '';
                            const isEndingInCheck = isKingInCheck('black');
                            boardState[0][4] = '♚'; boardState[0][2] = '';

                            if (!isEndingInCheck) {
                                moves.push({ r: 0, c: 2, isCastling: true, rookFrom: {r: 0, c: 0}, rookTo: {r: 0, c: 3} });
                            }
                        }
                    }
                }
            }
        }
        return moves;
    }

    // --- Função para verificar se um Rei está em xeque ---
    function isKingInCheck(kingColor) {
        let kingRow, kingCol;
        const opponentColor = (kingColor === 'white') ? 'black' : 'white';
        const kingPiece = (kingColor === 'white') ? '♔' : '♚';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (boardState[r][c] === kingPiece) {
                    kingRow = r;
                    kingCol = c;
                    break;
                }
            }
            if (kingRow !== undefined) break;
        }

        if (kingRow === undefined) return false;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (piece !== '' && getPieceColor(piece) === opponentColor) {
                    const getRawMovesForPiece = (r, c) => {
                        const p = boardState[r][c];
                        const col = getPieceColor(p);
                        switch (p) {
                            case '♙': case '♟': return getPawnMoves(r, c, col);
                            case '♖': case '♜': return getRookMoves(r, c, col);
                            case '♗': case '♝': return getBishopMoves(r, c, col);
                            case '♕': case '♛': return getQueenMoves(r, c, col);
                            case '♘': case '♞': return getKnightMoves(r, c, col);
                            case '♔': case '♚': return getKingMoves(r, c, col).filter(move => !move.isCastling);
                            default: return [];
                        }
                    };
                    const potentialAttacks = getRawMovesForPiece(r, c);

                    for (const attackMove of potentialAttacks) {
                        if (attackMove.r === kingRow && attackMove.c === kingCol) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // --- Função Central para Obter Todos os Movimentos Válidos de uma Peça ---
    function getValidMovesForPiece(row, col) {
        const piece = boardState[row][col];
        const color = getPieceColor(piece);
        let moves = [];

        switch (piece) {
            case '♙': case '♟': moves = getPawnMoves(row, col, color); break;
            case '♖': case '♜': moves = getRookMoves(row, col, color); break;
            case '♗': case '♝': moves = getBishopMoves(row, col, color); break;
            case '♕': case '♛': moves = getQueenMoves(row, col, color); break;
            case '♘': case '♞': moves = getKnightMoves(row, col, color); break;
            case '♔': case '♚': moves = getKingMoves(row, col, color); break;
            default: moves = [];
        }

        const filteredMoves = moves.filter(move => {
            if (move.isCastling) {
                return true;
            }

            const originalPiece = boardState[row][col];
            const targetPiece = boardState[move.r][move.c];
            
            boardState[move.r][move.c] = originalPiece;
            boardState[row][col] = '';

            const kingColor = getPieceColor(originalPiece);
            const isInCheckAfterMove = isKingInCheck(kingColor);

            boardState[row][col] = originalPiece;
            boardState[move.r][move.c] = targetPiece;

            return !isInCheckAfterMove;
        });

        return filteredMoves;
    }

    // --- Nova função para verificar se o jogador tem QUALQUER movimento legal ---
    function hasAnyLegalMoves(playerColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                if (piece !== '' && getPieceColor(piece) === playerColor) {
                    const moves = getValidMovesForPiece(r, c);
                    if (moves.length > 0) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // --- Funções para Destacar Casas no Tabuleiro ---
    function highlightValidMoves(validMoves) {
        validMoves.forEach(move => {
            const targetSquare = document.getElementById('sq-' + move.r + '-' + move.c);
            if (targetSquare) {
                targetSquare.classList.add('highlight-move');
            }
        });
    }

    function clearHighlights() {
        document.querySelectorAll('.highlight-move').forEach(square => {
            square.classList.remove('highlight-move');
        });
    }

    // --- Funções do Relógio ---
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        whiteTimerDisplay.textContent = `Brancas: ${formatTime(whiteTime)}`;
        blackTimerDisplay.textContent = `Pretas: ${formatTime(blackTime)}`;
        turnIndicator.textContent = `Turno: ${isWhiteTurn ? 'Brancas' : 'Pretas'}`;

        if (!isGameOver) {
            if (isWhiteTurn) {
                whiteTimerDisplay.classList.add('active-timer');
                blackTimerDisplay.classList.remove('active-timer');
            } else {
                blackTimerDisplay.classList.add('active-timer');
                whiteTimerDisplay.classList.remove('active-timer');
            }
        } else {
            // Remove destaque de timer ativo quando o jogo termina
            whiteTimerDisplay.classList.remove('active-timer');
            blackTimerDisplay.classList.remove('active-timer');
        }
    }

    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        timerInterval = setInterval(() => {
            if (isGameOver) {
                clearInterval(timerInterval);
                return;
            }

            if (isWhiteTurn) {
                whiteTime--;
                if (whiteTime <= 0) {
                    whiteTime = 0;
                    updateTimerDisplay();
                    handleTimeOut('Brancas');
                    clearInterval(timerInterval);
                    return;
                }
            } else {
                blackTime--;
                if (blackTime <= 0) {
                    blackTime = 0;
                    updateTimerDisplay();
                    handleTimeOut('Pretas');
                    clearInterval(timerInterval);
                    return;
                }
            }
            updateTimerDisplay();
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(timerInterval);
    }

    function handleTimeOut(playerColor) {
        isGameOver = true;
        alert(`FIM DE JOGO! O tempo do jogador ${playerColor} acabou. O jogador ${playerColor === 'Brancas' ? 'Pretas' : 'Brancas'} venceu por tempo!`);
        console.log(`FIM DE JOGO! O tempo do jogador ${playerColor} acabou.`);
    }

    // --- Função para Renderizar o Tabuleiro (útil para reiniciar o jogo) ---
    function renderBoard() {
        chessboard.innerHTML = ''; // Limpa o tabuleiro HTML existente

        for (let i = 0; i < 64; i++) {
            const square = document.createElement('div');
            square.classList.add('square');

            const row = Math.floor(i / 8);
            const col = i % 8;

            square.id = 'sq-' + row + '-' + col; // Define um ID para cada casa (ex: sq-0-0)

            if ((row + col) % 2 === 0) {
                square.classList.add('light');
            } else {
                square.classList.add('dark');
            }

            const piece = boardState[row][col];
            if (piece) {
                square.textContent = piece;
                if (isBlackPiece(piece)) {
                    square.classList.add('black-piece');
                } else if (isWhitePiece(piece)) {
                    square.classList.add('white-piece');
                }
            }

            square.addEventListener('click', () => {
                handleClick(square, row, col);
            });

            chessboard.appendChild(square);
        }
    }

    // Chamada inicial para renderizar o tabuleiro e iniciar o relógio
    renderBoard();
    updateTimerDisplay(); // Atualiza os displays antes de iniciar o jogo
    startTimer(); // Inicia o relógio assim que o jogo carrega

    // --- Função de Reinício do Jogo ---
    function resetGame() {
        boardState = initialBoard.map(row => [...row]); 

        isWhiteTurn = true;
        selectedSquare = null;
        hasWhiteKingMoved = false;
        hasBlackKingMoved = false;
        hasWhiteRookKingSideMoved = false;
        hasWhiteRookQueenSideMoved = false;
        hasBlackRookKingSideMoved = false;
        hasBlackRookQueenSideMoved = false;
        pawnToPromote = null;
        isGameOver = false;

        // Reseta o tempo para o valor inicial
        whiteTime = initialTime;
        blackTime = initialTime;
        updateTimerDisplay(); // Atualiza o display do relógio imediatamente

        clearHighlights();
        document.getElementById('promotion-overlay').classList.add('hidden');

        renderBoard();
        // Reinicia o timer para o novo jogo
        startTimer();
        console.log("Jogo Reiniciado!");
    }

    // --- Função que lida com o clique em uma casa do tabuleiro ---
    function handleClick(squareElement, row, col) {
        if (isGameOver) {
            console.log("O jogo terminou. Inicie um novo jogo.");
            return;
        }

        if (pawnToPromote) {
            console.log("Promoção de peão pendente. Escolha uma peça para continuar.");
            return;
        }

        const pieceInSquare = boardState[row][col];

        if (!selectedSquare) {
            if (pieceInSquare !== '') {
                const pieceColor = getPieceColor(pieceInSquare);
                if ((isWhiteTurn && pieceColor === 'white') || (!isWhiteTurn && pieceColor === 'black')) {
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceInSquare };
                    squareElement.classList.add('selected');
                    
                    const validMoves = getValidMovesForPiece(row, col);
                    highlightValidMoves(validMoves);
                    console.log(`Peça selecionada: ${pieceInSquare} na casa ${row},${col}. Movimentos válidos:`, validMoves);
                } else {
                    console.log(`Não é o turno da peça ${pieceInSquare}.`);
                }
            }
        } else {
            const startRow = selectedSquare.row;
            const startCol = selectedSquare.col;
            const endRow = row;
            const endCol = col;

            const possibleMoves = getValidMovesForPiece(startRow, startCol); 
            const moveAttempt = possibleMoves.find(move => move.r === endRow && move.c === endCol);

            if (moveAttempt) {
                console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);

                const pieceToMove = selectedSquare.piece;

                if (moveAttempt.isCastling) {
                    console.log("Realizando Roque!");
                    boardState[endRow][endCol] = pieceToMove;
                    boardState[startRow][startCol] = '';

                    const rookPiece = boardState[moveAttempt.rookFrom.r][moveAttempt.rookFrom.c];
                    boardState[moveAttempt.rookTo.r][moveAttempt.rookTo.c] = rookPiece;
                    boardState[moveAttempt.rookFrom.r][moveAttempt.rookFrom.c] = '';

                    selectedSquare.element.textContent = '';
                    document.getElementById(`sq-${moveAttempt.rookFrom.r}-${moveAttempt.rookFrom.c}`).textContent = '';

                    squareElement.textContent = pieceToMove;
                    const rookToElement = document.getElementById(`sq-${moveAttempt.rookTo.r}-${moveAttempt.rookTo.c}`);
                    rookToElement.textContent = rookPiece;

                    squareElement.classList.remove('white-piece', 'black-piece');
                    if (isWhitePiece(pieceToMove)) {
                        squareElement.classList.add('white-piece');
                    } else if (isBlackPiece(pieceToMove)) {
                        squareElement.classList.add('black-piece');
                    }
                    rookToElement.classList.remove('white-piece', 'black-piece');
                    if (isWhitePiece(rookPiece)) {
                        rookToElement.classList.add('white-piece');
                    } else if (isBlackPiece(rookPiece)) {
                        rookToElement.classList.add('black-piece');
                    }

                } else {
                    boardState[endRow][endCol] = pieceToMove;
                    boardState[startRow][startCol] = '';

                    selectedSquare.element.textContent = '';
                    squareElement.textContent = pieceToMove;

                    squareElement.classList.remove('white-piece', 'black-piece'); 
                    if (isWhitePiece(pieceToMove)) {
                        squareElement.classList.add('white-piece');
                    } else if (isBlackPiece(pieceToMove)) {
                            squareElement.classList.add('black-piece');
                    }
                }
                selectedSquare.element.classList.remove('selected'); 
                
                if (pieceToMove === '♔') {
                    hasWhiteKingMoved = true;
                } else if (pieceToMove === '♚') {
                    hasBlackKingMoved = true;
                } 
                else if (pieceToMove === '♖' && startRow === 7 && startCol === 7) {
                    hasWhiteRookKingSideMoved = true;
                } else if (pieceToMove === '♖' && startRow === 7 && startCol === 0) {
                    hasWhiteRookQueenSideMoved = true;
                } else if (pieceToMove === '♜' && startRow === 0 && startCol === 7) {
                    hasBlackRookKingSideMoved = true;
                } else if (pieceToMove === '♜' && startRow === 0 && startCol === 0) {
                    hasBlackRookQueenSideMoved = true;
                }

                clearHighlights();
                selectedSquare = null;

                if ((pieceToMove === '♙' && endRow === 0) || (pieceToMove === '♟' && endRow === 7)) {
                    pawnToPromote = { r: endRow, c: endCol, piece: pieceToMove };
                    document.getElementById('promotion-overlay').classList.remove('hidden');
                    pauseTimer(); // PAUSA O RELÓGIO DURANTE A PROMOÇÃO
                    console.log("Peão pronto para promoção!");
                } else {
                    // TROCA O TURNO E REINICIA O RELÓGIO
                    isWhiteTurn = !isWhiteTurn;
                    updateTimerDisplay(); // Atualiza o indicador de turno e destaca o timer
                    startTimer(); // Reinicia o timer para o novo jogador

                    console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                    const currentPlayerKingColor = isWhiteTurn ? 'white' : 'black';
                    const isCurrentKingInCheck = isKingInCheck(currentPlayerKingColor);
                    const hasLegalMoves = hasAnyLegalMoves(currentPlayerKingColor);

                    if (isCurrentKingInCheck) {
                        if (!hasLegalMoves) {
                            console.log(`XEQUE-MATE! O jogador ${currentPlayerKingColor} perdeu.`);
                            alert(`XEQUE-MATE! O jogador ${currentPlayerKingColor} perdeu. O jogador ${isWhiteTurn ? 'Preto' : 'Branco'} venceu!`);
                            isGameOver = true;
                            pauseTimer(); // PAUSA O RELÓGIO AO FINAL DO JOGO
                        } else {
                            console.log(`Rei ${currentPlayerKingColor} está em XEQUE!`);
                        }
                    } else {
                        if (!hasLegalMoves) {
                            console.log(`AFOGAMENTO! O jogo terminou em empate.`);
                            alert(`AFOGAMENTO! O jogo terminou em empate.`);
                            isGameOver = true;
                            pauseTimer(); // PAUSA O RELÓGIO AO FINAL DO JOGO
                        } else {
                            console.log(`Rei ${currentPlayerKingColor} não está em xeque.`);
                        }
                    }
                }

            } else {
                console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}. (Pode ser porque deixaria seu rei em xeque ou a casa não é um movimento válido)`);
                selectedSquare.element.classList.remove('selected');
                clearHighlights();
                selectedSquare = null;
            }
        }
    }

    // --- LÓGICA DE PROMOÇÃO DE PEÃO ---
    const promotionOverlay = document.getElementById('promotion-overlay');
    const promotionButtons = document.querySelectorAll('.promotion-choices button');

    promotionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!pawnToPromote) return;

            const chosenPieceType = event.target.dataset.piece;
            const promotedPieceColor = getPieceColor(pawnToPromote.piece);

            let newPieceSymbol;
            if (promotedPieceColor === 'white') {
                switch (chosenPieceType) {
                    case 'Q': newPieceSymbol = '♕'; break;
                    case 'R': newPieceSymbol = '♖'; break;
                    case 'B': newPieceSymbol = '♗'; break;
                    case 'N': newPieceSymbol = '♘'; break;
                }
            } else {
                switch (chosenPieceType) {
                    case 'Q': newPieceSymbol = '♛'; break;
                    case 'R': newPieceSymbol = '♜'; break;
                    case 'B': newPieceSymbol = '♝'; break;
                    case 'N': newPieceSymbol = '♞'; break;
                }
            }

            boardState[pawnToPromote.r][pawnToPromote.c] = newPieceSymbol;

            const promotedSquareElement = document.getElementById(`sq-${pawnToPromote.r}-${pawnToPromote.c}`);
            promotedSquareElement.textContent = newPieceSymbol;
            promotedSquareElement.classList.remove('white-piece', 'black-piece');
            if (promotedPieceColor === 'white') {
                promotedSquareElement.classList.add('white-piece');
            } else {
                promotedSquareElement.classList.add('black-piece');
            }

            promotionOverlay.classList.add('hidden');
            pawnToPromote = null;

            // Continua o relógio APÓS a promoção ser concluída
            isWhiteTurn = !isWhiteTurn;
            updateTimerDisplay(); // Atualiza o indicador de turno e destaca o timer
            startTimer(); // Reinicia o timer para o novo jogador

            console.log(`Promoção concluída. Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

            const currentPlayerKingColor = isWhiteTurn ? 'white' : 'black';
            const isCurrentKingInCheck = isKingInCheck(currentPlayerKingColor);
            const hasLegalMoves = hasAnyLegalMoves(currentPlayerKingColor);

            if (isCurrentKingInCheck) {
                if (!hasLegalMoves) {
                    console.log(`XEQUE-MATE! O jogador ${currentPlayerKingColor} perdeu.`);
                    alert(`XEQUE-MATE! O jogador ${currentPlayerKingColor} perdeu. O jogador ${isWhiteTurn ? 'Preto' : 'Branco'} venceu!`);
                    isGameOver = true;
                    pauseTimer(); // PAUSA O RELÓGIO AO FINAL DO JOGO
                } else {
                    console.log(`Rei ${currentPlayerKingColor} está em XEQUE!`);
                }
            } else {
                if (!hasLegalMoves) {
                    console.log(`AFOGAMENTO! O jogo terminou em empate.`);
                    alert(`AFOGAMENTO! O jogo terminou em empate.`);
                    isGameOver = true;
                    pauseTimer(); // PAUSA O RELÓGIO AO FINAL DO JOGO
                } else {
                    console.log(`Rei ${currentPlayerKingColor} não está em xeque.`);
                }
            }
        });
    });

    newGameButton.addEventListener('click', resetGame);

}); // Fechamento final do DOMContentLoaded