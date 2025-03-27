<template>
	<view class="container">
		<!-- 应用信息卡片 -->
		<view class="app-card" v-if="appDetail">
			<view class="app-header">
				<view class="app-name">{{appDetail.name}}</view>
				<view class="app-badge" :class="{'badge-green': !appDetail.requires_key, 'badge-blue': appDetail.requires_key}">
					{{appDetail.requires_key ? '需要卡密' : '无需卡密'}}
				</view>
			</view>
			
			<view class="app-info-list">
				<view class="info-item">
					<text class="info-label">应用ID</text>
					<text class="info-value">{{appDetail.id}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">版本号</text>
					<text class="info-value">{{appDetail.version || '未知'}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">创建时间</text>
					<text class="info-value">{{formatDate(appDetail.created_at)}}</text>
				</view>
				<view class="info-item">
					<text class="info-label">更新时间</text>
					<text class="info-value">{{formatDate(appDetail.updated_at)}}</text>
				</view>
			</view>
		</view>
		
		<!-- 操作区域 -->
		<view class="action-section" v-if="appDetail">
			<view class="action-title">应用管理</view>
			<view class="action-btn-group">
				<button class="action-btn" @click="toggleKeyRequirement">
					{{appDetail.requires_key ? '关闭卡密验证' : '开启卡密验证'}}
				</button>
				<button class="action-btn action-btn-warning" @click="showDeleteConfirm">删除应用</button>
			</view>
		</view>
		
		<!-- 更新表单 -->
		<view class="update-form" v-if="appDetail">
			<view class="form-title">更新应用信息</view>
			<view class="form-item">
				<text class="form-label">应用名称</text>
				<input type="text" class="form-input" v-model="updateForm.name" placeholder="请输入应用名称" />
			</view>
			<view class="form-item">
				<text class="form-label">版本号</text>
				<input type="text" class="form-input" v-model="updateForm.version" placeholder="请输入版本号" />
			</view>
			<button class="form-submit" @click="handleUpdateApp">保存更新</button>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-if="!appDetail && !loading">
			<text class="empty-text">应用信息不存在</text>
			<button class="btn" @click="goBack">返回列表</button>
		</view>
		
		<!-- 加载状态 -->
		<view class="loading-mask" v-if="loading">
			<view class="loading-content">
				<text class="loading-text">加载中...</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState } from 'vuex';
	import api from '../../api';
	
	export default {
		data() {
			return {
				appId: '',
				appDetail: null,
				updateForm: {
					name: '',
					version: ''
				}
			};
		},
		computed: {
			...mapState({
				loading: state => state.loading
			})
		},
		onLoad(options) {
			if (options.id) {
				this.appId = options.id;
				this.loadAppDetail();
			} else {
				this.$toast('缺少应用ID');
				setTimeout(() => {
					this.goBack();
				}, 1500);
			}
		},
		methods: {
			// 加载应用详情
			async loadAppDetail() {
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await api.app.getAppDetail(this.appId);
					if (result.success && result.data) {
						this.appDetail = result.data;
						// 初始化更新表单
						this.updateForm.name = this.appDetail.name;
						this.updateForm.version = this.appDetail.version || '';
					} else {
						this.$toast(result.message || '获取应用详情失败');
					}
				} catch (error) {
					this.$toast('获取应用详情出错');
					console.error('获取应用详情错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
			},
			
			// 更新应用信息
			async handleUpdateApp() {
				if (!this.updateForm.name.trim()) {
					return this.$toast('应用名称不能为空');
				}
				
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await api.app.updateApp(this.appId, {
						name: this.updateForm.name,
						version: this.updateForm.version,
						requires_key: this.appDetail.requires_key
					});
					
					if (result.success) {
						this.$toast('更新应用成功');
						this.loadAppDetail();
					} else {
						this.$toast(result.message || '更新应用失败');
					}
				} catch (error) {
					this.$toast('更新应用出错');
					console.error('更新应用错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
			},
			
			// 切换卡密需求状态
			async toggleKeyRequirement() {
				try {
					this.$store.commit('SET_LOADING', true);
					const requiresKey = !this.appDetail.requires_key;
					const result = await api.app.updateKeyRequirement(this.appId, requiresKey);
					
					if (result.success) {
						this.$toast(`${requiresKey ? '开启' : '关闭'}卡密验证成功`);
						this.loadAppDetail();
					} else {
						this.$toast(result.message || '操作失败');
					}
				} catch (error) {
					this.$toast('操作出错');
					console.error('切换卡密需求状态错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
			},
			
			// 显示删除确认
			showDeleteConfirm() {
				uni.showModal({
					title: '删除确认',
					content: `确定要删除应用"${this.appDetail.name}"吗？此操作不可恢复！`,
					confirmColor: '#FF3B30',
					success: res => {
						if (res.confirm) {
							this.handleDeleteApp();
						}
					}
				});
			},
			
			// 删除应用
			async handleDeleteApp() {
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await api.app.deleteApp(this.appId);
					
					if (result.success) {
						this.$toast('删除应用成功');
						setTimeout(() => {
							this.goBack();
						}, 1500);
					} else {
						this.$toast(result.message || '删除应用失败');
					}
				} catch (error) {
					this.$toast('删除应用出错');
					console.error('删除应用错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
			},
			
			// 返回上一页
			goBack() {
				uni.navigateBack();
			},
			
			// 格式化日期
			formatDate(dateString) {
				if (!dateString) return '未知';
				
				const date = new Date(dateString);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				
				return `${year}-${month}-${day} ${hours}:${minutes}`;
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
	
	.app-card {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.app-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 20rpx;
		border-bottom: 1rpx solid #f0f0f0;
		margin-bottom: 20rpx;
	}
	
	.app-name {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}
	
	.app-badge {
		font-size: 24rpx;
		padding: 6rpx 16rpx;
		border-radius: 20rpx;
		color: #fff;
	}
	
	.badge-blue {
		background-color: #007AFF;
	}
	
	.badge-green {
		background-color: #4CD964;
	}
	
	.app-info-list {
		margin-top: 20rpx;
	}
	
	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16rpx 0;
		border-bottom: 1rpx solid #f9f9f9;
	}
	
	.info-label {
		font-size: 28rpx;
		color: #666;
	}
	
	.info-value {
		font-size: 28rpx;
		color: #333;
	}
	
	.action-section {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.action-title, .form-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 20rpx;
		color: #333;
	}
	
	.action-btn-group {
		display: flex;
		justify-content: space-between;
		margin-top: 20rpx;
	}
	
	.action-btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		font-size: 28rpx;
		color: #fff;
		background-color: #007AFF;
		border-radius: 8rpx;
		margin: 0 10rpx;
	}
	
	.action-btn-warning {
		background-color: #FF3B30;
	}
	
	.update-form {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.form-item {
		margin-bottom: 20rpx;
	}
	
	.form-label {
		font-size: 28rpx;
		color: #666;
		margin-bottom: 10rpx;
		display: block;
	}
	
	.form-input {
		width: 100%;
		height: 80rpx;
		border: 1rpx solid #e5e5e5;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		background-color: #f9f9f9;
	}
	
	.form-submit {
		width: 100%;
		height: 80rpx;
		line-height: 80rpx;
		background-color: #007AFF;
		color: #fff;
		font-size: 28rpx;
		border-radius: 8rpx;
		margin-top: 20rpx;
	}
	
	.empty-state {
		text-align: center;
		padding: 100rpx 0;
	}
	
	.empty-text {
		font-size: 28rpx;
		color: #999;
		margin-bottom: 30rpx;
		display: block;
	}
	
	.btn {
		font-size: 28rpx;
		padding: 16rpx 30rpx;
		border-radius: 8rpx;
		background-color: #007AFF;
		color: #fff;
		line-height: 1.5;
	}
	
	.loading-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 999;
	}
	
	.loading-content {
		background-color: rgba(0, 0, 0, 0.7);
		padding: 40rpx;
		border-radius: 12rpx;
	}
	
	.loading-text {
		color: #fff;
		font-size: 28rpx;
	}
</style> 