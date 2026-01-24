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
    usedQuestions: new Set()
};

let gameTimer = null;

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    setupEventListeners();
    checkExistingGame();
});

// Load questions from JSON
async function loadQuestions() {
    try {
        const response = await fetch('../questions.json');
        const data = await response.json();
        gameState.allQuestions = data;
        console.log('Questions loaded:', data);
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please refresh the page.');
    }
}

// Check for existing game in localStorage
function checkExistingGame() {
    const savedGame = loadGame('odd-one-in');
    if (savedGame) {
        const resume = confirm('Found an existing game. Do you want to resume it?');
        if (resume) {
            gameState = savedGame;
            // Resume appropriate screen
            if (gameState.currentQuestion && gameState.answers.length < gameState.players.length) {
                showScreen('screen-playing');
                startAnswerCollection();
            } else if (gameState.answers.length === gameState.players.length) {
                showScreen('screen-judging');
                displayAnswersForJudging();
            } else {
                showScreen('screen-lobby');
                displayPlayers();
            }
        } else {
            clearGame('odd-one-in');
        }
    }
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // Screen 1: GM Entry
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('gm-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createRoom();
    });

    // Screen 2: Lobby
    document.getElementById('add-player-btn').addEventListener('click', () => showScreen('screen-player-join'));
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('cancel-game-btn').addEventListener('click', cancelGame);
    document.getElementById('copy-code-btn').addEventListener('click', copyRoomCode);

    // Screen 3: Player Join
    document.getElementById('join-game-btn').addEventListener('click', addPlayer);
    document.getElementById('back-to-lobby-btn').addEventListener('click', () => {
        showScreen('screen-lobby');
        displayPlayers();
    });
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });

    // Screen 4: Playing
    document.getElementById('pause-timer-btn').addEventListener('click', toggleTimer);
    document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
    document.getElementById('edit-question-btn').addEventListener('click', showEditQuestionModal);
    document.getElementById('skip-question-btn').addEventListener('click', skipQuestion);
    document.getElementById('submit-answer-btn').addEventListener('click', submitAnswer);
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    // Screen 5: Judging
    document.getElementById('next-round-btn').addEventListener('click', nextRound);

    // Screen 6: Winner
    document.getElementById('play-again-btn').addEventListener('click', playAgain);

    // Edit Question Modal
    document.getElementById('save-question-btn').addEventListener('click', saveEditedQuestion);
    document.getElementById('cancel-edit-btn').addEventListener('click', hideEditQuestionModal);
    document.getElementById('edit-question-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEditedQuestion();
    });
}

// ================================
// SCREEN NAVIGATION
// ================================

function showScreen(screenId) {
    const screens = ['screen-gm-entry', 'screen-lobby', 'screen-player-join', 'screen-playing', 'screen-judging', 'screen-winner', 'screen-spectator'];
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (id === screenId) {
            screen.classList.remove('hidden');
            screen.classList.add('animate-fadeIn');
        } else {
            screen.classList.add('hidden');
        }
    });
}

// ================================
// GAME FLOW
// ================================

function createRoom() {
    const gmName = document.getElementById('gm-name').value.trim();

    if (!gmName) {
        shakeElement(document.getElementById('gm-name'));
        return;
    }

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    gameState.gm = {
        id: generateId(),
        name: gmName,
        isEliminated: false
    };
    gameState.players = [gameState.gm];

    document.getElementById('room-code').textContent = gameState.gameId;
    saveGame('odd-one-in', gameState);

    showScreen('screen-lobby');
    displayPlayers();
}

