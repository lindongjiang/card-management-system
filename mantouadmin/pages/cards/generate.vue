<template>
	<view class="container">
		<view class="card generate-card">
			<view class="card-title">生成卡密</view>
			
			<view class="form-item">
				<text class="label">卡密数量</text>
				<input 
					type="number" 
					class="input" 
					v-model="count" 
					placeholder="请输入要生成的卡密数量"
				/>
			</view>
			
			<view class="form-item">
				<text class="label">卡密有效期（天）</text>
				<input 
					type="number" 
					class="input" 
					v-model="validity" 
					placeholder="请输入卡密有效期，单位：天"
				/>
			</view>
			
			<view class="tips">
				<text class="tip-text">注意：生成的卡密可用于解锁所有应用</text>
			</view>
			
			<button 
				class="btn primary-btn" 
				:loading="loading" 
				:disabled="loading" 
				@click="handleGenerate"
			>生成卡密</button>
		</view>
		
		<!-- 生成结果 -->
		<view class="card result-card" v-if="generatedCards.length > 0">
			<view class="card-title">
				<text>生成结果</text>
				<text class="copy-all" @click="copyAllCards">复制全部</text>
			</view>
			
			<view class="card-list">
				<view 
					class="card-item" 
					v-for="(card, index) in generatedCards" 
					:key="index"
				>
					<text class="card-code">{{card}}</text>
					<text class="copy-btn" @click="copyCard(card)">复制</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapActions, mapState } from 'vuex';
	
	export default {
		data() {
			return {
				count: 5,
				validity: 30,
				selectedApp: '',
				generatedCards: []
			}
		},
		computed: {
			...mapState({
				loading: state => state.loading,
				appList: state => state.appList
			})
		},
		onLoad() {
			this.fetchAppList();
		},
		methods: {
			...mapActions([
				'fetchAppList',
				'generateCards'
			]),
			
			async fetchAppList() {
				try {
					await this.$store.dispatch('fetchAppList');
				} catch (error) {
					uni.$toast('加载应用列表失败');
					console.error('加载应用列表错误:', error);
				}
			},
			
			async handleGenerate() {
				if (!this.count || this.count <= 0) {
					return uni.$toast('请输入有效的卡密数量');
				}
				
				try {
					const params = {
						count: parseInt(this.count)
					};
					
					console.log('生成卡密参数:', params);
					
					const result = await this.generateCards(params);
					
					if (result && result.success) {
						this.generatedCards = result.data;
						uni.$toast(`成功生成${this.generatedCards.length}张卡密`);
					} else {
						uni.$toast(result?.message || '生成卡密失败');
					}
				} catch (error) {
					uni.$toast('生成卡密出错');
					console.error('生成卡密错误:', error);
				}
			},
			
			copyCard(card) {
				uni.setClipboardData({
					data: card,
					success: () => {
						uni.$toast('卡密已复制到剪贴板');
					}
				});
			},
			
			copyAllCards() {
				if (!this.generatedCards.length) {
					return uni.$toast('没有可复制的卡密');
				}
				
				const allCards = this.generatedCards.join('\n');
				
				uni.setClipboardData({
					data: allCards,
					success: () => {
						uni.$toast('所有卡密已复制到剪贴板');
					}
				});
			}
		}
	}
</script>

<style>
	.container {
		padding: 30rpx;
	}
	
	.card {
		background-color: #ffffff;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-bottom: 30rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
	}
	
	.card-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.form-item {
		margin-bottom: 30rpx;
	}
	
	.label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 15rpx;
	}
	
	.input {
		width: 100%;
		height: 80rpx;
		border: 1px solid #eee;
		border-radius: 8rpx;
		padding: 0 20rpx;
		font-size: 28rpx;
	}
	
	.tips {
		margin-bottom: 30rpx;
	}
	
	.tip-text {
		font-size: 24rpx;
		color: #999;
		line-height: 1.5;
	}
	
	.btn {
		width: 100%;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 8rpx;
		font-size: 30rpx;
	}
	
	.primary-btn {
		background-color: #007aff;
		color: #fff;
	}
	
	.result-card {
		margin-top: 40rpx;
	}
	
	.copy-all {
		font-size: 26rpx;
		color: #007aff;
		font-weight: normal;
	}
	
	.card-list {
		max-height: 600rpx;
		overflow-y: auto;
	}
	
	.card-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1px solid #f5f5f5;
	}
	
	.card-code {
		font-size: 28rpx;
		color: #333;
		font-family: monospace;
	}
	
	.copy-btn {
		font-size: 26rpx;
		color: #007aff;
		padding: 5rpx 10rpx;
	}
</style> 