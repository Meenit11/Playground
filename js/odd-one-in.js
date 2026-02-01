// ================================
// ODD ONE IN - GAME LOGIC
// ================================

// Game State
let gameState = {
    gameId: null,
    gmId: null,
    players: [],
    currentRound: 1,
    currentQuestion: '',
    answers: [],
    allQuestions: null,
    usedQuestions: new Set(),
    isStarted: false,
    timerValue: 10,
    timerPaused: false,
    questionStartTime: null
};

// Local State
let isGM = false;
let localPlayerId = null;
let localPlayerName = '';
let timerInterval = null;
let questionDisplayTimeout = null;

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
        console.log('Questions loaded successfully');
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Check if joining via invite link
function checkInviteLink() {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');

    if (joinCode) {
        // Load existing game state
        const existingGame = loadGame('odd-one-in');
        if (existingGame && existingGame.gameId === joinCode) {
            gameState = existingGame;
        } else {
            gameState.gameId = joinCode;
        }

        showScreen('screen-player-join');
    } else {
        showScreen('screen-gm-create');
    }

    // Listen for storage changes (cross-tab sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'meenit-odd-one-in') {
            const updated = JSON.parse(e.newValue);
            if (updated && updated.gameId === gameState.gameId) {
                gameState = updated;
                updateUI();

                // Auto-start game for players
                if (gameState.isStarted && !isGM) {
                    const currentScreen = getCurrentScreen();
                    if (currentScreen === 'screen-player-lobby') {
                        startQuestionRound();
                    }
                }
            }
        }
    });
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    console.log('Setting up event listeners...');

    // GM Create Game
    const createBtn = document.getElementById('create-game-btn');
    const gmNameInput = document.getElementById('gm-name');

    if (createBtn) {
        createBtn.addEventListener('click', createGame);
        console.log('✓ Create game button listener added');
    } else {
        console.error('✗ Create game button not found!');
    }

    if (gmNameInput) {
        gmNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') createGame();
        });
        console.log('✓ GM name input listener added');
    }

    // Player Join
    document.getElementById('join-game-btn').addEventListener('click', joinGame);
    document.getElementById('player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinGame();
    });

    // GM Lobby
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('copy-link-btn').addEventListener('click', copyInviteLink);
    document.getElementById('share-whatsapp-btn').addEventListener('click', shareOnWhatsApp);
    document.getElementById('gm-back-home').addEventListener('click', gmBackToHome);

    // Question Round
    document.getElementById('submit-answer-btn').addEventListener('click', submitAnswer);
    document.getElementById('answer-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    // GM Controls
    document.getElementById('pause-timer-btn').addEventListener('click', togglePauseTimer);
    document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
    document.getElementById('skip-question-btn').addEventListener('click', skipQuestion);
    document.getElementById('edit-question-btn').addEventListener('click', showEditQuestionModal);

    // Elimination
    document.getElementById('eliminate-selected-btn').addEventListener('click', eliminateSelected);
    document.getElementById('next-round-no-elim-btn').addEventListener('click', nextRoundNoElimination);

    // Winner
    document.getElementById('play-again-btn').addEventListener('click', playAgain);

    // Edit Question Modal
    document.getElementById('save-question-btn').addEventListener('click', saveEditedQuestion);
    document.getElementById('cancel-edit-btn').addEventListener('click', hideEditQuestionModal);
}

// ================================
// SCREEN MANAGEMENT
// ================================

function showScreen(screenId) {
    const screens = [
        'screen-gm-create', 'screen-gm-lobby', 'screen-player-join',
        'screen-player-lobby', 'screen-question', 'screen-review', 'screen-winner'
    ];

    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            screen.classList.toggle('hidden', id !== screenId);
        }
    });
}

function getCurrentScreen() {
    const screens = [
        'screen-gm-create', 'screen-gm-lobby', 'screen-player-join',
        'screen-player-lobby', 'screen-question', 'screen-review', 'screen-winner'
    ];

    return screens.find(id => !document.getElementById(id).classList.contains('hidden'));
}

// ================================
// GAME CREATION & JOINING
// ================================

