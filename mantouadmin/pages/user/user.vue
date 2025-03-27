<template>
	<view class="container">
		<!-- 用户信息卡片 -->
		<view class="user-card">
			<view class="avatar-section">
				<view class="avatar">
					<text class="avatar-text">{{usernameLetter}}</text>
				</view>
				<view class="user-info">
					<view class="username">{{username}}</view>
					<view class="role-badge" :class="{'role-admin': isAdmin}">
						{{isAdmin ? '管理员' : '普通用户'}}
					</view>
				</view>
			</view>
		</view>
		
		<!-- 功能列表 -->
		<view class="menu-card">
			<view class="menu-title">功能中心</view>
			
			<view class="menu-item" @click="switchToTab('/pages/apps/apps')">
				<view class="menu-icon app-icon">应用</view>
				<view class="menu-text">应用管理</view>
				<view class="menu-arrow">></view>
			</view>
			
			<view class="menu-item" @click="switchToTab('/pages/cards/cards')">
				<view class="menu-icon card-icon">卡密</view>
				<view class="menu-text">卡密管理</view>
				<view class="menu-arrow">></view>
			</view>
			
			<view class="menu-item" @click="navigateTo('/pages/cards/generate')">
				<view class="menu-icon generate-icon">生成</view>
				<view class="menu-text">生成卡密</view>
				<view class="menu-arrow">></view>
			</view>
			
			<view class="menu-item" v-if="isAdmin" @click="navigateTo('/pages/user/admin')">
				<view class="menu-icon admin-icon">用户</view>
				<view class="menu-text">用户管理</view>
				<view class="menu-arrow">></view>
			</view>
		</view>
		
		<!-- 关于信息 -->
		<view class="about-card">
			<view class="menu-title">关于</view>
			
			<view class="menu-item">
				<view class="menu-text">当前版本</view>
				<view class="menu-value">{{appVersion}}</view>
			</view>
		</view>
		
		<!-- 退出登录 -->
		<button class="logout-btn" @click="handleLogout">退出登录</button>
	</view>
</template>

<script>
	import { mapGetters, mapActions } from 'vuex';
	
	export default {
		computed: {
			...mapGetters([
				'isAdmin',
				'username'
			]),
			
			// 用户名首字母
			usernameLetter() {
				if (!this.username) return '?';
				return this.username.charAt(0).toUpperCase();
			},
			
			// 应用版本
			appVersion() {
				return uni.$config?.version || '1.0.0';
			}
		},
		onLoad() {
			// 检查登录状态
			if (!this.$store.getters.isLoggedIn) {
				uni.redirectTo({
					url: '/pages/login/login'
				});
			}
		},
		methods: {
			...mapActions(['logout']),
			
			// 普通页面导航
			navigateTo(url) {
				uni.navigateTo({ url });
			},
			
			// Tabbar页面导航
			switchToTab(url) {
				uni.switchTab({ url });
			},
			
			// 退出登录
			handleLogout() {
				uni.showModal({
					title: '退出确认',
					content: '确定要退出登录吗？',
					success: res => {
						if (res.confirm) {
							this.logout();
							uni.reLaunch({
								url: '/pages/login/login'
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
		padding: 20rpx;
		background-color: #f5f5f5;
		min-height: 100vh;
	}
	
	.user-card, .menu-card, .about-card {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.avatar-section {
		display: flex;
		align-items: center;
	}
	
	.avatar {
		width: 120rpx;
		height: 120rpx;
		border-radius: 60rpx;
		background-color: #007AFF;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 30rpx;
	}
	
	.avatar-text {
		font-size: 60rpx;
		color: #fff;
		font-weight: bold;
	}
	
	.user-info {
		flex: 1;
	}
	
	.username {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.role-badge {
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		background-color: #E5E5EA;
		color: #8E8E93;
		display: inline-block;
	}
	
	.role-admin {
		background-color: #FF9500;
		color: #fff;
	}
	
	.menu-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		color: #333;
	}
	
	.menu-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.menu-item:last-child {
		border-bottom: none;
	}
	
	.menu-icon {
		width: 60rpx;
		height: 60rpx;
		background-color: #007AFF;
		border-radius: 30rpx;
		color: #fff;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 20rpx;
		font-size: 24rpx;
	}
	
	.app-icon {
		background-color: #007AFF;
	}
	
	.card-icon {
		background-color: #FF9500;
	}
	
	.generate-icon {
		background-color: #4CD964;
	}
	
	.admin-icon {
		background-color: #FF3B30;
	}
	
	.menu-text {
		flex: 1;
		font-size: 28rpx;
		color: #333;
	}
	
	.menu-value {
		font-size: 28rpx;
		color: #999;
	}
	
	.menu-arrow {
		font-size: 28rpx;
		color: #ccc;
		margin-left: 20rpx;
	}
	
	.logout-btn {
		width: 100%;
		height: 88rpx;
		line-height: 88rpx;
		background-color: #FF3B30;
		color: #fff;
		font-size: 32rpx;
		border-radius: 8rpx;
		margin-top: 40rpx;
	}
</style> 