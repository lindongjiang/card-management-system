const appService = require('../services/appService');
const cardService = require('../services/cardService');
const clientService = require('../services/clientService');

class ClientController {
  // 获取应用列表（不含敏感字段）
  async getApps(req, res) {
    try {
      const apps = await clientService.getPublicApps();
      res.json({
        success: true,
        data: apps
      });
    } catch (error) {
      console.error('获取应用列表错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 获取应用详情（含敏感字段，需验证权限）
  async getAppDetail(req, res) {
    try {
      const { id } = req.params;
      const { udid } = req.body;
      
      if (!udid) {
        return res.status(400).json({
          success: false,
          message: '需要提供UDID'
        });
      }

      const result = await clientService.getAppDetail(id, udid);
      
      if (result.requiresUnlock && !result.isUnlocked) {
        return res.json({
          success: true,
          data: {
            ...result.app,
            requiresUnlock: true,
            isUnlocked: false
          },
          message: '此应用需要卡密解锁'
        });
      }
      
      res.json({
        success: true,
        data: result.app
      });
    } catch (error) {
      console.error('获取应用详情错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 验证卡密并绑定UDID
  async verifyAndBind(req, res) {
    try {
      const { cardKey, udid, appId } = req.body;
      
      if (!cardKey || !udid || !appId) {
        return res.status(400).json({
          success: false,
          message: '卡密、UDID和应用ID都不能为空'
        });
      }
      
      const result = await cardService.verifyCardAndGetPlist(cardKey, udid, appId);
      res.json(result);
    } catch (error) {
      console.error('验证卡密错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 检查UDID状态
  async checkUdidStatus(req, res) {
    try {
      const { udid } = req.query;
      
      if (!udid) {
        return res.status(400).json({
          success: false,
          message: 'UDID不能为空'
        });
      }
      
      const bindingInfo = await cardService.checkUdidBindings(udid);
      res.json({
        success: true,
        data: {
          bound: bindingInfo.length > 0,
          bindings: bindingInfo
        }
      });
    } catch (error) {
      console.error('检查UDID状态错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }
}

module.exports = new ClientController(); 