const express = require('express');
const clientController = require('../controllers/clientController');

const router = express.Router();

// 获取应用列表（不含plist和pkg字段）
router.get('/apps', clientController.getApps);

// 获取应用详情（需要UDID验证权限）
router.post('/apps/:id/detail', clientController.getAppDetail);

// 验证卡密并绑定UDID
router.post('/verify', clientController.verifyAndBind);

// 检查UDID状态
router.post('/check', clientController.checkUdidStatus);

module.exports = router; 