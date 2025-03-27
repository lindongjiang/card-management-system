#!/bin/bash

# 清理端口和进程
./clean-ports.sh

# 设置环境变量
export JWT_SECRET="cloud_admin_secret_key"

# 启动服务器
echo "启动服务器..."
node src/app.js 