function copyRoomCode() {
    const code = gameState.gameId;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

function addPlayer() {
    const playerName = document.getElementById('player-name').value.trim();

    if (!playerName) {
        shakeElement(document.getElementById('player-name'));
        return;
    }

    // Check for duplicate names
    if (gameState.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
        alert('This name is already taken. Please choose a different name.');
        shakeElement(document.getElementById('player-name'));
        return;
    }

    const player = {
        id: generateId(),
        name: playerName,
        isEliminated: false
    };

    gameState.players.push(player);
    document.getElementById('player-name').value = '';

    saveGame('odd-one-in', gameState);
    showScreen('screen-lobby');
    displayPlayers();
}

function removePlayer(playerId) {
    // Prevent removing GM
    if (playerId === gameState.gm.id) {
        alert('Cannot remove the Game Master!');
        return;
    }

    const confirmRemove = confirm('Remove this player?');
    if (!confirmRemove) return;

    gameState.players = gameState.players.filter(p => p.id !== playerId);
    saveGame('odd-one-in', gameState);
    displayPlayers();
}

function displayPlayers() {
    const container = document.getElementById('players-container');
    const countElement = document.getElementById('player-count');

    countElement.textContent = gameState.players.length;
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const isGM = player.id === gameState.gm.id;
        const playerDiv = createElement('div', {
            classes: ['player-item', isGM ? 'is-gm' : '']
        });

        const initial = player.name.charAt(0).toUpperCase();

        playerDiv.innerHTML = `
      <div class="player-info">
        <div class="player-icon">${initial}</div>
        <div class="player-name">${player.name}</div>
        ${isGM ? '<span class="gm-badge">GM</span>' : ''}
      </div>
      ${!isGM ? `<button class="remove-btn" data-player-id="${player.id}">✕</button>` : ''}
    `;

        if (!isGM) {
            playerDiv.querySelector('.remove-btn').addEventListener('click', (e) => {
                removePlayer(e.target.dataset.playerId);
            });
        }

        container.appendChild(playerDiv);
    });

    // Update start button state
    const startBtn = document.getElementById('start-game-btn');
    startBtn.disabled = gameState.players.length < 3;
}

function startGame() {
    if (gameState.players.length < 3) {
        alert('Need at least 3 players to start!');
        return;
    }

    gameState.currentRound = 1;
    gameState.answers = [];
    gameState.currentPlayerIndex = 0;

    selectQuestion();
    saveGame('odd-one-in', gameState);

    showScreen('screen-playing');
    startAnswerCollection();
}

function selectQuestion() {
    if (!gameState.allQuestions) {
        alert('Questions not loaded yet. Please wait...');
        return;
    }

    const playerCount = gameState.players.filter(p => !p.isEliminated).length;

    // Determine tier based on player count
    let tier;
    if (playerCount >= 10) {
        tier = 'tier1_broad';
    } else if (playerCount >= 5) {
        tier = 'tier2_medium';
    } else {
        tier = 'tier3_narrow';
    }

    const questions = gameState.allQuestions[tier].questions;

    // Get unused question
    let availableQuestions = questions.filter(q => !gameState.usedQuestions.has(q));

    // If all used, reset
    if (availableQuestions.length === 0) {
        gameState.usedQuestions.clear();
        availableQuestions = questions;
    }

    gameState.currentQuestion = getRandomItem(availableQuestions);
    gameState.usedQuestions.add(gameState.currentQuestion);
}

function skipQuestion() {
    if (!confirm('Skip this question and get a new one?')) return;

    selectQuestion();
    document.getElementById('question-text').textContent = gameState.currentQuestion;
    saveGame('odd-one-in', gameState);
    resetTimer();
}

// ================================
// ANSWER COLLECTION
// ================================

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
        // All answers collected
        stopTimer();
        showScreen('screen-judging');
        displayAnswersForJudging();
        return;
    }

    const currentPlayer = alivePlayers[gameState.currentPlayerIndex];
    document.getElementById('player-name-turn').textContent = currentPlayer.name;
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').focus();
}

