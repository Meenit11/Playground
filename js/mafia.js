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
    gameEnded: false,
    pendingPhaseTransition: null,
    nightVictimId: null,
    votingQueue: [],
    loverTargetId: null,
    bomberTargetId: null,
    bomberTriggered: false
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
    const startNightBtn = document.getElementById('start-night-btn');
    const endNightBtn = document.getElementById('end-night-btn');
    const startDiscussionBtn = document.getElementById('start-discussion-btn');
    const confirmElimBtn = document.getElementById('confirm-elimination-btn');
    const skipDayBtn = document.getElementById('skip-elimination-btn');
    const playAgainBtn = document.getElementById('play-again-btn');

    if (startBtn) startBtn.onclick = startGame;
    if (revealBtn) revealBtn.onclick = showRoleCard;
    if (doneBtn) doneBtn.onclick = nextViewer;
    if (startNightBtn) startNightBtn.onclick = startNightPhase;
    if (endNightBtn) endNightBtn.onclick = showMorningPhase;
    if (startDiscussionBtn) startDiscussionBtn.onclick = startDayPhase;
    if (confirmElimBtn) confirmElimBtn.onclick = confirmEliminations;
    if (skipDayBtn) skipDayBtn.onclick = skipElimination;
    if (playAgainBtn) playAgainBtn.onclick = playAgain;
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
    if (!container) return;

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
            isAlive: true
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
    instructions.push('🏙️ City goes to sleep! Eyes shut, no peeking!');
    instructions.push('🔪 Mafia wake up! Choose your victim... Mafia, go to sleep.');
    instructions.push('😇 God wake up! Who are we saving tonight? God, go to sleep.');

    const aliveDetective = gameState.players.find(p => p.role === 'detective' && p.isAlive);
    if (aliveDetective) {
        instructions.push('🕵️ Detective wake up! Suspect someone... Detective, go to sleep.');
    }

    const aliveLover = gameState.players.find(p => p.role === 'lover' && p.isAlive);
    const lovContainer = document.getElementById('lover-selection-container');

    if (aliveLover && gameState.currentRound === 1) {
        instructions.push('💖 Lover wake up! Blow a flying kiss... Lover, go to sleep.');
        showElement(lovContainer);
        displayLoverSelection();
    } else {
        hideElement(lovContainer);
    }

    instructions.forEach(ins => {
        const li = document.createElement('li');
        li.textContent = ins;
        container.appendChild(li);
    });
}

function displayLoverSelection() {
    const container = document.getElementById('lover-target-list');
    container.innerHTML = '';
    const lover = gameState.players.find(p => p.role === 'lover');

    gameState.players.filter(p => p.id !== lover.id).forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-sm';
        btn.textContent = p.name;
        btn.onclick = () => {
            gameState.loverTargetId = p.id;
            updateLoverSelectionHighlight(btn, container);
        };
        if (gameState.loverTargetId === p.id) {
            btn.classList.add('btn-primary');
            btn.classList.remove('btn-outline');
        }
        container.appendChild(btn);
    });
}

function updateLoverSelectionHighlight(activeBtn, container) {
    container.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });
    activeBtn.classList.remove('btn-outline');
    activeBtn.classList.add('btn-primary');
}

function showMorningPhase() {
    showScreen('screen-morning-results');
    const container = document.getElementById('night-outcome-list');
    const announcement = document.getElementById('morning-announcement');
    const startDiscussionBtn = document.getElementById('start-discussion-btn');

    container.innerHTML = '';
    announcement.textContent = '☀️ EVERYONE wake up! Let’s see who survived the night...';
    startDiscussionBtn.disabled = true;
    gameState.nightVictimId = null;

    const noneBtn = document.createElement('button');
    noneBtn.className = 'btn btn-outline btn-full btn-lg mb-md';
    noneBtn.textContent = 'no one was found dead';
    noneBtn.onclick = () => {
        announcement.textContent = 'The city wakes up finding no one was found dead';
        gameState.nightVictimId = 'none';
        startDiscussionBtn.disabled = false;
        highlightSelection(noneBtn, container);
    };
    container.appendChild(noneBtn);

    gameState.players.filter(p => p.isAlive).forEach(p => {
        const pBtn = document.createElement('button');
        pBtn.className = 'btn btn-ghost btn-full mb-sm text-center';
        pBtn.textContent = p.name;
        pBtn.onclick = () => {
            const lover = gameState.players.find(p => p.role === 'lover');
            if (p.id === gameState.loverTargetId && lover && lover.isAlive) {
                announcement.textContent = `The city wakes up finding ${lover.name} dead (Sacrificed for ${p.name})`;
            } else {
                announcement.textContent = `The city wakes up finding ${p.name} dead`;
            }
            gameState.nightVictimId = p.id;
            startDiscussionBtn.disabled = false;
            highlightSelection(pBtn, container);
        };
        container.appendChild(pBtn);
    });
}

