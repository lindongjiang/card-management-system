<template>
	<view class="container">
		<view class="header">
			<text class="title">版本控制设置</text>
		</view>
		
		<view class="version-control">
			<view class="section-title">版本范围</view>
			<view class="input-group">
				<text class="label">最低版本</text>
				<input 
					class="input" 
					v-model="minVersionDisguise" 
					placeholder="例如: 1.0.0"
					@input="validateVersion"
				/>
			</view>
			<view class="input-group">
				<text class="label">最高版本</text>
				<input 
					class="input" 
					v-model="maxVersionDisguise" 
					placeholder="例如: 2.0.0"
					@input="validateVersion"
				/>
			</view>
		</view>

		<view class="version-list">
			<view class="section-title">版本黑名单</view>
			<view class="input-group">
				<input 
					class="input" 
					v-model="newBlacklistVersion" 
					placeholder="输入版本号，例如: 1.1.0"
					@input="validateVersion"
				/>
				<button class="add-btn" @click="addToBlacklist">添加</button>
			</view>
			<view class="tags">
				<view 
					v-for="(version, index) in versionBlacklist" 
					:key="index" 
					class="tag"
				>
					<text>{{ version }}</text>
					<text class="remove" @click="removeFromBlacklist(index)">×</text>
				</view>
			</view>
		</view>

		<view class="version-list">
			<view class="section-title">版本白名单</view>
			<view class="input-group">
				<input 
					class="input" 
					v-model="newWhitelistVersion" 
					placeholder="输入版本号，例如: 1.2.0"
					@input="validateVersion"
				/>
				<button class="add-btn" @click="addToWhitelist">添加</button>
			</view>
			<view class="tags">
				<view 
					v-for="(version, index) in versionWhitelist" 
					:key="index" 
					class="tag"
				>
					<text>{{ version }}</text>
					<text class="remove" @click="removeFromWhitelist(index)">×</text>
				</view>
			</view>
		</view>

		<view class="history">
			<view class="section-title">版本历史</view>
			<view class="history-list">
				<view 
					v-for="(item, index) in versionHistory" 
					:key="index" 
					class="history-item"
				>
					<text class="version">{{ item.version }}</text>
					<text class="time">{{ item.time }}</text>
				</view>
			</view>
		</view>

		<view class="footer">
			<button 
				class="save-btn" 
				:disabled="!hasChanges" 
				@click="applyChanges"
			>
				保存更改
			</button>
		</view>
	</view>
</template>

<script>
import config from '../../config/index.js';
import versionApi from '../../api/versionApi.js';

export default {
	data() {
		return {
			minVersionDisguise: '1.0.0',
			maxVersionDisguise: '',
			versionBlacklist: [],
			versionWhitelist: [],
			newBlacklistVersion: '',
			newWhitelistVersion: '',
			versionHistory: [],
			hasChanges: false,
			isAdmin: false
		}
	},
	onLoad() {
		this.loadSettings();
	},
	methods: {
		async loadSettings() {
			try {
				const settings = await versionApi.getVersionSettings();
				this.minVersionDisguise = settings.min_version_disguise || '1.0.0';
				this.maxVersionDisguise = settings.max_version_disguise || '';
				this.versionBlacklist = settings.version_blacklist || [];
				this.versionWhitelist = settings.version_whitelist || [];
				this.versionHistory = settings.version_history || [];
				this.isAdmin = true;
			} catch (error) {
				console.error('加载设置失败:', error);
				uni.showToast({
					title: error.message || '加载设置失败',
					icon: 'none'
				});
			}
		},
		validateVersion(version) {
			const versionRegex = /^\d+\.\d+\.\d+$/;
			return versionRegex.test(version);
		},
		addToBlacklist() {
			if (!this.newBlacklistVersion || !this.validateVersion(this.newBlacklistVersion)) {
				uni.showToast({
					title: '请输入有效的版本号 (如: 1.0.0)',
					icon: 'none'
				});
				return;
			}
			
			if (!this.versionBlacklist.includes(this.newBlacklistVersion)) {
				this.versionBlacklist.push(this.newBlacklistVersion);
				this.hasChanges = true;
			}
			
			this.newBlacklistVersion = '';
		},
		removeFromBlacklist(index) {
			this.versionBlacklist.splice(index, 1);
			this.hasChanges = true;
		},
		addToWhitelist() {
			if (!this.newWhitelistVersion || !this.validateVersion(this.newWhitelistVersion)) {
				uni.showToast({
					title: '请输入有效的版本号 (如: 1.0.0)',
					icon: 'none'
				});
				return;
			}
			
			if (!this.versionWhitelist.includes(this.newWhitelistVersion)) {
				this.versionWhitelist.push(this.newWhitelistVersion);
				this.hasChanges = true;
			}
			
			this.newWhitelistVersion = '';
		},
		removeFromWhitelist(index) {
			this.versionWhitelist.splice(index, 1);
			this.hasChanges = true;
		},
		async applyChanges() {
			try {
				const settings = {
					min_version_disguise: this.minVersionDisguise,
					max_version_disguise: this.maxVersionDisguise,
					version_blacklist: this.versionBlacklist,
					version_whitelist: this.versionWhitelist
				};

				await versionApi.updateVersionSettings(settings);
				
				uni.showToast({
					title: '设置已更新',
					icon: 'success'
				});
				
				this.hasChanges = false;
				await this.loadSettings();
			} catch (error) {
				console.error('更新设置失败:', error);
				uni.showToast({
					title: error.message || '更新设置失败',
					icon: 'none'
				});
			}
		}
	},
	watch: {
		minVersionDisguise() {
			this.hasChanges = true;
		},
		maxVersionDisguise() {
			this.hasChanges = true;
		}
	}
}
</script>

<style lang="scss">
.container {
	padding: 20px;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.header {
	margin-bottom: 20px;
}

.title {
	font-size: 24px;
	font-weight: bold;
	color: #333;
}

.section-title {
	font-size: 18px;
	font-weight: bold;
	color: #333;
	margin-bottom: 10px;
}

.version-control,
.version-list,
.history {
	background-color: #fff;
	border-radius: 8px;
	padding: 15px;
	margin-bottom: 20px;
	box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.input-group {
	margin-bottom: 15px;
}

.label {
	display: block;
	margin-bottom: 5px;
	color: #666;
}

.input {
	width: 100%;
	height: 40px;
	border: 1px solid #ddd;
	border-radius: 4px;
	padding: 0 10px;
	font-size: 14px;
}

.add-btn {
	background-color: #007AFF;
	color: #fff;
	border: none;
	border-radius: 4px;
	padding: 8px 15px;
	font-size: 14px;
	margin-left: 10px;
}

.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.tag {
	background-color: #f0f0f0;
	padding: 5px 10px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	gap: 5px;
}

.remove {
	color: #ff4d4f;
	cursor: pointer;
}

.history-list {
	max-height: 200px;
	overflow-y: auto;
}

.history-item {
	display: flex;
	justify-content: space-between;
	padding: 8px 0;
	border-bottom: 1px solid #eee;
}

.version {
	color: #333;
}

.time {
	color: #999;
	font-size: 12px;
}

.footer {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	padding: 15px;
	background-color: #fff;
	box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
}

.save-btn {
	width: 100%;
	height: 44px;
	background-color: #007AFF;
	color: #fff;
	border: none;
	border-radius: 4px;
	font-size: 16px;
}

.save-btn[disabled] {
	background-color: #ccc;
	cursor: not-allowed;
}
</style> 