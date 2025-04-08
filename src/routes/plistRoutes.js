const express = require('express');
const encryptionService = require('../services/encryptionService');
const router = express.Router();

// 处理加密的plist链接
router.get('/:iv/:encryptedData', async (req, res) => {
  try {
    const { iv, encryptedData } = req.params;
    
    // 解密数据
    const decrypted = encryptionService.decrypt(encryptedData, iv);
    const [plistUrl, timestamp, random] = decrypted.split('|');
    
    // 验证时间戳（防止链接被长期使用）
    const timeDiff = Date.now() - parseInt(timestamp);
    if (timeDiff > 5 * 60 * 1000) { // 5分钟有效期
      return res.status(403).json({
        success: false,
        message: '链接已过期'
      });
    }
    
    // 重定向到实际的plist文件
    res.redirect(plistUrl);
  } catch (error) {
    console.error('处理plist链接错误:', error);
    res.status(500).json({
      success: false,
      message: '处理链接失败'
    });
  }
});

module.exports = router; 