function createGame() {
    console.log('=== CREATE GAME CLICKED ===');
    const btn = document.getElementById('create-game-btn');
    const nameInput = document.getElementById('gm-name');
    const name = nameInput.value.trim();

    console.log('GM Name:', name);

    if (!name) {
        console.log('No name entered');
        shakeElement(nameInput);
        return;
    }

    // Disable button
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating...';
    }

    // Initialize game
    isGM = true;
    localPlayerId = generateId();
    localPlayerName = name;

    console.log('Generated Player ID:', localPlayerId);

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    gameState.gmId = localPlayerId;
    gameState.players = [{
        id: localPlayerId,
        name: name,
        isGM: true,
        isEliminated: false
    }];
    gameState.isStarted = false;

    console.log('Game State:', gameState);

    saveGame('odd-one-in', gameState);
    updateLobby();

    console.log('Switching to GM lobby screen...');
    showScreen('screen-gm-lobby');

    // Re-enable button
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Create Game';
    }
}

function joinGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();

    if (!name) {
        shakeElement(nameInput);
        return;
    }

    // Load latest state
    const latestState = loadGame('odd-one-in');
    if (latestState && latestState.gameId === gameState.gameId) {
        gameState = latestState;
    }

    // Check for duplicate names
    if (gameState.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('This name is already taken. Please choose another name.');
        return;
    }

    // Add player
    isGM = false;
    localPlayerId = generateId();
    localPlayerName = name;

    gameState.players.push({
        id: localPlayerId,
        name: name,
        isGM: false,
        isEliminated: false
    });

    saveGame('odd-one-in', gameState);
    updateLobby();
    showScreen('screen-player-lobby');
}

function gmBackToHome(e) {
    e.preventDefault();

    if (confirm('Are you sure? This will end the game for all players.')) {
        // Clear game state
        localStorage.removeItem('meenit-odd-one-in');
        window.location.href = '../index.html';
    }
}

// ================================
// LOBBY MANAGEMENT
// ================================

function updateLobby() {
    // Update player count
    const countElements = ['player-count', 'player-count-view'];
    countElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = gameState.players.length;
    });

    // Update player lists
    updatePlayerList('players-list', true);  // GM view with remove buttons
    updatePlayerList('players-list-view', false);  // Player view

    // Enable/disable start button
    const startBtn = document.getElementById('start-game-btn');
    if (startBtn) {
        startBtn.disabled = gameState.players.length < 3;
    }
}

function updatePlayerList(containerId, showRemoveBtn) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Sort: GM first, then alphabetically
    const sortedPlayers = [...gameState.players].sort((a, b) => {
        if (a.isGM) return -1;
        if (b.isGM) return 1;
        return a.name.localeCompare(b.name);
    });

    sortedPlayers.forEach(player => {
        const card = createElement('div', { classes: ['player-card'] });

        const avatar = createElement('div', { classes: ['player-avatar'] });
        avatar.textContent = player.name.charAt(0).toUpperCase();

        const nameContainer = createElement('div', { classes: ['player-name'] });
        if (player.isGM) {
            const crown = createElement('span', { classes: ['player-crown'] });
            crown.textContent = '👑';
            nameContainer.appendChild(crown);
        }
        nameContainer.appendChild(document.createTextNode(player.name));
        if (player.id === localPlayerId) {
            nameContainer.appendChild(document.createTextNode(' (You)'));
        }

        card.appendChild(avatar);
        card.appendChild(nameContainer);

        // Add remove button for GM (except for GM themselves)
        if (showRemoveBtn && isGM && !player.isGM) {
            const removeBtn = createElement('button', { classes: ['remove-player-btn'] });
            removeBtn.textContent = '×';
            removeBtn.onclick = () => removePlayer(player.id);
            card.appendChild(removeBtn);
        }

        container.appendChild(card);
    });
}

function removePlayer(playerId) {
    if (!isGM) return;

    gameState.players = gameState.players.filter(p => p.id !== playerId);
    saveGame('odd-one-in', gameState);
    updateLobby();
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
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="icon">✓</span> Copied!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    });
}

