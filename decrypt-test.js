const CryptoJS = require('crypto-js');
const fs = require('fs');

// 配置参数
const ENCRYPTION_KEY = '5486abfd96080e09e82bb2ab93258bde19d069185366b5aa8d38467835f2e7aa';
const iv = '4beefa544753b231fb6eac63aa1826da';
const encryptedData = '9b4e72d4da4efaad72bf84ed1597d1b4702fe62aba320c1a73a16493bb554f25341dbef421c78609ae5341eed70bbdcf5bf80000e39edd9f9028407f116a3d18bca4d36789f9711ae00d1a57964901334bcca0eb7fbafe3ea493cc1599c665ff6637b3274d1f5225aa0a190eb69b8df99d533992bb8523d6081b5ae0dfc166441a9ae46ccceddcc2b50fd4b83ed9029b4c87ed8316688c117c123a45fc48ee04c3a9ecc3c3046b9135524b8be805c5e099714f38f22976340fbdcf17e325468519627110d717d4b44bc34512fa4b307077a59f7c6e486c24ecfa243642f0e7824f8761c32be6a761376a540a452ee5d0b30f3059005b0a36c8468361694ce894868bd8a723c31df9ddbcab69990acd85f86666a2fdd1a7965a93532a97be9ead2a43c56f898198e0ff58c9862910d8b4a0075f605d6accddd25abf01fe426c4572e77292c080b527a20aec1c0ad0b7a7760ce05784b9efb8581c64575195d10dfc491e1745135d997bb5ded3be025c32365248be75765a678fe585b9b2ab23d4e36a565cad8119fd18fc4c58fecc78f17b8704771111da71e9084e94fdf44f71c2352ad7a96406a68f292efc5a2481992de83f0a8cf651261d45e1d9a631d702506eddb071b0512f69c513f10e54f6f6e4db32f123fa6ee6dc1868ac9e1b99559bb9f75739738bdeb5d02cce10d6803a929ee1fe3ef780280d7c1f6f01766080154860034792af72c396a3df5bd0d2f36bf545078682765b9538c2cbb1e98da0505eb484916e9d889ddc7e6e1ace1edfb238183cf67cd86ad51ba97110a147600a872784f8511f72afa27c5616024a78861806d556880d5e58b5e7069489040afd5d562c7d74cc526e762946264daed3468300cdc93fd05fd6ff9e9966e2286c14539337536399e00e8275d664d7f4da5d58ca584a81ede4659e1cf43b278d7e7c509c51f329fa98044d94672c6eb5ce5b9b9d3307cb18f876911c951416dd51f942a5c33bbab77030292915c705cef7daf2a6edaeb928df0cb2b5d6a28f495245d2346c6371988767b6751e51bf30ae7718995c9689c7496c1a847ca1e8f90892ebe26b43c0cbb0a584b76caf908462a5297ced06efb62219ae5e272a5e8d25ee22ee38652ad0324de25e960536975b56ff6fc04c4b6909383c0768c2b56c5199e903bd2b4f5942337257db1472945bfcce691683cbe923a00cc3a7de579a03a1da28509281e107e068621fa46284874b99b4bb8e515e5e6a10bd7adc5bcd2d981c762dd97b6666dd7af79652751d619b76ce635ef9901d465d19ce9e3480effe5ce1dc6ee65d369ad6f42481b6f17b73c57811cb4ff4dbaca3d2cace311231938156c0c59f3795a16a75cf945ae1d232e40f68444c9fef5ec4c54785f9884a23fce7bfb9da1e09b73f375748d28e73cfd4d54f8473a62e2b45d90884be8bbc20f7cda34a69f90b860cd7d706c8b010fa40404645ed8ccc585713e6044963501a2aa51d6eb5bbdb386b59bd1272f31942c568309c31f384f4cae49074ecbf9bb13df4ba577730d1adaa50d07134380234b30482d00246110eb8168b6bf6aa4c66ad81800ff265d6cbc23b5f0fe1787ffcc7787e1a6aaf15024a361b2f88c31250a225bda231e7a9705e786027cc3221b5f446134f41af49be194446319657a8e86a5e746bab4123bbc72cf5f6bb86ca5a424b5e23cce185b2d4e96e9945421fc79693f1de35a84da49194e66feeb81989d969b346b1118d5578b3bcbd9e008404f518f3dab92c5cd0dd80b50d6f07ca9a2f6c5ecd8237dd82e8d119d090023df5ffc914f19050c7a28583a7ebd3652340275936772352d2a6ca9a961b05f3ccd81f8d7eff115dfaf863ba6382fc5c3ab2609a1e84e98c28ae67d7269891bf48923d59f181ba278e84025c375f00a3a9e3fc1b2c7ca4bc6fbcbbc9c52b03f091cba4d4ed6c5a915741d6b7fad643facaa217d05775a5b73f01ea912c2cb2258a44361092051548d1ad699c05343375ac4e5d586647afa0db2a6935e9fb6acf070f5170f870d4cda8f9b740f3d9ddab421b7ee0428430d4d0355f5dd94d8a51a44073894ab69fe6aa3a3971e68984d88a4ce5900748e2c3dea4f46d17915d928774853ebbe14a4997a809105b1fbafbc874a2658ae4daa62222fda4c0064c89fef74115a7f57d1bb7062d96537a986fd04f9895a6582db8dddda6b679b320ef97a46aef48f1bb146cd2f24ac7fea9e07b5aebb23b96b2811a3066cc77a32bc1e4d0f43ab8fba14f4b65bdc81d9aa5';

