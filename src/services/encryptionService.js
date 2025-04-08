const crypto = require('crypto');

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

  // 生成加密的plist链接
  generateEncryptedPlistUrl(plistUrl) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const dataToEncrypt = `${plistUrl}|${timestamp}|${random}`;
    const encrypted = this.encrypt(dataToEncrypt);
    return `/api/plist/${encrypted.iv}/${encrypted.encryptedData}`;
  }
}

module.exports = new EncryptionService(); 