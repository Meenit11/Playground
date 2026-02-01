// ================================
// ODD ONE IN - GAME LOGIC
// ================================

// Shared Game Data (What gets synced across players)
let gameState = {
    gameId: null,
    players: [],           // Approved players in the game
    pendingPlayers: [],    // Players waiting for GM approval
    currentRound: 1,
    currentQuestion: '',
    currentPlayerIndex: 0,
    timerState: { remaining: 10, isPaused: false },
    answers: [],
    allQuestions: null,
    usedQuestions: new Set(),
    isStarted: false,
    gmId: null            // ID of the Game Master
};

// Local Tab State (Specific to this browser session)
let isLocalGM = false;
let localPlayerId = null;
let currentUserName = '';

let gameTimer = null;

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    setupEventListeners();
    checkInviteLink();
});

// Load questions from JSON
async function loadQuestions() {
    try {
        const response = await fetch('../questions.json');
        const data = await response.json();
        gameState.allQuestions = data;
        console.log('Questions loaded');
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Check if joined via invite link
function checkInviteLink() {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');

    if (joinCode) {
        const existingGame = loadGame('odd-one-in');
        if (existingGame && existingGame.gameId === joinCode) {
            gameState = existingGame;
        } else {
            gameState.gameId = joinCode;
        }

        document.querySelectorAll('.back-link').forEach(el => {
            if (el.closest('.screen-header')) el.classList.add('hidden');
        });

        showScreen('screen-player-join');
    } else {
        showScreen('screen-entry');
    }

    // Storage listener for cross-tab sync
    window.addEventListener('storage', (e) => {
        if (e.key === 'meenit-odd-one-in') {
            const updated = JSON.parse(e.newValue);
            if (updated && updated.gameId === gameState.gameId) {
                const wasApproved = !gameState.players.find(p => p.id === localPlayerId) &&
                    updated.players.find(p => p.id === localPlayerId);

                gameState = updated;
                updateLobbyView();

                // If player was just approved, move them to lobby
                if (wasApproved && !isLocalGM) {
                    showScreen('screen-lobby-player');
                }

                // If GM started game, move player to playing screen
                if (gameState.isStarted && !document.getElementById('screen-lobby-player').classList.contains('hidden')) {
                    showScreen('screen-playing');
                    startAnswerCollection();
                }
            }
        }
    });
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // Screen: Entry
    document.getElementById('create-game-btn').addEventListener('click', createGame);
    document.getElementById('entry-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createGame();
    });

    // Screen: Player Join
    document.getElementById('join-game-btn').addEventListener('click', joinGame);
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // Screen: Lobby (GM)
    document.getElementById('start-game-btn-gm').addEventListener('click', startGame);
    document.getElementById('copy-link-btn').addEventListener('click', copyInviteLink);
    document.getElementById('share-whatsapp-btn').addEventListener('click', shareOnWhatsApp);

    // Screen: Playing
    document.getElementById('submit-answer-btn').addEventListener('click', submitAnswer);
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    // GM Controls
    document.getElementById('pause-timer-btn').addEventListener('click', pauseTimer);
    document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
    document.getElementById('skip-player-btn').addEventListener('click', skipPlayer);

    // Judging
    document.getElementById('next-round-btn').addEventListener('click', nextRound);

    // Winner
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
}

// ================================
// SCREEN NAVIGATION
// ================================

function showScreen(screenId) {
    console.log('Showing screen:', screenId);
    const screens = [
        'screen-entry', 'screen-lobby-gm', 'screen-lobby-player',
        'screen-player-join', 'screen-playing', 'screen-judging',
        'screen-winner', 'screen-spectator', 'screen-waiting-approval'
    ];
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            if (id === screenId) {
                screen.classList.remove('hidden');
                screen.classList.add('animate-fadeIn');
            } else {
                screen.classList.add('hidden');
            }
        }
    });
}

// ================================
// GAME FLOW - SETUP
// ================================

function createGame() {
    const btn = document.getElementById('create-game-btn');
    const input = document.getElementById('entry-name');
    const name = input ? input.value.trim() : '';

    if (!name) {
        if (input) shakeElement(input);
        return;
    }

    if (btn) btn.disabled = true;

    currentUserName = name;
    localPlayerId = generateId();
    isLocalGM = true;

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    gameState.gmId = localPlayerId;
    gameState.players = [{ id: localPlayerId, name: name, isGM: true, isEliminated: false }];
    gameState.pendingPlayers = [];
    gameState.isStarted = false;

    saveGame('odd-one-in', gameState);
    updateLobbyView();
    showScreen('screen-lobby-gm');
}

