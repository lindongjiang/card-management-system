const CryptoJS = require('crypto-js');
const https = require('https');
const http = require('http');

// 配置参数
const CONFIG = {
  BASE_URL: 'https://renmai.cloudmantoub.online',
  ENCRYPTION_KEY: '5486abfd96080e09e82bb2ab93258bde19d069185366b5aa8d38467835f2e7aa',
  DEFAULT_IV: '4beefa544753b231fb6eac63aa1826da'
};

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
        
        // 尝试修复不完整的JSON数组
        if (decryptedText.startsWith('[')) {
          const lastCompleteObjectIndex = decryptedText.lastIndexOf('},');
          
          if (lastCompleteObjectIndex > 0) {
            const fixedJson = decryptedText.substring(0, lastCompleteObjectIndex + 1) + ']';
            try {
              const parsed = JSON.parse(fixedJson);
              console.log('修复后JSON解析成功，数组长度:', parsed.length);
              return parsed;
            } catch (e) {
              console.error('修复后JSON解析仍然失败:', e.message);
            }
          }
        }
        
        // 返回原始解密文本
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
function fetchData(url) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    client.get(url, (res) => {
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
  printSeparator('开始获取API数据');
  
  try {
    // 获取应用列表API数据
    const apiUrl = `${CONFIG.BASE_URL}/api/client/apps`;
    console.log(`请求URL: ${apiUrl}`);
    
    const apiData = await fetchData(apiUrl);
    printSeparator('API原始数据');
    console.log(JSON.stringify(apiData, null, 2));
    
    // 提取加密数据
    let encryptedData = null;
    let iv = CONFIG.DEFAULT_IV;
    
    if (apiData.success && apiData.data) {
      // 情况1: 直接是加密字符串
      if (typeof apiData.data === 'string') {
        encryptedData = apiData.data;
      }
      // 情况2: {data: xxx, iv: xxx} 格式
      else if (apiData.data.data && apiData.data.iv) {
        encryptedData = apiData.data.data;
        iv = apiData.data.iv;
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
    printSeparator('解密后的数据');
    if (decryptedData) {
      if (typeof decryptedData === 'object') {
        console.log(JSON.stringify(decryptedData, null, 2));
        
        // 打印应用概要信息
        if (Array.isArray(decryptedData) && decryptedData.length > 0) {
          printSeparator('应用列表概要');
          decryptedData.forEach((app, index) => {
            console.log(`#${index+1} ${app.name || '未命名'} - 版本: ${app.version || '未知'} - 需要卡密: ${app.requires_key ? '是' : '否'}`);
          });
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
