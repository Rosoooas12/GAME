document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const chessboard = document.getElementById('chessboard');
    const startGameButton = document.getElementById('start-game-button');
    const newGameButton = document.getElementById('new-game-button');
    const difficultySelect = document.getElementById('difficulty-select');
    const whiteTimerDisplay = document.getElementById('white-timer');
    const blackTimerDisplay = document.getElementById('black-timer'); 
    const turnIndicator = document.getElementById('turn-indicator');
    const promotionOverlay = document.getElementById('promotion-overlay');
    const promotionButtons = document.querySelectorAll('.promotion-choices button');
    const gameContent = document.getElementById('game-content'); // Agrupa o tabuleiro e timers

    let selectedSquare = null;

    // --- VERIFICAÇÃO ESSENCIAL DOS ELEMENTOS DO DOM ---
    // Esta é a parte mais importante para evitar o erro "Cannot read properties of null"
    if (!chessboard || !startGameButton || !newGameButton || !difficultySelect || 
        !whiteTimerDisplay || !blackTimerDisplay || !turnIndicator ||
        !promotionOverlay || promotionButtons.length === 0 || !gameContent) { 
        console.error("Erro: Um ou mais elementos DOM essenciais não foram encontrados. O script será encerrado.");
        console.error("Verifique se seus IDs HTML (chessboard, start-game-button, new-game-button, difficulty-select, white-timer, black-timer, turn-indicator, promotion-overlay, game-content) correspondem aos do JavaScript.");
        alert("Ocorreu um erro ao carregar o jogo. Verifique o console do navegador para detalhes.");
        return; 
    }

    // --- INSTÂNCIA DA BIBLIOTECA CHESS.JS ---
    const chessGame = new Chess();

    // --- CONFIGURAÇÃO DO BOT ---
    const botColor = 'black'; // O bot sempre jogará com as peças pretas
    const botMoveDelay = 700; // Atraso em milissegundos para o movimento do bot

    // --- CONFIGURAÇÃO DE DIFICULDADE (PROFUNDIDADE DO ALGORITMO MINIMAX) ---
    const difficultyLevels = {
        'random': 0,   // Bot aleatório (sem busca)
        'easy': 1,     // Busca 1 movimento à frente
        'medium': 2,   // Busca 2 movimentos à frente
        'hard': 3      // Busca 3 movimentos à frente
    };
    let currentDifficulty = difficultySelect.value; 

    // --- FUNÇÕES DE ÁUDIO (Web Audio API) ---
    let audioContext;

    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Tenta resumir o contexto de áudio se ele estiver suspenso (por exemplo, após interação do usuário)
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
    
    // Adiciona event listeners para tentar "destravar" o AudioContext ao primeiro clique do usuário
    // Isso é necessário em muitos navegadores para que o áudio possa ser reproduzido.
    document.body.addEventListener('click', getAudioContext, { once: true });
    startGameButton.addEventListener('click', getAudioContext, { once: true }); 
    newGameButton.addEventListener('click', getAudioContext, { once: true });
    difficultySelect.addEventListener('change', getAudioContext, { once: true });

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

    // --- Renderização do Tabuleiro (LÊ DO CHESS.JS) ---
    function renderBoard() {
        if (!chessboard) {
            console.error("Erro interno: #chessboard não encontrado na função renderBoard. Isso não deveria acontecer.");
            return; 
        }
        chessboard.innerHTML = ''; 

        const currentBoard = chessGame.board(); 

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

                const pieceData = currentBoard[r][c]; 

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

    // --- Função de Início de Jogo (Nova) ---
    function startGame() {
        startGameButton.classList.add('hidden'); // Esconde "Começar Jogo"
        newGameButton.classList.remove('hidden'); // Mostra "Novo Jogo"
        gameContent.classList.remove('hidden'); // Mostra o tabuleiro e timers
        
        resetGame(); // Inicia um novo jogo limpo
    }

    // --- Função de Reinício do Jogo ---
    function resetGame() {
        chessGame.reset(); 
        
        isWhiteTurn = true;
        selectedSquare = null;
        pawnToPromote = null; 
        isGameOver = false;

        whiteTime = initialTime;
        blackTime = initialTime;
        updateTimerDisplay();

        clearHighlights();
        promotionOverlay.classList.add('hidden'); 

        renderBoard(); // Renderiza o tabuleiro aqui
        startTimer();
        console.log("Jogo Reiniciado!");

        // Se o bot joga com as brancas e a IA estiver habilitada, faz o primeiro movimento do bot
        if (botColor === 'white' && difficultyLevels[currentDifficulty] > 0) {
            setTimeout(makeBotMove, botMoveDelay);
        }
    }

    // --- Funções de Ajuda para a IA ---
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
    function evaluateBoard(board) {
        let score = 0;
        const pieceValues = {
            'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900 
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

    function minimax(game, depth, alpha, beta, isMaximizingPlayer) {
        if (depth === 0 || game.game_over()) {
            return evaluateBoard(game.board());
        }

        const moves = game.moves({ verbose: true });
        
        const pieceValuesForSorting = {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 
        };
        moves.sort((a, b) => {
            const aCaptureValue = a.captured ? pieceValuesForSorting[a.captured.toLowerCase()] : 0;
            const bCaptureValue = b.captured ? pieceValuesForSorting[b.captured.toLowerCase()] : 0;
            return bCaptureValue - aCaptureValue;
        });

        if (isMaximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = minimax(game, depth - 1, alpha, beta, false); 
                game.undo();
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) {
                    break; 
                }
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                game.move(move);
                const evaluation = minimax(game, depth - 1, alpha, beta, true); 
                game.undo();
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) {
                    break;
                }
            }
            return minEval;
        }
    }
    
    function findBestMove(game, depth) {
        const possibleMoves = game.moves({ verbose: true });
        let bestMove = null;
        let bestValue;
        const originalTurn = game.turn(); 

        if (originalTurn === 'w') { 
            bestValue = -Infinity;
        } else {
            bestValue = Infinity;
        }

        const pieceValuesForSorting = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };
        possibleMoves.sort((a, b) => {
            const aCaptureValue = a.captured ? pieceValuesForSorting[a.captured.toLowerCase()] : 0;
            const bCaptureValue = b.captured ? pieceValuesForSorting[b.captured.toLowerCase()] : 0;
            return bCaptureValue - aCaptureValue;
        });

        for (const move of possibleMoves) {
            game.move(move); 
            const evaluation = minimax(game, depth - 1, -Infinity, Infinity, originalTurn === 'b' ? true : false); 
            game.undo(); 

            if (originalTurn === 'w') {
                if (evaluation > bestValue) {
                    bestValue = evaluation;
                    bestMove = move;
                }
            } else { 
                if (evaluation < bestValue) {
                    bestValue = evaluation;
                    bestMove = move;
                }
            }
        }
        return bestMove;
    }

    function makeBotMove() {
        if (isGameOver || chessGame.turn() !== botColor[0]) {
            return;
        }

        console.log(`Turno do Bot (${botColor[0].toUpperCase()}). Dificuldade: ${currentDifficulty}`);
        
        let chosenMove = null;
        const depth = difficultyLevels[currentDifficulty];

        const possibleMoves = chessGame.moves({ verbose: true });

        if (possibleMoves.length === 0) {
            console.log("Bot não tem movimentos válidos. Jogo já deve estar finalizado.");
            checkGameStatus(); 
            return;
        }

        if (depth === 0) {
            chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
        } else {
            const tempGame = new Chess(chessGame.fen()); 
            chosenMove = findBestMove(tempGame, depth);
        }

        if (chosenMove) {
            // Garante que a promoção seja sempre para 'q' (rainha) para o bot
            if (chosenMove.promotion) {
                chosenMove.promotion = 'q'; 
            }

            const moveResult = chessGame.move(chosenMove);
            console.log("Bot moveu:", chosenMove);

            renderBoard(); 

            if (moveResult.captured) {
                playCaptureSound();
            } else if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
                playCastleSound();
            } else {
                playMoveSound();
            }

            checkGameStatus(); 
            if (!isGameOver) {
                switchTurn(); 
            }
        } else {
            console.error("Erro: Bot não conseguiu encontrar um movimento válido.");
            checkGameStatus(); // Verifica o status do jogo mesmo que o bot não mova
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
            const winnerColor = chessGame.turn() === 'w' ? 'Pretas' : 'Brancas';
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

        // Impede cliques do jogador se for o turno do bot e a IA estiver habilitada
        if ((currentTurnColor === botColor) && difficultyLevels[currentDifficulty] > 0) {
            console.log("Não é o seu turno. É o turno do bot.");
            return;
        }

        if (!selectedSquare) {
            // Seleciona uma peça se houver uma e for do turno correto
            if (pieceData) {
                const pieceColor = (pieceData.color === 'w') ? 'white' : 'black';
                if (pieceColor === currentTurnColor) { 
                    selectedSquare = { element: squareElement, row: row, col: col, piece: pieceSymbols[pieceData.type.toUpperCase() || pieceData.type] };
                    squareElement.classList.add('selected');
                    
                    // Destaca os movimentos válidos para a peça selecionada
                    const validMoves = chessGame.moves({ square: squareName, verbose: true }).map(move => fromChessCoord(move.to));
                    highlightValidMoves(validMoves);
                    console.log(`Peça selecionada: ${selectedSquare.piece} na casa ${row},${col}. Movimentos válidos:`, validMoves);
                } else {
                    console.log(`Não é o turno da peça ${pieceSymbols[pieceData.type.toUpperCase() || pieceData.type]}.`);
                }
            }
        } else {
            // Tenta mover a peça selecionada para a nova casa
            const startSquareName = toChessCoord(selectedSquare.row, selectedSquare.col);
            const endSquareName = toChessCoord(row, col);

            // Tenta fazer o movimento (incluindo promoções automáticas exceto para o usuário)
            let moveResult;
            try {
                // Se for um movimento de peão para a última fileira, prepare para promoção
                const isPawnPromotion = chessGame.get(startSquareName).type === 'p' && 
                                        ((chessGame.turn() === 'w' && row === 0) || (chessGame.turn() === 'b' && row === 7));

                if (isPawnPromotion) {
                    // Armazena o movimento para promoção e mostra o overlay
                    pawnToPromote = { from: startSquareName, to: endSquareName };
                    promotionOverlay.classList.remove('hidden');
                    pauseTimer();
                    playPromoteSound();
                    console.log("Peão pronto para promoção!");
                    // Não executa o move final ainda, espera a escolha do usuário
                    selectedSquare.element.classList.remove('selected');
                    clearHighlights();
                    selectedSquare = null;
                    return; // Sai da função, a promoção será tratada pelos botões do overlay
                } else {
                    moveResult = chessGame.move({
                        from: startSquareName,
                        to: endSquareName
                    });
                }
            } catch (e) {
                console.error("Erro ao tentar mover:", e.message);
                moveResult = null;
            }

            if (moveResult) {
                console.log(`Movimento VÁLIDO de ${selectedSquare.piece} de ${startSquareName} para ${endSquareName}`);
                
                renderBoard(); // Renderiza o tabuleiro após o movimento

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

                checkGameStatus(); // Verifica se o jogo terminou
                if (!isGameOver) {
                    switchTurn(); // Passa o turno
                }
            } else {
                console.log(`Movimento INVÁLIDO para ${selectedSquare.piece} de ${startSquareName} para ${endSquareName}.`);
                // Limpa a seleção e os destaques se o movimento for inválido
                selectedSquare.element.classList.remove('selected');
                clearHighlights();
                selectedSquare = null;
            }
        }
    }

    // --- LÓGICA DE PROMOÇÃO DE PEÃO ---
    promotionButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            if (!pawnToPromote) return;

            const chosenPieceType = event.target.dataset.piece.toLowerCase(); 
            
            const promotionFinalMove = chessGame.move({
                from: pawnToPromote.from,
                to: pawnToPromote.to,
                promotion: chosenPieceType
            });

            if (promotionFinalMove) {
                console.log(`Peão promovido para ${chosenPieceType.toUpperCase()} em ${pawnToPromote.to}`);
                renderBoard(); // Renderiza o tabuleiro após a promoção
            } else {
                console.error("Erro ao finalizar a promoção.");
            }

            promotionOverlay.classList.add('hidden');
            pawnToPromote = null; // Limpa o estado de promoção pendente

            checkGameStatus(); // Verifica o status do jogo após a promoção
            if (!isGameOver) {
                switchTurn(); // Passa o turno
            }
        });
    });

    // --- Event Listeners dos Botões e Seleção ---
    startGameButton.addEventListener('click', startGame); // Listener para o novo botão "Começar Jogo"
    newGameButton.addEventListener('click', resetGame); // "Novo Jogo" agora chama resetGame diretamente
    
    difficultySelect.addEventListener('change', (event) => {
        currentDifficulty = event.target.value;
        console.log("Dificuldade da IA alterada para:", currentDifficulty);
        // Não reseta automaticamente, o usuário clica em "Começar Jogo" ou "Novo Jogo"
    });

    // Chamada inicial para mostrar os tempos iniciais e estado do jogo (antes de "Começar Jogo" ser clicado)
    updateTimerDisplay(); 
});