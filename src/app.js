// 加载环境变量
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { initDatabase } = require('./config/database');
const appRoutes = require('./routes/appRoutes');
const cardRoutes = require('./routes/cardRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const plistRoutes = require('./routes/plistRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const appModel = require('./models/appModel');
const cardModel = require('./models/cardModel');
const settingsModel = require('./models/settingsModel');

// 使用环境变量中的端口
const PORT = process.env.PORT || 6677;

// 初始化应用
const app = express();

// 初始化数据库
async function initialize() {
  console.log('开始启动服务器...');
  
  // 初始化数据库
  await initDatabase();
  
  // 初始化设置表和默认配置
  await settingsModel.ensureTable();
  
  // 创建上传目录
  const uploadDir = path.join(__dirname, '../public/uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // 创建应用图标目录
  const iconDir = path.join(__dirname, '../public/uploads/icons');
  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  
  // 创建IPA存储目录
  const ipaDir = path.join(__dirname, '../public/uploads/ipas');
  if (!fs.existsSync(ipaDir)) {
    fs.mkdirSync(ipaDir, { recursive: true });
  }
  
  // 创建plist文件目录
  const plistDir = path.join(__dirname, '../public/uploads/plists');
  if (!fs.existsSync(plistDir)) {
    fs.mkdirSync(plistDir, { recursive: true });
  }
}

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 记录请求日志
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 路由
app.use('/api/users', userRoutes);
app.use('/api/apps', appRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/plist', plistRoutes);
app.use('/api/settings', settingsRoutes);

// 主页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 管理页面
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: '接口不存在' 
  });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 创建一个测试需要卡密的应用
async function createTestApp() {
  try {
    const testAppId = await appModel.insertTestApp();
    console.log('测试应用创建成功, ID:', testAppId);
    
    // 创建测试卡密
    const testCard = await cardModel.createTestCard();
    console.log('测试卡密创建成功:', testCard);
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
  }
}

// 启动服务器函数
const startServer = async () => {
  // 初始化数据库和修复表结构
  await initialize();
  
  // 创建测试数据
  await createTestApp();
  
  // 确保旧的服务器实例被清理
  const server = app.listen(PORT, () => {
    console.log(`服务器成功运行在 http://localhost:${PORT}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`错误: 端口 ${PORT} 已被占用。请先关闭占用该端口的进程，然后重新启动服务器。`);
      console.error(`可以使用 "lsof -i :${PORT}" 命令查找占用端口的进程，然后使用 "kill -9 进程ID" 来终止它。`);
      process.exit(1);
    } else {
      console.error('服务器启动错误:', err);
      process.exit(1);
    }
  });

  // 确保应用正常关闭
  process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });
  
  return server;
};

// 如果直接运行此文件则启动服务器
if (require.main === module) {
  startServer();
}

// 导出app和启动函数
module.exports = {
  app,
  startServer,
  PORT
}; 