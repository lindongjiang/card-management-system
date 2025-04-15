const crypto = require('crypto');
const querystring = require('querystring');
const url = require('url');
const path = require('path');
const fs = require('fs');

// 存储已使用的令牌
const usedTokens = new Map();
const tokenExpiryTime = 15 * 60 * 1000; // 令牌有效期15分钟
// 限制每个设备对每个令牌的最大使用次数
const MAX_TOKEN_USES_PER_DEVICE = 2; // 修改为2次，允许同一设备使用两次令牌

// 存储一次性确认码
const confirmationCodes = new Map();
const confirmationCodeExpiry = 10 * 60 * 1000; // 10分钟过期

// 存储已使用的plist链接
const usedPlistUrls = new Map();
const plistUrlExpiry = 15 * 60 * 1000; // plist链接有效期15分钟

// 存储临时安全令牌
const tempSecurityTokens = new Map();
const tempTokenExpiry = 2 * 60 * 1000; // 临时令牌有效期2分钟

// 存储会话令牌
const sessionTokens = new Map();

// 生成一次性确认码
function generateConfirmationCode() {
  const min = 100000; // 最小6位数
  const max = 999999; // 最大6位数
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

// IP字符串转换为可读格式
function formatIP(ip) {
  if (!ip) return 'unknown';
  return ip.replace(/^.*:/, ''); // 去除IPv6前缀，如果有的话
}

// 与iOS端相同的密钥
const SERVER_SECRET = '6B3F9A1C7D4E2B5A8F1E0D3C6B9A2E5D';
const iv = Buffer.alloc(16, 0); // 固定IV用于加密，生产环境请随机生成
const lenientMode = process.env.LENIENT_MODE === 'true' || false; // 宽松模式配置

// 配置token使用限制
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24小时过期

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    // 将十六进制字符串转换为Buffer
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    // 验证密钥长度
    if (this.key.length !== 32) {
      throw new Error('加密密钥必须是32字节长度');
    }

    this.securityTokens = new Map();
    this.enhancedTokens = new Map();
    this.confirmationCodes = new Map();
    this.tempSecurityTokens = new Map();
    this.plistUrls = new Map();
    this.sessionTokens = new Map();
  }

  // 生成随机IV
  generateIV() {
    return crypto.randomBytes(16);
  }

  // 加密数据
  encrypt(text) {
    const iv = this.generateIV();
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted
    };
  }

  // 解密数据
  decrypt(encryptedData, iv) {
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // 生成增强型安全token（包含IP和设备信息）
  generateEnhancedToken(appId, udid, clientIP, deviceInfo, expiryMinutes = 15) {
    const timestamp = Date.now();
    const expiryTime = timestamp + (expiryMinutes * 60 * 1000);
    const random = crypto.randomBytes(8).toString('hex'); // 添加随机性防止令牌重复
    
    // 使用JWT_SECRET创建签名，包含所有安全参数
    const dataToSign = `${appId}_${udid}_${expiryTime}_${clientIP}_${deviceInfo}_${random}`;
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || this.key.toString('hex'))
      .update(dataToSign)
      .digest('hex');
      
    return {
      token: `${expiryTime}_${signature}_${clientIP}_${deviceInfo}_${random}`,
      expiryTime: expiryTime
    };
  }
  
  // 验证增强型安全token
  verifyEnhancedToken(token, appId, udid, clientIP) {
    try {
      // 解析token各部分
      const parts = token.split('_');
      if (parts.length < 5) {
        return { valid: false, reason: '无效的token格式' };
      }
      
      const expiryTime = parseInt(parts[0]);
      const signature = parts[1];
      const originalIP = parts[2];
      const deviceInfo = parts[3];
      const random = parts[4];
      const now = Date.now();
      
      // 验证是否过期
      if (now > expiryTime) {
        return { valid: false, reason: '链接已过期' };
      }
      
      // 检查令牌使用情况
      if (usedTokens.has(token)) {
        const tokenData = usedTokens.get(token);
        
        // 如果是同一设备，且使用次数未超过限制，允许继续使用
        if (tokenData.udid === udid) {
          if (tokenData.useCount >= MAX_TOKEN_USES_PER_DEVICE) {
            console.log(`令牌使用次数超限 - Token: ${token.substring(0, 15)}..., UDID: ${udid.substring(0, 8)}..., 使用次数: ${tokenData.useCount}`);
            return { 
              valid: false, 
              reason: `安装链接已达到最大使用次数(${MAX_TOKEN_USES_PER_DEVICE}次)，请从AppFlex应用内重新获取安装链接` 
            };
        }
        
          // 更新使用次数
          tokenData.useCount += 1;
          tokenData.lastUsed = now;
          usedTokens.set(token, tokenData);
          
          console.log(`令牌重复使用 - Token: ${token.substring(0, 15)}..., UDID: ${udid.substring(0, 8)}..., 使用次数: ${tokenData.useCount}`);
        } else {
          console.log(`令牌被其他设备使用 - Token: ${token.substring(0, 15)}..., 记录UDID: ${tokenData.udid.substring(0, 8)}..., 当前UDID: ${udid.substring(0, 8)}...`);
          return { 
            valid: false, 
            reason: '此安装链接已绑定到其他设备' 
          };
        }
      }
      
      // 验证IP地址 (放宽要求：仅记录不匹配但不阻止)
      if (originalIP !== clientIP) {
        console.log(`IP不匹配但允许继续 - 原始IP=${originalIP}, 当前IP=${clientIP}, UDID=${udid.substring(0, 8)}...`);
        // 不返回错误，只记录
      }
      
      // 重新生成签名进行验证
      const dataToSign = `${appId}_${udid}_${expiryTime}_${originalIP}_${deviceInfo}_${random}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || this.key.toString('hex'))
        .update(dataToSign)
        .digest('hex');
        
      if (signature !== expectedSignature) {
        return { valid: false, reason: '无效的签名' };
      }
      
      // 首次使用令牌，记录信息
      if (!usedTokens.has(token)) {
        usedTokens.set(token, {
          timestamp: now,
          udid: udid,
          useCount: 1,
          lastUsed: now,
          originalIP: originalIP
        });
      }
      
      return { 
        valid: true,
        expiryTime: expiryTime,
        deviceInfo: deviceInfo,
        originalIP: originalIP
      };
    } catch (error) {
      console.error('[加密服务] 验证token失败:', error);
      return { valid: false, reason: '验证token时发生错误' };
    }
  }

  // 生成安全token，包含过期时间和签名（保留原方法以兼容旧版本）
  generateSecurityToken(appId, udid, expiryMinutes = 15) {
    const timestamp = Date.now();
    const expiryTime = timestamp + (expiryMinutes * 60 * 1000);
    
    // 使用新的密钥和方法创建签名
    const dataToSign = `${appId}_${udid}_${expiryTime}`;
    const signature = crypto
      .createHmac('sha256', SERVER_SECRET)
      .update(dataToSign)
      .digest('hex');
      
    return {
      token: `${expiryTime}_${signature}`,
      expiryTime: expiryTime
    };
  }
  
  // 创建设备转移确认码 - 用于允许用户在其他设备上使用安装链接
  createDeviceTransferCode(token, originalUdid) {
    // 生成6位确认码
    const code = generateConfirmationCode();
    const now = Date.now();
    
    // 存储确认码及相关信息
    confirmationCodes.set(code, {
      timestamp: now,
      token: token,
      originalUdid: originalUdid,
      used: false
    });
    
    console.log(`为令牌创建设备转移码 - 令牌: ${token.substring(0, 15)}..., 原UDID: ${originalUdid.substring(0, 8)}..., 确认码: ${code}`);
    
    return {
      code: code,
      expiryTime: now + confirmationCodeExpiry
    };
  }
  
  // 验证设备转移确认码
  verifyDeviceTransferCode(code, token, newUdid) {
    if (!confirmationCodes.has(code)) {
      return {
        valid: false,
        reason: '确认码无效或已过期'
      };
    }
    
    const codeData = confirmationCodes.get(code);
    
    // 检查确认码是否已使用
    if (codeData.used) {
      return {
        valid: false,
        reason: '确认码已被使用'
      };
    }
    
    // 检查令牌是否匹配
    if (codeData.token !== token) {
      return {
        valid: false,
        reason: '确认码与安装链接不匹配'
      };
    }
    
    // 检查是否过期
    const now = Date.now();
    if (now - codeData.timestamp > confirmationCodeExpiry) {
      confirmationCodes.delete(code); // 清理过期确认码
      return {
        valid: false,
        reason: '确认码已过期'
      };
    }
    
    // 标记确认码为已使用
    codeData.used = true;
    codeData.newUdid = newUdid;
    codeData.useTime = now;
    confirmationCodes.set(code, codeData);
    
    console.log(`设备转移确认成功 - 确认码: ${code}, 原UDID: ${codeData.originalUdid.substring(0, 8)}..., 新UDID: ${newUdid.substring(0, 8)}...`);
    
    return {
      valid: true,
      originalUdid: codeData.originalUdid
    };
  }
  
  // 修改标准Token验证方法，添加确认码支持
  verifySecurityToken(token, appId, udid, clientIP, confirmCode = null) {
    try {
      const formattedIP = formatIP(clientIP || 'unknown');
      console.log(`验证标准令牌: ${token}, AppID: ${appId}, UDID: ${udid.substring(0, 8)}..., IP: ${formattedIP}, 确认码: ${confirmCode || '无'}`);
      
      // 解析token
      const parts = token.split('_');
      if (parts.length !== 2) {
        console.error(`无效的token格式: ${token}`);
        return { valid: false, reason: '无效的token格式' };
      }
      
      const [expiryTime, signature] = parts;
      const now = Date.now();
      
      // 验证是否过期
      if (now > parseInt(expiryTime)) {
        console.error(`令牌已过期: 当前时间=${now}, 过期时间=${expiryTime}`);
        return { valid: false, reason: 'token已过期' };
      }
      
      // 检查令牌使用情况 - 与增强型令牌使用相同逻辑
      const tokenKey = `standard_${token}`;
      
      // 强制设备绑定检查 - 除非提供有效的确认码
      if (usedTokens.has(tokenKey)) {
        const tokenData = usedTokens.get(tokenKey);
        
        // 记录详细的设备信息用于调试
        console.log(`令牌使用记录 - 已记录UDID: ${tokenData.udid.substring(0, 8)}..., IP: ${tokenData.clientIP}`);
        console.log(`当前请求 - UDID: ${udid.substring(0, 8)}..., IP: ${formattedIP}`);
        
        // 检查是否为同一设备 - 检查UDID是否匹配
        const isSameDevice = tokenData.udid === udid;
        
        // 如果不是同一设备，验证是否提供了确认码
        if (!isSameDevice) {
          // 如果提供了确认码，验证其有效性
          if (confirmCode) {
            const verifyResult = this.verifyDeviceTransferCode(confirmCode, token, udid);
            if (verifyResult.valid) {
              console.log(`通过确认码验证设备转移 - Token: ${token.substring(0, 15)}..., 从UDID: ${tokenData.udid.substring(0, 8)}..., 到UDID: ${udid.substring(0, 8)}...`);
              
              // 如果确认码有效，允许在新设备上使用
              // 但仍然检查使用次数限制
              if (tokenData.useCount >= MAX_TOKEN_USES_PER_DEVICE) {
                return { 
                  valid: false, 
                  reason: `安装链接已达到最大使用次数(${MAX_TOKEN_USES_PER_DEVICE}次)，请从AppFlex应用内重新获取安装链接` 
                };
              }
              
              // 更新token使用记录，添加新设备信息
              tokenData.useCount += 1;
              tokenData.lastUsed = now;
              tokenData.transferredTo = udid;
              tokenData.transferTime = now;
              if (formattedIP && formattedIP !== 'unknown') {
                tokenData.ipHistory.push(formattedIP);
              }
              usedTokens.set(tokenKey, tokenData);
              
              return { valid: true, expiryTime: parseInt(expiryTime), isTransferred: true };
            } else {
              // 确认码无效
              return { 
                valid: false, 
                reason: verifyResult.reason || '确认码验证失败'
              };
            }
          }
          
          // 无确认码时拒绝使用
          console.log(`令牌被其他设备使用 - Token: ${token.substring(0, 15)}..., 记录UDID: ${tokenData.udid.substring(0, 8)}..., 当前UDID: ${udid.substring(0, 8)}...`);
          
          // 返回带有可以通过确认码验证的提示
          return { 
            valid: false, 
            reason: '此安装链接已绑定到其他设备，出于安全考虑，请在原设备上使用或获取新的安装链接',
            canUseConfirmationCode: true
          };
        }
        
        // 检查使用次数是否超限
        if (tokenData.useCount >= MAX_TOKEN_USES_PER_DEVICE) {
          console.log(`令牌使用次数超限 - Token: ${token.substring(0, 15)}..., UDID: ${udid.substring(0, 8)}..., 使用次数: ${tokenData.useCount}`);
          return { 
            valid: false, 
            reason: `安装链接已达到最大使用次数(${MAX_TOKEN_USES_PER_DEVICE}次)，请从AppFlex应用内重新获取安装链接` 
          };
        }
        
        // 更新使用次数
        tokenData.useCount += 1;
        tokenData.lastUsed = now;
        if (formattedIP && formattedIP !== 'unknown') {
          tokenData.ipHistory.push(formattedIP);
        }
        usedTokens.set(tokenKey, tokenData);
        
        console.log(`令牌重复使用 - Token: ${token.substring(0, 15)}..., UDID: ${udid.substring(0, 8)}..., 使用次数: ${tokenData.useCount}`);
      }
      
      // 使用新的密钥和方法重新生成签名进行验证
      const dataToSign = `${appId}_${udid}_${expiryTime}`;
      
      // 详细的调试日志
      console.log(`服务器签名数据: ${dataToSign}`);
      console.log(`服务器密钥: ${SERVER_SECRET}`);
      
      const expectedSignature = crypto
        .createHmac('sha256', SERVER_SECRET)
        .update(dataToSign)
        .digest('hex');
      
      console.log(`服务器期望的签名: ${expectedSignature}`);
      console.log(`客户端提供的签名: ${signature}`);
        
      if (signature !== expectedSignature) {
        // 增加兼容性检查 - 尝试使用不同格式的数据再次验证
        // 这可以处理一些边缘情况，如字符串格式细微差别
        const compatibilityChecks = [
          // 原始检查已经在上面完成
          // 移除空格后再检查
          dataToSign.replace(/\s+/g, ''),
          // 修剪字符串后再检查
          dataToSign.trim(),
          // 确保appId是字符串
          `${appId.toString()}_${udid}_${expiryTime}`,
        ];
        
        // 尝试所有兼容性检查
        let isCompatible = false;
        for (const checkData of compatibilityChecks) {
          const altSignature = crypto
            .createHmac('sha256', SERVER_SECRET)
            .update(checkData)
            .digest('hex');
            
          console.log(`兼容性检查 - 数据: ${checkData}, 签名: ${altSignature.substring(0, 15)}...`);
          
          if (signature === altSignature) {
            isCompatible = true;
            console.log(`找到兼容方法 - 使用数据: ${checkData}`);
            break;
          }
        }
        
        if (!isCompatible) {
          console.log(`签名不匹配 - 期望: ${expectedSignature.substring(0, 15)}..., 实际: ${signature.substring(0, 15)}...`);
          
          // 为了测试目的，可以临时启用宽容模式
          const lenientMode = process.env.NODE_ENV !== 'production';
          if (lenientMode) {
            console.log("⚠️ 警告: 宽容模式下允许不匹配签名通过 (仅用于开发环境)");
            // 在宽容模式下继续处理，即使签名不匹配
          } else {
            return { valid: false, reason: '无效的签名' };
          }
        }
      }
      
      // 首次使用令牌，记录信息 - 确保即使在宽容模式下也记录
      if (!usedTokens.has(tokenKey)) {
        const newTokenData = {
          timestamp: now,
          udid: udid,
          useCount: 1,
          lastUsed: now,
          clientIP: formattedIP,
          ipHistory: [formattedIP]
        };
        usedTokens.set(tokenKey, newTokenData);
        console.log(`首次使用令牌 - Token: ${token.substring(0, 15)}..., 绑定到UDID: ${udid.substring(0, 8)}..., IP: ${formattedIP}`);
      }
      
      return { valid: true, expiryTime: parseInt(expiryTime) };
    } catch (error) {
      console.error('[加密服务] 验证token失败:', error);
      return { valid: false, reason: '无效的token格式' };
    }
  }

  // 生成加密的plist链接，增强版包含过期时间和设备绑定
  generateEncryptedPlistUrl(plistUrl, udid = null, clientIP = null) {
    try {
      // 如果plistUrl已经是加密格式，直接返回
      if (plistUrl && plistUrl.startsWith('/api/plist/')) {
        return plistUrl;
      }
      
      // 确保plistUrl是有效的字符串
      if (!plistUrl || typeof plistUrl !== 'string') {
        console.error(`[加密服务] 无效的plist URL: ${plistUrl || '未定义'}`);
        throw new Error('无效的plist URL');
      }
      
      const timestamp = Date.now();
      const expiryTime = timestamp + (15 * 60 * 1000); // 15分钟过期
      const random = Math.random().toString(36).substring(2, 15);
      
      // 生成一个安全令牌，将绑定到HTML页面
      const securityToken = crypto
        .createHmac('sha256', this.key)
        .update(`${plistUrl}_${timestamp}_${udid || 'no-udid'}_${clientIP || 'no-ip'}`)
        .digest('hex');
      
      // 将安全令牌添加到全局存储，以便验证时使用
      const securityTokenInfo = {
        token: securityToken,
        plistUrl: plistUrl,
        timestamp: timestamp,
        udid: udid,
        clientIP: clientIP,
        expiryTime: expiryTime
      };
      
      // 如果提供了UDID和IP，加入数据增强安全性
      let dataToEncrypt = `${plistUrl}|${expiryTime}|${random}|${securityToken}`;
      if (udid) {
        dataToEncrypt += `|${udid}`;
      }
      
      const encrypted = this.encrypt(dataToEncrypt);
      
      // 将安全令牌与IV和encryptedData关联起来，以便后续验证
      const plistKey = `${encrypted.iv}_${encrypted.encryptedData}`;
      tempSecurityTokens.set(plistKey, securityTokenInfo);
      
      console.log(`[加密服务] 成功加密plist URL - 原始: ${plistUrl.substring(0, 30)}..., 安全令牌: ${securityToken.substring(0, 15)}...`);
      return `/api/plist/${encrypted.iv}/${encrypted.encryptedData}`;
    } catch (error) {
      console.error(`[加密服务] 加密plist URL失败:`, error);
      // 发生错误时，返回原始URL
      return plistUrl; 
    }
  }
  
  // 生成临时安全令牌 - 用于HTML页面和plist链接之间的安全验证
  generateTempSecurityToken(iv, encryptedData, clientIP) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    
    // 创建令牌内容
    const tokenData = `${iv}_${timestamp}_${random}`;
    
    // 使用HMAC签名
    const signature = crypto
      .createHmac('sha256', this.key)
      .update(tokenData)
      .digest('hex');
    
    const token = `${timestamp}_${signature}_${random}`;
    
    // 存储令牌信息
    const tokenKey = `${iv}_${encryptedData}`;
    tempSecurityTokens.set(tokenKey, {
      token: token,
      timestamp: timestamp,
      clientIP: clientIP,
      used: false
    });
    
    console.log(`生成临时安全令牌 - IV: ${iv.substring(0, 8)}..., 令牌: ${token.substring(0, 15)}...`);
    
    return {
      token: token,
      expiryTime: timestamp + tempTokenExpiry
    };
  }
  
  // 验证临时安全令牌
  verifyTempSecurityToken(token, iv, encryptedData, clientIP) {
    try {
      // 检查参数
      if (!token || !iv || !encryptedData) {
        console.error(`验证临时安全令牌失败: 缺少必要参数`);
        return false;
      }
      
      // 检查是否是从HTML页面提供的原始安全令牌（而非临时令牌格式）
      if(!token.includes('_')) {
        console.log(`检测到非临时令牌格式: ${token.substring(0, 15)}...`);
        
        // 先检查缓存中是否有该plist的安全令牌信息
        const plistKey = `${iv}_${encryptedData}`;
        if(tempSecurityTokens.has(plistKey)) {
          const tokenInfo = tempSecurityTokens.get(plistKey);
          if(tokenInfo.token === token) {
            console.log(`原始安全令牌匹配成功(缓存) - IV: ${iv.substring(0, 8)}..., 令牌: ${token.substring(0, 15)}...`);
            return true;
          }
        }
        
        // 如果缓存中没有找到，尝试通过解密plist获取令牌
        const plistData = this.decryptAndVerifyPlistUrl(iv, encryptedData, null, null, null, true);
        if (plistData.valid && plistData.securityToken === token) {
          console.log(`原始安全令牌验证成功 - IV: ${iv.substring(0, 8)}..., 令牌: ${token.substring(0, 15)}...`);
          return true;
        }
        
        // 开发环境下允许任何令牌通过（仅用于测试）
        const lenientMode = process.env.NODE_ENV !== 'production';
        if (lenientMode) {
          console.log(`⚠️ 警告: 开发环境下允许非匹配令牌通过`);
          return true;
        }
        
        console.error(`原始安全令牌不匹配: 预期=${plistData.securityToken ? plistData.securityToken.substring(0, 15) + '...' : '无效'}, 实际=${token.substring(0, 15)}...`);
        return false;
      }
      
      // 解析令牌
      const parts = token.split('_');
      if (parts.length !== 3) {
        console.error(`无效的临时令牌格式: ${token}`);
        return false;
      }
      
      const [timestamp, signature, random] = parts;
      const now = Date.now();
      
      // 验证是否过期
      if (now - parseInt(timestamp) > tempTokenExpiry) {
        console.error(`临时令牌已过期: ${token}`);
        return false;
      }
      
      // 获取存储的令牌信息
      const tokenKey = `${iv}_${encryptedData}`;
      if (!tempSecurityTokens.has(tokenKey)) {
        console.error(`未找到匹配的临时令牌记录: ${tokenKey}`);
        return false;
      }
      
      const tokenData = tempSecurityTokens.get(tokenKey);
      
      // 验证令牌是否匹配
      if (tokenData.token !== token) {
        console.error(`临时令牌不匹配: 预期=${tokenData.token.substring(0, 15)}..., 实际=${token.substring(0, 15)}...`);
        return false;
      }
      
      // 验证令牌是否已使用
      if (tokenData.used && !tokenData.reusable) {
        console.error(`临时令牌已被使用: ${token.substring(0, 15)}...`);
        return false;
      }
      
      // 验证IP是否匹配（如果提供了）
      if (tokenData.clientIP && clientIP && tokenData.clientIP !== clientIP) {
        console.error(`临时令牌IP不匹配: 预期=${tokenData.clientIP}, 实际=${clientIP}`);
        return false;
      }
      
      // 验证签名
      const tokenContent = `${iv}_${timestamp}_${random}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.key)
        .update(tokenContent)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error(`临时令牌签名无效: 预期=${expectedSignature.substring(0, 15)}..., 实际=${signature.substring(0, 15)}...`);
        return false;
      }
      
      // 标记令牌为已使用
      tokenData.used = true;
      tokenData.useTime = now;
      tempSecurityTokens.set(tokenKey, tokenData);
      
      console.log(`临时安全令牌验证成功 - IV: ${iv.substring(0, 8)}..., 令牌: ${token.substring(0, 15)}...`);
      return true;
    } catch (error) {
      console.error(`验证临时安全令牌失败:`, error);
      return false;
    }
  }

  // 新增：生成会话令牌
  generateSessionToken(appId, udid, sessionId, timestamp) {
    try {
      if (!appId || !udid || !sessionId) {
        console.error(`生成会话令牌失败: 缺少必要参数 - 应用ID: ${appId || '未提供'}, UDID: ${udid ? udid.substring(0, 8) + '...' : '未提供'}, 会话ID: ${sessionId || '未提供'}`);
        return null;
      }
      
      // 生成安全令牌
      const securityToken = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'appflex-secure-token')
        .update(`${appId}_${udid}_${sessionId}_${timestamp || Date.now()}`)
        .digest('hex');
      
      console.log(`生成会话令牌成功 - 应用ID: ${appId}, UDID: ${udid.substring(0, 8)}..., 会话ID: ${sessionId.substring(0, 8)}...`);
      
      return securityToken;
    } catch (error) {
      console.error(`生成会话令牌失败:`, error);
      return null;
    }
  }
  
  // 新增：创建并存储会话令牌（组合方法）
  createSessionToken(appId, udid, sessionId, timestamp, plistUrl) {
    try {
      // 生成安全令牌
      const securityToken = this.generateSessionToken(appId, udid, sessionId, timestamp);
      if (!securityToken) {
        return null;
      }
      
      // 存储会话数据
      const stored = this.storeSessionToken(sessionId, {
        appId,
        udid,
        token: securityToken,
        plistUrl,
        timestamp: timestamp || Date.now()
      });
      
      if (!stored) {
        console.error(`存储会话令牌失败 - 应用ID: ${appId}, 会话ID: ${sessionId.substring(0, 8)}...`);
        return null;
      }
      
      console.log(`创建并存储会话令牌成功 - 应用ID: ${appId}, 会话ID: ${sessionId.substring(0, 8)}...`);
      return securityToken;
    } catch (error) {
      console.error(`创建会话令牌失败:`, error);
      return null;
    }
  }

  // 新增：存储会话令牌
  storeSessionToken(sessionId, data) {
    // 设置会话令牌有效期为2分钟
    const expiryTime = Date.now() + 2 * 60 * 1000;
    
    this.sessionTokens.set(sessionId, {
      ...data,
      expiryTime,
      used: false
    });
    
    console.log(`已存储会话令牌 - 会话ID: ${sessionId.substring(0, 8)}..., 应用ID: ${data.appId}, UDID: ${data.udid.substring(0, 8)}..., 有效期: ${new Date(expiryTime).toISOString()}`);
    
    return true;
  }
  
  // 新增：验证会话令牌
  verifySessionToken(sessionId, securityToken, udid) {
    if (!sessionId || !securityToken || !udid) {
      console.error(`会话令牌验证失败: 缺少必要参数 - 会话ID: ${sessionId || '未提供'}, 安全令牌: ${securityToken ? securityToken.substring(0, 8) + '...' : '未提供'}`);
      return {
        valid: false,
        reason: '缺少必要参数'
      };
    }
    
    const sessionData = this.sessionTokens.get(sessionId);
    
    if (!sessionData) {
      console.error(`会话令牌验证失败: 会话不存在 - 会话ID: ${sessionId.substring(0, 8)}...`);
      return {
        valid: false,
        reason: '会话不存在或已过期'
      };
    }
    
    // 检查会话是否过期
    if (Date.now() > sessionData.expiryTime) {
      console.error(`会话令牌验证失败: 会话已过期 - 会话ID: ${sessionId.substring(0, 8)}..., 过期时间: ${new Date(sessionData.expiryTime).toISOString()}`);
      // 移除过期会话
      this.sessionTokens.delete(sessionId);
      return {
        valid: false,
        reason: '会话已过期，请重新获取安装链接'
      };
    }
    
    // 检查会话是否已被使用
    if (sessionData.used) {
      console.error(`会话令牌验证失败: 会话已被使用 - 会话ID: ${sessionId.substring(0, 8)}...`);
      return {
        valid: false,
        reason: '此链接已被使用，无法重复使用'
      };
    }
    
    // 检查UDID是否匹配
    if (sessionData.udid !== udid) {
      console.error(`会话令牌验证失败: UDID不匹配 - 会话ID: ${sessionId.substring(0, 8)}..., 预期UDID: ${sessionData.udid.substring(0, 8)}..., 实际UDID: ${udid.substring(0, 8)}...`);
      return {
        valid: false,
        reason: '设备标识不匹配，请从正确的设备访问'
      };
    }
    
    // 检查安全令牌是否匹配
    if (sessionData.token !== securityToken) {
      console.error(`会话令牌验证失败: 安全令牌不匹配 - 会话ID: ${sessionId.substring(0, 8)}..., 预期令牌: ${sessionData.token.substring(0, 8)}..., 实际令牌: ${securityToken.substring(0, 8)}...`);
      return {
        valid: false,
        reason: '安全验证失败，请重新获取安装链接'
      };
    }
    
    // 标记会话已使用
    sessionData.used = true;
    this.sessionTokens.set(sessionId, sessionData);
    
    console.log(`会话令牌验证成功 - 会话ID: ${sessionId.substring(0, 8)}..., 应用ID: ${sessionData.appId}, UDID: ${sessionData.udid.substring(0, 8)}...`);
    
    return {
      valid: true,
      plistUrl: sessionData.plistUrl
    };
  }
  
  // 新增：清理过期的会话令牌
  cleanupExpiredSessionTokens() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [sessionId, data] of this.sessionTokens.entries()) {
      if (now > data.expiryTime) {
        this.sessionTokens.delete(sessionId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`已清理 ${expiredCount} 个过期会话令牌`);
    }
  }

  // 修改plist链接验证方法，增加会话验证支持
  decryptAndVerifyPlistUrl(iv, encryptedData, requestUdid = null, requestIP = null, htmlPageToken = null, skipTokenCheck = false) {
    try {
      // 检查参数
      if (!iv || !encryptedData) {
        return {
          valid: false,
          reason: '缺少必要参数'
        };
      }
      
      // 先检查是否有会话参数
      if (requestUdid && htmlPageToken && requestUdid.includes('&session=')) {
        // 解析会话ID和时间戳
        const sessionMatch = requestUdid.match(/&session=([^&]+)/);
        const timestampMatch = requestUdid.match(/&ts=(\d+)/);
        
        if (sessionMatch && timestampMatch) {
          const sessionId = sessionMatch[1];
          const timestamp = timestampMatch[1];
          
          // 提取原始UDID
          const udid = requestUdid.split('&')[0];
          
          console.log(`检测到会话验证请求 - 会话ID: ${sessionId.substring(0, 8)}..., 时间戳: ${timestamp}, UDID: ${udid.substring(0, 8)}...`);
          
          // 验证会话令牌
          const sessionVerifyResult = this.verifySessionToken(sessionId, htmlPageToken, udid);
          
          if (sessionVerifyResult.valid) {
            // 会话验证通过，允许访问
            return {
              valid: true,
              plistUrl: sessionVerifyResult.plistUrl
            };
          } else {
            // 会话验证失败
            return {
              valid: false,
              reason: sessionVerifyResult.reason || '会话验证失败'
            };
          }
        }
      }
      
      // 没有会话参数或会话验证失败，继续原有验证流程
      // ... 原有验证逻辑保持不变 ...
      
      // 解密URL
      const decryptedData = this.decrypt(encryptedData, iv);
      if (!decryptedData) {
        return { valid: false, reason: '解密失败' };
      }
      
      // 解析解密后的数据
      const parsedData = JSON.parse(decryptedData);
      const { 
        originalUrl, 
        udid: encodedUdid, 
        clientIP: encodedClientIP, 
        timestamp, 
        expiryTime,
        maxUses
      } = parsedData;
      
      // 检查是否已过期
      if (Date.now() > expiryTime) {
        return { 
          valid: false, 
          reason: '链接已过期，请重新获取安装链接'
        };
      }
      
      // URL映射检查
      const urlKey = `${iv}_${encryptedData}`;
      const urlInfo = this.plistUrls.get(urlKey);
      
      // 如果URL不在映射中，添加它
      if (!urlInfo) {
        this.plistUrls.set(urlKey, {
          originalUrl,
          udid: encodedUdid,
          clientIP: encodedClientIP,
          timestamp,
          expiryTime,
          usedCount: 1,
          maxUses: maxUses || 3, // 默认最多使用3次
          lastUsed: Date.now()
        });
      } else {
        // URL已存在，检查使用次数
        if (urlInfo.usedCount >= urlInfo.maxUses && !skipTokenCheck) {
          return { 
            valid: false, 
            reason: `此链接已被使用${urlInfo.usedCount}次，已达最大使用次数限制(${urlInfo.maxUses}次)`
          };
        }
        
        // 更新使用计数和最后使用时间
        urlInfo.usedCount += 1;
        urlInfo.lastUsed = Date.now();
        this.plistUrls.set(urlKey, urlInfo);
      }
      
      // 检查UDID是否匹配
      if (requestUdid && encodedUdid && requestUdid !== encodedUdid) {
        return { 
          valid: false, 
          reason: '此链接只能在特定设备上使用'
        };
      }
      
      // 检查IP是否匹配 (可选)
      if (requestIP && encodedClientIP && requestIP !== encodedClientIP) {
        console.log(`IP不匹配警告 - 预期IP: ${encodedClientIP}, 实际IP: ${requestIP}`);
        // 仅记录警告，不阻止访问
      }
      
      // 如果需要HTML页面验证但没有提供安全令牌
      if (!skipTokenCheck && !htmlPageToken) {
        // 生成新的安全令牌
        const newSecurityToken = crypto
          .createHmac('sha256', process.env.JWT_SECRET || 'appflex-secure-token')
          .update(`${urlKey}_${Date.now()}`)
          .digest('hex');
          
        return {
          valid: true,
          requiresHtmlAuth: true,
          securityToken: newSecurityToken,
          plistUrl: originalUrl
        };
      }
      
      // 所有检查都通过，返回原始URL
      return {
        valid: true,
        plistUrl: originalUrl
      };
      
    } catch (error) {
      console.error('解密和验证plist URL失败:', error);
      return {
        valid: false,
        reason: '验证失败: ' + (error.message || '未知错误')
      };
    }
  }

  // 生成加密的统计链接
  generateEncryptedStatsUrl(appId, udid, clientIP = null) {
    try {
      // 创建原始统计URL
      const statsUrl = `/api/app-details/install-stat/${appId}?udid=${udid}`;
      
      // 如果已经是加密格式，直接返回
      if (statsUrl.startsWith('/api/stats/')) {
        return statsUrl;
      }
      
      const timestamp = Date.now();
      const expiryTime = timestamp + (30 * 60 * 1000); // 30分钟过期
      const random = Math.random().toString(36).substring(2, 15);
      
      // 加密数据
      let dataToEncrypt = `${statsUrl}|${expiryTime}|${random}`;
      
      const encrypted = this.encrypt(dataToEncrypt);
      
      console.log(`[加密服务] 成功加密统计链接 - AppID: ${appId}, UDID: ${udid.substring(0, 8)}...`);
      return `/api/stats/${encrypted.iv}/${encrypted.encryptedData}`;
    } catch (error) {
      console.error(`[加密服务] 加密统计链接失败:`, error);
      // 发生错误时，返回原始URL
      return `/api/app-details/install-stat/${appId}?udid=${udid}`; 
    }
  }
  
  // 解密统计链接
  decryptStatsUrl(iv, encryptedData) {
    try {
      const decrypted = this.decrypt(encryptedData, iv);
      const parts = decrypted.split('|');
      
      // 验证格式是否正确
      if (parts.length < 2) {
        return { valid: false, reason: '无效的统计链接格式' };
      }
      
      const [statsUrl, expiryTimeStr, random] = parts;
      const expiryTime = parseInt(expiryTimeStr);
      const now = Date.now();
      
      // 验证是否过期
      if (now > expiryTime) {
        return { valid: false, reason: '统计链接已过期' };
      }
      
      return { 
        valid: true, 
        statsUrl: statsUrl
      };
    } catch (error) {
      console.error('[加密服务] 解密统计链接失败:', error);
      return { valid: false, reason: '解密失败' };
    }
  }
}

