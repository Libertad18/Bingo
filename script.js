const socket = io("https://bingo-1-n9o2.onrender.com", { transports: ['websocket'], reconnectionAttempts: 3 });

let card = [];
let previewCardData = [];
let calledNumbers = [];
let wallet = 100;
let stake = 10;
let language = 'en';
let roomId = null;
let isServerConnected = false;
let callInterval;

const translations = {
  en: {
    welcome: "Welcome to Aman Bingo",
    chooseStake: "Choose Stake:",
    selectNumber: "Select a number to generate your card:",
    cardPreview: "Card Preview",
    confirm: "✅ Confirm",
    ballCalled: "Ball Called: —",
    calledNumbers: "Called Numbers: ",
    bingo: "🎉 Bingo",
    playAgain: "🔁 Play Again",
    insufficientBalance: "Insufficient balance",
    win: "Congratulations! You Win! +",
    lose: "Sorry, You Lost",
    someoneWon: "Someone won the game!",
    serverError: "Failed to connect to the game server. Using local simulation."
  },
  am: {
    welcome: "እንኳን ወደ አማን ቢንጎ በደህና መጡ",
    chooseStake: "ውርርድ ይምmረጡ፡",
    selectNumber: "ካርድዎን ለመፍጠር ቁጥር ይምረጡ፡",
    cardPreview: "የካርድ ቅድመ-እይታ",
    confirm: "✅ አረጋግጥ",
    ballCalled: "የተጠራ ኳስ፡ —",
    calledNumbers: "የተጠሩ ቁጥሮች፡ ",
    bingo: "🎉 ቢንጎ",
    playAgain: "🔁 እንደገና ይጫወቱ",
    insufficientBalance: "በቂ ሒሳብ የለም",
    win: "እንኳን ደስ አለህ! አሸንፈሃል! +",
    lose: "ይቅርታ, ተሸንፈሃል",
    someoneWon: "አንድ ሰው ጨዋታውን አሸንፏል!",
    serverError: "የጨዋታ አገልጋይ ግንኙነት አልተሳካም። የአካባቢ ማስመሰል በመጠቀም።"
  }
};

function toggleTheme() {
  document.body.classList.toggle('light');
  const isLight = document.body.classList.contains('light');
  document.body.style.background = isLight
    ? 'linear-gradient(to bottom, #fef3c7, #fed7aa)'
    : 'linear-gradient(to bottom right, #7c3aed, #ec4899)';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

function changeLanguage(lang) {
  language = lang;
  document.getElementById('welcome').textContent = translations[lang].welcome;
  document.getElementById('chooseStake').textContent = translations[lang].chooseStake;
  document.getElementById('selectNumber').textContent = translations[lang].selectNumber;
  document.getElementById('cardPreview').textContent = translations[lang].cardPreview;
  document.getElementById('confirmBtn').textContent = translations[lang].confirm;
  document.getElementById('ballDisplay').textContent = translations[lang].ballCalled;
  document.getElementById('calledList').textContent = translations[lang].calledNumbers;
  document.getElementById('bingoBtn').textContent = translations[lang].bingo;
  document.getElementById('playAgainBtn').textContent = translations[lang].playAgain;
  localStorage.setItem('language', lang);
}

function navigate(page) {
  console.log(`Navigating to ${page}`);
  // Implement navigation logic if needed
}

function generateNumberBoard() {
  const grid = document.getElementById('numberGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 200; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.setAttribute('aria-label', `Select number ${i}`);
    btn.className = 'bg-white text-gray-900 p-2 sm:p-3 rounded-lg hover:bg-neon-pink hover:text-white transition-transform transform hover:scale-115';
    btn.onclick = () => previewCard(i);
    btn.onkeydown = (e) => { if (e.key === 'Enter') previewCard(i); };
    grid.appendChild(btn);
  }
}

function previewCard(seed) {
  previewCardData = generateCard(seed);
  renderCard(previewCardData, 'previewCard', true);
}

function confirmCard() {
  stake = parseInt(document.getElementById('stakeSelect').value);
  if (wallet < stake) {
    alert(translations[language].insufficientBalance);
    return;
  }

  wallet -= stake;
  document.getElementById('wallet').textContent = wallet;
  card = previewCardData;
  calledNumbers = [];

  document.querySelector('.selection-area').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  renderCard(card, 'card', false);

  roomId = "room-" + Math.floor(Math.random() * 10000);
  socket.emit("joinRoom", roomId);
  socket.emit("startGame", roomId);

  startNumberCalling();
}

function generateCard(seed) {
  const ranges = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  const cardData = [];
  const random = new Math.seedrandom(seed);
  for (let [min, max] of ranges) {
    let nums = Array.from({length: max - min + 1}, (_, i) => i + min)
      .sort(() => random() - 0.5);
    cardData.push(nums.slice(0, 5));
  }
  cardData[2][2] = "Free";
  return cardData;
}

function renderCard(data, containerId, isPreview = false) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const num = data[col][row];
      const cell = document.createElement('div');
      cell.className = `cell ${isPreview ? 'disabled' : ''} bg-white text-gray-900 p-3 sm:p-4 rounded-lg font-bold text-center`;
      cell.textContent = num;
      cell.setAttribute('aria-label', `Number ${num}`);
      if (!isPreview && num !== "Free") {
        cell.tabIndex = 0;
        cell.onclick = () => markCell(cell, num);
        cell.onkeydown = (e) => { if (e.key === 'Enter') markCell(cell, num); };
      }
      if (num === "Free" || (!isPreview && calledNumbers.includes(num))) {
        cell.classList.add('marked', 'bg-neon-pink', 'text-white');
      }
      container.appendChild(cell);
    }
  }
}

