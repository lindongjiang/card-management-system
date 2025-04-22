const express = require('express');
const clientController = require('../controllers/clientController');
const settingsController = require('../controllers/settingsController');

const router = express.Router();

// 简单的ping接口用于检查API状态
router.get('/ping', clientController.ping);

// 获取应用列表（不含plist和pkg字段）
router.get('/apps', clientController.getAppList);

// 获取应用详情（需要UDID验证权限）
router.get('/apps/:id', clientController.getAppDetail);

// 验证卡密并绑定UDID
router.post('/verify', clientController.verifyAndBind);

// 检查UDID状态
router.get('/check-udid', clientController.checkUdidStatus);

// 检查变身状态
router.get('/disguise-check', settingsController.checkDisguiseStatus);

module.exports = router; 