function joinGame() {
    console.log('=== JOIN GAME CLICKED ===');
    const btn = document.getElementById('join-game-btn');
    const input = document.getElementById('player-name');
    const name = input ? input.value.trim() : '';

    if (!name) {
        if (input) shakeElement(input);
        return;
    }

    if (btn) btn.disabled = true;

    // Load latest state
    const existingGame = loadGame('odd-one-in');
    if (existingGame && existingGame.gameId === gameState.gameId) {
        gameState = existingGame;
    }

    // Check if name already exists in approved or pending players
    const allPlayers = [...gameState.players, ...gameState.pendingPlayers];
    if (allPlayers.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('This name is already in use! Please choose another one.');
        if (btn) btn.disabled = false;
        return;
    }

    // Set local state
    currentUserName = name;
    localPlayerId = generateId();
    isLocalGM = false;

    const player = { id: localPlayerId, name: name, isGM: false, isEliminated: false };

    // Add to pending players for GM approval
    gameState.pendingPlayers.push(player);

    saveGame('odd-one-in', gameState);

    // Show waiting screen
    console.log('Waiting for GM approval...');
    showWaitingForApprovalScreen(name);

    setTimeout(() => { if (btn) btn.disabled = false; }, 1000);
}

function showWaitingForApprovalScreen(playerName) {
    const screen = document.getElementById('screen-waiting-approval');
    if (!screen) {
        // Create waiting screen if it doesn't exist
        const container = document.querySelector('.game-container');
        const waitingScreen = document.createElement('div');
        waitingScreen.id = 'screen-waiting-approval';
        waitingScreen.className = 'screen hidden';
        waitingScreen.innerHTML = `
            <div class="screen-header">
                <img src="../images/Odd One In Logo.png" alt="Odd One In" class="game-logo-lobby">
                <h1>Odd One In</h1>
                <p class="subtitle">Waiting for approval...</p>
            </div>
            <div class="content-card">
                <div style="text-align: center; padding: var(--spacing-xl);">
                    <div style="font-size: 4rem; margin-bottom: var(--spacing-lg);">⏳</div>
                    <h2 style="color: var(--blue-800); margin-bottom: var(--spacing-md);">Waiting for Game Master</h2>
                    <p style="color: var(--blue-600); font-size: 1.1rem;" id="waiting-player-name-display"></p>
                    <p style="color: var(--blue-500); margin-top: var(--spacing-lg);">The Game Master will approve your request shortly...</p>
                </div>
            </div>
        `;
        container.appendChild(waitingScreen);
    }

    document.getElementById('waiting-player-name-display').textContent = `Hi ${playerName}!`;
    showScreen('screen-waiting-approval');
}

function approvePlayer(playerId) {
    if (!isLocalGM) return;

    const pendingPlayer = gameState.pendingPlayers.find(p => p.id === playerId);
    if (pendingPlayer) {
        // Move from pending to approved
        gameState.pendingPlayers = gameState.pendingPlayers.filter(p => p.id !== playerId);
        gameState.players.push(pendingPlayer);

        saveGame('odd-one-in', gameState);
        updateLobbyView();
    }
}

function rejectPlayer(playerId) {
    if (!isLocalGM) return;

    gameState.pendingPlayers = gameState.pendingPlayers.filter(p => p.id !== playerId);
    saveGame('odd-one-in', gameState);
    updateLobbyView();
}