// 解密函数
function decryptData(encryptedData, iv, key) {
  console.log('开始解密数据...');
  console.log('使用密钥:', key);
  console.log('使用IV:', iv);
  
  try {
    const keyHex = CryptoJS.enc.Hex.parse(key);
    const ivHex = CryptoJS.enc.Hex.parse(iv);
    
    // 解析十六进制加密数据
    const ciphertext = CryptoJS.enc.Hex.parse(encryptedData);
    
    // 解密数据
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext },
      keyHex,
      {
        iv: ivHex,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    // 转换为UTF-8字符串
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedText) {
      console.error('解密结果为空');
      return null;
    }
    
    console.log('解密成功，解密字符串长度:', decryptedText.length);
    
    // 保存解密后的原始文本到文件，方便查看完整内容
    fs.writeFileSync('decrypted_data.txt', decryptedText);
    console.log('已将解密结果保存到 decrypted_data.txt');
    
    // 显示解密文本的前后部分
    console.log('\n解密字符串前200个字符:');
    console.log(decryptedText.substring(0, 200));
    
    console.log('\n解密字符串最后100个字符:');
    console.log(decryptedText.substring(decryptedText.length - 100));
    
    // 尝试修复可能不完整的JSON
    let fixedJson = decryptedText;
    
    // 如果是以[开头，可能是数组但结尾不完整
    if (decryptedText.startsWith('[') && !decryptedText.endsWith(']')) {
      console.log('检测到可能是不完整的JSON数组，尝试修复...');
      
      // 找到最后一个完整的对象
      const lastCompleteObjectIndex = decryptedText.lastIndexOf('},');
      
      if (lastCompleteObjectIndex > 0) {
        fixedJson = decryptedText.substring(0, lastCompleteObjectIndex + 1) + ']';
        console.log('已修复JSON，截断到最后一个完整对象');
      }
    }
    
    // 提取前面几个字段分析
    console.log('\n尝试提取JSON中的对象:');
    
    // 使用正则表达式提取JSON对象
    const objectRegex = /\{"id":"([^"]+)","name":"([^"]+)","date":"([^"]+)","size":(\d+)/g;
    let match;
    let count = 0;
    
    while ((match = objectRegex.exec(decryptedText)) && count < 3) {
      console.log(`\n应用 ${++count}:`);
      console.log(`ID: ${match[1]}`);
      console.log(`名称: ${match[2]}`);
      console.log(`日期: ${match[3]}`);
      console.log(`大小: ${(parseInt(match[4]) / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 尝试解析为JSON
    try {
      const jsonData = JSON.parse(fixedJson);
      console.log('\nJSON解析成功，数据类型:', Array.isArray(jsonData) ? '数组' : '对象');
      
      if (Array.isArray(jsonData)) {
        console.log('数组长度:', jsonData.length);
        console.log('\n前两个应用数据:');
        
        jsonData.slice(0, 2).forEach((app, index) => {
          console.log(`\n--- 应用 ${index + 1} ---`);
          console.log(`名称: ${app.name}`);
          console.log(`ID: ${app.id}`);
          console.log(`版本: ${app.version} (${app.build})`);
          console.log(`大小: ${(app.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`标识符: ${app.identifier}`);
          console.log(`需要卡密: ${app.requires_key ? '是' : '否'}`);
          console.log(`图标URL: ${app.web_icon || '无'}`);
        });
      } else {
        console.log('对象内容:', JSON.stringify(jsonData, null, 2));
      }
      
      return jsonData;
    } catch (e) {
      console.error('JSON解析失败:', e.message);
      console.log('无法解析为完整JSON，但已通过正则表达式提取了部分信息');
      return null;
    }
  } catch (error) {
    console.error('解密过程出错:', error.message);
    return null;
  }
}

// 执行解密
console.log('===== 开始测试解密AppFlex API数据 =====');
decryptData(encryptedData, iv, ENCRYPTION_KEY); 