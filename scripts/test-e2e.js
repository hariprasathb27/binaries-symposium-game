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
          // Extract Set-Cookie if present
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
  console.log('\n========================================');
  console.log('🧪 BINARIES E2E PRODUCTION VERIFICATION');
  console.log('========================================\n');

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
    // 1. Health Check
    console.log('--- Test 1: Health Check Endpoint ---');
    const health = await request('/api/health');
    assert(health.status === 200, `Health status 200 (Got ${health.status})`);
    assert(health.body.status === 'ok', `Health status is "ok"`);
    assert(health.body.metrics.questions >= 15, `Pre-seeded questions count >= 15 (${health.body.metrics.questions})`);
    assert(health.body.metrics.scientists >= 12, `Pre-seeded scientists count >= 12 (${health.body.metrics.scientists})`);

    // 2. Anti-Cheat: Current Question
    console.log('\n--- Test 2: Anti-Cheat Question Endpoint ---');
    const curr = await request('/api/game/current');
    assert(curr.status === 200, `Current question status 200`);
    assert(curr.body.data !== null, `Active question exists`);
    assert(curr.body.data.options.length === 5, `Strictly 5 answer options returned`);
    assert(curr.body.data.correct_option === undefined, `ANTI-CHEAT: correct_option is NOT exposed to client!`);
    assert(Boolean(curr.body.data.scientist), `Scientist card data attached`);
    assert(Boolean(curr.body.data.scientist.name), `Scientist name is present (${curr.body.data.scientist.name})`);

    const activeQuestionId = curr.body.data.id;

    // 3. Answer Submission & Server-side Verification
    console.log('\n--- Test 3: Server-side Answer Evaluation ---');
    const submitRes = await request('/api/game/submit', {
      method: 'POST',
      body: {
        question_id: activeQuestionId,
        selected_option: 'B',
        participant_id: 'test_team_1',
        submission_token: 'token_test_1',
      },
    });
    assert(submitRes.status === 200, `Submit endpoint returned 200`);
    assert(submitRes.body.success === true, `Submission successful`);
    assert(typeof submitRes.body.data.is_correct === 'boolean', `Result evaluated boolean is_correct: ${submitRes.body.data.is_correct}`);
    assert(Boolean(submitRes.body.data.correct_option), `Server reveals correct option post-submission: ${submitRes.body.data.correct_option}`);

    // 4. Idempotency & Duplicate Submission Protection
    console.log('\n--- Test 4: Duplicate Submission Protection (Idempotency) ---');
    const dupRes = await request('/api/game/submit', {
      method: 'POST',
      body: {
        question_id: activeQuestionId,
        selected_option: 'B',
        participant_id: 'test_team_1',
        submission_token: 'token_test_1',
      },
    });
    assert(dupRes.body.data.already_submitted === true, `Duplicate submission flagged as already_submitted`);

    // 5. Unauthorized Admin Access Block
    console.log('\n--- Test 5: Admin Route Security & Authorization ---');
    const unauth = await request('/api/admin/questions');
    assert(unauth.status === 401, `Unauthenticated request correctly returned 401 Unauthorized`);

    // 6. Admin Authentication (Security Passcode)
    console.log('\n--- Test 6: Admin Login (Passcode & Password) ---');
    const loginCode = await request('/api/auth/login', {
      method: 'POST',
      body: { securityCode: 'BINARIES2026' },
    });
    assert(loginCode.status === 200, `Login with security code returned 200`);
    assert(loginCode.body.success === true, `Login succeeded`);
    assert(Boolean(adminCookie), `Session cookie generated (${adminCookie.substring(0, 25)}...)`);

    const meRes = await request('/api/auth/me');
    assert(meRes.body.authenticated === true, `Session verified via /api/auth/me`);

    // 7. Question Management (CRUD & Shuffle)
    console.log('\n--- Test 7: Question Management CRUD & Shuffle ---');
    // Shuffle All
    const shuffleRes = await request('/api/admin/shuffle', {
      method: 'POST',
      body: { mode: 'all' },
    });
    assert(shuffleRes.status === 200, `Shuffle All returned 200`);
    assert(shuffleRes.body.success === true, `Shuffle succeeded`);

    // Create New Question (Validation: exactly 5 options)
    const sciListRes = await request('/api/admin/scientists');
    const validSciId = sciListRes.body.data?.[0]?.id || 'sci_tesla';

    const newQuestionRes = await request('/api/admin/questions', {
      method: 'POST',
      body: {
        scientist_id: validSciId,
        question_text: 'What experimental device did Tesla construct at Colorado Springs in 1899 to transmit wireless electrical power?',
        option_a: 'Magnifying Transmitter',
        option_b: 'Dynamo-Electric Machine',
        option_c: 'Vacuum Arc Rectifier',
        option_d: 'Mercury Vapor Converter',
        option_e: 'Carbon Microphone Resonator',
        correct_option: 'A',
        round_number: 2,
        difficulty: 'hard',
      },
    });
    assert(newQuestionRes.status === 200, `Create question returned 200`);
    assert(newQuestionRes.body.success === true, `New question created`);
    const createdQId = newQuestionRes.body.data.id;

    // Edit Question
    const editQRes = await request('/api/admin/questions', {
      method: 'PUT',
      body: {
        id: createdQId,
        question_text: 'What high-frequency oscillator did Tesla construct at Colorado Springs in 1899?',
      },
    });
    assert(editQRes.body.success === true, `Question successfully updated`);

    // Delete Question
    const deleteQRes = await request(`/api/admin/questions?id=${createdQId}`, {
      method: 'DELETE',
    });
    assert(deleteQRes.body.success === true, `Question successfully deleted`);

    // 8. Scientist Management CRUD
    console.log('\n--- Test 8: Scientist Management CRUD ---');
    const newSciRes = await request('/api/admin/scientists', {
      method: 'POST',
      body: {
        name: 'Grace Hopper',
        image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
        description: 'Computer scientist and US Navy rear admiral who pioneered machine-independent programming languages and invented the first compiler.',
        field: 'Computer Science & Software Engineering',
        country: 'United States',
        year: '1906 – 1992',
      },
    });
    assert(newSciRes.body.success === true, `Created new scientist: Grace Hopper`);
    const createdSciId = newSciRes.body.data.id;

    const editSciRes = await request('/api/admin/scientists', {
      method: 'PUT',
      body: {
        id: createdSciId,
        field: 'Computer Programming & Compiler Design',
      },
    });
    assert(editSciRes.body.success === true, `Updated scientist profile`);

    const deleteSciRes = await request(`/api/admin/scientists?id=${createdSciId}`, {
      method: 'DELETE',
    });
    assert(deleteSciRes.body.success === true, `Deleted scientist cleanly`);

    // 9. Component Management CRUD & Shuffle
    console.log('\n--- Test 9: Component Management & Shuffle ---');
    const newComp = await request('/api/admin/components', {
      method: 'POST',
      body: {
        name: 'Quartz Crystal Oscillator',
        image_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        description: 'Piezoelectric resonator generating ultra-stable clock signals.',
        category: 'Passive / Timing',
      },
    });
    assert(newComp.body.success === true, `Created component: Quartz Crystal Oscillator`);
    const createdCompId = newComp.body.data.id;

    const shuffleComp = await request('/api/admin/components', {
      method: 'POST',
      body: { action: 'shuffle' },
    });
    assert(shuffleComp.body.success === true, `Shuffled existing components`);

    const delComp = await request(`/api/admin/components?id=${createdCompId}`, {
      method: 'DELETE',
    });
    assert(delComp.body.success === true, `Deleted component`);

    // 10. Winner & Podium Management CRUD
    console.log('\n--- Test 10: Winner & Podium Management ---');
    const newWin = await request('/api/admin/winners', {
      method: 'POST',
      body: {
        position: 1,
        team_name: 'Cyber Innovators',
        participant_name: 'Arjun Verma & Maya Patel',
        score: 990,
        completion_time: '02:15',
      },
    });
    assert(newWin.body.success === true, `Added new 1st place winner`);
    const createdWinId = newWin.body.data.id;

    const editWin = await request('/api/admin/winners', {
      method: 'PUT',
      body: {
        id: createdWinId,
        score: 1000,
      },
    });
    assert(editWin.body.data.score === 1000, `Updated winner score to 1000`);

    const delWin = await request(`/api/admin/winners?id=${createdWinId}`, {
      method: 'DELETE',
    });
    assert(delWin.body.success === true, `Deleted winner record`);

    // 11. Game Settings & Live Reset
    console.log('\n--- Test 11: Game Settings & Live Reset ---');
    const updateSet = await request('/api/admin/settings', {
      method: 'PUT',
      body: {
        timer_duration: 20,
        auto_next: true,
      },
    });
    assert(updateSet.body.data.timer_duration === 20, `Timer duration updated to 20s`);
    assert(updateSet.body.data.auto_next === true, `Auto-next enabled`);

    const resetRes = await request('/api/admin/reset', { method: 'POST' });
    assert(resetRes.body.success === true, `Game state successfully reset to Round 1, Question 1`);

    // 12. Public Web UI
    console.log('\n--- Test 12: Public Web Application Rendering ---');
    const homePage = await request('/');
    assert(homePage.status === 200, `Home page returned 200 OK`);
    assert(typeof homePage.body === 'string' && homePage.body.includes('BINARIES'), `HTML document renders BINARIES platform`);

    console.log('\n========================================');
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    process.exit(failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('Fatal test error:', error);
    process.exit(1);
  }
}

runTests();
