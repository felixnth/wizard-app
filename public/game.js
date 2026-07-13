const socket = io();
let gameState = null;
let playerName = null;
let currentGameId = null;
let playerBid = null;
let selectedCard = null;

// Game mode toggle
document.getElementById('gameMode')?.addEventListener('change', function() {
  const createDiv = document.getElementById('createGameDiv');
  const joinDiv = document.getElementById('joinGameDiv');

  if (this.value === 'create') {
    createDiv.style.display = 'block';
    joinDiv.style.display = 'none';
  } else {
    createDiv.style.display = 'none';
    joinDiv.style.display = 'block';
  }
});

async function createGame() {
  const name = document.getElementById('playerName').value.trim();
  const playerCount = parseInt(document.getElementById('playerCount').value);

  if (!name) {
    showError('Bitte einen Namen eingeben!');
    return;
  }

  try {
    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCount, mode: 'full' })
    });

    const data = await response.json();
    currentGameId = data.gameId;
    playerName = name;

    // Show game code
    document.getElementById('joinGameForm').style.display = 'none';
    document.getElementById('gameCodeDisplay').style.display = 'block';
    document.getElementById('displayGameCode').textContent = currentGameId;

    // Join game
    socket.emit('joinGame', { gameId: currentGameId, playerName });
  } catch (error) {
    showError('Fehler beim Erstellen des Spiels: ' + error.message);
  }
}

function joinGame() {
  const name = document.getElementById('playerName').value.trim();
  const gameId = document.getElementById('gameId').value.trim().toUpperCase();

  if (!name || !gameId) {
    showError('Bitte Namen und Spiel-Code eingeben!');
    return;
  }

  currentGameId = gameId;
  playerName = name;

  document.getElementById('joinGameForm').style.display = 'none';
  socket.emit('joinGame', { gameId, playerName });
}

function cancelGame() {
  location.reload();
}

// Socket.io events
socket.on('gameStateUpdated', (state) => {
  gameState = state;
  updateGameUI();
});

socket.on('roundStarted', (data) => {
  const totalRounds = Math.floor(60 / gameState.players.length);
  document.getElementById('roundNum').textContent = data.round;
  document.getElementById('totalRounds').textContent = totalRounds;
  document.getElementById('cardsPerRound').textContent = `Karten: ${data.cardsPerPlayer}`;

  if (data.trumpCard) {
    const trumpStr = formatCard(data.trumpCard);
    document.getElementById('trumpDisplay').innerHTML = `<strong>Trumpf:</strong> ${trumpStr}`;
  }

  showGameScreen();
  showBiddingPhase();
});

socket.on('hand', (hand) => {
  displayHand(hand);
});

socket.on('biddingComplete', () => {
  showBiddingComplete();
});

socket.on('cardPlayed', (data) => {
  updatePlayedCards();
});

socket.on('roundEnded', (data) => {
  showRoundEnd();
});

socket.on('gameEnded', (data) => {
  displayFinalScores(data.finalScores);
});

socket.on('error', (data) => {
  showError(data.message);
});

function updateGameUI() {
  // Update players list
  const playersList = document.getElementById('playersList');
  playersList.innerHTML = '';

  gameState.players.forEach(player => {
    const li = document.createElement('li');
    li.className = 'player-item';

    const bidStatus = player.bid !== null ? `Gebot: ${player.bid}` : 'Warte auf Gebot...';
    const trickStatus = gameState.state === 'playing' ? `Stiche: ${player.tricks}` : '';

    li.innerHTML = `
      <span class="player-name">${player.name}</span>
      <div>
        <span>${bidStatus} ${trickStatus}</span>
        <span class="player-score">${player.totalScore}</span>
      </div>
    `;

    playersList.appendChild(li);
  });

  document.getElementById('gameState').textContent = getStateLabel(gameState.state);
}

function getStateLabel(state) {
  const labels = {
    'waiting': 'Wartet auf Spieler...',
    'bidding': 'Bieten Phase',
    'playing': 'Spielphase',
    'roundEnd': 'Runde beendet',
    'gameEnd': 'Spiel beendet'
  };
  return labels[state] || state;
}

