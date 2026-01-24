// ================================
// UNDERCOVER - GAME LOGIC
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
    allWordPairs: null
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

    // Word selection
    document.getElementById('random-words-btn').addEventListener('click', selectRandomWords);
    document.getElementById('custom-words-btn').addEventListener('click', toggleCustomWords);

    // Start game
    document.getElementById('start-game-btn').addEventListener('click', startGame);

    // Role viewing
    document.getElementById('reveal-role-btn').addEventListener('click', showRoleCard);
    document.getElementById('done-viewing-btn').addEventListener('click', nextViewer);

    // Word rounds
    document.getElementById('next-word-round-btn').addEventListener('click', nextWordRound);
    document.getElementById('end-game-btn').addEventListener('click', endGame);

    // Mr. White guess
    document.getElementById('submit-guess-btn').addEventListener('click', submitMrWhiteGuess);
    document.getElementById('skip-guess-btn').addEventListener('click', skipMrWhiteGuess);

    // Play again
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
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
            classes: ['player-name-input'],
            attributes: { draggable: 'true', 'data-index': i }
        });

        playerDiv.innerHTML = `
      <span class="drag-handle">☰</span>
      <div class="player-number">${i + 1}</div>
      <input type="text" placeholder="Player ${i + 1}" data-player-index="${i}">
    `;

        // Drag and drop for reordering
        playerDiv.addEventListener('dragstart', handleDragStart);
        playerDiv.addEventListener('dragover', handleDragOver);
        playerDiv.addEventListener('drop', handleDrop);
        playerDiv.addEventListener('dragend', handleDragEnd);

        container.appendChild(playerDiv);
    }
}

// Drag and Drop Handlers
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedElement !== this) {
        const container = document.getElementById('player-names-container');
        const allItems = [...container.children];
        const draggedIndex = allItems.indexOf(draggedElement);
        const targetIndex = allItems.indexOf(this);

        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedElement, this.nextSibling);
        } else {
            container.insertBefore(draggedElement, this);
        }
    }

    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');

    // Renumber players
    const inputs = document.querySelectorAll('.player-name-input');
    inputs.forEach((item, index) => {
        item.querySelector('.player-number').textContent = index + 1;
    });
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

function selectRandomWords() {
    if (!gameState.allWordPairs || gameState.allWordPairs.length === 0) {
        alert('Word pairs not loaded yet. Please wait...');
        return;
    }

    const pair = getRandomItem(gameState.allWordPairs);
    gameState.words.word1 = pair[0];
    gameState.words.word2 = pair[1];

    displaySelectedWords();
    hideElement('#custom-words-input');
}

function toggleCustomWords() {
    const customInput = document.getElementById('custom-words-input');
    customInput.classList.toggle('hidden');

    if (!customInput.classList.contains('hidden')) {
        document.getElementById('word1-input').focus();
    }
}

