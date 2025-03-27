const express = require('express');
const appController = require('../controllers/appController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 添加调试信息
router.use((req, res, next) => {
  console.log(`[应用路由] 请求: ${req.method} ${req.url}`);
  console.log('[应用路由] 请求头:', req.headers);
  next();
});

// 获取所有应用
router.get('/', appController.getAllApps);

// 同步应用数据
router.post('/sync', appController.syncApps);

// 获取应用列表
router.get('/list', appController.getAppList);

// 获取应用详情
router.get('/:id', appController.getAppDetail);

// 更新应用信息
router.put('/:id', appController.updateApp);

// 更新应用卡密需求 - 修复顺序问题并确保控制器存在
router.put('/:id/key-requirement', authMiddleware.verifyToken, appController.updateKeyRequirement);

// 删除应用
router.delete('/:id', appController.deleteApp);

module.exports = router; 