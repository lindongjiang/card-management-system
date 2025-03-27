<template>
	<view class="login-container">
		<view class="login-box">
			<view class="logo-area">
				<image class="logo" src="/static/logo.png"></image>
				<text class="title">{{appName}}</text>
			</view>
			
			<view class="input-group">
				<view class="input-item">
					<text class="icon">账号</text>
					<input 
						class="input" 
						type="text" 
						v-model="username" 
						placeholder="请输入用户名" 
						@confirm="handleLogin"
					/>
				</view>
				
				<view class="input-item">
					<text class="icon">密码</text>
					<input 
						class="input" 
						type="password" 
						v-model="password" 
						placeholder="请输入密码" 
						@confirm="handleLogin"
					/>
				</view>
			</view>
			
			<button 
				class="login-btn" 
				type="primary" 
				:loading="loading" 
				:disabled="loading" 
				@click="handleLogin"
			>登录</button>
		</view>
	</view>
</template>

<script>
	import { mapActions, mapState } from 'vuex'
	import { computed } from 'vue'
	
	export default {
		data() {
			return {
				username: '',
				password: ''
			}
		},
		computed: {
			...mapState({
				loading: state => state.loading
			}),
			appName() {
				return uni.$config?.appName || '码头云管理'
			}
		},
		methods: {
			...mapActions(['login']),
			
			async handleLogin() {
				if (!this.username.trim()) {
					uni.$toast('请输入用户名');
					return;
				}
				
				if (!this.password.trim()) {
					uni.$toast('请输入密码');
					return;
				}
				
				try {
					const result = await this.login({
						username: this.username,
						password: this.password
					});
					
					if (result.success) {
						uni.$toast('登录成功');
						uni.switchTab({
							url: '/pages/index/index'
						});
					} else {
						uni.$toast(result.message || '登录失败');
					}
				} catch (error) {
					uni.$toast(error.message || '登录发生错误');
					console.error('登录错误:', error);
				}
			}
		}
	}
</script>

<style>
	.login-container {
		height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		background-color: #f5f5f5;
	}
	
	.login-box {
		width: 80%;
		padding: 40rpx;
		background-color: #fff;
		border-radius: 12rpx;
		box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
	}
	
	.logo-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 60rpx;
	}
	
	.logo {
		width: 160rpx;
		height: 160rpx;
		margin-bottom: 20rpx;
	}
	
	.title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}
	
	.input-group {
		margin-bottom: 60rpx;
	}
	
	.input-item {
		display: flex;
		align-items: center;
		border-bottom: 1rpx solid #eee;
		margin-bottom: 40rpx;
		padding-bottom: 20rpx;
	}
	
	.icon {
		margin-right: 20rpx;
		color: #666;
		font-size: 30rpx;
	}
	
	.input {
		flex: 1;
		height: 60rpx;
		font-size: 28rpx;
	}
	
	.login-btn {
		width: 100%;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 44rpx;
		font-size: 32rpx;
	}
</style> 