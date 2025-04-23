const express = require('express');
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 以下路由需要管理员权限
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// 获取所有设置
router.get('/', settingsController.getAllSettings);

// 更新单个设置
router.put('/', settingsController.updateSetting);

// 批量更新设置
router.put('/batch', settingsController.batchUpdateSettings);

// 获取变身设置
router.get('/disguise', settingsController.getDisguiseSettings);

// 更新变身设置
router.put('/disguise', settingsController.updateDisguiseSettings);

// 获取版本历史
router.get('/version-history', settingsController.getVersionHistory);

// 检查版本状态（不需要管理员权限）
router.get('/disguise-check', settingsController.checkDisguiseStatus);

module.exports = router; 