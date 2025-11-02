const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Database connection pool configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ebookdz',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('🇩🇿 Database connected successfully');
    
    // Test query
    const [rows] = await connection.execute('SELECT COUNT(*) as user_count FROM users');
    console.log(`📊 Users in database: ${rows[0].user_count}`);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Execute query with error handling
const query = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Get single row
const queryOne = async (sql, params = []) => {
  try {
    const [results] = await pool.execute(sql, params);
    return results[0] || null;
  } catch (error) {
    console.error('Database queryOne error:', error);
    throw error;
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
};

// Handle process termination
process.on('SIGINT', closePool);
process.on('SIGTERM', closePool);

module.exports = {
  pool,
  query,
  queryOne,
  transaction,
  testConnection,
  closePool
};