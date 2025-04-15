const crypto = require('crypto');

// 存储已使用的令牌
const usedTokens = new Map();
const tokenExpiryTime = 15 * 60 * 1000; // 令牌有效期15分钟

// 定期清理过期令牌
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of usedTokens.entries()) {
    if (now - timestamp > tokenExpiryTime) {
      usedTokens.delete(token);
    }
  }
}, 60 * 1000); // 每分钟清理一次

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
      // 检查令牌是否已被使用（一次性令牌）
      if (usedTokens.has(token)) {
        return { 
          valid: false, 
          reason: '此安装链接已被使用，每个链接仅可使用一次' 
        };
      }
      
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
      
      // 验证IP地址
      if (originalIP !== clientIP) {
        console.log(`IP不匹配: 原始IP=${originalIP}, 当前IP=${clientIP}`);
        return { 
          valid: false, 
          reason: '网络环境已变更，此链接只能在生成链接的原始网络环境中使用' 
        };
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
      
      // 将令牌标记为已使用
      usedTokens.set(token, now);
      
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
    
    // 使用JWT_SECRET创建签名
    const signature = crypto
      .createHmac('sha256', process.env.JWT_SECRET || this.key.toString('hex'))
      .update(`${appId}_${udid}_${expiryTime}`)
      .digest('hex');
      
    return {
      token: `${expiryTime}_${signature}`,
      expiryTime: expiryTime
    };
  }
  
  // 验证安全token（保留原方法以兼容旧版本）
  verifySecurityToken(token, appId, udid) {
    try {
      // 解析token
      const [expiryTime, signature] = token.split('_');
      const now = Date.now();
      
      // 验证是否过期
      if (now > parseInt(expiryTime)) {
        return { valid: false, reason: 'token已过期' };
      }
      
      // 重新生成签名进行验证
      const expectedSignature = crypto
        .createHmac('sha256', process.env.JWT_SECRET || this.key.toString('hex'))
        .update(`${appId}_${udid}_${expiryTime}`)
        .digest('hex');
        
      if (signature !== expectedSignature) {
        return { valid: false, reason: '无效的签名' };
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
      if (clientIP) {
        dataToEncrypt += `|${clientIP}`;
      }
      
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
      
      // 如果包含IP，验证是否匹配
      if (rest.length > 1 && requestIP && rest[1]) {
        const embeddedIP = rest[1];
        if (embeddedIP !== requestIP) {
          return { valid: false, reason: '网络环境已变更' };
        }
      }
      
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