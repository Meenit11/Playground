// ================================
// MEENIT'S PLAYGROUND - UTILITY FUNCTIONS
// Shared utilities for all games
// ================================

// ================================
// LOCAL STORAGE MANAGEMENT
// ================================

/**
 * Save game state to LocalStorage
 * @param {string} gameType - Game identifier (odd-one-in, undercover, mafia)
 * @param {object} data - Game data to save
 */
function saveGame(gameType, data) {
  try {
    const key = `meenit-${gameType}`;
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`Game saved: ${gameType}`, data);
    return true;
  } catch (error) {
    console.error('Error saving game:', error);
    return false;
  }
}

/**
 * Load game state from LocalStorage
 * @param {string} gameType - Game identifier
 * @returns {object|null} Game data or null if not found
 */
function loadGame(gameType) {
  try {
    const key = `meenit-${gameType}`;
    const data = localStorage.getItem(key);
    if (data) {
      console.log(`Game loaded: ${gameType}`);
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error loading game:', error);
    return null;
  }
}

/**
 * Clear game state from LocalStorage
 * @param {string} gameType - Game identifier
 */
function clearGame(gameType) {
  try {
    const key = `meenit-${gameType}`;
    localStorage.removeItem(key);
    console.log(`Game cleared: ${gameType}`);
    return true;
  } catch (error) {
    console.error('Error clearing game:', error);
    return false;
  }
}

// ================================
// RANDOM UTILITIES
// ================================

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array (new copy)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get random item from array
 * @param {Array} array - Source array
 * @returns {*} Random item
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ================================
// ANIMATION HELPERS
// ================================

/**
 * Play tap animation on button
 * @param {HTMLElement} element - Element to animate
 */
function playTapAnimation(element) {
  element.style.animation = 'none';
  setTimeout(() => {
    element.style.animation = 'tapBounce 0.3s ease-out';
  }, 10);
  
  setTimeout(() => {
    element.style.animation = '';
  }, 310);
}

/**
 * Show confetti animation
 * @param {HTMLElement} container - Container for confetti
 * @param {number} count - Number of confetti pieces (default: 50)
 */
function showConfetti(container, count = 50) {
  const colors = ['#8B5CF6', '#EC4899', '#F97316', '#10B981', '#3B82F6', '#FBBF24'];
  
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.cssText = `
      position: fixed;
      width: ${getRandomInt(5, 15)}px;
      height: ${getRandomInt(5, 15)}px;
      background-color: ${getRandomItem(colors)};
      left: ${getRandomInt(0, 100)}%;
      top: -20px;
      opacity: 1;
      animation: confettiFall ${getRandomInt(2000, 4000)}ms linear forwards;
      animation-delay: ${getRandomInt(0, 500)}ms;
      z-index: 1000;
      pointer-events: none;
    `;
    
    container.appendChild(confetti);
    
    // Remove after animation
    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }
}

/**
 * Shake element for error feedback
 * @param {HTMLElement} element - Element to shake
 */
function shakeElement(element) {
  element.classList.add('animate-shake');
  setTimeout(() => {
    element.classList.remove('animate-shake');
  }, 500);
}

/**
 * Pulse element for waiting states
 * @param {HTMLElement} element - Element to pulse
 * @param {boolean} enable - True to enable, false to disable
 */
function pulseElement(element, enable = true) {
  if (enable) {
    element.classList.add('animate-pulse');
  } else {
    element.classList.remove('animate-pulse');
  }
}

/**
 * Add ripple effect to button click
 * @param {HTMLElement} button - Button element
 * @param {Event} event - Click event
 */
function addRippleEffect(button, event) {
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 50%;
    pointer-events: none;
    animation: ripple 0.6s ease-out;
  `;
  
  button.style.position = 'relative';
  button.style.overflow = 'hidden';
  button.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

// ================================
// VALIDATION
// ================================

/**
 * Validate player names (non-empty, unique)
 * @param {Array<string>} names - Player names to validate
 * @returns {object} {valid: boolean, error: string}
 */
function validatePlayerNames(names) {
  // Remove empty names
  const filtered = names.filter(name => name.trim() !== '');
  
  if (filtered.length === 0) {
    return { valid: false, error: 'At least one player name is required' };
  }
  
  // Check for duplicates (case-insensitive)
  const lowerNames = filtered.map(name => name.toLowerCase().trim());
  const uniqueNames = new Set(lowerNames);
  
  if (lowerNames.length !== uniqueNames.size) {
    return { valid: false, error: 'Player names must be unique' };
  }
  
  return { valid: true, names: filtered };
}

/**
 * Validate role distribution for Undercover/Mafia
 * @param {object} roles - Role counts {mrWhite: 1, spies: 2, agents: 5}
 * @param {number} totalPlayers - Total player count
 * @returns {object} {valid: boolean, error: string}
 */
function validateRoleDistribution(roles, totalPlayers) {
  const sum = Object.values(roles).reduce((a, b) => a + b, 0);
  
  if (sum !== totalPlayers) {
    return { 
      valid: false, 
      error: `Role total (${sum}) doesn't match player count (${totalPlayers})` 
    };
  }
  
  // Check minimum requirements
  for (const [role, count] of Object.entries(roles)) {
    if (count < 0) {
      return { valid: false, error: `Invalid count for ${role}` };
    }
  }
  
  return { valid: true };
}