function updateLobbyView() {
    const containerGM = document.getElementById('players-container-gm');
    const containerPlayer = document.getElementById('players-container-player');
    const countGM = document.getElementById('player-count-gm');
    const pendingContainer = document.getElementById('pending-players-container');

    if (countGM) countGM.textContent = gameState.players.length;

    const renderPlayer = (player, isPending = false) => {
        const isSelf = player.id === localPlayerId;
        const item = createElement('div', {
            classes: ['lobby-player-card', player.isGM ? 'gm-card' : '', isPending ? 'pending-card' : '']
        });

        if (isPending && isLocalGM) {
            item.innerHTML = `
                <div class="player-avatar" style="background: #F59E0B;">
                    ${player.name.charAt(0).toUpperCase()}
                </div>
                <div class="player-details" style="flex: 1;">
                    <span class="p-name" style="color: #1E3A8A; font-weight: 700;">${player.name}</span>
                    <span style="font-size: 0.75rem; color: #F59E0B;">Waiting for approval</span>
                </div>
                <button class="btn btn-sm" style="background: #10B981; color: white; padding: 8px 12px; margin-right: 4px;" onclick="approvePlayer('${player.id}')">✓ Approve</button>
                <button class="remove-p-btn" title="Reject" onclick="rejectPlayer('${player.id}')">✕</button>
            `;
        } else {
            item.innerHTML = `
                <div class="player-avatar">
                    ${player.name.charAt(0).toUpperCase()}
                </div>
                <div class="player-details" style="flex: 1; display: flex; align-items: center; gap: 8px;">
                    <span class="p-name" style="color: #1E3A8A; font-weight: 700;">${player.isGM ? '👑 ' : ''}${player.name} ${isSelf ? '(You)' : ''}</span>
                </div>
                ${isLocalGM && !player.isGM ? `<button class="remove-p-btn" title="Remove Player" onclick="removePlayer('${player.id}')">✕</button>` : ''}
            `;
        }
        return item;
    };

    const playersSorted = [...gameState.players].sort((a, b) => (b.isGM ? 1 : 0) - (a.isGM ? 1 : 0));

    if (containerGM) {
        containerGM.innerHTML = '';
        playersSorted.forEach(p => containerGM.appendChild(renderPlayer(p)));

        const startBtn = document.getElementById('start-game-btn-gm');
        if (startBtn) startBtn.disabled = gameState.players.length < 3;
    }

    // Show pending players section for GM
    if (pendingContainer && isLocalGM) {
        if (gameState.pendingPlayers.length > 0) {
            pendingContainer.innerHTML = '<h3 style="color: var(--blue-800); margin-bottom: var(--spacing-md);">⏳ Pending Approvals</h3>';
            gameState.pendingPlayers.forEach(p => {
                pendingContainer.appendChild(renderPlayer(p, true));
            });
            pendingContainer.style.display = 'block';
        } else {
            pendingContainer.style.display = 'none';
        }
    }

    if (containerPlayer) {
        containerPlayer.innerHTML = '';
        playersSorted.forEach(p => containerPlayer.appendChild(renderPlayer(p)));
    }
}

function removePlayer(id) {
    if (!isLocalGM) return;

    gameState.players = gameState.players.filter(p => p.id !== id);
    saveGame('odd-one-in', gameState);
    updateLobbyView();
}

// ================================
// INVITE & SHARING
// ================================

