const { pool } = require('../config/database');

class AppModel {
  // 保存或更新应用信息
  async saveApp(app) {
    const query = `
      INSERT INTO apps (
        id, name, date, size, channel, build, version, identifier,
        pkg, icon, plist, web_icon, type, requires_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        date = VALUES(date),
        size = VALUES(size),
        channel = VALUES(channel),
        build = VALUES(build),
        version = VALUES(version),
        identifier = VALUES(identifier),
        pkg = VALUES(pkg),
        icon = VALUES(icon),
        plist = VALUES(plist),
        web_icon = VALUES(web_icon),
        type = VALUES(type)
    `;
    
    try {
      await pool.execute(query, [
        app.id,
        app.name,
        app.date,
        app.size,
        app.channel || '',
        app.build,
        app.version,
        app.identifier,
        app.pkg,
        app.icon,
        app.plist,
        app.webIcon,
        app.type,
        true // 默认需要卡密解锁
      ]);
      return true;
    } catch (error) {
      console.error('保存应用信息错误:', error);
      throw error;
    }
  }

  // 获取所有应用
  async getAllApps() {
    try {
      const [rows] = await pool.execute('SELECT * FROM apps ORDER BY updated_at DESC');
      return rows;
    } catch (error) {
      console.error('获取应用列表错误:', error);
      throw error;
    }
  }

  // 根据ID获取应用
  async getAppById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM apps WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      console.error('获取应用详情错误:', error);
      throw error;
    }
  }

  // 更新应用的卡密需求状态
  async updateRequiresKey(id, requiresKey) {
    try {
      console.log('模型层:更新应用卡密需求:', { id, requiresKey });
      await pool.execute(
        'UPDATE apps SET requires_key = ? WHERE id = ?',
        [requiresKey, id]
      );
      console.log('模型层:应用卡密需求更新成功');
      return true;
    } catch (error) {
      console.error('更新应用卡密状态错误:', error);
      throw error;
    }
  }

  // 更新应用信息
  async updateApp(id, appData) {
    try {
      // 先检查应用是否存在
      const [apps] = await pool.execute(
        'SELECT * FROM apps WHERE id = ?',
        [id]
      );
      
      if (apps.length === 0) {
        return { success: false, message: '应用不存在' };
      }
      
      // 更新应用数据
      await pool.execute(
        'UPDATE apps SET name = ?, version = ?, requires_key = ? WHERE id = ?',
        [appData.name, appData.version, appData.requires_key, id]
      );
      
      return { success: true, message: '应用更新成功' };
    } catch (error) {
      console.error('更新应用信息错误:', error);
      throw error;
    }
  }

  // 删除应用
  async deleteApp(id) {
    try {
      // 先检查应用是否存在
      const [apps] = await pool.execute(
        'SELECT * FROM apps WHERE id = ?',
        [id]
      );
      
      if (apps.length === 0) {
        return { success: false, message: '应用不存在' };
      }
      
      const app = apps[0];
      
      // 开始事务
      const connection = await pool.getConnection();
      await connection.beginTransaction();
      
      try {
        // 不再删除绑定关系，因为绑定现在是通用的
        // 直接删除应用
        await connection.execute(
          'DELETE FROM apps WHERE id = ?',
          [id]
        );
        
        await connection.commit();
        connection.release();
        
        // 删除本地文件
        this.deleteLocalFiles(app);
        
        return { success: true, message: '应用删除成功' };
      } catch (error) {
        await connection.rollback();
        connection.release();
        console.error('删除应用事务错误:', error);
        return { success: false, message: '删除应用失败' };
      }
    } catch (error) {
      console.error('删除应用错误:', error);
      throw error;
    }
  }
  
  // 删除应用关联的本地文件
  deleteLocalFiles(app) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // 基础存储路径
      const storagePath = path.join(__dirname, '../../public/uploads/apps');
      const identifier = app.identifier || '';
      
      // 尝试删除IPA文件
      if (app.pkg && app.pkg.includes(app.id)) {
        try {
          const ipaPath = path.join(storagePath, identifier, `${app.id}.ipa`);
          if (fs.existsSync(ipaPath)) {
            fs.unlinkSync(ipaPath);
            console.log(`已删除IPA文件: ${ipaPath}`);
          }
        } catch (err) {
          console.error(`删除IPA文件失败: ${err.message}`);
        }
      }
      
      // 尝试删除图标文件
      if (app.icon && app.icon.includes(app.id)) {
        try {
          const iconPath = path.join(storagePath, identifier, `${app.id}.png`);
          if (fs.existsSync(iconPath)) {
            fs.unlinkSync(iconPath);
            console.log(`已删除图标文件: ${iconPath}`);
          }
        } catch (err) {
          console.error(`删除图标文件失败: ${err.message}`);
        }
      }
      
      // 尝试删除plist文件
      if (app.plist && app.plist.includes(app.id)) {
        try {
          const plistPath = path.join(storagePath, '../plist', `${app.id}.plist`);
          if (fs.existsSync(plistPath)) {
            fs.unlinkSync(plistPath);
            console.log(`已删除plist文件: ${plistPath}`);
          }
        } catch (err) {
          console.error(`删除plist文件失败: ${err.message}`);
        }
      }
      
      // 尝试删除应用目录
      try {
        const appDir = path.join(storagePath, identifier);
        if (fs.existsSync(appDir)) {
          const files = fs.readdirSync(appDir);
          if (files.length === 0) {
            fs.rmdirSync(appDir);
            console.log(`已删除空的应用目录: ${appDir}`);
          } else {
            console.log(`应用目录不为空，跳过删除: ${appDir}`);
          }
        }
      } catch (err) {
        console.error(`删除应用目录失败: ${err.message}`);
      }
    } catch (error) {
      console.error('删除本地文件错误:', error);
    }
  }

  // 插入测试应用（仅用于API测试）
  async insertTestApp() {
    try {
      const id = 'TEST' + Date.now();
      const [result] = await pool.execute(
        `INSERT INTO apps 
        (id, name, identifier, version, build, size, icon, web_icon, pkg, plist, requires_key) 
        VALUES 
        (?, '测试应用', 'com.test.app', '1.0.0', '1', 10000000, 
        'https://example.com/icon.png', 'https://example.com/web_icon.png', 
        'https://example.com/app.ipa', 'https://example.com/app.plist', 1)`,
        [id]
      );
      
      console.log('测试应用创建成功，ID:', id);
      return id;
    } catch (error) {
      console.error('创建测试应用错误:', error);
      throw error;
    }
  }
}

module.exports = new AppModel(); 