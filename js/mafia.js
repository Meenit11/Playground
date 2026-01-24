// ================================
// MAFIA - GAME LOGIC
// ================================

// Game State
let gameState = {
    gameId: null,
    totalPlayers: 5,
    roleConfig: {
        god: 1,
        mafia: 1,
        detective: 0,
        jester: 0,
        bomber: 0,
        lover: 0,
        civilian: 3
    },
    players: [],
    currentRound: 1,
    currentPhase: 'night',
    viewingOrder: [],
    currentViewIndex: 0,
    deadPlayers: [],
    loverPair: null,
    gameEnded: false
};

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    generatePlayerInputs(gameState.totalPlayers);
    updateRoleDistribution();
});

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // Player count adjustment
    document.getElementById('decrease-players').addEventListener('click', () => adjustPlayerCount(-1));
    document.getElementById('increase-players').addEventListener('click', () => adjustPlayerCount(1));

    // Mafia count adjustment
    document.getElementById('decrease-mafia').addEventListener('click', () => adjustMafiaCount(-1));
    document.getElementById('increase-mafia').addEventListener('click', () => adjustMafiaCount(1));

    // Role toggles
    document.getElementById('detective-toggle').addEventListener('change', (e) => toggleRole('detective', e.target.checked));
    document.getElementById('jester-toggle').addEventListener('change', (e) => toggleRole('jester', e.target.checked));
    document.getElementById('bomber-toggle').addEventListener('change', (e) => toggleRole('bomber', e.target.checked));
    document.getElementById('lover-toggle').addEventListener('change', (e) => toggleRole('lover', e.target.checked));

    // Start game
    document.getElementById('start-game-btn').addEventListener('click', startGame);

    // Role viewing
    document.getElementById('reveal-role-btn').addEventListener('click', showRoleCard);
    document.getElementById('done-viewing-btn').addEventListener('click', nextViewer);

    // GM Overview
    document.getElementById('start-night-btn').addEventListener('click', startNightPhase);

    // Night/Day phases
    document.getElementById('start-day-btn').addEventListener('click', startDayPhase);
    document.getElementById('eliminate-day-btn').addEventListener('click', showEliminationModal);
    document.getElementById('skip-elimination-btn').addEventListener('click', skipElimination);

    // Modals
    document.getElementById('cancel-elimination-btn').addEventListener('click', hideEliminationModal);

    // Play again
    document.getElementById('play-again-btn').addEventListener('click', playAgain);
}

// ================================
// SETUP SCREEN
// ================================

