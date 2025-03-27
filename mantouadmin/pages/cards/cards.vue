<template>
	<view class="container">
		<!-- 顶部操作区 -->
		<view class="action-bar">
			<view class="search-box">
				<input type="text" v-model="searchKeyword" placeholder="搜索卡密或UDID" />
			</view>
			<button class="btn generate-btn" @click="goToGenerateCards">生成卡密</button>
			<button class="btn bind-btn" @click="showBindingModal">绑定</button>
		</view>
		
		<!-- 统计卡片区域 -->
		<view class="stats-section">
			<view class="stats-card">
				<view class="stats-value">{{cardStats.unused || 0}}</view>
				<view class="stats-label">可用卡密</view>
			</view>
			
			<view class="stats-card">
				<view class="stats-value">{{cardStats.used || 0}}</view>
				<view class="stats-label">已用卡密</view>
			</view>
		</view>
		
		<!-- 卡密列表 -->
		<view class="card-list" v-if="filteredCards.length > 0">
			<view class="card-item" v-for="(card, index) in filteredCards" :key="card.id || index" :class="{'card-used': card.used}">
				<view class="card-main">
					<view class="card-code">{{card.card_key}}</view>
					<view class="card-info">
						<view class="status-badge" :class="{'badge-green': !card.used, 'badge-gray': card.used}">
							{{card.used ? '已使用' : '可用'}}
						</view>
						<view class="card-udid" v-if="card.udid">UDID: {{card.udid}}</view>
					</view>
				</view>
				<view class="card-actions">
					<view class="copy-btn" @click="copyCardCode(card.card_key)">复制</view>
					<view class="bind-btn" v-if="!card.used" @click="showBindingModalWithKey(card.card_key)">绑定</view>
					<view class="delete-btn" @click="showDeleteConfirm(card)">删除</view>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else>
			<text class="empty-text">暂无卡密数据</text>
			<button class="btn" @click="goToGenerateCards">立即生成</button>
		</view>
		
		<!-- 加载状态 -->
		<view class="loading-mask" v-if="loading">
			<view class="loading-content">
				<text class="loading-text">加载中...</text>
			</view>
		</view>
		
		<!-- UDID绑定弹窗 -->
		<view class="binding-modal" v-if="showModal">
			<view class="modal-mask" @click="showModal = false"></view>
			<view class="modal-content">
				<view class="modal-title">绑定UDID</view>
				<view class="modal-form">
					<view class="form-item">
						<view class="form-label">UDID</view>
						<input type="text" v-model="bindingForm.udid" placeholder="请输入设备UDID" />
					</view>
					<view class="form-item">
						<view class="form-label">卡密</view>
						<input type="text" v-model="bindingForm.cardKey" placeholder="请输入卡密" />
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
				searchKeyword: '',
				cardStats: {
					total: 0,
					used: 0,
					unused: 0
				},
				showModal: false,
				bindingForm: {
					udid: '',
					cardKey: ''
				}
			};
		},
		computed: {
			...mapState({
				cardList: state => state.cardList,
				loading: state => state.loading
			}),
			
			// 过滤后的卡密列表
			filteredCards() {
				if (!this.searchKeyword) return this.cardList;
				
				const keyword = this.searchKeyword.toLowerCase();
				return this.cardList.filter(card => 
					(card.card_key && card.card_key.toLowerCase().includes(keyword)) ||
					(card.udid && card.udid.toLowerCase().includes(keyword))
				);
			}
		},
		onLoad() {
			this.loadData();
		},
		onShow() {
			// 每次页面显示时更新数据
			this.loadData();
		},
		onPullDownRefresh() {
			this.loadData().finally(() => {
				uni.stopPullDownRefresh();
			});
		},
		methods: {
			...mapActions([
				'fetchCardList',
				'fetchCardStats',
				'addBinding'
			]),
			
			// 加载数据
			async loadData() {
				try {
					await this.fetchCardList();
					const statsResult = await this.fetchCardStats();
					if (statsResult && statsResult.success) {
						this.cardStats = statsResult.data;
					}
				} catch (error) {
					uni.$toast('加载卡密数据失败');
					console.error('加载卡密数据错误:', error);
				}
			},
			
			// 前往生成卡密页面
			goToGenerateCards() {
				uni.navigateTo({
					url: '/pages/cards/generate'
				});
			},
			
			// 显示绑定弹窗
			showBindingModal() {
				this.bindingForm = {
					udid: '',
					cardKey: ''
				};
				this.showModal = true;
			},
			
			// 使用指定卡密显示绑定弹窗
			showBindingModalWithKey(cardKey) {
				this.bindingForm = {
					udid: '',
					cardKey: cardKey
				};
				this.showModal = true;
			},
			
			// 添加绑定
			async handleAddBinding() {
				if (!this.bindingForm.udid || !this.bindingForm.cardKey) {
					uni.$toast('UDID和卡密不能为空');
					return;
				}
				
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await this.addBinding(this.bindingForm);
					
					if (result && result.success) {
						uni.$toast('UDID绑定成功');
						this.showModal = false;
						this.loadData();  // 刷新数据
					} else {
						uni.$toast(result?.message || 'UDID绑定失败');
					}
				} catch (error) {
					uni.$toast('UDID绑定出错');
					console.error('UDID绑定错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
			},
			
			// 复制卡密
			copyCardCode(code) {
				uni.setClipboardData({
					data: code,
					success: () => {
						uni.$toast('卡密已复制到剪贴板');
					}
				});
			},
			
			// 显示删除确认
			showDeleteConfirm(card) {
				uni.showModal({
					title: '删除确认',
					content: `确定要删除卡密 ${card.card_key} 吗？此操作不可恢复！`,
					confirmColor: '#FF3B30',
					success: res => {
						if (res.confirm) {
							this.handleDeleteCard(card.id);
						}
					}
				});
			},
			
			// 删除卡密
			async handleDeleteCard(cardId) {
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await this.$store.dispatch('deleteCard', cardId);
					
					if (result && result.success) {
						uni.$toast('删除卡密成功');
						this.loadData();
					} else {
						uni.$toast(result?.message || '删除卡密失败');
					}
				} catch (error) {
					uni.$toast('删除卡密出错');
					console.error('删除卡密错误:', error);
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
		margin-left: 10rpx;
	}
	
	.generate-btn, .bind-btn {
		white-space: nowrap;
	}
	
	.stats-section {
		display: flex;
		justify-content: space-between;
		margin-bottom: 20rpx;
	}
	
	.stats-card {
		flex: 1;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 20rpx;
		margin: 0 10rpx;
		text-align: center;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.stats-value {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.stats-label {
		font-size: 24rpx;
		color: #999;
	}
	
	.card-list {
		margin-bottom: 30rpx;
	}
	
	.card-item {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.card-used {
		background-color: #f9f9f9;
	}
	
	.card-main {
		flex: 1;
	}
	
	.card-code {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 10rpx;
	}
	
	.card-info {
		display: flex;
		flex-direction: column;
		gap: 8rpx;
	}
	
	.card-udid {
		font-size: 24rpx;
		color: #666;
		word-break: break-all;
	}
	
	.status-badge {
		display: inline-block;
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		margin-bottom: 10rpx;
	}
	
	.badge-green {
		background-color: #E9FBF0;
		color: #3DB676;
	}
	
	.badge-gray {
		background-color: #F2F2F7;
		color: #8E8E93;
	}
	
	.card-actions {
		display: flex;
		flex-direction: column;
		gap: 15rpx;
	}
	
	.copy-btn, .bind-btn, .delete-btn {
		font-size: 26rpx;
		padding: 8rpx 12rpx;
		text-align: center;
		border-radius: 6rpx;
	}
	
	.copy-btn {
		color: #007AFF;
		background-color: #ECF5FF;
	}
	
	.bind-btn {
		color: #34C759;
		background-color: #ECFFF5;
	}
	
	.delete-btn {
		color: #FF3B30;
		background-color: #FFF1F0;
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
	
	/* 绑定弹窗样式 */
	.binding-modal {
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