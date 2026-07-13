let gameState = null;
let playerNames = [];
let gameData = {
  rounds: []
};

function updatePlayerInputs() {
  const count = parseInt(document.getElementById('playerCount').value);
  const container = document.getElementById('playerInputs');
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
      <label for="player${i}">Spieler ${i + 1}:</label>
      <input type="text" id="player${i}" placeholder="Name eingeben" />
    `;
    container.appendChild(div);
  }
}

async function startGame() {
  const playerCount = parseInt(document.getElementById('playerCount').value);
  playerNames = [];

  for (let i = 0; i < playerCount; i++) {
    const name = document.getElementById(`player${i}`).value.trim();
    if (!name) {
      alert('Bitte alle Namen eingeben!');
      return;
    }
    playerNames.push(name);
  }

  // Create game
  const response = await fetch('/api/scoreblock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerNames })
  });

  const data = await response.json();
  gameState = data.gameId;

  // Initialize game data
  const totalRounds = Math.floor(60 / playerCount);
  document.getElementById('totalRounds').textContent = totalRounds;

  // Show game screen
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';

  renderRound();
}

function renderRound() {
  const roundNum = gameData.rounds.length + 1;
  const playerCount = playerNames.length;
  const totalRounds = Math.floor(60 / playerCount);

  if (roundNum > totalRounds) {
    endGame();
    return;
  }

  const cardsPerPlayer = roundNum;
  document.getElementById('roundNumber').textContent = roundNum;
  document.getElementById('roundCards').textContent = `Karten: ${cardsPerPlayer}`;

  const tbody = document.getElementById('playerRows');
  tbody.innerHTML = '';

  // Create table rows
  for (let i = 0; i < playerNames.length; i++) {
    const roundData = gameData.rounds[roundNum - 1];
    const bid = roundData && roundData.bids ? roundData.bids[i] : '';
    const tricks = roundData && roundData.tricks ? roundData.tricks[i] : '';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${playerNames[i]}</td>
      <td><input type="number" class="bid-input" data-player="${i}" min="0" max="${cardsPerPlayer}" value="${bid}" placeholder="Gebot" /></td>
      <td><input type="number" class="tricks-input" data-player="${i}" min="0" max="${cardsPerPlayer}" value="${tricks}" placeholder="Stiche" /></td>
      <td id="roundScore${i}">-</td>
      <td id="totalScore${i}">0</td>
    `;
    tbody.appendChild(row);
  }

  updateScores();
}

function updateScores() {
  const roundNum = gameData.rounds.length + 1;
  const inputs = document.querySelectorAll('.bid-input');

  inputs.forEach((input) => {
    const player = parseInt(input.dataset.player);
    const bid = parseInt(input.value) || 0;
    const tricksInput = document.querySelector(`.tricks-input[data-player="${player}"]`);
    const tricks = parseInt(tricksInput.value) || 0;

    let roundScore = 0;
    if (bid === tricks) {
      roundScore = 20 + (10 * tricks);
    } else {
      roundScore = -10 * Math.abs(bid - tricks);
    }

    document.getElementById(`roundScore${player}`).textContent = roundScore;

    // Calculate total score
    let totalScore = 0;
    for (let r = 0; r < gameData.rounds.length; r++) {
      const rBid = gameData.rounds[r].bids[player];
      const rTricks = gameData.rounds[r].tricks[player];
      if (rBid === rTricks) {
        totalScore += 20 + (10 * rTricks);
      } else {
        totalScore += -10 * Math.abs(rBid - rTricks);
      }
    }
    totalScore += roundScore;
    document.getElementById(`totalScore${player}`).textContent = totalScore;
  });
}

function nextRound() {
  const playerCount = playerNames.length;
  const totalRounds = Math.floor(60 / playerCount);
  const roundNum = gameData.rounds.length + 1;

  if (roundNum > totalRounds) {
    return;
  }

  // Collect bids and tricks
  const bids = [];
  const tricks = [];

  for (let i = 0; i < playerCount; i++) {
    const bid = parseInt(document.querySelector(`.bid-input[data-player="${i}"]`).value) || 0;
    const trick = parseInt(document.querySelector(`.tricks-input[data-player="${i}"]`).value) || 0;

    if (bid < 0 || bid > roundNum || trick < 0 || trick > roundNum) {
      alert('Ungültige Eingabe!');
      return;
    }

    bids.push(bid);
    tricks.push(trick);
  }

  gameData.rounds.push({ bids, tricks });

  if (roundNum >= totalRounds) {
    document.getElementById('nextRoundBtn').style.display = 'none';
  }

  renderRound();
}

function endGame() {
  const playerCount = playerNames.length;
  const totalRounds = Math.floor(60 / playerCount);

  // Calculate final scores
  const scores = {};
  playerNames.forEach((name, i) => {
    scores[i] = 0;
    for (let r = 0; r < gameData.rounds.length; r++) {
      const bid = gameData.rounds[r].bids[i];
      const tricks = gameData.rounds[r].tricks[i];
      if (bid === tricks) {
        scores[i] += 20 + (10 * tricks);
      } else {
        scores[i] += -10 * Math.abs(bid - tricks);
      }
    }
  });

  // Sort by score
  const sorted = playerNames
    .map((name, i) => ({ name, score: scores[i], index: i }))
    .sort((a, b) => b.score - a.score);

  // Show final scores
  const tbody = document.getElementById('finalScores');
  tbody.innerHTML = '';
  sorted.forEach((player, rank) => {
    const row = document.createElement('tr');
    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
    row.innerHTML = `
      <td>${medal} ${player.name}</td>
      <td>${player.score}</td>
    `;
    tbody.appendChild(row);
  });

  document.getElementById('gameEndScreen').style.display = 'block';
}

function goHome() {
  window.location.href = '/';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  updatePlayerInputs();
});
