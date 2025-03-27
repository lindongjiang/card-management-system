const { pool } = require('../config/database');
const { nanoid } = require('nanoid');

class CardModel {
  // 生成单个卡密
  async generateCard(validity = 30) {
    const cardKey = nanoid(16);
    let expiresAt = null;
    
    // 如果有效期大于0，计算过期时间
    if (validity > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + validity);
    }
    
    try {
      const [result] = await pool.execute(
        'INSERT INTO cards (card_key, expires_at) VALUES (?, ?)',
        [cardKey, expiresAt]
      );
      return { id: result.insertId, cardKey };
    } catch (error) {
      console.error('生成卡密错误:', error);
      throw error;
    }
  }

  // 批量生成卡密
  async batchGenerateCards(count = 1, validity = 30) {
    const cards = [];
    try {
      for (let i = 0; i < count; i++) {
        const card = await this.generateCard(validity);
        cards.push(card);
      }
      return cards;
    } catch (error) {
      console.error('批量生成卡密错误:', error);
      throw error;
    }
  }

  // 导入卡密
  async importCards(cardKeys) {
    const results = [];
    try {
      for (const key of cardKeys) {
        try {
          const [result] = await pool.execute(
            'INSERT INTO cards (card_key) VALUES (?)',
            [key]
          );
          results.push({ 
            success: true, 
            id: result.insertId, 
            cardKey: key 
          });
        } catch (error) {
          // 可能是重复卡密
          results.push({ 
            success: false, 
            cardKey: key, 
            error: error.message 
          });
        }
      }
      return results;
    } catch (error) {
      console.error('导入卡密错误:', error);
      throw error;
    }
  }

  // 使用卡密 - 移除appId参数
  async useCard(cardKey, udid) {
    try {
      // 获取卡密信息
      const [cards] = await pool.execute(
        'SELECT * FROM cards WHERE card_key = ? AND used = FALSE',
        [cardKey]
      );
      
      if (cards.length === 0) {
        return { success: false, message: '卡密不存在或已被使用' };
      }
      
      const card = cards[0];
      
      // 检查卡密是否过期
      if (card.expires_at && new Date(card.expires_at) < new Date()) {
        return { success: false, message: '卡密已过期' };
      }
      
      // 检查UDID是否已有绑定记录 - 不再检查特定应用
      const [bindings] = await pool.execute(
        'SELECT * FROM bindings WHERE udid = ?',
        [udid]
      );
      
      // 如果UDID已经有绑定记录，直接成功返回
      if (bindings.length > 0) {
        return { success: true, message: 'UDID已有绑定记录，验证成功' };
      }
      
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 标记卡密为已使用
        await connection.execute(
          'UPDATE cards SET used = TRUE, used_at = NOW() WHERE id = ?',
          [card.id]
        );
        
        // 创建UDID绑定 - 不再需要app_id
        await connection.execute(
          'INSERT INTO bindings (udid, card_id) VALUES (?, ?)',
          [udid, card.id]
        );
        
        await connection.commit();
        connection.release();
        
        return { success: true, message: '卡密使用成功，已解锁所有应用' };
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('使用卡密事务错误:', error);
        return { success: false, message: '卡密使用失败' };
      }
    } catch (error) {
      console.error('使用卡密错误:', error);
      throw error;
    }
  }

  // 检查UDID是否已绑定 - 移除appId参数
  async checkBinding(udid) {
    try {
      // 只检查UDID是否有任何绑定记录
      const [rows] = await pool.execute(
        'SELECT * FROM bindings WHERE udid = ?',
        [udid]
      );
      return rows.length > 0;
    } catch (error) {
      console.error('检查UDID绑定错误:', error);
      throw error;
    }
  }

  // 获取所有卡密
  async getAllCards() {
    try {
      const [rows] = await pool.execute(`
        SELECT c.*, b.udid 
        FROM cards c
        LEFT JOIN bindings b ON c.id = b.card_id
        ORDER BY c.created_at DESC
      `);
      return rows;
    } catch (error) {
      console.error('获取卡密列表错误:', error);
      throw error;
    }
  }

  // 获取卡密使用情况统计
  async getCardStats() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN used = TRUE THEN 1 ELSE 0 END) as used,
          SUM(CASE WHEN used = FALSE THEN 1 ELSE 0 END) as unused
        FROM cards
      `);
      return rows[0];
    } catch (error) {
      console.error('获取卡密统计错误:', error);
      throw error;
    }
  }

  // 删除卡密
  async deleteCard(id) {
    try {
      // 先检查卡密是否存在
      const [cards] = await pool.execute(
        'SELECT * FROM cards WHERE id = ?',
        [id]
      );
      
      if (cards.length === 0) {
        return { success: false, message: '卡密不存在' };
      }
      
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 删除绑定关系
        await connection.execute(
          'DELETE FROM bindings WHERE card_id = ?',
          [id]
        );
        
        // 删除卡密
        await connection.execute(
          'DELETE FROM cards WHERE id = ?',
          [id]
        );
        
        await connection.commit();
        connection.release();
        
        return { success: true, message: '卡密删除成功' };
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('删除卡密事务错误:', error);
        return { success: false, message: '删除卡密失败' };
      }
    } catch (error) {
      console.error('删除卡密错误:', error);
      throw error;
    }
  }

  // 更新卡密
  async updateCard(id, cardData) {
    try {
      // 先检查卡密是否存在
      const [cards] = await pool.execute(
        'SELECT * FROM cards WHERE id = ?',
        [id]
      );
      
      if (cards.length === 0) {
        return { success: false, message: '卡密不存在' };
      }
      
      // 更新卡密状态
      await pool.execute(
        'UPDATE cards SET used = ?, used_at = ? WHERE id = ?',
        [
          cardData.used, 
          cardData.used ? new Date() : null, 
          id
        ]
      );
      
      return { success: true, message: '卡密更新成功' };
    } catch (error) {
      console.error('更新卡密错误:', error);
      throw error;
    }
  }

  // 获取所有绑定关系
  async getAllBindings() {
    try {
      const [rows] = await pool.execute(`
        SELECT b.id, b.udid, b.created_at, c.card_key, c.used, c.used_at, a.name as app_name
        FROM bindings b
        JOIN cards c ON b.card_id = c.id
        JOIN apps a ON b.app_id = a.id
        ORDER BY b.created_at DESC
      `);
      return rows;
    } catch (error) {
      console.error('获取绑定列表错误:', error);
      throw error;
    }
  }

  // 手动添加绑定
  async addBinding(udid, cardKey) {
    try {
      // 检查UDID是否已绑定
      const isBindingExist = await this.checkBinding(udid);
      if (isBindingExist) {
        return { success: false, message: 'UDID已绑定到其他卡密' };
      }

      // 检查卡密是否存在且未使用
      const [cards] = await pool.execute(
        'SELECT * FROM cards WHERE card_key = ? AND used = FALSE',
        [cardKey]
      );
      
      if (cards.length === 0) {
        return { success: false, message: '卡密不存在或已被使用' };
      }
      
      const card = cards[0];
      
      // 检查卡密是否过期
      if (card.expires_at && new Date(card.expires_at) < new Date()) {
        return { success: false, message: '卡密已过期' };
      }
      
      // 获取一个默认的app_id（因为app_id是必须的）
      const [apps] = await pool.execute('SELECT id FROM apps LIMIT 1');
      if (apps.length === 0) {
        return { success: false, message: '没有可用的应用，请先添加应用' };
      }
      const defaultAppId = apps[0].id;
      
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 标记卡密为已使用
        await connection.execute(
          'UPDATE cards SET used = TRUE, used_at = NOW() WHERE id = ?',
          [card.id]
        );
        
        // 创建UDID绑定 - 包含必要的app_id字段
        await connection.execute(
          'INSERT INTO bindings (udid, card_id, app_id) VALUES (?, ?, ?)',
          [udid, card.id, defaultAppId]
        );
        
        await connection.commit();
        connection.release();
        
        return { success: true, message: '绑定创建成功' };
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('创建绑定事务错误:', error);
        return { success: false, message: '创建绑定失败: ' + error.message };
      }
    } catch (error) {
      console.error('创建绑定错误:', error);
      throw error;
    }
  }

  // 删除绑定
  async deleteBinding(id) {
    try {
      // 检查绑定是否存在
      const [bindings] = await pool.execute(
        'SELECT * FROM bindings WHERE id = ?',
        [id]
      );
      
      if (bindings.length === 0) {
        return { success: false, message: '绑定记录不存在' };
      }
      
      const binding = bindings[0];
      
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 删除绑定
        await connection.execute(
          'DELETE FROM bindings WHERE id = ?',
          [id]
        );
        
        // 可选：将卡密标记为未使用 (根据业务需求决定)
        // await connection.execute(
        //   'UPDATE cards SET used = FALSE, used_at = NULL WHERE id = ?',
        //   [binding.card_id]
        // );
        
        await connection.commit();
        connection.release();
        
        return { success: true, message: '绑定删除成功' };
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('删除绑定事务错误:', error);
        return { success: false, message: '删除绑定失败' };
      }
    } catch (error) {
      console.error('删除绑定错误:', error);
      throw error;
    }
  }

  // 创建测试卡密（仅用于API测试）
  async createTestCard() {
    try {
      const testCard = 'TEST' + Date.now();
      const [result] = await pool.execute(
        'INSERT INTO cards (card_key, used, created_at) VALUES (?, 0, NOW())',
        [testCard]
      );
      
      console.log('测试卡密创建成功:', testCard);
      return testCard;
    } catch (error) {
      console.error('创建测试卡密错误:', error);
      throw error;
    }
  }
}

module.exports = new CardModel(); 