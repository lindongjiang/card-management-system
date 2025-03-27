#!/bin/bash

echo "清理所有Node进程..."
killall -9 node 2>/dev/null || echo "没有找到Node进程"

echo "清理端口6677..."
lsof -ti:6677 | xargs kill -9 2>/dev/null || echo "端口6677没有被占用"

echo "等待端口释放..."
sleep 2

echo "端口清理完成" 