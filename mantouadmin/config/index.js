export default {
  // API基础URL
  apiBaseUrl: 'https://renmai.cloudmantoub.online',
  
  // 备用API URL列表（按优先级排序）
  fallbackApiUrls: [
    'http://renmai.cloudmantoub.online',
    'http://localhost:6677'
  ],
  
  // 应用名称
  appName: '云服务管理系统',
  
  // 版本
  version: '1.0.0',
  
  // 默认分页大小
  pageSize: 10,
  
  // 测试API连接并切换到可用URL
  testApiConnection(callback) {
    const testUrl = (url, next) => {
      console.log('测试API连接:', url);
      uni.request({
        url: url + '/api/client/ping',
        method: 'GET',
        timeout: 3000,
        success: () => {
          console.log('API连接成功:', url);
          callback(url, true);
        },
        fail: () => {
          console.log('API连接失败:', url);
          next();
        }
      });
    };
    
    // 先测试主URL
    testUrl(this.apiBaseUrl, () => {
      // 主URL失败，依次测试备用URL
      let index = 0;
      const tryNextUrl = () => {
        if (index >= this.fallbackApiUrls.length) {
          // 所有URL都失败
          callback(this.apiBaseUrl, false);
          return;
        }
        
        testUrl(this.fallbackApiUrls[index], () => {
          index++;
          tryNextUrl();
        });
      };
      
      tryNextUrl();
    });
  }
}; 