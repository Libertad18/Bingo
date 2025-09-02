// Ensure seedrandom is loaded before this script
// <script src="https://cdnjs.cloudflare.com/ajax/libs/seedrandom/3.0.5/seedrandom.min.js"></script>
// And socket.io
// <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.js"></script>

const socket = io("https://bingo-1-n9o2.onrender.com", {
  transports: ['websocket'],
  reconnectionAttempts: 3,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000
});

let card = [];
let previewCardData = [];
let calledNumbers = [];
let wallet = 100;
let stake = 10;
let language = 'en';
let roomId = null;
let isServerConnected = false;
let callInterval;
let selectedSeed = null; // To highlight the selected seed number
let animationTimeout; // For managing cell mark animations
let gameActive = false; // To control game state

const translations = {
  en: {
    welcome: "Welcome to Bingo Blast!",
    chooseStake: "Choose Your Stake:",
    selectNumber: "Pick a number to generate your unique card:",
    cardPreview: "Your Card Preview",
    confirm: "✅ Confirm Card",
    ballCalled: "Ball Called: ",
    calledNumbers: "Called Numbers: ",
    bingo: "🎉 Bingo!",
    playAgain: "🔁 Play Again",
    insufficientBalance: "Insufficient balance! Please choose a lower stake or add funds.",
    win: "🥳 Congratulations! You Won!",
    lose: "😔 Sorry, You Lost. Better luck next time!",
    someoneWon: "Someone else won this round!",
    serverError: "Failed to connect to the game server. Playing offline.",
    serverConnecting: "Connecting to Bingo server...",
    serverConnected: "Connected to Bingo server!",
    bingoFail: "No Bingo yet. Keep playing!"
  },
  am: {
    welcome: "እንኳን ወደ ቢንጎ ብላስት በደህና መጡ!",
    chooseStake: "ውርርድ ይምረጡ፡",
    selectNumber: "ልዩ ካርድዎን ለመፍጠር ቁጥር ይምረጡ፡",
    cardPreview: "የካርድ ቅድመ-እይታ",
    confirm: "✅ ካርድዎን ያረጋግጡ",
    ballCalled: "የተጠራ ኳስ፡ ",
    calledNumbers: "የተጠሩ ቁጥሮች፡ ",
    bingo: "🎉 ቢንጎ!",
    playAgain: "🔁 እንደገና ይጫወቱ",
    insufficientBalance: "በቂ ሒሳብ የለም! እባክዎ ዝቅተኛ ውርርድ ይምረጡ ወይም ገንዘብ ያክሉ.",
    win: "🥳 እንኳን ደስ አለህ! አሸንፈሃል!",
    lose: "😔 ይቅርታ, ተሸንፈሃል. በሚቀጥለው ጊዜ መልካም ዕድል!",
    someoneWon: "ሌላ ሰው አሸነፈ!",
    serverError: "ከጨዋታ አገልጋዩ ጋር መገናኘት አልተቻለም። ከመስመር ውጪ እየተጫወተ ነው።",
    serverConnecting: "ወደ ቢንጎ አገልጋይ በመገናኘት ላይ...",
    serverConnected: "ከቢንጎ አገልጋይ ጋር ተገናኝቷል!",
    bingoFail: "ገና ቢንጎ የለም። መጫወት ይቀጥሉ!"
  }
};

