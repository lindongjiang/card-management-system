const settingsModel = require('../models/settingsModel');
const { verifyVersion, isValidVersion } = require('../utils/versionUtils');

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
      const maxVersionDisguise = await settingsModel.getSetting('max_version_disguise');
      const versionBlacklist = await settingsModel.getSetting('version_blacklist');
      const versionWhitelist = await settingsModel.getSetting('version_whitelist');
      
      // 获取版本变更历史
      const versionHistory = await settingsModel.getVersionHistory('min_version_disguise', 5);
      
      return res.status(200).json({
        success: true,
        data: {
          disguise_enabled: disguiseEnabled,
          min_version_disguise: minVersionDisguise,
          max_version_disguise: maxVersionDisguise,
          version_blacklist: versionBlacklist,
          version_whitelist: versionWhitelist,
          version_history: versionHistory
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
      const userId = req.user.id;
      const settings = req.body;

      console.log('收到更新变身设置请求:', {
        userId,
        settings
      });

      // 验证必要字段
      if (!settings.min_version_disguise || !settings.max_version_disguise) {
        return res.status(400).json({
          success: false,
          message: '缺少必要参数：最小版本和最大版本'
        });
      }

      // 清理版本号
      const minVersion = String(settings.min_version_disguise).trim();
      const maxVersion = String(settings.max_version_disguise).trim();

      console.log('处理后的版本信息:', {
        minVersion,
        maxVersion,
        type: {
          minVersion: typeof minVersion,
          maxVersion: typeof maxVersion
        }
      });

      // 验证版本格式
      if (!isValidVersion(minVersion)) {
        console.log('最小版本格式验证失败:', minVersion);
        return res.status(400).json({
          success: false,
          message: `最小版本格式不正确: ${minVersion}，请使用 x.y.z 格式`
        });
      }

      if (!isValidVersion(maxVersion)) {
        console.log('最大版本格式验证失败:', maxVersion);
        return res.status(400).json({
          success: false,
          message: `最大版本格式不正确: ${maxVersion}，请使用 x.y.z 格式`
        });
      }

      // 验证版本范围
      if (verifyVersion(minVersion, maxVersion) > 0) {
        console.log('版本范围验证失败:', { minVersion, maxVersion });
        return res.status(400).json({
          success: false,
          message: '最小版本不能大于最大版本'
        });
      }

      // 更新设置
      const result = await settingsModel.updateSetting(userId, 'disguise', {
        ...settings,
        min_version_disguise: minVersion,
        max_version_disguise: maxVersion,
        updated_at: new Date()
      });

      if (!result) {
        return res.status(500).json({
          success: false,
          message: '更新设置失败'
        });
      }

      res.json({
        success: true,
        message: '更新设置成功',
        data: result
      });
    } catch (error) {
      console.error('更新变身设置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新变身设置失败，请稍后重试',
        error: error.message
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
      const maxVersionDisguise = await settingsModel.getSetting('max_version_disguise');
      const versionBlacklist = await settingsModel.getSetting('version_blacklist') || [];
      const versionWhitelist = await settingsModel.getSetting('version_whitelist') || [];
      
      // 根据版本判断是否需要变身
      let shouldDisguise = disguiseEnabled;
      let disableReason = null;
      
      if (version) {
        // 检查白名单优先
        if (Array.isArray(versionWhitelist) && versionWhitelist.length > 0) {
          // 如果有白名单，只有在白名单中的版本才可以变身
          shouldDisguise = versionWhitelist.includes(version);
          if (!shouldDisguise) {
            disableReason = '版本不在白名单中';
          }
        } else {
          // 检查版本是否在黑名单中
          if (Array.isArray(versionBlacklist) && versionBlacklist.includes(version)) {
            shouldDisguise = false;
            disableReason = '版本在黑名单中';
          }
          
          // 检查最小版本要求
          if (shouldDisguise && minVersionDisguise) {
            const versionCompare = verifyVersion(version, minVersionDisguise);
            if (versionCompare < 0) {
              shouldDisguise = false;
              disableReason = '版本低于最小要求';
            }
          }
          
          // 检查最大版本限制
          if (shouldDisguise && maxVersionDisguise) {
            const versionCompare = verifyVersion(version, maxVersionDisguise);
            if (versionCompare > 0) {
              shouldDisguise = false;
              disableReason = '版本高于最大限制';
            }
          }
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
          max_version: maxVersionDisguise || '',
          expiration_time: expirationTime,
          disable_reason: disableReason
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
  
  /**
   * 验证版本格式
   * @param {string} version 版本字符串
   * @returns {boolean} 是否为有效的版本格式
   */
  validateVersionFormat(version) {
    const versionRegex = /^\d+\.\d+\.\d+$/;
    return versionRegex.test(version);
  }
  
  /**
   * 获取版本变更历史
   */
  async getVersionHistory(req, res) {
    try {
      const { key, limit = 10 } = req.query;
      
      if (!key) {
        return res.status(400).json({
          success: false,
          message: '需要指定设置键'
        });
      }
      
      const history = await settingsModel.getVersionHistory(key, parseInt(limit));
      
      return res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('获取版本历史失败:', error);
      return res.status(500).json({
        success: false,
        message: '获取版本历史失败，请稍后重试'
      });
    }
  }
}

module.exports = new SettingsController(); 