function submitAnswer() {
    const answer = document.getElementById('answer-input').value.trim();
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const currentPlayer = alivePlayers[gameState.currentPlayerIndex];

    gameState.answers.push({
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        answer: answer || '(no answer)'
    });

    gameState.currentPlayerIndex++;
    saveGame('odd-one-in', gameState);

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
                submitAnswer(); // Auto-submit blank answer
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

function resetTimer() {
    gameState.timerState.remaining = 10;
    gameState.timerState.isPaused = false;
    updateTimerDisplay();
}

function toggleTimer() {
    gameState.timerState.isPaused = !gameState.timerState.isPaused;
    const btn = document.getElementById('pause-timer-btn');
    btn.textContent = gameState.timerState.isPaused ? '▶️ Resume' : '⏸️ Pause';
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    const circle = document.getElementById('timer-circle');

    display.textContent = gameState.timerState.remaining;

    if (gameState.timerState.remaining <= 3) {
        circle.classList.add('warning');
    } else {
        circle.classList.remove('warning');
    }
}

// ================================
// JUDGING PHASE
// ================================

function displayAnswersForJudging() {
    document.getElementById('judging-question').textContent = gameState.currentQuestion;

    const container = document.getElementById('answers-container');
    container.innerHTML = '';

    // Sort answers: blanks first, then alphabetically
    const sortedAnswers = sortAlphabetically(
        gameState.answers.map(a => a.answer),
        true
    );

    const sortedAnswerObjects = sortedAnswers.map(answer => {
        return gameState.answers.find(a => a.answer === answer);
    });

    sortedAnswerObjects.forEach((answerObj, index) => {
        const player = gameState.players.find(p => p.id === answerObj.playerId);
        const isBlank = !answerObj.answer || answerObj.answer === '(no answer)';

        const answerDiv = createElement('div', {
            classes: ['answer-item', isBlank ? 'blank' : '', player.isEliminated ? 'eliminated' : '']
        });

        answerDiv.style.animationDelay = `${index * 0.05}s`;

        answerDiv.innerHTML = `
      <div class="answer-info">
        <div>
          <div class="answer-text">${answerObj.answer}</div>
          <div class="player-label">by ${answerObj.playerName}</div>
        </div>
      </div>
      <button class="eliminate-btn" data-player-id="${answerObj.playerId}" ${player.isEliminated ? 'disabled' : ''}>
        ${player.isEliminated ? 'Eliminated' : 'Eliminate'}
      </button>
    `;

        if (!player.isEliminated) {
            answerDiv.querySelector('.eliminate-btn').addEventListener('click', (e) => {
                eliminatePlayer(e.target.dataset.playerId);
            });
        }

        container.appendChild(answerDiv);
    });
}

function eliminatePlayer(playerId) {
    const player = gameState.players.find(p => p.id === playerId);

    const confirmElim = confirm(`Eliminate ${player.name}?`);
    if (!confirmElim) return;

    player.isEliminated = true;
    saveGame('odd-one-in', gameState);

    // Check win condition
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    if (alivePlayers.length === 1) {
        showWinner(alivePlayers[0]);
    } else {
        displayAnswersForJudging();
    }
}

function nextRound() {
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);

    if (alivePlayers.length === 1) {
        showWinner(alivePlayers[0]);
        return;
    }

    gameState.currentRound++;
    gameState.answers = [];
    gameState.currentPlayerIndex = 0;

    selectQuestion();
    saveGame('odd-one-in', gameState);

    showScreen('screen-playing');
    startAnswerCollection();
}

// ================================
// WINNER
// ================================

function showWinner(winner) {
    document.getElementById('winner-name').textContent = winner.name;
    showScreen('screen-winner');

    // Show confetti
    const container = document.getElementById('confetti-container');
    showConfetti(container, 100);
}

function playAgain() {
    clearGame('odd-one-in');
    location.reload();
}

function cancelGame() {
    if (confirm('Cancel game and return to home?')) {
        clearGame('odd-one-in');
        window.location.href = '../index.html';
    }
}

// ================================
// EDIT QUESTION MODAL
// ================================

function showEditQuestionModal() {
    document.getElementById('edit-question-input').value = gameState.currentQuestion;
    document.getElementById('edit-question-modal').classList.remove('hidden');
}

function hideEditQuestionModal() {
    document.getElementById('edit-question-modal').classList.add('hidden');
}

function saveEditedQuestion() {
    const newQuestion = document.getElementById('edit-question-input').value.trim();

    if (!newQuestion) {
        shakeElement(document.getElementById('edit-question-input'));
        return;
    }

    gameState.currentQuestion = newQuestion;
    document.getElementById('question-text').textContent = newQuestion;
    saveGame('odd-one-in', gameState);

    hideEditQuestionModal();
    resetTimer();
}

// ================================
// UTILITY
// ================================

function updateGameHeader() {
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    document.getElementById('current-round').textContent = gameState.currentRound;
    document.getElementById('alive-players').textContent = alivePlayers.length;
}
