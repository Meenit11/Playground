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
    gameEnded: false,
    nightActions: {
        mafiaTarget: null,
        godTarget: null
    }
};

// ================================
// INITIALIZATION
// ================================

function init() {
    console.log('Mafia initializing...');

    // Reset state for new session
    gameState.gameEnded = false;

    // Explicitly call to generate default inputs
    const playerInput = document.getElementById('player-count-input');
    if (playerInput) {
        gameState.totalPlayers = parseInt(playerInput.value) || 5;
    }

    setupEventListeners();
    generatePlayerInputs(gameState.totalPlayers);
    updateRoleDistribution();
    console.log('Mafia setup complete');
}

// Run init immediately and on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ================================
// EVENT LISTENERS
// ================================

function setupEventListeners() {
    // Player count adjustment
    const decBtn = document.getElementById('decrease-players');
    const incBtn = document.getElementById('increase-players');
    if (decBtn) decBtn.onclick = () => adjustPlayerCount(-1);
    if (incBtn) incBtn.onclick = () => adjustPlayerCount(1);

    // Mafia count adjustment
    const decMafia = document.getElementById('decrease-mafia');
    const incMafia = document.getElementById('increase-mafia');
    if (decMafia) decMafia.onclick = () => adjustMafiaCount(-1);
    if (incMafia) incMafia.onclick = () => adjustMafiaCount(1);

    // Role toggles
    const detToggle = document.getElementById('detective-toggle');
    const jesToggle = document.getElementById('jester-toggle');
    const bomToggle = document.getElementById('bomber-toggle');
    const lovToggle = document.getElementById('lover-toggle');
    if (detToggle) detToggle.onchange = (e) => toggleRole('detective', e.target.checked);
    if (jesToggle) jesToggle.onchange = (e) => toggleRole('jester', e.target.checked);
    if (bomToggle) bomToggle.onchange = (e) => toggleRole('bomber', e.target.checked);
    if (lovToggle) lovToggle.onchange = (e) => toggleRole('lover', e.target.checked);

    // Navigation Buttons
    const startBtn = document.getElementById('start-game-btn');
    const revealBtn = document.getElementById('reveal-role-btn');
    const doneBtn = document.getElementById('done-viewing-btn');
    const endNightBtn = document.getElementById('end-night-btn');
    const calcBtn = document.getElementById('calc-night-btn');
    const proceedBtn = document.getElementById('proceed-to-day-btn');
    const confirmElimBtn = document.getElementById('confirm-elimination-btn');
    const skipDayBtn = document.getElementById('skip-elimination-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const closeRevealBtn = document.getElementById('close-reveal-btn');

    if (startBtn) startBtn.onclick = startGame;
    if (revealBtn) revealBtn.onclick = showRoleCard;
    if (doneBtn) doneBtn.onclick = nextViewer;
    if (endNightBtn) endNightBtn.onclick = showNightResults;
    if (calcBtn) calcBtn.onclick = processNightResult;
    if (proceedBtn) proceedBtn.onclick = startDayPhase;
    if (confirmElimBtn) confirmElimBtn.onclick = confirmEliminations;
    if (skipDayBtn) skipDayBtn.onclick = skipElimination;
    if (playAgainBtn) playAgainBtn.onclick = playAgain;
    if (closeRevealBtn) closeRevealBtn.onclick = () => hideElement('reveal-modal');
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
    console.log('Generating inputs for', count, 'players');
    const container = document.getElementById('player-names-container');
    if (!container) {
        console.error('Container not found!');
        return;
    }

    // Save existing names
    const existingInputs = container.querySelectorAll('input');
    const savedNames = Array.from(existingInputs).map(input => input.value);

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player-name-input';
        playerDiv.innerHTML = `
            <div class="player-number">${i + 1}</div>
            <input type="text" placeholder="Player ${i + 1}" data-player-index="${i}" value="${savedNames[i] || ''}">
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

    document.getElementById('decrease-mafia').disabled = (newValue <= 0);
    document.getElementById('increase-mafia').disabled = (newValue >= 5);

    updateRoleDistribution();
}

function toggleRole(role, isEnabled) {
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

    const countEl = document.getElementById('civilian-count');
    if (countEl) countEl.textContent = civilians;

    const startBtn = document.getElementById('start-game-btn');
    if (civilians < 1) {
        if (startBtn) startBtn.disabled = true;
        if (countEl) countEl.style.color = 'var(--danger)';
    } else {
        if (startBtn) startBtn.disabled = false;
        if (countEl) countEl.style.color = 'var(--accent)';
    }
}

// ================================
// GAME START
// ================================

function startGame() {
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

    assignRoles(names);

    // Random viewing order
    const randomStartIndex = getRandomInt(0, gameState.totalPlayers - 1);
    gameState.viewingOrder = [];
    for (let i = 0; i < gameState.totalPlayers; i++) {
        gameState.viewingOrder.push((randomStartIndex + i) % gameState.totalPlayers);
    }
    gameState.currentViewIndex = 0;

    gameState.gameId = generateId().slice(0, 8).toUpperCase();
    saveGame('mafia', gameState);

    showScreen('screen-role-viewing');
    showNextViewer();
}

function assignRoles(names) {
    gameState.players = [];
    const roles = [];

    roles.push('god');
    for (let i = 0; i < gameState.roleConfig.mafia; i++) roles.push('mafia');
    if (gameState.roleConfig.detective) roles.push('detective');
    if (gameState.roleConfig.jester) roles.push('jester');
    if (gameState.roleConfig.bomber) roles.push('bomber');
    if (gameState.roleConfig.lover) roles.push('lover');
    for (let i = 0; i < gameState.roleConfig.civilian; i++) roles.push('civilian');

    const shuffledRoles = shuffleArray(roles);

    names.forEach((name, index) => {
        gameState.players.push({
            id: generateId(),
            name: name,
            role: shuffledRoles[index],
            isAlive: true,
            loverProtectedTarget: null
        });
    });
}

// ================================
// ROLE VIEWING
// ================================

function showNextViewer() {
    if (gameState.currentViewIndex >= gameState.viewingOrder.length) {
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
    const roleData = getRoleData(player.role);

    document.getElementById('role-image').src = roleData.image;
    document.getElementById('role-name').textContent = roleData.name;
    document.getElementById('role-description').textContent = roleData.description;

    showScreen('screen-role-card');
    updatePassPhoneButton();
}

function updatePassPhoneButton() {
    const nextPlayerSpan = document.getElementById('next-player-name');
    const nextIndex = gameState.currentViewIndex + 1;

    if (nextIndex >= gameState.viewingOrder.length) {
        nextPlayerSpan.textContent = 'Game Master';
    } else {
        const nextPlayerIndex = gameState.viewingOrder[nextPlayerSpan.textContent === 'Game Master' ? 0 : nextIndex]; // Fallback
        const nextPlayerIdx = gameState.viewingOrder[nextIndex];
        const nextPlayer = gameState.players[nextPlayerIdx];
        nextPlayerSpan.textContent = nextPlayer.name;
    }
}

function nextViewer() {
    gameState.currentViewIndex++;
    saveGame('mafia', gameState);
    showNextViewer();
}

// ================================
// GAME PHASES
// ================================

function displayGMOverview() {
    const container = document.getElementById('all-roles-list');
    container.innerHTML = '';

    gameState.players.forEach(player => {
        const roleData = getRoleData(player.role);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'role-grid-item';
        itemDiv.innerHTML = `
            <div class="player-name-header">${player.name}</div>
            <img src="${roleData.image}" alt="${roleData.name}" class="role-image-small">
            <div class="role-name-badge ${player.role}">${roleData.name}</div>
        `;
        container.appendChild(itemDiv);
    });
}

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
    instructions.push('<strong>City goes to sleep:</strong> "Everyone close your eyes"');

    const aliveMafia = gameState.players.filter(p => p.role === 'mafia' && p.isAlive);
    if (aliveMafia.length > 0) {
        instructions.push(`<strong>Mafia wakes up:</strong> "Mafia, open your eyes"`);
        instructions.push('<strong>Kill someone:</strong> Mafia silently agrees on a victim');
        instructions.push('<strong>Mafia close your eyes</strong>');
    }

    instructions.push('<strong>God open your eyes:</strong> God silently picks someone to save');
    instructions.push('<strong>God close your eyes</strong>');

    const aliveDetective = gameState.players.find(p => p.role === 'detective' && p.isAlive);
    if (aliveDetective) {
        instructions.push('<strong>Detective open your eyes:</strong> Detective points to someone');
        instructions.push('<strong>GM nods Yes/No</strong>');
        instructions.push('<strong>Detective close your eyes</strong>');
    }

    instructions.forEach(ins => {
        const li = document.createElement('li');
        li.innerHTML = ins;
        container.appendChild(li);
    });
}

function showNightResults() {
    showScreen('screen-night-results');

    const mSelect = document.getElementById('mafia-target-select');
    const gSelect = document.getElementById('god-target-select');

    mSelect.innerHTML = '<option value="">Select Victim...</option>';
    gSelect.innerHTML = '<option value="">Select Player...</option>';

    gameState.players.filter(p => p.isAlive).forEach(p => {
        mSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        gSelect.innerHTML += `<option value="${p.id}">${p.name} (God Save)</option>`;
    });

    hideElement('night-calc-result');
    hideElement('proceed-to-day-btn');
    showElement('calc-night-btn');
}

function processNightResult() {
    const mId = document.getElementById('mafia-target-select').value;
    const gId = document.getElementById('god-target-select').value;

    if (!mId || !gId) {
        alert('Please select both targets!');
        return;
    }

    const resBox = document.getElementById('night-calc-result');
    const resText = document.getElementById('night-result-text');

    showElement(resBox);

    if (mId === gId) {
        resText.textContent = "🛡️ No one was killed! (God saved the target)";
    } else {
        const victim = gameState.players.find(p => p.id === mId);
        resText.textContent = `💀 ${victim.name} was killed by Mafia!`;
        eliminatePlayer(victim.id, 'night');
    }

    hideElement('calc-night-btn');
    showElement('proceed-to-day-btn');
}

function startDayPhase() {
    showScreen('screen-day');
    displayDayPhase();
}

function displayDayPhase() {
    document.getElementById('day-round-number').textContent = gameState.currentRound;
    const aliveCount = gameState.players.filter(p => p.isAlive).length;
    document.getElementById('alive-count').textContent = aliveCount;

    const container = document.getElementById('alive-players-container');
    container.innerHTML = '';

    gameState.players.filter(p => p.isAlive).forEach(p => {
        const item = document.createElement('div');
        item.className = 'elimination-player-item';
        item.innerHTML = `
            <label class="elimination-label">
                <input type="checkbox" class="elimination-checkbox" data-player-id="${p.id}">
                <span class="player-name">${p.name}</span>
            </label>
        `;
        container.appendChild(item);
    });

    document.querySelectorAll('.elimination-checkbox').forEach(cb => {
        cb.onchange = updateEliminationButton;
    });
    updateEliminationButton();
}

function updateEliminationButton() {
    const checked = document.querySelectorAll('.elimination-checkbox:checked');
    const btn = document.getElementById('confirm-elimination-btn');
    btn.disabled = checked.length === 0;
}

function confirmEliminations() {
    const checked = document.querySelectorAll('.elimination-checkbox:checked');
    const ids = Array.from(checked).map(cb => cb.dataset.playerId);

    if (ids.length > 2) {
        alert('You can only eliminate up to 2 players per round!');
        return;
    }

    if (!confirm(`Eliminate ${ids.length} player(s)?`)) return;

    ids.forEach(id => eliminatePlayer(id, 'day'));

    if (!gameState.gameEnded) {
        nextRound();
    }
}

function skipElimination() {
    if (confirm('End day phase without further voting?')) {
        nextRound();
    }
}

function eliminatePlayer(id, phase) {
    const player = gameState.players.find(p => p.id === id);
    if (!player || !player.isAlive) return;

    player.isAlive = false;
    revealPlayerRole(player);

    if (phase === 'day' && player.role === 'jester') {
        showWinner('Jester');
        return;
    }

    if (phase === 'day' && player.role === 'bomber') {
        showBomberModal();
        return;
    }

    checkWinConditions();
}

function revealPlayerRole(player) {
    const modal = document.getElementById('reveal-modal');
    const nameEl = document.getElementById('reveal-player-name');
    const imgEl = document.getElementById('reveal-role-img');
    const roleEl = document.getElementById('reveal-role-name');

    nameEl.textContent = player.name;
    const data = getRoleData(player.role);
    imgEl.src = data.image;
    roleEl.textContent = data.name;

    showElement(modal);
}

function checkWinConditions() {
    const alive = gameState.players.filter(p => p.isAlive);
    const mafia = alive.filter(p => p.role === 'mafia');
    const others = alive.filter(p => p.role !== 'mafia');

    if (mafia.length === 0) {
        showWinner('Civilians');
        return true;
    }

    if (mafia.length >= others.length) {
        showWinner('Mafia');
        return true;
    }

    return false;
}

function showWinner(team) {
    gameState.gameEnded = true;
    document.getElementById('winner-title').textContent = `${team} Wins!`;

    const list = document.getElementById('final-roles-list');
    list.innerHTML = '';
    gameState.players.forEach(p => {
        const data = getRoleData(p.role);
        list.innerHTML += `
            <div class="final-role-item ${p.isAlive ? '' : 'dead'}">
                <span class="player-name">${p.name}</span>
                <span class="role-badge ${p.role}">${data.name}</span>
            </div>
        `;
    });

    showScreen('screen-winner');
    showConfetti(document.getElementById('confetti-container'), 100);
}

function nextRound() {
    gameState.currentRound++;
    startNightPhase();
}

function playAgain() {
    location.reload();
}

// ================================
// UTILS & DATA
// ================================

function getRoleData(role) {
    const roleMap = {
        god: { name: 'God', image: '../images/God.png', description: 'Can save one life every night.' },
        mafia: { name: 'Mafia', image: '../images/Mafia.png', description: 'Eliminate civilians at night.' },
        detective: { name: 'Detective', image: '../images/Detective.png', description: 'Suspect players to find Mafia.' },
        jester: { name: 'Jester', image: '../images/Jester.png', description: 'Try to get voted out to win!' },
        bomber: { name: 'Bomber', image: '../images/Bomber.png', description: 'Take someone with you if voted out.' },
        lover: { name: 'Lover', image: '../images/Lover.png', description: 'Protects someone by sacrifice.' },
        civilian: { name: 'Civilian', image: '../images/Civilian.png', description: 'Find the Mafia!' }
    };
    return roleMap[role] || roleMap.civilian;
}

function showScreen(id) {
    const screens = ['screen-setup', 'screen-role-viewing', 'screen-role-card', 'screen-gm-overview', 'screen-night', 'screen-night-results', 'screen-day', 'screen-winner'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) {
            if (s === id) {
                el.classList.remove('hidden');
                el.classList.add('animate-fadeIn');
            } else {
                el.classList.add('hidden');
            }
        }
    });
}