function markCell(cell, num) {
  if (calledNumbers.includes(num) || num === "Free") {
    cell.classList.toggle('marked');
    cell.classList.toggle('bg-neon-pink');
    cell.classList.toggle('text-white');
    document.getElementById('bingoBtn').classList.remove('hidden');
  }
}

function autoMarkCard(num) {
  const cells = document.querySelectorAll('#card .cell');
  cells.forEach(cell => {
    if (cell.textContent === num.toString()) {
      cell.classList.add('marked', 'bg-neon-pink', 'text-white');
      document.getElementById('bingoBtn').classList.remove('hidden');
    }
  });
}

function enableCard() {
  document.querySelectorAll('#card .cell').forEach(cell => {
    cell.classList.remove('disabled');
  });
}

function startNumberCalling() {
  clearInterval(callInterval);
  callInterval = setInterval(() => {
    const availableNumbers = Array.from({length: 75}, (_, i) => i + 1).filter(n => !calledNumbers.includes(n));
    if (availableNumbers.length === 0) {
      clearInterval(callInterval);
      document.getElementById('result').textContent = translations[language].lose;
      alert(translations[language].lose);
      document.getElementById('playAgainBtn').classList.remove('hidden');
      return;
    }
    const num = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    handleNumberCalled(num);
    if (isServerConnected) {
      socket.emit("numberCalled", num);
    }
  }, 3000);
}

function handleNumberCalled(num) {
  if (!calledNumbers.includes(num)) {
    calledNumbers.push(num);
    const prefix = getColumnPrefix(num);
    document.getElementById('ballDisplay').textContent = `Ball Called: ${prefix}–${num}`;
    document.getContent('calledNumbers').textContent += `${prefix}-${num} `;
    document.getElementById('callSound').play();
    autoMarkCard(num);
    enableCard();
    // Auto-check for Bingo after each number
    checkBingoAuto();
  }
}

function getColumnPrefix(num) {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
}

