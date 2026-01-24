// ================================
// UNDERCOVER - GAME LOGIC (REDESIGNED)
// ================================

// Game State
let gameState = {
    gameId: null,
    totalPlayers: 6,
    roles: {
        mrWhite: 1,
        spies: 2,
        agents: 3
    },
    words: {
        word1: '', // Agents' word
        word2: ''  // Spies' word
    },
    players: [],
    currentRound: 1,
    viewingOrder: [],
    currentViewIndex: 0,
    speakingOrder: [],
    allWordPairs: null,
    selectedEliminationId: null
};

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    loadWordPairs();
    setupEventListeners();
    generatePlayerInputs(gameState.totalPlayers);
    updateRoleDistribution();
});

// Load word pairs from JSON
async function loadWordPairs() {
    try {
        const response = await fetch('../words.json');
        const data = await response.json();
        gameState.allWordPairs = data.word_pairs;
        console.log('Word pairs loaded:', gameState.allWordPairs.length);
    } catch (error) {
        console.error('Error loading word pairs:', error);
        alert('Failed to load word pairs. Please refresh the page.');
    }
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // Player count adjustment
    document.getElementById('decrease-players').addEventListener('click', () => adjustPlayerCount(-1));
    document.getElementById('increase-players').addEventListener('click', () => adjustPlayerCount(1));

    // Role count adjustment
    document.getElementById('decrease-mrwhite').addEventListener('click', () => adjustRoleCount('mrWhite', -1));
    document.getElementById('increase-mrwhite').addEventListener('click', () => adjustRoleCount('mrWhite', 1));
    document.getElementById('decrease-spies').addEventListener('click', () => adjustRoleCount('spies', -1));
    document.getElementById('increase-spies').addEventListener('click', () => adjustRoleCount('spies', 1));

    // Rules button
    document.getElementById('rules-btn').addEventListener('click', showRules);
    document.getElementById('close-rules-btn').addEventListener('click', hideRules);

    // Start game
    document.getElementById('start-game-btn').addEventListener('click', startGame);

    // Role viewing
    document.getElementById('reveal-role-btn').addEventListener('click', showRoleCard);
    document.getElementById('done-viewing-btn').addEventListener('click', nextViewer);

    // Word rounds
    document.getElementById('next-word-round-btn').addEventListener('click', confirmElimination);

    // Mr. White guess
    document.getElementById('submit-guess-btn').addEventListener('click', submitMrWhiteGuess);
    document.getElementById('skip-guess-btn').addEventListener('click', skipMrWhiteGuess);

    // Play again
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
}

// ================================
// RULES MODAL
// ================================

function showRules() {
    document.getElementById('rules-modal').classList.remove('hidden');
}

function hideRules() {
    document.getElementById('rules-modal').classList.add('hidden');
}

// ================================
// SETUP SCREEN
// ================================

function adjustPlayerCount(delta) {
    const input = document.getElementById('player-count-input');
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(4, Math.min(15, newValue));

    input.value = newValue;
    gameState.totalPlayers = newValue;

    generatePlayerInputs(newValue);
    updateRoleDistribution();
}

function generatePlayerInputs(count) {
    const container = document.getElementById('player-names-container');
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const playerDiv = createElement('div', {
            classes: ['player-name-input']
        });

        playerDiv.innerHTML = `
      <div class="player-number">${i + 1}</div>
      <input type="text" placeholder="Player ${i + 1}" data-player-index="${i}">
    `;

        container.appendChild(playerDiv);
    }
}

function adjustRoleCount(role, delta) {
    const input = document.getElementById(`${role === 'mrWhite' ? 'mrwhite' : role}-count`);
    let newValue = parseInt(input.value) + delta;

    if (role === 'mrWhite') {
        newValue = Math.max(1, Math.min(3, newValue));
    } else if (role === 'spies') {
        newValue = Math.max(1, Math.min(5, newValue));
    }

    input.value = newValue;
    gameState.roles[role] = newValue;

    updateRoleDistribution();
}

function updateRoleDistribution() {
    const total = gameState.totalPlayers;
    const mrWhite = gameState.roles.mrWhite;
    const spies = gameState.roles.spies;
    const agents = total - mrWhite - spies;

    gameState.roles.agents = agents;
    document.getElementById('agents-count').textContent = agents;

    // Validate
    const startBtn = document.getElementById('start-game-btn');
    if (agents < 1) {
        startBtn.disabled = true;
        document.getElementById('agents-count').style.color = 'var(--danger)';
    } else {
        startBtn.disabled = false;
        document.getElementById('agents-count').style.color = 'var(--primary)';
    }
}

