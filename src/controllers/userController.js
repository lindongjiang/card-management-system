const userService = require('../services/userService');

class UserController {
  // 用户登录
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }
      
      const result = await userService.login(username, password);
      res.json(result);
    } catch (error) {
      console.error('用户登录错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 验证 token
  async verifyToken(req, res) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token 不能为空'
        });
      }
      
      const result = userService.verifyToken(token);
      res.json(result);
    } catch (error) {
      console.error('Token 验证错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 创建用户
  async createUser(req, res) {
    try {
      const { username, password, role } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }
      
      const result = await userService.createUser(username, password, role);
      res.json(result);
    } catch (error) {
      console.error('创建用户错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 获取用户列表
  async getUsers(req, res) {
    try {
      const result = await userService.getUsers();
      res.json(result);
    } catch (error) {
      console.error('获取用户列表错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }

  // 删除用户
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: '缺少用户ID'
        });
      }
      
      const result = await userService.deleteUser(id);
      res.json(result);
    } catch (error) {
      console.error('删除用户错误:', error);
      res.status(500).json({
        success: false,
        message: `服务器错误: ${error.message}`
      });
    }
  }
}

module.exports = new UserController(); 