const socket = io("https://YOUR-BACKEND-URL"); // Replace with your backend URL

let card = [];
let previewCardData = [];
let calledNumbers = [];
let countdown = 30;
let timer;
let callInterval;
let wallet = 100;
let stake = 10;
let language = 'en';
let roomId = null;

function generateNumberBoard() {
  const grid = document.getElementById('numberGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= 200; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.onclick = () => previewCard(i);
    grid.appendChild(btn);
  }
}

function previewCard(seed) {
  previewCardData = generateCard(seed);
  renderCard(previewCardData, 'previewCard');
}

function confirmCard() {
  stake = parseInt(document.getElementById('stakeSelect').value);
  if (wallet < stake) return alert("Insufficient balance");

  wallet -= stake;
  document.getElementById('wallet').textContent = wallet;
  card = previewCardData;
  calledNumbers = [];

  document.querySelector('.selection-area').classList.add('hidden');
  document.getElementById('gameArea').classList.remove('hidden');
  renderCard(card, 'card');

  roomId = "room-" + Math.floor(Math.random() * 10000);
  socket.emit("joinRoom", roomId);
  socket.emit("startGame", roomId);
}

function generateCard(seed) {
  const ranges = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  const cardData = [];
  for (let [min, max] of ranges) {
    let nums = Array.from({length: max - min + 1}, (_, i) => i + min)
      .sort(() => Math.sin(seed++) - 0.5);
    cardData.push(nums.slice(0, 5));
  }
  cardData[2][2] = "Free";
  return cardData;
}

function renderCard(data, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const num = data[col][row];
      const cell = document.createElement('div');
      cell.className = 'cell disabled';
      cell.textContent = num;
      if (containerId === 'card') {
        cell.onclick = () => {
          if (calledNumbers.includes(num) || num === "Free") {
            cell.classList.toggle('marked');
            document.getElementById('bingoBtn').classList.remove('hidden');
          }
        };
      }
      container.appendChild(cell);
    }
  }
}

function enableCard() {
  document.querySelectorAll('#card .cell').forEach(cell => {
    cell.classList.remove('disabled');
  });
}

function getColumnPrefix(num) {
  if (num <= 15) return "B";
  if (num <= 30) return "I";
  if (num <= 45) return "N";
  if (num <= 60) return "G";
  return "O";
}

function checkBingo() {
  const cells = document.querySelectorAll('#card .cell');
  const marked = Array.from(cells).map(cell =>
    cell.classList.contains('marked') || cell.textContent === "Free"
  );

  const grid = Array(5).fill().map((_, row) =>
    Array(5).fill().map((_, col) => card[col][row])
  );

  const markedGrid = grid.map((row, r) =>
    row.map((_, c) => marked[r * 5 + c])
  );

  const rowWin = markedGrid.some(row => row.every(Boolean));
  const colWin = [0,1,2,3,4].some(i => markedGrid.every(row => row[i]));
  const diagWin1 = [0,1,2,3,4].every(i => markedGrid[i][i]);
  const diagWin2 = [0,1,2,3,4].every(i => markedGrid[i][4 - i]);

  if (rowWin || colWin || diagWin1 || diagWin2) {
    document.getElementById('result').textContent = '🎉 You Win!';
    socket.emit("playerWin", roomId);
  } else {
    document.getElementById('result').textContent = '❌ Not a winning card';
  }

  document.getElementById('playAgainBtn').classList.remove('hidden');
}

function resetGame() {
  document.getElementById('gameArea').classList.add('hidden');
  document.getElementById('card').innerHTML = '';
  document.getElementById('ballDisplay').textContent = 'Ball Called: —';
  document.getElementById('calledNumbers').textContent = '';
  document.getElementById('result').textContent = '';
  document.getElementById('playAgainBtn').classList.add('hidden');
  document.querySelector('.selection-area').classList.remove('hidden');
}

socket.on("numberCalled", num => {
  calledNumbers.push(num);
  const prefix = getColumnPrefix(num);
  document.getElementById('ballDisplay').textContent = `Ball Called: ${prefix}–${num}`;
  document.getElementById('calledNumbers').textContent += `${prefix}-${num} `;
  document.getElementById('callSound').play();
  enableCard();
});

socket.on("announceWinner", () => {
  document.getElementById('result').textContent = '🎉 Someone won!';
  clearInterval(callInterval);
});

window.onload = generateNumberBoard;