function displaySelectedWords() {
    const display = document.getElementById('selected-words-display');
    const preview = document.getElementById('words-preview');

    if (gameState.words.word1 && gameState.words.word2) {
        preview.textContent = `${gameState.words.word1} vs ${gameState.words.word2}`;
        showElement('#selected-words-display');
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

    // Get words (custom or selected)
    if (!gameState.words.word1 || !gameState.words.word2) {
        const word1 = document.getElementById('word1-input').value.trim();
        const word2 = document.getElementById('word2-input').value.trim();

        if (!word1 || !word2) {
            alert('Please select random words or enter custom words!');
            return;
        }

        gameState.words.word1 = word1;
        gameState.words.word2 = word2;
    }

    // Validate roles
    const roleValidation = validateRoleDistribution(gameState.roles, gameState.totalPlayers);
    if (!roleValidation.valid) {
        alert(roleValidation.error);
        return;
    }

    if (gameState.roles.agents < 1) {
        alert('Must have at least 1 Agent!');
        return;
    }

    // Create players with roles
    assignRoles(names);

    // Generate viewing order
    gameState.viewingOrder = shuffleArray([...Array(gameState.totalPlayers).keys()]);
    gameState.currentViewIndex = 0;

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
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
            isEliminated: false
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

    // Set role image
    let imageSrc = '../images/Agent.png';
    let roleName = 'Agent';

    if (player.role === 'spy') {
        imageSrc = '../images/Agent.png'; // Spies use same image
        roleName = 'Spy';
    } else if (player.role === 'mrwhite') {
        imageSrc = '../images/Mr. White.png';
        roleName = 'Mr. White';
    }

    document.getElementById('role-image').src = imageSrc;
    document.getElementById('role-name').textContent = roleName;

    // Set word
    const wordDisplay = document.querySelector('.word-display');
    const wordText = document.getElementById('word-text');

    if (player.word) {
        wordText.textContent = player.word;
        wordDisplay.classList.remove('no-word');
    } else {
        wordText.textContent = 'You have NO word!';
        wordDisplay.classList.add('no-word');
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
    gameState.currentRound = 1;
    generateSpeakingOrder();
    showScreen('screen-word-round');
    displayWordRound();
}

function generateSpeakingOrder() {
    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    const indices = alivePlayers.map((_, i) => i);
    gameState.speakingOrder = shuffleArray(indices);
}

function displayWordRound() {
    document.getElementById('word-round-number').textContent = gameState.currentRound;

    // Display speaking order
    const orderContainer = document.getElementById('speaking-order-list');
    orderContainer.innerHTML = '';

    const alivePlayers = gameState.players.filter(p => !p.isEliminated);
    gameState.speakingOrder.forEach((index, order) => {
        const player = alivePlayers[index];
        const orderDiv = createElement('div', {
            classes: ['speaking-order-item'],
            text: `${order + 1}. ${player.name}`
        });
        orderContainer.appendChild(orderDiv);
    });

    // Display elimination checkboxes
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
      <input type="checkbox" id="elim-${player.id}" ${player.isEliminated ? 'checked disabled' : ''} data-player-id="${player.id}">
      <label class="player-name" for="elim-${player.id}">${player.name}</label>
    `;

        if (!player.isEliminated) {
            itemDiv.querySelector('input').addEventListener('change', (e) => {
                handleElimination(e.target.dataset.playerId, e.target.checked);
            });
        }

        container.appendChild(itemDiv);
    });
}

function handleElimination(playerId, isEliminated) {
    const player = gameState.players.find(p => p.id === playerId);
    player.isEliminated = isEliminated;
    saveGame('undercover', gameState);

    checkWinConditions();
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

    // Spies/Mr. White win: Outnumber Agents
    if (aliveSpies.length + aliveMrWhites.length >= aliveAgents.length) {
        showWinner('Spies & Mr. White');
        return true;
    }

    return false;
}

function nextWordRound() {
    // Check if any Mr. White was just eliminated
    const justEliminatedMrWhite = gameState.players.some(p =>
        p.role === 'mrwhite' && p.isEliminated && !p.hasGuessed
    );

    if (justEliminatedMrWhite) {
        showScreen('screen-mrwhite-guess');
        return;
    }

    if (checkWinConditions()) {
        return;
    }

    gameState.currentRound++;
    generateSpeakingOrder();
    saveGame('undercover', gameState);
    displayWordRound();
}

function endGame() {
    if (confirm('End the game and check final results?')) {
        checkWinConditions() || showWinner('Draw');
    }
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

    const correct1 = guess1 === gameState.words.word1.toLowerCase();
    const correct2 = guess2 === gameState.words.word2.toLowerCase();

    // Mark Mr. White as having guessed
    gameState.players.forEach(p => {
        if (p.role === 'mrwhite' && p.isEliminated) {
            p.hasGuessed = true;
        }
    });

    if (correct1 && correct2) {
        showWinner('Mr. White (Solo Win!)');
    } else {
        alert('Wrong guess! Game continues.');
        skipMrWhiteGuess();
    }
}

function skipMrWhiteGuess() {
    // Mark as guessed
    gameState.players.forEach(p => {
        if (p.role === 'mrwhite' && p.isEliminated) {
            p.hasGuessed = true;
        }
    });

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
