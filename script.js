document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');

    // Representação do tabuleiro de xadrez no estado inicial com símbolos Unicode
    // Cada array representa uma linha do tabuleiro
    const initialBoard = [
        ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'], // Peças pretas (Torre, Cavalo, Bispo, Rainha, Rei, Bispo, Cavalo, Torre)
        ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'], // Peões pretos
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'], // Peões brancos
        ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']  // Peças brancas
    ];

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        const row = Math.floor(i / 8); // Calcula a linha (0 a 7)
        const col = i % 8;    // Calcula a coluna (0 a 7)

        // Adiciona a classe 'light' ou 'dark' para colorir a casa
        if ((row + col) % 2 === 0) {
            square.classList.add('light');
        } else {
            square.classList.add('dark');
        }

        // Adiciona a peça Unicode à casa, se houver uma na posição inicial
        const piece = initialBoard[row][col];
        if (piece) {
            square.textContent = piece; // Define o símbolo da peça como texto da casa
            // Adiciona uma classe para estilizar as peças (cores)
            if (row < 2) { // Peças pretas estão nas duas primeiras linhas (0 e 1)
                square.classList.add('black-piece');
            } else if (row > 5) { // Peças brancas estão nas duas últimas linhas (6 e 7)
                square.classList.add('white-piece');
            }
        }

        chessboard.appendChild(square);
    }
});