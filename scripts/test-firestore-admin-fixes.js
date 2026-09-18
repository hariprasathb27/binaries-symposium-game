const http = require('node:http');

const BASE_URL = 'http://127.0.0.1:3000';
let adminCookie = '';

async function request(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const method = options.method || 'GET';
  const headers = options.headers || {};
  if (adminCookie) {
    headers['Cookie'] = adminCookie;
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const setCookie = res.headers['set-cookie'];
          if (setCookie) {
            adminCookie = setCookie[0].split(';')[0];
          }

          let json = null;
          try {
            json = JSON.parse(data);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body: json || data });
        });
      }
    );

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING FIRESTORE/SQLITE ADMIN BUG FIXES');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Admin Login
    console.log('--- 1. Authenticating Admin Session ---');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: {
        securityCode: 'BINARIES2026',
      },
    });
    assert(loginRes.status === 200, `Admin logged in successfully with status 200`);
    assert(Boolean(adminCookie), `Session cookie captured`);

    // 1. Settings CRUD and Cache-Control
    console.log('\n--- 2. Settings Save & Cache Headers ---');
    const setRes = await request('/api/admin/settings', {
      method: 'PUT',
      body: {
        timer_duration: 15,
        event_name: 'BINARIES 2026 GRAND PRIX',
        total_rounds: 4,
        current_round: 1,
        auto_next: true,
        answer_reveal: true,
      },
    });
    assert(setRes.status === 200, `Settings updated with status 200`);
    assert(setRes.body.data.timer_duration === 15, `timer_duration updated to 15 (Got ${setRes.body.data?.timer_duration})`);
    assert(setRes.body.data.event_name === 'BINARIES 2026 GRAND PRIX', `event_name updated`);
    assert(setRes.headers['cache-control']?.includes('no-store'), `Settings PUT response has no-store cache header`);

    // Test POST to /api/admin/settings
    const setPostRes = await request('/api/admin/settings', {
      method: 'POST',
      body: {
        timer_duration: 25,
      },
    });
    assert(setPostRes.status === 200, `Settings POST endpoint works (Status 200)`);
    assert(setPostRes.body.data.timer_duration === 25, `timer_duration updated to 25 via POST`);

    // Test GET /api/game/state returns updated timer_duration
    const gameState = await request('/api/game/state');
    assert(gameState.status === 200, `GET /api/game/state returned 200`);
    assert(gameState.body.data.settings.timer_duration === 25, `GET /api/game/state reflects timer_duration = 25`);
    assert(gameState.headers['cache-control']?.includes('no-store'), `/api/game/state has no-store cache header`);

    // 2. Winner Creation & Management
    console.log('\n--- 3. Winner Add (POST) ---');
    const addWinRes = await request('/api/admin/winners', {
      method: 'POST',
      body: {
        position: 1,
        team_name: 'Super Quantum Coders',
        participant_name: 'Ada Lovelace & Alan Turing',
        score: 950,
        completion_time: '01:45',
      },
    });
    assert(addWinRes.status === 201, `Winner created with status 201 (Got ${addWinRes.status})`);
    assert(addWinRes.body.data.team_name === 'Super Quantum Coders', `Winner team name matches`);
    assert(addWinRes.headers['cache-control']?.includes('no-store'), `Winner POST has no-store cache header`);
    const createdWinnerId = addWinRes.body.data.id;

    // Test [id] route for GET
    console.log('\n--- 4. Winner [id] Route Verification ---');
    const getWinById = await request(`/api/admin/winners/${createdWinnerId}`);
    assert(getWinById.status === 200, `GET /api/admin/winners/[id] returned 200`);
    assert(getWinById.body.data.id === createdWinnerId, `Fetched winner matches created ID`);

    // Test [id] route for PUT
    const updateWinById = await request(`/api/admin/winners/${createdWinnerId}`, {
      method: 'PUT',
      body: {
        score: 980,
      },
    });
    assert(updateWinById.status === 200, `PUT /api/admin/winners/[id] returned 200`);
    assert(updateWinById.body.data.score === 980, `Winner score updated via [id] route`);

    // 3. Deletion and Non-Resurrection Verification
    console.log('\n--- 5. Winner Delete & Non-Resurrection Verification ---');
    const deleteWin = await request(`/api/admin/winners/${createdWinnerId}`, {
      method: 'DELETE',
    });
    assert(deleteWin.status === 200, `Winner deleted via DELETE /api/admin/winners/[id]`);

    // Call GET /api/admin/winners immediately to verify NO resurrection
    const winnersAfterDelete = await request('/api/admin/winners');
    assert(winnersAfterDelete.status === 200, `GET /api/admin/winners returned 200`);
    const foundDeleted = winnersAfterDelete.body.data.find((w) => w.id === createdWinnerId);
    assert(!foundDeleted, `Deleted winner was NOT resurrected in podium!`);

    // Also test DELETE via query param
    const addWin2 = await request('/api/admin/winners', {
      method: 'POST',
      body: {
        position: 2,
        team_name: 'Test Query Param Team',
        participant_name: 'Tester',
        score: 500,
        completion_time: '02:00',
      },
    });
    const id2 = addWin2.body.data.id;
    const deleteWinQuery = await request(`/api/admin/winners?id=${id2}`, {
      method: 'DELETE',
    });
    assert(deleteWinQuery.status === 200, `Winner deleted via DELETE ?id= query param`);

    const winnersAfterDelete2 = await request('/api/admin/winners');
    const foundDeleted2 = winnersAfterDelete2.body.data.find((w) => w.id === id2);
    assert(!foundDeleted2, `Query-param deleted winner was NOT resurrected!`);

    // 4. Live Reset
    console.log('\n--- 6. Game Reset Verification ---');
    const resetRes = await request('/api/admin/reset', { method: 'POST' });
    assert(resetRes.status === 200, `Game reset returned 200 OK`);
    assert(resetRes.body.data.current_round === 1, `Game reset current_round = 1`);
    assert(resetRes.body.data.current_question_index === 0, `Game reset current_question_index = 0`);
    assert(resetRes.headers['cache-control']?.includes('no-store'), `Reset response has no-store cache header`);

    console.log('\n======================================================');
    console.log(`🏁 RESULT: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('Fatal verification error:', err);
    process.exit(1);
  }
}

runTests();
