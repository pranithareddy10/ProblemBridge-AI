const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server/index');

let server;
let baseUrl;

before(async () => {
  await new Promise(resolve => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  const mongoose = require('mongoose');
  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

async function api(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

describe('ProblemBridge AI API Test Suite', () => {
  let authToken = '';
  let createdProblemId = '';
  let testEmail = `tester_${Date.now()}@example.com`;

  test('1. Health Check Endpoint', async () => {
    const res = await api('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'ok');
    assert.strictEqual(res.data.app, 'ProblemBridge AI');
  });

  test('2. User Registration', async () => {
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: {
        fullName: 'Test Citizen',
        email: testEmail,
        password: 'securepassword123',
        role: 'Citizen',
        mobileNumber: '+91 9876543210'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.token);
    assert.strictEqual(res.data.user.email, testEmail.toLowerCase());
    authToken = res.data.token;
  });

  test('3. User Login', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'securepassword123'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.token);
  });

  test('4. Fetch Current User Profile (/api/auth/me)', async () => {
    const res = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.email, testEmail.toLowerCase());
  });

  test('5. AI Problem Analysis Preview', async () => {
    const res = await api('/api/problems/analyze', {
      method: 'POST',
      body: {
        title: 'Frequent Water Supply Cutoff in Colony',
        description: 'Residents do not receive drinking water for 3 days in a row without prior notification from the municipal board.',
        category: 'Public Infrastructure',
        location: 'Hyderabad'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.analysis.route);
    assert.ok(Array.isArray(res.data.analysis.rootCauses));
    assert.ok(res.data.analysis.score > 0);
  });

  test('6. Submit Problem Report with AI Analysis and Smart Routing', async () => {
    const res = await api('/api/problems', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        title: `Novel Satellite Crop Disease Detection ${Date.now()}`,
        description: 'Farmers in remote dryland mandals cannot detect fungal infestations until 40 percent of harvest is destroyed. Need low-cost multispectral smartphone imaging.',
        category: 'Agriculture',
        location: 'Mahbubnagar'
      }
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.problem.id);
    createdProblemId = res.data.problem.id;
    assert.strictEqual(res.data.problem.route, 'innovation');
  });

  test('7. List Problems', async () => {
    const res = await api('/api/problems');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.problems));
    assert.ok(res.data.problems.length >= 2);
  });

  test('8. Support Existing Problem (Duplicate Prevention Flow)', async () => {
    const res = await api(`/api/problems/${createdProblemId}/support`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.supportCount >= 2);
  });

  test('9. Update Authority Resolution Status', async () => {
    const res = await api(`/api/problems/${createdProblemId}/authority-status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { status: 'Resolved' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.problem.authorityStatus, 'Resolved');
  });

  test('10. Citizen Verification Flow', async () => {
    const res = await api(`/api/problems/${createdProblemId}/verify`, {
      method: 'POST',
      body: { answer: 'yes' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.problem.citizenVerification, 'yes');
  });

  test('11. List and Filter Challenges', async () => {
    const res = await api('/api/challenges?category=Healthcare+Technology');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.challenges));
    assert.ok(res.data.challenges.length >= 1);
  });

  test('12. Submit Solution Proposal and Complete Project for Review', async () => {
    // Proposal
    const resProposal = await api('/api/solutions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        challengeId: 'hospital',
        solutionTitle: 'BedSync Mobile App',
        solutionDescription: 'A cross-platform React Native app for emergency bed discovery with live hospital dashboard.',
        technology: 'React Native, Node.js, SQLite',
        team: 'Secunderabad Innovators',
        status: 'Proposed',
        website: 'https://bedsync-demo.example'
      }
    });

    assert.strictEqual(resProposal.status, 201);
    assert.strictEqual(resProposal.data.solution.progressPercent, 10);

    // Update status to Testing
    const solId = resProposal.data.solution.id;
    const resStatus = await api(`/api/solutions/${solId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${authToken}` },
      body: { status: 'Testing' }
    });

    assert.strictEqual(resStatus.status, 200);
    assert.strictEqual(resStatus.data.solution.progressPercent, 50);
  });

  test('13. Platform Stats and Metrics', async () => {
    const res = await api('/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.stats.problemsReported >= 1250);
    assert.ok(res.data.stats.routingPercentages);
  });
});
