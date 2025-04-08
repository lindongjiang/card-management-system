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
      const app = await appModel.getAppById(id);
      
      if (!app) {
        return null;
      }
      
      // 如果需要卡密，隐藏plist
      if (app.requires_key) {
        app.plist = null;
      } else if (app.plist) {
        // 加密plist链接
        app.plist = encryptionService.generateEncryptedPlistUrl(app.plist);
      }
      
      return app;
    } catch (error) {
      console.error('获取应用详情错误:', error);
      throw error;
    }
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