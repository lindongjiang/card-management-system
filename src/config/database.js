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
  initDatabase,
  // 添加迁移函数，用于修复bindings表结构
  async fixBindingsTable() {
    try {
      const connection = await pool.getConnection();
      console.log('开始修复bindings表结构...');
      
      // 检查bindings表是否存在app_id列
      const [columns] = await connection.execute(`
        SHOW COLUMNS FROM bindings LIKE 'app_id'
      `);
      
      // 如果存在app_id列，则移除
      if (columns.length > 0) {
        console.log('检测到bindings表中存在app_id列，正在移除...');
        
        // 检查是否存在外键约束
        const [constraints] = await connection.execute(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = 'bindings' 
          AND COLUMN_NAME = 'app_id' 
          AND CONSTRAINT_NAME != 'PRIMARY'
        `);
        
        // 如果存在外键约束，先移除约束
        if (constraints.length > 0) {
          for (const constraint of constraints) {
            await connection.execute(`
              ALTER TABLE bindings DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
            `);
          }
        }
        
        // 移除app_id列
        await connection.execute(`
          ALTER TABLE bindings DROP COLUMN app_id
        `);
        
        console.log('成功移除bindings表中的app_id列');
      } else {
        console.log('bindings表结构正常，无需修复');
      }
      
      connection.release();
      return { success: true, message: 'bindings表结构修复完成' };
    } catch (error) {
      console.error('修复bindings表结构错误:', error);
      return { success: false, message: error.message };
    }
  }
}; 