function shareOnWhatsApp() {
    const link = getInviteLink();
    const message = `Join my Odd One In game! ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
}

// ================================
// GAME START
// ================================

function startGame() {
    if (!isGM || gameState.players.length < 3) return;

    gameState.isStarted = true;
    gameState.currentRound = 1;
    saveGame('odd-one-in', gameState);

    startQuestionRound();
}

function startQuestionRound() {
    // Select random question
    selectRandomQuestion();

    // Reset answers
    gameState.answers = [];
    gameState.timerValue = 10;
    gameState.timerPaused = false;

    showScreen('screen-question');

    // Display question
    document.getElementById('question-text').textContent = gameState.currentQuestion;

    // Show/hide sections based on player status
    const player = gameState.players.find(p => p.id === localPlayerId);
    const answerSection = document.getElementById('answer-section');
    const eliminatedMessage = document.getElementById('eliminated-message');
    const gmControls = document.getElementById('gm-controls');

    if (player && player.isEliminated) {
        answerSection.classList.add('hidden');
        eliminatedMessage.classList.remove('hidden');
    } else {
        answerSection.classList.remove('hidden');
        eliminatedMessage.classList.add('hidden');
        document.getElementById('answer-input').value = '';
    }

    gmControls.classList.toggle('hidden', !isGM);

    // Wait 3 seconds before starting timer
    gameState.questionStartTime = Date.now();
    document.getElementById('timer-display').textContent = '—';

    questionDisplayTimeout = setTimeout(() => {
        startTimer();
    }, 3000);
}

function selectRandomQuestion() {
    if (!gameState.allQuestions || !gameState.allQuestions.oddOneIn) {
        gameState.currentQuestion = 'What is your favorite color?';
        return;
    }

    const activePlayers = gameState.players.filter(p => !p.isEliminated).length;
    const questions = gameState.allQuestions.oddOneIn;

    // Filter available questions
    const available = questions.filter(q => !gameState.usedQuestions.has(q));

    if (available.length === 0) {
        // Reset if all questions used
        gameState.usedQuestions.clear();
        gameState.currentQuestion = getRandomItem(questions);
    } else {
        gameState.currentQuestion = getRandomItem(available);
    }

    gameState.usedQuestions.add(gameState.currentQuestion);
}

// ================================
// TIMER
// ================================

function startTimer() {
    stopTimer();

    gameState.timerValue = 10;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        if (!gameState.timerPaused) {
            gameState.timerValue--;
            updateTimerDisplay();

            if (gameState.timerValue <= 0) {
                stopTimer();
                endQuestionRound();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    if (questionDisplayTimeout) {
        clearTimeout(questionDisplayTimeout);
        questionDisplayTimeout = null;
    }
}

function updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    if (display) {
        display.textContent = gameState.timerValue;
        display.classList.toggle('warning', gameState.timerValue <= 3);
    }
}

function togglePauseTimer() {
    if (!isGM) return;

    gameState.timerPaused = !gameState.timerPaused;
    const btn = document.getElementById('pause-timer-btn');
    btn.textContent = gameState.timerPaused ? 'Resume Timer' : 'Pause Timer';
}

function resetTimer() {
    if (!isGM) return;

    gameState.timerValue = 10;
    updateTimerDisplay();
}

function skipQuestion() {
    if (!isGM) return;

    stopTimer();
    endQuestionRound();
}

// ================================
// ANSWER SUBMISSION
// ================================

function submitAnswer() {
    const input = document.getElementById('answer-input');
    const answer = input.value.trim();

    if (!answer) {
        shakeElement(input);
        return;
    }

    const player = gameState.players.find(p => p.id === localPlayerId);
    if (!player || player.isEliminated) return;

    // Check if already submitted
    if (gameState.answers.some(a => a.playerId === localPlayerId)) {
        alert('You have already submitted your answer!');
        return;
    }

    // Add answer
    gameState.answers.push({
        playerId: localPlayerId,
        playerName: localPlayerName,
        answer: answer
    });

    saveGame('odd-one-in', gameState);

    // Disable input
    input.disabled = true;
    document.getElementById('submit-answer-btn').disabled = true;
    document.getElementById('submit-answer-btn').textContent = '✓ Submitted';

    // Check if all active players have answered
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    if (gameState.answers.length >= activePlayers.length) {
        stopTimer();
        endQuestionRound();
    }
}

function endQuestionRound() {
    // Auto-submit blank answers for players who didn't answer
    const activePlayers = gameState.players.filter(p => !p.isEliminated);
    activePlayers.forEach(player => {
        if (!gameState.answers.some(a => a.playerId === player.id)) {
            gameState.answers.push({
                playerId: player.id,
                playerName: player.name,
                answer: ''
            });
        }
    });

    saveGame('odd-one-in', gameState);
    showAnswerReview();
}

// ================================
// ANSWER REVIEW
// ================================

function showAnswerReview() {
    showScreen('screen-review');

    const container = document.getElementById('answers-container');
    container.innerHTML = '';

    // Sort answers: blank first, then alphabetically
    const sortedAnswers = [...gameState.answers].sort((a, b) => {
        if (!a.answer && b.answer) return -1;
        if (a.answer && !b.answer) return 1;
        return a.answer.localeCompare(b.answer);
    });

    sortedAnswers.forEach(item => {
        const card = createElement('div', {
            classes: ['answer-card', item.answer ? '' : 'blank-answer']
        });

        if (isGM) {
            const checkbox = createElement('input', {
                classes: ['answer-checkbox'],
                attrs: { type: 'checkbox', 'data-player-id': item.playerId }
            });
            checkbox.addEventListener('change', () => {
                card.classList.toggle('selected', checkbox.checked);
            });
            card.appendChild(checkbox);
        }

        const content = createElement('div', { classes: ['answer-content'] });

        const text = createElement('div', { classes: ['answer-text'] });
        text.textContent = item.answer || '(No answer)';

        const player = createElement('div', { classes: ['answer-player'] });
        player.textContent = `— ${item.playerName}`;

        content.appendChild(text);
        content.appendChild(player);
        card.appendChild(content);

        if (isGM) {
            card.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        }

        container.appendChild(card);
    });

    // Show/hide elimination controls
    const eliminationControls = document.getElementById('elimination-controls');
    eliminationControls.classList.toggle('hidden', !isGM);
}

function eliminateSelected() {
    if (!isGM) return;

    const checkboxes = document.querySelectorAll('.answer-checkbox:checked');
    if (checkboxes.length === 0) {
        alert('Please select at least one player to eliminate.');
        return;
    }

    checkboxes.forEach(checkbox => {
        const playerId = checkbox.dataset.playerId;
        const player = gameState.players.find(p => p.id === playerId);
        if (player) {
            player.isEliminated = true;
        }
    });

    saveGame('odd-one-in', gameState);
    checkGameEnd();
}

function nextRoundNoElimination() {
    if (!isGM) return;

    checkGameEnd();
}

function checkGameEnd() {
    const activePlayers = gameState.players.filter(p => !p.isEliminated);

    if (activePlayers.length <= 2) {
        // Game over
        showWinner(activePlayers);
    } else {
        // Next round
        gameState.currentRound++;
        saveGame('odd-one-in', gameState);
        startQuestionRound();
    }
}

// ================================
// WINNER
// ================================

function showWinner(winners) {
    showScreen('screen-winner');

    const winnerNameEl = document.getElementById('winner-name');
    if (winners.length === 1) {
        winnerNameEl.textContent = winners[0].name;
    } else if (winners.length === 2) {
        winnerNameEl.textContent = `${winners[0].name} & ${winners[1].name}`;
    } else {
        winnerNameEl.textContent = 'Everyone!';
    }

    showConfetti();
}

function playAgain() {
    if (!isGM) return;

    // Reset game state
    gameState.players.forEach(p => p.isEliminated = false);
    gameState.currentRound = 1;
    gameState.answers = [];
    gameState.usedQuestions.clear();
    gameState.isStarted = false;

    saveGame('odd-one-in', gameState);

    if (isGM) {
        updateLobby();
        showScreen('screen-gm-lobby');
    } else {
        updateLobby();
        showScreen('screen-player-lobby');
    }
}

// ================================
// EDIT QUESTION
// ================================

function showEditQuestionModal() {
    if (!isGM) return;

    const modal = document.getElementById('edit-question-modal');
    const input = document.getElementById('edit-question-input');
    input.value = gameState.currentQuestion;
    modal.classList.remove('hidden');
}

function hideEditQuestionModal() {
    const modal = document.getElementById('edit-question-modal');
    modal.classList.add('hidden');
}

function saveEditedQuestion() {
    if (!isGM) return;

    const input = document.getElementById('edit-question-input');
    const newQuestion = input.value.trim();

    if (!newQuestion) {
        alert('Question cannot be empty!');
        return;
    }

    gameState.currentQuestion = newQuestion;
    document.getElementById('question-text').textContent = newQuestion;
    saveGame('odd-one-in', gameState);
    hideEditQuestionModal();
}

// ================================
// UI UPDATE
// ================================

function updateUI() {
    const currentScreen = getCurrentScreen();

    if (currentScreen === 'screen-gm-lobby' || currentScreen === 'screen-player-lobby') {
        updateLobby();
    } else if (currentScreen === 'screen-question') {
        // Update timer if synced
        updateTimerDisplay();
    } else if (currentScreen === 'screen-review') {
        showAnswerReview();
    }
}
