// ================================
// ODD ONE IN - GAME LOGIC
// ================================

// Shared Game Data (Sycned across tabs)
let gameState = {
    gameId: null,
    gmId: null,      // The ID of the Game Master
    players: [],     // List of all players including GM
    currentRound: 1,
    currentQuestion: '',
    answers: [],     // { playerId, playerName, answer }
    allQuestions: null,
    usedQuestions: new Set(),
    isStarted: false,

    // Timing
    timerState: 'idle', // idle, preview, running, paused, ended
    timerValue: 10,

    // Elimination
    eliminatedIds: []
};

// Local Tab State (NOT synced)
let isGM = false;
let localPlayerId = null;
let localPlayerName = '';

// Timers
let timerInterval = null;
let previewTimeout = null;

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    loadQuestions();
    setupEventListeners();
    checkInitialState();
});

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

function checkInitialState() {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');

    // Try to restore session first
    restoreLocalSession();

    if (joinCode) {
        // Player joining existing game
        const existing = loadGame('odd-one-in');
        if (existing && existing.gameId === joinCode) {
            gameState = existing;

            // If we have a local session but it doesn't match this game, clear it
            if (gameState.gameId !== joinCode) {
                clearLocalSession();
            }
        } else {
            // New joiner to this specific link
            gameState.gameId = joinCode;
        }

        // Show join screen if not already entered
        if (!localPlayerId) {
            showScreen('screen-player-join');
        } else {
            // Re-render based on current state
            updateUI();
        }
    } else {
        // No join link - start/continue flow
        const existing = loadGame('odd-one-in');
        if (existing && localPlayerId && existing.players.find(p => p.id === localPlayerId)) {
            // Returning user/GM
            gameState = existing;
            updateUI();
        } else {
            // Fresh start
            showScreen('screen-gm-create');
        }
    }

    // Storage listener for state sync (GM <-> Player tabs)
    window.addEventListener('storage', (e) => {
        if (e.key === 'meenit-odd-one-in') {
            const updated = JSON.parse(e.newValue);
            if (updated && updated.gameId === gameState.gameId) {
                // Check if we were removed
                if (localPlayerId && !updated.players.find(p => p.id === localPlayerId)) {
                    alert('You have been removed from the game.');
                    clearLocalSession();
                    window.location.href = '../index.html';
                    return;
                }

                gameState = updated;
                updateUI();
            }
        }
    });
}

function saveLocalSession() {
    const session = {
        isGM,
        localPlayerId,
        localPlayerName,
        gameId: gameState.gameId
    };
    localStorage.setItem('meenit-odd-one-in-session', JSON.stringify(session));
}

function restoreLocalSession() {
    try {
        const session = JSON.parse(localStorage.getItem('meenit-odd-one-in-session'));
        if (session) {
            isGM = session.isGM;
            localPlayerId = session.localPlayerId;
            localPlayerName = session.localPlayerName;
        }
    } catch (e) {
        console.error('Error restoring session:', e);
    }
}

function clearLocalSession() {
    localStorage.removeItem('meenit-odd-one-in-session');
    isGM = false;
    localPlayerId = null;
    localPlayerName = '';
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // GM Actions
    document.getElementById('create-game-btn').addEventListener('click', createGame);
    document.getElementById('start-game-btn').addEventListener('click', startGame);
    document.getElementById('gm-back-home').addEventListener('click', gmBackToHome);

    document.getElementById('pause-timer-btn').addEventListener('click', togglePause);
    document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
    document.getElementById('skip-question-btn').addEventListener('click', skipQuestion);
    document.getElementById('edit-question-btn').addEventListener('click', showEditModal);

    document.getElementById('eliminate-selected-btn').addEventListener('click', eliminateSelected);
    document.getElementById('next-round-no-elim-btn').addEventListener('click', nextRoundNoElim);
    document.getElementById('play-again-btn').addEventListener('click', playAgain);

    // Player Actions
    document.getElementById('join-game-btn').addEventListener('click', joinGame);
    document.getElementById('submit-answer-btn').addEventListener('click', submitAnswer);

    // Inputs
    document.getElementById('gm-name').addEventListener('keypress', (e) => e.key === 'Enter' && createGame());
    document.getElementById('player-name').addEventListener('keypress', (e) => e.key === 'Enter' && joinGame());
    document.getElementById('answer-input').addEventListener('keypress', (e) => e.key === 'Enter' && submitAnswer());

    // Invite
    document.getElementById('copy-link-btn').addEventListener('click', copyInviteLink);
    document.getElementById('share-whatsapp-btn').addEventListener('click', shareWhatsApp);

    // Modal
    document.getElementById('save-question-btn').addEventListener('click', saveEditedQuestion);
    document.getElementById('cancel-edit-btn').addEventListener('click', () => document.getElementById('edit-question-modal').classList.add('hidden'));
}

