const cardService = require('../services/cardService');

class CardController {
  // 获取所有卡密
  async getAllCards(req, res) {
    try {
      const result = await cardService.getCardList();
      res.json(result);
    } catch (error) {
      console.error('获取卡密列表错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 获取卡密列表
  async getCardList(req, res) {
    try {
      const result = await cardService.getCardList();
      res.json(result);
    } catch (error) {
      console.error('获取卡密列表错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 生成卡密
  async generateCards(req, res) {
    try {
      const { count } = req.body;
      
      if (!count || count <= 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的卡密数量'
        });
      }
      
      const result = await cardService.generateCards(count);
      
      if (result.success) {
        res.json({
          success: true,
          message: `成功生成 ${result.count} 张卡密`,
          data: result.data.map(card => card.cardKey)
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('生成卡密错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 导入卡密
  async importCards(req, res) {
    try {
      const { cards } = req.body;
      
      if (!cards || !Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供有效的卡密列表'
        });
      }
      
      const result = await cardService.importCards(cards);
      res.json(result);
    } catch (error) {
      console.error('导入卡密错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 验证卡密并返回plist
  async verifyCard(req, res) {
    try {
      const { cardCode, udid, appId } = req.body;
      
      if (!cardCode) {
        return res.status(400).json({
          success: false,
          message: '请提供卡密'
        });
      }
      
      if (!udid) {
        return res.status(400).json({
          success: false,
          message: '请提供设备ID'
        });
      }
      
      if (!appId) {
        return res.status(400).json({
          success: false,
          message: '请提供应用ID'
        });
      }
      
      const result = await cardService.verifyCardAndGetPlist(cardCode, udid, appId);
      res.json(result);
    } catch (error) {
      console.error('验证卡密错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 获取卡密统计
  async getCardStats(req, res) {
    try {
      const result = await cardService.getCardStats();
      res.json(result);
    } catch (error) {
      console.error('获取卡密统计错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 删除卡密
  async deleteCard(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: '缺少卡密ID'
        });
      }
      
      const result = await cardService.deleteCard(id);
      res.json(result);
    } catch (error) {
      console.error('删除卡密错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 更新卡密
  async updateCard(req, res) {
    try {
      const { id } = req.params;
      const cardData = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: '缺少卡密ID'
        });
      }
      
      const result = await cardService.updateCard(id, cardData);
      res.json(result);
    } catch (error) {
      console.error('更新卡密错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 获取所有UDID绑定
  async getAllBindings(req, res) {
    try {
      const bindings = await cardService.getAllBindings();
      res.json({
        success: true,
        data: bindings
      });
    } catch (error) {
      console.error('获取绑定列表错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 手动添加UDID绑定
  async addBinding(req, res) {
    try {
      const { udid, cardKey } = req.body;
      
      if (!udid || !cardKey) {
        return res.status(400).json({
          success: false,
          message: 'UDID和卡密都不能为空'
        });
      }
      
      const result = await cardService.addBinding(udid, cardKey);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('添加绑定错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 删除UDID绑定
  async deleteBinding(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: '需要提供绑定ID'
        });
      }
      
      const result = await cardService.deleteBinding(id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('删除绑定错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }
}

module.exports = new CardController(); 