/**
 * 卡密管理系统 - 服务器启动文件
 * 用于启动API服务器
 */

// 导入主应用
const { startServer, PORT } = require('../src/app');

// 确保环境变量设置
const JWT_SECRET = process.env.JWT_SECRET || 'cloud_admin_secret_key';
process.env.JWT_SECRET = JWT_SECRET;

console.log(`服务器将运行在端口: ${PORT}`);
console.log(`服务器使用的JWT密钥: ${JWT_SECRET === 'cloud_admin_secret_key' ? '默认密钥' : '自定义密钥'}`);
console.log('服务器初始化完成，正在启动...');

// 启动服务器
const server = startServer();

// 导出服务器实例
module.exports = server; 