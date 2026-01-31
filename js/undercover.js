// ================================
// UNDERCOVER - COMPLETE GAME LOGIC
// ================================

// Game State
let gameState = {
    totalPlayers: 4,
    players: [],
    mrWhiteCount: 1,
    spiesCount: 0,
    agentsCount: 3,
    currentPlayerIndex: 0,
    agentWord: '',
    spyWord: '',
    wordPairs: [],
    playerRoles: [],
    alivePlayers: [],
    startPlayerIndex: 0,
    eliminatedMrWhite: null
};

// Load words from JSON
async function loadWords() {
    try {
        const response = await fetch('../words.json');
        const data = await response.json();
        gameState.wordPairs = data.word_pairs;
    } catch (error) {
        console.error('Error loading words:', error);
        gameState.wordPairs = [
            ["Coffee", "Tea"],
            ["Cat", "Dog"],
            ["Pizza", "Burger"]
        ];
    }
}

loadWords();

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
const screenElimination = document.getElementById('screen-elimination');
const screenRoleReveal = document.getElementById('screen-role-reveal');
const screenMrWhiteGuess = document.getElementById('screen-mrwhite-guess');
const screenGameOver = document.getElementById('screen-game-over');

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

    if (gameState.agentsCount <= (gameState.mrWhiteCount + gameState.spiesCount)) {
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
// ROLE ASSIGNMENT - SEQUENTIAL
// ================================
function assignRoles() {
    const randomPair = gameState.wordPairs[Math.floor(Math.random() * gameState.wordPairs.length)];
    gameState.agentWord = randomPair[0];
    gameState.spyWord = randomPair[1];

    // Shuffle players
    const shuffled = [...gameState.players].sort(() => Math.random() - 0.5);

    // Assign roles
    gameState.playerRoles = shuffled.map((name, index) => {
        let actualRole, word, displayRole;

        if (index < gameState.mrWhiteCount) {
            actualRole = 'Mr. White';
            displayRole = 'Mr. White';
            word = null;
        } else if (index < gameState.mrWhiteCount + gameState.spiesCount) {
            actualRole = 'Spy';
            displayRole = 'Spy / Agent';
            word = gameState.spyWord;
        } else {
            actualRole = 'Agent';
            displayRole = 'Spy / Agent';
            word = gameState.agentWord;
        }

        return { name, actualRole, displayRole, word, isAlive: true };
    });

    // Select random starting player
    gameState.startPlayerIndex = Math.floor(Math.random() * gameState.playerRoles.length);
    gameState.currentPlayerIndex = gameState.startPlayerIndex;
    gameState.alivePlayers = [...gameState.playerRoles];
}

// ================================
// SEQUENTIAL ROLE VIEWING
// ================================
function showRoleViewing() {
    hideAllScreens();
    screenRoleViewing.classList.remove('hidden');

    const currentIndex = gameState.currentPlayerIndex;
    const totalPlayers = gameState.playerRoles.length;
    const sequentialIndex = (gameState.startPlayerIndex + currentIndex) % totalPlayers;

    const nextViewerName = document.getElementById('next-viewer-name');
    nextViewerName.textContent = gameState.playerRoles[sequentialIndex].name;
}

document.getElementById('reveal-role-btn').addEventListener('click', () => {
    showRoleDisplay();
});

function showRoleDisplay() {
    hideAllScreens();
    screenRoleDisplay.classList.remove('hidden');

    const totalPlayers = gameState.playerRoles.length;
    const sequentialIndex = (gameState.startPlayerIndex + gameState.currentPlayerIndex) % totalPlayers;
    const currentPlayer = gameState.playerRoles[sequentialIndex];

    const roleImage = document.getElementById('role-image');
    const roleNameDisplay = document.getElementById('role-name-display');
    const roleDescription = document.getElementById('role-description');
    const wordDisplay = document.getElementById('word-display');
    const playerWord = document.getElementById('player-word');
    const nextPlayerBtn = document.getElementById('next-player-btn');
    const nextPlayerName = document.getElementById('next-player-name');

    if (currentPlayer.actualRole === 'Mr. White') {
        roleImage.src = '../images/Mr. White.png';
        roleNameDisplay.textContent = "You're Mr. White";
        roleDescription.textContent = "You are Mr. White. Blend in and guess the word!";
        wordDisplay.style.display = 'none';
    } else {
        roleImage.src = '../images/Spy Agent.png';
        roleNameDisplay.textContent = "Spy / Agent";
        roleDescription.textContent = "You may be Spy or Agent. Be clever!";
        wordDisplay.style.display = 'block';
        playerWord.textContent = currentPlayer.word;
    }

    // Update next button
    if (gameState.currentPlayerIndex < gameState.playerRoles.length - 1) {
        const nextIndex = (gameState.startPlayerIndex + gameState.currentPlayerIndex + 1) % totalPlayers;
        nextPlayerName.textContent = gameState.playerRoles[nextIndex].name;
    } else {
        nextPlayerName.textContent = 'Game Master';
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
// GAME START - RANDOM SPEAKER
// ================================
function showGameStart() {
    hideAllScreens();
    screenGameStart.classList.remove('hidden');

    const aliveIndexes = gameState.alivePlayers.map((p, i) => i);
    const randomIndex = aliveIndexes[Math.floor(Math.random() * aliveIndexes.length)];
    const currentSpeaker = gameState.alivePlayers[randomIndex].name;

    document.getElementById('current-speaker-name').textContent = currentSpeaker;
}

// ================================
// ELIMINATION
// ================================
document.getElementById('eliminate-btn').addEventListener('click', () => {
    showEliminationScreen();
});

function showEliminationScreen() {
    hideAllScreens();
    screenElimination.classList.remove('hidden');

    const eliminationList = document.getElementById('player-elimination-list');
    eliminationList.innerHTML = '';

    gameState.alivePlayers.forEach((player, index) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'elimination-player';
        playerDiv.innerHTML = `
            <span class="elimination-player-name">${player.name}</span>
            <span class="elimination-player-status">Alive</span>
        `;
        playerDiv.addEventListener('click', () => eliminatePlayer(index));
        eliminationList.appendChild(playerDiv);
    });
}

function eliminatePlayer(index) {
    const eliminatedPlayer = gameState.alivePlayers[index];
    gameState.alivePlayers.splice(index, 1);

    // Show role reveal
    showRoleReveal(eliminatedPlayer);
}

// ================================
// ROLE REVEAL AFTER ELIMINATION
// ================================
function showRoleReveal(player) {
    hideAllScreens();
    screenRoleReveal.classList.remove('hidden');

    document.getElementById('eliminated-player-name').textContent = player.name;
    document.getElementById('eliminated-role-image').src = `../images/${player.actualRole}.png`;
    document.getElementById('eliminated-role-name').textContent = player.actualRole;

    // Store if Mr. White was eliminated
    if (player.actualRole === 'Mr. White') {
        gameState.eliminatedMrWhite = player;
    }
}

document.getElementById('continue-after-elimination-btn').addEventListener('click', () => {
    // Check if Mr. White was just eliminated
    if (gameState.eliminatedMrWhite) {
        showMrWhiteGuess();
        return;
    }

    // Check win conditions
    checkWinConditions();
});

// ================================
// MR. WHITE GUESS
// ================================
function showMrWhiteGuess() {
    hideAllScreens();
    screenMrWhiteGuess.classList.remove('hidden');

    document.getElementById('mrwhite-guess-input').value = '';
}

document.getElementById('submit-guess-btn').addEventListener('click', () => {
    const guess = document.getElementById('mrwhite-guess-input').value.trim().toLowerCase();

    // Check if all agents are dead
    const aliveAgents = gameState.alivePlayers.filter(p => p.actualRole === 'Agent');
    const wordToGuess = aliveAgents.length === 0 ? gameState.spyWord : gameState.agentWord;

    if (guess === wordToGuess.toLowerCase()) {
        showGameOver('Mr. White Wins!', 'Mr. White correctly guessed the word!');
    } else {
        gameState.eliminatedMrWhite = null;
        checkWinConditions();
    }
});

// ================================
// WIN CONDITIONS
// ================================
function checkWinConditions() {
    const aliveAgents = gameState.alivePlayers.filter(p => p.actualRole === 'Agent');
    const aliveSpies = gameState.alivePlayers.filter(p => p.actualRole === 'Spy');
    const aliveMrWhite = gameState.alivePlayers.filter(p => p.actualRole === 'Mr. White');

    // Agents win: All Spy + Mr. White eliminated
    if (aliveSpies.length === 0 && aliveMrWhite.length === 0) {
        showGameOver('Agents Win!', 'All Spies and Mr. White have been eliminated!');
        return;
    }

    // Spy wins: Mr. White eliminated AND Spy >= Agents
    if (aliveMrWhite.length === 0 && aliveSpies.length >= aliveAgents.length) {
        showGameOver('Spy Wins!', 'Spies outnumber the Agents!');
        return;
    }

    // Continue game
    gameState.eliminatedMrWhite = null;
    showGameStart();
}

// ================================
// GAME OVER
// ================================
function showGameOver(title, message) {
    hideAllScreens();
    screenGameOver.classList.remove('hidden');

    document.getElementById('winner-title').textContent = title;
    document.getElementById('winner-message').textContent = message;
    document.getElementById('reveal-agent-word').textContent = gameState.agentWord;
    document.getElementById('reveal-spy-word').textContent = gameState.spyWord;
}

document.getElementById('play-again-btn').addEventListener('click', () => {
    location.reload();
});

document.getElementById('end-game-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to end the game?')) {
        location.reload();
    }
});

// ================================
// UTILITY
// ================================
function hideAllScreens() {
    [screenSetup, screenRoleViewing, screenRoleDisplay, screenGameStart,
        screenElimination, screenRoleReveal, screenMrWhiteGuess, screenGameOver].forEach(screen => {
            screen.classList.add('hidden');
        });
}

// ================================
// INITIALIZE
// ================================
updatePlayerCount();
updateRoleCounts();
calculateAgents();