// ================================
// GAME FLOW - SETUP
// ================================

function createGame() {
    const nameInput = document.getElementById('gm-name');
    const name = nameInput.value.trim();
    if (!name) return shakeElement(nameInput);

    isGM = true;
    localPlayerId = generateId();
    localPlayerName = name;

    // Initialize clean state
    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    gameState.gmId = localPlayerId;
    gameState.players = [{
        id: localPlayerId,
        name: name,
        isGM: true,
        isEliminated: false
    }];

    saveGame('odd-one-in', gameState);
    saveLocalSession();
    updateUI();
    showScreen('screen-gm-lobby');
}

function joinGame() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim();
    if (!name) return shakeElement(nameInput);

    // Reload latest state to ensure unique name
    const latest = loadGame('odd-one-in');
    if (latest && latest.gameId === gameState.gameId) gameState = latest;

    if (gameState.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert('Name taken! Choose another.');
        return;
    }

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
    saveLocalSession();
    updateUI();
    showScreen('screen-player-lobby');
}

function gmBackToHome(e) {
    if (!confirm('End game for everyone?')) return e.preventDefault();
    localStorage.removeItem('meenit-odd-one-in'); // Wipes game
    clearLocalSession();
    window.location.href = '../index.html';
}

function removePlayer(playerId) {
    if (!isGM) return;
    gameState.players = gameState.players.filter(p => p.id !== playerId);
    saveGame('odd-one-in', gameState);
    updateUI();
}

// ================================
// GAME LOOP
// ================================

function startGame() {
    console.log('Start Game clicked. Is GM?', isGM);
    if (!isGM) return;

    gameState.isStarted = true;
    gameState.currentRound = 1;
    gameState.eliminatedIds = [];

    startRound();
}

function startRound() {
    console.log('Starting Round...');
    // 1. Select Question
    selectQuestion();

    // 2. Reset Round State
    gameState.answers = [];
    gameState.timerState = 'preview'; // 3s preview
    gameState.timerValue = 10;

    saveGame('odd-one-in', gameState);
    updateUI();

    // GM-side triggers actual timing logic
    if (isGM) {
        console.log('GM initiating timer sequence');
        runTimerSequence();
    }
}

function selectQuestion() {
    if (!gameState.allQuestions) return;
    const questions = gameState.allQuestions.oddOneIn;
    // Simple random selection
    let available = questions.filter(q => !gameState.usedQuestions.has(q));
    if (available.length === 0) {
        gameState.usedQuestions = new Set();
        available = questions;
    }
    const q = available[Math.floor(Math.random() * available.length)];
    gameState.currentQuestion = q;
    gameState.usedQuestions.add(q);
}

// GM-side central timer logic
function runTimerSequence() {
    // Clear any existing intervals
    if (timerInterval) clearInterval(timerInterval);
    if (previewTimeout) clearTimeout(previewTimeout);

    // Preview Phase (3s)
    previewTimeout = setTimeout(() => {
        if (gameState.timerState !== 'preview') return; // Handled interrupt
        gameState.timerState = 'running';
        saveGame('odd-one-in', gameState);

        // Countdown Phase (10s)
        timerInterval = setInterval(() => {
            if (gameState.timerState === 'paused') return;

            gameState.timerValue--;
            if (gameState.timerValue <= 0) {
                clearInterval(timerInterval);
                gameState.timerState = 'ended';
                finalizeRound();
            }
            saveGame('odd-one-in', gameState);
            updateUI(); // Local update
        }, 1000);

    }, 3000);
}