function startGame() {
    // Validate players
    const playerInputs = document.querySelectorAll('.player-name-input input');
    const names = Array.from(playerInputs).map(input => input.value.trim()).filter(name => name !== '');

    if (names.length < gameState.totalPlayers) {
        alert('Please enter all player names!');
        return;
    }

    const validation = validatePlayerNames(names);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }

    // Validate roles
    if (gameState.roles.agents < 1) {
        alert('Must have at least 1 Agent! Reduce other roles.');
        return;
    }

    // Auto-select random words (GM doesn't see them)
    if (!gameState.allWordPairs || gameState.allWordPairs.length === 0) {
        alert('Word pairs not loaded yet. Please wait...');
        return;
    }

    const pair = getRandomItem(gameState.allWordPairs);
    gameState.words.word1 = pair[0];
    gameState.words.word2 = pair[1];

    // Create players with roles
    assignRoles(names);

    // Generate RANDOM viewing order (not sequential)
    const randomStartIndex = getRandomInt(0, gameState.totalPlayers - 1);
    gameState.viewingOrder = [];
    for (let i = 0; i < gameState.totalPlayers; i++) {
        gameState.viewingOrder.push((randomStartIndex + i) % gameState.totalPlayers);
    }
    gameState.currentViewIndex = 0;

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    gameState.currentRound = 1;
    saveGame('undercover', gameState);

    showScreen('screen-role-viewing');
    showNextViewer();
}

function assignRoles(names) {
    gameState.players = [];
    const roles = [];

    // Build roles array
    for (let i = 0; i < gameState.roles.mrWhite; i++) {
        roles.push('mrwhite');
    }
    for (let i = 0; i < gameState.roles.spies; i++) {
        roles.push('spy');
    }
    for (let i = 0; i < gameState.roles.agents; i++) {
        roles.push('agent');
    }

    // Shuffle roles
    const shuffledRoles = shuffleArray(roles);

    // Assign to players
    names.forEach((name, index) => {
        const role = shuffledRoles[index];
        let word = null;

        if (role === 'agent') {
            word = gameState.words.word1;
        } else if (role === 'spy') {
            word = gameState.words.word2;
        }
        // mrwhite gets no word

        gameState.players.push({
            id: generateId(),
            name: name,
            role: role,
            word: word,
            isEliminated: false,
            originalIndex: index + 1
        });
    });
}

// ================================
// ROLE VIEWING
// ================================

function showNextViewer() {
    if (gameState.currentViewIndex >= gameState.viewingOrder.length) {
        // All players have viewed, start word rounds
        startWordRounds();
        return;
    }

    const playerIndex = gameState.viewingOrder[gameState.currentViewIndex];
    const player = gameState.players[playerIndex];

    document.getElementById('next-viewer-name').textContent = player.name;
    showScreen('screen-role-viewing');
}

function showRoleCard() {
    const playerIndex = gameState.viewingOrder[gameState.currentViewIndex];
    const player = gameState.players[playerIndex];

    // DON'T SHOW ROLE NAME except for Mr. White
    let imageSrc = '../images/Agent.png'; // Both Agent and Spy use same image

    if (player.role === 'mrwhite') {
        imageSrc = '../images/Mr. White.png';
    }

    document.getElementById('role-image').src = imageSrc;

    // Set word
    const wordDisplay = document.getElementById('word-display-card');
    const wordText = document.getElementById('word-text');

    if (player.word) {
        wordText.textContent = player.word;
        wordDisplay.classList.remove('no-word');
    } else {
        // Mr. White sees this
        wordText.textContent = 'You are Mr. White!';
        wordDisplay.classList.add('no-word');
    }

    // Update button text for next player
    const nextIndex = gameState.currentViewIndex + 1;
    if (nextIndex < gameState.viewingOrder.length) {
        const nextPlayer = gameState.players[gameState.viewingOrder[nextIndex]];
        document.getElementById('next-player-name').textContent = nextPlayer.name;
    } else {
        document.getElementById('next-player-name').textContent = 'Game Master';
    }

    showScreen('screen-role-card');
}

function nextViewer() {
    gameState.currentViewIndex++;
    saveGame('undercover', gameState);
    showNextViewer();
}

// ================================
// WORD ROUNDS
// ================================

function startWordRounds() {
    generateSpeakingOrder();
    showScreen('screen-word-round');
    displayWordRound();
}

function generateSpeakingOrder() {
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);

    // Random starting player
    const randomStartIndex = getRandomInt(0, alivePlayers.length - 1);
    gameState.speakingOrder = [];

    for (let i = 0; i < alivePlayers.length; i++) {
        gameState.speakingOrder.push((randomStartIndex + i) % alivePlayers.length);
    }
}

function displayWordRound() {
    document.getElementById('word-round-number').textContent = gameState.currentRound;

    // Display speaking order (by player names)
    const orderContainer = document.getElementById('speaking-order-list');
    orderContainer.innerHTML = '';

    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    gameState.speakingOrder.forEach((index) => {
        const player = alivePlayers[index];
        const orderDiv = createElement('div', {
            classes: ['speaking-order-item'],
            text: player.name
        });
        orderContainer.appendChild(orderDiv);
    });

    // Display elimination list (ALL players in original fixed order)
    displayEliminationList();
}

