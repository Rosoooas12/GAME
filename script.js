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

                if (!isValidPosition(newRow, newCol)) break; // Sai se fora do tabuleiro

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(piece, targetPiece)) {
                        moves.push({ r: newRow, c: newCol }); // Captura a peça inimiga
                    }
                    break; // Para de procurar nesta direção após encontrar uma peça
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

                if (!isValidPosition(newRow, newCol)) break; // Sai se fora do tabuleiro

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol });
                } else {
                    if (isOpponent(piece, targetPiece)) {
                        moves.push({ r: newRow, c: newCol }); // Captura a peça inimiga
                    }
                    break; // Para de procurar nesta direção após encontrar uma peça
                }
            }
        }
        return moves;
    }

    function getQueenMoves(row, col, color) {
        // A Rainha combina os movimentos da Torre e do Bispo
        return [...getRookMoves(row, col, color), ...getBishopMoves(row, col, color)];
    }

    function getKnightMoves(row, col, color) {
        const moves = [];
        // Todos os 8 movimentos em 'L' de um cavalo
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
                // Pode mover para casa vazia ou capturar peça inimiga
                if (targetPiece === '' || isOpponent(piece, targetPiece)) {
                    moves.push({ r: newRow, c: newCol });
                }
            }
        }
        return moves;
    }

    function getKingMoves(row, col, color) {
        const moves = [];
        // Todas as 8 direções adjacentes
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
                // Pode mover para casa vazia ou capturar peça inimiga
                if (targetPiece === '' || isOpponent(piece, targetPiece)) {
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
        // TODO: Filtrar movimentos que colocariam o próprio rei em xeque
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

        if (kingRow === undefined) return false; // Rei não encontrado (situação inválida no jogo)

        // 2. Iterar sobre todas as casas do tabuleiro
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = boardState[r][c];
                // 3. Se a peça é do oponente
                if (piece !== '' && getPieceColor(piece) === opponentColor) {
                    // 4. Obter todos os movimentos que esta peça do oponente PODE FAZER.
                    // IMPORTANT: Criamos uma cópia temporária do boardState para que os cálculos
                    // de movimento das peças inimigas não sejam afetados por estados intermediários
                    // (por exemplo, se um movimento válido depende de o rei não estar em xeque).
                    // Para o propósito de *verificar* xeque, queremos que a peça *pode* atacar o rei,
                    // mesmo que seu próprio rei esteja em xeque ou o movimento seja ilegal por outras razões.
                    
                    // Cria uma função auxiliar temporária para obter movimentos brutos,
                    // ignorando a filtragem de xeque que será adicionada posteriormente
                    const getRawMovesForPiece = (r, c) => {
                        const p = boardState[r][c];
                        const col = getPieceColor(p);
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
                    
                    const validMoves = getValidMovesForPiece(row, col);
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

                const possibleMoves = getValidMovesForPiece(startRow, startCol);
                const isMoveAllowed = possibleMoves.some(move => move.r === endRow && move.c === endCol);

                if (isMoveAllowed) {
                    console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);

                    // === Realiza o Movimento no Estado Lógico e Visual ===
                    // Armazena a peça que estava na casa de destino (para possível desfaça)
                    const capturedPiece = boardState[endRow][endCol]; 

                    // Move a peça logicamente
                    boardState[endRow][endCol] = selectedSquare.piece;
                    boardState[startRow][startCol] = '';

                    // Atualiza o visual
                    selectedSquare.element.textContent = '';
                    selectedSquare.element.classList.remove('selected', 'white-piece', 'black-piece'); // Remove classes da casa antiga

                    squareElement.textContent = selectedSquare.piece; // Adiciona peça na nova casa
                    squareElement.classList.remove('white-piece', 'black-piece'); // Limpa cores antigas
                    if (isWhitePiece(selectedSquare.piece)) {
                        squareElement.classList.add('white-piece');
                    } else if (isBlackPiece(selectedSquare.piece)) {
                        squareElement.classList.add('black-piece');
                    }
                    // === Fim da Realização do Movimento ===
                    
                    // Limpa destaques e seleção
                    selectedSquare = null;
                    clearHighlights();
                    
                    // Troca o turno
                    isWhiteTurn = !isWhiteTurn;
                    console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                    // --- Verificação de Xeque APÓS o Movimento e Troca de Turno ---
                    // Verifica se o REI DO JOGADOR CUJO TURNO AGORA É está em xeque
                    const currentPlayerKingColor = isWhiteTurn ? 'white' : 'black';
                    if (isKingInCheck(currentPlayerKingColor)) {
                        console.log(`Rei ${currentPlayerKingColor} está em XEQUE!`);
                        // FUTURAMENTE: Aqui você adicionará lógica para:
                        // 1. Mostrar um alerta visual de xeque
                        // 2. Filtrar movimentos inválidos que deixam o próprio rei em xeque
                        // 3. Verificar se é xeque-mate
                    }

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