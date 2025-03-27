<template>
	<view class="container">
		<view class="action-bar">
			<view class="search-box">
				<input type="text" v-model="keyword" placeholder="搜索UDID" @input="filterBindings" />
			</view>
			<view class="btn add-btn" @click="showAddBindingModal">新增绑定</view>
		</view>
		
		<view v-if="loading" class="loading-mask">
			<view class="loading-content">
				<view class="loading-text">加载中...</view>
			</view>
		</view>
		
		<!-- 绑定列表 -->
		<view class="binding-list" v-if="filteredBindings.length > 0">
			<view class="binding-item" v-for="binding in filteredBindings" :key="binding.id">
				<view class="binding-info">
					<view class="binding-udid">{{ binding.udid }}</view>
					<view class="binding-card">卡密: {{ binding.card_key }}</view>
					<view class="binding-app" v-if="binding.app_name">应用: {{ binding.app_name }}</view>
					<view class="binding-date">绑定时间: {{ formatDate(binding.created_at) }}</view>
				</view>
				<view class="binding-actions">
					<view class="binding-delete" @click="handleDeleteBinding(binding.id)">删除</view>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<text class="empty-text">{{ loading ? '正在加载...' : '暂无绑定记录' }}</text>
			<view class="btn" @click="showAddBindingModal" v-if="!loading">添加绑定</view>
		</view>
		
		<!-- 添加绑定弹窗 -->
		<view class="modal" v-if="showModal">
			<view class="modal-mask" @click="showModal = false"></view>
			<view class="modal-content">
				<view class="modal-title">添加UDID绑定</view>
				<view class="modal-form">
					<view class="form-item">
						<view class="form-label">UDID</view>
						<input type="text" v-model="newBinding.udid" placeholder="请输入设备UDID" />
					</view>
					<view class="form-item">
						<view class="form-label">卡密</view>
						<input type="text" v-model="newBinding.cardKey" placeholder="请输入卡密" />
					</view>
				</view>
				<view class="modal-actions">
					<view class="btn-cancel" @click="showModal = false">取消</view>
					<view class="btn-confirm" @click="handleAddBinding">确认</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapActions } from 'vuex';
	
	export default {
		data() {
			return {
				loading: false,
				keyword: '',
				showModal: false,
				newBinding: {
					udid: '',
					cardKey: ''
				}
			};
		},
		computed: {
			...mapState({
				bindings: state => state.card.bindings || []
			}),
			filteredBindings() {
				if (!this.keyword.trim()) {
					return this.bindings;
				}
				const keyword = this.keyword.trim().toLowerCase();
				return this.bindings.filter(
					binding => binding.udid.toLowerCase().includes(keyword) || 
					           binding.card_key.toLowerCase().includes(keyword)
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
			// 加载绑定数据
			async loadData() {
				this.loading = true;
				try {
					await this.$store.dispatch('fetchBindings');
				} catch (error) {
					this.$toast('加载绑定列表失败');
					console.error('加载绑定列表错误:', error);
				} finally {
					this.loading = false;
				}
			},
			
			// 显示添加绑定弹窗
			showAddBindingModal() {
				this.newBinding = {
					udid: '',
					cardKey: ''
				};
				this.showModal = true;
			},
			
			// 添加绑定
			async handleAddBinding() {
				if (!this.newBinding.udid || !this.newBinding.cardKey) {
					this.$toast('UDID和卡密不能为空');
					return;
				}
				
				this.loading = true;
				try {
					const result = await this.$store.dispatch('addBinding', this.newBinding);
					if (result && result.success) {
						this.$toast('添加绑定成功');
						this.showModal = false;
						this.loadData();
					} else {
						this.$toast(result?.message || '添加绑定失败');
					}
				} catch (error) {
					this.$toast('添加绑定出错');
					console.error('添加绑定错误:', error);
				} finally {
					this.loading = false;
				}
			},
			
			// 删除绑定
			async handleDeleteBinding(id) {
				if (!id) return;
				
				uni.showModal({
					title: '提示',
					content: '确定要删除此绑定吗？',
					success: async (res) => {
						if (res.confirm) {
							this.loading = true;
							try {
								const result = await this.$store.dispatch('deleteBinding', id);
								if (result && result.success) {
									this.$toast('删除绑定成功');
									this.loadData();
								} else {
									this.$toast(result?.message || '删除绑定失败');
								}
							} catch (error) {
								this.$toast('删除绑定出错');
								console.error('删除绑定错误:', error);
							} finally {
								this.loading = false;
							}
						}
					}
				});
			},
			
			// 格式化日期
			formatDate(dateString) {
				if (!dateString) return '';
				const date = new Date(dateString);
				return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
			},
			
			// 筛选绑定
			filterBindings() {
				// 实时筛选已经由computed实现
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
	
	.binding-list {
		margin-bottom: 30rpx;
	}
	
	.binding-item {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.binding-udid {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.binding-card {
		font-size: 28rpx;
		color: #666;
		margin-bottom: 6rpx;
	}
	
	.binding-app {
		font-size: 28rpx;
		color: #666;
		margin-bottom: 6rpx;
	}
	
	.binding-date {
		font-size: 24rpx;
		color: #999;
	}
	
	.binding-actions {
		text-align: right;
	}
	
	.binding-delete {
		font-size: 26rpx;
		color: #FF3B30;
		padding: 10rpx;
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
	
	.modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
	}
	
	.modal-mask {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
	}
	
	.modal-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background-color: #fff;
		width: 80%;
		border-radius: 12rpx;
		overflow: hidden;
	}
	
	.modal-title {
		font-size: 32rpx;
		text-align: center;
		padding: 30rpx;
		font-weight: bold;
		border-bottom: 1rpx solid #eee;
	}
	
	.modal-form {
		padding: 30rpx;
	}
	
	.form-item {
		margin-bottom: 30rpx;
	}
	
	.form-label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 15rpx;
	}
	
	.form-item input {
		width: 100%;
		height: 80rpx;
		border: 1rpx solid #ddd;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
	
	.modal-actions {
		display: flex;
		border-top: 1rpx solid #eee;
	}
	
	.modal-actions view {
		flex: 1;
		text-align: center;
		padding: 25rpx 0;
		font-size: 30rpx;
	}
	
	.btn-cancel {
		color: #666;
		border-right: 1rpx solid #eee;
	}
	
	.btn-confirm {
		color: #007AFF;
		font-weight: bold;
	}
</style> 