function getInviteLink() {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?join=${gameState.gameId}`;
}

function copyInviteLink() {
    const link = getInviteLink();
    navigator.clipboard.writeText(link).then(() => {
        const btn = document.getElementById('copy-link-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => { btn.textContent = originalText; }, 2000);
    });
}

function shareOnWhatsApp() {
    const link = getInviteLink();
    const message = `Join my Odd One In game! ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// ================================
// GAME FLOW - PLAYING
// ================================

function startGame() {
    if (!isLocalGM) return;
    if (gameState.players.length < 3) return;

    gameState.currentRound = 1;
    gameState.answers = [];
    gameState.currentPlayerIndex = 0;
    gameState.isStarted = true;

    selectQuestion();
    saveGame('odd-one-in', gameState);

    showScreen('screen-playing');
    const gmControls = document.getElementById('gm-controls');
    if (gmControls) gmControls.style.display = isLocalGM ? 'flex' : 'none';

    startAnswerCollection();
}

function selectQuestion() {
    if (!gameState.allQuestions || !gameState.allQuestions.oddOneIn) return;

    const available = gameState.allQuestions.oddOneIn.filter(q => !gameState.usedQuestions.has(q));
    if (available.length === 0) {
        gameState.usedQuestions.clear();
        return selectQuestion();
    }

    gameState.currentQuestion = getRandomItem(available);
    gameState.usedQuestions.add(gameState.currentQuestion);
}

function startAnswerCollection() {
    gameState.currentPlayerIndex = 0;
    gameState.answers = [];
    collectNextAnswer();
}

function collectNextAnswer() {
    const activePlayers = gameState.players.filter(p => !p.isEliminated);

    if (gameState.currentPlayerIndex >= activePlayers.length) {
        showJudgingScreen();
        return;
    }

    const currentPlayer = activePlayers[gameState.currentPlayerIndex];
    const isMyTurn = currentPlayer.id === localPlayerId;

    document.getElementById('question-text').textContent = gameState.currentQuestion;
    document.getElementById('current-player-name').textContent = currentPlayer.name;

    const answerSection = document.getElementById('answer-section');
    const waitingSection = document.getElementById('waiting-section');

    if (isMyTurn) {
        showElement(answerSection);
        hideElement(waitingSection);
        document.getElementById('answer-input').value = '';
        document.getElementById('answer-input').focus();
        startTimer();
    } else {
        hideElement(answerSection);
        showElement(waitingSection);
        document.getElementById('waiting-player-name').textContent = currentPlayer.name;
        startTimer();
    }
}

function submitAnswer() {
    const input = document.getElementById('answer-input');
    const answer = input.value.trim();

    if (!answer) {
        shakeElement(input);
        return;
    }

    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    const currentPlayer = activePlayers[gameState.currentPlayerIndex];

    gameState.answers.push({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        answer: answer
    });

    stopTimer();
    gameState.currentPlayerIndex++;
    saveGame('odd-one-in', gameState);

    collectNextAnswer();
}

function skipPlayer() {
    if (!isLocalGM) return;

    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    const currentPlayer = activePlayers[gameState.currentPlayerIndex];

    gameState.answers.push({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        answer: '(Skipped)'
    });

    stopTimer();
    gameState.currentPlayerIndex++;
    saveGame('odd-one-in', gameState);

    collectNextAnswer();
}

// ================================
// TIMER
// ================================

function startTimer() {
    stopTimer();
    gameState.timerState.remaining = 10;
    gameState.timerState.isPaused = false;
    updateTimerDisplay();

    gameTimer = setInterval(() => {
        if (!gameState.timerState.isPaused) {
            gameState.timerState.remaining--;
            updateTimerDisplay();

            if (gameState.timerState.remaining <= 0) {
                stopTimer();
                skipPlayer();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

function pauseTimer() {
    if (!isLocalGM) return;

    gameState.timerState.isPaused = !gameState.timerState.isPaused;
    const btn = document.getElementById('pause-timer-btn');
    btn.textContent = gameState.timerState.isPaused ? 'Resume' : 'Pause';
}

function resetTimer() {
    if (!isLocalGM) return;

    gameState.timerState.remaining = 10;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (display) {
        display.textContent = gameState.timerState.remaining;
        if (gameState.timerState.remaining <= 3) {
            display.style.color = '#EF4444';
        } else {
            display.style.color = '#1E3A8A';
        }
    }
}

// ================================
// JUDGING
// ================================

function showJudgingScreen() {
    showScreen('screen-judging');

    const container = document.getElementById('answers-container');
    container.innerHTML = '';

    const sortedAnswers = [...gameState.answers].sort((a, b) =>
        a.answer.localeCompare(b.answer)
    );

    sortedAnswers.forEach(item => {
        const card = createElement('div', { classes: ['answer-card'] });
        card.innerHTML = `
            <div class="answer-text">"${item.answer}"</div>
            <div class="answer-player">— ${item.playerName}</div>
            ${isLocalGM ? `<button class="btn btn-danger btn-sm" onclick="eliminatePlayer('${item.playerId}')">Eliminate</button>` : ''}
        `;
        container.appendChild(card);
    });
}

function eliminatePlayer(playerId) {
    if (!isLocalGM) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (player) {
        player.isEliminated = true;
        saveGame('odd-one-in', gameState);
        showJudgingScreen();
    }
}

function nextRound() {
    if (!isLocalGM) return;

    const activePlayers = gameState.players.filter(p => !p.isEliminated);

    if (activePlayers.length === 1) {
        showWinner(activePlayers[0]);
        return;
    }

    gameState.currentRound++;
    selectQuestion();
    saveGame('odd-one-in', gameState);

    showScreen('screen-playing');
    startAnswerCollection();
}

// ================================
// WINNER
// ================================

function showWinner(winner) {
    showScreen('screen-winner');
    document.getElementById('winner-name').textContent = winner.name;
    showConfetti();
}

function playAgain() {
    if (!isLocalGM) return;

    gameState.players.forEach(p => p.isEliminated = false);
    gameState.currentRound = 1;
    gameState.answers = [];
    gameState.usedQuestions.clear();
    gameState.isStarted = false;
    saveGame('odd-one-in', gameState);

    if (isLocalGM) {
        showScreen('screen-lobby-gm');
    } else {
        showScreen('screen-lobby-player');
    }
    updateLobbyView();
}
