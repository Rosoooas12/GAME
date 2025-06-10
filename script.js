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
        return getPieceColor(piece1) !== getPieceColor(piece2) && piece2 !== '';
    }

    function isValidPosition(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    // --- Funções de Movimento para Cada Tipo de Peça ---

    function getPawnMoves(row, col, color) {
        const moves = [];
        const direction = (color === 'white') ? -1 : 1; // -1 para branco (subindo), 1 para preto (descendo)
        const startRow = (color === 'white') ? 6 : 1; // Linha inicial dos peões

        // Movimento para frente (1 casa)
        if (isValidPosition(row + direction, col) && boardState[row + direction][col] === '') {
            moves.push({ r: row + direction, c: col });
            // Primeiro movimento (2 casas)
            if (row === startRow && boardState[row + 2 * direction][col] === '') {
                moves.push({ r: row + 2 * direction, c: col });
            }
        }

        // Captura na diagonal
        const captureCols = [col - 1, col + 1];
        for (const c of captureCols) {
            if (isValidPosition(row + direction, c) && isOpponent(boardState[row][col], boardState[row + direction][c])) {
                moves.push({ r: row + direction, c: c });
            }
        }
        return moves;
    }

    function getRookMoves(row, col, color) {
        const moves = [];
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 }, // Vertical
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }  // Horizontal
        ];

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break; // Fora do tabuleiro

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(boardState[row][col], targetPiece)) {
                        moves.push({ r: newRow, c: newCol }); // Captura
                    }
                    break; // Bloqueado por peça
                }
            }
        }
        return moves;
    }

    function getBishopMoves(row, col, color) {
        const moves = [];
        const directions = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, // Diagonal
            { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
        ];

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) {
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break; // Fora do tabuleiro

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(boardState[row][col], targetPiece)) {
                        moves.push({ r: newRow, c: newCol }); // Captura
                    }
                    break; // Bloqueado por peça
                }
            }
        }
        return moves;
    }

    function getQueenMoves(row, col, color) {
        // A rainha combina os movimentos da torre e do bispo
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
        // TODO: Implementar Roque (castling) mais tarde
        return moves;
    }

    // --- Função Central para Obter Todos os Movimentos Válidos de uma Peça ---
    function getValidMovesForPiece(row, col) {
        const piece = boardState[row][col];
        const color = getPieceColor(piece);
        let moves = [];

        switch (piece) {
            case '♙': // Peão Branco
            case '♟': // Peão Preto
                moves = getPawnMoves(row, col, color);
                break;
            case '♖': // Torre Branca
            case '♜': // Torre Preta
                moves = getRookMoves(row, col, color);
                break;
            case '♗': // Bispo Branco
            case '♝': // Bispo Preto
                moves = getBishopMoves(row, col, color);
                break;
            case '♕': // Rainha Branca
            case '♛': // Rainha Preta
                moves = getQueenMoves(row, col, color);
                break;
            case '♘': // Cavalo Branco
            case '♞': // Cavalo Preto
                moves = getKnightMoves(row, col, color);
                break;
            case '♔': // Rei Branco
            case '♚': // Rei Preto
                moves = getKingMoves(row, col, color);
                break;
            default:
                moves = []; // Para casas vazias ou peças inválidas
        }
        // TODO: Filtrar movimentos que colocam o próprio rei em xeque (muito complexo para agora)
        return moves;
    }

    // --- Funções para Destacar Casas ---
    function highlightValidMoves(validMoves) {
        validMoves.forEach(move => {
            const targetSquare = document.getElementById(`sq-<span class="math-inline">\{move\.r\}\-</span>{move.c}`);
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

    // --- Inicialização do Tabuleiro (Código existente) ---
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8);
        const col = i % 8;

        square.id = `sq-<span class="math-inline">\{row\}\-</span>{col}`;

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

    // --- Função que lida com o clique em uma casa (Atualizada) ---
    function handleClick(squareElement, row, col) {
        const pieceInSquare = boardState[row][col];

        // 1. Se nenhuma peça está selecionada
        if (!selectedSquare) {
            // E a casa clicada TEM uma peça
            if (pieceInSquare !== '') {
                // Verifica se é o turno da peça clicada
                const pieceColor = getPieceColor(pieceInSquare);
                if ((isWhiteTurn && pieceColor === 'white') || (!isWhiteTurn && pieceColor === 'black')) {
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceInSquare };
                    squareElement.classList.add('selected');

                    // Destaca os movimentos válidos para a peça selecionada
                    const validMoves = getValidMovesForPiece(row, col);
                    highlightValidMoves(validMoves);
                    console.log(`Peça selecionada: ${pieceInSquare} na casa <span class="math-inline">\{row\},</span>{col}. Movimentos válidos:`, validMoves);
                } else {
                    console.log(`Não é o turno da peça ${pieceInSquare}.`);
                }
            }
        } else { // 2. Se já temos uma peça selecionada
            // Se o clique for na mesma peça já selecionada, deseleciona
            if (selectedSquare.row === row && selectedSquare.col === col) {
                selectedSquare.element.classList.remove('selected');
                clearHighlights(); // Remove os destaques
                selectedSquare = null;
                console.log('Peça deselecionada.');
            } else {
                // Tenta mover a peça selecionada para a nova casa clicada
                const startRow = selectedSquare.row;
                const startCol = selectedSquare.col;
                const endRow = row;
                const endCol = col;

                // Verifica se o movimento é válido usando a nova função de validação
                const possibleMoves = getValidMovesForPiece(startRow, startCol);
                const isMoveAllowed = possibleMoves.some(move => move.r === endRow && move.c === endCol);

                if (isMoveAllowed) {
                    console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de <span class="math-inline">\{startRow\},</span>{startCol} para <span class="math-inline">\{endRow\},</span>{endCol}`);

                    // Remove a peça da casa antiga (visual e lógico)
                    selectedSquare.element.textContent = '';
                    boardState[startRow][startCol] = '';
                    selectedSquare.element.classList.remove('selected'); // Remove destaque da antiga

                    // Remove as classes de cor da peça da casa antiga (se ela for vazia após o movimento)
                    selectedSquare.element.classList.remove('white-piece', 'black-piece');

                    // Move a peça para a nova casa (visual e lógico)
                    squareElement.textContent = selectedSquare.piece;
                    boardState[endRow][endCol] = selectedSquare.piece;

                    // Ajusta as classes de cor da peça na nova casa
                    squareElement.classList.remove('white-piece', 'black-piece'); // Limpa cores antigas
                    if (isWhitePiece(selectedSquare.piece)) {
                        squareElement.classList.add('white-piece');
                    } else if (isBlackPiece(selectedSquare.piece)) {
                        squareElement.classList.add('black-piece');
                    }

                    selectedSquare = null; // Reseta a seleção após o movimento
                    clearHighlights(); // Remove os destaques após o movimento
                    isWhiteTurn = !isWhiteTurn; // Troca o turno
                    console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                } else {
                    console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de <span class="math-inline">\{startRow\},</span>{startCol} para <span class="math-inline">\{endRow\},</span>{endCol}`);
                    selectedSquare.element.classList.remove('selected'); // Deseleciona
                    clearHighlights(); // Remove os destaques
                    selectedSquare = null; // Reseta a seleção
                }
            }
        }
    }
});