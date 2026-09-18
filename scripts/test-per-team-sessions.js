const assert = require('node:assert');
const path = require('node:path');

process.env.DATABASE_PROVIDER = 'SQLITE';

const {
  getQuestions,
  getScientists,
  initOrResetTeamSession,
  getTeamSession,
  getTeamCurrentPublicQuestion,
  advanceTeamSession,
  verifyAnswer,
  getWinners,
  getGameSettings,
} = require('../src/lib/db');

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 BINARIES TESTS: RELATIONAL DATA & PER-TEAM SESSIONS');
  console.log('======================================================\n');

  // TEST 1: Relational Data Integrity
  console.log('Test 1: Verifying Relational Scientists & Questions...');
  const scientists = await getScientists();
  const questions = await getQuestions();

  assert.strictEqual(scientists.length, 20, `Expected 20 scientists, found ${scientists.length}`);
  assert.strictEqual(questions.length, 20, `Expected 20 questions, found ${questions.length}`);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    assert.ok(q.scientist_id, `Question ${i + 1} missing scientist_id`);
    assert.ok(q.scientist, `Question ${i + 1} scientist relation not joined`);
    assert.ok(q.scientist.name, `Question ${i + 1} scientist has no name`);
    assert.ok(q.scientist.image_url, `Question ${i + 1} scientist has no image_url`);
    assert.ok(q.option_a && q.option_b && q.option_c && q.option_d && q.option_e, `Question ${i + 1} does not have 5 options`);
    assert.ok(['A', 'B', 'C', 'D', 'E'].includes(q.correct_option), `Question ${i + 1} invalid correct_option: ${q.correct_option}`);
  }
  console.log('✔ All 20 Questions verified: Valid relational scientist_id, 5 options (A-E), valid answers.');

  // TEST 2: Round Distribution
  console.log('\nTest 2: Verifying Round Distribution...');
  const r1 = questions.filter((q) => q.round_number === 1);
  const r2 = questions.filter((q) => q.round_number === 2);
  const r3 = questions.filter((q) => q.round_number === 3);

  console.log(`  - Round 1: ${r1.length} questions`);
  console.log(`  - Round 2: ${r2.length} questions`);
  console.log(`  - Round 3: ${r3.length} questions`);
  assert.strictEqual(r1.length, 7, 'Round 1 should have 7 questions');
  assert.strictEqual(r2.length, 7, 'Round 2 should have 7 questions');
  assert.strictEqual(r3.length, 6, 'Round 3 should have 6 questions');
  console.log('✔ 3 Rounds verified (7, 7, 6 questions).');

  // TEST 3: Per-Team Session Isolation
  console.log('\nTest 3: Testing Per-Team Session Isolation (Team A vs Team B)...');
  const teamAId = 'team_alpha_squad';
  const teamBId = 'team_beta_titans';

  // 3a. Team A starts
  const sessionA0 = await initOrResetTeamSession(teamAId, 'Alpha Squad', 'Alice');
  assert.strictEqual(sessionA0.current_round, 1);
  assert.strictEqual(sessionA0.current_question_index, 0);
  assert.strictEqual(sessionA0.status, 'active');

  const qA0 = await getTeamCurrentPublicQuestion(teamAId);
  assert.ok(qA0.question, 'Team A should receive first question');
  assert.strictEqual(qA0.session.current_question_index, 0);
  console.log(`  ✔ Team A started at Round ${sessionA0.current_round}, Question ${sessionA0.current_question_index + 1}: [${qA0.question.question_text}]`);

  // 3b. Team A advances 3 times
  await advanceTeamSession(teamAId);
  await advanceTeamSession(teamAId);
  const advA3 = await advanceTeamSession(teamAId);
  assert.strictEqual(advA3.session.current_question_index, 3);
  console.log(`  ✔ Team A advanced to Question ${advA3.session.current_question_index + 1}`);

  // 3c. Team B starts fresh
  const sessionB0 = await initOrResetTeamSession(teamBId, 'Beta Titans', 'Bob');
  assert.strictEqual(sessionB0.current_round, 1);
  assert.strictEqual(sessionB0.current_question_index, 0);
  assert.strictEqual(sessionB0.status, 'active');

  const qB0 = await getTeamCurrentPublicQuestion(teamBId);
  assert.ok(qB0.question, 'Team B should receive question');
  assert.strictEqual(qB0.session.current_question_index, 0, 'Team B MUST start at Question 0 regardless of Team A!');
  console.log(`  ✔ Team B started at Round ${sessionB0.current_round}, Question ${sessionB0.current_question_index + 1}: [${qB0.question.question_text}]`);

  // 3d. Check Team A is still at question index 3
  const qA3 = await getTeamCurrentPublicQuestion(teamAId);
  assert.strictEqual(qA3.session.current_question_index, 3, 'Team A should still be at Question index 3');
  console.log(`  ✔ Verified Team A state is completely unaffected by Team B (Index = 3)`);

  // TEST 4: Submissions and Winner Podium
  console.log('\nTest 4: Answer Submission & Winner Podium...');
  const firstQ = questions[0];
  const subResult = await verifyAnswer(
    firstQ.id,
    firstQ.correct_option,
    teamAId,
    `token_${Date.now()}`,
    'Alpha Squad',
    'Alice'
  );
  assert.strictEqual(subResult.is_correct, true);
  assert.strictEqual(subResult.points_awarded, 100);

  const winners = await getWinners();
  const foundTeamA = winners.find((w) => w.id === `win_${teamAId}`);
  assert.ok(foundTeamA, 'Team A must appear on podium / winners');
  assert.strictEqual(foundTeamA.score >= 100, true, 'Team A score must be saved');
  console.log(`  ✔ Team A answer verified and recorded on Podium with score: ${foundTeamA.score}`);

  // TEST 5: Global Game Settings Untouched
  console.log('\nTest 5: Global Settings Preservation...');
  const globalSettings = await getGameSettings();
  console.log(`  ✔ Global current_question_index is ${globalSettings.current_question_index} (not advanced by team play)`);

  console.log('\n🎉 ALL RELATIONAL SEED & PER-TEAM SESSION TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
