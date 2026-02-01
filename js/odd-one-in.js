// ================================
// ODD ONE IN - GAME LOGIC
// ================================

// Game State
let gameState = {
    gameId: null,
    gm: null,
    players: [],
    currentRound: 1,
    currentQuestion: '',
    currentPlayerIndex: 0,
    timerState: {
        remaining: 10,
        isPaused: false
    },
    answers: [],
    allQuestions: null,
    usedQuestions: new Set(),
    isGM: false // Tracks if current user is the GM
};

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
        // Try to load existing game state if it exists in local storage
        const existingGame = loadGame('odd-one-in');
        if (existingGame && existingGame.gameId === joinCode) {
            gameState = existingGame;
            console.log('Joined existing game found in local storage');
        } else {
            gameState.gameId = joinCode;
        }

        // Hide "Back to Home" on entry screen if joining via link
        const backHomeBtn = document.getElementById('entry-back-home');
        if (backHomeBtn) backHomeBtn.classList.add('hidden');
        const joinBackHomeBtn = document.getElementById('join-back-home');
        if (joinBackHomeBtn) joinBackHomeBtn.classList.add('hidden');

        // Change screen to "Join" context
        showScreen('screen-player-join');
    } else {
        showScreen('screen-entry');
    }

    // Add storage event listener to sync tabs on same machine
    window.addEventListener('storage', (e) => {
        if (e.key === 'meenit-odd-one-in') {
            const updated = JSON.parse(e.newValue);
            if (updated && updated.gameId === gameState.gameId) {
                gameState = updated;
                updateLobbyView();

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

    // Screen: Lobby GM
    document.getElementById('share-whatsapp-btn').addEventListener('click', shareOnWhatsApp);
    document.getElementById('copy-link-btn').addEventListener('click', copyInviteLink);
    document.getElementById('start-game-btn-gm').addEventListener('click', startGame);

    // Screen: Player Join
    document.getElementById('join-game-btn').addEventListener('click', joinGame);
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // Screen: Playing
    document.getElementById('pause-timer-btn').addEventListener('click', toggleTimer);
    document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
    document.getElementById('edit-question-btn').addEventListener('click', showEditQuestionModal);
    document.getElementById('skip-question-btn').addEventListener('click', skipQuestion);
    document.getElementById('submit-answer-btn').addEventListener('click', submitAnswer);
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    // Screen: Judging
    document.getElementById('next-round-btn').addEventListener('click', nextRound);

    // Screen: Winner
    document.getElementById('play-again-btn').addEventListener('click', playAgain);

    // Edit Question Modal
    document.getElementById('save-question-btn').addEventListener('click', saveEditedQuestion);
    document.getElementById('cancel-edit-btn').addEventListener('click', hideEditQuestionModal);
}

// ================================
// SCREEN NAVIGATION
// ================================

function showScreen(screenId) {
    const screens = [
        'screen-entry', 'screen-lobby-gm', 'screen-lobby-player',
        'screen-player-join', 'screen-playing', 'screen-judging',
        'screen-winner', 'screen-spectator'
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
    const name = document.getElementById('entry-name').value.trim();
    if (!name) {
        shakeElement(document.getElementById('entry-name'));
        return;
    }

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    gameState.gm = { id: generateId(), name: name, isGM: true };
    gameState.players = [gameState.gm];
    gameState.isGM = true;

    saveGame('odd-one-in', gameState);
    updateLobbyView();
    showScreen('screen-lobby-gm');
}

function joinGame() {
    console.log('Join Game clicked');
    const input = document.getElementById('player-name');
    const name = input ? input.value.trim() : '';

    if (!name) {
        console.warn('Empty name, shaking input');
        if (input) shakeElement(input);
        return;
    }

    // Load latest state before performing join to avoid overwriting
    const existingGame = loadGame('odd-one-in');
    if (existingGame && existingGame.gameId === gameState.gameId) {
        gameState = existingGame;
    }

    // Prevent joining if name already exists
    if (gameState.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('This name is already in the game! Please choose another one.');
        return;
    }

    console.log(`Joining as: ${name}`);
    const player = { id: generateId(), name: name, isGM: false, isEliminated: false };
    gameState.players.push(player);
    gameState.isGM = false;

    saveGame('odd-one-in', gameState);
    updateLobbyView();
    showScreen('screen-lobby-player');
}

function simulatePlayersJoining() {
    const demoNames = ['Ali', 'Simran', 'Rahul'];
    let delay = 1000;
    demoNames.forEach(name => {
        setTimeout(() => {
            if (gameState.players.some(p => p.name === name)) return;
            gameState.players.push({ id: generateId(), name: name, isGM: false });
            updateLobbyView();
        }, delay);
        delay += 1000;
    });
}

function updateLobbyView() {
    const containerGM = document.getElementById('players-container-gm');
    const containerPlayer = document.getElementById('players-container-player');
    const countGM = document.getElementById('player-count-gm');

    if (countGM) countGM.textContent = gameState.players.length;

    const renderPlayer = (player) => {
        const nameInput = document.getElementById('player-name') || document.getElementById('entry-name');
        const currentUserName = nameInput ? nameInput.value.trim() : '';
        const isSelf = (gameState.isGM && player.isGM) || (!gameState.isGM && player.name === currentUserName);
        const item = createElement('div', {
            classes: ['lobby-player-card', player.isGM ? 'gm-card' : '']
        });

        item.innerHTML = `
            <div class="player-avatar">
                ${player.isGM ? '👑' : player.name.charAt(0).toUpperCase()}
            </div>
            <div class="player-details">
                <span class="p-name">${player.name} ${isSelf ? '(You)' : ''}</span>
                ${player.isGM ? '<span class="p-role">Game Master</span>' : ''}
            </div>
            ${gameState.isGM && !player.isGM ? `<button class="remove-p-btn" onclick="removePlayer('${player.id}')">✕</button>` : ''}
        `;
        return item;
    };

    if (containerGM) {
        containerGM.innerHTML = '';
        gameState.players.forEach(p => containerGM.appendChild(renderPlayer(p)));
        // Enable start button if at least 3 players
        document.getElementById('start-game-btn-gm').disabled = gameState.players.length < 3;
    }

    if (containerPlayer) {
        containerPlayer.innerHTML = '';
        gameState.players.forEach(p => containerPlayer.appendChild(renderPlayer(p)));
    }
}

function removePlayer(id) {
    gameState.players = gameState.players.filter(p => p.id !== id);
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
        const oldText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => btn.textContent = oldText, 2000);
    });
}

function shareOnWhatsApp() {
    const link = getInviteLink();
    const text = encodeURIComponent(`Join my Odd One In game on Meenit's Playground! 🎮✨\n\nClick here to play: ${link}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
}

// ================================
// GAMEPLAY LOGIC
// ================================

function startGame() {
    if (gameState.players.length < 3) return;

    gameState.currentRound = 1;
    gameState.answers = [];
    gameState.currentPlayerIndex = 0;
    gameState.isStarted = true; // Mark game as started for syncing tabs

    selectQuestion();
    saveGame('odd-one-in', gameState);

    showScreen('screen-playing');
    // Hide GM controls if not GM
    const gmControls = document.getElementById('gm-controls');
    if (gmControls) gmControls.style.display = gameState.isGM ? 'flex' : 'none';

    startAnswerCollection();
}

function selectQuestion() {
    if (!gameState.allQuestions) return;
    const playerCount = gameState.players.filter(p => !p.isEliminated).length;
    let tier = playerCount >= 10 ? 'tier1_broad' : (playerCount >= 5 ? 'tier2_medium' : 'tier3_narrow');
    const questions = gameState.allQuestions[tier].questions;
    let available = questions.filter(q => !gameState.usedQuestions.has(q));
    if (available.length === 0) { gameState.usedQuestions.clear(); available = questions; }
    gameState.currentQuestion = getRandomItem(available);
    gameState.usedQuestions.add(gameState.currentQuestion);
}

function startAnswerCollection() {
    gameState.answers = [];
    gameState.currentPlayerIndex = 0;
    updateGameHeader();
    document.getElementById('question-text').textContent = gameState.currentQuestion;
    showNextPlayerTurn();
    startTimer();
}

function showNextPlayerTurn() {
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    if (gameState.currentPlayerIndex >= alivePlayers.length) {
        stopTimer();
        showScreen('screen-judging');
        displayAnswersForJudging();
        return;
    }

    const currentPlayer = alivePlayers[gameState.currentPlayerIndex];
    document.getElementById('player-name-turn').textContent = currentPlayer.name;
    document.getElementById('answer-input').value = '';

    // In a real app, only the current player would see the input.
    // For local pass-phone style, we show it to whoever has the phone.
}

function submitAnswer() {
    const input = document.getElementById('answer-input');
    const answer = input.value.trim();
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const currentPlayer = alivePlayers[gameState.currentPlayerIndex];

    gameState.answers.push({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        answer: answer || '(no answer)'
    });

    gameState.currentPlayerIndex++;
    if (gameState.currentPlayerIndex >= alivePlayers.length) {
        stopTimer();
        showScreen('screen-judging');
        displayAnswersForJudging();
    } else {
        showNextPlayerTurn();
        resetTimer();
    }
}

// ================================
// TIMER & UTILS
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
            if (gameState.timerState.remaining <= 0) { stopTimer(); submitAnswer(); }
        }
    }, 1000);
}

function stopTimer() { if (gameTimer) clearInterval(gameTimer); }
function resetTimer() { gameState.timerState.remaining = 10; updateTimerDisplay(); }
function toggleTimer() {
    gameState.timerState.isPaused = !gameState.timerState.isPaused;
    document.getElementById('pause-timer-btn').textContent = gameState.timerState.isPaused ? '▶️ Resume' : '⏸️ Pause';
}
function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const border = document.getElementById('timer-circle');
    display.textContent = gameState.timerState.remaining;
    if (gameState.timerState.remaining <= 3) border.classList.add('warning');
    else border.classList.remove('warning');
}

function displayAnswersForJudging() {
    document.getElementById('judging-question').textContent = gameState.currentQuestion;
    const container = document.getElementById('answers-container');
    container.innerHTML = '';

    const sorted = sortAlphabetically(gameState.answers.map(a => a.answer), true);
    const sortedObjs = sorted.map(ans => gameState.answers.find(a => a.answer === ans));

    sortedObjs.forEach(ansObj => {
        const player = gameState.players.find(p => p.id === ansObj.playerId);
        const div = createElement('div', { classes: ['answer-item', !ansObj.answer || ansObj.answer === '(no answer)' ? 'blank' : ''] });
        div.innerHTML = `
            <div class="answer-info">
                <div class="answer-text">${ansObj.answer}</div>
                <div class="player-label">by ${ansObj.playerName}</div>
            </div>
            ${gameState.isGM ? `<button class="eliminate-btn" onclick="eliminatePlayer('${ansObj.playerId}')">Eliminate</button>` : ''}
        `;
        container.appendChild(div);
    });
}

function eliminatePlayer(id) {
    const player = gameState.players.find(p => p.id === id);
    if (!confirm(`Eliminate ${player.name}?`)) return;
    player.isEliminated = true;
    const alive = gameState.players.filter(p => !p.isEliminated);
    if (alive.length === 1) showWinner(alive[0]);
    else displayAnswersForJudging();
}

function nextRound() {
    gameState.currentRound++;
    selectQuestion();
    showScreen('screen-playing');
    startAnswerCollection();
}

function showWinner(winner) {
    document.getElementById('winner-name').textContent = winner.name;
    showScreen('screen-winner');
    showConfetti(document.getElementById('confetti-container'), 100);
}

function playAgain() { location.reload(); }
function updateGameHeader() {
    const alive = gameState.players.filter(p => !p.isEliminated).length;
    document.getElementById('current-round').textContent = gameState.currentRound;
    document.getElementById('alive-players').textContent = alive;
}

function showEditQuestionModal() {
    document.getElementById('edit-question-input').value = gameState.currentQuestion;
    document.getElementById('edit-question-modal').classList.remove('hidden');
}
function hideEditQuestionModal() { document.getElementById('edit-question-modal').classList.add('hidden'); }
function saveEditedQuestion() {
    const val = document.getElementById('edit-question-input').value.trim();
    if (!val) return;
    gameState.currentQuestion = val;
    document.getElementById('question-text').textContent = val;
    hideEditQuestionModal();
}
function skipQuestion() { selectQuestion(); document.getElementById('question-text').textContent = gameState.currentQuestion; }
