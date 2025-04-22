const settingsModel = require('../models/settingsModel');
const { verifyVersion } = require('../utils/versionUtils');

/**
 * 设置控制器，负责处理设置相关的请求
 */
class SettingsController {
  /**
   * 获取所有系统设置
   */
  async getAllSettings(req, res) {
    try {
      const settings = await settingsModel.getAllSettings();
      
      return res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('获取设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取设置失败，请稍后重试'
      });
    }
  }
  
  /**
   * 更新设置值
   */
  async updateSetting(req, res) {
    try {
      const { key, value, type } = req.body;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          message: '设置键不能为空'
        });
      }
      
      await settingsModel.updateSetting(key, value, type);
      
      return res.status(200).json({
        success: true,
        message: '设置更新成功'
      });
    } catch (error) {
      console.error('更新设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新设置失败，请稍后重试'
      });
    }
  }
  
  /**
   * 批量更新设置
   */
  async batchUpdateSettings(req, res) {
    try {
      const { settings } = req.body;
      
      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: '无效的设置数据'
        });
      }
      
      for (const setting of settings) {
        if (setting.key) {
          await settingsModel.updateSetting(setting.key, setting.value, setting.type);
        }
      }
      
      return res.status(200).json({
        success: true,
        message: '设置批量更新成功'
      });
    } catch (error) {
      console.error('批量更新设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '批量更新设置失败，请稍后重试'
      });
    }
  }
  
  /**
   * 获取变身设置状态
   */
  async getDisguiseSettings(req, res) {
    try {
      const disguiseEnabled = await settingsModel.getSetting('disguise_enabled');
      const minVersionDisguise = await settingsModel.getSetting('min_version_disguise');
      
      return res.status(200).json({
        success: true,
        data: {
          disguise_enabled: disguiseEnabled,
          min_version_disguise: minVersionDisguise
        }
      });
    } catch (error) {
      console.error('获取变身设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取变身设置失败，请稍后重试'
      });
    }
  }
  
  /**
   * 更新变身设置
   */
  async updateDisguiseSettings(req, res) {
    try {
      const { disguise_enabled, min_version_disguise } = req.body;
      
      if (disguise_enabled !== undefined) {
        await settingsModel.updateSetting('disguise_enabled', disguise_enabled, 'boolean');
      }
      
      if (min_version_disguise) {
        await settingsModel.updateSetting('min_version_disguise', min_version_disguise, 'string');
      }
      
      return res.status(200).json({
        success: true,
        message: '变身设置更新成功'
      });
    } catch (error) {
      console.error('更新变身设置失败:', error);
      return res.status(500).json({
        success: false,
        message: '更新变身设置失败，请稍后重试'
      });
    }
  }
  
  /**
   * 检查客户端变身状态
   */
  async checkDisguiseStatus(req, res) {
    try {
      const { version, udid, advanced, build } = req.query;
      let additionalData = {};
      
      // 如果是高级验证，从请求体中获取额外信息
      if (advanced === 'true' && req.method === 'POST') {
        try {
          additionalData = {
            deviceModel: req.body.device_model,
            osVersion: req.body.os_version,
            location: req.body.location,
            timezone: req.body.timezone,
            locale: req.body.locale,
            timestamp: req.body.timestamp
          };
        } catch (e) {
          console.log('解析高级验证数据出错:', e);
        }
      }
      
      // 获取变身设置
      const disguiseEnabled = await settingsModel.getSetting('disguise_enabled');
      const minVersionDisguise = await settingsModel.getSetting('min_version_disguise');
      
      // 根据版本判断是否需要变身
      let shouldDisguise = disguiseEnabled;
      
      if (version && minVersionDisguise) {
        // 如果客户端版本低于最小变身版本，则不需要变身
        const versionCompare = verifyVersion(version, minVersionDisguise);
        if (versionCompare < 0) {
          shouldDisguise = false;
        }
      }
      
      // 计算过期时间，默认1小时后过期
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = currentTime + 3600;  // 1小时 = 3600秒
      
      return res.status(200).json({
        success: true,
        data: {
          disguise_enabled: shouldDisguise,
          min_version: minVersionDisguise || '1.0.0',
          expiration_time: expirationTime
        }
      });
    } catch (error) {
      console.error('检查变身状态失败:', error);
      return res.status(500).json({
        success: false,
        message: '检查变身状态失败',
        // 默认返回启用变身模式，以确保安全
        data: {
          disguise_enabled: true,
          min_version: '1.0.0',
          expiration_time: Math.floor(Date.now() / 1000) + 3600  // 默认1小时后过期
        }
      });
    }
  }
}

module.exports = new SettingsController(); 