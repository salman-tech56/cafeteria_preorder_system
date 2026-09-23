const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const QueryBuilder = require('./QueryBuilder');

class User {
  static async create({ name, email, password, role = 'customer', phone = '' }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const normalizedEmail = email.trim().toLowerCase();

    const result = await query(
      `INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)`,
      [name.trim(), normalizedEmail, hashedPassword, role, phone || '']
    );

    return this.findById(result.insertId);
  }

  static findOne({ email } = {}) {
    return new QueryBuilder(async () => {
      if (!email) return null;
      const normalizedEmail = email.trim().toLowerCase();
      const rows = await query(`SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1`, [normalizedEmail]);
      if (rows.length === 0) return null;
      return this.wrapUser(rows[0]);
    });
  }

  static findById(id) {
    return new QueryBuilder(async () => {
      if (!id) return null;
      const rows = await query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [id]);
      if (rows.length === 0) return null;
      return this.wrapUser(rows[0]);
    });
  }

  static async countDocuments() {
    const rows = await query(`SELECT COUNT(*) as count FROM users`);
    return rows[0]?.count || 0;
  }

  static async deleteMany() {
    await query(`DELETE FROM users`);
  }

  static wrapUser(row) {
    if (!row) return null;
    return {
      _id: row.id,
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      phone: row.phone || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      async comparePassword(candidate) {
        return bcrypt.compare(candidate, row.password);
      },
      toObject() {
        const copy = { ...this };
        delete copy.password;
        return copy;
      },
    };
  }
}

module.exports = User;
