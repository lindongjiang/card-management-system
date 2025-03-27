const express = require('express');
const cardController = require('../controllers/cardController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 获取所有卡密
router.get('/', cardController.getAllCards);

// 生成卡密
router.post('/generate', cardController.generateCards);

// 导入卡密
router.post('/import', cardController.importCards);

// 验证卡密
router.post('/verify', cardController.verifyCard);

// 获取卡密列表
router.get('/list', cardController.getCardList);

// 获取卡密统计
router.get('/stats', cardController.getCardStats);

// 更新卡密
router.put('/:id', cardController.updateCard);

// 删除卡密
router.delete('/:id', cardController.deleteCard);

// UDID绑定相关API
// 获取所有UDID绑定
router.get('/bindings', authMiddleware.verifyToken, cardController.getAllBindings);

// 手动添加UDID绑定
router.post('/bindings', authMiddleware.verifyToken, cardController.addBinding);

// 删除UDID绑定
router.delete('/bindings/:id', authMiddleware.verifyToken, cardController.deleteBinding);

module.exports = router; 