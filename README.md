# BINARIES — Symposium Scientist Invention Quiz Platform

A live, game-show style quiz competition platform built for college symposiums. **BINARIES** centers around **Scientists and their Inventions / Discoveries**, engineered with real-time countdown timers, server-side anti-cheat verification, exactly 5 answer options per question, secure admin management, and a 3D celebration winner podium.

---

## 🚀 Key Features

### 1. 🎮 Live Quiz Engine (Tab 1: Game)
* **Scientist Card Prominently Displayed**: Displays high-res portrait, full name, field of study, era/year, country, and clue synopsis.
* **Strictly 5 Answer Options (A, B, C, D, E)**: Exactly 1 correct answer, 4 distractors.
* **Server-Side Anti-Cheat**: The `correct_option` is **NEVER** sent to the client browser before answer submission. All submissions are authenticated and validated on the backend.
* **Animated Circular Timer**: Default 20s (configurable to 10s, 15s, 20s, 30s, or custom). Shifts from Cyan to Amber (<5s) to Pulsing Red (<3s) and auto-locks at 0 ("TIME UP").
* **Web Audio API Sound Synthesizer**: Procedural countdown ticks, urgent pulses, select pops, correct fanfare, incorrect buzzers, and victory fanfare without missing audio files or CORS blocks.
* **Idempotency Protection**: Prevents duplicate answer submissions or score corruption.
* **Keyboard Navigation**: Press keys `A`-`E` or `1`-`5` to select options.
* **Game Rules & Reference Library**: Built-in modal for rules and hardware component reference sheet.

### 2. ⚙️ Secure Admin Console (Tab 2: Admin)
* **Real Authentication & Passcode Access**:
  - Email & Password: `admin@binaries.com` / `BinariesAdmin2026!`
  - Quick Symposium Security Passcode: `BINARIES2026`
  - Encrypted sessions via HTTP-only JWT cookies.
  - Rate limiting protection against brute force.
* **Question Management**:
  - Add, Edit, and Delete questions with confirmation dialog.
  - Requires exactly 5 options and exactly 1 correct answer.
  - Unlimited questions support across multiple rounds.
  - **🔀 Shuffle Questions**: Smooth shuffle animation for *Shuffle All Questions* and *Shuffle Current Round*.
* **Scientist Management**:
  - Add, Edit, and Delete scientists with custom portrait URLs, fields, eras, and biographies.
* **Component Management**:
  - Supporting electronic & hardware components (555 Timer, Microcontroller, Photodiode, Logic Gates, etc.).
  - Shuffle existing components and Add & Shuffle.
  - *(Note: Components are used strictly as reference/supporting data, no separate memory game).*
* **Winner & Podium Management**:
  - Manage 1st, 2nd, 3rd, and honorable mention winners, scores, and completion times.
* **Game Settings & Reset**:
  - Change default timers, questions per round, auto-advance, and instructions.
  - **Live Game Reset**: Resets current question and round back to start with confirmation without deleting any question data.

### 3. 🏆 Winners Podium (Tab 3: Winners)
* **3-Tier Illuminated Podium**:
  - 🥇 1st Place (Center / Elevated Gold Podium with Crown)
  - 🥈 2nd Place (Left Silver Podium)
  - 🥉 3rd Place (Right Bronze Podium)
* **Celebration Effects**: Automatic multi-burst confetti explosions (`canvas-confetti`) and victory fanfare audio.
* **Leaderboard Table**: Displays scores and completion times for all participating symposium teams.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15 (App Router) | Full-stack React framework with SSR and API routes |
| **Styling** | Tailwind CSS + CSS Variables | Glassmorphism, cyber neon accents, responsive layout |
| **Database** | Native SQLite (`node:sqlite`) | ACID transactional relational database built into Node 24 |
| **Alternative DB**| Firebase Firestore Adapter | Optional adapter mapping for cloud Firestore deployments |
| **Authentication** | `jose` (JWT) + `node:crypto` | Signed HTTP-only cookies and scrypt password hashing |
| **Audio Engine** | Web Audio API | Zero-dependency procedural retro game-show sound synthesis |
| **Effects** | Canvas-Confetti & Lucide Icons | Smooth celebration animations and modern iconography |

---

## 📦 Getting Started

### 1. Requirements
* Node.js v20+ or v24+
* npm or pnpm

### 2. Installation
```bash
npm install
```

### 3. Database Initialization & Seed
Pre-populates 12 renowned scientists, 15 symposium questions (5 options each), components, and initial podium winners:
```bash
npm run db:seed
```

### 4. Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Run
```bash
npm run build
npm run start
```

### 6. Automated Verification Tests
Run the 40+ automated end-to-end test suite:
```bash
node scripts/test-e2e.js
```

---

## 🛡️ Default Admin Credentials
* **Admin Email**: `admin@binaries.com`
* **Admin Password**: `BinariesAdmin2026!`
* **Security Passcode**: `BINARIES2026`

*(These can be customized in `.env.local` or directly inside the Admin Settings tab).*

---

## 🌐 Production Deployment

### Option 1: Node.js / Docker / Cloud Run
```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

### Option 2: Firebase App Hosting / Vercel
Simply configure environment variables (`SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) and deploy the repository.
