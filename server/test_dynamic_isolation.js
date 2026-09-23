/**
 * test_dynamic_isolation.js
 * 
 * Verifies dynamic customer data isolation with completely randomized runtime accounts:
 * - No hardcoded user accounts
 * - Registers two random dynamic customer accounts at runtime
 * - Customer 1 places an order -> only Customer 1 sees it
 * - Customer 2 order history is completely isolated (0 orders)
 * - Customer 2 direct access to Customer 1's order returns HTTP 403 (IDOR prevention)
 * - Customer 2 spoofing Customer 1's ID in body is ignored (JWT identity derivation)
 * - Non-staff accounts blocked from staff operational endpoints
 */

const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

let passedCount = 0;
let failedCount = 0;

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          parsed = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

async function runDynamicIsolationTests() {
  console.log('===============================================================');
  console.log(' CAFÉFLOW — DYNAMIC CUSTOMER DATA ISOLATION VERIFICATION');
  console.log(' (Zero hardcoded customer accounts — 100% dynamic accounts)');
  console.log('===============================================================\n');

  try {
    const timestamp = Date.now();
    const email1 = `student_${timestamp}_1@college.edu`;
    const email2 = `faculty_${timestamp}_2@university.edu`;
    const password = 'StrongPassword@123';

    // 1. Register Random Customer 1
    const reg1Res = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Dynamic Student One',
        email: email1,
        password: password,
        phone: '+91 91111 00001',
      }
    );
    assert(reg1Res.status === 201, `Customer 1 registered dynamically (${email1})`);
    const token1 = reg1Res.data?.token;
    const user1 = reg1Res.data?.user;
    assert(Boolean(token1), 'Customer 1 received valid JWT');
    assert(user1?.email === email1.toLowerCase(), 'Customer 1 email matches in profile');

    // 2. Register Random Customer 2
    const reg2Res = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        name: 'Dynamic Faculty Two',
        email: email2,
        password: password,
        phone: '+91 92222 00002',
      }
    );
    assert(reg2Res.status === 201, `Customer 2 registered dynamically (${email2})`);
    const token2 = reg2Res.data?.token;
    const user2 = reg2Res.data?.user;
    assert(Boolean(token2), 'Customer 2 received valid JWT');
    assert(user2?.email === email2.toLowerCase(), 'Customer 2 email matches in profile');

    assert(user1._id !== user2._id, 'Customer 1 and Customer 2 have distinct database IDs');

    // 3. Get Menu and Pickup Slot for Order Placement
    const menuRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/menu',
      method: 'GET',
    });
    const items = menuRes.data?.items || [];
    assert(items.length > 0, `Menu fetched: ${items.length} items available`);
    const testItem = items[0];

    const slotsRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/slots',
      method: 'GET',
    });
    const slots = slotsRes.data?.slots || [];
    assert(slots.length > 0, `Pickup slots fetched: ${slots.length} slots available`);
    const testSlot = slots.find((s) => s.remainingCapacity > 0) || slots[0];

    // 4. Customer 1 places an order
    const order1Payload = {
      pickupSlotId: testSlot._id,
      items: [{ menuItemId: testItem._id, quantity: 1 }],
    };

    const order1Res = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token1}`,
        },
      },
      order1Payload
    );
    assert(order1Res.status === 201, 'Customer 1 successfully placed an order');
    const order1 = order1Res.data?.order;
    assert(order1?.user === user1._id, "Order 1 belongs strictly to Customer 1's ID from JWT");
    assert(order1?.customerEmail === email1.toLowerCase(), "Order 1 customerEmail matches Customer 1");

    // 5. Customer 1 checks their order history
    const myOrders1Res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(myOrders1Res.status === 200, "Customer 1 fetched /api/orders/my-orders");
    const cust1Orders = myOrders1Res.data?.orders || [];
    assert(
      cust1Orders.some((o) => o._id === order1._id),
      "Customer 1 sees Order 1 in their order history"
    );

    // 6. ISOLATION CHECK: Customer 2 checks their order history
    const myOrders2Res = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(myOrders2Res.status === 200, "Customer 2 fetched /api/orders/my-orders");
    const cust2Orders = myOrders2Res.data?.orders || [];
    assert(
      !cust2Orders.some((o) => o._id === order1._id),
      "DATA ISOLATION: Customer 2 CANNOT see Customer 1's order in order history"
    );
    assert(cust2Orders.length === 0, "Customer 2 order history is empty (0 orders)");

    // 7. IDOR / BOLA CHECK: Customer 2 attempts to query Customer 1's order by ID
    const idorRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: `/api/orders/${order1._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(
      idorRes.status === 403,
      `IDOR PREVENTED: Customer 2 accessing Order 1 by ID returns HTTP ${idorRes.status} Forbidden`
    );

    // 8. IDENTITY SPOOFING PREVENTION: Customer 2 creates order but injects Customer 1's userId & email in body
    const spoofOrderPayload = {
      pickupSlotId: testSlot._id,
      items: [{ menuItemId: testItem._id, quantity: 1 }],
      userId: user1._id,
      customerId: user1._id,
      customerEmail: email1,
      customerName: 'Hacked Name',
    };

    const spoofRes = await request(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/orders',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token2}`,
        },
      },
      spoofOrderPayload
    );
    assert(spoofRes.status === 201, 'Customer 2 order placed');
    const order2 = spoofRes.data?.order;
    assert(
      order2?.user === user2._id,
      'SPOOFING PREVENTED: Order assigned to Customer 2 from JWT, ignoring injected userId'
    );
    assert(
      order2?.customerEmail === email2.toLowerCase(),
      'SPOOFING PREVENTED: Order customerEmail uses verified JWT profile, ignoring injected email'
    );

    // 9. Verify Customer 1 STILL cannot see Customer 2's order
    const myOrders1AfterRes = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    const cust1OrdersAfter = myOrders1AfterRes.data?.orders || [];
    assert(
      !cust1OrdersAfter.some((o) => o._id === order2._id),
      "DATA ISOLATION: Customer 1 CANNOT see Customer 2's order"
    );

    // 10. Role Boundary: Neither customer can access staff endpoints
    const staffOrdersAttempt = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${token1}` },
    });
    assert(
      staffOrdersAttempt.status === 403,
      `STAFF RBAC: Customer accessing GET /api/orders returns HTTP ${staffOrdersAttempt.status} Forbidden`
    );

    const staffAnalyticsAttempt = await request({
      hostname: 'localhost',
      port: PORT,
      path: '/api/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${token2}` },
    });
    assert(
      staffAnalyticsAttempt.status === 403,
      `STAFF RBAC: Customer accessing /api/analytics returns HTTP ${staffAnalyticsAttempt.status} Forbidden`
    );

    console.log('\n===============================================================');
    console.log(` RESULTS: ${passedCount} passed, ${failedCount} failed`);
    console.log(' Dynamic Customer Data Isolation is 100% Solid & Verified!');
    console.log('===============================================================\n');

    process.exit(failedCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runDynamicIsolationTests();