// --- DOM Elements ---
const welcomeMsg = document.getElementById('welcome');
const chooseStakeMsg = document.getElementById('chooseStake');
const selectNumberMsg = document.getElementById('selectNumber');
const cardPreviewMsg = document.getElementById('cardPreview');
const confirmBtn = document.getElementById('confirmBtn');
const ballDisplay = document.getElementById('ballDisplay');
const calledListDisplay = document.getElementById('calledList');
const calledNumbersSpan = document.getElementById('calledNumbers');
const bingoBtn = document.getElementById('bingoBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const walletSpan = document.getElementById('wallet');
const stakeSelect = document.getElementById('stakeSelect');
const numberGrid = document.getElementById('numberGrid');
const previewCardContainer = document.getElementById('previewCard');
const gameCardContainer = document.getElementById('card');
const resultDisplay = document.getElementById('result');
const selectionArea = document.querySelector('.selection-area');
const gameArea = document.getElementById('gameArea');
const themeToggleBtn = document.getElementById('themeToggle');
const languageSelect = document.getElementById('languageSelect');
const callSound = document.getElementById('callSound');
const winSound = document.getElementById('winSound');

// --- Utility Functions ---
function getColumnPrefix(num) {
  if (num >= 1 && num <= 15) return "B";
  if (num >= 16 && num <= 30) return "I";
  if (num >= 31 && num <= 45) return "N";
  if (num >= 46 && num <= 60) return "G";
  if (num >= 61 && num <= 75) return "O";
  return ""; // Should not happen for standard Bingo (1-75)
}

function playSound(audioElement) {
  if (audioElement && !gameActive) { // Prevent sound spam if game isn't active
    audioElement.currentTime = 0; // Rewind to start if already playing
    audioElement.play().catch(e => console.warn("Audio play failed:", e));
  } else if (audioElement && gameActive) { // Allow for in-game sounds
      audioElement.currentTime = 0;
      audioElement.play().catch(e => console.warn("Audio play failed:", e));
  }
}

// --- Theme and Language ---
function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
  themeToggleBtn.textContent = isLight ? '☀️' : '🌓';
}

function updateTexts() {
  const t = translations[language];
  welcomeMsg.textContent = t.welcome;
  chooseStakeMsg.textContent = t.chooseStake;
  selectNumberMsg.textContent = t.selectNumber;
  cardPreviewMsg.textContent = t.cardPreview;
  confirmBtn.textContent = t.confirm;
  // Use a span inside ballDisplay for the number to make translation easier
  ballDisplay.innerHTML = `${t.ballCalled}<span class="text-white"> —</span>`;
  calledListDisplay.childNodes[0].nodeValue = t.calledNumbers; // Update only the text node
  bingoBtn.textContent = t.bingo;
  playAgainBtn.textContent = t.playAgain;
  // Consider updating nav links if their text is dynamic
}

function changeLanguage(lang) {
  language = lang;
  updateTexts();
  localStorage.setItem('language', lang);
}

function navigate(page) {
  console.log(`Navigating to ${page}`);
  // In a full application, this would change views/routes
  // For this single-page bingo, it's illustrative.
}

// --- Game Setup ---
function generateNumberBoard() {
  numberGrid.innerHTML = '';
  for (let i = 1; i <= 75; i++) { // Standard Bingo numbers are 1-75
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.setAttribute('aria-label', `Select number ${i} for card seed`);
    btn.setAttribute('data-number', i); // Add data attribute for easier selection
    btn.className = 'bg-white text-gray-900 p-2 sm:p-3 rounded-lg transition-transform transform hover:scale-105 shadow-md';
    btn.onclick = () => previewCard(i);
    btn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); previewCard(i); } };
    numberGrid.appendChild(btn);
  }
  confirmBtn.disabled = true; // Initially disable confirm button
}

function generateCard(seed) {
  const ranges = [
    [1, 15], // B
    [16, 30], // I
    [31, 45], // N
    [46, 60], // G
    [61, 75] // O
  ];
  const cardData = [[], [], [], [], []]; // 5 columns
  const random = new Math.seedrandom(seed);

  for (let col = 0; col < 5; col++) {
    const [min, max] = ranges[col];
    let nums = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    // Shuffle and pick 5 unique numbers for the column
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(random() * nums.length);
      cardData[col].push(nums[randomIndex]);
      nums.splice(randomIndex, 1); // Remove picked number
    }
  }
  // Free space in the center (N3)
  cardData[2][2] = "Free";
  return cardData;
}

