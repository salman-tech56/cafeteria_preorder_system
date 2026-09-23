const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const PickupSlot = require('../models/PickupSlot');
const OrderStatusHistory = require('../models/OrderStatusHistory');

const { getConnection } = require('../config/db');

// Helper to generate unique order number: CF-YYMMDD-XXXX
const generateOrderNumber = async () => {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // e.g. 260923
  const countToday = await Order.countDocuments({
    pickupDate: now.toISOString().split('T')[0],
  });
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const sequential = String(countToday + 1).padStart(3, '0');
  return `CF-${datePart}-${sequential}${randomSuffix.toString().slice(-2)}`;
};

// @desc    Create new order with strict stock validation & slot capacity control using MySQL transaction
// @route   POST /api/orders
// @access  Protected (Authenticated Customer or Staff)
const createOrder = async (req, res) => {
  let conn = null;

  try {
    const { items, pickupSlotId } = req.body;

    // SECURITY: Authenticated identity is derived strictly from verified JWT token.
    // Client-sent userId, customerId, or email in body/query are completely ignored.
    const authenticatedUser = req.user;
    if (!authenticatedUser || !authenticatedUser._id) {
      return res.status(401).json({ error: 'Authentication required to place an order.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    if (!pickupSlotId) {
      return res.status(400).json({ error: 'Please select a valid pickup slot.' });
    }

    conn = await getConnection();
    await conn.beginTransaction();

    // 1. Lock and validate pickup slot with FOR UPDATE
    const [slotRows] = await conn.query(
      `SELECT * FROM pickup_slots WHERE id = ? FOR UPDATE`,
      [pickupSlotId]
    );

    if (slotRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Selected pickup slot was not found.' });
    }

    const slot = slotRows[0];
    if (!slot.available) {
      await conn.rollback();
      return res.status(400).json({ error: 'Selected pickup slot is no longer active.' });
    }

    if (slot.booked_count >= slot.capacity) {
      await conn.rollback();
      return res.status(400).json({
        error: `Pickup slot "${slot.slot_label}" is already fully booked (${slot.booked_count}/${slot.capacity}). Please choose another time slot.`,
      });
    }

    // 2. Lock each menu item with FOR UPDATE and validate stock
    const orderItems = [];
    let calculatedSubtotal = 0;
    let calculatedTotalGst = 0;

    for (const requestedItem of items) {
      const itemId = requestedItem.menuItemId || requestedItem._id;
      const quantity = Math.max(1, parseInt(requestedItem.quantity, 10) || 1);

      const [itemRows] = await conn.query(
        `SELECT * FROM menu_items WHERE id = ? FOR UPDATE`,
        [itemId]
      );

      if (itemRows.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: 'One or more requested menu items no longer exist.' });
      }

      const menuItem = itemRows[0];
      if (!menuItem.available) {
        await conn.rollback();
        return res.status(400).json({ error: `"${menuItem.name}" is currently marked unavailable.` });
      }

      if (menuItem.stock < quantity) {
        await conn.rollback();
        return res.status(400).json({
          error: `Insufficient stock for "${menuItem.name}". Requested: ${quantity}, Available: ${menuItem.stock}.`,
        });
      }

      // Deduct stock in transaction
      await conn.query(
        `UPDATE menu_items SET stock = stock - ? WHERE id = ?`,
        [quantity, itemId]
      );

      // Calculations
      const unitPrice = Number(menuItem.base_price);
      const gstRate = Number(menuItem.gst_rate || 5);
      const lineBase = unitPrice * quantity;
      const lineGst = Number(((lineBase * gstRate) / 100).toFixed(2));
      const lineTotal = Number((lineBase + lineGst).toFixed(2));

      calculatedSubtotal += lineBase;
      calculatedTotalGst += lineGst;

      orderItems.push({
        menuItem: menuItem.id,
        name: menuItem.name,
        quantity,
        unitPrice,
        gstRate,
        gstAmount: lineGst,
        itemTotal: lineTotal,
      });
    }

    // 3. Increment pickup slot booked count in transaction
    await conn.query(
      `UPDATE pickup_slots SET booked_count = booked_count + 1 WHERE id = ?`,
      [slot.id]
    );

    // 4. Create Order row
    const grandTotal = Number((calculatedSubtotal + calculatedTotalGst).toFixed(2));
    const orderNumber = await generateOrderNumber();
    const serverExactTimestamp = new Date();

    const [orderResult] = await conn.query(
      `INSERT INTO orders (
        order_number, user_id, pickup_slot_id, customer_name, customer_email, customer_phone,
        slot_label, pickup_date, subtotal, gst_amount, total_amount, status, placed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        authenticatedUser._id,
        slot.id,
        authenticatedUser.name,
        authenticatedUser.email,
        authenticatedUser.phone || '',
        slot.slot_label,
        slot.date,
        Number(calculatedSubtotal.toFixed(2)),
        Number(calculatedTotalGst.toFixed(2)),
        grandTotal,
        'Placed',
        serverExactTimestamp,
      ]
    );

    const orderId = orderResult.insertId;

    // 5. Create Order Items
    for (const oi of orderItems) {
      await conn.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, item_name, quantity, unit_price, gst_rate, gst_amount, total_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          oi.menuItem,
          oi.name,
          oi.quantity,
          oi.unitPrice,
          oi.gstRate,
          oi.gstAmount,
          oi.itemTotal,
        ]
      );
    }

    // 6. Create initial OrderStatusHistory entry
    await conn.query(
      `INSERT INTO order_status_history (
        order_id, status, timestamp, note, updated_by, updated_by_name
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        'Placed',
        serverExactTimestamp,
        'Order placed via CaféFlow pre-order.',
        authenticatedUser._id,
        `${authenticatedUser.name} (${authenticatedUser.role})`,
      ]
    );

    // Commit ACID transaction
    await conn.commit();

    const order = await Order.findById(orderId);

    res.status(201).json({
      message: 'Order placed successfully!',
      order,
    });
  } catch (error) {
    if (conn) {
      try {
        await conn.rollback();
      } catch (rollbackErr) {
        console.error('Failed to rollback transaction:', rollbackErr);
      }
    }
    console.error('[Order createOrder Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to place order.' });
  } finally {
    if (conn) {
      conn.release();
    }
  }
};