function checkBingoAuto() {
  const cells = document.querySelectorAll('#card .cell');
  const marked = Array.from(cells).map(cell => cell.classList.contains('marked'));

  const markedGrid = [];
  for (let row = 0; row < 5; row++) {
    markedGrid[row] = marked.slice(row * 5, row * 5 + 5);
  }

  const rowWin = markedGrid.some(row => row.every(Boolean));
  const colWin = [0,1,2,3,4].some(col => markedGrid.every(row => row[col]));
  const diagWin1 = [0,1,2,3,4].every(i => markedGrid[i][i]);
  const diagWin2 = [0,1,2,3,4].every(i => markedGrid[i][4 - i]);

  if (rowWin || colWin || diagWin1 || diagWin2) {
    clearInterval(callInterval);
    document.getElementById('result').textContent = translations[language].win + (stake * 2) + " BBR";
    document.getElementById('winSound').play();
    alert(translations[language].win + (stake * 2) + " BBR");
    socket.emit("playerWin", roomId);
    wallet += stake * 2;
    document.getElementById('wallet').textContent = wallet;
    document.getElementById('playAgainBtn').classList.remove('hidden');
  }
}

function checkBingo() {
  const cells = document.querySelectorAll('#card .cell');
  const marked = Array.from(cells).map(cell => cell.classList.contains('marked'));

  const markedGrid = [];
  for (let row = 0; row < 5; row++) {
    markedGrid[row] = marked.slice(row * 5, row * 5 + 5);
  }

  const rowWin = markedGrid.some(row => row.every(Boolean));
  const colWin = [0,1,2,3,4].some(col => markedGrid.every(row => row[col]));
  const diagWin1 = [0,1,2,3,4].every(i => markedGrid[i][i]);
  const diagWin2 = [0,1,2,3,4].every(i => markedGrid[i][4 - i]);

  if (rowWin Cal colWin || diagWin1 || diagWin2) {
    clearInterval(callInterval);
    document.getElementById('result').textContent = translations[language].win + (stake * 2) + " BBR";
    document.getElementById('winSound').play();
    alert(translations[language].win + (stake * 2) + " BBR");
    socket.emit("playerWin", roomId);
    wallet += stake * 2;
    document.getElementById('wallet').textContent = wallet;
    document.getElementById('playAgainBtn').classList.remove('hidden');
  } else {
    document.getElementById('result').textContent = translations[language].lose;
    alert(translations[language].lose);
  }
}

function resetGame() {
  clearInterval(callInterval);
  calledNumbers = [];
  document.getElementById('gameArea').classList.add('hidden');
  document.getElementById('card').innerHTML = '';
  document.getElementById('ballDisplay').textContent = translations[language].ballCalled;
  document.getElementById('calledNumbers').textContent = '';
  document.getElementById('calledList').textContent = translations[language].calledNumbers;
  document.getElementById('result').textContent = '';
  document.getElementById('bingoBtn').classList.add('hidden');
  document.getElementById('playAgainBtn').classList.add('hidden');
  document.querySelector('.selection-area').classList.remove('hidden');
  generateNumberBoard();
  changeLanguage(language);
}

socket.on("connect", () => {
  console.log("Connected to server");
  is ServerConnected = true;
});

socket.on("connect_error", (err) => {
  console.error("Connection error:", err);
  alert(translations[language].serverError);
  isServerConnected = false;
});

socket.on("numberCalled", (num) => {
  handleNumberCalled(num);
});

socket.on("announceWinner", () => {
  clearInterval(callInterval);
  document.getElementById('result').textContent = translations[language].someoneWon;
  document.getElementById('winSound').play();
  alert(translations[language].someoneWon);
  document.getElementById('playAgainBtn').classList.remove('hidden');
});

window.onload = () => {
{keyword:generator}
  generateNumberBoard();
  document.getElementById('themeToggle').onclick = toggleTheme;
  document.getElementById('languageSelect').onchange = (e) => changeLanguage(e.target.value);
  const savedLanguage = localStorage.getItem('language') || 'en';
  changeLanguage(savedLanguage);
  document.getElementById('languageSelect').value = savedLanguage;
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    toggleTheme();
  }
};
</script>
