// ================================
// MAFIA - GAME LOGIC
// ================================

// Game State
let gameState = {
    gameId: null,
    totalPlayers: 5,
    roleConfig: {
        doctor: 1,
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
    if (decMafia) decMafia.onclick = () => adjustRoleCount('mafia', -1);
    if (incMafia) incMafia.onclick = () => adjustRoleCount('mafia', 1);

    // Doctor count adjustment
    const decDoc = document.getElementById('decrease-doctor');
    const incDoc = document.getElementById('increase-doctor');
    if (decDoc) decDoc.onclick = () => adjustRoleCount('doctor', -1);
    if (incDoc) incDoc.onclick = () => adjustRoleCount('doctor', 1);

    // Detective count adjustment
    const decDet = document.getElementById('decrease-detective');
    const incDet = document.getElementById('increase-detective');
    if (decDet) decDet.onclick = () => adjustRoleCount('detective', -1);
    if (incDet) incDet.onclick = () => adjustRoleCount('detective', 1);

    // Jester count adjustment
    const decJes = document.getElementById('decrease-jester');
    const incJes = document.getElementById('increase-jester');
    if (decJes) decJes.onclick = () => adjustRoleCount('jester', -1);
    if (incJes) incJes.onclick = () => adjustRoleCount('jester', 1);

    // Bomber count adjustment
    const decBom = document.getElementById('decrease-bomber');
    const incBom = document.getElementById('increase-bomber');
    if (decBom) decBom.onclick = () => adjustRoleCount('bomber', -1);
    if (incBom) incBom.onclick = () => adjustRoleCount('bomber', 1);

    // Lover count adjustment
    const decLov = document.getElementById('decrease-lover');
    const incLov = document.getElementById('increase-lover');
    if (decLov) decLov.onclick = () => adjustRoleCount('lover', -1);
    if (incLov) incLov.onclick = () => adjustRoleCount('lover', 1);

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
    const openRulesBtn = document.getElementById('open-rules-btn');

    if (startBtn) startBtn.onclick = startGame;
    if (revealBtn) revealBtn.onclick = showRoleCard;
    if (doneBtn) doneBtn.onclick = nextViewer;
    if (startNightBtn) startNightBtn.onclick = startNightPhase;
    if (endNightBtn) endNightBtn.onclick = showMorningPhase;
    if (startDiscussionBtn) startDiscussionBtn.onclick = startDayPhase;
    if (confirmElimBtn) confirmElimBtn.onclick = confirmEliminations;
    if (skipDayBtn) skipDayBtn.onclick = skipElimination;
    if (playAgainBtn) playAgainBtn.onclick = playAgain;
    if (openRulesBtn) openRulesBtn.onclick = openRules;
}

// ================================
// SETUP SCREEN
// ================================

function adjustPlayerCount(delta) {
    let newValue = gameState.totalPlayers + delta;
    newValue = Math.max(5, Math.min(15, newValue));

    gameState.totalPlayers = newValue;
    document.getElementById('player-count-display').textContent = newValue;

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

function adjustRoleCount(role, delta) {
    let newValue = gameState.roleConfig[role] + delta;
    newValue = Math.max(0, Math.min(5, newValue));

    gameState.roleConfig[role] = newValue;
    const display = document.getElementById(`${role}-count-display`);
    if (display) display.textContent = newValue;

    updateRoleDistribution();
}

function updateRoleDistribution() {
    const total = gameState.totalPlayers;
    const sum = gameState.roleConfig.doctor +
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

    roles.push('doctor');
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
    document.body.classList.remove('day');
    document.body.classList.add('night');
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
    instructions.push('😇 Doctor wake up! Who are we saving tonight? Doctor, go to sleep.');

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

    gameState.players.filter(p => !lover || p.id !== lover.id).forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline btn-full';
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
        pBtn.className = 'btn btn-outline btn-full mb-sm';
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
        // Check if Mafia won after night elimination
        if (gameState.gameEnded) return;
    }

    // Also check win conditions at start of day (in case Mafia >= Others now)
    if (checkWinConditions()) return;

    document.body.classList.remove('night');
    document.body.classList.add('day');
    showScreen('screen-day');
    displayDayPhase();
}

function displayDayPhase() {
    document.getElementById('day-round-number').textContent = gameState.currentRound;
    const container = document.getElementById('alive-players-container');
    container.innerHTML = '';
    gameState.votingQueue = [];

    gameState.players.filter(p => p.isAlive).forEach(p => {
        const item = document.createElement('div');
        item.className = 'elimination-item';
        item.id = `elim-${p.id}`;
        item.innerHTML = `
            <span class="player-name">${p.name}</span>
            <span class="player-status">Alive</span>
        `;
        item.onclick = () => togglePlayerSelection(p.id);
        container.appendChild(item);
    });

    updateEliminationButton();
}

function togglePlayerSelection(id) {
    const idx = gameState.votingQueue.indexOf(id);
    const item = document.getElementById(`elim-${id}`);

    if (idx > -1) {
        gameState.votingQueue.splice(idx, 1);
        item.classList.remove('selected');
    } else if (gameState.votingQueue.length < 2) {
        gameState.votingQueue.push(id);
        item.classList.add('selected');
    }

    updateEliminationButton();
}

function updateEliminationButton() {
    const btn = document.getElementById('confirm-elimination-btn');
    const count = gameState.votingQueue.length;
    btn.disabled = count === 0;
    btn.textContent = count === 0 ? 'Eliminate Selected' : `Eliminate ${count} Player${count > 1 ? 's' : ''}`;
}

function confirmEliminations() {
    const ids = gameState.votingQueue;

    if (ids.length < 1) return;

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
        showBannerNotification(`💖 SACRIFICE! ${lover.name} died for ${targetPlayer.name}`, 2500);
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
    container.innerHTML = '';

    gameState.players.filter(p => p.isAlive).forEach(player => {
        const row = document.createElement('div');
        row.className = 'bomber-target-row';
        row.innerHTML = `
            <span class="player-name">${player.name}</span>
            <button class="bomber-kill-btn" title="Eliminate ${player.name}">❌</button>
        `;

        const killBtn = row.querySelector('.bomber-kill-btn');
        killBtn.onclick = () => {
            // Immediate closure of modal
            hideElement('#bomber-modal');
            gameState.bomberTriggered = false;

            // Elimination logic
            eliminatePlayer(player.id, 'day'); // Treat as day elim to allow win check

            if (!gameState.gameEnded) {
                nextRound();
            }
        };

        container.appendChild(row);
    });

    showElement(modal);
}

function showBannerNotification(message, duration = 2000) {
    const banner = document.getElementById('notification-banner');
    if (!banner) return;

    banner.textContent = message;
    banner.classList.remove('hidden');

    setTimeout(() => {
        banner.classList.add('hidden');
    }, duration);
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
    document.getElementById('winner-title').textContent = `${team.toUpperCase()} WINS!`;
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
    document.body.classList.remove('night');
    document.body.classList.add('day');
    showScreen('screen-winner');
    createConfetti();
}

function createConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';

    // Create central burst sparkle
    const spark = document.createElement('div');
    spark.className = 'popper-spark';
    spark.style.left = '50%';
    spark.style.top = '50%';
    spark.style.transform = 'translate(-50%, -50%)';
    container.appendChild(spark);

    const colors = ['#F97316', '#FB923C', '#FDBA74', '#EA580C', '#C2410C'];

    const count = 60;
    for (let i = 0; i < count; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';

        // Random trajectory for burst
        const angle = (i / count) * 360 + (Math.random() * 20 - 10);
        const distance = 100 + Math.random() * 250;
        const tx = Math.cos(angle * Math.PI / 180) * distance;
        const ty = Math.sin(angle * Math.PI / 180) * distance;
        const rot = Math.random() * 720;

        confetti.style.setProperty('--tx', `${tx}px`);
        confetti.style.setProperty('--ty', `${ty}px`);
        confetti.style.setProperty('--rot', `${rot}deg`);

        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.top = '50%';
        confetti.style.left = '50%';

        container.appendChild(confetti);
    }
}

function openRules() { document.getElementById('rules-modal').classList.remove('hidden'); }
function closeRules() { document.getElementById('rules-modal').classList.add('hidden'); }

function playAgain() { location.reload(); }

function getRoleData(role) {
    const roleMap = {
        doctor: { name: 'Doctor', image: '../images/Doctor.png', description: 'Can save one life every night.' },
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
