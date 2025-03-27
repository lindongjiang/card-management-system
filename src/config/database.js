const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: '47.98.189.107',
  port: 3306,
  user: 'ipa',
  password: 'ipa',
  database: 'ipa',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// 创建连接池
const pool = mysql.createPool(dbConfig);

// 初始化数据库表
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // 创建用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // 创建应用表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS apps (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date VARCHAR(255),
        size BIGINT,
        channel VARCHAR(255),
        build VARCHAR(255),
        version VARCHAR(255),
        identifier VARCHAR(255),
        pkg VARCHAR(255),
        icon VARCHAR(255),
        plist VARCHAR(255),
        web_icon VARCHAR(255),
        type INT DEFAULT 0,
        requires_key BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // 创建卡密表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS cards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        card_key VARCHAR(255) NOT NULL UNIQUE,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP NULL
      )
    `);
    
    // 创建UDID绑定表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS bindings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        udid VARCHAR(255) NOT NULL,
        card_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
      )
    `);
    
    // 创建默认管理员账号
    const [users] = await connection.execute('SELECT * FROM users WHERE username = ?', ['admin']);
    if (users.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
    }
    
    connection.release();
    console.log('数据库表初始化成功');
  } catch (error) {
    console.error('数据库初始化错误:', error);
  }
}

module.exports = {
  pool,
  initDatabase
}; 