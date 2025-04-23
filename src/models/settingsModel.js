const { pool } = require('../config/database');

/**
 * 设置模型，用于管理系统全局设置
 */
class SettingsModel {
  /**
   * 确保设置表存在
   */
  async ensureTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS settings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(50) NOT NULL UNIQUE,
          setting_value TEXT,
          setting_type VARCHAR(20) DEFAULT 'string',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      await pool.query(createTableQuery);
      
      // 创建版本历史记录表
      const createHistoryTableQuery = `
        CREATE TABLE IF NOT EXISTS version_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          setting_key VARCHAR(50) NOT NULL,
          old_value VARCHAR(50),
          new_value VARCHAR(50) NOT NULL,
          changed_by VARCHAR(50),
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await pool.query(createHistoryTableQuery);
      
      // 初始化默认设置
      const defaultSettings = [
        { key: 'api_base_url', value: 'https://renmai.cloudmantoub.online', type: 'string' },
        { key: 'disguise_enabled', value: 'true', type: 'boolean' },
        { key: 'min_version_disguise', value: '1.0.0', type: 'string' },
        { key: 'max_version_disguise', value: '', type: 'string' },
        { key: 'version_blacklist', value: '[]', type: 'json' },
        { key: 'version_whitelist', value: '[]', type: 'json' }
      ];
      
      for (const setting of defaultSettings) {
        await this.ensureSetting(setting.key, setting.value, setting.type);
      }
      
      console.log('设置表初始化完成');
    } catch (error) {
      console.error('设置表初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 确保设置存在，如果不存在则创建
   */
  async ensureSetting(key, defaultValue, type = 'string') {
    try {
      const [rows] = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
      
      if (rows.length === 0) {
        await pool.query(
          'INSERT INTO settings (setting_key, setting_value, setting_type) VALUES (?, ?, ?)',
          [key, defaultValue, type]
        );
      }
    } catch (error) {
      console.error(`确保设置 ${key} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取设置值
   */
  async getSetting(key) {
    try {
      const [rows] = await pool.query('SELECT * FROM settings WHERE setting_key = ?', [key]);
      
      if (rows.length === 0) {
        return null;
      }
      
      const setting = rows[0];
      
      // 根据类型返回适当的值
      if (setting.setting_type === 'boolean') {
        return setting.setting_value === 'true';
      } else if (setting.setting_type === 'number') {
        return parseFloat(setting.setting_value);
      } else if (setting.setting_type === 'json') {
        try {
          return JSON.parse(setting.setting_value);
        } catch (e) {
          return {};
        }
      }
      
      return setting.setting_value;
    } catch (error) {
      console.error(`获取设置 ${key} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 记录版本变更历史
   */
  async logVersionChange(key, oldValue, newValue, userId) {
    try {
      await pool.query(
        'INSERT INTO version_history (setting_key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)',
        [key, oldValue, newValue, userId]
      );
      console.log(`记录版本变更: ${key} 从 ${oldValue} 到 ${newValue}`);
    } catch (error) {
      console.error('记录版本变更历史失败:', error);
    }
  }
  
  /**
   * 获取版本变更历史
   */
  async getVersionHistory(key, limit = 10) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM version_history WHERE setting_key = ? ORDER BY changed_at DESC LIMIT ?',
        [key, limit]
      );
      return rows;
    } catch (error) {
      console.error('获取版本历史失败:', error);
      return [];
    }
  }
  
  /**
   * 更新设置值 (增强版)
   */
  async updateSetting(key, value, type = null, userId = null) {
    try {
      // 获取旧值用于记录历史
      const oldValue = await this.getSetting(key);
      
      let valueToStore = value;
      
      // 如果提供了类型，先检查是否需要对值进行格式化
      if (type === 'json' && typeof value !== 'string') {
        valueToStore = JSON.stringify(value);
      } else if (type === 'boolean') {
        valueToStore = value ? 'true' : 'false';
      } else if (type === 'number') {
        valueToStore = value.toString();
      }
      
      // 构建更新语句
      let updateQuery = 'UPDATE settings SET setting_value = ?, setting_type = ?';
      const queryParams = [valueToStore, type || 'string'];
      
      // 如果是变身设置，需要更新多个字段
      if (key === 'disguise') {
        updateQuery = `
          UPDATE settings 
          SET setting_value = ?,
              setting_type = ?,
              min_version_disguise = ?,
              max_version_disguise = ?,
              version_blacklist = ?,
              version_whitelist = ?,
              disguise_enabled = ?,
              updated_at = ?
          WHERE setting_key = 'disguise'
        `;
        
        // 确保数组类型的值被正确序列化
        const blacklist = Array.isArray(value.version_blacklist) ? JSON.stringify(value.version_blacklist) : '[]';
        const whitelist = Array.isArray(value.version_whitelist) ? JSON.stringify(value.version_whitelist) : '[]';
        
        queryParams.push(
          value.min_version_disguise || '',
          value.max_version_disguise || '',
          blacklist,
          whitelist,
          value.disguise_enabled ? 'true' : 'false',
          new Date()
        );
      } else {
        updateQuery += ' WHERE setting_key = ?';
        queryParams.push(key);
      }
      
      console.log('执行SQL更新:', updateQuery, queryParams);
      
      await pool.query(updateQuery, queryParams);
      
      // 记录版本相关设置的变更历史
      if (key.includes('version')) {
        await this.logVersionChange(key, oldValue, valueToStore, userId);
      }
      
      return true;
    } catch (error) {
      console.error(`更新设置 ${key} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * 获取所有设置
   */
  async getAllSettings() {
    try {
      const [rows] = await pool.query('SELECT * FROM settings');
      
      const settings = {};
      
      for (const row of rows) {
        let value = row.setting_value;
        
        // 根据类型处理值
        if (row.setting_type === 'boolean') {
          value = value === 'true';
        } else if (row.setting_type === 'number') {
          value = parseFloat(value);
        } else if (row.setting_type === 'json') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = {};
          }
        }
        
        settings[row.setting_key] = value;
      }
      
      return settings;
    } catch (error) {
      console.error('获取所有设置失败:', error);
      throw error;
    }
  }
}

module.exports = new SettingsModel(); 