function adjustPlayerCount(delta) {
    const input = document.getElementById('player-count-input');
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(5, Math.min(15, newValue));

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

function adjustMafiaCount(delta) {
    const input = document.getElementById('mafia-count');
    let newValue = parseInt(input.value) + delta;
    newValue = Math.max(0, Math.min(5, newValue));

    input.value = newValue;
    gameState.roleConfig.mafia = newValue;

    // Update button states
    document.getElementById('decrease-mafia').disabled = (newValue <= 0);
    document.getElementById('increase-mafia').disabled = (newValue >= 5);

    updateRoleDistribution();
}

function toggleRole(role, isEnabled) {
    // All special roles are 1 person (including lover)
    gameState.roleConfig[role] = isEnabled ? 1 : 0;
    updateRoleDistribution();
}

function updateRoleDistribution() {
    const total = gameState.totalPlayers;
    const sum = gameState.roleConfig.god +
        gameState.roleConfig.mafia +
        gameState.roleConfig.detective +
        gameState.roleConfig.jester +
        gameState.roleConfig.bomber +
        gameState.roleConfig.lover;

    const civilians = total - sum;
    gameState.roleConfig.civilian = civilians;

    document.getElementById('civilian-count').textContent = civilians;

    // Validate
    const startBtn = document.getElementById('start-game-btn');
    if (civilians < 1) {
        startBtn.disabled = true;
        document.getElementById('civilian-count').style.color = 'var(--danger)';
    } else {
        startBtn.disabled = false;
        document.getElementById('civilian-count').style.color = 'var(--accent)';
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
    if (gameState.roleConfig.civilian < 1) {
        alert('Must have at least 1 Civilian! Reduce other roles.');
        return;
    }

    // Assign roles
    assignRoles(names);

    // Generate viewing order
    gameState.viewingOrder = shuffleArray([...Array(gameState.totalPlayers).keys()]);
    gameState.currentViewIndex = 0;

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    saveGame('mafia', gameState);

    showScreen('screen-role-viewing');
    showNextViewer();
}

function assignRoles(names) {
    gameState.players = [];
    const roles = [];

    // Build roles array
    roles.push('god');
    for (let i = 0; i < gameState.roleConfig.mafia; i++) {
        roles.push('mafia');
    }
    if (gameState.roleConfig.detective) roles.push('detective');
    if (gameState.roleConfig.jester) roles.push('jester');
    if (gameState.roleConfig.bomber) roles.push('bomber');
    if (gameState.roleConfig.lover) roles.push('lover');
    for (let i = 0; i < gameState.roleConfig.civilian; i++) {
        roles.push('civilian');
    }

    // Shuffle roles
    const shuffledRoles = shuffleArray(roles);

    // Assign to players
    names.forEach((name, index) => {
        gameState.players.push({
            id: generateId(),
            name: name,
            role: shuffledRoles[index],
            isAlive: true,
            loverProtectedTarget: null // For lover role
        });
    });
}

// ================================
// ROLE VIEWING
// ================================

function showNextViewer() {
    if (gameState.currentViewIndex >= gameState.viewingOrder.length) {
        // All players have viewed, show GM overview
        showScreen('screen-gm-overview');
        displayGMOverview();
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

    // Set role image and description
    const roleData = getRoleData(player.role);
    document.getElementById('role-image').src = roleData.image;
    document.getElementById('role-name').textContent = roleData.name;

    let description = roleData.description;

    // Note: Lover target selection happens during night phase, not role viewing

    document.getElementById('role-description').textContent = description;

    showScreen('screen-role-card');
}

function getRoleData(role) {
    const roleMap = {
        god: {
            name: 'God',
            image: '../images/God.png',
            description: 'You are the Game Master! You see everything and guide the game.'
        },
        mafia: {
            name: 'Mafia',
            image: '../images/Mafia.png',
            description: 'Eliminate civilians at night. Work with other Mafia members.'
        },
        detective: {
            name: 'Detective',
            image: '../images/Detective.png',
            description: 'Once per night, point to someone. God will tell you if they are Mafia.'
        },
        jester: {
            name: 'Jester',
            image: '../images/Jester.png',
            description: 'Your goal: Get voted out during the day! If you succeed, you win alone.'
        },
        bomber: {
            name: 'Suicide Bomber',
            image: '../images/Bomber.png',
            description: 'If eliminated, you can take one person with you!'
        },
        lover: {
            name: 'Lover',
            image: '../images/Lover.png',
            description: 'Pick a target on Night 1 to protect. If they die, you sacrifice yourself instead!'
        },
        civilian: {
            name: 'Civilian',
            image: '../images/Civilian.png',
            description: 'Find and eliminate the Mafia during the day phase!'
        }
    };

    return roleMap[role] || roleMap.civilian;
}

function nextViewer() {
    gameState.currentViewIndex++;
    saveGame('mafia', gameState);
    showNextViewer();
}

// ================================
// GM OVERVIEW
// ================================

function displayGMOverview() {
    const container = document.getElementById('all-roles-list');
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const itemDiv = createElement('div', {
            classes: ['player-role-item']
        });

        const roleData = getRoleData(player.role);
        const roleClass = player.role;

        itemDiv.innerHTML = `
      <span class="player-name">${player.name}</span>
      <span class="role-badge ${roleClass}">${roleData.name}</span>
    `;

        container.appendChild(itemDiv);
    });
}

// ================================
// NIGHT PHASE
// ================================

function startNightPhase() {
    gameState.currentPhase = 'night';
    saveGame('mafia', gameState);

    showScreen('screen-night');
    displayNightInstructions();
}

function displayNightInstructions() {
    document.getElementById('night-round-number').textContent = gameState.currentRound;

    const container = document.getElementById('night-order-list');
    container.innerHTML = '';

    const instructions = [];

    // God opens eyes
    instructions.push('Everyone close your eyes.');
    instructions.push('<strong>God</strong>, open your eyes and observe.');

    // Mafia
    const aliveMafia = gameState.players.filter(p => p.role === 'mafia' && p.isAlive);
    if (aliveMafia.length > 0) {
        const mafiaNames = aliveMafia.map(p => p.name).join(', ');
        instructions.push(`<strong>Mafia</strong> (${mafiaNames}), open your eyes and silently agree on a target.`);
        instructions.push('Mafia, close your eyes.');
    }

    // Detective
    const detective = gameState.players.find(p => p.role === 'detective' && p.isAlive);
    if (detective) {
        instructions.push(`<strong>Detective</strong> (${detective.name}), open your eyes and point to someone. God will nod if they are Mafia.`);
        instructions.push('Detective, close your eyes.');
    }

    // Lovers
    if (gameState.currentRound === 1 && gameState.loverPair) {
        const lovers = gameState.players.filter(p => p.role === 'lover' && p.isAlive);
        if (lovers.length === 2) {
            instructions.push(`<strong>Lovers</strong> (${lovers.map(p => p.name).join(', ')}), open your eyes and see each other.`);
            instructions.push('Lovers, close your eyes.');
        }
    }

    instructions.push('Everyone open your eyes. <strong>It is now day.</strong>');

    instructions.forEach(instruction => {
        const li = createElement('li', { html: instruction });
        container.appendChild(li);
    });
}

// ================================
// DAY PHASE
// ================================

function startDayPhase() {
    gameState.currentPhase = 'day';
    saveGame('mafia', gameState);

    showScreen('screen-day');
    displayDayPhase();
}

function displayDayPhase() {
    document.getElementById('day-round-number').textContent = gameState.currentRound;

    const alivePlayers = gameState.players.filter(p => p.isAlive);
    document.getElementById('alive-count').textContent = alivePlayers.length;

    const container = document.getElementById('alive-players-container');
    container.innerHTML = '';

    alivePlayers.forEach(player => {
        const itemDiv = createElement('div', {
            classes: ['alive-player-item']
        });

        const initial = player.name.charAt(0).toUpperCase();

        itemDiv.innerHTML = `
      <div class="player-icon">${initial}</div>
      <span class="player-name">${player.name}</span>
    `;

        container.appendChild(itemDiv);
    });
}

function showEliminationModal() {
    const modal = document.getElementById('elimination-modal');
    const container = document.getElementById('elimination-player-list');
    container.innerHTML = '';

    const alivePlayers = gameState.players.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
        const btn = createElement('button', {
            classes: ['modal-player-btn'],
            text: player.name,
            attributes: { 'data-player-id': player.id }
        });

        btn.addEventListener('click', () => {
            eliminatePlayer(player.id, 'day');
            hideEliminationModal();
        });

        container.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

function hideEliminationModal() {
    document.getElementById('elimination-modal').classList.add('hidden');
}

function eliminatePlayer(playerId, phase) {
    const player = gameState.players.find(p => p.id === playerId);
    player.isAlive = false;
    gameState.deadPlayers.push(playerId);

    // Check for Jester win (only during day phase)
    if (phase === 'day' && player.role === 'jester') {
        showWinner('Jester');
        return;
    }

    // Check for Suicide Bomber (ONLY if voted out, not mafia-killed)
    if (phase === 'day' && player.role === 'bomber') {
        showBomberModal();
        return;
    }

    // Check if player is protected by Lover
    const lover = gameState.players.find(p => p.role === 'lover' && p.isAlive && p.loverProtectedTarget === playerId);
    if (lover) {
        // Lover sacrifices self instead
        lover.isAlive = false;
        gameState.deadPlayers.push(lover.id);
        player.isAlive = true; // Revive the protected player
        const deadIndex = gameState.deadPlayers.indexOf(playerId);
        if (deadIndex > -1) {
            gameState.deadPlayers.splice(deadIndex, 1);
        }
        alert(`${lover.name} (Lover) sacrifices themselves to save ${player.name}!`);
    }

    saveGame('mafia', gameState);
    checkWinConditions();
}

function showBomberModal() {
    const modal = document.getElementById('bomber-modal');
    const container = document.getElementById('bomber-target-list');
    container.innerHTML = '';

    const alivePlayers = gameState.players.filter(p => p.isAlive);

    alivePlayers.forEach(player => {
        const btn = createElement('button', {
            classes: ['modal-player-btn'],
            text: player.name,
            attributes: { 'data-player-id': player.id }
        });

        btn.addEventListener('click', () => {
            eliminatePlayer(player.id, 'bomber');
            modal.classList.add('hidden');
            checkWinConditions();
        });

        container.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

function skipElimination() {
    if (confirm('Skip elimination and go to next night?')) {
        nextRound();
    }
}

function nextRound() {
    if (checkWinConditions()) {
        return;
    }

    gameState.currentRound++;
    saveGame('mafia', gameState);
    startNightPhase();
}

// ================================
// WIN CONDITIONS
// ================================

function checkWinConditions() {
    if (gameState.gameEnded) return true;

    const alivePlayers = gameState.players.filter(p => p.isAlive);
    const aliveMafia = alivePlayers.filter(p => p.role === 'mafia');
    const aliveOthers = alivePlayers.filter(p => p.role !== 'mafia');

    // Civilians win: All Mafia eliminated
    if (aliveMafia.length === 0) {
        showWinner('Civilians');
        return true;
    }

    // Mafia wins: Mafia count >= remaining alive players / 2
    if (aliveMafia.length >= aliveOthers.length) {
        showWinner('Mafia');
        return true;
    }

    return false;
}

// ================================
// WINNER
// ================================

function showWinner(winnerTeam) {
    gameState.gameEnded = true;
    saveGame('mafia', gameState);

    document.getElementById('winner-title').textContent = `${winnerTeam} Win!`;

    // Display final roles
    const container = document.getElementById('final-roles-list');
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const itemDiv = createElement('div', {
            classes: ['final-role-item', player.isAlive ? '' : 'dead']
        });

        const roleData = getRoleData(player.role);
        const roleClass = player.role;

        itemDiv.innerHTML = `
      <span class="player-name">${player.name}</span>
      <span class="role-badge ${roleClass}">${roleData.name}</span>
    `;

        container.appendChild(itemDiv);
    });

    showScreen('screen-winner');
    showConfetti(document.getElementById('confetti-container'), 100);
}

function playAgain() {
    clearGame('mafia');
    location.reload();
}

// ================================
// SCREEN NAVIGATION
// ================================

function showScreen(screenId) {
    const screens = ['screen-setup', 'screen-role-viewing', 'screen-role-card', 'screen-gm-overview', 'screen-night', 'screen-day', 'screen-winner'];
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
