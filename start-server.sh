#!/bin/bash

# 清理端口和进程
./clean-ports.sh

# 设置环境变量
export JWT_SECRET="cloud_admin_secret_key"
export ENCRYPTION_KEY="5486abfd96080e09e82bb2ab93258bde19d069185366b5aa8d38467835f2e7aa"
export NODE_ENV="production"

# 重新验证重要文件夹是否存在
mkdir -p public/uploads/plists
mkdir -p public/uploads/ipas
mkdir -p public/uploads/icons

# 启动服务器
echo "启动服务器..."
node src/app.js 