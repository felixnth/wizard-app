const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: "*" }
});

app.use(express.static('public'));
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./wizard.db');
db.run(`
  CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    mode TEXT,
    players TEXT,
    created_at DATETIME,
    final_scores TEXT
  )
`);

// Game state management
const games = new Map();

// Game class
class WizardGame {
  constructor(gameId, playerCount, mode = 'full') {
    this.id = gameId;
    this.mode = mode;
    this.players = [];
    this.maxPlayers = playerCount;
    this.roundNumber = 0;
    this.totalRounds = Math.floor(60 / playerCount);
    this.currentRound = null;
    this.state = 'waiting'; // waiting, bidding, playing, roundEnd, gameEnd
    this.scores = {};
  }

  addPlayer(playerId, playerName) {
    if (this.players.length < this.maxPlayers) {
      this.players.push({ id: playerId, name: playerName, hand: [], bid: null, tricks: 0 });
      this.scores[playerId] = 0;
      return true;
    }
    return false;
  }

  // Card management
  createDeck() {
    const deck = [];
    const colors = ['R', 'B', 'G', 'Y']; // Red, Blue, Green, Yellow

    // Regular cards 1-13
    for (const color of colors) {
      for (let value = 1; value <= 13; value++) {
        deck.push({ type: 'card', color, value });
      }
    }

    // Jesters (Narren)
    for (let i = 0; i < 4; i++) {
      deck.push({ type: 'jester', id: `jester-${i}` });
    }

    // Wizards (Zauberer)
    for (let i = 0; i < 4; i++) {
      deck.push({ type: 'wizard', id: `wizard-${i}` });
    }

    return deck.sort(() => Math.random() - 0.5);
  }

  startRound() {
    this.roundNumber++;
    if (this.roundNumber > this.totalRounds) {
      this.state = 'gameEnd';
      return false;
    }

    const deck = this.createDeck();
    const cardsPerPlayer = this.roundNumber;

    // Reset player hands and bids
    this.players.forEach(p => {
      p.hand = [];
      p.bid = null;
      p.tricks = 0;
      p.playedCard = null;
    });

    // Deal cards
    let deckIndex = 0;
    for (let i = 0; i < cardsPerPlayer; i++) {
      for (const player of this.players) {
        if (deckIndex < deck.length) {
          player.hand.push(deck[deckIndex++]);
        }
      }
    }

    // Trump card
    const trumpCard = deckIndex < deck.length ? deck[deckIndex] : null;

    this.currentRound = {
      number: this.roundNumber,
      cardsPerPlayer,
      trumpCard,
      trumpColor: trumpCard && trumpCard.type === 'card' ? trumpCard.color : null,
      playedCards: [],
      ledSuit: null,
      currentPlayerIndex: 0,
      bidsEntered: 0,
      totalBidSum: 0
    };

    this.state = 'bidding';
    return true;
  }

  setBid(playerId, bidAmount) {
    const player = this.players.find(p => p.id === playerId);
    if (player && bidAmount >= 0 && bidAmount <= this.currentRound.cardsPerPlayer) {
      player.bid = bidAmount;
      this.currentRound.bidsEntered++;
      this.currentRound.totalBidSum += bidAmount;

      if (this.currentRound.bidsEntered === this.players.length) {
        this.state = 'playing';
        this.currentRound.playedCards = [];
        this.currentRound.currentPlayerIndex = 0;
      }
      return true;
    }
    return false;
  }

