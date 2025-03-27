const appModel = require('../models/appModel');
const cardModel = require('../models/cardModel');

class ClientService {
  // 获取公开应用列表（去除敏感字段）
  async getPublicApps() {
    try {
      const apps = await appModel.getAllApps();
      // 过滤敏感字段
      return apps.map(app => {
        const { plist, pkg, ...publicApp } = app;
        return publicApp;
      });
    } catch (error) {
      console.error('获取公开应用列表服务错误:', error);
      throw error;
    }
  }

  // 获取应用详情（验证权限后决定是否返回敏感字段）
  async getAppDetail(appId, udid) {
    try {
      // 获取应用信息
      const app = await appModel.getAppById(appId);
      if (!app) {
        throw new Error('应用不存在');
      }

      // 检查应用是否需要卡密
      if (!app.requires_key) {
        // 不需要卡密，直接返回完整信息
        return {
          app,
          requiresUnlock: false,
          isUnlocked: true
        };
      }

      // 需要卡密，检查UDID是否已绑定
      const isBindingExist = await cardModel.checkBinding(udid);
      
      // 如果已绑定，返回完整信息
      if (isBindingExist) {
        return {
          app,
          requiresUnlock: true,
          isUnlocked: true
        };
      }

      // 未绑定，返回不含敏感字段的信息
      const { plist, pkg, ...publicApp } = app;
      return {
        app: publicApp,
        requiresUnlock: true,
        isUnlocked: false
      };
    } catch (error) {
      console.error('获取应用详情服务错误:', error);
      throw error;
    }
  }

  // 检查UDID状态
  async checkBinding(udid) {
    try {
      const isBindingExist = await cardModel.checkBinding(udid);
      return isBindingExist;
    } catch (error) {
      console.error('检查UDID绑定服务错误:', error);
      throw error;
    }
  }
}

module.exports = new ClientService(); 