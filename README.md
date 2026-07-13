# Wizard Card Game Web App

A complete web-based implementation of the Austrian/German card game "Wizard" with two modes: a digital scoreblock and full multiplayer online gameplay.

## Features

### 🎯 Two Game Modes

**1. Scoreblock Mode (Punkteblock)**
- Digital score sheet for in-person games
- Host enters player names and tracks bids/tricks for each round
- Automatic score calculation
- Perfect for playing with physical cards at the table

**2. Full Game Mode (Volles Spiel)**
- Complete multiplayer game via Socket.io
- Real-time gameplay on multiple devices
- Each player on their own phone/device
- Automatic card dealing and game flow
- Live score tracking

## Game Rules

### Setup
- **Players:** 3-6 players
- **Deck:** 60 cards total
  - 4 colors (Red/Blau, Blue/Blau, Green/Grün, Yellow/Gelb) with values 1-13
  - 4 Jesters (Narren) - always lose tricks
  - 4 Wizards (Zauberer) - always win tricks
- **Rounds:** Number of rounds = 60 ÷ player count
  - 4 players = 15 rounds
  - 3 players = 20 rounds
  - 5 players = 12 rounds
  - 6 players = 10 rounds

### Round Flow
1. **Deal:** Each player gets N cards (N = round number), starting with 1 card in round 1
2. **Trump:** One card is revealed as trump
3. **Bidding:** Each player bids how many tricks they will win (0 to N)
4. **Playing:** Players play cards following suit if possible
5. **Scoring:** Calculate points based on whether bid was met

### Trick Rules
- **Wizard (Zauberer):** Always wins the trick
- **Jester (Narr):** Always loses the trick
- **Trump cards:** Beat all non-special cards
- **Suit:** Highest card of the led suit wins (unless trumped or special card played)

### Scoring
- **Exact bid:** `20 + (10 × tricks won)`
- **Wrong bid:** `-10 × |bid - actual tricks|`

Example:
- Player bids 3 tricks and wins exactly 3: `20 + (10 × 3) = 50 points`
- Player bids 4 tricks but wins only 3: `-10 × |4 - 3| = -10 points`

## Installation

```bash
# Clone or navigate to project
cd wizard-app

# Install dependencies
npm install

# Start the server
npm start
```

Server runs on `http://localhost:3000`

## Deployment on Render.com

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add environment variable: `PORT=3000`

## Project Structure

```
wizard-app/
├── server.js              # Express + Socket.io backend
├── package.json
├── README.md
├── .gitignore
├── wizard.db              # SQLite database (auto-created)
└── public/
    ├── index.html         # Landing page
    ├── scoreblock.html    # Scoreblock mode UI
    ├── game.html          # Full game mode UI
    ├── style.css          # Shared styles (dark theme)
    ├── scoreblock.js      # Scoreblock mode logic
    └── game.js            # Full game mode logic (Socket.io)
```

## Technology Stack

- **Backend:** Node.js, Express.js, Socket.io
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Database:** SQLite (optional persistence)
- **Deployment:** Render.com ready
- **UI:** Mobile-first dark theme with purple/gold accents

## How to Play

### Scoreblock Mode
1. Enter player names (3-6 players)
2. For each round, enter each player's bid and tricks won
3. Scores are calculated automatically
4. Game progresses through all rounds until completion
5. Final standings displayed with medals

### Full Game Mode
1. One player creates a new game and gets a game code
2. Share the code with other players
3. Each player joins with their name
4. Game starts automatically when all players join
5. Each round:
   - Players see their hand of cards
   - Place bids on tricks they'll win
   - Play cards in turn (follow suit if possible)
   - Tricks evaluated automatically
   - Scores updated
6. Game ends after all rounds completed
7. Final rankings shown

## German Terminology

- **Stich** = Trick (cards won in a round)
- **Gebot** = Bid (how many tricks you'll win)
- **Narr** = Jester (always loses)
- **Zauberer** = Wizard (always wins)
- **Trumpf** = Trump (special suit for the round)
- **Punkteblock** = Score sheet
- **Volles Spiel** = Full game

## Browser Compatibility

- Chrome (Desktop & Mobile) ✅
- Firefox (Desktop & Mobile) ✅
- Safari (Desktop & Mobile) ✅
- Edge ✅

## License

MIT

## Notes

- Multiple games can run simultaneously on the same server
- Socket.io manages real-time communication for multiplayer
- SQLite stores game history (optional feature)
- Fully responsive design optimized for mobile devices
