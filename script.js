document.addEventListener('DOMContentLoaded', () => {
    const chessboard = document.getElementById('chessboard');
    const newGameButton = document.getElementById('new-game-button');
    const difficultySelect = document.getElementById('difficulty-select'); // Novo elemento
    const whiteTimerDisplay = document.getElementById('white-timer');
    const blackTimerDisplay = document.getElementById('black-timer');
    const turnIndicator = document.getElementById('turn-indicator');
    let selectedSquare = null;

    // --- INSTÂNCIA DA BIBLIOTECA CHESS.JS ---
    const chessGame = new Chess();

    // --- CONFIGURAÇÃO DO BOT ---
    const botColor = 'black'; // O bot sempre jogará com as peças pretas
    const botMoveDelay = 700; // Atraso em milissegundos para o movimento do bot

    // --- CONFIGURAÇÃO DE DIFICULDADE (PROFUNDIDADE DO ALGORITMO MINIMAX) ---
    const difficultyLevels = {
        'random': 0, // 0 significa bot aleatório (sem busca)
        'easy': 1,   // Busca 1 movimento à frente (apenas o próprio movimento)
        'medium': 2, // Busca 2 movimentos à frente (seu movimento, resposta do oponente)
        'hard': 3    // Busca 3 movimentos à frente (seu movimento, resposta do oponente, sua próxima resposta)
    };
    let currentDifficulty = difficultySelect.value; // Pega a dificuldade inicial do select

    // --- FUNÇÕES DE ÁUDIO (Web Audio API) ---
    let audioContext;

    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed!');
            }).catch(e => {
                console.error('Failed to resume AudioContext:', e);
            });
        }
        return audioContext;
    }

    function playSound(frequency, duration, type = 'sine', volume = 0.1, delay = 0) {
        const context = getAudioContext();
        if (!context) { return; }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, context.currentTime + delay);
        gainNode.gain.setValueAtTime(volume, context.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + duration);

        oscillator.start(context.currentTime + delay);
        oscillator.stop(context.currentTime + delay + duration);
    }

    function playMoveSound() { playSound(440, 0.1, 'sine', 0.1); }
    function playCaptureSound() { playSound(330, 0.15, 'triangle', 0.2); }
    function playCheckmateSound() {
        const context = getAudioContext();
        if (!context) return;
        const mainOscillator = context.createOscillator();
        const gainNode = context.createGain();
        mainOscillator.connect(gainNode);
        gainNode.connect(context.destination);
        mainOscillator.type = 'sawtooth';
        mainOscillator.frequency.setValueAtTime(220, context.currentTime);
        mainOscillator.frequency.linearRampToValueAtTime(330, context.currentTime + 0.5);
        mainOscillator.frequency.linearRampToValueAtTime(110, context.currentTime + 1.0);
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.0001, context.currentTime + 1.2);
        mainOscillator.start(context.currentTime);
        mainOscillator.stop(context.currentTime + 1.2);
    }
    function playPromoteSound() { playSound(660, 0.1, 'square', 0.15); }
    function playCastleSound() { playSound(550, 0.08, 'sine', 0.1); playSound(660, 0.08, 'sine', 0.1, 0.1); }
    
    // Adiciona event listeners para tentar "destravar" o AudioContext
    document.body.addEventListener('click', getAudioContext, { once: true });
    newGameButton.addEventListener('click', getAudioContext, { once: true });
    difficultySelect.addEventListener('change', getAudioContext, { once: true }); // Também no select de dificuldade

    // Mapeamento de peças do chess.js para símbolos Unicode
    const pieceSymbols = {
        'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
        'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
    };

    let isWhiteTurn = true;
    const initialTime = 5 * 60; // 5 minutos em segundos por jogador
    let whiteTime = initialTime;
    let blackTime = initialTime;
    let timerInterval;
    let pawnToPromote = null;
    let isGameOver = false;

    // --- Funções Auxiliares de Peças e Cores ---
    function isWhitePiece(pieceSymbol) {
        return ['♔', '♕', '♖', '♗', '♘', '♙'].includes(pieceSymbol);
    }

    function isBlackPiece(pieceSymbol) {
        return ['♚', '♛', '♜', '♝', '♞', '♟'].includes(pieceSymbol);
    }

    function getPieceColor(pieceSymbol) {
        if (isWhitePiece(pieceSymbol)) return 'white';
        if (isBlackPiece(pieceSymbol)) return 'black';
        return null;
    }

    // --- Funções de Destaque ---
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
        playCheckmateSound();
    }

    // --- Renderização do Tabuleiro (AGORA LÊ DO CHESS.JS) ---
    function renderBoard() {
        if (!chessboard) {
            console.error("Erro: O elemento #chessboard não foi encontrado no DOM.");
            return;
        }
        chessboard.innerHTML = '';

        const currentBoard = chessGame.board(); // Objeto 8x8 do chess.js

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const square = document.createElement('div');
                square.classList.add('square');
                square.id = 'sq-' + r + '-' + c;

                if ((r + c) % 2 === 0) {
                    square.classList.add('light');
                } else {
                    square.classList.add('dark');
                }

                const pieceData = currentBoard[r][c]; // { type: 'p', color: 'w' } ou null

                if (pieceData) {
                    const pieceSymbol = pieceSymbols[pieceData.type.toUpperCase()] || pieceSymbols[pieceData.type];
                    if (pieceData.color === 'b') {
                        square.classList.add('black-piece');
                    } else {
                        square.classList.add('white-piece');
                    }
                    square.textContent = pieceSymbol;
                }

                square.addEventListener('click', () => {
                    handleClick(square, r, c);
                });
                chessboard.appendChild(square);
            }
        }
    }

    // Chamada inicial para renderizar o tabuleiro e iniciar o relógio
    renderBoard();
    updateTimerDisplay();
    startTimer();

    // --- Função de Reinício do Jogo ---
    function resetGame() {
        chessGame.reset(); // Reseta o estado do jogo na biblioteca chess.js
        
        isWhiteTurn = true;
        selectedSquare = null;
        pawnToPromote = null;
        isGameOver = false;

        whiteTime = initialTime;
        blackTime = initialTime;
        updateTimerDisplay();

        clearHighlights();
        document.getElementById('promotion-overlay').classList.add('hidden');

        renderBoard();
        startTimer();
        console.log("Jogo Reiniciado!");

        // Se o bot joga com as brancas e a IA estiver habilitada, faz o primeiro movimento do bot
        if (botColor === 'white' && difficultyLevels[currentDifficulty] > 0) {
            setTimeout(makeBotMove, botMoveDelay);
        }
    }

    // --- Funções de Ajuda para a IA (Converte coordenadas para notação de xadrez e vice-versa) ---
    function toChessCoord(row, col) {
        return String.fromCharCode(97 + col) + (8 - row);
    }

    function fromChessCoord(coord) {
        return {
            r: 8 - parseInt(coord[1]),
            c: coord.charCodeAt(0) - 97
        };
    }

    // --- LÓGICA DA IA (BOT) ---

    // Função de Avaliação Simples (Evaluation Function)
    // Dá pontos para as peças. Pode ser expandida para incluir controle de centro, etc.
    function evaluateBoard(board) {
        let score = 0;
        const pieceValues = {
            'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900 // K é alto para indicar importância
        };

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (piece) {
                    const value = pieceValues[piece.type];
                    if (piece.color === 'w') {
                        score += value;
                    } else {
                        score -= value;
                    }
                }
            }
        }
        return score;
    }

    // Algoritmo Minimax/Negamax com Poda Alpha-Beta
    // Adaptação de https://github.com/josephredfern/minimax-chess-ai
    function minimax(game, depth, alpha, beta, maximizingPlayer) {
        if (depth === 0 || game.game_over()) {
            return evaluateBoard(game.board());
        }

        const moves = game.moves({ verbose: true });

        // Ordena os movimentos para otimizar a poda alpha-beta (tenta movimentos mais promissores primeiro)
        moves.sort((a, b) => {
            // Prioriza capturas e movimentos que mudam o material
            const aValue = a.captured ? pieceValues[a.captured.toLowerCase()] : 0;
            const bValue = b.captured ? pieceValues[b.captured.toLowerCase()] : 0;
            return bValue - aValue; // Quanto maior o valor da peça capturada, mais interessante
        });

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = minimax(game, depth - 1, alpha, beta, false);
                game.undo(); // Desfaz o movimento para testar o próximo
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break; // Poda Beta
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = minimax(game, depth - 1, alpha, beta, true);
                game.undo(); // Desfaz o movimento para testar o próximo
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break; // Poda Alpha
                }
            }
            return minEval;
        }
    }
    
    // Função para calcular o melhor movimento para a IA
    function findBestMove(game, depth) {
        const possibleMoves = game.moves({ verbose: true });
        let bestMove = null;
        let bestValue = -Infinity; // Se a IA for 'w', maximiza. Se for 'b', minimiza.
        const originalTurn = game.turn(); // 'w' ou 'b'

        // A IA está jogando como preto, então ela quer minimizar a pontuação (que é favorável às brancas)
        // Por isso, inicializamos bestValue como Infinity e procuramos o menor valor.
        // Se a IA fosse branca, seria -Infinity.
        if (originalTurn === 'b') {
            bestValue = Infinity;
        }

        // Ordena os movimentos para otimizar a poda alpha-beta
        possibleMoves.sort((a, b) => {
            const pieceValues = { 'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90 };
            const aValue = a.captured ? pieceValues[a.captured.toLowerCase()] : 0;
            const bValue = b.captured ? pieceValues[b.captured.toLowerCase()] : 0;
            return bValue - aValue; // Prioriza capturas
        });


        for (const move of possibleMoves) {
            game.move(move); // Faz o movimento na instância temporária do jogo

            // Se o turno for 'w', a IA está maximizando. Se for 'b', a IA está minimizando.
            const evaluation = minimax(game, depth - 1, -Infinity, Infinity, originalTurn === 'b' ? false : true); // Inverte o maximizingPlayer para a próxima camada
            
            game.undo(); // Desfaz o movimento para testar o próximo

            if (originalTurn === 'w') { // Se a IA for branca (MAXIMIZANDO)
                if (evaluation > bestValue) {
                    bestValue = evaluation;
                    bestMove = move;
                }
            } else { // Se a IA for preta (MINIMIZANDO)
                if (evaluation < bestValue) {
                    bestValue = evaluation;
                    bestMove = move;
                }
            }
        }
        return bestMove;
    }

    // Função principal para o movimento do bot
    function makeBotMove() {
        if (isGameOver || chessGame.turn() !== botColor[0]) {
            return; // Não é o turno do bot ou o jogo acabou
        }

        console.log(`Turno do Bot (${botColor[0].toUpperCase()}). Dificuldade: ${currentDifficulty}`);
        
        let chosenMove = null;
        const depth = difficultyLevels[currentDifficulty];

        if (depth === 0) { // Bot Aleatório
            const possibleMoves = chessGame.moves({ verbose: true });
            if (possibleMoves.length > 0) {
                chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            }
        } else { // Bot com IA (Minimax)
            // Cria uma cópia do jogo para a IA não afetar o estado real durante a busca
            const tempGame = new Chess(chessGame.fen()); 
            chosenMove = findBestMove(tempGame, depth);
        }

        if (chosenMove) {
            const moveResult = chessGame.move(chosenMove);
            console.log("Bot moveu:", chosenMove);

            renderBoard();

            if (moveResult.captured) {
                playCaptureSound();
            } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
                playCastleSound();
            } else if (moveResult.flags.includes('p')) {
                playPromoteSound();
            } else {
                playMoveSound();
            }

            checkGameStatus();
            if (!isGameOver) {
                switchTurn();
            }
        } else {
            console.log("Bot não encontrou nenhum movimento. Fim de jogo ou erro.");
            // Isso pode indicar afogamento ou xeque-mate se o chessGame.moves() retornou vazio
            checkGameStatus(); // Para garantir que o fim do jogo seja detectado
        }
    }


    // --- Funções para controlar o Turno e o Fim do Jogo ---
    function switchTurn() {
        isWhiteTurn = !isWhiteTurn;
        updateTimerDisplay();
        startTimer();

        // Se for o turno do bot e a IA estiver habilitada, faz o movimento do bot
        if ((isWhiteTurn && botColor === 'white' || !isWhiteTurn && botColor === 'black') && difficultyLevels[currentDifficulty] > 0) {
            setTimeout(makeBotMove, botMoveDelay);
        }
    }

    function checkGameStatus() {
        if (chessGame.in_checkmate()) {
            isGameOver = true;
            pauseTimer();
            const winnerColor = chessGame.turn() === 'w' ? 'Pretas' : 'Brancas'; // O perdedor é o de quem é o turno
            alert(`XEQUE-MATE! O jogador ${chessGame.turn() === 'w' ? 'Brancas' : 'Pretas'} perdeu. ${winnerColor} venceu!`);
            playCheckmateSound();
        } else if (chessGame.in_stalemate()) {
            isGameOver = true;
            pauseTimer();
            alert("AFOGAMENTO! O jogo terminou em empate.");
        } else if (chessGame.in_draw()) {
            isGameOver = true;
            pauseTimer();
            alert("O jogo terminou em empate por regra de empate!");
        } else if (chessGame.in_threefold_repetition()) {
            isGameOver = true;
            pauseTimer();
            alert("O jogo terminou em empate por repetição de movimentos!");
        } else if (chessGame.insufficient_material()) {
            isGameOver = true;
            pauseTimer();
            alert("O jogo terminou em empate por material insuficiente!");
        } else if (chessGame.in_check()) {
            console.log(`Rei ${chessGame.turn() === 'w' ? 'Branco' : 'Preto'} está em XEQUE!`);
        }
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

        const squareName = toChessCoord(row, col);
        const pieceData = chessGame.get(squareName);

        const currentTurnColor = isWhiteTurn ? 'white' : 'black';

        // Impede que o jogador clique se for o turno do bot
        if ((currentTurnColor === botColor) && difficultyLevels[currentDifficulty] > 0) {
            console.log("Não é o seu turno. É o turno do bot.");
            return;
        }

        if (!selectedSquare) {
            if (pieceData) {
                const pieceColor = (pieceData.color === 'w') ? 'white' : 'black';
                if (pieceColor === currentTurnColor) { // Só pode selecionar sua própria peça no seu turno
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceSymbols[pieceData.type.toUpperCase() || pieceData.type] };
                    squareElement.classList.add('selected');
                    
                    const validMoves = chessGame.moves({ square: squareName, verbose: true }).map(move => fromChessCoord(move.to));
                    highlightValidMoves(validMoves);
                    console.log(`Peça selecionada: ${selectedSquare.piece} na casa ${row},${col}. Movimentos válidos:`, validMoves);
                } else {
                    console.log(`Não é o turno da peça ${pieceSymbols[pieceData.type.toUpperCase() || pieceData.type]}.`);
                }
            }
        } else {
            const startSquareName = toChessCoord(selectedSquare.row, selectedSquare.col);
            const endSquareName = toChessCoord(row, col);

            let moveResult;
            try {
                // Ao mover um peão para a última fileira, o chess.js entra em estado de promoção
                // Se a UI for lidar com a escolha, não passe 'promotion' aqui.
                // Passe 'promotion' se quiser uma promoção automática (ex: sempre rainha)
                moveResult = chessGame.move({
                    from: startSquareName,
                    to: endSquareName,
                    // promotion: 'q' // Descomente para promoção automática para rainha
                });
            } catch (e) {
                console.error("Erro ao tentar mover:", e.message);
                moveResult = null;
            }

            if (moveResult) {
                console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startSquareName} para ${endSquareName}`);
                
                renderBoard();

                if (moveResult.captured) {
                    playCaptureSound();
                } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
                    playCastleSound();
                } else {
                    playMoveSound();
                }

                selectedSquare.element.classList.remove('selected'); 
                clearHighlights();
                selectedSquare = null;

                // Lógica de promoção de peão: Agora verificamos se o jogo está em estado de promoção
                if (chessGame.in_promotion()) {
                    pawnToPromote = { 
                        r: row, 
                        c: col, 
                        piece: pieceSymbols[moveResult.piece] // Peça que está sendo promovida
                    }; 
                    document.getElementById('promotion-overlay').classList.remove('hidden');
                    pauseTimer();
                    playPromoteSound();
                    console.log("Peão pronto para promoção!");
                } else {
                    checkGameStatus();
                    if (!isGameOver) {
                        switchTurn();
                    }
                }
            } else {
                console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de ${startSquareName} para ${endSquareName}.`);
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

            const chosenPieceType = event.target.dataset.piece.toLowerCase(); // 'q', 'r', 'b', 'n'
            const targetSquareName = toChessCoord(pawnToPromote.r, pawnToPromote.c);

            // A promoção real no chess.js acontece quando você chama move() com a opção promotion.
            // Aqui, após a escolha do usuário, fazemos o movimento final de promoção.
            // É importante que o movimento original que levou à promoção NÃO tenha tido a opção 'promotion'
            // para que `chessGame.in_promotion()` retorne true.
            
            // O `chess.js` automaticamente move o peão para a casa final e espera pela promoção.
            // A promoção em si é feita com `chessGame.put(pieceData, squareName)` ou `chessGame.promote(pieceType)`.
            // Ou você pode simplesmente fazer um `move` novamente com o destino e a peça promovida.
            // Para simplicidade, vamos usar `put` para "trocar" a peça na casa.

            const color = chessGame.turn() === 'w' ? 'b' : 'w'; // A peça promovida tem a cor do jogador que acabou de mover.
            const pieceData = { type: chosenPieceType, color: color };
            chessGame.put(pieceData, targetSquareName);
            
            renderBoard(); // Re-renderiza para mostrar a peça promovida

            promotionOverlay.classList.add('hidden');
            pawnToPromote = null;

            checkGameStatus(); // Verifica se o jogo acabou após a promoção
            if (!isGameOver) {
                switchTurn(); // Troca o turno e reinicia o relógio
            }
        });
    });

    // --- Event Listeners dos Botões ---
    newGameButton.addEventListener('click', resetGame);
    
    // Altera a dificuldade da IA
    difficultySelect.addEventListener('change', (event) => {
        currentDifficulty = event.target.value;
        console.log("Dificuldade da IA alterada para:", currentDifficulty);
        // Opcional: Reiniciar o jogo automaticamente ou apenas aplicar a nova dificuldade no próximo jogo
        // resetGame(); 
    });

    // Inicia o bot se ele for o primeiro a jogar (peças pretas) e a IA estiver habilitada
    if (botColor === 'white' && difficultyLevels[currentDifficulty] > 0) {
        setTimeout(makeBotMove, botMoveDelay);
    }
});