function renderCard(data, containerElement, isPreview = false) {
  containerElement.innerHTML = '';
  const fragment = document.createDocumentFragment();

  // Transpose the cardData for rendering row by row (data[col][row])
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const num = data[col][row];
      const cell = document.createElement('div');
      cell.className = `cell p-3 sm:p-4 rounded-lg font-bold text-center relative overflow-hidden`;
      cell.textContent = num;
      cell.setAttribute('aria-label', num === "Free" ? "Free space" : `Number ${num}`);
      cell.setAttribute('data-number', num === "Free" ? "Free" : num);
      cell.setAttribute('data-col', col); // Add col and row for easier bingo checking
      cell.setAttribute('data-row', row);

      if (num === "Free") {
        cell.classList.add('marked'); // Free space is always marked
        cell.setAttribute('data-marked', 'true');
      }

      if (!isPreview) {
        if (num !== "Free") {
            cell.tabIndex = 0;
            cell.onclick = () => markCell(cell, num);
            cell.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); markCell(cell, num); } };
        }
        // Check if already called, then auto-mark
        if (calledNumbers.includes(parseInt(num)) && num !== "Free") {
            cell.classList.add('marked');
            cell.setAttribute('data-marked', 'true');
        }
      } else {
        cell.classList.add('disabled'); // Disable interaction on preview card
      }
      fragment.appendChild(cell);
    }
  }
  containerElement.appendChild(fragment);
}

function previewCard(seed) {
  selectedSeed = seed;
  // Clear previous highlights
  document.querySelectorAll('#numberGrid button').forEach(btn => {
    btn.classList.remove('selected-seed');
  });
  // Highlight current selected seed
  const selectedBtn = document.querySelector(`#numberGrid button[data-number="${seed}"]`);
  if (selectedBtn) {
      selectedBtn.classList.add('selected-seed');
  }

  previewCardData = generateCard(seed);
  renderCard(previewCardData, previewCardContainer, true);
  confirmBtn.disabled = false; // Enable confirm button once a card is previewed
}

function confirmCard() {
  stake = parseInt(stakeSelect.value);
  if (wallet < stake) {
    alert(translations[language].insufficientBalance);
    return;
  }

  wallet -= stake;
  walletSpan.textContent = wallet;
  card = previewCardData;
  calledNumbers = [];
  resultDisplay.textContent = ''; // Clear previous results
  bingoBtn.classList.add('hidden'); // Hide bingo button until numbers are marked
  playAgainBtn.classList.add('hidden'); // Hide play again button

  selectionArea.classList.add('hidden');
  gameArea.classList.remove('hidden');
  renderCard(card, gameCardContainer, false); // Render the actual game card
  gameActive = true; // Set game to active

  // Only join room and start server game if connected
  if (isServerConnected) {
    roomId = "room-" + Math.floor(Math.random() * 10000); // Generate a new room ID
    socket.emit("joinRoom", roomId);
    socket.emit("startGame", roomId);
    console.log(`Joined room: ${roomId} and started game (server mode).`);
  } else {
    console.log("Not connected to server. Starting local number calling.");
    startNumberCalling();
  }
}

// --- Game Logic ---
function markCell(cell, num) {
  if (!gameActive || !calledNumbers.includes(num)) {
    // Only allow marking if the number has been called AND the game is active
    // And if it's not already marked, or if we want to allow unmarking (not typical for Bingo)
    if (!cell.classList.contains('marked')) {
        alert("This number has not been called yet!");
    }
    return;
  }

  cell.classList.toggle('marked');
  const isMarked = cell.classList.contains('marked');
  cell.setAttribute('data-marked', isMarked);

  // Show Bingo button if any cell is marked (free space is always marked)
  if (document.querySelectorAll('#card .cell.marked').length > 0) {
      bingoBtn.classList.remove('hidden');
  } else {
      bingoBtn.classList.add('hidden');
  }

  // Optional: Add a subtle click sound
  // playSound(document.getElementById('clickSound'));
}

