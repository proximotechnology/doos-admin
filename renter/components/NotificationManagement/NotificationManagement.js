// Wait for DOM and dependencies to be ready
(function() {
    'use strict';
    
    // Wait for Alpine and API_CONFIG to be available
    function waitForDependencies(callback) {
        if (typeof Alpine !== 'undefined' && typeof API_CONFIG !== 'undefined' && typeof ApiService !== 'undefined') {
            callback();
        } else {
            setTimeout(() => waitForDependencies(callback), 50);
        }
    }
    
    // Register immediately if Alpine is already available, otherwise wait
    function registerComponent() {
        // Check if alpine:init already fired
        if (typeof Alpine !== 'undefined' && Alpine.store) {
            // Alpine is ready, register directly
            registerAlpineComponent();
        } else {
            // Wait for alpine:init event
            document.addEventListener('alpine:init', registerAlpineComponent, { once: true });
        }
    }
    
    function registerAlpineComponent() {
        Alpine.data('notificationManagement', () => ({
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            isMarkingAllAsRead: false,
            users: [],

            async init() {
                await this.fetchNotifications();
                await this.fetchUnreadCount();
                await this.fetchUsers();

                // Listen for refresh event from modal
                window.addEventListener('refresh-notifications', async () => {
                    await this.fetchNotifications();
                    await this.fetchUnreadCount();
                });
            },

            async fetchNotifications(page = 1) {
                try {
                    this.isLoading = true;
                    const response = await ApiService.getUserNotifications(page);
                    
                    console.log('API Response:', response);
                    
                    if (response && response.status) {
                        // Handle paginated response (Laravel pagination)
                        if (response.data && response.data.data && Array.isArray(response.data.data)) {
                            this.notifications = response.data.data;
                        } 
                        // Handle direct array in data
                        else if (response.data && Array.isArray(response.data)) {
                            this.notifications = response.data;
                        } 
                        // Handle data as object with array property
                        else if (response.data && typeof response.data === 'object') {
                            // Try to find array in response.data
                            const dataKeys = Object.keys(response.data);
                            const arrayKey = dataKeys.find(key => Array.isArray(response.data[key]));
                            if (arrayKey) {
                                this.notifications = response.data[arrayKey];
                            } else {
                                this.notifications = [];
                            }
                        } else {
                            this.notifications = [];
                        }
                        
                        console.log('Notifications loaded:', this.notifications.length, 'items');
                    } else {
                        this.notifications = [];
                        console.warn('API returned non-success status:', response);
                    }
                } catch (error) {
                    console.error('Error fetching notifications:', error);
                    this.showErrorToast(error.message || this.$store.i18n.t('failed_to_load_notifications') || 'Failed to load notifications');
                    this.notifications = [];
                } finally {
                    this.isLoading = false;
                }
            },

            async fetchUnreadCount() {
                try {
                    const response = await ApiService.getUnreadNotificationsCount();
                    
                    if (response.status) {
                        // Handle different response structures
                        if (response.data && response.data.unread_count !== undefined) {
                            this.unreadCount = parseInt(response.data.unread_count || 0);
                        } else if (response.unread_count !== undefined) {
                            this.unreadCount = parseInt(response.unread_count || 0);
                        } else {
                            this.unreadCount = 0;
                        }
                    } else {
                        this.unreadCount = 0;
                    }
                } catch (error) {
                    console.error('Error fetching unread count:', error);
                    this.unreadCount = 0;
                }
            },

            async fetchUsers() {
                try {
                    const data = await ApiService.getUsers(1, { per_page: 999 });
                    if (data.status && data.data) {
                        this.users = data.data.data.filter((u) => u.type === '0') || [];
                    }
                } catch (error) {
                    console.error('Error fetching users:', error);
                }
            },

            async markAllAsRead() {
                try {
                    this.isMarkingAllAsRead = true;
                    const response = await ApiService.markAllNotificationsAsRead();
                    
                    if (response.status) {
                        this.showSuccessToast(response.message || 'All notifications marked as read');
                        this.unreadCount = 0;
                        await this.fetchNotifications();
                    }
                } catch (error) {
                    console.error('Error marking all as read:', error);
                    this.showErrorToast(error.message || 'Failed to mark all as read');
                } finally {
                    this.isMarkingAllAsRead = false;
                }
            },

            openSendToAllModal() {
                if (!this.$store.global) {
                    Alpine.store('global', { sharedData: {} });
                }
                this.$store.global.sharedData = {
                    modalType: 'sendToAll',
                    message: ''
                };
                this.$dispatch('open-send-notification-modal');
            },

            openSendToAdminsModal() {
                if (!this.$store.global) {
                    Alpine.store('global', { sharedData: {} });
                }
                this.$store.global.sharedData = {
                    modalType: 'sendToAdmins',
                    message: ''
                };
                this.$dispatch('open-send-notification-modal');
            },

            openSendToUserModal() {
                if (!this.$store.global) {
                    Alpine.store('global', { sharedData: {} });
                }
                this.$store.global.sharedData = {
                    modalType: 'sendToUser',
                    user_id: null,
                    message: ''
                };
                this.$dispatch('open-send-notification-modal');
            },

            formatDate(dateString) {
                if (!dateString) return '';
                const date = new Date(dateString);
                const now = new Date();
                const diff = now - date;
                const seconds = Math.floor(diff / 1000);
                const minutes = Math.floor(seconds / 60);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (seconds < 60) {
                    return this.$store.i18n.t('just_now') || 'Just now';
                } else if (minutes < 60) {
                    return minutes + ' ' + (this.$store.i18n.t('minutes_ago') || 'minutes ago');
                } else if (hours < 24) {
                    return hours + ' ' + (this.$store.i18n.t('hours_ago') || 'hours ago');
                } else if (days < 7) {
                    return days + ' ' + (this.$store.i18n.t('days_ago') || 'days ago');
                } else {
                    return date.toLocaleDateString();
                }
            },

            showSuccessToast(message) {
                if (window.Swal) {
                    const toast = window.Swal.mixin({
                        toast: true,
                        position: 'bottom-start',
                        showConfirmButton: false,
                        timer: 3000,
                        showCloseButton: true,
                        customClass: {
                            popup: 'color-success',
                        },
                    });
                    toast.fire({
                        title: message,
                    });
                }
            },

            showErrorToast(message) {
                if (window.Swal) {
                    const toast = window.Swal.mixin({
                        toast: true,
                        position: 'bottom-start',
                        showConfirmButton: false,
                        timer: 3000,
                        showCloseButton: true,
                        customClass: {
                            popup: 'color-danger',
                        },
                    });
                    toast.fire({
                        title: message,
                    });
                }
            }
        }));

        // Send Notification Modal Component
        Alpine.data('sendNotificationModal', () => ({
            isOpen: false,
            modalType: 'sendToAll', // sendToAll, sendToAdmins, sendToUser
            message: '',
            selectedUserId: null,
            users: [],
            isSubmitting: false,

            async init() {
                // Initialize global store if not exists
                if (!Alpine.store('global')) {
                    Alpine.store('global', { sharedData: {} });
                }

                // Fetch users for dropdown
                await this.fetchUsers();

                // Listen for modal open event
                this.$watch('$store.global.sharedData', (data) => {
                    if (data && data.modalType) {
                        this.modalType = data.modalType;
                        this.message = data.message || '';
                        this.selectedUserId = data.user_id || null;
                        this.isOpen = true;
                    }
                });

                // Listen for custom event
                document.addEventListener('open-send-notification-modal', () => {
                    const globalStore = Alpine.store('global');
                    if (globalStore && globalStore.sharedData) {
                        const data = globalStore.sharedData;
                        if (data && data.modalType) {
                            this.modalType = data.modalType;
                            this.message = data.message || '';
                            this.selectedUserId = data.user_id || null;
                            this.isOpen = true;
                        }
                    }
                });
            },

            async fetchUsers() {
                try {
                    const data = await ApiService.getUsers(1, { per_page: 999 });
                    if (data.status && data.data) {
                        this.users = data.data.data.filter((u) => u.type === '0') || [];
                    }
                } catch (error) {
                    console.error('Error fetching users:', error);
                }
            },

            closeModal() {
                this.isOpen = false;
                this.message = '';
                this.selectedUserId = null;
                if (this.$store.global && this.$store.global.sharedData) {
                    this.$store.global.sharedData = {};
                }
            },

            async submitNotification() {
                if (!this.message.trim()) {
                    this.showErrorToast(this.$store.i18n.t('message_required') || 'Message is required');
                    return;
                }

                if (this.modalType === 'sendToUser' && !this.selectedUserId) {
                    this.showErrorToast(this.$store.i18n.t('user_required') || 'Please select a user');
                    return;
                }

                try {
                    this.isSubmitting = true;
                    let response;

                    if (this.modalType === 'sendToAll') {
                        response = await ApiService.sendNotificationToAll(this.message);
                    } else if (this.modalType === 'sendToAdmins') {
                        response = await ApiService.sendNotificationToAdmins(this.message);
                    } else if (this.modalType === 'sendToUser') {
                        response = await ApiService.sendNotificationToUser(this.selectedUserId, this.message);
                    }

                    if (response.status) {
                        this.showSuccessToast(response.message || 'Notification sent successfully');
                        this.closeModal();
                        // Refresh notifications - dispatch event to parent
                        window.dispatchEvent(new CustomEvent('refresh-notifications'));
                    }
                } catch (error) {
                    console.error('Error sending notification:', error);
                    this.showErrorToast(error.message || 'Failed to send notification');
                } finally {
                    this.isSubmitting = false;
                }
            },

            getModalTitle() {
                if (this.modalType === 'sendToAll') {
                    return this.$store.i18n.t('send_to_all_users');
                } else if (this.modalType === 'sendToAdmins') {
                    return this.$store.i18n.t('send_to_admins');
                } else {
                    return this.$store.i18n.t('send_to_user');
                }
            },

            showErrorToast(message) {
                if (window.Swal) {
                    const toast = window.Swal.mixin({
                        toast: true,
                        position: 'bottom-start',
                        showConfirmButton: false,
                        timer: 3000,
                        showCloseButton: true,
                        customClass: {
                            popup: 'color-danger',
                        },
                    });
                    toast.fire({
                        title: message,
                    });
                }
            },

            showSuccessToast(message) {
                if (window.Swal) {
                    const toast = window.Swal.mixin({
                        toast: true,
                        position: 'bottom-start',
                        showConfirmButton: false,
                        timer: 3000,
                        showCloseButton: true,
                        customClass: {
                            popup: 'color-success',
                        },
                    });
                    toast.fire({
                        title: message,
                    });
                }
            }
        }));
    }

    // Start registration
    registerComponent();
})();

