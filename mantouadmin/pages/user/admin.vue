<template>
	<view class="container">
		<!-- 顶部操作区 -->
		<view class="action-bar">
			<button class="btn add-btn" @click="showAddUserModal">添加用户</button>
		</view>
		
		<!-- 用户列表 -->
		<view class="user-list" v-if="userList.length > 0">
			<view class="user-item" v-for="(user, index) in userList" :key="user.id || index">
				<view class="user-avatar">
					<text class="avatar-text">{{getUserLetter(user.username)}}</text>
				</view>
				<view class="user-info">
					<view class="user-name">{{user.username}}</view>
					<view class="user-role" :class="{'role-admin': user.role === 'admin'}">
						{{user.role === 'admin' ? '管理员' : '普通用户'}}
					</view>
				</view>
				<view class="user-actions">
					<view class="delete-btn" @click="showDeleteConfirm(user)">删除</view>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else-if="!loading">
			<text class="empty-text">暂无用户数据</text>
			<button class="btn" @click="showAddUserModal">添加用户</button>
		</view>
		
		<!-- 添加用户弹窗 -->
		<view class="modal-mask" v-if="showAddModal">
			<view class="modal-content">
				<view class="modal-title">添加用户</view>
				
				<view class="form-item">
					<view class="form-label">用户名</view>
					<input type="text" v-model="userForm.username" class="form-input" placeholder="请输入用户名" />
				</view>
				
				<view class="form-item">
					<view class="form-label">密码</view>
					<input type="password" v-model="userForm.password" class="form-input" placeholder="请输入密码" />
				</view>
				
				<view class="form-item">
					<view class="form-label">确认密码</view>
					<input type="password" v-model="userForm.confirmPassword" class="form-input" placeholder="请再次输入密码" />
				</view>
				
				<view class="form-item">
					<view class="form-label">用户角色</view>
					<view class="role-selector">
						<view 
							class="role-item" 
							:class="{'role-active': userForm.role === 'user'}" 
							@click="userForm.role = 'user'"
						>普通用户</view>
						<view 
							class="role-item" 
							:class="{'role-active': userForm.role === 'admin'}" 
							@click="userForm.role = 'admin'"
						>管理员</view>
					</view>
				</view>
				
				<view class="modal-btns">
					<button class="cancel-btn" @click="closeAddUserModal">取消</button>
					<button class="confirm-btn" @click="handleAddUser">确定</button>
				</view>
			</view>
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
				showAddModal: false,
				userForm: {
					username: '',
					password: '',
					confirmPassword: '',
					role: 'user'
				}
			};
		},
		computed: {
			...mapState({
				userList: state => state.userList,
				loading: state => state.loading
			})
		},
		onLoad() {
			// 检查是否为管理员
			if (!this.$store.getters.isAdmin) {
				uni.$toast('只有管理员才能访问此页面');
				setTimeout(() => {
					uni.navigateBack();
				}, 1500);
				return;
			}
			
			this.loadData();
		},
		methods: {
			...mapActions(['fetchUserList']),
			
			// 加载数据
			async loadData() {
				try {
					await this.fetchUserList();
				} catch (error) {
					uni.$toast('加载用户列表失败');
					console.error('加载用户列表错误:', error);
				}
			},
			
			// 获取用户名首字母
			getUserLetter(username) {
				if (!username) return '?';
				return username.charAt(0).toUpperCase();
			},
			
			// 显示添加用户弹窗
			showAddUserModal() {
				// 重置表单
				this.resetUserForm();
				this.showAddModal = true;
			},
			
			// 关闭添加用户弹窗
			closeAddUserModal() {
				this.showAddModal = false;
			},
			
			// 重置用户表单
			resetUserForm() {
				this.userForm = {
					username: '',
					password: '',
					confirmPassword: '',
					role: 'user'
				};
			},
			
			// 处理添加用户
			async handleAddUser() {
				if (!this.userForm.username.trim()) {
					return uni.$toast('请输入用户名');
				}
				
				if (!this.userForm.password) {
					return uni.$toast('请输入密码');
				}
				
				if (this.userForm.password !== this.userForm.confirmPassword) {
					return uni.$toast('两次输入的密码不一致');
				}
				
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await this.$store.dispatch('createUser', {
						username: this.userForm.username,
						password: this.userForm.password,
						role: this.userForm.role
					});
					
					if (result && result.success) {
						uni.$toast('添加用户成功');
						this.closeAddUserModal();
						this.loadData();
					} else {
						uni.$toast(result?.message || '添加用户失败');
					}
				} catch (error) {
					uni.$toast('添加用户出错');
					console.error('添加用户错误:', error);
				} finally {
					this.$store.commit('SET_LOADING', false);
				}
			},
			
			// 显示删除确认
			showDeleteConfirm(user) {
				// 不允许删除自己
				if (user.username === this.$store.getters.username) {
					return uni.$toast('不能删除当前登录的用户');
				}
				
				uni.showModal({
					title: '删除确认',
					content: `确定要删除用户"${user.username}"吗？此操作不可恢复！`,
					confirmColor: '#FF3B30',
					success: res => {
						if (res.confirm) {
							this.handleDeleteUser(user.id);
						}
					}
				});
			},
			
			// 删除用户
			async handleDeleteUser(userId) {
				try {
					this.$store.commit('SET_LOADING', true);
					const result = await this.$store.dispatch('deleteUser', userId);
					
					if (result && result.success) {
						uni.$toast('删除用户成功');
						this.loadData();
					} else {
						uni.$toast(result?.message || '删除用户失败');
					}
				} catch (error) {
					uni.$toast('删除用户出错');
					console.error('删除用户错误:', error);
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
		justify-content: flex-end;
		margin-bottom: 20rpx;
	}
	
	.btn {
		font-size: 28rpx;
		padding: 16rpx 30rpx;
		border-radius: 8rpx;
		background-color: #007AFF;
		color: #fff;
		line-height: 1.5;
	}
	
	.add-btn {
		margin-left: auto;
	}
	
	.user-list {
		margin-bottom: 30rpx;
	}
	
	.user-item {
		background-color: #fff;
		border-radius: 12rpx;
		padding: 20rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
		display: flex;
		align-items: center;
	}
	
	.user-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		background-color: #007AFF;
		display: flex;
		justify-content: center;
		align-items: center;
		margin-right: 20rpx;
	}
	
	.avatar-text {
		font-size: 36rpx;
		color: #fff;
		font-weight: bold;
	}
	
	.user-info {
		flex: 1;
	}
	
	.user-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 8rpx;
	}
	
	.user-role {
		font-size: 24rpx;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		background-color: #E5E5EA;
		color: #8E8E93;
		display: inline-block;
	}
	
	.role-admin {
		background-color: #FF9500;
		color: #fff;
	}
	
	.user-actions {
		display: flex;
	}
	
	.delete-btn {
		font-size: 26rpx;
		color: #FF3B30;
		padding: 6rpx 16rpx;
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
	
	.modal-mask {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 999;
	}
	
	.modal-content {
		width: 600rpx;
		background-color: #fff;
		border-radius: 12rpx;
		padding: 40rpx;
		box-shadow: 0 5rpx 20rpx rgba(0, 0, 0, 0.1);
	}
	
	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 30rpx;
		text-align: center;
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
	
	.role-selector {
		display: flex;
	}
	
	.role-item {
		flex: 1;
		height: 70rpx;
		line-height: 70rpx;
		text-align: center;
		font-size: 28rpx;
		color: #666;
		background-color: #f9f9f9;
		border: 1rpx solid #e5e5e5;
		margin-right: 20rpx;
		border-radius: 8rpx;
	}
	
	.role-item:last-child {
		margin-right: 0;
	}
	
	.role-active {
		color: #fff;
		background-color: #007AFF;
		border-color: #007AFF;
	}
	
	.modal-btns {
		display: flex;
		justify-content: space-between;
		margin-top: 40rpx;
	}
	
	.cancel-btn, .confirm-btn {
		width: 45%;
		height: 80rpx;
		line-height: 80rpx;
		font-size: 28rpx;
		border-radius: 8rpx;
	}
	
	.cancel-btn {
		background-color: #f2f2f2;
		color: #666;
	}
	
	.confirm-btn {
		background-color: #007AFF;
		color: #fff;
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