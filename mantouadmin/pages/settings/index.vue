<template>
	<view class="container">
		<view class="header">
			<text class="title">系统设置</text>
		</view>
		
		<view class="settings-list">
			<view class="setting-item" @click="navigateToDisguise">
				<view class="setting-icon">
					<text class="iconfont icon-transform">🔄</text>
				</view>
				<view class="setting-content">
					<text class="setting-title">变身控制</text>
					<text class="setting-desc">管理应用变身和伪装方式</text>
				</view>
				<view class="setting-arrow">
					<text class="iconfont icon-right">></text>
				</view>
			</view>
			
			<!-- 其他设置项可以在这里添加 -->
			<view class="setting-item">
				<view class="setting-icon">
					<text class="iconfont icon-info">ℹ️</text>
				</view>
				<view class="setting-content">
					<text class="setting-title">系统信息</text>
					<text class="setting-desc">版本: {{version}} | API状态: {{apiStatus}}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import config from '../../config/index.js';

export default {
	data() {
		return {
			version: config.version || '1.0.0',
			apiStatus: '检查中...'
		}
	},
	onLoad() {
		// 检查API状态
		this.checkApiStatus();
	},
	methods: {
		navigateToDisguise() {
			console.log('正在导航到变身控制页面');
			
			// 使用全局导航方法
			if (uni.$navigateTo) {
				uni.$navigateTo('/pages/settings/disguise');
			} else {
				// 备用导航方式
				try {
					uni.navigateTo({
						url: '/pages/settings/disguise',
						fail: (err) => {
							console.error('导航失败:', err);
							
							// 尝试不带前导斜杠的路径
							uni.navigateTo({
								url: 'disguise',
								fail: (err2) => {
									console.error('备用导航也失败:', err2);
									uni.showToast({
										title: '无法打开变身控制页面',
										icon: 'none'
									});
								}
							});
						}
					});
				} catch (e) {
					console.error('导航异常:', e);
					uni.showToast({
						title: '页面跳转异常',
						icon: 'none'
					});
				}
			}
		},
		checkApiStatus() {
			const apiUrl = config.apiBaseUrl || 'https://renmai.cloudmantoub.online';
			console.log('检查API状态, URL:', apiUrl);
			
			// 使用ping接口检查状态
			uni.request({
				url: `${apiUrl}/api/client/ping`,
				method: 'GET',
				timeout: 5000,
				success: (res) => {
					console.log('API状态检查结果:', res);
					if (res.statusCode === 200 && res.data && res.data.status === 'ok') {
						this.apiStatus = '正常';
					} else {
						this.apiStatus = '异常';
					}
				},
				fail: (err) => {
					console.error('API状态检查失败:', err);
					this.apiStatus = '离线';
					
					// 测试API连接
					if (config.testApiConnection) {
						config.testApiConnection((workingUrl, success) => {
							if (success) {
								this.apiStatus = '已恢复';
								console.log('使用备用API URL:', workingUrl);
							}
						});
					}
				}
			});
		}
	}
}
</script>

<style lang="scss">
.container {
	padding: 20px;
}

.header {
	margin-bottom: 30px;
	
	.title {
		font-size: 24px;
		font-weight: bold;
	}
}

.settings-list {
	.setting-item {
		display: flex;
		align-items: center;
		padding: 15px;
		margin-bottom: 15px;
		background-color: #ffffff;
		border-radius: 10px;
		box-shadow: 0 2px 5px rgba(0,0,0,0.05);
		
		&:active {
			background-color: #f5f5f5;
		}
	}
	
	.setting-icon {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f0f8ff;
		border-radius: 50%;
		margin-right: 15px;
		
		.iconfont {
			font-size: 20px;
			color: #409eff;
		}
	}
	
	.setting-content {
		flex: 1;
		
		.setting-title {
			font-size: 16px;
			font-weight: 500;
			margin-bottom: 5px;
		}
		
		.setting-desc {
			font-size: 12px;
			color: #999;
		}
	}
	
	.setting-arrow {
		.iconfont {
			color: #ccc;
		}
	}
}
</style> 