const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { rawScientists, rawQuestions, components, winners } = require('./seed-data');

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'binaries.db');
const db = new DatabaseSync(dbPath);

console.log('Initializing BINARIES Symposium Quiz SQLite Database at:', dbPath);

// Execute Schema
const schemaPath = path.resolve(__dirname, '../src/lib/db/schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// 1. SEED ADMIN USER
const defaultEmail = process.env.ADMIN_EMAIL || 'admin@binaries.com';
const defaultPass = process.env.ADMIN_PASSWORD || 'BinariesAdmin2026!';
const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = crypto.scryptSync(defaultPass, salt, 64).toString('hex');
const now = new Date().toISOString();

const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(defaultEmail);
if (!existingAdmin) {
  db.prepare(`
    INSERT INTO admin_users (id, email, password_hash, salt, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('admin_root', defaultEmail, passwordHash, salt, 'superadmin', now);
  console.log('✔ Default Admin created:', defaultEmail);
}

// 2. SEED GAME SETTINGS
const instructions = `1. Each question is based on a Scientist and their Inventions or Discoveries.
2. Every question contains exactly 5 options (A to E).
3. Exactly ONE option is the correct answer.
4. Select your answer before the timer reaches 0.
5. Once submitted, your response is final.
6. The symposium quiz features multiple rounds of increasing excitement.
7. Final podium winners will be awarded on the Winners presentation screen!`;

db.prepare(`
  INSERT OR REPLACE INTO game_settings (
    id, event_name, timer_duration, current_round, current_question_index,
    total_rounds, questions_per_round, auto_next, answer_reveal, game_status,
    instructions, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('default', 'BINARIES', 20, 1, 0, 3, 7, 0, 1, 'waiting', instructions, now);
console.log('✔ Default Game Settings seeded (total_rounds: 3).');

// Clean existing questions and scientists to guarantee relational integrity
db.exec('DELETE FROM questions;');
db.exec('DELETE FROM scientists;');
console.log('✔ Purged old questions and scientists.');

// 3. STEP 1: INSERT 20 SCIENTISTS & COLLECT IDS
const scientistIdMap = new Map();
const insertScientist = db.prepare(`
  INSERT INTO scientists (id, name, image_url, description, field, country, year, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const sci of rawScientists) {
  const sciId = `sci_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
  insertScientist.run(
    sciId,
    sci.name,
    sci.image_url,
    sci.description,
    sci.field,
    sci.country,
    sci.lifespan,
    now,
    now
  );
  scientistIdMap.set(sci.key, sciId);
  console.log(`  ✔ Inserted Scientist: [${sci.name}] -> ID: ${sciId}`);
}

// 4. STEP 2: INSERT 20 QUESTIONS MAPPED RELATIONALLY TO SCIENTISTS
const insertQuestion = db.prepare(`
  INSERT INTO questions (
    id, scientist_id, question_text, option_a, option_b, option_c, option_d, option_e,
    correct_option, round_number, difficulty, question_order, active, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (let idx = 0; idx < rawQuestions.length; idx++) {
  const q = rawQuestions[idx];
  const scientistId = scientistIdMap.get(q.scientistKey);
  if (!scientistId) {
    throw new Error(`Missing scientist ID for key: ${q.scientistKey}`);
  }
  const qId = `q_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`;
  insertQuestion.run(
    qId,
    scientistId,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.option_e,
    q.correct_option,
    q.round_number,
    q.difficulty,
    q.question_order,
    1,
    now,
    now
  );
  console.log(`  ✔ Inserted Question ${idx + 1}: [${q.question_text}] -> Scientist ID: ${scientistId}`);
}

// 5. SEED COMPONENTS
const insertComponent = db.prepare(`
  INSERT OR REPLACE INTO components (id, name, image_url, description, category, active, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
for (const c of components) {
  insertComponent.run(c.id, c.name, c.image_url, c.description, c.category, c.active ? 1 : 0, now);
}
console.log(`✔ Seeded ${components.length} Components.`);

// 6. SEED WINNERS
const insertWinner = db.prepare(`
  INSERT OR REPLACE INTO winners (id, position, team_name, participant_name, score, completion_time, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const w of winners) {
  insertWinner.run(w.id, w.position, w.team_name, w.participant_name, w.score, w.completion_time, now, now);
}
console.log(`✔ Seeded ${winners.length} Winners.`);

console.log('\n🎉 SQLITE DATABASE INITIALIZATION COMPLETE!');
console.log(`- 20 Scientists seeded`);
console.log(`- 20 Questions seeded across 3 rounds (7, 7, 6 questions)`);
console.log(`- Exactly 5 options per question`);
console.log(`- All questions properly mapped to scientist foreign keys.\n`);
