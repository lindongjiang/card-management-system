#!/bin/bash

# 显示标题
echo "====================================================="
echo "           AppFlex API 数据查看工具                   "
echo "====================================================="

# 安装依赖（如果未安装）
if ! npm list crypto-js > /dev/null 2>&1; then
  echo "正在安装必要的依赖..."
  npm install crypto-js
fi

# 打印分隔线
print_separator() {
  echo -e "\n-----------------------------------------------------"
  echo "$1"
  echo "-----------------------------------------------------"
}

# 询问用户选择操作
echo "请选择操作："
echo "1. 打印所有应用列表"
echo "2. 打印特定应用详情"
echo "3. 检查特定设备UDID状态"
echo "4. 退出"
echo

read -p "请输入选项 [1-4]: " choice

case $choice in
  1)
    print_separator "正在获取所有应用列表数据..."
    node print-api-data.js
    ;;
  2)
    print_separator "打印特定应用详情"
    echo "先获取所有应用列表的ID..."
    node print-api-data.js | grep "#" | grep -v "概要"
    echo
    read -p "请输入应用ID: " app_id
    read -p "请输入UDID (可选，按Enter跳过): " udid
    
    if [ -z "$udid" ]; then
      node print-app-detail.js "$app_id"
    else
      node print-app-detail.js "$app_id" "$udid"
    fi
    ;;
  3)
    print_separator "检查UDID状态"
    read -p "请输入UDID: " udid
    read -p "请输入应用ID (可选，按Enter跳过): " app_id
    
    echo "功能尚未实现，请稍后再试"
    ;;
  4)
    echo "感谢使用！再见！"
    exit 0
    ;;
  *)
    echo "无效选项，请重新运行脚本"
    exit 1
    ;;
esac

echo -e "\n操作完成！" 