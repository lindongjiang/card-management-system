const appModel = require('../models/appModel');
const cardModel = require('../models/cardModel');
const encryptionService = require('./encryptionService');

class ClientService {
  // 获取应用列表（不含敏感字段）
  async getAppList() {
    try {
      const apps = await appModel.getAllApps();
      
      // 处理返回结果，加密敏感信息
      const processedApps = apps.map(app => {
        const result = { ...app };
        
        // 如果需要卡密，则隐藏plist
        if (app.requires_key) {
          result.plist = null;
        } else if (app.plist) {
          // 加密plist链接
          result.plist = encryptionService.generateEncryptedPlistUrl(app.plist);
        }
        
        // 加密其他敏感字段
        if (app.pkg) {
          result.pkg = encryptionService.encrypt(app.pkg).encryptedData;
        }
        
        return result;
      });
      
      // 对整个列表进行加密
      const encryptedData = encryptionService.encrypt(JSON.stringify(processedApps));
      return {
        iv: encryptedData.iv,
        data: encryptedData.encryptedData
      };
    } catch (error) {
      console.error('获取应用列表错误:', error);
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
      if (app.requires_key === 0 || app.requires_key === false) {
        // 不需要卡密，返回完整信息
        const result = { ...app };
        if (result.plist) {
          result.plist = encryptionService.generateEncryptedPlistUrl(result.plist);
        }
        if (result.pkg) {
          result.pkg = encryptionService.encrypt(result.pkg).encryptedData;
        }
        
        // 加密整个应用数据
        const encryptedData = encryptionService.encrypt(JSON.stringify(result));
        return {
          iv: encryptedData.iv,
          data: encryptedData.encryptedData,
          requiresUnlock: false,
          isUnlocked: true
        };
      }

      // 需要卡密，检查UDID是否已绑定
      const isBindingExist = await cardModel.checkBinding(udid);
      
      if (isBindingExist) {
        // 已绑定，返回完整信息
        const result = { ...app };
        if (result.plist) {
          result.plist = encryptionService.generateEncryptedPlistUrl(result.plist);
        }
        if (result.pkg) {
          result.pkg = encryptionService.encrypt(result.pkg).encryptedData;
        }
        
        // 加密整个应用数据
        const encryptedData = encryptionService.encrypt(JSON.stringify(result));
        return {
          iv: encryptedData.iv,
          data: encryptedData.encryptedData,
          requiresUnlock: true,
          isUnlocked: true
        };
      }

      // 未绑定，返回不含敏感字段的信息
      const { plist, pkg, ...publicApp } = app;
      const encryptedData = encryptionService.encrypt(JSON.stringify(publicApp));
      return {
        iv: encryptedData.iv,
        data: encryptedData.encryptedData,
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