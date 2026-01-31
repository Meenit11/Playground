// ================================
// UNDERCOVER - COMPLETE REDESIGN
// ================================

// Game State
let gameState = {
    totalPlayers: 4,
    players: [],
    mrWhiteCount: 1,
    spiesCount: 1,
    agentsCount: 2,
    currentPlayerIndex: 0,
    agentWord: '',
    spyWord: ''
};

// Word Pairs
const wordPairs = [
    { agent: "Coffee", spy: "Tea" },
    { agent: "Cat", spy: "Dog" },
    { agent: "Pizza", spy: "Burger" },
    { agent: "Summer", spy: "Winter" },
    { agent: "Book", spy: "Movie" },
    { agent: "Ocean", spy: "Lake" },
    { agent: "Guitar", spy: "Piano" },
    { agent: "Apple", spy: "Orange" },
    { agent: "Car", spy: "Bike" },
    { agent: "Doctor", spy: "Nurse" }
];

// DOM Elements
const playerCountDisplay = document.getElementById('player-count-display');
const playerNameInput = document.getElementById('player-name-input');
const playerList = document.getElementById('player-list');
const mrWhiteCountEl = document.getElementById('mrwhite-count');
const spiesCountEl = document.getElementById('spies-count');
const agentsCountEl = document.getElementById('agents-count');

const startGameBtn = document.getElementById('start-game-btn');
const rulesBtn = document.getElementById('rules-btn');
const rulesModal = document.getElementById('rules-modal');
const closeRulesBtn = document.getElementById('close-rules');
const modalOverlay = document.getElementById('modal-overlay');

const screenSetup = document.getElementById('screen-setup');
const screenRoleViewing = document.getElementById('screen-role-viewing');
const screenRoleDisplay = document.getElementById('screen-role-display');
const screenGameStart = document.getElementById('screen-game-start');

// ================================
// PLAYER COUNT CONTROLS
// ================================
document.getElementById('decrease-players').addEventListener('click', () => {
    if (gameState.totalPlayers > 4) {
        gameState.totalPlayers--;
        updatePlayerCount();
        calculateAgents();
    }
});

document.getElementById('increase-players').addEventListener('click', () => {
    gameState.totalPlayers++;
    updatePlayerCount();
    calculateAgents();
});

function updatePlayerCount() {
    playerCountDisplay.textContent = gameState.totalPlayers;
}

// ================================
// PLAYER NAME INPUT
// ================================
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && playerNameInput.value.trim()) {
        addPlayer(playerNameInput.value.trim());
        playerNameInput.value = '';
    }
});

function addPlayer(name) {
    if (gameState.players.length < gameState.totalPlayers) {
        gameState.players.push(name);
        renderPlayerList();
    }
}

function removePlayer(index) {
    gameState.players.splice(index, 1);
    renderPlayerList();
}

function renderPlayerList() {
    playerList.innerHTML = '';
    gameState.players.forEach((name, index) => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        chip.innerHTML = `
            ${name}
            <button class="remove-player" onclick="removePlayer(${index})">×</button>
        `;
        playerList.appendChild(chip);
    });
}

// Make removePlayer globally accessible
window.removePlayer = removePlayer;

// ================================
// ROLE COUNT CONTROLS
// ================================
document.getElementById('decrease-mrwhite').addEventListener('click', () => {
    if (gameState.mrWhiteCount > 0) {
        gameState.mrWhiteCount--;
        updateRoleCounts();
        calculateAgents();
    }
});

document.getElementById('increase-mrwhite').addEventListener('click', () => {
    if (gameState.mrWhiteCount + gameState.spiesCount < gameState.totalPlayers - 1) {
        gameState.mrWhiteCount++;
        updateRoleCounts();
        calculateAgents();
    }
});

document.getElementById('decrease-spies').addEventListener('click', () => {
    if (gameState.spiesCount > 0) {
        gameState.spiesCount--;
        updateRoleCounts();
        calculateAgents();
    }
});

document.getElementById('increase-spies').addEventListener('click', () => {
    if (gameState.mrWhiteCount + gameState.spiesCount < gameState.totalPlayers - 1) {
        gameState.spiesCount++;
        updateRoleCounts();
        calculateAgents();
    }
});

function updateRoleCounts() {
    mrWhiteCountEl.textContent = gameState.mrWhiteCount;
    spiesCountEl.textContent = gameState.spiesCount;
}

