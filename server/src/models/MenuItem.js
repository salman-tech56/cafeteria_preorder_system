const { query } = require('../config/db');
const QueryBuilder = require('./QueryBuilder');

class MenuItem {
  static wrapItem(row) {
    if (!row) return null;
    const basePrice = Number(row.base_price);
    const gstRate = Number(row.gst_rate);
    const priceWithGst = Number((basePrice + (basePrice * gstRate) / 100).toFixed(2));

    const item = {
      _id: row.id,
      id: row.id,
      name: row.name,
      description: row.description || '',
      category: row.category,
      basePrice,
      base_price: basePrice,
      gstRate,
      gst_rate: gstRate,
      stock: Number(row.stock),
      availability: Boolean(row.available),
      available: Boolean(row.available),
      image: row.image || '',
      priceWithGst,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      async save() {
        await query(
          `UPDATE menu_items SET name = ?, description = ?, category = ?, base_price = ?, gst_rate = ?, stock = ?, available = ?, image = ? WHERE id = ?`,
          [this.name, this.description, this.category, this.basePrice, this.gstRate, this.stock, this.availability, this.image, this.id]
        );
        return this;
      },
      toObject() {
        return { ...this };
      },
    };
    return item;
  }

  static async create(data) {
    const name = (data.name || '').trim();
    const description = (data.description || '').trim();
    const category = (data.category || 'Quick Bites').trim();
    const basePrice = Number(data.basePrice || data.base_price || 0);
    const gstRate = Number(data.gstRate !== undefined ? data.gstRate : data.gst_rate !== undefined ? data.gst_rate : 5);
    const stock = Number(data.stock || 0);
    const available = data.availability !== undefined ? Boolean(data.availability) : data.available !== undefined ? Boolean(data.available) : true;
    const image = data.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const result = await query(
      `INSERT INTO menu_items (name, description, category, base_price, gst_rate, stock, available, image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, description, category, basePrice, gstRate, stock, available, image]
    );

    return this.findById(result.insertId);
  }

  static async insertMany(items = []) {
    const results = [];
    for (const item of items) {
      results.push(await this.create(item));
    }
    return results;
  }

  static find(filter = {}) {
    return new QueryBuilder(async (options) => {
      let sql = `SELECT * FROM menu_items WHERE 1=1`;
      const params = [];

      if (filter.category && filter.category !== 'All') {
        sql += ` AND category = ?`;
        params.push(filter.category);
      }

      if (filter.availability !== undefined) {
        sql += ` AND available = ?`;
        params.push(Boolean(filter.availability));
      }

      if (filter.available !== undefined) {
        sql += ` AND available = ?`;
        params.push(Boolean(filter.available));
      }

      if (filter.name) {
        // Handle regex or string search
        const searchTerm = filter.name.$regex ? filter.name.$regex : filter.name;
        sql += ` AND (name LIKE ? OR description LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }

      sql += ` ORDER BY category ASC, name ASC`;

      const rows = await query(sql, params);
      return rows.map((r) => this.wrapItem(r));
    });
  }

  static async findById(id) {
    if (!id) return null;
    const rows = await query(`SELECT * FROM menu_items WHERE id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return null;
    return this.wrapItem(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    if (!id) return null;

    const sets = [];
    const params = [];

    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        const col = key === 'stock' ? 'stock' : key;
        sets.push(`\`${col}\` = \`${col}\` + ?`);
        params.push(val);
      }
    }

    const simpleFields = update.$set || update;
    for (const [key, val] of Object.entries(simpleFields)) {
      if (key === '$inc' || key === '$set') continue;
      let col = key;
      if (key === 'basePrice') col = 'base_price';
      if (key === 'gstRate') col = 'gst_rate';
      if (key === 'availability') col = 'available';

      sets.push(`\`${col}\` = ?`);
      params.push(val);
    }

    if (sets.length > 0) {
      params.push(id);
      await query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    return this.findById(id);
  }

  /**
   * Atomic stock decrement (CRITICAL for overselling prevention)
   */
  static async findOneAndUpdate(filter, update, options = {}) {
    const id = filter._id || filter.id;
    if (!id) return null;

    let conditionSql = `id = ?`;
    const params = [];

    if (update.$inc && update.$inc.stock !== undefined) {
      const decrementQty = -update.$inc.stock; // e.g. -(-2) = 2
      // Atomic condition: only update if stock >= required quantity
      conditionSql += ` AND available = 1 AND stock >= ?`;
      params.push(id, decrementQty);

      const result = await query(
        `UPDATE menu_items SET stock = stock - ? WHERE ${conditionSql}`,
        [decrementQty, ...params]
      );

      if (result.affectedRows === 0) {
        return null; // Insufficient stock!
      }
      return this.findById(id);
    }

    return this.findByIdAndUpdate(id, update, options);
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const existing = await this.findById(id);
    if (!existing) return null;
    await query(`DELETE FROM menu_items WHERE id = ?`, [id]);
    return existing;
  }

  static async distinct(field) {
    const col = field === 'category' ? 'category' : field;
    const rows = await query(`SELECT DISTINCT \`${col}\` FROM menu_items ORDER BY \`${col}\` ASC`);
    return rows.map((r) => r[col]).filter(Boolean);
  }

  static async countDocuments(filter = {}) {
    const rows = await query(`SELECT COUNT(*) as count FROM menu_items`);
    return rows[0]?.count || 0;
  }

  static async deleteMany() {
    await query(`DELETE FROM menu_items`);
  }
}

module.exports = MenuItem;