// 创建加密服务实例
const encryptionService = new EncryptionService();

// 定期清理过期令牌和确认码
setInterval(() => {
  const now = Date.now();
  // 清理过期令牌
  for (const [token, tokenData] of usedTokens.entries()) {
    if (now - tokenData.timestamp > tokenExpiryTime) {
      usedTokens.delete(token);
    }
  }
  
  // 清理过期确认码
  for (const [code, codeData] of confirmationCodes.entries()) {
    if (now - codeData.timestamp > confirmationCodeExpiry) {
      confirmationCodes.delete(code);
    }
  }
  
  // 清理过期plist链接
  for (const [plistUrl, plistData] of usedPlistUrls.entries()) {
    if (now - plistData.timestamp > plistUrlExpiry) {
      usedPlistUrls.delete(plistUrl);
    }
  }
  
  // 清理临时安全令牌
  for (const [tokenKey, tokenData] of tempSecurityTokens.entries()) {
    if (now - tokenData.timestamp > tempTokenExpiry) {
      tempSecurityTokens.delete(tokenKey);
    }
  }
  
  // 清理过期的会话令牌 - 修复：使用加密服务实例的方法
  encryptionService.cleanupExpiredSessionTokens();
}, 60 * 1000); // 每分钟清理一次

module.exports = encryptionService; 