function highlightSelection(activeBtn, container) {
    container.querySelectorAll('button').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-outline');
    });
    activeBtn.classList.remove('btn-outline');
    activeBtn.classList.add('btn-primary');
}

function startDayPhase() {
    const victimId = gameState.nightVictimId;
    if (victimId && victimId !== 'none') {
        eliminatePlayer(victimId, 'night');
    }
    showScreen('screen-day');
    displayDayPhase();
}

function displayDayPhase() {
    document.getElementById('day-round-number').textContent = gameState.currentRound;
    const container = document.getElementById('alive-players-container');
    container.innerHTML = '';

    gameState.players.filter(p => p.isAlive).forEach(p => {
        const item = document.createElement('div');
        item.className = 'elimination-player-item';
        item.innerHTML = `
            <div class="player-selection-row" onclick="togglePlayerSelection('${p.id}')">
                <input type="checkbox" class="elimination-checkbox" id="check-${p.id}" data-player-id="${p.id}" onclick="event.stopPropagation(); updateEliminationButton();">
                <span class="player-name">${p.name}</span>
            </div>
        `;
        container.appendChild(item);
    });

    updateEliminationButton();
}

function togglePlayerSelection(id) {
    const cb = document.getElementById(`check-${id}`);
    if (cb) {
        cb.checked = !cb.checked;
        updateRowHighlights();
        updateEliminationButton();
    }
}

function updateRowHighlights() {
    document.querySelectorAll('.player-selection-row').forEach(row => {
        const cb = row.querySelector('input');
        if (cb.checked) row.classList.add('selected');
        else row.classList.remove('selected');
    });
}

function updateEliminationButton() {
    const checked = document.querySelectorAll('.elimination-checkbox:checked');
    const btn = document.getElementById('confirm-elimination-btn');
    btn.disabled = checked.length === 0 || checked.length > 2;
    updateRowHighlights();
}

function confirmEliminations() {
    const checked = document.querySelectorAll('.elimination-checkbox:checked');
    const ids = Array.from(checked).map(cb => cb.dataset.playerId);

    if (ids.length < 1 || ids.length > 2) {
        alert('You must eliminate either 1 or max 2 players!');
        return;
    }

    if (!confirm(`Eliminate ${ids.length} player(s)?`)) return;

    gameState.bomberTriggered = false;
    ids.forEach((id) => {
        eliminatePlayer(id, 'day');
    });

    if (!gameState.gameEnded && !gameState.bomberTriggered) {
        nextRound();
    }
}

function skipElimination() {
    if (confirm('End day phase without elimination?')) {
        nextRound();
    }
}

function eliminatePlayer(id, phase) {
    let finalId = id;
    const lover = gameState.players.find(p => p.role === 'lover');

    // LOVER SACRIFICE LOGIC
    if (id === gameState.loverTargetId && lover && lover.isAlive) {
        const targetPlayer = gameState.players.find(p => p.id === id);
        alert(`💖 SACRIFICE! ${lover.name} gave their life for ${targetPlayer.name}!`);
        finalId = lover.id;
    }

    const player = gameState.players.find(p => p.id === finalId);
    if (!player || !player.isAlive) return;

    player.isAlive = false;

    // JESTER: Win if voted out in Day phase
    if (phase === 'day' && player.role === 'jester') {
        showWinner('Jester');
        return;
    }

    // BOMBER: Only activate if voted out (Day phase)
    if (phase === 'day' && player.role === 'bomber') {
        gameState.bomberTriggered = true;
        showBomberModal();
        return;
    }

    checkWinConditions();
}

function showBomberModal() {
    const modal = document.getElementById('bomber-modal');
    const container = document.getElementById('bomber-target-list');
    const confirmBtn = document.getElementById('confirm-bomber-target');

    container.innerHTML = '';
    gameState.bomberTargetId = null;
    confirmBtn.disabled = true;

    gameState.players.filter(p => p.isAlive).forEach(player => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-full mb-sm text-center';
        btn.textContent = player.name;
        btn.onclick = () => {
            gameState.bomberTargetId = player.id;
            confirmBtn.disabled = false;
            highlightSelection(btn, container);
        };
        container.appendChild(btn);
    });

    confirmBtn.onclick = () => {
        if (gameState.bomberTargetId) {
            const targetId = gameState.bomberTargetId;
            gameState.bomberTargetId = null;
            gameState.bomberTriggered = false;
            hideElement('bomber-modal');

            eliminatePlayer(targetId, 'bomber');

            if (!gameState.gameEnded) {
                nextRound();
            }
        }
    };

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

function playAgain() { location.reload(); }

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
    const screens = ['screen-setup', 'screen-role-viewing', 'screen-role-card', 'screen-gm-overview', 'screen-night', 'screen-morning-results', 'screen-day', 'screen-winner'];
    screens.forEach(s => {
        const el = document.getElementById(s);
        if (el) {
            if (s === id) { el.classList.remove('hidden'); el.classList.add('animate-fadeIn'); }
            else { el.classList.add('hidden'); }
        }
    });
}
