const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

// 用户登录
router.post('/login', userController.login);

// 验证 token
router.post('/verify', userController.verifyToken);

module.exports = router; 