function autoMarkCard(num) {
  const cells = document.querySelectorAll(`#card .cell[data-number="${num}"]`);
  cells.forEach(cell => {
    if (!cell.classList.contains('marked')) {
      cell.classList.add('marked');
      cell.setAttribute('data-marked', 'true');
      // Trigger a visual bounce for auto-marked cells
      clearTimeout(animationTimeout); // Clear previous animation to ensure it plays
      cell.style.animation = 'none';
      void cell.offsetWidth; // Trigger reflow
      cell.style.animation = null;
      animationTimeout = setTimeout(() => {
          // Remove animation class after it completes to allow re-triggering
          // cell.classList.remove('marked-animation');
      }, 500); // Match animation duration
    }
  });

  // If any cell is marked, show the Bingo button
  if (document.querySelectorAll('#card .cell.marked').length > 0) {
      bingoBtn.classList.remove('hidden');
  }
}

function startNumberCalling() {
  clearInterval(callInterval); // Clear any existing interval
  callInterval = setInterval(() => {
    const availableNumbers = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !calledNumbers.includes(n));
    if (availableNumbers.length === 0) {
      clearInterval(callInterval);
      if (gameActive) {
        resultDisplay.textContent = translations[language].lose;
        playSound(document.getElementById('loseSound')); // Assuming you have a lose sound
        alert(translations[language].lose);
        gameActive = false;
        playAgainBtn.classList.remove('hidden');
      }
      return;
    }
    const num = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    handleNumberCalled(num);
    if (isServerConnected) {
      socket.emit("numberCalled", roomId, num); // Emit to room
    }
    checkBingoAuto(); // Auto-check bingo after each number
  }, 3500); // Call a number every 3.5 seconds
}

function handleNumberCalled(num) {
  if (!calledNumbers.includes(num)) {
    calledNumbers.push(num);
    const prefix = getColumnPrefix(num);
    ballDisplay.innerHTML = `${translations[language].ballCalled}<span class="text-white animate-pulse-fast">${prefix}–${num}</span>`;
    calledNumbersSpan.textContent += `${prefix}-${num} `;
    calledListDisplay.scrollTop = calledListDisplay.scrollHeight; // Scroll to bottom
    playSound(callSound);
    autoMarkCard(num);
  }
}

function checkBingo() {
  if (!gameActive) return;

  const cells = Array.from(document.querySelectorAll('#card .cell'));
  const markedGrid = Array(5).fill(0).map(() => Array(5).fill(false));

  cells.forEach(cell => {
    const col = parseInt(cell.dataset.col);
    const row = parseInt(cell.dataset.row);
    markedGrid[row][col] = cell.classList.contains('marked');
  });

  let hasBingo = false;

  // Check rows
  for (let r = 0; r < 5; r++) {
    if (markedGrid[r].every(Boolean)) {
      hasBingo = true;
      console.log(`Bingo on row ${r + 1}`);
      break;
    }
  }
  // Check columns
  if (!hasBingo) {
    for (let c = 0; c < 5; c++) {
      if ([0, 1, 2, 3, 4].every(r => markedGrid[r][c])) {
        hasBingo = true;
        console.log(`Bingo on column ${c + 1}`);
        break;
      }
    }
  }
  // Check diagonals
  if (!hasBingo) {
    // Diagonal 1: top-left to bottom-right
    if ([0, 1, 2, 3, 4].every(i => markedGrid[i][i])) {
      hasBingo = true;
      console.log('Bingo on diagonal 1');
    }
    // Diagonal 2: top-right to bottom-left
    if (!hasBingo && [0, 1, 2, 3, 4].every(i => markedGrid[i][4 - i])) {
      hasBingo = true;
      console.log('Bingo on diagonal 2');
    }
  }

  if (hasBingo) {
    clearInterval(callInterval);
    resultDisplay.textContent = `${translations[language].win} +${stake * 2} BBR`;
    playSound(winSound);
    alert(`${translations[language].win} ${stake * 2} BBR!`);
    if (isServerConnected) {
      socket.emit("playerWin", roomId);
    }
    wallet += stake * 2;
    walletSpan.textContent = wallet;
    gameActive = false;
    playAgainBtn.classList.remove('hidden');
    bingoBtn.classList.add('hidden'); // Hide bingo button after win
  } else {
    resultDisplay.textContent = translations[language].bingoFail;
    setTimeout(() => {
        resultDisplay.textContent = ''; // Clear message after a short delay
    }, 2000);
    // Optional: Add a 'no bingo' sound
  }
}