// @desc    Get current authenticated customer's orders ONLY (Account Isolation)
// @route   GET /api/orders/my-orders
// @access  Protected (Authenticated Customer)
const getMyOrders = async (req, res) => {
  try {
    // SECURITY: Identity is derived exclusively from verified JWT (req.user._id).
    // Client-supplied query/body parameters like customerId or userId are completely ignored.
    const customerId = req.user._id;

    const orders = await Order.find({ user: customerId }).sort({ createdAt: -1 });

    // Fetch timeline for each order
    const orderIds = orders.map((o) => o._id);
    const histories = await OrderStatusHistory.find({ order: { $in: orderIds } }).sort({
      timestamp: 1,
    });

    const ordersWithHistory = orders.map((order) => {
      const timeline = histories.filter((h) => h.order.toString() === order._id.toString());
      return {
        ...order.toObject(),
        history: timeline,
      };
    });

    res.status(200).json({
      count: ordersWithHistory.length,
      orders: ordersWithHistory,
    });
  } catch (error) {
    console.error('[Order getMyOrders Error]:', error);
    res.status(500).json({ error: 'Failed to fetch customer orders.' });
  }
};

// @desc    Get single order details by ID with strict ownership authorization (IDOR / BOLA Prevention)
// @route   GET /api/orders/:id
// @access  Protected (Owner Customer or Staff)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // SECURITY CHECK:
    // Verify that the order belongs to the authenticated customer, OR the user has staff role.
    const isOwner = order.user && order.user.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'staff';

    if (!isOwner && !isStaff) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to view this order.',
      });
    }

    const history = await OrderStatusHistory.find({ order: order._id }).sort({ timestamp: 1 });

    res.status(200).json({
      order: {
        ...order.toObject(),
        history,
      },
    });
  } catch (error) {
    // Handle invalid ObjectId format gracefully as 404
    if (error.name === 'CastError') {
      return res.status(404).json({ error: 'Order not found.' });
    }
    res.status(500).json({ error: 'Failed to fetch order details.' });
  }
};

// @desc    Get all orders (Staff Operations Dashboard Only)
// @route   GET /api/orders
// @access  Protected (Staff Only)
const getAllOrders = async (req, res) => {
  try {
    // Route middleware (requireRole('staff')) ensures only staff can reach here.
    const { status, date, search } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (date) {
      query.pickupDate = date;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { orderNumber: searchRegex },
        { customerName: searchRegex },
        { customerPhone: searchRegex },
      ];
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    // Fetch history records
    const orderIds = orders.map((o) => o._id);
    const histories = await OrderStatusHistory.find({ order: { $in: orderIds } }).sort({
      timestamp: 1,
    });

    const ordersWithHistory = orders.map((order) => {
      const timeline = histories.filter((h) => h.order.toString() === order._id.toString());
      return {
        ...order.toObject(),
        history: timeline,
      };
    });

    res.status(200).json({
      count: ordersWithHistory.length,
      orders: ordersWithHistory,
    });
  } catch (error) {
    console.error('[Order getAllOrders Error]:', error);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};

// @desc    Update order status (Staff Action: Placed -> Preparing -> Ready -> Collected)
// @route   PATCH /api/orders/:id/status
// @access  Protected (Staff Only)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['Placed', 'Preparing', 'Ready', 'Collected', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const previousStatus = order.status;
    order.status = status;
    await order.save();

    // Record in history audit log with authenticated staff identity
    await OrderStatusHistory.create({
      order: order._id,
      status,
      timestamp: new Date(),
      updatedBy: req.user._id,
      updatedByName: `${req.user.name} (Staff)`,
      note: note || `Status transitioned from ${previousStatus} to ${status}.`,
    });

    const history = await OrderStatusHistory.find({ order: order._id }).sort({ timestamp: 1 });

    res.status(200).json({
      message: `Order status updated to "${status}".`,
      order: {
        ...order.toObject(),
        history,
      },
    });
  } catch (error) {
    console.error('[Order updateOrderStatus Error]:', error);
    res.status(500).json({ error: error.message || 'Failed to update order status.' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};
