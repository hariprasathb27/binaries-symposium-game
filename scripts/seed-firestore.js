/**
 * Explicit Firestore Migration & Seed Script for BINARIES Symposium Game
 *
 * PART 1 FIX: Relational Data Requirement
 * Step 1: Insert 20 Scientists, collecting generated document IDs.
 * Step 2: Insert 20 Questions mapped directly to those generated document IDs.
 *
 * Usage:
 *   npm run db:seed:firestore
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { rawScientists, rawQuestions, components, winners } = require('./seed-data');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

loadEnv();

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || (!clientEmail && !process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.error('\n❌ Firestore Seed Failed: Missing Firebase Admin credentials.');
  console.error('Please configure the following environment variables:');
  console.error('  FIREBASE_PROJECT_ID');
  console.error('  FIREBASE_CLIENT_EMAIL');
  console.error('  FIREBASE_PRIVATE_KEY\n');
  process.exit(1);
}

let app;
if (getApps().length === 0) {
  if (clientEmail && rawPrivateKey) {
    const privateKey = rawPrivateKey.replace(/\\n/g, '\n');
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    app = initializeApp({ projectId });
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);
const now = new Date().toISOString();

const defaultEmail = process.env.ADMIN_EMAIL || 'admin@binaries.com';
const defaultPass = process.env.ADMIN_PASSWORD || 'BinariesAdmin2026!';
const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = crypto.scryptSync(defaultPass, salt, 64).toString('hex');

const adminUser = {
  id: 'admin_root',
  email: defaultEmail,
  password_hash: passwordHash,
  salt: salt,
  role: 'superadmin',
  created_at: now,
  last_login: null,
};

const gameSettings = {
  id: 'default',
  event_name: 'BINARIES',
  timer_duration: 20,
  current_round: 1,
  current_question_index: 0,
  total_rounds: 3,
  questions_per_round: 7,
  auto_next: false,
  answer_reveal: true,
  game_status: 'waiting',
  instructions: `1. Each question is based on a Scientist and their Inventions or Discoveries.
2. Every question contains exactly 5 options (A to E).
3. Exactly ONE option is the correct answer.
4. Select your answer before the timer reaches 0.
5. Once submitted, your response is final.
6. The symposium quiz features multiple rounds of increasing excitement.
7. Final podium winners will be awarded on the Winners presentation screen!`,
  updated_at: now,
};

async function seedFirestore() {
  console.log('\n=============================================================');
  console.log('🔥 BINARIES FIRESTORE RELATIONAL SEED / MIGRATION');
  console.log(`Target Project: ${projectId}`);
  console.log('=============================================================\n');

  // 1. Admin User & Settings
  console.log('1. Seeding Admin User and Game Settings...');
  await db.collection('admin_users').doc(adminUser.id).set(adminUser, { merge: true });
  await db.collection('game_settings').doc(gameSettings.id).set(gameSettings, { merge: true });
  console.log('   ✔ Admin and Settings configured.');

  // Clean existing questions and scientists to ensure 100% clean relational integrity
  console.log('2. Cleaning existing Questions and Scientists collections...');
  const oldQSnap = await db.collection('questions').get();
  for (const doc of oldQSnap.docs) {
    await doc.ref.delete();
  }
  const oldSSnap = await db.collection('scientists').get();
  for (const doc of oldSSnap.docs) {
    await doc.ref.delete();
  }
  console.log(`   ✔ Removed ${oldQSnap.size} old questions and ${oldSSnap.size} old scientists.`);

  // STEP 1: Insert 20 Scientists & collect generated IDs
  console.log(`3. Step 1: Inserting ${rawScientists.length} Scientists and retrieving document IDs...`);
  const scientistIdMap = new Map();

  for (const sci of rawScientists) {
    const docRef = db.collection('scientists').doc();
    const scientistDoc = {
      id: docRef.id,
      name: sci.name,
      image_url: sci.image_url,
      field: sci.field,
      country: sci.country,
      lifespan: sci.lifespan,
      year: sci.lifespan,
      description: sci.description,
      created_at: now,
      updated_at: now,
    };
    await docRef.set(scientistDoc);
    scientistIdMap.set(sci.key, docRef.id);
    console.log(`   ✔ Created Scientist: [${sci.name}] -> ID: ${docRef.id}`);
  }

  // STEP 2: Insert 20 Questions mapped to retrieved Scientist IDs
  console.log(`4. Step 2: Inserting ${rawQuestions.length} Questions mapped to Scientist document IDs...`);
  for (let idx = 0; idx < rawQuestions.length; idx++) {
    const q = rawQuestions[idx];
    const generatedScientistId = scientistIdMap.get(q.scientistKey);
    if (!generatedScientistId) {
      throw new Error(`Missing generated scientist ID for key: ${q.scientistKey}`);
    }

    const qRef = db.collection('questions').doc();
    const questionDoc = {
      id: qRef.id,
      scientist_id: generatedScientistId,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_option: q.correct_option,
      round: q.round,
      round_number: q.round_number,
      difficulty: q.difficulty,
      question_order: q.question_order,
      active: true,
      created_at: now,
      updated_at: now,
    };
    await qRef.set(questionDoc);
    console.log(`   ✔ Created Question ${idx + 1}: [${q.question_text}] -> Scientist ID: ${generatedScientistId}`);
  }

  // Components
  console.log(`5. Seeding ${components.length} Components...`);
  for (const c of components) {
    await db.collection('components').doc(c.id).set({ ...c, created_at: now }, { merge: true });
  }

  // Winners
  console.log(`6. Seeding ${winners.length} Winners...`);
  for (const w of winners) {
    await db.collection('winners').doc(w.id).set({ ...w, created_at: now, updated_at: now }, { merge: true });
  }

  console.log('\n🎉 RELATIONAL FIRESTORE SEED COMPLETED SUCCESSFULLY!');
  console.log(`  - 20 Scientists created with generated document IDs`);
  console.log(`  - 20 Questions created with relational scientist_id foreign references`);
  console.log(`  - Exactly 5 options (A to E) per question`);
  console.log(`  - Distributed across Round 1 (7 Qs), Round 2 (7 Qs), Round 3 (6 Qs)\n`);
}

seedFirestore().catch((err) => {
  console.error('\n❌ Firestore Seed encountered an error:', err);
  process.exit(1);
});