function finalizeRound() {
    // Auto-fill blanks
    gameState.players.forEach(p => {
        if (!p.isEliminated && !gameState.answers.find(a => a.playerId === p.id)) {
            gameState.answers.push({
                playerId: p.id,
                playerName: p.name,
                answer: '' // Blank answer
            });
        }
    });

    saveGame('odd-one-in', gameState);
    updateUI();
}

// ================================
// GM CONTROLS & LOGIC
// ================================

function togglePause() {
    if (gameState.timerState === 'running') gameState.timerState = 'paused';
    else if (gameState.timerState === 'paused') gameState.timerState = 'running';
    saveGame('odd-one-in', gameState);
}

function resetTimer() {
    if (timerInterval) clearInterval(timerInterval);
    gameState.timerValue = 10;
    gameState.timerState = 'running'; // Auto-resume on reset
    saveGame('odd-one-in', gameState);
    runTimerSequence(); // Restart timer logic
}

function skipQuestion() {
    startRound();
}

function showEditModal() {
    document.getElementById('edit-question-input').value = gameState.currentQuestion;
    document.getElementById('edit-question-modal').classList.remove('hidden');
}

function saveEditedQuestion() {
    const newQ = document.getElementById('edit-question-input').value.trim();
    if (newQ) {
        gameState.currentQuestion = newQ;
        saveGame('odd-one-in', gameState);
        updateUI();
    }
    document.getElementById('edit-question-modal').classList.add('hidden');
}

// ================================
// PLAYER ACTIONS
// ================================

function submitAnswer() {
    const input = document.getElementById('answer-input');
    const ans = input.value.trim();
    if (!ans) return shakeElement(input);

    gameState.answers.push({
        playerId: localPlayerId,
        playerName: localPlayerName,
        answer: ans
    });

    // Disable locally immediately
    input.disabled = true;
    document.getElementById('submit-answer-btn').disabled = true;
    document.getElementById('submit-answer-btn').textContent = '✓ Submitted';

    saveGame('odd-one-in', gameState);
}

// ================================
// REVIEW & ELIMINATION
// ================================

function eliminateSelected() {
    const checkboxes = document.querySelectorAll('.elim-checkbox:checked');
    if (checkboxes.length === 0) return alert('Select players to eliminate');

    checkboxes.forEach(cb => {
        const pid = cb.dataset.id;
        gameState.eliminatedIds.push(pid);
        const p = gameState.players.find(x => x.id === pid);
        if (p) p.isEliminated = true;
    });

    checkGameEnd();
}

function nextRoundNoElim() {
    checkGameEnd();
}

function checkGameEnd() {
    const active = gameState.players.filter(p => !p.isEliminated);
    if (active.length <= 2) {
        // Game Over
        gameState.timerState = 'winner'; // reuse field or add new one
        saveGame('odd-one-in', gameState);
        updateUI();
    } else {
        // Next Round
        gameState.currentRound++;
        startRound();
    }
}

function playAgain() {
    gameState.isStarted = false;
    gameState.currentRound = 1;
    gameState.players.forEach(p => p.isEliminated = false);
    gameState.eliminatedIds = [];
    gameState.answers = [];
    gameState.timerState = 'idle';

    saveGame('odd-one-in', gameState);
    updateUI();
    showScreen('screen-gm-lobby');
}

// ================================
// UI UPDATES (The Brain)
// ================================

function updateUI() {
    // 1. Screen Selection
    if (!gameState.isStarted) {
        // Lobby Phase
        if (isGM) {
            showScreen('screen-gm-lobby');
            updateGMLobby();
        } else if (localPlayerId) {
            showScreen('screen-player-lobby');
            updatePlayerLobby();
        } else {
            // New player viewing invite link
            showScreen('screen-player-join');
        }
    } else {
        // Game Phase
        if (gameState.timerState === 'winner') {
            showScreen('screen-winner');
            updateWinnerScreen();
        } else if (gameState.timerState === 'ended') {
            showScreen('screen-review');
            updateReviewScreen();
        } else {
            showScreen('screen-question');
            updateQuestionScreen();
        }
    }
}

