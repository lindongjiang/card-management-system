const express = require('express');
const userController = require('../controllers/userController');
const userService = require('../services/userService');

const router = express.Router();

// 验证token中间件
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '未提供认证token'
    });
  }
  
  const result = userService.verifyToken(token);
  if (!result.success) {
    return res.status(401).json(result);
  }
  
  req.user = result.user;
  next();
};

// 验证管理员权限中间件
const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
};

// 用户登录
router.post('/login', userController.login);

// 创建用户 (需要管理员权限)
router.post('/', verifyToken, verifyAdmin, userController.createUser);

// 获取用户列表 (需要管理员权限)
router.get('/', verifyToken, verifyAdmin, userController.getUsers);

// 删除用户 (需要管理员权限)
router.delete('/:id', verifyToken, verifyAdmin, userController.deleteUser);

module.exports = router; 