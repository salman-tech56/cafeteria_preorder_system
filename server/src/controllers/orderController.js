const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const PickupSlot = require('../models/PickupSlot');
const OrderStatusHistory = require('../models/OrderStatusHistory');

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

// @desc    Create new order with strict stock validation & slot capacity control
// @route   POST /api/orders
// @access  Protected (Authenticated Customer or Staff)
const createOrder = async (req, res) => {
  const decrementedItems = [];

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

    // 1. Verify Pickup Slot availability and capacity
    const slot = await PickupSlot.findById(pickupSlotId);
    if (!slot) {
      return res.status(404).json({ error: 'Selected pickup slot was not found.' });
    }

    if (!slot.isActive) {
      return res.status(400).json({ error: 'Selected pickup slot is no longer active.' });
    }

    if (slot.currentOrders >= slot.maxCapacity) {
      return res.status(400).json({
        error: `Pickup slot "${slot.slotLabel}" is already fully booked (${slot.currentOrders}/${slot.maxCapacity}). Please choose another time slot.`,
      });
    }

    // 2. Validate and Atomically Decrement Stock for each item (CRITICAL: prevents overselling)
    const orderItems = [];
    let calculatedSubtotal = 0;
    let calculatedTotalGst = 0;

    for (const requestedItem of items) {
      const itemId = requestedItem.menuItemId || requestedItem._id;
      const quantity = Math.max(1, parseInt(requestedItem.quantity, 10) || 1);

      // Atomic conditional update: only decrement if stock >= quantity
      const updatedMenuItem = await MenuItem.findOneAndUpdate(
        {
          _id: itemId,
          availability: true,
          stock: { $gte: quantity },
        },
        {
          $inc: { stock: -quantity },
        },
        { new: true }
      );

      if (!updatedMenuItem) {
        // Stock depletion or item unavailable! Rollback any previously decremented items in this transaction
        for (const rolledBack of decrementedItems) {
          await MenuItem.findByIdAndUpdate(rolledBack.id, {
            $inc: { stock: rolledBack.qty },
          });
        }

        const existingItem = await MenuItem.findById(itemId);
        const itemName = existingItem ? existingItem.name : 'Unknown Item';
        const remainingStock = existingItem ? existingItem.stock : 0;

        return res.status(400).json({
          error: `Insufficient stock for "${itemName}". Requested: ${quantity}, Available: ${remainingStock}.`,
        });
      }

      // Record for rollback if subsequent item fails
      decrementedItems.push({ id: itemId, qty: quantity });

      // Pricing & GST calculation
      const unitPrice = updatedMenuItem.basePrice;
      const gstRate = updatedMenuItem.gstRate || 5;
      const lineBase = unitPrice * quantity;
      const lineGst = Number(((lineBase * gstRate) / 100).toFixed(2));
      const lineTotal = Number((lineBase + lineGst).toFixed(2));

      calculatedSubtotal += lineBase;
      calculatedTotalGst += lineGst;

      orderItems.push({
        menuItem: updatedMenuItem._id,
        name: updatedMenuItem.name,
        quantity,
        unitPrice,
        gstRate,
        gstAmount: lineGst,
        itemTotal: lineTotal,
      });
    }

    // 3. Atomically Increment Pickup Slot Bookings
    const updatedSlot = await PickupSlot.findOneAndUpdate(
      {
        _id: slot._id,
        currentOrders: { $lt: slot.maxCapacity },
      },
      {
        $inc: { currentOrders: 1 },
      },
      { new: true }
    );

    if (!updatedSlot) {
      // Slot reached capacity at the exact same millisecond - rollback items
      for (const rolledBack of decrementedItems) {
        await MenuItem.findByIdAndUpdate(rolledBack.id, {
          $inc: { stock: rolledBack.qty },
        });
      }
      return res.status(400).json({
        error: `Slot "${slot.slotLabel}" reached full capacity. Please select another slot.`,
      });
    }

    // 4. Create Order Record strictly tied to authenticated user
    const grandTotal = Number((calculatedSubtotal + calculatedTotalGst).toFixed(2));
    const orderNumber = await generateOrderNumber();
    const serverExactTimestamp = new Date();

    const order = await Order.create({
      orderNumber,
      user: authenticatedUser._id, // Strictly authenticated user ID
      customerName: authenticatedUser.name,
      customerEmail: authenticatedUser.email,
      customerPhone: authenticatedUser.phone || '',
      items: orderItems,
      subtotal: Number(calculatedSubtotal.toFixed(2)),
      totalGst: Number(calculatedTotalGst.toFixed(2)),
      grandTotal,
      pickupSlot: slot._id,
      slotLabel: slot.slotLabel,
      pickupDate: slot.date,
      status: 'Placed',
      serverExactTimestamp,
    });

    // 5. Create initial OrderStatusHistory entry
    await OrderStatusHistory.create({
      order: order._id,
      status: 'Placed',
      timestamp: serverExactTimestamp,
      updatedBy: authenticatedUser._id,
      updatedByName: `${authenticatedUser.name} (${authenticatedUser.role})`,
      note: 'Order placed via CaféFlow pre-order.',
    });

    res.status(201).json({
      message: 'Order placed successfully!',
      order,
    });
  } catch (error) {
    console.error('[Order createOrder Error]:', error);

    // Rollback any stock decremented if unexpected exception occurred
    for (const rolledBack of decrementedItems) {
      try {
        await MenuItem.findByIdAndUpdate(rolledBack.id, {
          $inc: { stock: rolledBack.qty },
        });
      } catch (e) {
        console.error('Failed to rollback item stock:', e);
      }
    }

    res.status(500).json({ error: error.message || 'Failed to place order.' });
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
