<template>
	<view class="container">
		<!-- 顶部欢迎区域 -->
		<view class="welcome-section">
			<view class="welcome-text">
				<text class="greeting">您好，{{username}}</text>
				<text class="date">{{currentDate}}</text>
			</view>
		</view>
		
		<!-- 统计卡片区域 -->
		<view class="stats-section">
			<view class="stats-card" @click="navigateTo('/pages/apps/apps')">
				<view class="stats-value">{{appList.length}}</view>
				<view class="stats-label">应用总数</view>
			</view>
			
			<view class="stats-card" @click="navigateTo('/pages/cards/cards')">
				<view class="stats-value">{{availableCardCount}}</view>
				<view class="stats-label">可用卡密</view>
			</view>
			
			<view class="stats-card" @click="navigateTo('/pages/cards/cards')">
				<view class="stats-value">{{usedCardCount}}</view>
				<view class="stats-label">已用卡密</view>
			</view>
			
			<view class="stats-card" @click="navigateTo('/pages/cards/cards')">
				<view class="stats-value">{{totalCardCount}}</view>
				<view class="stats-label">总卡密数</view>
			</view>
		</view>
		
		<!-- 常用功能 -->
		<view class="function-section">
			<view class="section-title">常用功能</view>
			<view class="function-grid">
				<view class="function-item" @click="navigateTo('/pages/apps/apps')">
					<view class="function-icon app-icon">应用</view>
					<text class="function-name">应用管理</text>
				</view>
				
				<view class="function-item" @click="navigateTo('/pages/cards/cards')">
					<view class="function-icon card-icon">卡密</view>
					<text class="function-name">卡密管理</text>
				</view>
				
				<view class="function-item" @click="navigateTo('/pages/cards/generate')">
					<view class="function-icon generate-icon">生成</view>
					<text class="function-name">生成卡密</text>
				</view>
				
				<view class="function-item" @click="navigateTo('/pages/bindings/bindings')">
					<view class="function-icon binding-icon">绑定</view>
					<text class="function-name">UDID绑定</text>
				</view>
				
				<view class="function-item" v-if="isAdmin" @click="navigateTo('/pages/user/admin')">
					<view class="function-icon admin-icon">用户</view>
					<text class="function-name">用户管理</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapGetters, mapActions } from 'vuex'
	
	export default {
		data() {
			return {
				currentDate: ''
			}
		},
		computed: {
			...mapState({
				appList: state => state.appList,
				cardStats: state => state.cardStats
			}),
			...mapGetters([
				'isAdmin',
				'username',
				'availableCardCount',
				'usedCardCount',
				'totalCardCount'
			])
		},
		onLoad() {
			// 检查登录状态
			if (!this.$store.getters.isLoggedIn) {
				uni.redirectTo({
					url: '/pages/login/login'
				});
				return;
			}
			
			// 设置当前日期
			this.setCurrentDate();
			
			// 加载数据
			this.loadData();
		},
		onPullDownRefresh() {
			this.loadData().finally(() => {
				uni.stopPullDownRefresh();
			});
		},
		methods: {
			...mapActions([
				'fetchAppList',
				'fetchCardStats'
			]),
			
			// 设置当前日期
			setCurrentDate() {
				const date = new Date();
				const year = date.getFullYear();
				const month = date.getMonth() + 1;
				const day = date.getDate();
				const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
				const weekday = weekdays[date.getDay()];
				
				this.currentDate = `${year}年${month}月${day}日 ${weekday}`;
			},
			
			// 加载数据
			async loadData() {
				try {
					await Promise.all([
						this.fetchAppList(),
						this.fetchCardStats()
					]);
				} catch (error) {
					this.$toast('数据加载失败');
					console.error('数据加载错误:', error);
				}
			},
			
			// 页面导航
			navigateTo(url) {
				uni.navigateTo({ url });
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
	
	.welcome-section {
		background-color: #007AFF;
		padding: 40rpx 30rpx;
		border-radius: 12rpx;
		margin-bottom: 20rpx;
	}
	
	.welcome-text {
		color: #fff;
	}
	
	.greeting {
		font-size: 36rpx;
		font-weight: bold;
		display: block;
		margin-bottom: 10rpx;
	}
	
	.date {
		font-size: 24rpx;
		opacity: 0.8;
	}
	
	.stats-section {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		margin-bottom: 30rpx;
	}
	
	.stats-card {
		width: 48%;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		text-align: center;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.stats-value {
		font-size: 48rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.stats-label {
		font-size: 24rpx;
		color: #999;
	}
	
	.function-section {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		color: #333;
	}
	
	.function-grid {
		display: flex;
		flex-wrap: wrap;
	}
	
	.function-item {
		width: 25%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.function-icon {
		width: 80rpx;
		height: 80rpx;
		background-color: #007AFF;
		border-radius: 50%;
		color: #fff;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-bottom: 16rpx;
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
	
	.binding-icon {
		background-color: #FF9500;
	}
	
	.admin-icon {
		background-color: #FF3B30;
	}
	
	.function-name {
		font-size: 24rpx;
		color: #666;
	}
</style>
