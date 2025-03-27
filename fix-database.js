const { pool } = require('./src/config/database');

async function fixDatabase() {
  try {
    console.log('开始修复数据库表结构...');

    // 获取连接
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. 获取约束信息
      console.log('正在查询外键约束...');
      const [constraints] = await connection.execute(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'bindings'
          AND COLUMN_NAME = 'app_id'
          AND REFERENCED_TABLE_NAME = 'apps'
      `);

      if (constraints.length > 0) {
        // 2. 删除外键约束
        const constraintName = constraints[0].CONSTRAINT_NAME;
        console.log(`正在删除外键约束 ${constraintName}...`);
        await connection.execute(`
          ALTER TABLE bindings 
          DROP FOREIGN KEY ${constraintName}
        `);
      } else {
        console.log('未找到app_id的外键约束，继续执行其他修复...');
      }

      // 3. 允许app_id为NULL
      console.log('正在修改app_id允许为NULL...');
      await connection.execute(`
        ALTER TABLE bindings 
        MODIFY COLUMN app_id VARCHAR(255) NULL
      `);
      
      // 4. 确保bindings表中已有的记录不会因为app_id约束问题而导致验证失败
      console.log('正在更新现有绑定记录...');
      await connection.execute(`
        UPDATE bindings SET app_id = NULL
        WHERE app_id IS NOT NULL AND app_id NOT IN (SELECT id FROM apps)
      `);

      // 提交事务
      await connection.commit();
      console.log('数据库修复成功！');
    } catch (error) {
      // 发生错误，回滚事务
      await connection.rollback();
      console.error('数据库修复失败:', error);
    } finally {
      // 释放连接
      connection.release();
    }

    // 关闭连接池
    await pool.end();
    
    console.log('数据库连接已关闭');
    process.exit(0);
  } catch (error) {
    console.error('数据库修复脚本错误:', error);
    process.exit(1);
  }
}

// 运行修复程序
fixDatabase(); 