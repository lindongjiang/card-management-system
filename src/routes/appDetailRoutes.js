const express = require('express');
const path = require('path');
const crypto = require('crypto');
const encryptionService = require('../services/encryptionService');
const appService = require('../services/appService');
const clientService = require('../services/clientService');
const cardModel = require('../models/cardModel');
const fs = require('fs');

const router = express.Router();

// 生成应用安装HTML页面 - 更具体的路由放在前面
router.get('/install-page/:appId', async (req, res) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || '未知IP';
    const debugMode = req.query.debug === 'true'; // 添加调试模式参数
    
    console.log(`[${new Date().toISOString()}] 请求安装页面 - AppID: ${req.params.appId}, UDID: ${req.query.udid || '未提供'}, IP: ${clientIP}, Debug: ${debugMode}`);
    
    const { appId } = req.params;
    const { udid, token, device_info } = req.query;
    
    if (!appId || !udid) {
      console.error(`安装页面错误: 缺少必要参数 - AppID: ${appId || '未提供'}, UDID: ${udid || '未提供'}`);
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 强制要求token验证
    if (!token) {
      console.error(`安装页面错误: 缺少安全令牌 - AppID: ${appId}, UDID: ${udid}, IP: ${clientIP}`);
      return res.status(403).send(`
        <html><body>
          <h2>安全错误</h2>
          <p>此链接无效或缺少必要参数，请从AppFlex应用内重新获取安装链接。</p>
          <a href="javascript:window.close()">关闭</a>
        </body></html>
      `);
    }
    
    // 验证token - 先尝试增强型token
    let verifyResult;
    
    // 检查是否是增强型token
    if (token.split('_').length >= 5) {
      verifyResult = encryptionService.verifyEnhancedToken(token, appId, udid, clientIP);
      
      console.log(`增强型Token验证结果 - AppID: ${appId}, UDID: ${udid.substring(0, 8)}..., 结果: ${verifyResult.valid ? '成功' : '失败'}, 原因: ${verifyResult.reason || 'N/A'}`);
      
      // 如果验证失败但不是因为格式问题，直接返回错误
      if (!verifyResult.valid && verifyResult.reason !== '无效的token格式') {
        console.error(`安装页面错误: 增强型Token验证失败 - AppID: ${appId}, UDID: ${udid}, IP: ${clientIP}, 原因: ${verifyResult.reason}`);
        
        // 如果是使用次数超限问题，提供更明确的错误信息
        let errorMessage = verifyResult.reason;
        let errorTitle = '链接已失效';
        
        if (verifyResult.reason.includes('最大使用次数')) {
          errorTitle = '使用次数超限';
        } else if (verifyResult.reason.includes('已过期')) {
          errorTitle = '链接已过期';
        } else if (verifyResult.reason.includes('网络环境')) {
          errorTitle = '网络环境变更';
        }
        
        return res.status(403).send(`
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${errorTitle}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #f9f9f9; text-align: center; }
              .container { width: 90%; max-width: 600px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              h2 { color: #e74c3c; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; }
              .error-details { margin: 20px 0; padding: 15px; background-color: #fdf0ed; border-radius: 8px; text-align: left; }
              .back-button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>${errorTitle}</h2>
              <p>此安装链接无法使用，可能是由于以下原因：</p>
              
              <div class="error-details">
                <p>${errorMessage}</p>
                <p>设备ID: ${udid.substring(0, 8)}***</p>
                <p>当前IP: ${clientIP.substring(0, 10)}***</p>
                <p>请求时间: ${new Date().toLocaleString()}</p>
              </div>
              
              <p>请返回AppFlex应用，重新获取安装链接。</p>
              <a href="javascript:window.close();" class="back-button">关闭</a>
            </div>
          </body>
          </html>
        `);
      }
    }
    
    // 如果增强型token验证失败或不是增强型token，尝试验证标准token（向后兼容）
    if (!verifyResult || !verifyResult.valid) {
      // 添加更详细的日志
      console.log(`尝试验证标准Token - AppID: ${appId}, Token: ${token.substring(0, 15)}..., Token长度: ${token.length}`);
      
      verifyResult = encryptionService.verifySecurityToken(token, appId, udid);
      console.log(`标准Token验证结果 - AppID: ${appId}, UDID: ${udid.substring(0, 8)}..., 结果: ${verifyResult.valid ? '成功' : '失败'}, 原因: ${verifyResult.reason || 'N/A'}`);
      
      if (!verifyResult.valid) {
        // 添加更多诊断信息到日志
        console.error(`安装页面错误: 标准Token验证失败 - AppID: ${appId}, UDID: ${udid}, 原因: ${verifyResult.reason}, Token类型: 标准, Token首部: ${token.substring(0, 20)}...`);
        
        // 如果是调试模式，返回更详细的信息
        if (debugMode) {
          return res.status(403).send(`
            <html><body>
              <h2>链接已失效（调试模式）</h2>
              <p>安装链接已过期或无效。</p>
              <p>原因: ${verifyResult.reason}</p>
              <p>AppID: ${appId}</p>
              <p>UDID: ${udid.substring(0, 8)}***</p>
              <p>Token类型: 标准</p>
              <p>Token首部: ${token.substring(0, 20)}...</p>
              <p>请从AppFlex应用内重新获取安装链接。</p>
              <a href="javascript:window.close()">关闭</a>
            </body></html>
          `);
        }
        
        return res.status(403).send(`
          <html><body>
            <h2>链接已失效</h2>
            <p>安装链接已过期或无效。</p>
            <p>请从AppFlex应用内重新获取安装链接。</p>
            <a href="javascript:window.close()">关闭</a>
          </body></html>
        `);
      }
    }
    
    const tokenType = verifyResult.deviceInfo ? '增强型' : '标准';
    console.log(`Token验证成功(${tokenType}) - AppID: ${appId}, UDID: ${udid}, IP: ${clientIP}`);
    
    // 获取应用详情
    let app;
    try {
      // 查询应用详情
      console.log(`尝试获取应用详情 - AppID: ${appId}`);
      app = await appService.getAppDetail(appId);
      
      if (!app) {
        console.error(`安装页面错误: 应用不存在, AppID: ${appId}`);
        return res.status(404).send(`
          <html><body>
            <h2>应用不存在</h2>
            <p>无法找到指定的应用，请确认应用ID是否正确。</p>
            <p>应用ID: ${appId}</p>
            <a href="javascript:window.close()">关闭</a>
          </body></html>
        `);
      }
      
      console.log(`成功获取应用详情 - 应用名称: ${app.name}, 版本: ${app.version}`);
    } catch (error) {
      console.error(`获取应用详情失败 - AppID: ${appId}, 错误:`, error);
      return res.status(500).send(`
        <html><body>
          <h2>服务器错误</h2>
          <p>获取应用详情时发生错误: ${error.message}</p>
          <p>应用ID: ${appId}</p>
          <a href="javascript:window.close()">关闭</a>
        </body></html>
      `);
    }
    
    // 检查应用是否需要卡密
    if (app.requires_key === 1 || app.requires_key === true) {
      // 验证UDID是否已绑定
      console.log(`应用需要卡密验证 - AppID: ${appId}, 验证UDID: ${udid}`);
      let isBindingExist = false;
      
      try {
        isBindingExist = await clientService.checkBinding(udid);
        console.log(`UDID绑定状态 - AppID: ${appId}, UDID: ${udid}, 是否已绑定: ${isBindingExist}`);
      } catch (error) {
        console.error(`验证UDID绑定失败 - AppID: ${appId}, UDID: ${udid}, 错误:`, error);
        isBindingExist = false;
      }
      
      if (!isBindingExist) {
        // UDID未绑定，显示错误页面
        console.log(`UDID未绑定，显示未授权页面 - AppID: ${appId}, UDID: ${udid}`);
        return res.send(`
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>需要验证 - ${app.name || '应用'}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #f9f9f9; text-align: center; }
              .container { width: 90%; max-width: 600px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              h1 { color: #333; margin-bottom: 20px; }
              .app-icon { width: 90px; height: 90px; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
              .error-message { color: #e74c3c; margin: 20px 0; padding: 15px; background-color: #fdf0ed; border-radius: 10px; }
              .back-button { display: inline-block; background-color: #3498db; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 15px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${app.icon || ''}" alt="${app.name || '应用'}" class="app-icon">
              <h1>${app.name || '应用'}</h1>
              <p>版本: ${app.version || '未知'}</p>
              
              <div class="error-message">
                <p>此设备(UDID: ${udid.substring(0, 8)}***)未经授权安装此应用。</p>
                <p>请先在App中验证卡密后再尝试安装。</p>
              </div>
              
              <a href="javascript:window.close();" class="back-button">关闭</a>
            </div>
          </body>
          </html>
        `);
      }
    } else {
      console.log(`应用无需卡密验证 - AppID: ${appId}`);
    }
    
    // 获取或生成安装用plist链接
    let plistUrl = app.plist;
    console.log(`获取plist链接 - AppID: ${appId}, 原始plist: ${plistUrl || '未定义'}`);
    
    if (!plistUrl) {
      console.error(`安装信息不存在 - AppID: ${appId}`);
      return res.status(400).send(`
        <html><body>
          <h2>安装信息不存在</h2>
          <p>无法获取${app.name || '应用'}的安装信息。</p>
          <a href="javascript:window.close()">关闭</a>
        </body></html>
      `);
    }
    
    // 如果有原始链接，确保进行加密处理
    try {
      if (!plistUrl.includes('/api/plist/')) {
        console.log(`处理原始plist链接 - AppID: ${appId}, 原始链接: ${plistUrl}`);
        // 将UDID和IP绑定到plist链接
        plistUrl = encryptionService.generateEncryptedPlistUrl(plistUrl, udid, clientIP);
        console.log(`处理后的plist链接 - AppID: ${appId}, 处理后链接: ${plistUrl}`);
      }
    } catch (error) {
      console.error(`plist链接加密处理失败 - AppID: ${appId}, 错误:`, error);
      // 如果加密失败，继续使用原始链接
    }
    
    // 构建完整URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fullPlistUrl = plistUrl.startsWith('http') ? plistUrl : `${baseUrl}${plistUrl}`;
    const installUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(fullPlistUrl)}`;
    
    console.log(`生成安装链接 - AppID: ${appId}, plist URL: ${fullPlistUrl}`);
    console.log(`生成安装链接 - AppID: ${appId}, 安装URL: ${installUrl}`);
    
    // 生成HTML安装页面时，添加诊断信息（总是在非生产环境下显示或调试模式下）
    let diagnosticInfo = '';
    if (debugMode || process.env.NODE_ENV !== 'production') {
      diagnosticInfo = `
        <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px; font-size: 12px; color: #999;">
          <p>诊断信息 (调试模式可见):</p>
          <p>Token类型: ${tokenType}</p>
          <p>IP: ${clientIP}</p>
          <p>生成时间: ${new Date().toISOString()}</p>
          <p>请求路径: ${req.originalUrl}</p>
          <p>Token首部: ${token.substring(0, 20)}...</p>
          <p>Server Time: ${new Date().toISOString()}</p>
        </div>
      `;
    }
    
    // 在HTML安装页面末尾添加诊断信息
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${app.name || '应用'} - 安装</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #f9f9f9; text-align: center; }
          .container { width: 90%; max-width: 600px; background: white; padding: 25px; border-radius: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          h1 { color: #333; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
          .app-icon { width: 90px; height: 90px; border-radius: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); background-color: #f5f5f5; object-fit: cover; }
          .version { font-size: 16px; color: #888; margin-bottom: 20px; }
          .install-button { display: inline-block; background-color: #4cd964; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .instructions { margin-top: 30px; background-color: #f5f7fa; padding: 15px; border-radius: 8px; text-align: left; }
          .footer { margin-top: 40px; font-size: 14px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="${app.icon || ''}" alt="${app.name || '应用'}" class="app-icon" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'90\\' height=\\'90\\' viewBox=\\'0 0 90 90\\'%3E%3Crect width=\\'90\\' height=\\'90\\' rx=\\'20\\' fill=\\'%23f0f0f0\\' /%3E%3Ctext x=\\'45\\' y=\\'45\\' font-family=\\'Arial\\' font-size=\\'30\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\' fill=\\'%23999\\' %3EA%3C/text%3E%3C/svg%3E'">
          <h1>${app.name || '应用'}</h1>
          <div class="version">版本 ${app.version || '未知'}</div>
          
          <p>您的设备已获授权安装此应用</p>
          
          <a href="${installUrl}" class="install-button">点击安装</a>
          
          <div class="instructions">
            <h3>安装说明:</h3>
            <p>1. 点击上方「点击安装」按钮</p>
            <p>2. 在弹出的对话框中选择「安装」</p>
            <p>3. 返回主屏幕，等待应用安装完成</p>
            <p>4. 如遇到「未受信任的企业级开发者」提示，请前往设置->通用->描述文件与设备管理，信任相应的证书</p>
          </div>
          
          <div class="footer">
            <p>UDID: ${udid.substring(0, 8)}***</p>
            <p>应用ID: ${appId}</p>
            <p>© ${new Date().getFullYear()} AppFlex 安装服务</p>
            ${diagnosticInfo}
          </div>
        </div>
        
        <script>
          // 统计安装点击
          document.querySelector('.install-button').addEventListener('click', function() {
            try {
              const xhttp = new XMLHttpRequest();
              xhttp.open("GET", "${baseUrl}/api/app-details/install-stat/${appId}?udid=${udid}", true);
              xhttp.send();
            } catch (e) {
              console.error('统计请求失败:', e);
            }
          });
        </script>
      </body>
      </html>
    `;
    
    console.log(`安装页面生成成功 - AppID: ${appId}, UDID: ${udid}`);
    res.send(htmlResponse);
    
  } catch (error) {
    console.error('生成安装页面失败:', error);
    res.status(500).send(`
      <html><body>
        <h2>服务器错误</h2>
        <p>生成安装页面时发生错误: ${error.message}</p>
        <a href="javascript:window.close()">关闭</a>
      </body></html>
    `);
  }
});

