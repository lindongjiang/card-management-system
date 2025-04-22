<template>
	<view class="container">
		<view class="header">
			<text class="title">系统设置</text>
		</view>
		
		<view class="section">
			<view class="section-title">应用设置</view>
			<view class="menu-list">
				<view class="menu-item" @click="navigateTo('/pages/settings/disguise')">
					<text class="menu-label">变身控制</text>
					<text class="menu-arrow">></text>
				</view>
				<view class="menu-item">
					<text class="menu-label">API基础URL</text>
					<text class="menu-arrow">></text>
				</view>
			</view>
		</view>
		
		<view class="section">
			<view class="section-title">系统信息</view>
			<view class="menu-list">
				<view class="menu-item">
					<text class="menu-label">当前版本</text>
					<text class="menu-value">{{version}}</text>
				</view>
				<view class="menu-item">
					<text class="menu-label">API状态</text>
					<view class="api-status" :class="{'online': apiOnline, 'offline': !apiOnline}">
						<text>{{apiOnline ? '在线' : '离线'}}</text>
					</view>
				</view>
			</view>
		</view>
		
		<view class="section">
			<view class="section-title">账户设置</view>
			<view class="menu-list">
				<view class="menu-item" @click="logout">
					<text class="menu-label danger">退出登录</text>
					<text class="menu-arrow">></text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			version: this.$config.version,
			apiOnline: true,
			loading: false
		}
	},
	onShow() {
		this.checkAPIStatus();
	},
	methods: {
		navigateTo(url) {
			uni.navigateTo({
				url
			});
		},
		
		checkAPIStatus() {
			this.loading = true;
			uni.request({
				url: this.$config.apiBaseUrl + '/api/client/ping',
				method: 'GET',
				timeout: 5000,
				success: () => {
					this.apiOnline = true;
				},
				fail: () => {
					this.apiOnline = false;
				},
				complete: () => {
					this.loading = false;
				}
			});
		},
		
		logout() {
			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						uni.removeStorageSync('token');
						uni.removeStorageSync('user');
						uni.reLaunch({
							url: '/pages/login/index'
						});
					}
				}
			});
		}
	}
}
</script>

<style>
.container {
	padding: 15px;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.header {
	padding: 15px 0;
	margin-bottom: 15px;
}

.title {
	font-size: 20px;
	font-weight: bold;
}

.section {
	margin-bottom: 20px;
}

.section-title {
	font-size: 16px;
	color: #666;
	margin-bottom: 10px;
	padding-left: 5px;
}

.menu-list {
	background-color: #fff;
	border-radius: 10px;
	overflow: hidden;
}

.menu-item {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	padding: 15px;
	border-bottom: 1px solid #f0f0f0;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-label {
	font-size: 16px;
}

.menu-value {
	font-size: 16px;
	color: #999;
}

.menu-arrow {
	color: #ccc;
	font-size: 18px;
}

.api-status {
	padding: 3px 10px;
	border-radius: 15px;
	font-size: 14px;
}

.online {
	background-color: #e1f3d8;
	color: #67c23a;
}

.offline {
	background-color: #fde2e2;
	color: #f56c6c;
}

.danger {
	color: #f56c6c;
}
</style> 