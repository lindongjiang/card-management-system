import config from '../config/index.js';

class VersionApi {
  constructor() {
    this.baseUrl = config.apiBaseUrl;
  }

  // 获取版本控制设置
  async getVersionSettings() {
    try {
      const token = uni.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      const response = await uni.request({
        url: `${this.baseUrl}/api/settings/disguise`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.statusCode === 200 && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || '获取版本设置失败');
      }
    } catch (error) {
      console.error('获取版本设置失败:', error);
      throw error;
    }
  }

  // 更新版本控制设置
  async updateVersionSettings(settings) {
    try {
      const token = uni.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      const response = await uni.request({
        url: `${this.baseUrl}/api/settings/disguise`,
        method: 'PUT',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          ...settings,
          disguise_enabled: true // 确保启用变身功能
        }
      });

      if (response.statusCode === 200 && response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data?.message || '更新版本设置失败');
      }
    } catch (error) {
      console.error('更新版本设置失败:', error);
      throw error;
    }
  }

  // 检查版本状态
  async checkVersionStatus(version) {
    try {
      const response = await uni.request({
        url: `${this.baseUrl}/api/client/disguise-check`,
        method: 'GET',
        data: { version }
      });

      if (response.statusCode === 200 && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || '检查版本状态失败');
      }
    } catch (error) {
      console.error('检查版本状态失败:', error);
      throw error;
    }
  }

  // 获取版本历史记录
  async getVersionHistory(limit = 10) {
    try {
      const token = uni.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      const response = await uni.request({
        url: `${this.baseUrl}/api/settings/version-history`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        },
        data: { limit }
      });

      if (response.statusCode === 200 && response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data?.message || '获取版本历史失败');
      }
    } catch (error) {
      console.error('获取版本历史失败:', error);
      throw error;
    }
  }
}

export default new VersionApi(); 