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

module.exports = {
  verifyVersion
}; 