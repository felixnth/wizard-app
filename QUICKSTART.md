# Quick Start Guide - Wizard Card Game

## Installation & Running Locally

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
http://localhost:3000
```

## Features Implemented ✓

### Backend (Node.js + Express + Socket.io)
- ✓ Complete game logic with 60-card deck (4 colors 1-13 + 4 Jesters + 4 Wizards)
- ✓ Multi-game support via Socket.io rooms
- ✓ Real-time multiplayer with Socket.io
- ✓ Automatic card dealing and game flow
- ✓ Trick evaluation with Wizard/Jester special rules
- ✓ Automatic score calculation
- ✓ SQLite database for game history (optional persistence)

### Frontend - Two Game Modes

**1. Scoreblock Mode (Punkteblock)**
- ✓ Digital score sheet interface
- ✓ Enter player names (3-6 players)
- ✓ Input bids and tricks won for each round
- ✓ Automatic score calculation
- ✓ Final standings with medals
- ✓ Mobile-responsive design

**2. Full Game Mode (Volles Spiel)**
- ✓ Real-time multiplayer gameplay
- ✓ Game creation with shareable code
- ✓ Real-time card dealing
- ✓ Bidding phase with visual feedback
- ✓ Card playing with validation
- ✓ Live score tracking
- ✓ Round progression
- ✓ Final rankings

### UI/UX
- ✓ Mobile-first dark theme (navy background)
- ✓ Purple/gold accent colors
- ✓ German language terminology
- ✓ Responsive design for all devices
- ✓ Real-time state updates
- ✓ Smooth animations and transitions

### Deployment Ready
- ✓ Procfile for Heroku/similar platforms
- ✓ render.yaml for Render.com deployment
- ✓ .env.example configuration
- ✓ .gitignore for clean repository

## Project Structure

```
wizard-app/
├── server.js              # Express + Socket.io backend (467 lines)
├── package.json           # NPM dependencies
├── Procfile               # Deployment configuration
├── render.yaml            # Render.com deployment config
├── README.md              # Full documentation
├── .gitignore             # Git ignore rules
├── .env.example           # Environment variables example
└── public/
    ├── index.html         # Landing page (mode selection)
    ├── scoreblock.html    # Scoreblock mode UI
    ├── game.html          # Full game mode UI
    ├── style.css          # Shared dark theme styles
    ├── scoreblock.js      # Scoreblock mode logic (211 lines)
    └── game.js            # Full game mode + Socket.io (353 lines)
```

## Deployment on Render.com

1. Push repository to GitHub
2. Go to https://render.com
3. Create New → Web Service
4. Connect GitHub repository
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node.js
6. Deploy!

## Game Rules at a Glance

- **Players:** 3-6
- **Rounds:** 60 ÷ player count (e.g., 4 players = 15 rounds)
- **Round N:** Each player gets N cards
- **Trump:** One card revealed as trump for the round
- **Bidding:** Bid how many tricks you'll win (0 to N)
- **Playing:** Follow suit if possible
- **Scoring:** Exact bid = 20 + (10 × tricks) | Wrong = -10 × |bid - actual|

### Trick Rules
- **Wizard:** Always wins
- **Jester:** Always loses (unless only Jesters played)
- **Trump:** Beats regular cards
- **Otherwise:** Highest card of led suit wins

## Testing

All endpoints tested and working:
- ✓ HTML pages load correctly
- ✓ CSS styling applies
- ✓ API endpoints functional
- ✓ Socket.io events configured
- ✓ Game logic validated
- ✓ Score calculations correct

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js |
| Server | Express.js |
| Real-time | Socket.io |
| Frontend | Vanilla HTML/CSS/JS |
| Database | SQLite (optional) |
| Deployment | Render.com ready |

## German Terminology Used

| German | English | Usage |
|--------|---------|-------|
| Stich | Trick | Cards won in a round |
| Gebot | Bid | How many tricks you predict |
| Narr | Jester | Always loses card |
| Zauberer | Wizard | Always wins card |
| Trumpf | Trump | Special suit for round |
| Runde | Round | Single game round |
| Spieler | Player | Game participant |

## Browser Support

- Chrome/Chromium ✓
- Firefox ✓
- Safari ✓
- Edge ✓
- Mobile browsers ✓

## Notes

- Supports multiple simultaneous games
- Games are stored in memory (+ optional SQLite persistence)
- No authentication required (local/LAN play)
- Fully responsive for mobile play
- Dark theme optimized for low-light environments
