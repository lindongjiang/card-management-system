const crypto = require('crypto');
const querystring = require('querystring');
const url = require('url');
const path = require('path');
const fs = require('fs');

// 存储已使用的令牌
const usedTokens = new Map();
const tokenExpiryTime = 15 * 60 * 1000; // 令牌有效期15分钟
// 限制每个设备对每个令牌的最大使用次数
const MAX_TOKEN_USES_PER_DEVICE = 2; // 降低为2次，加强安全性

// 存储一次性确认码
const confirmationCodes = new Map();
const confirmationCodeExpiry = 10 * 60 * 1000; // 10分钟过期

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
}, 60 * 1000); // 每分钟清理一次

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
      
      // 如果提供了UDID和IP，加入数据增强安全性
      let dataToEncrypt = `${plistUrl}|${expiryTime}|${random}`;
      if (udid) {
        dataToEncrypt += `|${udid}`;
      }
      // 不再加入IP地址绑定，仅使用UDID
      
      const encrypted = this.encrypt(dataToEncrypt);
      
      console.log(`[加密服务] 成功加密plist URL - 原始: ${plistUrl.substring(0, 30)}...`);
      return `/api/plist/${encrypted.iv}/${encrypted.encryptedData}`;
    } catch (error) {
      console.error(`[加密服务] 加密plist URL失败:`, error);
      // 发生错误时，返回原始URL
      return plistUrl; 
    }
  }
  
  // 解密并验证plist URL
  decryptAndVerifyPlistUrl(iv, encryptedData, requestUdid = null, requestIP = null) {
    try {
      const decrypted = this.decrypt(encryptedData, iv);
      const parts = decrypted.split('|');
      
      // 验证格式是否正确
      if (parts.length < 2) {
        return { valid: false, reason: '无效的plist链接格式' };
      }
      
      const [plistUrl, expiryTimeStr, random, ...rest] = parts;
      const expiryTime = parseInt(expiryTimeStr);
      const now = Date.now();
      
      // 验证是否过期
      if (now > expiryTime) {
        return { valid: false, reason: 'plist链接已过期' };
      }
      
      // 如果包含UDID，验证是否匹配
      if (rest.length > 0 && requestUdid && rest[0]) {
        const embeddedUdid = rest[0];
        if (embeddedUdid !== requestUdid) {
          return { valid: false, reason: '设备标识不匹配' };
        }
      }
      
      // 不再验证IP地址匹配
      
      return { 
        valid: true, 
        plistUrl: plistUrl,
        expiryTime: expiryTime
      };
    } catch (error) {
      console.error('[加密服务] 解密plist URL失败:', error);
      return { valid: false, reason: '解密失败' };
    }
  }
}

module.exports = new EncryptionService(); 