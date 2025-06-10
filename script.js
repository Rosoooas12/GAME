document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');

    for (let i = 0; i < 64; i++) {
        const square = document.createElement('div');
        square.classList.add('square');

        // Determina se a casa é clara ou escura para aplicar a cor
        // Essa lógica é importante para as casas alternarem corretamente
        const row = Math.floor(i / 8);
        const col = i % 8;
        if ((row + col) % 2 === 0) {
            square.classList.add('light'); // Adiciona uma classe para casas claras
        } else {
            square.classList.add('dark'); // Adiciona uma classe para casas escuras
        }

        chessboard.appendChild(square);
    }
});