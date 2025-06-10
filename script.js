document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    let selectedSquare = null; // Guarda a casa clicada (peça selecionada)

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
    const boardState = initialBoard.map(row => [...row]); // Cria uma cópia profunda do tabuleiro inicial

    let isWhiteTurn = true; // true para branco, false para preto

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
        return null;
    }

    function isOpponent(piece1, piece2) {
        if (!piece1 || !piece2) return false;
        return getPieceColor(piece1) !== getPieceColor(piece2) && piece2 !== '';
    }

    function isValidPosition(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // --- Funções de Movimento para Cada Tipo de Peça ---

    function getPawnMoves(row, col, color) {
        const moves = [];
        const direction = (color === 'white') ? -1 : 1;
        const startRow = (color === 'white') ? 6 : 1;

        const oneStepForwardRow = row + direction;
        if (isValidPosition(oneStepForwardRow, col) && boardState[oneStepForwardRow][col] === '') {
            moves.push({ r: oneStepForwardRow, c: col });
            const twoStepsForwardRow = row + 2 * direction;
            if (row === startRow && isValidPosition(twoStepsForwardRow, col) && boardState[twoStepsForwardRow][col] === '' && boardState[oneStepForwardRow][col] === '') {
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

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break;

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(boardState[row][col], targetPiece)) {
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

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break;

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(boardState[row][col], targetPiece)) {
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

        for (const move of knightLMoves) {
            const newRow = row + move.dr;
            const newCol = col + move.dc;

            if (isValidPosition(newRow, newCol)) {
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '' || isOpponent(boardState[row][col], targetPiece)) {
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

        for (const dir of directions) {
            const newRow = row + dir.dr;
            const newCol = col + dir.dc;

            if (isValidPosition(newRow, newCol)) {
                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '' || isOpponent(boardState[row][col], targetPiece)) {
                    moves.push({ r: newRow, c: newCol });
                }
            }
        }
        return moves;
    }

    // --- Função Central para Obter Todos os Movimentos Válidos de uma Peça ---
    function getValidMovesForPiece(row, col) {
        const piece = boardState[row][col];
        const color = getPieceColor(piece);
        let moves = [];

        switch (piece) {
            case '♙':
            case '♟':
                moves = getPawnMoves(row, col, color);
                break;
            case '♖':
            case '♜':
                moves = getRookMoves(row, col, color);
                break;
            case '♗':
            case '♝':
                moves = getBishopMoves(row, col, color);
                break;
            case '♕':
            case '♛':
                moves = getQueenMoves(row, col, color);
                break;
            case '♘':
            case '♞':
                moves = getKnightMoves(row, col, color);
                break;
            case '♔':
            case '♚':
                moves = getKingMoves(row, col, color);
                break;
            default:
                moves = [];
        }
        return moves;
    }

    // --- Funções para Destacar Casas ---
    function highlightValidMoves(validMoves) {
        validMoves.forEach(move => {
            // CORREÇÃO AQUI: Usando concatenação de strings em vez de template literals
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

    // --- Inicialização do Tabuleiro ---
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8);
        const col = i % 8;

        // CORREÇÃO AQUI: Usando concatenação de strings em vez de template literals
        square.id = 'sq-' + row + '-' + col;

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

    // --- Função que lida com o clique em uma casa ---
    function handleClick(squareElement, row, col) {
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
            if (selectedSquare.row === row && selectedSquare.col === col) {
                selectedSquare.element.classList.remove('selected');
                clearHighlights();
                selectedSquare = null;
                console.log('Peça deselecionada.');
            } else {
                const startRow = selectedSquare.row;
                const startCol = selectedSquare.col;
                const endRow = row;
                const endCol = col;

                const possibleMoves = getValidMovesForPiece(startRow, startCol);
                const isMoveAllowed = possibleMoves.some(move => move.r === endRow && move.c === endCol);

                if (isMoveAllowed) {
                    console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);

                    selectedSquare.element.textContent = '';
                    boardState[startRow][startCol] = '';
                    selectedSquare.element.classList.remove('selected');
                    selectedSquare.element.classList.remove('white-piece', 'black-piece');

                    squareElement.textContent = selectedSquare.piece;
                    boardState[endRow][endCol] = selectedSquare.piece;

                    squareElement.classList.remove('white-piece', 'black-piece');
                    if (isWhitePiece(selectedSquare.piece)) {
                        squareElement.classList.add('white-piece');
                    } else if (isBlackPiece(selectedSquare.piece)) {
                        squareElement.classList.add('black-piece');
                    }

                    selectedSquare = null;
                    clearHighlights();
                    isWhiteTurn = !isWhiteTurn;
                    console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                } else {
                    console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);
                    selectedSquare.element.classList.remove('selected');
                    clearHighlights();
                    selectedSquare = null;
                }
            }
        }
    }
});