  playCard(playerId, cardIndex) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || cardIndex < 0 || cardIndex >= player.hand.length) {
      return false;
    }

    // Check if it's this player's turn
    const currentPlayer = this.players[this.currentRound.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      return false; // Not this player's turn
    }

    const card = player.hand[cardIndex];

    // Validate card play (must follow suit if possible)
    if (this.currentRound.ledSuit) {
      const hasSuitCard = player.hand.some(c =>
        c.type === 'card' && c.color === this.currentRound.ledSuit
      );
      if (hasSuitCard && !(card.type === 'card' && card.color === this.currentRound.ledSuit)
          && card.type !== 'wizard' && card.type !== 'jester') {
        return false; // Must follow suit
      }
    }

    player.playedCard = card;
    player.hand.splice(cardIndex, 1);
    this.currentRound.playedCards.push({ player: playerId, card });

    // If first card, set led suit
    if (this.currentRound.playedCards.length === 1 && card.type === 'card') {
      this.currentRound.ledSuit = card.color;
    }

    // Move to next player's turn
    this.currentRound.currentPlayerIndex = (this.currentRound.currentPlayerIndex + 1) % this.players.length;

    // Check if trick is complete
    if (this.currentRound.playedCards.length === this.players.length) {
      this.evaluateTrick();
    }

    return true;
  }

  evaluateTrick() {
    const playedCards = this.currentRound.playedCards;
    let winnerIndex = -1;
    let winnerCard = null;

    // Check for wizard (always wins)
    for (let i = 0; i < playedCards.length; i++) {
      if (playedCards[i].card.type === 'wizard') {
        winnerIndex = i;
        break;
      }
    }

    // Check for jester (always loses), unless wizard present
    if (winnerIndex === -1) {
      let hasJester = false;
      for (let i = 0; i < playedCards.length; i++) {
        if (playedCards[i].card.type === 'jester') {
          hasJester = true;
          playedCards[i].card.isLoser = true;
        }
      }
    }

    // Check for trump card
    if (winnerIndex === -1) {
      for (let i = 0; i < playedCards.length; i++) {
        const card = playedCards[i].card;
        if (card.type === 'card' && card.color === this.currentRound.trumpColor) {
          if (!winnerCard || card.value > winnerCard.value) {
            winnerCard = card;
            winnerIndex = i;
          }
        }
      }
    }

    // Highest card of led suit
    if (winnerIndex === -1 && this.currentRound.ledSuit) {
      for (let i = 0; i < playedCards.length; i++) {
        const card = playedCards[i].card;
        if (card.type === 'card' && card.color === this.currentRound.ledSuit) {
          if (!winnerCard || card.value > winnerCard.value) {
            winnerCard = card;
            winnerIndex = i;
          }
        }
      }
    }

    if (winnerIndex >= 0) {
      const winnerId = playedCards[winnerIndex].player;
      const winner = this.players.find(p => p.id === winnerId);
      if (winner) {
        winner.tricks++;
      }
    }

    // Check if round is complete
    if (this.players.every(p => p.hand.length === 0)) {
      this.endRound();
    } else {
      this.currentRound.playedCards = [];
      this.currentRound.ledSuit = null;
      // currentPlayerIndex continues from where it left off
    }
  }

  endRound() {
    // Calculate scores
    for (const player of this.players) {
      const bid = player.bid;
      const tricks = player.tricks;

      if (bid === tricks) {
        player.roundScore = 20 + (10 * tricks);
      } else {
        player.roundScore = -10 * Math.abs(bid - tricks);
      }

      this.scores[player.id] += player.roundScore;
    }

    this.state = 'roundEnd';
  }

  getGameState() {
    return {
      id: this.id,
      roundNumber: this.roundNumber,
      totalRounds: this.totalRounds,
      state: this.state,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        bid: p.bid,
        tricks: p.tricks,
        roundScore: p.roundScore,
        totalScore: this.scores[p.id],
        handSize: p.hand.length
      })),
      currentRound: {
        ...this.currentRound,
        currentTrick: this.currentRound.playedCards.map(pc => ({
          playerId: pc.player,
          playerName: this.players.find(p => p.id === pc.player)?.name || 'Unknown',
          card: pc.card
        }))
      },
      scores: this.scores
    };
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scoreblock', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scoreblock.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.post('/api/games', (req, res) => {
  const { playerCount, mode } = req.body;
  if (playerCount < 3 || playerCount > 6) {
    return res.status(400).json({ error: 'Player count must be 3-6' });
  }

  const gameId = Math.random().toString(36).substring(7).toUpperCase();
  const game = new WizardGame(gameId, playerCount, mode || 'full');
  games.set(gameId, game);

  res.json({ gameId });
});

app.get('/api/games/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  res.json(game.getGameState());
});

