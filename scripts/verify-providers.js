/**
 * Direct Verification Script for Dual-Database Provider Architecture
 */

const assert = require('node:assert');

async function verifySQLite() {
  console.log('\n--- 1. Testing SQLite Provider (DATABASE_PROVIDER=SQLITE) ---');
  process.env.DATABASE_PROVIDER = 'SQLITE';

  // Clear module cache to test fresh load
  delete require.cache[require.resolve('../src/lib/db/index.ts')];
  delete require.cache[require.resolve('../src/lib/db/sqlite.ts')];

  const db = require('../src/lib/db/index.ts');

  assert.strictEqual(db.isFirestoreProvider(), false, 'isFirestoreProvider should be false');
  assert.strictEqual(db.getDatabaseProvider(), 'sqlite', 'getDatabaseProvider should be "sqlite"');

  const health = await db.getHealthStatus();
  console.log('Health Status:', health);
  assert.strictEqual(health.status, 'ok', 'Health status ok');
  assert.strictEqual(health.database, 'connected (sqlite-native)', 'Health db connected (sqlite-native)');
  assert.strictEqual(health.questionsCount, 15, '15 questions pre-seeded in SQLite');
  assert.strictEqual(health.scientistsCount, 12, '12 scientists pre-seeded in SQLite');

  const settings = await db.getGameSettings();
  console.log('Game Settings Event Name:', settings.event_name);
  assert.strictEqual(settings.event_name, 'BINARIES', 'Game settings event_name is BINARIES');

  const scientists = await db.getScientists();
  assert.strictEqual(scientists.length, 12, 'Should return exactly 12 scientists');
  console.log(`Loaded ${scientists.length} scientists successfully.`);

  const questions = await db.getQuestions();
  assert.strictEqual(questions.length, 15, 'Should return exactly 15 questions');
  console.log(`Loaded ${questions.length} questions successfully.`);

  const components = await db.getComponents();
  assert.strictEqual(components.length, 5, 'Should return 5 components');
  console.log(`Loaded ${components.length} components successfully.`);

  const winners = await db.getWinners();
  assert.ok(Array.isArray(winners), 'Should return winners array');
  console.log(`Loaded ${winners.length} winners from local SQLite.`);

  // Test Winner CRUD
  const testWinner = await db.createWinner({
    position: 1,
    team_name: 'Test Team',
    participant_name: 'Test Participant',
    score: 100,
    completion_time: '01:00',
  });
  assert.ok(testWinner.id, 'Created test winner with id');
  const updatedWinner = await db.updateWinner(testWinner.id, { score: 150 });
  assert.strictEqual(updatedWinner.score, 150, 'Updated test winner score');
  const deletedWinner = await db.deleteWinner(testWinner.id);
  assert.strictEqual(deletedWinner, true, 'Deleted test winner');
  console.log('Winner CRUD tested successfully.');

  // Anti-cheat verification
  const currentPublicQ = await db.getCurrentPublicQuestion();
  assert.ok(currentPublicQ, 'Current public question exists');
  assert.strictEqual(currentPublicQ.correct_option, undefined, 'ANTI-CHEAT: correct_option must NEVER be present on public question');
  assert.strictEqual(currentPublicQ.options.length, 5, 'Exactly 5 options returned');
  console.log('Anti-cheat check PASSED: correct_option is undefined on public question.');

  // Answer verification
  const answerResult = await db.verifyAnswer(currentPublicQ.id, 'B');
  assert.ok(typeof answerResult.is_correct === 'boolean', 'verifyAnswer returns boolean is_correct');
  assert.ok(typeof answerResult.correct_option === 'string', 'verifyAnswer reveals correct_option server-side');
  console.log(`Answer check PASSED: evaluated option B (is_correct: ${answerResult.is_correct}, actual: ${answerResult.correct_option})`);

  console.log('✔ All SQLite provider tests passed without regression!');
}

async function verifyFirestoreSafeguards() {
  console.log('\n--- 2. Testing Firestore Provider Safeguards (DATABASE_PROVIDER=FIRESTORE) ---');
  process.env.DATABASE_PROVIDER = 'FIRESTORE';

  const db = require('../src/lib/db/index.ts');

  assert.strictEqual(db.isFirestoreProvider(), true, 'isFirestoreProvider should be true in FIRESTORE mode');
  assert.strictEqual(db.getDatabaseProvider(), 'firestore', 'getDatabaseProvider should be "firestore"');

  // Verify getDb() throws descriptive error and never touches filesystem
  let threw = false;
  try {
    db.getDb();
  } catch (err) {
    threw = true;
    assert.ok(
      err.message.includes('getDb() is not available when DATABASE_PROVIDER is FIRESTORE'),
      `Correct error message thrown: ${err.message}`
    );
  }
  assert.ok(threw, 'getDb() must throw in FIRESTORE mode to prevent filesystem access');
  console.log('Filesystem safeguard PASSED: getDb() prevented filesystem access in FIRESTORE mode.');

  // Check firestore module does not import fs or node:sqlite
  const fs = require('node:fs');
  const firestoreCode = fs.readFileSync(require.resolve('../src/lib/db/firestore.ts'), 'utf8');
  assert.ok(!firestoreCode.includes("from 'node:sqlite'"), 'firestore.ts must not import node:sqlite');
  assert.ok(!firestoreCode.includes("from 'node:fs'"), 'firestore.ts must not import node:fs');
  assert.ok(!firestoreCode.includes("mkdirSync"), 'firestore.ts must not call mkdirSync');
  console.log('Vercel serverless safety PASSED: firestore.ts has ZERO references to node:sqlite, node:fs, or mkdirSync.');

  console.log('✔ All Firestore provider safeguards passed!');
}

async function run() {
  try {
    await verifySQLite();
    await verifyFirestoreSafeguards();
    console.log('\n=============================================');
    console.log('🎉 ALL DUAL-DATABASE ARCHITECTURE TESTS PASSED');
    console.log('=============================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification test failed:', err);
    process.exit(1);
  }
}

run();
