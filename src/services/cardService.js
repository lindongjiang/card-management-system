const cardModel = require('../models/cardModel');
const appModel = require('../models/appModel');

class CardService {
  // 生成卡密
  async generateCards(count = 1, validity = 30) {
    try {
      const cards = await cardModel.batchGenerateCards(count, validity);
      return { 
        success: true, 
        data: cards,
        count: cards.length
      };
    } catch (error) {
      console.error('生成卡密错误:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // 导入卡密
  async importCards(cardKeys) {
    try {
      const results = await cardModel.importCards(cardKeys);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      return {
        success: true,
        message: `成功导入 ${successful} 个卡密，失败 ${failed} 个`,
        data: results
      };
    } catch (error) {
      console.error('导入卡密错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 验证卡密并返回plist
  async verifyCardAndGetPlist(cardKey, udid, appId) {
    try {
      // 先检查应用是否存在
      const app = await appModel.getAppById(appId);
      if (!app) {
        return { 
          success: false, 
          message: '应用不存在' 
        };
      }
      
      // 检查应用是否需要卡密
      if (!app.requires_key) {
        return { 
          success: true, 
          plist: app.plist,
          message: '该应用不需要卡密验证' 
        };
      }
      
      // 检查UDID是否已绑定 - 不需要传递appId参数
      const isBindingExist = await cardModel.checkBinding(udid);
      if (isBindingExist) {
        return { 
          success: true, 
          plist: app.plist,
          message: 'UDID已绑定，可以访问所有应用' 
        };
      }
      
      // 使用卡密 - 不再传递appId
      const useResult = await cardModel.useCard(cardKey, udid);
      if (useResult.success) {
        return {
          success: true,
          plist: app.plist,
          message: '卡密验证成功，已解锁所有应用'
        };
      } else {
        return useResult; // 返回使用卡密的错误信息
      }
    } catch (error) {
      console.error('验证卡密错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 获取卡密列表
  async getCardList() {
    try {
      const cards = await cardModel.getAllCards();
      return { 
        success: true, 
        data: cards 
      };
    } catch (error) {
      console.error('获取卡密列表错误:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // 获取卡密统计信息
  async getCardStats() {
    try {
      const stats = await cardModel.getCardStats();
      return { 
        success: true, 
        data: stats 
      };
    } catch (error) {
      console.error('获取卡密统计错误:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // 删除卡密
  async deleteCard(id) {
    try {
      const result = await cardModel.deleteCard(id);
      return result;
    } catch (error) {
      console.error('删除卡密错误:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // 更新卡密
  async updateCard(id, cardData) {
    try {
      const result = await cardModel.updateCard(id, cardData);
      return result;
    } catch (error) {
      console.error('更新卡密错误:', error);
      return { 
        success: false, 
        message: error.message 
      };
    }
  }

  // 获取所有绑定关系
  async getAllBindings() {
    try {
      const bindings = await cardModel.getAllBindings();
      return bindings;
    } catch (error) {
      console.error('获取绑定列表服务错误:', error);
      throw error;
    }
  }

  // 添加UDID绑定
  async addBinding(udid, cardKey) {
    try {
      const result = await cardModel.addBinding(udid, cardKey);
      return result;
    } catch (error) {
      console.error('添加绑定服务错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 删除绑定
  async deleteBinding(id) {
    try {
      const result = await cardModel.deleteBinding(id);
      return result;
    } catch (error) {
      console.error('删除绑定服务错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 检查UDID绑定状态
  async checkBinding(udid) {
    try {
      const isBindingExist = await cardModel.checkBinding(udid);
      return isBindingExist;
    } catch (error) {
      console.error('检查UDID绑定服务错误:', error);
      throw error;
    }
  }

  // 获取UDID的所有绑定信息
  async checkUdidBindings(udid) {
    try {
      const bindings = await cardModel.getBindingsByUdid(udid);
      return bindings;
    } catch (error) {
      console.error('获取UDID绑定信息服务错误:', error);
      throw error;
    }
  }
}

module.exports = new CardService();