function updateGMLobby() {
    const container = document.getElementById('players-list');
    container.innerHTML = '';
    document.getElementById('player-count').textContent = gameState.players.length;

    gameState.players.forEach(p => {
        const row = createElement('div', { classes: ['player-row'] });
        row.innerHTML = `
            <span class="p-name">${p.isGM ? '👑 ' : ''}${p.name} ${p.id === localPlayerId ? '(You)' : ''}</span>
            ${!p.isGM ? `<button class="remove-btn" onclick="removePlayer('${p.id}')">×</button>` : ''}
        `;
        container.appendChild(row);
    });

    document.getElementById('start-game-btn').disabled = gameState.players.length < 2; // Min 2 for testing, strict 3?
}

function updatePlayerLobby() {
    const container = document.getElementById('players-list-view');
    container.innerHTML = '';
    document.getElementById('player-count-view').textContent = gameState.players.length;

    gameState.players.forEach(p => {
        const row = createElement('div', { classes: ['player-row'] });
        row.innerHTML = `
            <span class="p-name">${p.isGM ? '👑 ' : ''}${p.name} ${p.id === localPlayerId ? '(You)' : ''}</span>
        `;
        container.appendChild(row);
    });
}

function updateQuestionScreen() {
    document.getElementById('question-text').textContent = gameState.currentQuestion;

    const timerDisplay = document.getElementById('timer-display');
    const input = document.getElementById('answer-input');
    const submitBtn = document.getElementById('submit-answer-btn');
    const player = gameState.players.find(p => p.id === localPlayerId);

    // Timer Logic
    if (gameState.timerState === 'preview') {
        timerDisplay.textContent = "Get Ready...";
        timerDisplay.classList.add('preview-mode');
        input.disabled = true;
        submitBtn.disabled = true;
    } else {
        timerDisplay.textContent = gameState.timerValue;
        timerDisplay.classList.remove('preview-mode');

        // Input Logic
        const hasAnswered = gameState.answers.some(a => a.playerId === localPlayerId);

        if (player && player.isEliminated) {
            document.getElementById('eliminated-message').classList.remove('hidden');
            document.getElementById('answer-section').classList.add('hidden');
        } else {
            document.getElementById('eliminated-message').classList.add('hidden');
            document.getElementById('answer-section').classList.remove('hidden');

            if (hasAnswered) {
                input.disabled = true;
                submitBtn.disabled = true;
                submitBtn.textContent = '✓ Submitted';
            } else {
                input.disabled = gameState.timerState === 'paused';
                submitBtn.disabled = gameState.timerState === 'paused';
                submitBtn.textContent = 'Submit Answer';
            }
        }
    }

    // GM Controls visibility
    document.getElementById('gm-controls').classList.toggle('hidden', !isGM);
    if (isGM) {
        document.getElementById('pause-timer-btn').textContent = gameState.timerState === 'paused' ? 'Resume' : 'Pause';
    }
}

function updateReviewScreen() {
    const list = document.getElementById('answers-container');
    list.innerHTML = '';

    // Sort: Blanks first, then Alpha
    const sorted = [...gameState.answers].sort((a, b) => {
        if (!a.answer && b.answer) return -1;
        if (a.answer && !b.answer) return 1;
        return (a.answer || '').localeCompare(b.answer || '');
    });

    sorted.forEach(ans => {
        const item = createElement('div', { classes: ['answer-item'] });
        const canEliminate = isGM;

        item.innerHTML = `
            <div class="ans-content">
                ${canEliminate ? `<input type="checkbox" class="elim-checkbox" data-id="${ans.playerId}">` : ''}
                <span class="ans-text">${ans.answer || '(No Answer)'}</span>
                <span class="ans-author"> - ${ans.playerName}</span>
            </div>
        `;
        list.appendChild(item);
    });

    document.getElementById('elimination-controls').classList.toggle('hidden', !isGM);
}

function updateWinnerScreen() {
    const active = gameState.players.filter(p => !p.isEliminated);
    const names = active.map(p => p.name).join(' & ');
    document.getElementById('winner-name').textContent = names;

    document.getElementById('play-again-btn').style.display = isGM ? 'block' : 'none';
}

// Helpers
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function copyInviteLink() {
    const url = `${window.location.origin}${window.location.pathname}?join=${gameState.gameId}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
}

function shareWhatsApp() {
    const url = `${window.location.origin}${window.location.pathname}?join=${gameState.gameId}`;
    window.open(`https://wa.me/?text=Join my Odd One In Game! ${url}`);
}