function checkBingoAuto() {
    // This function can be a simpler version of checkBingo,
    // potentially just for internal game logic without player interaction.
    // For now, we'll just call the full checkBingo when a number is called
    // if we want to ensure the server-side validation is aligned with client.
    // However, if the player *must* press 'Bingo' for it to count,
    // then this auto-check should be removed or modified not to end the game immediately.
    // For this 'expert' version, we'll assume player interaction is key.
    // The `checkBingo` function is triggered by the button for player interaction.
    // We remove the `checkBingoAuto` from `startNumberCalling` to emphasize player action.
}


function resetGame() {
  clearInterval(callInterval);
  gameActive = false;
  calledNumbers = [];
  card = [];
  previewCardData = [];
  selectedSeed = null;

  gameArea.classList.add('hidden');
  gameCardContainer.innerHTML = '';
  ballDisplay.innerHTML = `${translations[language].ballCalled}<span class="text-white"> —</span>`;
  calledNumbersSpan.textContent = '';
  resultDisplay.textContent = '';
  bingoBtn.classList.add('hidden');
  playAgainBtn.classList.add('hidden');
  selectionArea.classList.remove('hidden');

  generateNumberBoard(); // Regenerate board and disable confirm
  updateTexts(); // Re-apply translations
  walletSpan.textContent = wallet; // Update wallet display
  confirmBtn.disabled = true; // Ensure confirm button is disabled initially
}

// --- Socket.IO Event Handlers ---
socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
  isServerConnected = true;
  // resultDisplay.textContent = translations[language].serverConnected; // Consider a toast message
  console.log(translations[language].serverConnected);
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err);
  isServerConnected = false;
  // resultDisplay.textContent = translations[language].serverError; // Consider a toast message
  alert(translations[language].serverError);
  console.log("Starting game in offline mode due to server connection error.");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  isServerConnected = false;
  if (gameActive) {
      clearInterval(callInterval);
      resultDisplay.textContent = "Server disconnected. Game paused/ended."; // Or similar message
      gameActive = false;
      playAgainBtn.classList.remove('hidden');
  }
});

socket.on("numberCalled", (num) => {
  console.log("Server called number:", num);
  if (gameActive) { // Only process if the current game is active
      handleNumberCalled(num);
      // Removed auto-bingo check here to force player to click the Bingo button
  }
});

socket.on("announceWinner", (winningRoomId) => {
  if (roomId === winningRoomId && gameActive) {
    // If THIS player is the winner, the local checkBingo would have handled it.
    // This event means another player in the room won.
    clearInterval(callInterval);
    resultDisplay.textContent = translations[language].someoneWon;
    playSound(document.getElementById('loseSound')); // Play a "lose" or "someone else won" sound
    alert(translations[language].someoneWon);
    gameActive = false;
    playAgainBtn.classList.remove('hidden');
    bingoBtn.classList.add('hidden');
  }
});


// --- Initialization ---
window.onload = () => {
  generateNumberBoard();

  // Event Listeners
  themeToggleBtn.onclick = toggleTheme;
  languageSelect.onchange = (e) => changeLanguage(e.target.value);
  confirmBtn.onclick = confirmCard;
  bingoBtn.onclick = checkBingo;
  playAgainBtn.onclick = resetGame;

  // Load saved preferences
  const savedLanguage = localStorage.getItem('language') || 'en';
  changeLanguage(savedLanguage);
  languageSelect.value = savedLanguage; // Set select box value

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light'); // Apply light theme initially
    themeToggleBtn.textContent = '☀️'; // Set icon for light theme
  } else {
    themeToggleBtn.textContent = '🌓'; // Set icon for dark theme (default)
  }

  // Initial wallet display
  walletSpan.textContent = wallet;

  // Initial card preview (optional, can be empty until user selects)
  previewCard(1); // Auto-preview with seed 1 on load
};