// Socket.io events
io.on('connection', (socket) => {
  let currentGameId = null;
  let playerId = null;

  socket.on('joinGame', (data) => {
    const { gameId, playerName } = data;
    const game = games.get(gameId);

    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    playerId = socket.id;
    currentGameId = gameId;

    if (game.addPlayer(playerId, playerName)) {
      socket.join(gameId);
      io.to(gameId).emit('gameStateUpdated', game.getGameState());

      if (game.players.length === game.maxPlayers) {
        game.startRound();
        io.to(gameId).emit('gameStateUpdated', game.getGameState());
        io.to(gameId).emit('roundStarted', {
          round: game.currentRound.number,
          cardsPerPlayer: game.currentRound.cardsPerPlayer,
          trumpCard: game.currentRound.trumpCard
        });

        // For round 1 (blind bidding): don't send hand yet
        // For round 2+: send hand immediately
        if (game.currentRound.number > 1) {
          for (const player of game.players) {
            io.to(player.id).emit('hand', player.hand);
          }
        }
      }
    } else {
      socket.emit('error', { message: 'Game is full' });
    }
  });

  socket.on('placeBid', (data) => {
    const { gameId, bidAmount } = data;
    const game = games.get(gameId);

    if (game && game.setBid(playerId, bidAmount)) {
      io.to(gameId).emit('gameStateUpdated', game.getGameState());

      if (game.state === 'playing') {
        // For round 1, send hands now (after bidding is complete)
        if (game.currentRound.number === 1) {
          for (const player of game.players) {
            io.to(player.id).emit('hand', player.hand);
          }
        }
        io.to(gameId).emit('biddingComplete', { message: 'Bidding complete, playing phase started' });
      }
    }
  });

  socket.on('playCard', (data) => {
    const { gameId, cardIndex } = data;
    const game = games.get(gameId);

    if (game && game.playCard(playerId, cardIndex)) {
      // Send updated hand to the player who just played
      const player = game.players.find(p => p.id === playerId);
      io.to(playerId).emit('hand', player.hand);

      io.to(gameId).emit('cardPlayed', {
        playerName: player.name,
        card: player.playedCard
      });

      io.to(gameId).emit('gameStateUpdated', game.getGameState());

      if (game.state === 'roundEnd') {
        io.to(gameId).emit('roundEnded', {
          round: game.roundNumber,
          scores: game.scores
        });
      }
    }
  });

  socket.on('nextRound', (data) => {
    const { gameId } = data;
    const game = games.get(gameId);

    if (game && game.state === 'roundEnd') {
      if (game.startRound()) {
        io.to(gameId).emit('gameStateUpdated', game.getGameState());
        io.to(gameId).emit('roundStarted', {
          round: game.currentRound.number,
          cardsPerPlayer: game.currentRound.cardsPerPlayer,
          trumpCard: game.currentRound.trumpCard
        });

        // For round 1 (blind bidding): don't send hand yet
        // For round 2+: send hand immediately
        if (game.currentRound.number > 1) {
          for (const player of game.players) {
            io.to(player.id).emit('hand', player.hand);
          }
        }
      } else {
        io.to(gameId).emit('gameEnded', {
          finalScores: game.scores
        });
      }
    }
  });

  socket.on('disconnect', () => {
    if (currentGameId) {
      const game = games.get(currentGameId);
      if (game) {
        game.players = game.players.filter(p => p.id !== playerId);
        if (game.players.length === 0) {
          games.delete(currentGameId);
        }
      }
    }
  });
});

// Scoreblock mode specific
app.post('/api/scoreblock', (req, res) => {
  const { playerNames, mode } = req.body;
  const gameId = Math.random().toString(36).substring(7).toUpperCase();
  const game = new WizardGame(gameId, playerNames.length, 'scoreblock');

  for (const name of playerNames) {
    game.addPlayer(Math.random().toString(36).substring(7), name);
  }

  games.set(gameId, game);
  res.json({ gameId });
});

app.put('/api/scoreblock/:gameId/round', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const { bids, tricks } = req.body;

  game.startRound();

  // Set bids and tricks
  for (let i = 0; i < game.players.length; i++) {
    game.players[i].bid = bids[i];
    game.players[i].tricks = tricks[i];
  }

  game.endRound();
  res.json(game.getGameState());
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Wizard card game server running on port ${PORT}`);
});