function displayEliminationList() {
    const container = document.getElementById('elimination-list');
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const itemDiv = createElement('div', {
            classes: ['elimination-item', player.isEliminated ? 'eliminated' : '']
        });

        itemDiv.innerHTML = `
      <div class="player-info">
        <div class="player-number">${player.originalIndex}</div>
        <span class="player-name">${player.name}</span>
      </div>
      <button class="eliminate-btn" data-player-id="${player.id}" ${player.isEliminated ? 'disabled' : ''}>✕</button>
    `;

        if (!player.isEliminated) {
            const btn = itemDiv.querySelector('.eliminate-btn');
            btn.addEventListener('click', () => selectForElimination(player.id));
        }

        container.appendChild(itemDiv);
    });

    // Reset selection
    gameState.selectedEliminationId = null;
    document.getElementById('next-word-round-btn').disabled = true;
}

function selectForElimination(playerId) {
    // Deselect all
    document.querySelectorAll('.elimination-item').forEach(item => {
        item.classList.remove('selected');
    });

    // Select this one
    const selectedItem = document.querySelector(`[data-player-id="${playerId}"]`).closest('.elimination-item');
    selectedItem.classList.add('selected');

    gameState.selectedEliminationId = playerId;
    document.getElementById('next-word-round-btn').disabled = false;
}

function confirmElimination() {
    if (!gameState.selectedEliminationId) {
        alert('Please select a player to eliminate!');
        return;
    }

    const player = gameState.players.find(p => p.id === gameState.selectedEliminationId);
    player.isEliminated = true;

    // Reveal role (Agent or Spy) but NOT their word
    let roleText = player.role === 'agent' ? 'Agent' : player.role === 'spy' ? 'Spy' : 'Mr. White';
    alert(`${player.name} was a ${roleText}!`);

    // Check if Mr. White was eliminated
    if (player.role === 'mrwhite') {
        showScreen('screen-mrwhite-guess');
        return;
    }

    saveGame('undercover', gameState);

    if (checkWinConditions()) {
        return;
    }

    gameState.currentRound++;
    generateSpeakingOrder();
    saveGame('undercover', gameState);
    displayWordRound();
}

function checkWinConditions() {
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const aliveAgents = alivePlayers.filter(p => p.role === 'agent');
    const aliveSpies = alivePlayers.filter(p => p.role === 'spy');
    const aliveMrWhites = alivePlayers.filter(p => p.role === 'mrwhite');

    // Agents win: All Spies and Mr. Whites eliminated
    if (aliveSpies.length === 0 && aliveMrWhites.length === 0) {
        showWinner('Agents');
        return true;
    }

    // Spies/Mr. White win: (Spies + Mr. Whites) >= Agents
    if (aliveSpies.length + aliveMrWhites.length >= aliveAgents.length) {
        showWinner('Spies & Mr. White');
        return true;
    }

    return false;
}

// ================================
// MR. WHITE GUESS
// ================================

function submitMrWhiteGuess() {
    const guess1 = document.getElementById('guess-word1').value.trim().toLowerCase();
    const guess2 = document.getElementById('guess-word2').value.trim().toLowerCase();

    if (!guess1 || !guess2) {
        alert('Please enter both word guesses!');
        return;
    }

    const correct1 = guess1 === gameState.words.word1.toLowerCase() || guess1 === gameState.words.word2.toLowerCase();
    const correct2 = guess2 === gameState.words.word1.toLowerCase() || guess2 === gameState.words.word2.toLowerCase();

    if (correct1 && correct2 && guess1 !== guess2) {
        showWinner('Mr. White (Solo Win!)');
    } else {
        alert(`Wrong guess! The words were: ${gameState.words.word1} and ${gameState.words.word2}`);
        skipMrWhiteGuess();
    }
}

function skipMrWhiteGuess() {
    if (checkWinConditions()) {
        return;
    }

    gameState.currentRound++;
    generateSpeakingOrder();
    saveGame('undercover', gameState);
    showScreen('screen-word-round');
    displayWordRound();
}

// ================================
// WINNER
// ================================

function showWinner(winnerTeam) {
    document.getElementById('winner-title').textContent = `${winnerTeam} Win!`;

    // Display role reveals
    const container = document.getElementById('role-reveals-list');
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const itemDiv = createElement('div', {
            classes: ['role-reveal-item']
        });

        let roleText = player.role === 'agent' ? 'Agent' : player.role === 'spy' ? 'Spy' : 'Mr. White';
        let roleClass = player.role === 'agent' ? 'agent' : player.role === 'spy' ? 'spy' : 'mrwhite';

        itemDiv.innerHTML = `
      <span class="player-name">${player.name}</span>
      <span class="role-badge ${roleClass}">${roleText}</span>
    `;

        container.appendChild(itemDiv);
    });

    showScreen('screen-winner');
    showConfetti(document.getElementById('confetti-container'), 80);
}

function playAgain() {
    clearGame('undercover');
    location.reload();
}

// ================================
// SCREEN NAVIGATION
// ================================

function showScreen(screenId) {
    const screens = ['screen-setup', 'screen-role-viewing', 'screen-role-card', 'screen-word-round', 'screen-mrwhite-guess', 'screen-winner'];
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
