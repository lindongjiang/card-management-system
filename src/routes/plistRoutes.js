const express = require('express');
const encryptionService = require('../services/encryptionService');
const router = express.Router();

// 处理加密的plist链接
router.get('/:iv/:encryptedData', async (req, res) => {
  try {
    const { iv, encryptedData } = req.params;
    const { udid, security_token } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress || '未知IP';
    
    // 使用新的验证方法
    const verifyResult = encryptionService.decryptAndVerifyPlistUrl(
      iv, 
      encryptedData, 
      udid,
      clientIP,
      security_token
    );
    
    if (!verifyResult.valid) {
      console.error(`plist链接验证失败: ${verifyResult.reason}`);
      return res.status(403).json({
        success: false,
        message: verifyResult.reason || '链接验证失败'
      });
    }
    
    // 处理需要HTML页面进行二次验证的情况
    if (verifyResult.requiresHtmlAuth) {
      // 发送中间验证页面，要求通过HTML调用
      console.log(`plist链接需要HTML页面验证 - 生成安全令牌: ${verifyResult.securityToken.substring(0, 15)}...`);
      
      // 生成带有安全令牌的重定向URL
      const secureRedirectUrl = `/api/plist/${iv}/${encryptedData}?security_token=${verifyResult.securityToken}${udid ? `&udid=${udid}` : ''}`;
      
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>应用安装验证</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #f9f9f9; text-align: center; }
            .container { width: 90%; max-width: 600px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .progress { margin: 30px 0; width: 100%; background-color: #f0f0f0; border-radius: 10px; overflow: hidden; }
            .progress-bar { height: 8px; background-color: #4cd964; width: 0%; transition: width 3s ease; }
            .loading-text { margin-bottom: 20px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>安全验证中...</h1>
            <p>正在验证您的安装请求，请稍候...</p>
            
            <div class="progress">
              <div class="progress-bar" id="progressBar"></div>
            </div>
            <p class="loading-text" id="loadingText">验证中 (0%)...</p>
            
            <script>
              // 显示进度条动画
              const progressBar = document.getElementById('progressBar');
              const loadingText = document.getElementById('loadingText');
              
              let progress = 0;
              const interval = setInterval(() => {
                progress += 5;
                if (progress > 100) {
                  clearInterval(interval);
                  // 验证完成后，自动重定向
                  window.location.href = "${secureRedirectUrl}";
                } else {
                  progressBar.style.width = progress + '%';
                  loadingText.textContent = '验证中 (' + progress + '%)...';
                }
              }, 150);
            </script>
          </div>
        </body>
        </html>
      `);
    }
    
    // 成功验证，重定向到实际的plist文件
    console.log(`plist链接验证成功，重定向到: ${verifyResult.plistUrl.substring(0, 30)}...`);
    res.redirect(verifyResult.plistUrl);
  } catch (error) {
    console.error('处理plist链接错误:', error);
    res.status(500).json({
      success: false,
      message: '处理链接失败'
    });
  }
});

module.exports = router; 