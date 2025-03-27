const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  // 用户登录
  async login(username, password) {
    try {
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      
      if (users.length === 0) {
        return { success: false, message: '用户名或密码错误' };
      }
      
      const user = users[0];
      const isValid = await bcrypt.compare(password, user.password);
      
      if (!isValid) {
        return { success: false, message: '用户名或密码错误' };
      }
      
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      console.error('用户登录错误:', error);
      throw error;
    }
  }

  // 创建用户
  async createUser(username, password, role = 'user') {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.execute(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role]
      );
      
      return {
        success: true,
        userId: result.insertId
      };
    } catch (error) {
      console.error('创建用户错误:', error);
      throw error;
    }
  }

  // 获取用户列表
  async getUsers() {
    try {
      const [rows] = await pool.execute(
        'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
      );
      return rows;
    } catch (error) {
      console.error('获取用户列表错误:', error);
      throw error;
    }
  }

  // 删除用户
  async deleteUser(userId) {
    try {
      await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
      return { success: true };
    } catch (error) {
      console.error('删除用户错误:', error);
      throw error;
    }
  }
}

module.exports = new UserModel(); 