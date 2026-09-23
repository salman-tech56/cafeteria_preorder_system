const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;

const getDbConfig = () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'cafeflow',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  dateStrings: true, // Keep DATE/TIMESTAMP as ISO strings for seamless JSON API contracts
});

/**
 * Initialize MySQL Connection Pool and ensure Database & Schema exist
 */
const initDB = async () => {
  const config = getDbConfig();

  try {
    // 1. First connect without database selected to ensure database exists
    const rootConn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });

    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConn.end();

    // 2. Initialize connection pool targeting cafeflow database
    pool = mysql.createPool(config);

    // Test pool connection
    const testConn = await pool.getConnection();
    console.log(
      `[MySQL] Connection pool initialized successfully on ${config.host}:${config.port}/${config.database} (user: ${config.user})`
    );

    // 3. Check if tables exist; if not, execute schema.sql
    const [tables] = await testConn.query(`SHOW TABLES;`);
    testConn.release();

    if (tables.length === 0) {
      console.log('[MySQL] Empty database detected. Executing schema.sql...');
      await executeSchema();
    }

    return pool;
  } catch (error) {
    console.error(
      `\n[MySQL Error] Failed to connect to MySQL database at ${config.host}:${config.port} (${error.message}).\n` +
      `Please check your MySQL credentials in server/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).\n`
    );
    throw error;
  }
};

/**
 * Execute schema.sql to initialize all tables, foreign keys, and indexes
 */
const executeSchema = async () => {
  if (!pool) throw new Error('Database pool is not initialized');

  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Strip comments and split by semicolon
  const cleanSql = sql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const connection = await pool.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    for (const stmt of statements) {
      await connection.query(stmt);
    }
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('[MySQL] Schema initialization completed successfully.');
  } finally {
    connection.release();
  }
};

/**
 * Helper to execute parameterized queries with automatic release
 */
const query = async (sql, params = []) => {
  if (!pool) {
    await initDB();
  }
  const [results] = await pool.query(sql, params);
  return results;
};

/**
 * Helper to obtain a connection for multi-step transactions
 */
const getConnection = async () => {
  if (!pool) {
    await initDB();
  }
  return pool.getConnection();
};

const closeDB = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  initDB,
  executeSchema,
  query,
  getConnection,
  closeDB,
  get pool() {
    return pool;
  },
};