function showGameScreen() {
  document.getElementById('setupScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'block';
}

function showBiddingPhase() {
  document.getElementById('biddingSection').style.display = 'block';
  document.getElementById('playingSection').style.display = 'none';
  document.getElementById('roundEndSection').style.display = 'none';

  // Generate bid buttons
  const cardsPerPlayer = gameState.currentRound.cardsPerPlayer;
  const bidButtons = document.getElementById('bidButtons');
  bidButtons.innerHTML = '';

  for (let i = 0; i <= cardsPerPlayer; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = 'secondary';
    btn.onclick = () => selectBid(i);
    bidButtons.appendChild(btn);
  }
}

function showBiddingComplete() {
  document.getElementById('biddingSection').style.display = 'none';
  document.getElementById('playingSection').style.display = 'block';

  const currentPlayer = gameState.players[0]; // Placeholder
  document.getElementById('playingStatus').textContent = 'Spiel läuft...';
}

function selectBid(amount) {
  playerBid = amount;

  const buttons = document.querySelectorAll('#bidButtons button');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
    if (parseInt(btn.textContent) === amount) {
      btn.classList.add('selected');
    }
  });

  document.getElementById('submitBidBtn').style.display = 'block';
}

function submitBid() {
  if (playerBid === null) {
    showError('Bitte ein Gebot abgeben!');
    return;
  }

  socket.emit('placeBid', { gameId: currentGameId, bidAmount: playerBid });
  document.getElementById('submitBidBtn').style.display = 'none';
}

function displayHand(hand) {
  const handDiv = document.getElementById('hand');
  handDiv.innerHTML = '';

  hand.forEach((card, index) => {
    const cardEl = createCardElement(card, index);
    cardEl.onclick = () => selectCard(index, cardEl);
    handDiv.appendChild(cardEl);
  });
}

function createCardElement(card, index) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.index = index;

  let display = '';
  if (card.type === 'wizard') {
    cardEl.classList.add('wizard');
    display = '✨ Zauberer';
  } else if (card.type === 'jester') {
    cardEl.classList.add('jester');
    display = '🤡 Narr';
  } else {
    const colorClass = {
      'R': 'card-red',
      'B': 'card-blue',
      'G': 'card-green',
      'Y': 'card-yellow'
    }[card.color] || '';
    cardEl.classList.add(colorClass);
    display = `${card.value}`;
  }

  cardEl.innerHTML = `<span>${display}</span>`;
  return cardEl;
}

function selectCard(index, element) {
  if (gameState.state !== 'playing') return;

  const allCards = document.querySelectorAll('#hand .card');
  allCards.forEach(c => c.classList.remove('selected'));

  selectedCard = index;
  element.classList.add('selected');
}

function playSelectedCard() {
  if (selectedCard === null) {
    showError('Bitte eine Karte wählen!');
    return;
  }

  socket.emit('playCard', { gameId: currentGameId, cardIndex: selectedCard });
  selectedCard = null;
}

function updatePlayedCards() {
  // Update the display of played cards in the current trick
  // This would be updated by socket events
}

function showRoundEnd() {
  document.getElementById('biddingSection').style.display = 'none';
  document.getElementById('playingSection').style.display = 'none';
  document.getElementById('roundEndSection').style.display = 'block';

  // Display round scores
  const scoresBody = document.getElementById('roundScores');
  scoresBody.innerHTML = '';

  gameState.players.forEach(player => {
    const row = document.createElement('tr');
    const roundScore = player.roundScore || 0;
    row.innerHTML = `
      <td>${player.name}</td>
      <td>${player.bid}</td>
      <td>${player.tricks}</td>
      <td>${roundScore}</td>
    `;
    scoresBody.appendChild(row);
  });
}

function nextRound() {
  socket.emit('nextRound', { gameId: currentGameId });
}

function displayFinalScores(scores) {
  document.getElementById('biddingSection').style.display = 'none';
  document.getElementById('playingSection').style.display = 'none';
  document.getElementById('roundEndSection').style.display = 'none';
  document.getElementById('gameEndSection').style.display = 'block';

  // Sort players by final score
  const sorted = gameState.players
    .slice()
    .sort((a, b) => scores[b.id] - scores[a.id]);

  const finalScoresBody = document.getElementById('finalScores');
  finalScoresBody.innerHTML = '';

  sorted.forEach((player, rank) => {
    const row = document.createElement('tr');
    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '';
    row.innerHTML = `
      <td>${medal} ${player.name}</td>
      <td>${scores[player.id]}</td>
    `;
    finalScoresBody.appendChild(row);
  });
}

function formatCard(card) {
  if (card.type === 'wizard') {
    return '✨ Zauberer';
  }
  if (card.type === 'jester') {
    return '🤡 Narr';
  }
  const colorNames = { 'R': 'Rot', 'B': 'Blau', 'G': 'Grün', 'Y': 'Gelb' };
  return `${card.value} ${colorNames[card.color]}`;
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

function goHome() {
  window.location.href = '/';
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  console.log('Game page loaded, Socket.io connected');
});
