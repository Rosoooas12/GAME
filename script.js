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

    // --- Funções de Movimento para Cada Tipo de Peça (Movimentos Brutos) ---
    // Estas funções calculam os movimentos sem considerar se o rei estaria em xeque
    function getPawnMoves(row, col, color) {
        const moves = [];
        const direction = (color === 'white') ? -1 : 1;
        const startRow = (color === 'white') ? 6 : 1;
        const piece = boardState[row][col];

        // Movimento para frente
        const oneStepForwardRow = row + direction;
        if (isValidPosition(oneStepForwardRow, col) && boardState[oneStepForwardRow][col] === '') {
            moves.push({ r: oneStepForwardRow, c: col });
            const twoStepsForwardRow = row + 2 * direction;
            if (row === startRow && isValidPosition(twoStepsForwardRow, col) && boardState[twoStepsForwardRow][col] === '') {
                moves.push({ r: twoStepsForwardRow, c: col });
            }
        }

        // Capturas diagonais
        const captureCols = [col - 1, col + 1];
        for (const c of captureCols) {
            const targetRow = row + direction;
            if (isValidPosition(targetRow, c) && isOpponent(piece, boardState[targetRow][c])) {
                moves.push({ r: targetRow, c: c });
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
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 }, // Diagonais
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
        return moves;
    }

    // --- Função para verificar se um Rei está em xeque ---
    function isKingInCheck(kingColor) {
        let kingRow, kingCol;
        const opponentColor = (kingColor === 'white') ? 'black' : 'white';
        const kingPiece = (kingColor === 'white') ? '♔' : '♚';

        // 1. Encontrar a posição do Rei da cor especificada
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

        // 2. Iterar sobre todas as casas do tabuleiro
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                // 3. Se a peça é do oponente
                if (piece !== '' && getPieceColor(piece) === opponentColor) {
                    // 4. Obter todos os movimentos "brutos" que esta peça do oponente PODE FAZER.
                    // Usamos uma função auxiliar que apenas calcula os movimentos da peça,
                    // sem aplicar o filtro de xeque recursivo que getValidMovesForPiece usará.
                    const getRawMovesForPiece = (r, c) => {
                        const p = boardState[r][c];
                        const col = getPieceColor(p); // Cor da peça atacante
                        switch (p) {
                            case '♙': case '♟': return getPawnMoves(r, c, col);
                            case '♖': case '♜': return getRookMoves(r, c, col);
                            case '♗': case '♝': return getBishopMoves(r, c, col);
                            case '♕': case '♛': return getQueenMoves(r, c, col);
                            case '♘': case '♞': return getKnightMoves(r, c, col);
                            case '♔': case '♚': return getKingMoves(r, c, col);
                            default: return [];
                        }
                    };

                    const potentialAttacks = getRawMovesForPiece(r, c);

                    // 5. Verificar se algum desses movimentos atinge a posição do Rei
                    for (const attackMove of potentialAttacks) {
                        if (attackMove.r === kingRow && attackMove.c === kingCol) {
                            return true; // Rei está em xeque
                        }
                    }
                }
            }
        }
        return false; // Rei não está em xeque
    }

    // --- Função Central para Obter Todos os Movimentos Válidos de uma Peça ---
    // Agora, filtra os movimentos que colocariam o próprio rei em xeque
    function getValidMovesForPiece(row, col) {
        const piece = boardState[row][col];
        const color = getPieceColor(piece);
        let moves = [];

        // Primeiro, obtenha os movimentos "brutos" da peça
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

        // --- FILTRAR MOVIMENTOS QUE COLOCARIAM O PRÓPRIO REI EM XEQUE ---
        const filteredMoves = moves.filter(move => {
            // 1. Simular o movimento
            const originalPiece = boardState[row][col];
            const targetPiece = boardState[move.r][move.c]; // Peça que está na casa de destino
            
            // Fazer o movimento no estado do tabuleiro (temporariamente)
            boardState[move.r][move.c] = originalPiece;
            boardState[row][col] = '';

            // 2. Verificar se o Rei do jogador atual está em xeque após o movimento simulado
            const kingColor = getPieceColor(originalPiece);
            const isInCheckAfterMove = isKingInCheck(kingColor);

            // 3. Desfazer o movimento simulado
            boardState[row][col] = originalPiece;
            boardState[move.r][move.c] = targetPiece; // Restaurar a peça que estava na casa de destino

            // 4. Se o rei não estiver em xeque após o movimento simulado, o movimento é válido
            return !isInCheckAfterMove;
        });

        return filteredMoves;
    }

    // --- Funções para Destacar Casas ---
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

    // --- Inicialização do Tabuleiro ---
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8);
        const col = i % 8;

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
            // Selecionar uma peça
            if (pieceInSquare !== '') {
                const pieceColor = getPieceColor(pieceInSquare);
                if ((isWhiteTurn && pieceColor === 'white') || (!isWhiteTurn && pieceColor === 'black')) {
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceInSquare };
                    squareElement.classList.add('selected');
                    
                    const validMoves = getValidMovesForPiece(row, col); // Já virá filtrado!
                    highlightValidMoves(validMoves);
                    console.log(`Peça selecionada: ${pieceInSquare} na casa ${row},${col}. Movimentos válidos:`, validMoves);
                } else {
                    console.log(`Não é o turno da peça ${pieceInSquare}.`);
                }
            }
        } else {
            // Se o clique for na mesma peça já selecionada, deseleciona
            if (selectedSquare.row === row && selectedSquare.col === col) {
                selectedSquare.element.classList.remove('selected');
                clearHighlights();
                selectedSquare = null;
                console.log('Peça deselecionada.');
            } else {
                // Tenta mover a peça selecionada para a nova casa clicada
                const startRow = selectedSquare.row;
                const startCol = selectedSquare.col;
                const endRow = row;
                const endCol = col;

                // Aqui, os 'possibleMoves' já estão filtrados para não causar xeque no próprio rei
                const possibleMoves = getValidMovesForPiece(startRow, startCol); 
                const isMoveAllowed = possibleMoves.some(move => move.r === endRow && move.c === endCol);

                if (isMoveAllowed) {
                    console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);

                    // === Realiza o Movimento no Estado Lógico e Visual ===
                    const capturedPiece = boardState[endRow][endCol]; 

                    boardState[endRow][endCol] = selectedSquare.piece;
                    boardState[startRow][startCol] = '';

                    selectedSquare.element.textContent = '';
                    selectedSquare.element.classList.remove('selected', 'white-piece', 'black-piece'); 

                    squareElement.textContent = selectedSquare.piece; 
                    squareElement.classList.remove('white-piece', 'black-piece'); 
                    if (isWhitePiece(selectedSquare.piece)) {
                        squareElement.classList.add('white-piece');
                    } else if (isBlackPiece(selectedSquare.piece)) {
                        squareElement.classList.add('black-piece');
                    }
                    // === Fim da Realização do Movimento ===
                    
                    selectedSquare = null;
                    clearHighlights();
                    
                    // Troca o turno
                    isWhiteTurn = !isWhiteTurn;
                    console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                    // --- Verificação de Xeque APÓS o Movimento e Troca de Turno (no rei do oponente) ---
                    const currentPlayerKingColor = isWhiteTurn ? 'white' : 'black';
                    if (isKingInCheck(currentPlayerKingColor)) {
                        console.log(`Rei ${currentPlayerKingColor} está em XEQUE!`);
                        // FUTURAMENTE: Aqui você pode adicionar um indicador visual mais forte de xeque
                        // e/ou verificar xeque-mate.
                    }

                } else {
                    console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}. (Pode ser porque deixaria seu rei em xeque ou a casa não é um movimento válido)`
                    );
                    selectedSquare.element.classList.remove('selected');
                    clearHighlights();
                    selectedSquare = null;
                }
            }
        }
    }
});