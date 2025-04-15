const axios = require('axios');
const appModel = require('../models/appModel');
const encryptionService = require('./encryptionService');

class AppService {
  // 从外部API同步应用数据
  async syncApps() {
    try {
      const response = await axios.get('https://typecho.cloudmantoub.online/api/list');
      const apps = response.data;
      
      let savedCount = 0;
      
      for (const app of apps) {
        // 转换API数据格式为数据库格式
        await appModel.saveApp({
          id: app.id,
          name: app.name,
          date: app.date,
          size: app.size,
          channel: app.channel,
          build: app.build,
          version: app.version,
          identifier: app.identifier,
          pkg: app.pkg,
          icon: app.icon,
          plist: app.plist,
          webIcon: app.webIcon,
          type: app.type
        });
        
        savedCount++;
      }
      
      return { 
        success: true, 
        message: `成功同步 ${savedCount} 个应用` 
      };
    } catch (error) {
      console.error('同步应用数据错误:', error);
      return {
        success: false, 
        message: `同步失败: ${error.message}`
      };
    }
  }

  // 获取应用列表
  async getAppList() {
    try {
      const apps = await appModel.getAllApps();
      
      // 处理返回结果，加密敏感信息
      return apps.map(app => {
        const result = { ...app };
        
        // 如果需要卡密，则隐藏plist
        if (app.requires_key) {
          result.plist = null;
        } else if (app.plist) {
          // 加密plist链接
          result.plist = encryptionService.generateEncryptedPlistUrl(app.plist);
        }
        
        return result;
      });
    } catch (error) {
      console.error('获取应用列表错误:', error);
      throw error;
    }
  }

  // 获取应用详情
  async getAppDetail(id) {
    try {
      console.log(`[服务层] 获取应用详情 - AppID: ${id}`);
      
      // 对于测试ID，返回测试应用
      if (id.toUpperCase().startsWith('TEST') || id.includes('test')) {
        console.log(`[服务层] 检测到测试应用ID: ${id}，返回测试应用数据`);
        return this.createTestApp(id);
      }
      
      const app = await appModel.getAppById(id);
      
      if (!app) {
        console.log(`[服务层] 应用不存在 - AppID: ${id}`);
        return null;
      }
      
      console.log(`[服务层] 获取应用成功 - 应用名称: ${app.name}, 版本: ${app.version}, 需要卡密: ${app.requires_key}`);
      
      // 始终返回plist，让安装页面统一处理权限
      let resultApp = { ...app };
      
      if (app.plist) {
        try {
          // 尝试加密plist链接，但不抛出异常
          resultApp.plist = encryptionService.generateEncryptedPlistUrl(app.plist);
          console.log(`[服务层] plist链接已加密处理 - AppID: ${id}`);
        } catch (encryptError) {
          console.error(`[服务层] plist链接加密失败 - AppID: ${id}, 错误:`, encryptError);
          // 保留原始plist
          resultApp.plist = app.plist;
        }
      } else {
        console.log(`[服务层] 应用无plist链接 - AppID: ${id}`);
      }
      
      return resultApp;
    } catch (error) {
      console.error('[服务层] 获取应用详情错误:', error);
      throw error;
    }
  }

  // 创建测试应用
  createTestApp(id) {
    console.log(`[服务层] 创建测试应用 - ID: ${id}`);
    return {
      id: id,
      name: "测试应用",
      version: "1.0.0",
      description: "这是一个用于测试的应用",
      icon: "https://is1-ssl.mzstatic.com/image/thumb/Purple126/v4/c2/c6/d8/c2c6d885-4a33-29b9-dac0-b229c0f8b845/AppIcon-1x_U007emarketing-0-7-0-85-220.png/246x0w.webp",
      requires_key: 0,
      plist: "https://renmai.cloudmantoub.online/public/plists/test_app.plist",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // 更新应用卡密需求
  async updateAppKeyRequirement(id, requiresKey) {
    try {
      console.log('服务层:更新应用卡密需求:', { id, requiresKey });
      await appModel.updateRequiresKey(id, requiresKey);
      console.log('服务层:应用卡密需求更新成功');
      return { success: true, message: '应用卡密需求更新成功' };
    } catch (error) {
      console.error('更新应用卡密需求错误:', error);
      return { success: false, message: error.message };
    }
  }

  // 更新应用信息
  async updateApp(id, appData) {
    try {
      const result = await appModel.updateApp(id, appData);
      return result;
    } catch (error) {
      console.error('更新应用信息错误:', error);
      return { success: false, message: error.message };
    }
  }

  // 删除应用
  async deleteApp(id) {
    try {
      const result = await appModel.deleteApp(id);
      return result;
    } catch (error) {
      console.error('删除应用错误:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new AppService(); 