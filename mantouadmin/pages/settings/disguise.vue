<template>
	<view class="container">
		<view class="card">
			<view class="title">变身控制设置</view>
			<view class="form-group">
				<text class="label">启用变身模式</text>
				<switch :checked="disguiseEnabled" @change="onDisguiseChange" color="#007AFF" />
			</view>
			<view class="form-group">
				<text class="label">最低变身版本</text>
				<input type="text" v-model="minVersion" placeholder="例如：1.0.0" class="input" />
			</view>
			<view class="tips">
				<text class="tip-text">说明：</text>
				<text class="tip-item">1. 变身模式启用后，客户端将显示为计算器应用</text>
				<text class="tip-item">2. 最低变身版本用于控制特定版本及以上的客户端启用变身</text>
				<text class="tip-item">3. 版本号低于指定版本的客户端将不会变身</text>
			</view>
			
			<button class="save-btn" @click="saveSettings">保存设置</button>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			disguiseEnabled: true,
			minVersion: '1.0.0',
			loading: false
		}
	},
	onLoad() {
		this.getDisguiseSettings();
	},
	methods: {
		getDisguiseSettings() {
			this.loading = true;
			uni.request({
				url: this.$config.apiBaseUrl + '/api/settings/disguise',
				method: 'GET',
				header: {
					'Authorization': 'Bearer ' + uni.getStorageSync('token')
				},
				success: (res) => {
					if (res.data.success) {
						this.disguiseEnabled = res.data.data.disguise_enabled;
						this.minVersion = res.data.data.min_version_disguise || '1.0.0';
					} else {
						this.$toast(res.data.message || '获取设置失败');
					}
				},
				fail: () => {
					this.$toast('网络请求失败');
				},
				complete: () => {
					this.loading = false;
				}
			})
		},
		
		onDisguiseChange(e) {
			this.disguiseEnabled = e.detail.value;
		},
		
		saveSettings() {
			// 验证版本号格式
			const versionPattern = /^\d+\.\d+\.\d+$/;
			if (!versionPattern.test(this.minVersion)) {
				this.$toast('请输入有效的版本号，格式如：1.0.0');
				return;
			}
			
			this.loading = true;
			uni.request({
				url: this.$config.apiBaseUrl + '/api/settings/disguise',
				method: 'PUT',
				header: {
					'Authorization': 'Bearer ' + uni.getStorageSync('token'),
					'Content-Type': 'application/json'
				},
				data: {
					disguise_enabled: this.disguiseEnabled,
					min_version_disguise: this.minVersion
				},
				success: (res) => {
					if (res.data.success) {
						this.$toast('设置保存成功');
					} else {
						this.$toast(res.data.message || '保存设置失败');
					}
				},
				fail: () => {
					this.$toast('网络请求失败');
				},
				complete: () => {
					this.loading = false;
				}
			})
		}
	}
}
</script>

<style>
.container {
	padding: 20px;
}

.card {
	background-color: #fff;
	border-radius: 10px;
	padding: 20px;
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.title {
	font-size: 18px;
	font-weight: bold;
	margin-bottom: 20px;
	text-align: center;
}

.form-group {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
	padding-bottom: 10px;
	border-bottom: 1px solid #f0f0f0;
}

.label {
	font-size: 16px;
}

.input {
	border: 1px solid #ddd;
	padding: 5px 10px;
	border-radius: 5px;
	width: 150px;
	text-align: right;
}

.tips {
	background-color: #f8f8f8;
	padding: 10px;
	border-radius: 5px;
	margin-bottom: 20px;
}

.tip-text {
	font-weight: bold;
	margin-bottom: 5px;
	display: block;
}

.tip-item {
	font-size: 14px;
	color: #666;
	display: block;
	margin-bottom: 5px;
}

.save-btn {
	background-color: #007AFF;
	color: #fff;
	border: none;
	padding: 10px;
	border-radius: 5px;
	margin-top: 10px;
}
</style> 