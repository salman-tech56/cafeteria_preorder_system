const { query } = require('../config/db');
const QueryBuilder = require('./QueryBuilder');

class PickupSlot {
  static wrapSlot(row) {
    if (!row) return null;
    const capacity = Number(row.capacity);
    const bookedCount = Number(row.booked_count);
    const remainingCapacity = Math.max(0, capacity - bookedCount);
    const isFull = bookedCount >= capacity;
    const slotLabel = row.slot_label || `${row.slot_start} - ${row.slot_end}`;

    return {
      _id: row.id,
      id: row.id,
      slotLabel,
      slot_label: slotLabel,
      startTime: row.slot_start,
      slot_start: row.slot_start,
      endTime: row.slot_end,
      slot_end: row.slot_end,
      maxCapacity: capacity,
      capacity,
      currentOrders: bookedCount,
      booked_count: bookedCount,
      remainingCapacity,
      isFull,
      isActive: Boolean(row.available),
      available: Boolean(row.available),
      date: row.date,
      async save() {
        const start = this.startTime || this.slot_start;
        const end = this.endTime || this.slot_end;
        const label = this.slotLabel || this.slot_label || `${start} - ${end}`;
        const cap = this.maxCapacity !== undefined ? this.maxCapacity : this.capacity;
        const booked = this.currentOrders !== undefined ? this.currentOrders : this.booked_count;
        const active = this.isActive !== undefined ? this.isActive : this.available;

        await query(
          `UPDATE pickup_slots SET slot_start = ?, slot_end = ?, slot_label = ?, capacity = ?, booked_count = ?, date = ?, available = ? WHERE id = ?`,
          [start, end, label, cap, booked, this.date, active, this.id]
        );
        return this;
      },
      async deleteOne() {
        await query(`DELETE FROM pickup_slots WHERE id = ?`, [this.id]);
        return this;
      },
      toObject() {
        return { ...this };
      },
    };
  }

  static async insertMany(list = []) {
    const created = [];
    for (const item of list) {
      created.push(await this.create(item));
    }
    return created;
  }

  static async create(data) {
    const slotStart = data.startTime || data.slot_start || '12:00';
    const slotEnd = data.endTime || data.slot_end || '12:15';
    const slotLabel = data.slotLabel || data.slot_label || `${slotStart} - ${slotEnd}`;
    const capacity = Number(data.maxCapacity || data.capacity || 25);
    const bookedCount = Number(data.currentOrders || data.booked_count || 0);
    const date = data.date || new Date().toISOString().split('T')[0];
    const available = data.isActive !== undefined ? Boolean(data.isActive) : data.available !== undefined ? Boolean(data.available) : true;

    const result = await query(
      `INSERT INTO pickup_slots (slot_start, slot_end, slot_label, capacity, booked_count, date, available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slotStart, slotEnd, slotLabel, capacity, bookedCount, date, available]
    );

    return this.findById(result.insertId);
  }

  static find(filter = {}) {
    return new QueryBuilder(async (options) => {
      let sql = `SELECT * FROM pickup_slots WHERE 1=1`;
      const params = [];

      if (filter.date) {
        sql += ` AND date = ?`;
        params.push(filter.date);
      }

      if (filter.isActive !== undefined) {
        sql += ` AND available = ?`;
        params.push(Boolean(filter.isActive));
      }

      if (filter.available !== undefined) {
        sql += ` AND available = ?`;
        params.push(Boolean(filter.available));
      }

      if (options.sort && (options.sort.startTime || options.sort.slot_start)) {
        const dir = (options.sort.startTime === -1 || options.sort.slot_start === -1) ? 'DESC' : 'ASC';
        sql += ` ORDER BY slot_start ${dir}`;
      } else {
        sql += ` ORDER BY slot_start ASC`;
      }

      const rows = await query(sql, params);
      return rows.map((r) => this.wrapSlot(r));
    });
  }

  static async findById(id) {
    if (!id) return null;
    const rows = await query(`SELECT * FROM pickup_slots WHERE id = ? LIMIT 1`, [id]);
    if (rows.length === 0) return null;
    return this.wrapSlot(rows[0]);
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    if (!id) return null;

    const sets = [];
    const params = [];

    if (update.$inc) {
      for (const [key, val] of Object.entries(update.$inc)) {
        const col = key === 'currentOrders' || key === 'booked_count' ? 'booked_count' : key;
        sets.push(`\`${col}\` = \`${col}\` + ?`);
        params.push(val);
      }
    }

    const simpleFields = update.$set || update;
    for (const [key, val] of Object.entries(simpleFields)) {
      if (key === '$inc' || key === '$set') continue;
      let col = key;
      if (key === 'startTime') col = 'slot_start';
      if (key === 'endTime') col = 'slot_end';
      if (key === 'slotLabel') col = 'slot_label';
      if (key === 'maxCapacity') col = 'capacity';
      if (key === 'currentOrders') col = 'booked_count';
      if (key === 'isActive') col = 'available';

      sets.push(`\`${col}\` = ?`);
      params.push(val);
    }

    if (sets.length > 0) {
      params.push(id);
      await query(`UPDATE pickup_slots SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    return this.findById(id);
  }

  /**
   * Atomic capacity increment (prevents slot overbooking)
   */
  static async findOneAndUpdate(filter, update, options = {}) {
    const id = filter._id || filter.id;
    if (!id) return null;

    if (update.$inc && (update.$inc.currentOrders !== undefined || update.$inc.booked_count !== undefined)) {
      const incVal = update.$inc.currentOrders !== undefined ? update.$inc.currentOrders : update.$inc.booked_count;

      // Atomic check: only increment if booked_count < capacity
      const result = await query(
        `UPDATE pickup_slots SET booked_count = booked_count + ?
         WHERE id = ? AND available = 1 AND (booked_count + ?) <= capacity`,
        [incVal, id, incVal]
      );

      if (result.affectedRows === 0) {
        return null; // Slot already full!
      }
      return this.findById(id);
    }

    return this.findByIdAndUpdate(id, update, options);
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const existing = await this.findById(id);
    if (!existing) return null;
    await query(`DELETE FROM pickup_slots WHERE id = ?`, [id]);
    return existing;
  }

  static async countDocuments(filter = {}) {
    const rows = await query(`SELECT COUNT(*) as count FROM pickup_slots`);
    return rows[0]?.count || 0;
  }

  static async deleteMany() {
    await query(`DELETE FROM pickup_slots`);
  }
}

module.exports = PickupSlot;
