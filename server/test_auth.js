const http = require('http');

const request = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

async function runAuthTests() {
  console.log('--- Starting CaféFlow Phase 2 Auth Tests ---\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  };

  try {
    // Test 1: Customer Login
    const custLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'customer@cafeflow.com', password: 'Customer@123' }
    );
    assert(custLogin.status === 200, 'Customer login returns HTTP 200');
    assert(Boolean(custLogin.data?.token), 'Customer login returns JWT token');
    assert(custLogin.data?.user?.role === 'customer', 'Customer role is "customer"');
    const customerToken = custLogin.data?.token;

    // Test 2: Staff Login
    const staffLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'staff@cafeflow.com', password: 'Staff@123' }
    );
    assert(staffLogin.status === 200, 'Staff login returns HTTP 200');
    assert(staffLogin.data?.user?.role === 'staff', 'Staff role is "staff"');
    const staffToken = staffLogin.data?.token;

    // Test 3: Invalid Credentials Login
    const invalidLogin = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'customer@cafeflow.com', password: 'WrongPassword' }
    );
    assert(invalidLogin.status === 401, 'Invalid password returns HTTP 401');

    // Test 4: Register New User
    const testEmail = `testuser_${Date.now()}@cafeflow.com`;
    const regRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Jordan Smith',
        email: testEmail,
        password: 'Password@123',
        phone: '+91 9988776655',
      }
    );
    assert(regRes.status === 201, 'Register new customer returns HTTP 201');
    assert(Boolean(regRes.data?.token), 'Register returns JWT token');
    assert(regRes.data?.user?.email === testEmail, 'Registered user email matches');

    // Test 5: Protected Route (/api/auth/me) with token
    const meRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
    });
    assert(meRes.status === 200, 'Protected /api/auth/me returns HTTP 200 with valid Bearer token');
    assert(meRes.data?.user?.email === 'customer@cafeflow.com', 'Profile email matches authenticated user');

    // Test 6: Protected Route without token
    const noTokenRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    assert(noTokenRes.status === 401, 'Protected /api/auth/me returns HTTP 401 without Bearer token');

    console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runAuthTests();
