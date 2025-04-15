const CryptoJS = require('crypto-js');
const https = require('https');
const http = require('http');

// 配置参数
const CONFIG = {
  BASE_URL: 'https://renmai.cloudmantoub.online',
  ENCRYPTION_KEY: '5486abfd96080e09e82bb2ab93258bde19d069185366b5aa8d38467835f2e7aa',
  DEFAULT_IV: '4beefa544753b231fb6eac63aa1826da'
};

// 获取参数中的appId
const appId = process.argv[2];
if (!appId) {
  console.error('请提供应用ID作为参数');
  console.log('使用方法: node print-app-detail.js <appId> [udid]');
  process.exit(1);
}

// 获取UDID参数（可选）
const udid = process.argv[3] || '1234567890123456789012345678901234567890';

// 打印分隔线
function printSeparator(message = '') {
  const line = '-'.repeat(80);
  console.log(`\n${line}`);
  if (message) {
    console.log(`${message}`);
    console.log(line);
  }
}

// 解密数据函数
function decryptData(encryptedData, iv = CONFIG.DEFAULT_IV) {
  try {
    if (!encryptedData) {
      console.error('解密失败: 加密数据为空');
      return null;
    }
    
    const keyHex = CryptoJS.enc.Hex.parse(CONFIG.ENCRYPTION_KEY);
    const ivHex = CryptoJS.enc.Hex.parse(iv);
    
    console.log(`使用密钥: ${CONFIG.ENCRYPTION_KEY.substring(0, 10)}...`);
    console.log(`使用IV: ${iv}`);
    
    // 尝试十六进制解析
    const cipherHex = CryptoJS.enc.Hex.parse(encryptedData);
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: cipherHex },
      keyHex,
      {
        iv: ivHex,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (decryptedText && decryptedText.length > 0) {
      // 尝试解析JSON
      try {
        const parsed = JSON.parse(decryptedText);
        return parsed;
      } catch (jsonErr) {
        console.warn('JSON解析失败:', jsonErr.message);
        return decryptedText;
      }
    } else {
      console.error('解密后文本为空');
      return null;
    }
  } catch (error) {
    console.error('解密过程出现异常:', error);
    return null;
  }
}

// 发送HTTP请求获取数据
function fetchData(url, queryParams = {}) {
  return new Promise((resolve, reject) => {
    // 添加查询参数到URL
    const queryString = Object.keys(queryParams)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
      .join('&');
    
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    console.log(`完整请求URL: ${fullUrl}`);
    
    const isHttps = fullUrl.startsWith('https');
    const client = isHttps ? https : http;
    
    client.get(fullUrl, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'];
      
      let error;
      if (statusCode !== 200) {
        error = new Error(`请求失败，状态码: ${statusCode}`);
      } else if (!/^application\/json/.test(contentType)) {
        error = new Error(`无效的content-type: ${contentType}，期望application/json`);
      }
      
      if (error) {
        console.error(error.message);
        res.resume(); // 消费响应数据以释放内存
        reject(error);
        return;
      }
      
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve(parsedData);
        } catch (e) {
          console.error('解析响应JSON数据失败:', e.message);
          resolve(rawData); // 返回原始数据
        }
      });
    }).on('error', (e) => {
      console.error(`请求出错: ${e.message}`);
      reject(e);
    });
  });
}

// 主函数
async function main() {
  printSeparator(`获取应用详情 (ID: ${appId}, UDID: ${udid})`);
  
  try {
    // 获取应用详情API数据
    const apiUrl = `${CONFIG.BASE_URL}/api/client/apps/${appId}`;
    console.log(`基础请求URL: ${apiUrl}`);
    
    const apiData = await fetchData(apiUrl, { udid });
    printSeparator('API原始数据');
    console.log(JSON.stringify(apiData, null, 2));
    
    // 提取加密数据
    let encryptedData = null;
    let iv = CONFIG.DEFAULT_IV;
    
    if (apiData.success && apiData.data) {
      // 检查是否有iv和data字段
      if (apiData.data.iv && apiData.data.data) {
        encryptedData = apiData.data.data;
        iv = apiData.data.iv;
      }
      // 检查是否直接是加密数据
      else if (typeof apiData.data === 'string') {
        encryptedData = apiData.data;
      }
    }
    
    // 如果没有找到加密数据，尝试检查其他位置
    if (!encryptedData && typeof apiData.data === 'object') {
      printSeparator('API返回的是解密后的数据');
      console.log(JSON.stringify(apiData.data, null, 2));
      return;
    }
    
    if (!encryptedData) {
      throw new Error('未找到加密数据');
    }
    
    // 打印加密数据摘要
    printSeparator('加密数据摘要');
    console.log(`长度: ${encryptedData.length} 字符`);
    console.log(`前50个字符: ${encryptedData.substring(0, 50)}...`);
    
    // 解密数据
    printSeparator('开始解密数据');
    const decryptedData = decryptData(encryptedData, iv);
    
    // 打印解密结果
    printSeparator('解密后的应用详情数据');
    if (decryptedData) {
      if (typeof decryptedData === 'object') {
        console.log(JSON.stringify(decryptedData, null, 2));
        
        // 打印应用概要信息
        printSeparator('应用概要信息');
        console.log(`名称: ${decryptedData.name || '未知'}`);
        console.log(`版本: ${decryptedData.version || '未知'} (${decryptedData.build || '未知'})`);
        console.log(`标识符: ${decryptedData.identifier || '未知'}`);
        console.log(`大小: ${((decryptedData.size || 0) / 1024 / 1024).toFixed(2)} MB`);
        console.log(`需要卡密: ${decryptedData.requires_key ? '是' : '否'}`);
        console.log(`下载URL: ${decryptedData.download_url || '无'}`);
        
        if (decryptedData.description) {
          printSeparator('应用描述');
          console.log(decryptedData.description);
        }
        
        if (decryptedData.changelog) {
          printSeparator('更新日志');
          console.log(decryptedData.changelog);
        }
      } else {
        console.log(decryptedData);
      }
    } else {
      console.log('解密失败或结果为空');
    }
    
  } catch (error) {
    console.error('执行过程出错:', error);
  }
  
  printSeparator('执行完成');
}

// 执行主函数
main(); 