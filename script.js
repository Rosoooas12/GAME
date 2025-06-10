document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    let selectedSquare = null; // Variável para guardar a casa que foi clicada (peça selecionada)

    // Representação do tabuleiro de xadrez no estado inicial com símbolos Unicode
    const initialBoard = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    ];

    // Mapeamento de peças para o array de tabuleiro (útil mais tarde para a lógica do jogo)
    const boardState = initialBoard.map(row => [...row]); // Cria uma cópia do tabuleiro inicial

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8);
        const col = i % 8;

        // Adiciona um ID único para cada casa, como "sq-0-0", "sq-0-1", etc.
        square.id = `sq-<span class="math-inline">\{row\}\-</span>{col}`;

        if ((row + col) % 2 === 0) {
            square.classList.add('light');
        } else {
            square.classList.add('dark');
        }

        const piece = boardState[row][col]; // Pega a peça do estado atual do tabuleiro
        if (piece) {
            square.textContent = piece;
            if (row < 2) {
                square.classList.add('black-piece');
            } else if (row > 5) {
                square.classList.add('white-piece');
            }
        }

        // Adiciona o event listener de clique a cada casa
        square.addEventListener('click', () => {
            handleClick(square, row, col);
        });

        chessboard.appendChild(square);
    }

    // Função que lida com o clique em uma casa
    function handleClick(squareElement, row, col) {
        console.log(`Casa clicada: Linha ${row}, Coluna ${col}`);

        const pieceInSquare = boardState[row][col];

        // Se nenhuma peça está selecionada atualmente
        if (!selectedSquare) {
            // E a casa clicada TEM uma peça
            if (pieceInSquare !== '') {
                selectedSquare = { element: squareElement, row: row, col: col, piece: pieceInSquare };
                squareElement.classList.add('selected'); // Adiciona uma classe para destacar a peça selecionada
                console.log(`Peça selecionada: ${pieceInSquare} na casa <span class="math-inline">\{row\},</span>{col}`);
            }
        } else { // Se já temos uma peça selecionada
            // Se o clique for na mesma peça já selecionada, deseleciona
            if (selectedSquare.row === row && selectedSquare.col === col) {
                selectedSquare.element.classList.remove('selected');
                selectedSquare = null;
                console.log('Peça deselecionada.');
            } else {
                // Aqui é onde a lógica de movimento real vai entrar
                // Por enquanto, vamos apenas mover a peça para a nova casa (sem validação de regras)
                console.log(`Tentando mover ${selectedSquare.piece} de <span class="math-inline">\{selectedSquare\.row\},</span>{selectedSquare.col} para <span class="math-inline">\{row\},</span>{col}`);

                // Remove a peça da casa antiga
                selectedSquare.element.textContent = '';
                boardState[selectedSquare.row][selectedSquare.col] = '';
                selectedSquare.element.classList.remove('selected'); // Remove destaque da antiga

                // Move a peça para a nova casa
                squareElement.textContent = selectedSquare.piece;
                boardState[row][col] = selectedSquare.piece;

                // Ajusta a cor da peça na nova casa, se houver troca de cores de peças (captura)
                // (Lógica mais complexa para captura real virá depois)
                if (selectedSquare.element.classList.contains('white-piece')) {
                    squareElement.classList.remove('black-piece');
                    squareElement.classList.add('white-piece');
                } else if (selectedSquare.element.classList.contains('black-piece')) {
                    squareElement.classList.remove('white-piece');
                    squareElement.classList.add('black-piece');
                }

                selectedSquare = null; // Reseta a seleção
                console.log('Movimento simulado realizado.');
            }
        }
    }
});