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
		
		<!-- UDID检查区域 -->
		<view class="udid-check-section">
			<view class="section-title">UDID检查工具</view>
			<view class="udid-form">
				<input 
					type="text" 
					class="udid-input" 
					v-model="udidInput" 
					placeholder="请输入设备UDID" 
				/>
				<button class="check-button" @click="checkUdid">检查状态</button>
			</view>
			
			<!-- 检查结果区域 -->
			<view class="udid-result" v-if="udidResult">
				<view class="result-item">
					<text class="result-label">绑定状态:</text>
					<text class="result-value" :class="{'bound': udidResult.data.bound, 'unbound': !udidResult.data.bound}">
						{{udidResult.data.bound ? '已绑定' : '未绑定'}}
					</text>
				</view>
				
				<view class="bindings-list" v-if="udidResult.data.bound && udidResult.data.bindings.length > 0">
					<view class="bindings-title">绑定详情:</view>
					<view class="binding-item" v-for="(binding, index) in udidResult.data.bindings" :key="index">
						<text class="binding-detail">卡密: {{binding.card_key}}</text>
						<text class="binding-detail">绑定时间: {{formatDate(binding.created_at)}}</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 主要导航菜单 -->
		<!-- <view class="nav-section">
			<view class="nav-grid">
				<view class="nav-item" @click="navigateTo('/pages/apps/apps')">
					<view class="nav-icon app-icon">应用</view>
					<text class="nav-name">应用管理</text>
				</view>
				
				<view class="nav-item" @click="navigateTo('/pages/cards/cards')">
					<view class="nav-icon card-icon">卡密</view>
					<text class="nav-name">卡密管理</text>
				</view>
				
				<view class="nav-item" @click="navigateTo('/pages/cards/generate')">
					<view class="nav-icon generate-icon">生成</view>
					<text class="nav-name">生成卡密</text>
				</view>
				
				<view class="nav-item" @click="navigateTo('/pages/bindings/bindings')">
					<view class="nav-icon binding-icon">绑定</view>
					<text class="nav-name">UDID绑定</text>
				</view>
				
				<view class="nav-item" v-if="isAdmin" @click="navigateTo('/pages/user/admin')">
					<view class="nav-icon admin-icon">用户</view>
					<text class="nav-name">用户管理</text>
				</view>
			</view>
		</view> -->
	</view>
</template>

<script>
	import { mapState, mapGetters, mapActions } from 'vuex'
	
	export default {
		data() {
			return {
				currentDate: '',
				udidInput: '',
				udidResult: null
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
			
			// 检查UDID状态
			async checkUdid() {
				if (!this.udidInput || this.udidInput.trim() === '') {
					this.$toast('请输入UDID');
					return;
				}
				
				try {
					const res = await this.$http.get(`/api/client/check-udid?udid=${encodeURIComponent(this.udidInput.trim())}`);
					this.udidResult = res.data;
				} catch (error) {
					this.$toast('检查UDID失败');
					console.error('检查UDID错误:', error);
				}
			},
			
			// 格式化日期
			formatDate(dateString) {
				const date = new Date(dateString);
				return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
	
	.nav-section {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.nav-grid {
		display: flex;
		flex-wrap: wrap;
	}
	
	.nav-item {
		width: 25%;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 30rpx;
	}
	
	.nav-icon {
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
		background-color: #5856D6;
	}
	
	.admin-icon {
		background-color: #FF3B30;
	}
	
	.nav-name {
		font-size: 24rpx;
		color: #666;
	}
	
	/* UDID检查样式 */
	.udid-check-section {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.section-title {
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
	}
	
	.udid-form {
		display: flex;
		margin-bottom: 20rpx;
	}
	
	.udid-input {
		flex: 1;
		height: 80rpx;
		border: 1px solid #ddd;
		border-radius: 8rpx;
		padding: 0 20rpx;
		margin-right: 20rpx;
		font-size: 26rpx;
	}
	
	.check-button {
		background-color: #007AFF;
		color: #fff;
		height: 80rpx;
		line-height: 80rpx;
		font-size: 26rpx;
		padding: 0 30rpx;
		border-radius: 8rpx;
	}
	
	.udid-result {
		background-color: #f5f5f5;
		border-radius: 8rpx;
		padding: 20rpx;
	}
	
	.result-item {
		display: flex;
		margin-bottom: 10rpx;
	}
	
	.result-label {
		width: 150rpx;
		font-size: 26rpx;
		color: #666;
	}
	
	.result-value {
		flex: 1;
		font-size: 26rpx;
		font-weight: bold;
	}
	
	.bound {
		color: #4CD964;
	}
	
	.unbound {
		color: #FF3B30;
	}
	
	.bindings-title {
		font-size: 26rpx;
		color: #666;
		margin: 10rpx 0;
	}
	
	.binding-item {
		background-color: white;
		border-radius: 8rpx;
		padding: 10rpx 20rpx;
		margin-bottom: 10rpx;
	}
	
	.binding-detail {
		font-size: 24rpx;
		color: #333;
		display: block;
		margin: 5rpx 0;
	}
</style>
