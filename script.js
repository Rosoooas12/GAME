document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    let selectedSquare = null; // Variável para guardar a casa que foi clicada (peça selecionada)

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

    // Define qual turno é (true para branco, false para preto)
    let isWhiteTurn = true;

    // --- Funções Auxiliares para Regras de Movimento ---

    // Função para verificar se a peça é branca
    function isWhitePiece(piece) {
        return ['♔', '♕', '♖', '♗', '♘', '♙'].includes(piece);
    }

    // Função para verificar se a peça é preta
    function isBlackPiece(piece) {
        return ['♚', '♛', '♜', '♝', '♞', '♟'].includes(piece);
    }

    // Função para verificar se a casa de destino contém uma peça da mesma cor
    function isSameColor(piece1, piece2) {
        if (!piece1 || !piece2) return false;
        return (isWhitePiece(piece1) && isWhitePiece(piece2)) || (isBlackPiece(piece1) && isBlackPiece(piece2));
    }

    // --- Lógica de Validação de Movimento (APENAS PARA PEÕES POR ENQUANTO) ---
    function isValidMove(startRow, startCol, endRow, endCol) {
        const piece = boardState[startRow][startCol];
        const targetPiece = boardState[endRow][endCol];

        // Basicamente, não pode mover para a mesma casa
        if (startRow === endRow && startCol === endCol) {
            return false;
        }

        // Não pode capturar peça da mesma cor
        if (targetPiece && isSameColor(piece, targetPiece)) {
            return false;
        }

        // --- Lógica do Peão ---
        if (piece === '♙') { // Peão Branco
            // Movimento para frente (1 casa)
            if (endCol === startCol && endRow === startRow - 1 && targetPiece === '') {
                return true;
            }
            // Primeiro movimento (2 casas)
            if (startRow === 6 && endCol === startCol && endRow === startRow - 2 && targetPiece === '' && boardState[startRow - 1][startCol] === '') {
                return true;
            }
            // Captura na diagonal
            if (Math.abs(endCol - startCol) === 1 && endRow === startRow - 1 && isBlackPiece(targetPiece)) {
                return true;
            }
        } else if (piece === '♟') { // Peão Preto
            // Movimento para frente (1 casa)
            if (endCol === startCol && endRow === startRow + 1 && targetPiece === '') {
                return true;
            }
            // Primeiro movimento (2 casas)
            if (startRow === 1 && endCol === startCol && endRow === startRow + 2 && targetPiece === '' && boardState[startRow + 1][startCol] === '') {
                return true;
            }
            // Captura na diagonal
            if (Math.abs(endCol - startCol) === 1 && endRow === startRow + 1 && isWhitePiece(targetPiece)) {
                return true;
            }
        }

        // Por enquanto, todas as outras peças não têm validação e não podem se mover
        // Retorna false para movimentos não válidos para peças que não sejam peões neste momento
        return false;
    }


    // --- Inicialização do Tabuleiro (Código existente) ---
    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8);
        const col = i % 8;

        square.id = `sq-${row}-${col}`;

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
        const pieceInSquare = boardState[row][col]; // Peça na casa clicada atualmente

        // 1. Se nenhuma peça está selecionada
        if (!selectedSquare) {
            // E a casa clicada TEM uma peça
            if (pieceInSquare !== '') {
                // Verifica se é o turno da peça clicada
                if ((isWhiteTurn && isWhitePiece(pieceInSquare)) || (!isWhiteTurn && isBlackPiece(pieceInSquare))) {
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceInSquare };
                    squareElement.classList.add('selected');
                    console.log(`Peça selecionada: ${pieceInSquare} na casa ${row},${col}`);
                } else {
                    console.log(`Não é o turno da peça ${pieceInSquare}.`);
                }
            }
        } else { // 2. Se já temos uma peça selecionada
            // Se o clique for na mesma peça já selecionada, deseleciona
            if (selectedSquare.row === row && selectedSquare.col === col) {
                selectedSquare.element.classList.remove('selected');
                selectedSquare = null;
                console.log('Peça deselecionada.');
            } else {
                // Tenta mover a peça selecionada para a nova casa clicada
                const startRow = selectedSquare.row;
                const startCol = selectedSquare.col;
                const endRow = row;
                const endCol = col;

                // CHAMA A FUNÇÃO DE VALIDAÇÃO AQUI!
                if (isValidMove(startRow, startCol, endRow, endCol)) {
                    console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);

                    // Remove a peça da casa antiga (visual e lógico)
                    selectedSquare.element.textContent = '';
                    boardState[startRow][startCol] = '';
                    selectedSquare.element.classList.remove('selected'); // Remove destaque da antiga

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
                    isWhiteTurn = !isWhiteTurn; // Troca o turno
                    console.log(`Turno agora é do jogador ${isWhiteTurn ? 'Branco' : 'Preto'}.`);

                } else {
                    console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de ${startRow},${startCol} para ${endRow},${endCol}`);
                    selectedSquare.element.classList.remove('selected'); // Deseleciona
                    selectedSquare = null; // Reseta a seleção
                }
            }
        }
    }
});