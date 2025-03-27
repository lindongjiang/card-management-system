const userModel = require('../models/userModel');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key'; // 使用与authMiddleware相同的密钥

class UserService {
  // 用户登录
  async login(username, password) {
    try {
      const result = await userModel.login(username, password);
      
      if (result.success) {
        // 生成JWT token
        const token = jwt.sign(
          { 
            userId: result.user.id,
            username: result.user.username,
            role: result.user.role
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        return {
          success: true,
          token,
          user: result.user
        };
      }
      
      return result;
    } catch (error) {
      console.error('用户登录服务错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 验证token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        success: true,
        user: decoded
      };
    } catch (error) {
      return {
        success: false,
        message: '无效的token'
      };
    }
  }

  // 创建用户
  async createUser(username, password, role = 'user') {
    try {
      const result = await userModel.createUser(username, password, role);
      return result;
    } catch (error) {
      console.error('创建用户服务错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 获取用户列表
  async getUsers() {
    try {
      const users = await userModel.getUsers();
      return {
        success: true,
        data: users
      };
    } catch (error) {
      console.error('获取用户列表服务错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 删除用户
  async deleteUser(userId) {
    try {
      const result = await userModel.deleteUser(userId);
      return result;
    } catch (error) {
      console.error('删除用户服务错误:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

module.exports = new UserService(); 