function calculateAgents() {
    gameState.agentsCount = gameState.totalPlayers - gameState.mrWhiteCount - gameState.spiesCount;
    agentsCountEl.textContent = gameState.agentsCount;

    // Ensure agents > (spy + mr white)
    if (gameState.agentsCount <= (gameState.mrWhiteCount + gameState.spiesCount)) {
        // Auto-adjust to maintain valid state
        const minAgents = gameState.mrWhiteCount + gameState.spiesCount + 1;
        gameState.totalPlayers = minAgents + gameState.mrWhiteCount + gameState.spiesCount;
        updatePlayerCount();
        calculateAgents();
    }
}

// ================================
// RULES MODAL
// ================================
rulesBtn.addEventListener('click', () => {
    rulesModal.classList.remove('hidden');
});

closeRulesBtn.addEventListener('click', () => {
    rulesModal.classList.add('hidden');
});

modalOverlay.addEventListener('click', () => {
    rulesModal.classList.add('hidden');
});

// ================================
// START GAME
// ================================
startGameBtn.addEventListener('click', () => {
    // Validation
    if (gameState.players.length !== gameState.totalPlayers) {
        alert(`Please add exactly ${gameState.totalPlayers} player names!`);
        return;
    }

    if (gameState.mrWhiteCount === 0 && gameState.spiesCount === 0) {
        alert('You need at least 1 Mr. White OR 1 Spy!');
        return;
    }

    if (gameState.agentsCount <= (gameState.mrWhiteCount + gameState.spiesCount)) {
        alert('Agents must be greater than Spy + Mr. White combined!');
        return;
    }

    assignRoles();
    showRoleViewing();
});

// ================================
// ROLE ASSIGNMENT
// ================================
function assignRoles() {
    // Select random word pair
    const wordPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    gameState.agentWord = wordPair.agent;
    gameState.spyWord = wordPair.spy;

    // Shuffle players
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);

    // Assign roles
    gameState.playerRoles = shuffled.map((name, index) => {
        let role, word;

        if (index < gameState.mrWhiteCount) {
            role = 'Mr. White';
            word = null;
        } else if (index < gameState.mrWhiteCount + gameState.spiesCount) {
            role = 'Spy';
            word = gameState.spyWord;
        } else {
            role = 'Agent';
            word = gameState.agentWord;
        }

        return { name, role, word };
    });

    gameState.currentPlayerIndex = 0;
}

// ================================
// ROLE VIEWING FLOW
// ================================
function showRoleViewing() {
    screenSetup.classList.add('hidden');
    screenRoleViewing.classList.remove('hidden');

    const nextViewerName = document.getElementById('next-viewer-name');
    nextViewerName.textContent = gameState.playerRoles[gameState.currentPlayerIndex].name;
}

document.getElementById('reveal-role-btn').addEventListener('click', () => {
    showRoleDisplay();
});

function showRoleDisplay() {
    screenRoleViewing.classList.add('hidden');
    screenRoleDisplay.classList.remove('hidden');

    const currentPlayer = gameState.playerRoles[gameState.currentPlayerIndex];

    // Set role image
    const roleImage = document.getElementById('role-image');
    const roleNameDisplay = document.getElementById('role-name-display');
    const wordDisplay = document.getElementById('word-display');
    const playerWord = document.getElementById('player-word');

    roleImage.src = `../images/${currentPlayer.role}.png`;
    roleNameDisplay.textContent = currentPlayer.role;

    if (currentPlayer.word) {
        wordDisplay.style.display = 'block';
        playerWord.textContent = currentPlayer.word;
    } else {
        wordDisplay.style.display = 'none';
    }
}

document.getElementById('next-player-btn').addEventListener('click', () => {
    gameState.currentPlayerIndex++;

    if (gameState.currentPlayerIndex < gameState.playerRoles.length) {
        showRoleViewing();
    } else {
        showGameStart();
    }
});

// ================================
// GAME START - SINGLE SPEAKER
// ================================
function showGameStart() {
    screenRoleDisplay.classList.add('hidden');
    screenGameStart.classList.remove('hidden');

    // Select ONE random player to start
    const randomIndex = Math.floor(Math.random() * gameState.playerRoles.length);
    const firstSpeaker = gameState.playerRoles[randomIndex].name;

    document.getElementById('first-speaker-name').textContent = firstSpeaker;
}

document.getElementById('end-game-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to end the game?')) {
        location.reload();
    }
});

// ================================
// INITIALIZE
// ================================
updatePlayerCount();
updateRoleCounts();
calculateAgents();
