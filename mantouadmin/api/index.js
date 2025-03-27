import config from '../config';

// 封装请求函数
const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token');
    
    uni.request({
      url: `${config.apiBaseUrl}/api${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 401) {
          // 未授权，跳转到登录页
          uni.removeStorageSync('token');
          uni.removeStorageSync('userInfo');
          uni.reLaunch({
            url: '/pages/login/login'
          });
          reject(new Error('未授权，请重新登录'));
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data || new Error('请求失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// API模块
export default {
  // 用户认证相关
  auth: {
    // 用户登录
    login: (username, password) => {
      return request('/auth/login', {
        method: 'POST',
        data: { username, password }
      });
    },
    // 验证token
    verifyToken: (token) => {
      return request('/auth/verify', {
        method: 'POST',
        data: { token }
      });
    }
  },
  
  // 用户管理相关
  user: {
    // 获取用户列表
    getUsers: () => {
      return request('/users');
    },
    // 创建用户
    createUser: (userData) => {
      return request('/users', {
        method: 'POST',
        data: userData
      });
    },
    // 删除用户
    deleteUser: (userId) => {
      return request(`/users/${userId}`, {
        method: 'DELETE'
      });
    }
  },
  
  // 应用管理相关
  app: {
    // 获取所有应用
    getAllApps: () => {
      return request('/apps');
    },
    // 获取应用列表
    getAppList: () => {
      return request('/apps/list');
    },
    // 获取应用详情
    getAppDetail: (appId) => {
      return request(`/apps/${appId}`);
    },
    // 更新应用信息
    updateApp: (appId, appData) => {
      return request(`/apps/${appId}`, {
        method: 'PUT',
        data: appData
      });
    },
    // 更新应用卡密需求
    updateKeyRequirement: (appId, requiresKey) => {
      return request(`/apps/${appId}/key-requirement`, {
        method: 'PUT',
        data: { requiresKey }
      });
    },
    // 删除应用
    deleteApp: (appId) => {
      return request(`/apps/${appId}`, {
        method: 'DELETE'
      });
    },
    // 同步应用数据
    syncApps: () => {
      return request('/apps/sync', {
        method: 'POST'
      });
    }
  },
  
  // 卡密管理相关
  card: {
    // 获取所有卡密
    getAllCards: () => {
      return request('/cards');
    },
    // 获取卡密列表
    getCardList: () => {
      return request('/cards/list');
    },
    // 生成卡密
    generateCards: (params) => {
      return request('/cards/generate', {
        method: 'POST',
        data: params
      });
    },
    // 导入卡密
    importCards: (cards) => {
      return request('/cards/import', {
        method: 'POST',
        data: { cards }
      });
    },
    // 验证卡密
    verifyCard: (cardCode, appId) => {
      return request('/cards/verify', {
        method: 'POST',
        data: { cardCode, appId }
      });
    },
    // 获取卡密统计
    getCardStats: () => {
      return request('/cards/stats');
    },
    // 更新卡密
    updateCard: (cardId, cardData) => {
      return request(`/cards/${cardId}`, {
        method: 'PUT',
        data: cardData
      });
    },
    // 删除卡密
    deleteCard: (cardId) => {
      return request(`/cards/${cardId}`, {
        method: 'DELETE'
      });
    },
    // 获取所有UDID绑定
    getAllBindings: () => {
      return request('/cards/bindings');
    },
    // 添加UDID绑定
    addBinding: (udid, cardKey) => {
      return request('/cards/bindings', {
        method: 'POST',
        data: { udid, cardKey }
      });
    },
    // 删除UDID绑定
    deleteBinding: (bindingId) => {
      return request(`/cards/bindings/${bindingId}`, {
        method: 'DELETE'
      });
    }
  }
}; 