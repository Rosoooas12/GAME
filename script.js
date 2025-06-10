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

    // --- Variáveis para rastrear movimentos para o Roque (Castling) ---
    // Essas variáveis são essenciais para saber se o Rei ou as Torres já se moveram,
    // o que é uma condição para o roque.
    let hasWhiteKingMoved = false;
    let hasBlackKingMoved = false;
    let hasWhiteRookKingSideMoved = false;  // Torre do lado do Rei branco (h1)
    let hasWhiteRookQueenSideMoved = false; // Torre do lado da Rainha branca (a1)
    let hasBlackRookKingSideMoved = false;  // Torre do lado do Rei preto (h8)
    let hasBlackRookQueenSideMoved = false; // Torre do lado da Rainha preta (a8)

    // --- Variável para controle da Promoção de Peão ---
    let pawnToPromote = null; // Guarda a posição do peão que precisa ser promovido

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
    // Estas funções calculam os movimentos base de cada peça,
    // sem considerar regras complexas como xeque ou roque.
    // O filtro de xeque é aplicado posteriormente em 'getValidMovesForPiece'.

    function getPawnMoves(row, col, color) {
        const moves = [];
        const direction = (color === 'white') ? -1 : 1; // Peão branco sobe (-1), peão preto desce (+1)
        const startRow = (color === 'white') ? 6 : 1; // Linha inicial dos peões

        // 1. Movimento para frente (uma casa)
        const oneStepForwardRow = row + direction;
        if (isValidPosition(oneStepForwardRow, col) && boardState[oneStepForwardRow][col] === '') {
            moves.push({ r: oneStepForwardRow, c: col });

            // 2. Movimento para frente (duas casas, apenas no primeiro movimento)
            const twoStepsForwardRow = row + 2 * direction;
            if (row === startRow && isValidPosition(twoStepsForwardRow, col) && boardState[twoStepsForwardRow][col] === '') {
                moves.push({ r: twoStepsForwardRow, c: col });
            }
        }

        // 3. Capturas diagonais
        const captureCols = [col - 1, col + 1]; // Colunas diagonais (esquerda e direita)
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
        // Direções: cima, baixo, esquerda, direita
        const directions = [
            { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
            { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
        ];
        const piece = boardState[row][col]; // Peça atual

        for (const dir of directions) {
            for (let i = 1; i < 8; i++) { // Percorre até 7 casas em cada direção
                const newRow = row + i * dir.dr;
                const newCol = col + i * dir.dc;

                if (!isValidPosition(newRow, newCol)) break; // Sai se fora do tabuleiro

                const targetPiece = boardState[newRow][newCol];
                if (targetPiece === '') {
                    moves.push({ r: newRow, c: newCol }); // Casa vazia: pode mover
                } else {
                    if (isOpponent(piece, targetPiece)) {
                        moves.push({ r: newRow, c: newCol }); // Peça inimiga: pode capturar
                    }
                    break; // Para de procurar nesta direção após encontrar qualquer peça
                }
            }
        }
        return moves;
    }

    function getBishopMoves(row, col, color) {
        const moves = [];
        // Direções: diagonais (cima-esquerda, cima-direita, baixo-esquerda, baixo-direita)
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

        // --- LÓGICA DO ROQUE (CASTLING) ---
        // Adiciona movimentos de roque se as condições forem atendidas.
        // A validação de xeque (rei não está em xeque, não passa por xeque, não termina em xeque)
        // é feita simulando os movimentos e chamando isKingInCheck.

        if (color === 'white') {
            // Roque Lado do Rei (King-side Castling - para g1)
            // Condições: Rei não se moveu, Torre do lado do Rei não se moveu
            if (!hasWhiteKingMoved && !hasWhiteRookKingSideMoved) {
                // Casas entre o Rei e a Torre (f1 e g1) devem estar vazias
                if (boardState[7][5] === '' && boardState[7][6] === '') {
                    // O Rei não pode estar em xeque para iniciar o roque (posição atual)
                    if (!isKingInCheck('white')) {
                        // Simula mover o Rei para f1 (passar por xeque)
                        boardState[7][5] = '♔';
                        boardState[7][4] = ''; // Casa antiga do Rei
                        const isPassingThroughCheck = isKingInCheck('white');
                        boardState[7][4] = '♔'; // Desfaz simulação
                        boardState[7][5] = ''; // Casa f1 vazia novamente

                        if (!isPassingThroughCheck) { // Se não passa por xeque
                            // Simula mover o Rei para g1 (terminar em xeque)
                            boardState[7][6] = '♔';
                            boardState[7][4] = ''; // Casa antiga do Rei
                            const isEndingInCheck = isKingInCheck('white');
                            boardState[7][4] = '♔'; // Desfaz simulação
                            boardState[7][6] = ''; // Casa g1 vazia novamente

                            if (!isEndingInCheck) { // Se não termina em xeque
                                // Adiciona o movimento de roque. 'isCastling' é uma flag para o handleClick.
                                moves.push({ r: 7, c: 6, isCastling: true, rookFrom: {r: 7, c: 7}, rookTo: {r: 7, c: 5} });
                            }
                        }
                    }
                }
            }

            // Roque Lado da Rainha (Queen-side Castling - para c1)
            // Condições: Rei não se moveu, Torre do lado da Rainha não se moveu
            if (!hasWhiteKingMoved && !hasWhiteRookQueenSideMoved) {
                // Casas entre o Rei e a Torre (b1, c1, d1) devem estar vazias
                if (boardState[7][1] === '' && boardState[7][2] === '' && boardState[7][3] === '') {
                    if (!isKingInCheck('white')) { // Não pode estar em xeque para iniciar o roque
                        // Simula mover o Rei para d1 (passar por xeque)
                        boardState[7][3] = '♔';
                        boardState[7][4] = '';
                        const isPassingThroughCheck = isKingInCheck('white');
                        boardState[7][4] = '♔';
                        boardState[7][3] = '';

                        if (!isPassingThroughCheck) {
                            // Simula mover o Rei para c1 (terminar em xeque)
                            boardState[7][2] = '♔';
                            boardState[7][4] = '';
                            const isEndingInCheck = isKingInCheck('white');
                            boardState[7][4] = '♔';
                            boardState[7][2] = '';

                            if (!isEndingInCheck) {
                                moves.push({ r: 7, c: 2, isCastling: true, rookFrom: {r: 7, c: 0}, rookTo: {r: 7, c: 3} });
                            }
                        }
                    }
                }
            }
        } else { // Roque para as peças pretas (lógica idêntica, apenas mudam as linhas e a cor)
            // Roque Lado do Rei (King-side Castling - para g8)
            if (!hasBlackKingMoved && !hasBlackRookKingSideMoved) {
                if (boardState[0][5] === '' && boardState[0][6] === '') {
                    if (!isKingInCheck('black')) {
                        boardState[0][5] = '♚';
                        boardState[0][4] = '';
                        const isPassingThroughCheck = isKingInCheck('black');
                        boardState[0][4] = '♚';
                        boardState[0][5] = '';

                        if (!isPassingThroughCheck) {
                            boardState[0][6] = '♚';
                            boardState[0][4] = '';
                            const isEndingInCheck = isKingInCheck('black');
                            boardState[0][4] = '♚';
                            boardState[0][6] = '';

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
                        boardState[0][3] = '♚';
                        boardState[0][4] = '';
                        const isPassingThroughCheck = isKingInCheck('black');
                        boardState[0][4] = '♚';
                        boardState[0][3] = '';

                        if (!isPassingThroughCheck) {
                            boardState[0][2] = '♚';
                            boardState[0][4] = '';
                            const isEndingInCheck = isKingInCheck('black');
                            boardState[0][4] = '♚';
                            boardState[0][2] = '';

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
    // Esta função verifica se o Rei de uma determinada cor está sob ataque.
    // É usada tanto para validar movimentos (se o próprio rei ficaria em xeque)
    // quanto para a lógica do roque.
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
                    // 4. Obter todos os movimentos "brutos" que esta peça do oponente PODE FAZER.
                    // É crucial usar os movimentos brutos aqui, sem o filtro de xeque recursivo,
                    // para saber onde a peça *pode atacar*, ignorando se o próprio rei dela está em xeque.
                    const getRawMovesForPiece = (r, c) => {
                        const p = boardState[r][c];
                        const col = getPieceColor(p);
                        switch (p) {
                            case '♙': case '♟': return getPawnMoves(r, c, col);
                            case '♖': case '♜': return getRookMoves(r, c, col);
                            case '♗': case '♝': return getBishopMoves(r, c, col);
                            case '♕': case '♛': return getQueenMoves(r, c, col);
                            case '♘': case '♞': return getKnightMoves(r, c, col);
                            case '♔': case '♚': return getKingMoves(r, c, col).filter(move => !move.isCastling); // Exclui roque para não recursar infinitamente
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
    // Agora, filtra os movimentos que colocariam o próprio rei em xeque,
    // garantindo que apenas movimentos legais sejam retornados.
    function getValidMovesForPiece(row, col) {
        const piece = boardState[row][col];
        const color = getPieceColor(piece);
        let moves = [];

        // Primeiro, obtenha os movimentos "brutos" da peça (incluindo possíveis roques)
        switch (piece) {
            case '♙': case '♟': moves = getPawnMoves(row, col, color); break;
            case '♖': case '♜': moves = getRookMoves(row, col, color); break;
            case '♗': case '♝': moves = getBishopMoves(row, col, color); break;
            case '♕': case '♛': moves = getQueenMoves(row, col, color); break;
            case '♘': case '♞': moves = getKnightMoves(row, col, color); break;
            case '♔': case '♚': moves = getKingMoves(row, col, color); break; // getKingMoves já inclui a lógica do roque e suas validações de xeque
            default: moves = [];
        }

        // Filtra os movimentos que colocariam o PRÓPRIO Rei em xeque
        const filteredMoves = moves.filter(move => {
            // Para movimentos de roque, a validação de xeque (passar por e terminar em xeque)
            // já foi realizada dentro da função getKingMoves. Então, se é um roque válido, já é aceito.
            if (move.isCastling) {
                return true;
            }

            // Para movimentos normais:
            // 1. Simular o movimento temporariamente no boardState
            const originalPiece = boardState[row][col];
            const targetPiece = boardState[move.r][move.c]; // Peça que está na casa de destino (pode ser vazia ou inimiga)
            
            boardState[move.r][move.c] = originalPiece; // Move a peça para a nova posição
            boardState[row][col] = ''; // Esvazia a posição original

            // 2. Verificar se o Rei do jogador atual está em xeque após essa simulação
            const kingColor = getPieceColor(originalPiece);
            const isInCheckAfterMove = isKingInCheck(kingColor);

            // 3. Desfazer o movimento simulado para restaurar o estado do tabuleiro
            boardState[row][col] = originalPiece;
            boardState[move.r][move.c] = targetPiece; // Restaura a peça que estava na casa de destino

            // 4. O movimento é válido SOMENTE se o rei não estiver em xeque após a simulação
            return !isInCheckAfterMove;
        });

        return filteredMoves;
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

    // --- Inicialização e Criação do Tabuleiro ---
    // Este loop cria as 64 casas do tabuleiro e as preenche com as peças iniciais.
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8);
        const col = i % 8;

        square.id = 'sq-' + row + '-' + col; // Define um ID para cada casa (ex: sq-0-0)

        // Adiciona classes para as cores das casas (clara ou escura)
        if ((row + col) % 2 === 0) {
            square.classList.add('light');
        } else {
            square.classList.add('dark');
        }

        const piece = boardState[row][col];
        if (piece) {
            square.textContent = piece; // Define o símbolo da peça
            // Adiciona classes para estilizar as cores das peças
            if (isBlackPiece(piece)) {
                square.classList.add('black-piece');
            } else if (isWhitePiece(piece)) {
                square.classList.add('white-piece');
            }
        }

        // Adiciona um 'listener' de clique para cada casa
        square.addEventListener('click', () => {
            handleClick(square, row, col);
        });

        chessboard.appendChild(square); // Adiciona a casa ao tabuleiro HTML
    }

    // --- Função que lida com o clique em uma casa do tabuleiro ---
    function handleClick(squareElement, row, col) {
        // Bloqueia cliques se houver uma promoção pendente
        if (pawnToPromote) {
            console.log("Promoção de peão pendente. Escolha uma peça para continuar.");
            return; // Não permite nenhuma outra interação até a promoção ser resolvida
        }

        const pieceInSquare = boardState[row][col];

        if (!selectedSquare) {
            // CASO 1: Nenhuma peça está selecionada, então tentamos selecionar uma.
            if (pieceInSquare !== '') { // Se a casa clicada não está vazia
                const pieceColor = getPieceColor(pieceInSquare);
                // Verifica se a peça clicada pertence ao jogador do turno atual
                if ((isWhiteTurn && pieceColor === 'white') || (!isWhiteTurn && pieceColor === 'black')) {
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceInSquare };
                    squareElement.classList.add('selected'); // Adiciona destaque visual à peça selecionada
                    
                    const validMoves = getValidMovesForPiece(row, col); // Obtém e filtra os movimentos válidos
                    highlightValidMoves(validMoves); // Destaca as casas para onde a peça pode mover
                    console.log(`Peça selecionada: ${pieceInSquare} na casa ${row},${col}. Movimentos válidos:`, validMoves);
                } else {
                    console.log(`Não é o turno da peça ${pieceInSquare}.`);
                }
            }
        } else {
            // CASO 2: Uma peça já está selecionada.
            // Subcaso 2a: Clicou na mesma peça selecionada novamente (para deselecionar)
            if (selectedSquare.row === row && selectedSquare.col === col) {
                selectedSquare.element.classList.remove('selected');
                clearHighlights();
                selectedSquare = null;
                console.log('Peça deselecionada.');
            } else {
                // Subcaso 2b: Clicou em outra casa para tentar mover a peça selecionada.
                const startRow = selectedSquare.row;
                const startCol = selectedSquare.col; // Corrigido de selectedCol.col para selectedSquare.col
                const endRow = row;
                const endCol = col;

                // Obtém os movimentos válidos (já filtrados para não deixar o rei em xeque)
                const possibleMoves = getValidMovesForPiece(startRow, startCol); 
                // Verifica se a casa clicada é um dos movimentos permitidos
                const moveAttempt = possibleMoves.find(move => move.r === endRow && move.c === endCol);

                if (moveAttempt) { // Se o movimento é permitido (seja normal ou roque)
                    console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);

                    // === Realiza o Movimento no Estado Lógico e Visual ===
                    const pieceToMove = selectedSquare.piece;

                    if (moveAttempt.isCastling) { // É um movimento de Roque
                        console.log("Realizando Roque!");
                        // Move o Rei (lógica)
                        boardState[endRow][endCol] = pieceToMove; // Rei vai para a casa de roque (G1/G8 ou C1/C8)
                        boardState[startRow][startCol] = '';     // Casa antiga do Rei vazia

                        // Move a Torre (lógica)
                        const rookPiece = boardState[moveAttempt.rookFrom.r][moveAttempt.rookFrom.c];
                        boardState[moveAttempt.rookTo.r][moveAttempt.rookTo.c] = rookPiece; // Torre vai para a nova posição (F1/F8 ou D1/D8)
                        boardState[moveAttempt.rookFrom.r][moveAttempt.rookFrom.c] = ''; // Casa antiga da Torre vazia

                        // Atualiza o visual das casas do Rei e da Torre
                        selectedSquare.element.textContent = ''; // Antiga casa do Rei
                        document.getElementById(`sq-${moveAttempt.rookFrom.r}-${moveAttempt.rookFrom.c}`).textContent = ''; // Antiga casa da Torre

                        squareElement.textContent = pieceToMove; // Nova casa do Rei
                        const rookToElement = document.getElementById(`sq-${moveAttempt.rookTo.r}-${moveAttempt.rookTo.c}`);
                        rookToElement.textContent = rookPiece; // Nova casa da Torre

                        // Ajustar classes de cor para as peças movidas (Rei e Torre)
                        // Para o Rei:
                        squareElement.classList.remove('white-piece', 'black-piece');
                        if (isWhitePiece(pieceToMove)) {
                            squareElement.classList.add('white-piece');
                        } else if (isBlackPiece(pieceToMove)) {
                            squareElement.classList.add('black-piece');
                        }
                        // Para a Torre:
                        rookToElement.classList.remove('white-piece', 'black-piece');
                        if (isWhitePiece(rookPiece)) {
                            rookToElement.classList.add('white-piece');
                        } else if (isBlackPiece(rookPiece)) {
                            rookToElement.classList.add('black-piece');
                        }

                    } else { // É um movimento normal (não é roque)
                        // A peça capturada é sobrescrita, então não precisamos armazená-la para fins de captura normal
                        // const capturedPiece = boardState[endRow][endCol]; // Pode ser usado para exibir mensagens de captura

                        // Move a peça (lógica)
                        boardState[endRow][endCol] = pieceToMove;
                        boardState[startRow][startCol] = '';

                        // Atualiza o visual
                        selectedSquare.element.textContent = ''; // Antiga casa fica vazia
                        squareElement.textContent = pieceToMove; // Nova casa recebe a peça

                        // Ajusta as classes de cor da peça na nova casa
                        squareElement.classList.remove('white-piece', 'black-piece'); 
                        if (isWhitePiece(pieceToMove)) {
                            squareElement.classList.add('white-piece');
                        } else if (isBlackPiece(pieceToMove)) {
                            squareElement.classList.add('black-piece');
                        }
                    }
                    // Remove a classe 'selected' da casa inicial APÓS o movimento (para Rei ou qualquer peça)
                    selectedSquare.element.classList.remove('selected'); 
                    // === Fim da Realização do Movimento (normal ou roque) ===
                    
                    // --- ATUALIZAR STATUS DE MOVIMENTO PARA ROQUE ---
                    // Registra que o Rei ou as Torres se moveram, impedindo futuros roques com essas peças.
                    if (pieceToMove === '♔') {
                        hasWhiteKingMoved = true;
                    } else if (pieceToMove === '♚') {
                        hasBlackKingMoved = true;
                    } 
                    // As torres são identificadas pela peça e pela posição inicial
                    else if (pieceToMove === '♖' && startRow === 7 && startCol === 7) { // Torre branca do lado do Rei (H1)
                        hasWhiteRookKingSideMoved = true;
                    } else if (pieceToMove === '♖' && startRow === 7 && startCol === 0) { // Torre branca do lado da Rainha (A1)
                        hasWhiteRookQueenSideMoved = true;
                    } else if (pieceToMove === '♜' && startRow === 0 && startCol === 7) { // Torre preta do lado do Rei (H8)
                        hasBlackRookKingSideMoved = true;
                    } else if (pieceToMove === '♜' && startRow === 0 && startCol === 0) { // Torre preta do lado da Rainha (A8)
                        hasBlackRookQueenSideMoved = true;
                    }
                    // --- FIM DA ATUALIZAÇÃO DO STATUS DE MOVIMENTO ---

                    // Sempre limpa os destaques e o selectedSquare
                    clearHighlights();
                    selectedSquare = null;

                    // --- VERIFICAÇÃO DE PROMOÇÃO DE PEÃO ---
                    // A promoção só acontece para peões que chegam na última fileira
                    if ((pieceToMove === '♙' && endRow === 0) || (pieceToMove === '♟' && endRow === 7)) {
                        pawnToPromote = { r: endRow, c: endCol, piece: pieceToMove }; // Armazena a info do peão
                        document.getElementById('promotion-overlay').classList.remove('hidden'); // Mostra o overlay
                        // NOTA: O turno NÃO é trocado aqui. Ele será trocado APENAS após a escolha da promoção.
                        console.log("Peão pronto para promoção!");
                    } else {
                        // Se não há promoção, troca o turno normalmente
                        isWhiteTurn = !isWhiteTurn;
                        console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                        // E verifica se o rei do NOVO jogador está em xeque
                        const currentPlayerKingColor = isWhiteTurn ? 'white' : 'black';
                        if (isKingInCheck(currentPlayerKingColor)) {
                            console.log(`Rei ${currentPlayerKingColor} está em XEQUE!`);
                            // FUTURAMENTE: Aqui você pode adicionar um indicador visual mais forte de xeque
                            // e/ou verificar xeque-mate.
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
    }

    // --- LÓGICA DE PROMOÇÃO DE PEÃO ---
    const promotionOverlay = document.getElementById('promotion-overlay');
    const promotionButtons = document.querySelectorAll('.promotion-choices button');

    promotionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!pawnToPromote) return; // Nenhuma promoção pendente

            const chosenPieceType = event.target.dataset.piece; // Q, R, B, N
            const promotedPieceColor = getPieceColor(pawnToPromote.piece);

            let newPieceSymbol;
            // Mapeia o tipo de peça para o símbolo Unicode correto (branco ou preto)
            if (promotedPieceColor === 'white') {
                switch (chosenPieceType) {
                    case 'Q': newPieceSymbol = '♕'; break;
                    case 'R': newPieceSymbol = '♖'; break;
                    case 'B': newPieceSymbol = '♗'; break;
                    case 'N': newPieceSymbol = '♘'; break;
                }
            } else { // Black piece
                switch (chosenPieceType) {
                    case 'Q': newPieceSymbol = '♛'; break;
                    case 'R': newPieceSymbol = '♜'; break;
                    case 'B': newPieceSymbol = '♝'; break;
                    case 'N': newPieceSymbol = '♞'; break;
                }
            }

            // Atualiza o boardState (lógica do tabuleiro)
            boardState[pawnToPromote.r][pawnToPromote.c] = newPieceSymbol;

            // Atualiza o visual do tabuleiro
            const promotedSquareElement = document.getElementById(`sq-${pawnToPromote.r}-${pawnToPromote.c}`);
            promotedSquareElement.textContent = newPieceSymbol;
            // Garante que a cor da nova peça esteja correta
            promotedSquareElement.classList.remove('white-piece', 'black-piece');
            if (promotedPieceColor === 'white') {
                promotedSquareElement.classList.add('white-piece');
            } else {
                promotedSquareElement.classList.add('black-piece');
            }

            promotionOverlay.classList.add('hidden'); // Esconde o overlay
            pawnToPromote = null; // Limpa o peão pendente

            // Agora sim, troca o turno APÓS a promoção ser concluída
            isWhiteTurn = !isWhiteTurn;
            console.log(`Promoção concluída. Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

            // E verifica se o rei do NOVO jogador está em xeque após a promoção
            const currentPlayerKingColor = isWhiteTurn ? 'white' : 'black';
            if (isKingInCheck(currentPlayerKingColor)) {
                console.log(`Rei ${currentPlayerKingColor} está em XEQUE!`);
            }
        });
    });

}); // Fechamento final do DOMContentLoaded