const { query } = require('../config/db');
const QueryBuilder = require('./QueryBuilder');

class OrderStatusHistory {
  static wrapHistory(row) {
    if (!row) return null;
    return {
      _id: row.id,
      id: row.id,
      order: row.order_id,
      order_id: row.order_id,
      status: row.status,
      timestamp: row.timestamp,
      note: row.note || '',
      updatedBy: row.updated_by,
      updated_by: row.updated_by,
      updatedByName: row.updated_by_name || '',
      updated_by_name: row.updated_by_name || '',
      toObject() {
        return { ...this };
      },
    };
  }

  static async create(data) {
    const records = Array.isArray(data) ? data : [data];
    const created = [];

    for (const item of records) {
      const orderId = item.order || item.order_id;
      const status = item.status || 'Placed';
      const timestamp = item.timestamp ? new Date(item.timestamp) : new Date();
      const note = item.note || '';
      const updatedBy = item.updatedBy || item.updated_by || null;
      const updatedByName = item.updatedByName || item.updated_by_name || '';

      const result = await query(
        `INSERT INTO order_status_history (order_id, status, timestamp, note, updated_by, updated_by_name)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, status, timestamp, note, updatedBy, updatedByName]
      );

      const rows = await query(`SELECT * FROM order_status_history WHERE id = ?`, [result.insertId]);
      created.push(this.wrapHistory(rows[0]));
    }

    return Array.isArray(data) ? created : created[0];
  }

  static find(filter = {}) {
    return new QueryBuilder(async (options) => {
      let sql = `SELECT * FROM order_status_history WHERE 1=1`;
      const params = [];

      if (filter.order) {
        if (filter.order.$in && Array.isArray(filter.order.$in)) {
          if (filter.order.$in.length === 0) return [];
          const placeholders = filter.order.$in.map(() => '?').join(',');
          sql += ` AND order_id IN (${placeholders})`;
          params.push(...filter.order.$in);
        } else {
          sql += ` AND order_id = ?`;
          params.push(filter.order);
        }
      }

      if (options.sort && options.sort.timestamp) {
        sql += ` ORDER BY timestamp ${options.sort.timestamp === -1 ? 'DESC' : 'ASC'}`;
      } else {
        sql += ` ORDER BY timestamp ASC`;
      }

      const rows = await query(sql, params);
      return rows.map((r) => this.wrapHistory(r));
    });
  }

  static async deleteMany() {
    await query(`DELETE FROM order_status_history`);
  }
}

module.exports = OrderStatusHistory;
