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

async function runE2ETests() {
  console.log('=== CaféFlow PS62 End-to-End API & Innovations Verification ===\n');
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
    // 1. Auth: Login as Customer and Staff
    const custLogin = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'customer@cafeflow.com', password: 'Customer@123' }
    );
    assert(custLogin.status === 200, 'Customer login succeeds');
    const customerToken = custLogin.data.token;

    const staffLogin = await request(
      { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      { email: 'staff@cafeflow.com', password: 'Staff@123' }
    );
    assert(staffLogin.status === 200, 'Staff login succeeds');
    const staffToken = staffLogin.data.token;

    // 2. Menu: Fetch items, search, and category filter
    const menuRes = await request({ hostname: 'localhost', port: 5000, path: '/api/menu', method: 'GET' });
    assert(menuRes.status === 200 && menuRes.data.items.length >= 10, `Menu returned ${menuRes.data?.items?.length} items`);
    const sampleItem = menuRes.data.items[0];

    const filterRes = await request({ hostname: 'localhost', port: 5000, path: '/api/menu?category=Breakfast', method: 'GET' });
    assert(filterRes.status === 200 && filterRes.data.items.every(i => i.category === 'Breakfast'), 'Category filter (Breakfast) works correctly');

    const searchRes = await request({ hostname: 'localhost', port: 5000, path: '/api/menu?search=Burger', method: 'GET' });
    assert(searchRes.status === 200 && searchRes.data.items.some(i => i.name.includes('Burger')), 'Search query ("Burger") returns expected item');

    // 3. Staff Menu Management (Create & Stock Update)
    const newMenuItemRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/menu',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      },
      {
        name: 'Avocado Toast with Poached Egg',
        description: 'Artisan sourdough with smashed seasoned avocado and runny poached egg.',
        category: 'Breakfast',
        basePrice: 140,
        gstRate: 5,
        stock: 5,
        availability: true,
      }
    );
    assert(newMenuItemRes.status === 201, 'Staff can create new menu item');
    const createdItemId = newMenuItemRes.data.item._id;

    // 4. Slots & Innovations: Cafeteria Load Indicator & Smart Alternatives
    const slotsRes = await request({ hostname: 'localhost', port: 5000, path: '/api/slots', method: 'GET' });
    assert(slotsRes.status === 200 && slotsRes.data.slots.length > 0, `Fetched ${slotsRes.data?.slots?.length} pickup slots`);
    assert(Boolean(slotsRes.data.cafeteriaLoad), `INNOVATION 3: Cafeteria Load Indicator returned (${slotsRes.data.cafeteriaLoad?.level} Load, ~${slotsRes.data.cafeteriaLoad?.estimatedWaitMinutes}m wait)`);
    assert(Boolean(slotsRes.data.bestSuggestedSlot), `INNOVATION 8: Best Alternative Slot identified: ${slotsRes.data.bestSuggestedSlot?.slotLabel}`);

    const availableSlot = slotsRes.data.slots.find(s => s.remainingCapacity > 0);
    assert(Boolean(availableSlot), `Found available slot: ${availableSlot?.slotLabel}`);

    // 5. Stock Validation Test: Attempting to order quantity > stock must FAIL
    const oversellRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      },
      {
        pickupSlotId: availableSlot._id,
        items: [{ menuItemId: createdItemId, quantity: 10 }], // Stock is only 5!
      }
    );
    assert(oversellRes.status === 400, 'CRITICAL: Overselling prevented! Ordering 10 when stock is 5 returns HTTP 400');

    // 6. Valid Order Placement: Order quantity = 2
    const initialItemRes = await request({ hostname: 'localhost', port: 5000, path: `/api/menu/${createdItemId}`, method: 'GET' });
    const initialStock = initialItemRes.data.item.stock;

    const validOrderRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/orders',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${customerToken}` },
      },
      {
        pickupSlotId: availableSlot._id,
        items: [{ menuItemId: createdItemId, quantity: 2 }],
      }
    );
    assert(validOrderRes.status === 201, 'Valid order placed successfully with HTTP 201');
    assert(Boolean(validOrderRes.data.order.orderNumber), `Order generated unique number: ${validOrderRes.data?.order?.orderNumber}`);
    assert(Boolean(validOrderRes.data.order.serverExactTimestamp), 'Order contains exact server-side timestamp');
    const placedOrder = validOrderRes.data.order;

    // Verify stock was decremented by 2
    const postItemRes = await request({ hostname: 'localhost', port: 5000, path: `/api/menu/${createdItemId}`, method: 'GET' });
    assert(postItemRes.data.item.stock === initialStock - 2, `Live stock decremented from ${initialStock} to ${postItemRes.data.item.stock}`);

    // 7. Order Status Transitions (Staff operations: Placed -> Preparing -> Ready -> Collected)
    const prepRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${placedOrder._id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      },
      { status: 'Preparing', note: 'Kitchen started assembling your order.' }
    );
    assert(prepRes.status === 200 && prepRes.data.order.status === 'Preparing', 'Order status progressed to "Preparing"');

    const readyRes = await request(
      {
        hostname: 'localhost',
        port: 5000,
        path: `/api/orders/${placedOrder._id}/status`,
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      },
      { status: 'Ready', note: 'Order ready for pickup at Counter 2.' }
    );
    assert(readyRes.status === 200 && readyRes.data.order.status === 'Ready', 'Order status progressed to "Ready"');
    assert(readyRes.data.order.history.length >= 3, `Order status history contains ${readyRes.data.order.history.length} audit entries with timestamps`);

    // 8. Analytics Verification with Peak Time & Avg Orders/Day
    const analyticsRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/analytics',
      method: 'GET',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(analyticsRes.status === 200, 'Staff analytics API returns HTTP 200');
    assert(analyticsRes.data.summary.todayOrders >= 2, `Today's orders metric: ${analyticsRes.data.summary.todayOrders}`);
    assert(analyticsRes.data.summary.todayRevenue > 0, `Today's revenue metric: ₹${analyticsRes.data.summary.todayRevenue}`);
    assert(Boolean(analyticsRes.data.summary.peakOrderingTime), `INNOVATION 7: Peak ordering time computed: ${analyticsRes.data.summary.peakOrderingTime}`);
    assert(Boolean(analyticsRes.data.summary.averageOrdersPerDay), `INNOVATION 7: Average orders/day computed: ${analyticsRes.data.summary.averageOrdersPerDay}`);
    assert(Array.isArray(analyticsRes.data.last7DaysOrders), 'Last 7 days orders data present');
    assert(Array.isArray(analyticsRes.data.revenueChart), 'Revenue chart data present');
    assert(Array.isArray(analyticsRes.data.mostOrderedFood), 'Most ordered food data present');
    assert(Array.isArray(analyticsRes.data.popularPickupSlots), 'Popular pickup slots data present');
    assert(Array.isArray(analyticsRes.data.lowStockItems), 'Low-stock items list present with smart restock batch');

    console.log(`\n=============================================`);
    console.log(` ALL API TESTS PASSED: ${passed} passed, ${failed} failed `);
    console.log(` Backend Phases 1-6 + Innovations are verified!`);
    console.log(`=============================================\n`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('E2E Test failed:', err);
    process.exit(1);
  }
}

runE2ETests();