// 记录安装统计
router.get('/install-stat/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { udid } = req.query;
    
    console.log(`应用安装统计: AppID=${appId}, UDID=${udid || '未知'}`);
    
    // 可以在这里实现安装统计逻辑
    // ...
    
    res.status(200).send('ok');
  } catch (error) {
    console.error('记录安装统计失败:', error);
    res.status(500).send('error');
  }
});

// 获取应用详情 (无需身份验证) - 一般路由放在后面
router.get('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { udid } = req.query;
    
    // 验证参数
    if (!appId) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 获取应用详情(可能根据UDID提供不同级别的信息)
    if (udid) {
      // 使用clientService获取带权限控制的应用详情
      const appDetailResult = await clientService.getAppDetail(appId, udid);
      return res.json({
        success: true,
        data: appDetailResult
      });
    } else {
      // 获取基本应用详情(无敏感信息)
      const appDetail = await appService.getAppDetail(appId);
      if (!appDetail) {
        return res.status(404).json({
          success: false,
          message: '应用不存在'
        });
      }
      
      // 返回非敏感字段
      const { plist, pkg, ...publicData } = appDetail;
      return res.json({
        success: true,
        data: {
          ...publicData,
          requiresUnlock: publicData.requires_key === 1,
          isUnlocked: false
        }
      });
    }
  } catch (error) {
    console.error('获取应用详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 刷新应用详情 (根据UDID和卡密状态)
router.post('/refresh/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { udid } = req.body;
    
    if (!appId || !udid) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 检查应用是否存在
    const app = await appService.getAppDetail(appId);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: '应用不存在'
      });
    }
    
    // 获取最新的应用详情(包含权限控制)
    const appDetailResult = await clientService.getAppDetail(appId, udid);
    
    return res.json({
      success: true,
      data: appDetailResult
    });
  } catch (error) {
    console.error('刷新应用详情失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 验证卡密并绑定UDID
router.post('/verify', async (req, res) => {
  try {
    const { appId, cardKey, udid } = req.body;
    
    if (!appId || !cardKey || !udid) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 检查应用是否存在
    const app = await appService.getAppDetail(appId);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: '应用不存在'
      });
    }
    
    // 验证卡密和处理UDID绑定
    const verifyResult = await cardModel.verifyCardAndBindUDID(cardKey, udid, appId);
    
    if (verifyResult.success) {
      // 获取更新后的应用详情
      const appDetailResult = await clientService.getAppDetail(appId, udid);
      
      return res.json({
        success: true,
        message: '验证成功，卡密已绑定',
        data: appDetailResult
      });
    } else {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || '卡密验证失败'
      });
    }
  } catch (error) {
    console.error('验证卡密失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 检查UDID绑定状态
router.get('/check-udid/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    const { udid } = req.query;
    
    if (!appId || !udid) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }
    
    // 检查应用是否存在
    const app = await appService.getAppDetail(appId);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: '应用不存在'
      });
    }
    
    // 检查UDID绑定状态
    const isBindingExist = await clientService.checkBinding(udid);
    
    return res.json({
      success: true,
      data: {
        appId,
        udid,
        bound: isBindingExist
      }
    });
  } catch (error) {
    console.error('检查UDID绑定状态失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;