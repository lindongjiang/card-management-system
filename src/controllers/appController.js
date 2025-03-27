const appService = require('../services/appService');

class AppController {
  // 获取所有应用
  async getAllApps(req, res) {
    try {
      const apps = await appService.getAppList();
      res.json(apps);
    } catch (error) {
      console.error('获取所有应用错误:', error);
      res.status(500).json({ 
        success: false, 
        message: `服务器错误: ${error.message}` 
      });
    }
  }

  // 同步应用数据
  async syncApps(req, res) {
    try {
      const result = await appService.syncApps();
      res.json(result);
    } catch (error) {
      console.error('同步应用数据错误:', error);
      res.status(500).json({ 
        success: false, 
        message: `服务器错误: ${error.message}` 
      });
    }
  }

  // 获取应用列表
  async getAppList(req, res) {
    try {
      const apps = await appService.getAppList();
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

  // 获取应用详情
  async getAppDetail(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: '缺少应用ID' 
        });
      }
      
      const app = await appService.getAppDetail(id);
      
      if (!app) {
        return res.status(404).json({ 
          success: false, 
          message: '应用不存在' 
        });
      }
      
      res.json({ 
        success: true, 
        data: app 
      });
    } catch (error) {
      console.error('获取应用详情错误:', error);
      res.status(500).json({ 
        success: false, 
        message: `服务器错误: ${error.message}` 
      });
    }
  }

  // 更新应用卡密需求
  async updateKeyRequirement(req, res) {
    try {
      const { id } = req.params;
      const { requiresKey } = req.body;
      
      console.log('收到更新应用卡密需求请求:', { id, requiresKey });
      
      if (!id) {
        console.log('缺少应用ID，返回400');
        return res.status(400).json({ 
          success: false, 
          message: '缺少应用ID' 
        });
      }
      
      if (requiresKey === undefined) {
        console.log('缺少requiresKey参数，返回400');
        return res.status(400).json({ 
          success: false, 
          message: '缺少requiresKey参数' 
        });
      }

      console.log('调用服务更新卡密需求:', { id, requiresKey });
      const result = await appService.updateAppKeyRequirement(id, requiresKey);
      console.log('更新结果:', result);
      res.json(result);
    } catch (error) {
      console.error('更新应用卡密需求错误:', error);
      res.status(500).json({ 
        success: false, 
        message: `服务器错误: ${error.message}` 
      });
    }
  }

  // 更新应用信息
  async updateApp(req, res) {
    try {
      const { id } = req.params;
      const { name, version, requires_key } = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: '缺少应用ID' 
        });
      }
      
      if (!name) {
        return res.status(400).json({ 
          success: false, 
          message: '应用名称不能为空' 
        });
      }
      
      const appData = {
        name,
        version: version || '',
        requires_key: requires_key !== undefined ? requires_key : true
      };
      
      const result = await appService.updateApp(id, appData);
      res.json(result);
    } catch (error) {
      console.error('更新应用信息错误:', error);
      res.status(500).json({ 
        success: false, 
        message: `服务器错误: ${error.message}` 
      });
    }
  }

  // 删除应用
  async deleteApp(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ 
          success: false, 
          message: '缺少应用ID' 
        });
      }
      
      const result = await appService.deleteApp(id);
      res.json(result);
    } catch (error) {
      console.error('删除应用错误:', error);
      res.status(500).json({ 
        success: false, 
        message: `服务器错误: ${error.message}` 
      });
    }
  }
}

module.exports = new AppController(); 