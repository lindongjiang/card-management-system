const express = require('express');
const encryptionService = require('../services/encryptionService');
const router = express.Router();

// 处理加密的plist链接
router.get('/:iv/:encryptedData', async (req, res) => {
  try {
    const { iv, encryptedData } = req.params;
    const { udid, security_token } = req.query;
    const clientIP = req.ip || req.connection.remoteAddress || '未知IP';
    
    // 记录详细的请求信息用于调试
    console.log(`处理plist请求 - IV: ${iv.substring(0, 8)}..., UDID: ${udid ? udid.substring(0, 8) + '...' : '未提供'}, 安全令牌: ${security_token ? security_token.substring(0, 8) + '...' : '未提供'}`);
    
    // 检查是否提供了UDID和安全令牌
    if (!udid || !security_token) {
      console.error(`plist请求缺少必要参数 - UDID: ${udid ? '已提供' : '未提供'}, 安全令牌: ${security_token ? '已提供' : '未提供'}`);
      
      // 如果没有提供安全令牌，返回验证页面
      // 生成安全令牌供HTML页面使用
      const tempSecurityToken = encryptionService.generateTempSecurityToken(iv, encryptedData, clientIP);
      
      // 生成带有安全令牌的URL
      const secureRedirectUrl = `/api/plist/${iv}/${encryptedData}?security_token=${tempSecurityToken.token}${udid ? `&udid=${udid}` : ''}`;
      
      console.log(`plist链接需要HTML页面验证 - 生成临时令牌: ${tempSecurityToken.token.substring(0, 15)}...`);
      
      // 返回验证页面
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
    
    // 验证安全令牌和解密plist链接
    let verifyResult;
    
    // 优先检查安全令牌是否是从HTML页面生成的临时令牌
    if (encryptionService.verifyTempSecurityToken && encryptionService.verifyTempSecurityToken(security_token, iv, encryptedData, clientIP)) {
      console.log(`临时安全令牌验证成功 - IV: ${iv.substring(0, 8)}..., UDID: ${udid.substring(0, 8)}...`);
      // 解密plist链接
      verifyResult = encryptionService.decryptAndVerifyPlistUrl(iv, encryptedData, udid, clientIP, null, true);
    } else {
      // 正常验证流程 - 使用HTML页面传递的安全令牌
      verifyResult = encryptionService.decryptAndVerifyPlistUrl(iv, encryptedData, udid, clientIP, security_token);
    }
    
    // 验证结果处理
    if (!verifyResult.valid) {
      console.error(`plist链接验证失败: ${verifyResult.reason}`);
      return res.status(403).send(`
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>验证失败</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #f9f9f9; text-align: center; }
            .container { width: 90%; max-width: 600px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #e74c3c; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
            .error-details { margin: 20px 0; padding: 15px; background-color: #fdf0ed; border-radius: 10px; }
            .back-button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>安装链接验证失败</h1>
            
            <div class="error-details">
              <p>${verifyResult.reason || '链接验证失败，请从应用内重新获取安装链接'}</p>
              <p>此链接可能已过期或只能在特定设备上使用</p>
            </div>
            
            <a href="javascript:window.close();" class="back-button">关闭</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // 处理需要HTML页面进行二次验证的情况
    if (verifyResult.requiresHtmlAuth) {
      console.log(`plist链接需要二次验证 - 安全令牌: ${verifyResult.securityToken ? verifyResult.securityToken.substring(0, 15) + '...' : '未提供'}`);
      
      // 生成带有安全令牌的重定向URL
      const secureRedirectUrl = `/api/plist/${iv}/${encryptedData}?security_token=${verifyResult.securityToken}${udid ? `&udid=${udid}` : ''}`;
      
      return res.redirect(secureRedirectUrl);
    }
    
    // 成功验证，重定向到实际的plist文件
    console.log(`plist链接验证成功，重定向到: ${verifyResult.plistUrl.substring(0, 30)}...`);
    res.redirect(verifyResult.plistUrl);
  } catch (error) {
    console.error('处理plist链接错误:', error);
    res.status(500).send(`
      <html><body>
        <h2>服务器错误</h2>
        <p>处理安装请求时发生错误，请稍后重试或从AppFlex应用内重新获取安装链接。</p>
        <a href="javascript:window.close()">关闭</a>
      </body></html>
    `);
  }
});

module.exports = router; 