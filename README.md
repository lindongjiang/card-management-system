# IPA卡密管理系统

基于Node.js和MySQL的IPA应用卡密管理后台系统，提供API转发、卡密生成和验证等功能。

## 功能特性

- 从外部API同步应用数据
- 支持卡密生成、导入和管理
- 支持UDID与卡密绑定
- 根据卡密验证控制plist访问权限

## 系统要求

- Node.js 14+
- MySQL 5.7+

## 安装与运行

1. 安装依赖

```bash
npm install
```

2. 启动应用

```bash
npm start
```

开发模式启动（自动重启）:

```bash
npm run dev
```

## API接口说明

### 应用管理

- `POST /api/apps/sync` - 同步应用数据
- `GET /api/apps/list` - 获取应用列表
- `GET /api/apps/:id` - 获取应用详情
- `PUT /api/apps/:id/key-requirement` - 更新应用卡密需求

### 卡密管理

- `POST /api/cards/generate` - 生成卡密
- `POST /api/cards/import` - 导入卡密
- `POST /api/cards/verify` - 验证卡密并获取plist
- `GET /api/cards/list` - 获取卡密列表
- `GET /api/cards/stats` - 获取卡密统计

## 数据库设计

系统使用MySQL数据库，主要包含以下表：

- `apps` - 存储应用信息
- `cards` - 存储卡密信息
- `bindings` - 存储UDID和卡密的绑定关系

## 使用流程

1. 通过`/api/apps/sync`API同步最新应用数据
2. 通过`/api/cards/generate`生成卡密
3. 用户获取应用列表，如需卡密，则提交卡密验证
4. 卡密验证成功后，用户可获取应用的plist链接

## 注意事项

- 每个卡密只能使用一次
- 同一个UDID不需要重复验证相同应用
- 建议定期同步应用数据以保持最新 