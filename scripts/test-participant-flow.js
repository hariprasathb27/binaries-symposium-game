/**
 * Participant Flow and Quiz UI/UX Verification Script
 */

const http = require('node:http');
const assert = require('node:assert');

const BASE_URL = 'http://127.0.0.1:3000';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || data });
      });
    }).on('error', reject);
  });
}

function post(path, body) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const req = http.request(
      `${BASE_URL}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || data });
        });
      }
    );
    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🧪 BINARIES PARTICIPANT FLOW & QUIZ UI/UX VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function test(desc, fn) {
    try {
      fn();
      console.log(`  ✔ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Health Endpoint
  console.log('--- Step 1: Health & Database Backend Verification ---');
  const health = await get('/api/health');
  test('GET /api/health returns 200 OK', () => {
    assert.strictEqual(health.status, 200);
    assert.strictEqual(health.body.status, 'ok');
  });
  test('Health reports database connected (sqlite-native)', () => {
    assert.strictEqual(health.body.database, 'connected (sqlite-native)');
  });
  test('Health reports questions >= 15 and scientists >= 12', () => {
    assert.ok(health.body.metrics.questions >= 15);
    assert.ok(health.body.metrics.scientists >= 12);
  });

  // 2. Game State Endpoint
  console.log('\n--- Step 2: Game State API Verification ---');
  const gameState = await get('/api/game/state');
  test('GET /api/game/state returns 200 OK with settings', () => {
    assert.strictEqual(gameState.status, 200);
    assert.ok(gameState.body.success);
    assert.strictEqual(gameState.body.data.settings.event_name, 'BINARIES');
    assert.strictEqual(gameState.body.data.settings.timer_duration, 20);
    assert.strictEqual(gameState.body.data.settings.total_rounds, 3);
  });

  // 3. Components Reference Endpoint
  console.log('\n--- Step 3: Components API Verification ---');
  const components = await get('/api/game/components');
  test('GET /api/game/components returns supporting hardware components', () => {
    assert.strictEqual(components.status, 200);
    assert.ok(components.body.success);
    assert.ok(components.body.data.length >= 5);
  });

  // 4. Anti-Cheat: Current Question Endpoint
  console.log('\n--- Step 4: Anti-Cheat Current Question API ---');
  const currentQ = await get('/api/game/current');
  test('GET /api/game/current returns 200 OK with question data', () => {
    assert.strictEqual(currentQ.status, 200);
    assert.ok(currentQ.body.success);
    assert.ok(currentQ.body.data);
  });
  test('ANTI-CHEAT: correct_option is STRICTLY OMITTED from client payload', () => {
    assert.strictEqual(currentQ.body.data.correct_option, undefined);
  });
  test('Question contains exactly 5 answer options (A through E)', () => {
    assert.strictEqual(currentQ.body.data.options.length, 5);
    const keys = currentQ.body.data.options.map((o) => o.key).sort();
    assert.deepStrictEqual(keys, ['A', 'B', 'C', 'D', 'E']);
  });
  test('Question includes Scientist card data with image_url', () => {
    assert.ok(currentQ.body.data.scientist);
    assert.ok(currentQ.body.data.scientist.name);
    assert.ok(currentQ.body.data.scientist.image_url);
  });

  // 5. Server-side Answer Evaluation
  console.log('\n--- Step 5: Server-side Answer Evaluation API ---');
  const activeQuestionId = currentQ.body.data.id;
  const submitRes = await post('/api/game/submit', {
    question_id: activeQuestionId,
    selected_option: 'B',
    participant_id: 'team_quantum_titans',
    submission_token: `token_test_${Date.now()}`,
  });
  test('POST /api/game/submit returns 200 with authoritative result', () => {
    assert.strictEqual(submitRes.status, 200);
    assert.ok(submitRes.body.success);
    assert.strictEqual(typeof submitRes.body.data.is_correct, 'boolean');
    assert.ok(typeof submitRes.body.data.correct_option === 'string');
  });

  // 6. Frontend Initial Render (Team Entry Welcome Screen)
  console.log('\n--- Step 6: Frontend Initial Welcome Screen Verification ---');
  const homeHtml = await get('/');
  test('Home page returns 200 OK HTML', () => {
    assert.strictEqual(homeHtml.status, 200);
    assert.ok(typeof homeHtml.body === 'string');
  });
  test('Initial render presents Team Entry Screen ("ENTER YOUR TEAM")', () => {
    const html = homeHtml.body;
    assert.ok(html.includes('BINARIES'), 'Contains BINARIES brand');
    assert.ok(html.includes('SCIENTIST &amp; INVENTION QUIZ') || html.includes('SCIENTIST & INVENTION QUIZ'), 'Contains Subtitle');
    assert.ok(html.includes('ENTER YOUR TEAM'), 'Presents ENTER YOUR TEAM header');
    assert.ok(html.includes('Team Name'), 'Contains Team Name label');
    assert.ok(html.includes('START GAME'), 'Contains START GAME CTA');
  });
  test('Initial render DOES NOT start the 20s quiz timer prematurely', () => {
    const html = homeHtml.body;
    // On the welcome screen, "REMAINING TIME" countdown card is not mounted
    assert.ok(!html.includes('REMAINING TIME'), 'Countdown timer is NOT rendered on welcome screen');
  });

  console.log('\n========================================================');
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner encountered an error:', err);
  process.exit(1);
});
