const { query, getConnection } = require('../config/db');
const QueryBuilder = require('./QueryBuilder');

class Order {
  static wrapOrder(orderRow, itemRows = []) {
    if (!orderRow) return null;

    const items = itemRows.map((item) => ({
      _id: item.id,
      id: item.id,
      menuItem: item.menu_item_id,
      menuItemId: item.menu_item_id,
      name: item.item_name,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      gstRate: Number(item.gst_rate),
      gstAmount: Number(item.gst_amount),
      itemTotal: Number(item.total_price),
    }));

    return {
      _id: orderRow.id,
      id: orderRow.id,
      orderNumber: orderRow.order_number,
      user: orderRow.user_id,
      userId: orderRow.user_id,
      pickupSlot: orderRow.pickup_slot_id,
      pickupSlotId: orderRow.pickup_slot_id,
      customerName: orderRow.customer_name,
      customerEmail: orderRow.customer_email,
      customerPhone: orderRow.customer_phone || '',
      slotLabel: orderRow.slot_label,
      pickupDate: orderRow.pickup_date,
      subtotal: Number(orderRow.subtotal),
      totalGst: Number(orderRow.gst_amount),
      gstAmount: Number(orderRow.gst_amount),
      grandTotal: Number(orderRow.total_amount),
      totalAmount: Number(orderRow.total_amount),
      status: orderRow.status,
      placedAt: orderRow.placed_at,
      preparingAt: orderRow.preparing_at,
      readyAt: orderRow.ready_at,
      collectedAt: orderRow.collected_at,
      serverExactTimestamp: orderRow.placed_at || orderRow.created_at,
      createdAt: orderRow.created_at,
      updatedAt: orderRow.updated_at,
      items,
      async save() {
        await Order.findByIdAndUpdate(this.id, { status: this.status });
        return this;
      },
      toObject() {
        return { ...this };
      },
    };
  }

