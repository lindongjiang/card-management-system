/**
 * 比较两个版本号
 * @param {string} version1 - 版本号1
 * @param {string} version2 - 版本号2
 * @returns {number} - 如果version1 > version2返回1，如果version1 < version2返回-1，如果相等返回0
 */
function verifyVersion(version1, version2) {
  if (!version1 || !version2) {
    return 0;
  }
  
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  // 确保两个版本号数组长度相同
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  while (v1Parts.length < maxLength) v1Parts.push(0);
  while (v2Parts.length < maxLength) v2Parts.push(0);
  
  // 逐位比较版本号
  for (let i = 0; i < maxLength; i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;
    
    if (part1 > part2) return 1;
    if (part1 < part2) return -1;
  }
  
  return 0;
}

/**
 * 验证版本是否为有效格式
 * @param {string} version - 版本号
 * @returns {boolean} - 是否为有效格式
 */
function isValidVersion(version) {
  if (!version) return false;
  // 基本格式验证：x.y.z 格式
  const versionRegex = /^\d+\.\d+\.\d+$/;
  return versionRegex.test(version);
}

/**
 * 检查版本是否符合区间要求
 * @param {string} version - 要检查的版本
 * @param {string} minVersion - 最小版本（包含）
 * @param {string} maxVersion - 最大版本（包含）
 * @returns {boolean} - 是否在区间内
 */
function isVersionInRange(version, minVersion, maxVersion) {
  // 如果未指定版本区间，则视为通过
  if (!version) return false;
  if (!minVersion && !maxVersion) return true;
  
  // 只指定了最小版本
  if (minVersion && !maxVersion) {
    return verifyVersion(version, minVersion) >= 0;
  }
  
  // 只指定了最大版本
  if (!minVersion && maxVersion) {
    return verifyVersion(version, maxVersion) <= 0;
  }
  
  // 同时指定了最小版本和最大版本
  return verifyVersion(version, minVersion) >= 0 && verifyVersion(version, maxVersion) <= 0;
}

/**
 * 检查版本是否在指定的版本列表中
 * @param {string} version - 要检查的版本
 * @param {Array<string>} versionList - 版本列表
 * @returns {boolean} - 是否在列表中
 */
function isVersionInList(version, versionList) {
  if (!version || !versionList || !Array.isArray(versionList)) return false;
  return versionList.includes(version);
}

module.exports = {
  verifyVersion,
  isValidVersion,
  isVersionInRange,
  isVersionInList
}; 