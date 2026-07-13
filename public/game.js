const socket = io();
let gameState = null;
let playerName = null;
let currentGameId = null;
let playerBid = null;
let selectedCard = null;
let myPlayerId = null;

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
    myPlayerId = socket.id;
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
  myPlayerId = socket.id;
  socket.emit('joinGame', { gameId, playerName });
}

function cancelGame() {
  location.reload();
}

// Socket.io events
socket.on('gameStateUpdated', (state) => {
  gameState = state;
  updateGameUI();
  updateTurnDisplay();

  // Update trick display if in playing state
  if (gameState.state === 'playing' && gameState.currentRound?.currentTrick) {
    updateTrickDisplay(gameState.currentRound.currentTrick);
  }
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

  // Clear trick display for new round
  const trickDiv = document.getElementById('trickDisplay');
  if (trickDiv) {
    trickDiv.innerHTML = '';
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
  document.getElementById('trickDisplay').style.display = 'none';

  // Show blind bidding message for round 1
  const isRound1 = gameState.currentRound.number === 1;
  let biddingMessage = document.getElementById('biddingMessage');
  if (!biddingMessage) {
    biddingMessage = document.createElement('div');
    biddingMessage.id = 'biddingMessage';
    document.getElementById('biddingSection').insertBefore(biddingMessage, document.getElementById('biddingSection').querySelector('h3').nextElementSibling);
  }

  if (isRound1) {
    biddingMessage.innerHTML = '<p style="color: var(--gold); font-style: italic; text-align: center; margin-bottom: 20px;">Runde 1 - Blindgebot! Du siehst deine Karte erst nach dem Gebot.</p>';
    biddingMessage.style.display = 'block';
  } else {
    biddingMessage.style.display = 'none';
  }

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

  // Make sure hand section is visible
  const handSection = document.getElementById('hand');
  if (handSection) {
    handSection.parentElement.style.display = 'block';
  }

  document.getElementById('trickDisplay').style.display = 'block';
  updateTrickDisplay([]);
  updateTurnDisplay();
}

function isMyTurn() {
  if (!gameState || !gameState.currentRound) return false;
  if (gameState.state !== 'playing') return false;

  const currentPlayerIndex = gameState.currentRound.currentPlayerIndex;
  const currentPlayer = gameState.players[currentPlayerIndex];
  return currentPlayer && currentPlayer.id === myPlayerId;
}

function updateTurnDisplay() {
  if (!gameState || !gameState.currentRound) return;

  const currentPlayerIndex = gameState.currentRound.currentPlayerIndex;
  const currentPlayer = gameState.players[currentPlayerIndex];

  let statusText = '';
  if (isMyTurn()) {
    statusText = '👉 Du bist dran! Wähle eine Karte...';
  } else if (currentPlayer) {
    statusText = `⏳ ${currentPlayer.name} spielt...`;
  } else {
    statusText = 'Spiel läuft...';
  }

  document.getElementById('playingStatus').textContent = statusText;
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

  // Don't display cards if in round 1 bidding phase
  if (gameState && gameState.state === 'bidding' && gameState.currentRound.number === 1) {
    return;
  }

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

  // If it's my turn, play the card immediately (mobile-friendly)
  if (isMyTurn()) {
    setTimeout(() => playSelectedCard(), 300);
  }
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

function updateTrickDisplay(currentTrick) {
  const trickDiv = document.getElementById('trickDisplay');
  if (!trickDiv) return;

  trickDiv.innerHTML = '';

  if (!currentTrick || currentTrick.length === 0) {
    trickDiv.innerHTML = '<p style="text-align: center; color: var(--gold);">Tisch (leerer Stich)</p>';
    return;
  }

  const title = document.createElement('p');
  title.style.textAlign = 'center';
  title.style.color = 'var(--gold)';
  title.style.marginBottom = '15px';
  title.style.fontWeight = 'bold';
  title.textContent = `Tisch (${currentTrick.length}/${gameState.players.length} Karten)`;
  trickDiv.appendChild(title);

  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'trick-cards';

  currentTrick.forEach(trick => {
    const trickCardDiv = document.createElement('div');
    trickCardDiv.className = 'trick-card-wrapper';

    const cardEl = createCardElement(trick.card, 0);
    cardEl.style.pointerEvents = 'none';
    cardEl.style.cursor = 'default';

    const playerLabel = document.createElement('p');
    playerLabel.className = 'trick-player-name';
    playerLabel.textContent = trick.playerName;

    trickCardDiv.appendChild(cardEl);
    trickCardDiv.appendChild(playerLabel);
    cardsContainer.appendChild(trickCardDiv);
  });

  trickDiv.appendChild(cardsContainer);
}

function showRoundEnd() {
  document.getElementById('biddingSection').style.display = 'none';
  document.getElementById('playingSection').style.display = 'none';
  document.getElementById('roundEndSection').style.display = 'block';
  document.getElementById('trickDisplay').style.display = 'none';

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
  document.getElementById('trickDisplay').style.display = 'none';
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