  static async create(data, externalConn = null) {
    const conn = externalConn || (await getConnection());
    const isLocalConn = !externalConn;

    try {
      if (isLocalConn) {
        await conn.beginTransaction();
      }

      const orderNumber = data.orderNumber || data.order_number;
      const userId = data.user || data.user_id || data.userId;
      const pickupSlotId = data.pickupSlot || data.pickup_slot_id || data.pickupSlotId;
      const customerName = data.customerName || data.customer_name || 'Customer';
      const customerEmail = data.customerEmail || data.customer_email || '';
      const customerPhone = data.customerPhone || data.customer_phone || '';
      const slotLabel = data.slotLabel || data.slot_label || 'Express Slot';
      const pickupDate = data.pickupDate || data.pickup_date || new Date().toISOString().split('T')[0];
      const subtotal = Number(data.subtotal || 0);
      const gstAmount = Number(data.totalGst || data.gst_amount || 0);
      const totalAmount = Number(data.grandTotal || data.total_amount || subtotal + gstAmount);
      const status = data.status || 'Placed';
      const placedAt = data.serverExactTimestamp || data.placed_at || new Date();

      const [orderResult] = await conn.query(
        `INSERT INTO orders (
          order_number, user_id, pickup_slot_id, customer_name, customer_email, customer_phone,
          slot_label, pickup_date, subtotal, gst_amount, total_amount, status, placed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          pickupSlotId,
          customerName,
          customerEmail,
          customerPhone,
          slotLabel,
          pickupDate,
          subtotal,
          gstAmount,
          totalAmount,
          status,
          placedAt,
        ]
      );

      const orderId = orderResult.insertId;

      // Insert Order Items
      const items = data.items || [];
      for (const item of items) {
        const menuItemId = item.menuItem || item.menu_item_id || item.menuItemId || item._id;
        const itemName = item.name || item.item_name || 'Item';
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unitPrice || item.unit_price || item.basePrice || 0);
        const gstRate = Number(item.gstRate || item.gst_rate || 5);
        const itemGst = Number(item.gstAmount || item.gst_amount || (unitPrice * gstRate) / 100);
        const itemTotal = Number(item.itemTotal || item.total_price || (unitPrice + itemGst) * quantity);

        await conn.query(
          `INSERT INTO order_items (
            order_id, menu_item_id, item_name, quantity, unit_price, gst_rate, gst_amount, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, menuItemId, itemName, quantity, unitPrice, gstRate, itemGst, itemTotal]
        );
      }

      if (isLocalConn) {
        await conn.commit();
      }

      return this.findById(orderId, conn);
    } catch (err) {
      if (isLocalConn) {
        await conn.rollback();
      }
      throw err;
    } finally {
      if (isLocalConn) {
        conn.release();
      }
    }
  }

  static find(filter = {}) {
    return new QueryBuilder(async (options) => {
      let sql = `SELECT * FROM orders WHERE 1=1`;
      const params = [];

      if (filter.user || filter.user_id) {
        sql += ` AND user_id = ?`;
        params.push(filter.user || filter.user_id);
      }

      if (filter.status) {
        if (typeof filter.status === 'object' && filter.status !== null) {
          if (filter.status.$in) {
            const placeholders = filter.status.$in.map(() => '?').join(',');
            sql += ` AND status IN (${placeholders})`;
            params.push(...filter.status.$in);
          } else if (filter.status.$ne) {
            sql += ` AND status != ?`;
            params.push(filter.status.$ne);
          }
        } else {
          sql += ` AND status = ?`;
          params.push(filter.status);
        }
      }

      if (filter.pickupDate || filter.pickup_date) {
        sql += ` AND (pickup_date = ? OR DATE(pickup_date) = ?)`;
        const pDate = filter.pickupDate || filter.pickup_date;
        params.push(pDate, pDate);
      }

      if (options.sort) {
        const sortEntries = Object.entries(options.sort);
        const orderClauses = sortEntries.map(([k, v]) => {
          let col = k;
          if (k === 'createdAt') col = 'created_at';
          if (k === 'placedAt') col = 'placed_at';
          return `\`${col}\` ${v === -1 ? 'DESC' : 'ASC'}`;
        });
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      } else {
        sql += ` ORDER BY placed_at DESC`;
      }

      if (options.limit) {
        sql += ` LIMIT ?`;
        params.push(options.limit);
      }

      const orderRows = await query(sql, params);
      if (orderRows.length === 0) return [];

      const orderIds = orderRows.map((o) => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      const itemRows = await query(
        `SELECT * FROM order_items WHERE order_id IN (${placeholders})`,
        orderIds
      );

      const itemsByOrder = {};
      for (const item of itemRows) {
        if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
        itemsByOrder[item.order_id].push(item);
      }

      return orderRows.map((o) => this.wrapOrder(o, itemsByOrder[o.id] || []));
    });
  }

  static async findById(id, externalConn = null) {
    if (!id) return null;
    const runner = externalConn ? externalConn.query.bind(externalConn) : query;

    const [orderRows] = externalConn
      ? await externalConn.query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id])
      : [await query(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id])];

    const order = orderRows[0];
    if (!order) return null;

    const [itemRows] = externalConn
      ? await externalConn.query(`SELECT * FROM order_items WHERE order_id = ?`, [id])
      : [await query(`SELECT * FROM order_items WHERE order_id = ?`, [id])];

    return this.wrapOrder(order, itemRows);
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    if (!id) return null;
    const sets = [];
    const params = [];

    const simpleFields = update.$set || update;
    for (const [key, val] of Object.entries(simpleFields)) {
      if (key === '$set' || key === '$inc') continue;
      let col = key;
      if (key === 'status') {
        col = 'status';
        // Also update timestamp column
        if (val === 'Preparing') sets.push(`preparing_at = NOW()`);
        if (val === 'Ready') sets.push(`ready_at = NOW()`);
        if (val === 'Collected') sets.push(`collected_at = NOW()`);
      }
      sets.push(`\`${col}\` = ?`);
      params.push(val);
    }

    if (sets.length > 0) {
      params.push(id);
      await query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    return this.findById(id);
  }

  static async countDocuments(filter = {}) {
    let sql = `SELECT COUNT(*) as count FROM orders WHERE 1=1`;
    const params = [];

    if (filter.pickupDate || filter.pickup_date) {
      sql += ` AND (pickup_date = ? OR DATE(pickup_date) = ?)`;
      const pDate = filter.pickupDate || filter.pickup_date;
      params.push(pDate, pDate);
    }

    if (filter.status) {
      if (typeof filter.status === 'object' && filter.status !== null) {
        if (filter.status.$in) {
          const placeholders = filter.status.$in.map(() => '?').join(',');
          sql += ` AND status IN (${placeholders})`;
          params.push(...filter.status.$in);
        } else if (filter.status.$ne) {
          sql += ` AND status != ?`;
          params.push(filter.status.$ne);
        }
      } else {
        sql += ` AND status = ?`;
        params.push(filter.status);
      }
    }

    const rows = await query(sql, params);
    return rows[0]?.count || 0;
  }

  static async deleteMany() {
    await query(`DELETE FROM orders`);
  }
}

module.exports = Order;
