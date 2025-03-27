<template>
	<view class="container">
		<!-- 顶部操作区 -->
		<view class="action-bar">
			<view class="search-box">
				<input type="text" v-model="searchKeyword" placeholder="搜索应用名称" />
			</view>
			<button class="btn sync-btn" @click="handleSyncApps">同步应用</button>
		</view>
		
		<!-- 应用列表 -->
		<view class="app-list" v-if="filteredApps.length > 0">
			<view class="app-item" v-for="(app, index) in filteredApps" :key="app.id || index" @click="goToAppDetail(app.id)">
				<view class="app-info">
					<view class="app-name">{{app.name}}</view>
					<view class="app-version">版本: {{app.version || '未知'}}</view>
				</view>
				<view class="app-actions">
					<view class="key-requirement" :class="{'required': app.requires_key}">
						{{app.requires_key ? '需要卡密' : '无需卡密'}}
					</view>
					<view class="action-buttons">
						<view class="app-manage" @click.stop="toggleKeyRequirement(app)">
							{{app.requires_key ? '关闭卡密' : '开启卡密'}}
						</view>
						<view class="app-delete" @click.stop="showDeleteConfirm(app)">
							删除
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<text class="empty-text">暂无应用数据</text>
			<button class="btn" @click="handleSyncApps">立即同步</button>
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
	import { mapState, mapActions } from 'vuex';
	
	export default {
		data() {
			return {
				searchKeyword: ''
			};
		},
		computed: {
			...mapState({
				appList: state => state.appList,
				loading: state => state.loading
			}),
			
			// 过滤后的应用列表
			filteredApps() {
				if (!this.searchKeyword) return this.appList;
				
				const keyword = this.searchKeyword.toLowerCase();
				return this.appList.filter(app => 
					app.name.toLowerCase().includes(keyword)
				);
			}
		},
		onLoad() {
			this.loadData();
		},
		onPullDownRefresh() {
			this.loadData().finally(() => {
				uni.stopPullDownRefresh();
			});
		},
		methods: {
			...mapActions(['fetchAppList', 'syncApps']),
			
			// 加载数据
			async loadData() {
				try {
					await this.fetchAppList();
				} catch (error) {
					this.$toast('加载应用列表失败');
					console.error('加载应用列表错误:', error);
				}
			},
			
			// 同步应用
			async handleSyncApps() {
				try {
					const result = await this.syncApps();
					if (result.success) {
						this.$toast('同步应用成功');
					} else {
						this.$toast(result.message || '同步应用失败');
					}
				} catch (error) {
					this.$toast('同步应用出错');
					console.error('同步应用错误:', error);
				}
			},
			
			// 前往应用详情
			goToAppDetail(appId) {
				if (!appId) return;
				
				uni.navigateTo({
					url: `/pages/apps/detail?id=${appId}`
				});
			},
			
			// 切换卡密需求状态
			async toggleKeyRequirement(app) {
				try {
					const requiresKey = !app.requires_key;
					const result = await this.$store.dispatch('updateKeyRequirement', {
						appId: app.id,
						requiresKey
					});
					
					if (result && result.success) {
						this.$toast(`${requiresKey ? '开启' : '关闭'}卡密验证成功`);
						this.loadData();
					} else {
						this.$toast(result?.message || '操作失败');
					}
				} catch (error) {
					this.$toast('操作出错');
					console.error('切换卡密需求状态错误:', error);
				}
			},
			
			// 显示删除确认
			showDeleteConfirm(app) {
				uni.showModal({
					title: '删除确认',
					content: `确定要删除应用"${app.name}"吗？此操作不可恢复！`,
					confirmColor: '#FF3B30',
					success: res => {
						if (res.confirm) {
							this.handleDeleteApp(app.id);
						}
					}
				});
			},
			
			// 删除应用
			async handleDeleteApp(appId) {
				if (!appId) return;
				
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await this.$store.dispatch('deleteApp', appId);
					
					if (result && result.success) {
						this.$toast('删除应用成功');
						this.loadData();
					} else {
						this.$toast(result?.message || '删除应用失败');
					}
				} catch (error) {
					this.$toast('删除应用出错');
					console.error('删除应用错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
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
	
	.action-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	
	.search-box {
		flex: 1;
		background-color: #fff;
		border-radius: 8rpx;
		padding: 16rpx 20rpx;
		margin-right: 20rpx;
	}
	
	.search-box input {
		width: 100%;
		height: 60rpx;
		font-size: 28rpx;
	}
	
	.btn {
		font-size: 28rpx;
		padding: 16rpx 30rpx;
		border-radius: 8rpx;
		background-color: #007AFF;
		color: #fff;
		line-height: 1.5;
	}
	
	.sync-btn {
		white-space: nowrap;
	}
	
	.app-list {
		margin-bottom: 30rpx;
	}
	
	.app-item {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.app-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.app-version {
		font-size: 24rpx;
		color: #999;
	}
	
	.app-actions {
		text-align: right;
	}
	
	.key-requirement {
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		background-color: #E5E5EA;
		color: #8E8E93;
		display: inline-block;
		margin-bottom: 16rpx;
	}
	
	.key-requirement.required {
		background-color: #007AFF;
		color: #fff;
	}
	
	.action-buttons {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.app-manage {
		font-size: 26rpx;
		color: #007AFF;
	}
	
	.app-delete {
		font-size: 26rpx;
		color: #FF3B30;
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