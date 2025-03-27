const jwt = require('jsonwebtoken');

// 验证JWT令牌
const verifyToken = (req, res, next) => {
  console.log('[Auth middleware] 验证令牌');
  console.log('[Auth middleware] 请求头:', req.headers);
  
  const authHeader = req.headers.authorization;
  console.log('[Auth middleware] Authorization 头:', authHeader);
  
  if (!authHeader) {
    console.log('[Auth middleware] 未提供 Authorization 头');
    return res.status(401).json({
      success: false,
      message: '未提供令牌'
    });
  }
  
  // 验证Bearer格式
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.log('[Auth middleware] 令牌格式错误');
    return res.status(401).json({
      success: false,
      message: '令牌格式错误'
    });
  }
  
  const token = tokenParts[1];
  console.log('[Auth middleware] 提取的令牌:', token.substring(0, 10) + '...');
  
  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key';
    console.log('[Auth middleware] 使用密钥:', JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[Auth middleware] 解码的令牌:', decoded);
    req.user = decoded;
    console.log('[Auth middleware] 验证通过');
    next();
  } catch (error) {
    console.log('[Auth middleware] 令牌验证失败:', error.message);
    return res.status(401).json({
      success: false,
      message: '无效的令牌'
    });
  }
};

// 检查是否是管理员
const isAdmin = (req, res, next) => {
  console.log('[Auth middleware] 检查管理员权限');
  console.log('[Auth middleware] 用户信息:', req.user);
  
  if (req.user && req.user.role === 'admin') {
    console.log('[Auth middleware] 是管理员，允许访问');
    next();
  } else {
    console.log('[Auth middleware] 非管理员，拒绝访问');
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
};

module.exports = {
  verifyToken,
  isAdmin
}; 