// ================================
// ARRAY HELPERS
// ================================

/**
 * Sort items alphabetically
 * @param {Array<string>} items - Items to sort
 * @param {boolean} blanksFirst - Put empty strings first
 * @returns {Array<string>} Sorted array
 */
function sortAlphabetically(items, blanksFirst = true) {
  if (!blanksFirst) {
    return [...items].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }
  
  const blanks = items.filter(item => !item || item.trim() === '');
  const nonBlanks = items.filter(item => item && item.trim() !== '');
  
  nonBlanks.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  
  return [...blanks, ...nonBlanks];
}

/**
 * Remove item from array
 * @param {Array} array - Source array
 * @param {*} item - Item to remove
 * @returns {Array} New array without item
 */
function removeItem(array, item) {
  return array.filter(i => i !== item);
}

// ================================
// DOM HELPERS
// ================================

/**
 * Show/hide element
 * @param {HTMLElement|string} element - Element or selector
 * @param {boolean} show - True to show, false to hide
 */
function toggleElement(element, show) {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (el) {
    if (show) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }
}

/**
 * Show element
 * @param {HTMLElement|string} element - Element or selector
 */
function showElement(element) {
  toggleElement(element, true);
}

/**
 * Hide element
 * @param {HTMLElement|string} element - Element or selector
 */
function hideElement(element) {
  toggleElement(element, false);
}

/**
 * Create element with attributes and classes
 * @param {string} tag - HTML tag
 * @param {object} options - {classes: [], attributes: {}, text: '', html: ''}
 * @returns {HTMLElement} Created element
 */
function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  if (options.classes) {
    element.classList.add(...options.classes);
  }
  
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }
  
  if (options.text) {
    element.textContent = options.text;
  }
  
  if (options.html) {
    element.innerHTML = options.html;
  }
  
  return element;
}

// ================================
// SCREEN NAVIGATION
// ================================

/**
 * Navigate between screens (hide all, show one)
 * @param {string} screenId - ID of screen to show
 * @param {Array<string>} allScreenIds - All screen IDs
 */
function navigateToScreen(screenId, allScreenIds) {
  allScreenIds.forEach(id => {
    const screen = document.getElementById(id);
    if (screen) {
      if (id === screenId) {
        screen.classList.remove('hidden');
        screen.classList.add('animate-fadeIn');
      } else {
        screen.classList.add('hidden');
      }
    }
  });
}

// ================================
// TIMER UTILITIES
// ================================

/**
 * Format seconds to MM:SS
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Simple countdown timer
 * @param {number} seconds - Starting seconds
 * @param {function} onTick - Callback on each second (receives remaining time)
 * @param {function} onComplete - Callback when timer reaches 0
 * @returns {object} Timer controller {pause, resume, reset, stop}
 */
function createTimer(seconds, onTick, onComplete) {
  let remaining = seconds;
  let intervalId = null;
  let isPaused = false;
  
  function tick() {
    if (!isPaused) {
      onTick(remaining);
      
      if (remaining === 0) {
        stop();
        if (onComplete) onComplete();
      } else {
        remaining--;
      }
    }
  }
  
  function start() {
    if (!intervalId) {
      intervalId = setInterval(tick, 1000);
      tick(); // Call immediately
    }
  }
  
  function pause() {
    isPaused = true;
  }
  
  function resume() {
    isPaused = false;
  }
  
  function reset() {
    remaining = seconds;
    isPaused = false;
  }
  
  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  
  start();
  
  return { pause, resume, reset, stop, get isPaused() { return isPaused; }, get remaining() { return remaining; } };
}

// ================================
// EXPORTS (for module compatibility - optional)
// ================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveGame,
    loadGame,
    clearGame,
    shuffleArray,
    generateId,
    getRandomItem,
    getRandomInt,
    playTapAnimation,
    showConfetti,
    shakeElement,
    pulseElement,
    addRippleEffect,
    validatePlayerNames,
    validateRoleDistribution,
    sortAlphabetically,
    removeItem,
    toggleElement,
    showElement,
    hideElement,
    createElement,
    navigateToScreen,
    formatTime,
    createTimer
  };
}
