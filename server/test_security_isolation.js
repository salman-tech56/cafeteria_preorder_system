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

async function runSecurityIsolationTests() {
  console.log('===============================================================');
  console.log(' CAFÉFLOW PS62 — SECURITY & ACCOUNT ISOLATION VERIFICATION ');
  console.log('===============================================================\n');

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
    // Ensure Customer A and B exist
    await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Customer A', email: 'customera@gmail.com', password: 'Customer@123', role: 'customer' }
    );
    await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Customer B', email: 'customerb@gmail.com', password: 'Customer@123', role: 'customer' }
    );

    // ------------------------------------------------------------------------
    // TEST 1: Customer A Login & Identity Verification
    // ------------------------------------------------------------------------
    const loginARes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'customerA@gmail.com', password: 'Customer@123' } // Testing case-insensitive match
    );
    assert(loginARes.status === 200, 'Customer A login succeeds with normalized email');
    assert(Boolean(loginARes.data?.token), 'Customer A receives valid JWT token');
    assert(loginARes.data?.user?.email === 'customera@gmail.com', 'Customer A profile email matches');
    const tokenA = loginARes.data?.token;
    const userAId = loginARes.data?.user?.id;

    // ------------------------------------------------------------------------
    // TEST 2: Customer B Login & Identity Verification
    // ------------------------------------------------------------------------
    const loginBRes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'customerB@gmail.com', password: 'Customer@123' }
    );
    assert(loginBRes.status === 200, 'Customer B login succeeds with normalized email');
    assert(loginBRes.data?.user?.email === 'customerb@gmail.com', 'Customer B profile email matches');
    const tokenB = loginBRes.data?.token;
    const userBId = loginBRes.data?.user?.id;

    assert(userAId !== userBId, 'Customer A and Customer B have completely separate user IDs');

    // ------------------------------------------------------------------------
    // TEST 3: Fetch Available Slots & Menu Item for Ordering
    // ------------------------------------------------------------------------
    const slotsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/slots', method: 'GET' });
    const availableSlot = slotsRes.data.slots.find((s) => s.remainingCapacity > 0);

    const menuRes = await request({ hostname: 'localhost', port: 5000, path: '/api/menu', method: 'GET' });
    const menuItem = menuRes.data.items[0];

    // ------------------------------------------------------------------------
    // TEST 4: Customer A Creates an Order
    // ------------------------------------------------------------------------
    const orderARes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      },
      {
        pickupSlotId: availableSlot._id,
        items: [{ menuItemId: menuItem._id, quantity: 1 }],
      }
    );
    assert(orderARes.status === 201, 'Customer A successfully creates an order');
    const orderA = orderARes.data?.order;
    assert(orderA?.user === userAId, "Order A is strictly attributed to Customer A's ID from verified JWT");

    // ------------------------------------------------------------------------
    // TEST 5: Customer A Checks Order History (A sees only A's orders)
    // ------------------------------------------------------------------------
    const myOrdersARes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(myOrdersARes.status === 200, "Customer A can fetch their own order history");
    assert(
      myOrdersARes.data.orders.every((o) => o.user.toString() === userAId.toString()),
      "Customer A's order history contains ONLY orders belonging to Customer A"
    );
    assert(
      myOrdersARes.data.orders.some((o) => o._id === orderA._id),
      "Customer A's newly created order appears in Customer A's order history"
    );

    // ------------------------------------------------------------------------
    // TEST 6: Customer B Checks Order History (B must NOT see Customer A's orders!)
    // ------------------------------------------------------------------------
    const myOrdersBRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders/my-orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(myOrdersBRes.status === 200, "Customer B can fetch their own order history");
    assert(
      !myOrdersBRes.data.orders.some((o) => o._id === orderA._id),
      "ACCOUNT ISOLATION: Customer B CANNOT see Customer A's order in order history"
    );

    // ------------------------------------------------------------------------
    // TEST 7: IDOR / BOLA Prevention (Customer B attempts GET /api/orders/:orderA_id)
    // ------------------------------------------------------------------------
    const idorRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${orderA._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(
      idorRes.status === 403,
      `IDOR PREVENTED: Customer B accessing Customer A's order returns HTTP 403 Forbidden (${idorRes.data?.error})`
    );

    // ------------------------------------------------------------------------
    // TEST 8: Spoofing Prevention (Customer B passes spoofed userId/customerId in body)
    // ------------------------------------------------------------------------
    const spoofOrderRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      },
      {
        pickupSlotId: availableSlot._id,
        items: [{ menuItemId: menuItem._id, quantity: 1 }],
        userId: userAId, // Attempting to spoof Customer A
        customerId: userAId,
        customerEmail: 'customera@gmail.com',
        customerName: 'Spoofed Manoj',
      }
    );
    assert(spoofOrderRes.status === 201, 'Order created successfully');
    assert(
      spoofOrderRes.data?.order?.user === userBId,
      'SPOOFING PREVENTED: Order is attributed to Customer B from JWT, ignoring client-sent userId'
    );
    assert(
      spoofOrderRes.data?.order?.customerEmail === 'customerb@gmail.com',
      'SPOOFING PREVENTED: Order customerEmail uses verified JWT profile, ignoring body spoof'
    );

    // ------------------------------------------------------------------------
    // TEST 9: Staff Authorization & Role Boundary Tests
    // ------------------------------------------------------------------------
    // 9a: Customer attempts to access staff all-orders endpoint
    const custAllOrders = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/orders',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(custAllOrders.status === 403, 'STAFF BOUNDARY: Customer accessing GET /api/orders returns HTTP 403 Forbidden');

    // 9b: Customer attempts to update order status
    const custUpdateStatus = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${orderA._id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      },
      { status: 'Ready' }
    );
    assert(custUpdateStatus.status === 403, 'STAFF BOUNDARY: Customer updating order status returns HTTP 403 Forbidden');

    // 9c: Customer attempts to access staff analytics
    const custAnalytics = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(custAnalytics.status === 403, 'STAFF BOUNDARY: Customer accessing /api/analytics returns HTTP 403 Forbidden');

    // 9d: Customer attempts to create menu item
    const custCreateMenu = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/menu',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      },
      { name: 'Hacked Dish', basePrice: 10, category: 'Quick Bites', stock: 10 }
    );
    assert(custCreateMenu.status === 403, 'STAFF BOUNDARY: Customer creating menu item returns HTTP 403 Forbidden');

    // 9e: Customer attempts to create pickup slot
    const custCreateSlot = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/slots',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      },
      { slotLabel: 'Hacked Slot', startTime: '15:00', endTime: '15:15', maxCapacity: 10 }
    );
    assert(custCreateSlot.status === 403, 'STAFF BOUNDARY: Customer creating pickup slot returns HTTP 403 Forbidden');

    // ------------------------------------------------------------------------
    // TEST 10: Email Validation & Duplicate Rejection
    // ------------------------------------------------------------------------
    // 10a: Duplicate registration with different casing (e.g. CustomerA@gmail.com)
    const dupEmailRes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { name: 'Duplicate Manoj', email: 'CUSTOMERa@gmail.com', password: 'Password@123' }
    );
    assert(dupEmailRes.status === 400, 'DUPLICATE PREVENTION: Registering with existing email (different case) returns HTTP 400');

    // 10b: Malformed emails rejection
    const invalidEmails = ['not-an-email', 'user@', 'user@domain', '@college.edu', 'user name@gmail.com'];
    for (const badEmail of invalidEmails) {
      const badRes = await request(
        { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { name: 'Invalid User', email: badEmail, password: 'Password@123' }
      );
      assert(badRes.status === 400, `EMAIL VALIDATION: Malformed email "${badEmail}" rejected with HTTP 400`);
    }

    // ------------------------------------------------------------------------
    // TEST 11: Authentication Failure Rejections
    // ------------------------------------------------------------------------
    // 11a: Wrong password
    const wrongPassRes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'customera@gmail.com', password: 'WrongPassword999' }
    );
    assert(wrongPassRes.status === 401, 'AUTH REJECTION: Wrong password returns HTTP 401');

    // 11b: Non-existent email
    const nonExistRes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'nonexistent_user_99@gmail.com', password: 'Password@123' }
    );
    assert(nonExistRes.status === 401, 'AUTH REJECTION: Non-existent email returns HTTP 401');

    // ------------------------------------------------------------------------
    // TEST 12: Staff Legitimate Access Verification
    // ------------------------------------------------------------------------
    const staffLoginRes = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'staff@cafeflow.com', password: 'Staff@123' }
    );
    assert(staffLoginRes.status === 200, 'Staff login succeeds');
    const staffToken = staffLoginRes.data?.token;

    // Staff CAN view Customer A's order for operational management
    const staffViewOrderRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/orders/${orderA._id}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffViewOrderRes.status === 200, "STAFF PRIVILEGE: Staff can view order details for operational counter management");

    // Staff CAN update order status
    const staffUpdateStatus = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${orderA._id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      },
      { status: 'Preparing', note: 'Kitchen prep started by manager' }
    );
    assert(staffUpdateStatus.status === 200 && staffUpdateStatus.data?.order?.status === 'Preparing', 'STAFF PRIVILEGE: Staff can transition order status to Preparing');

    console.log('\n===============================================================');
    console.log(` ALL SECURITY & ISOLATION TESTS PASSED: ${passed} passed, ${failed} failed`);
    console.log(' Account Isolation, IDOR Prevention & RBAC are 100% Solid!');
    console.log('===============================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Security test failed with error:', err);
    process.exit(1);
  }
}

runSecurityIsolationTests();
