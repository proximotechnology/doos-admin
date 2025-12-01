document.addEventListener('alpine:init', () => {

    Alpine.data('header', () => ({
        languages: [
            {
                id: 3,
                key: 'English',
                value: 'en',
            },
            {
                id: 16,
                key: 'Arabic',
                value: 'ae',
            },
        ],

        pusher: null,
        channel: null,
        notificationChannel: null,
        unreadCount: 0,
        notifications: [],
        unreadNotificationsCount: 0,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        chatData: null,

        init() {
            // Store instance globally for access
            window.headerInstance = this;
            const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
            if (selector) {
                selector.classList.add('active');
                const ul = selector.closest('ul.sub-menu');
                if (ul) {
                    let ele = ul.closest('li.menu').querySelectorAll('.nav-link');
                    if (ele) {
                        ele = ele[0];
                        setTimeout(() => {
                            ele.classList.add('active');
                        });
                    }
                }
            }

            // Setup sub-menu positioning
            this.setupSubMenuPositioning();

            this.loadChatData();

            this.setupChatDataListener();

            if (this.isInternalPage()) {
                this.fetchUserNotifications();
                this.initializePusher();
                this.initializeNotificationsPusher();
            }
        },
        
        setupSubMenuPositioning() {
            const menuItems = document.querySelectorAll('.horizontal-menu > li.nav-item');
            menuItems.forEach(item => {
                const subMenu = item.querySelector('ul.sub-menu');
                if (subMenu) {
                    item.addEventListener('mouseenter', () => {
                        setTimeout(() => {
                            this.positionSubMenu(item, subMenu);
                        }, 10);
                    });
                    // Reposition on scroll or resize
                    window.addEventListener('scroll', () => {
                        if (subMenu.style.display === 'block' || subMenu.style.visibility === 'visible') {
                            this.positionSubMenu(item, subMenu);
                        }
                    });
                    window.addEventListener('resize', () => {
                        if (subMenu.style.display === 'block' || subMenu.style.visibility === 'visible') {
                            this.positionSubMenu(item, subMenu);
                        }
                    });
                }
            });
        },
        
        positionSubMenu(item, subMenu) {
            const itemRect = item.getBoundingClientRect();
            const header = document.querySelector('header');
            const headerRect = header ? header.getBoundingClientRect() : { top: 0, bottom: 0 };
            
            // Position at the bottom of the header (below the menu item)
            subMenu.style.position = 'fixed';
            subMenu.style.left = itemRect.left + 'px';
            subMenu.style.top = itemRect.bottom + 'px';
            subMenu.style.bottom = 'auto';
            subMenu.style.marginTop = '0';
            subMenu.style.marginBottom = '0';
        },

        isInternalPage() {
            const currentPath = window.location.pathname;
            // Only exclude authentication pages and root index.html (not /renter/index.html)
            const excludedPages = [
                '/auth-boxed-signin.html',
                '/auth-boxed-signup.html',
                '/auth-cover-login.html',
                '/auth-cover-register.html',
                '/index.html' // Only root index.html
            ];
            // Check if path is exactly one of the excluded pages
            return !excludedPages.includes(currentPath);
        },

        loadChatData() {
            const chatComponent = document.querySelector('[x-data="chat"]')?._x_dataStack?.[0];
            if (chatComponent) {
                this.chatData = chatComponent;
                this.calculateUnreadCount();
            } else {
                this.loadFromLocalStorage();
            }
        },

        calculateUnreadCount() {
            if (!this.chatData) return;

            let totalUnread = 0;

            if (this.chatData.allUsers && Array.isArray(this.chatData.allUsers)) {
                totalUnread = this.chatData.allUsers.reduce((total, user) => {
                    return total + (user.unreadCount || 0);
                }, 0);
            }

            if (totalUnread === 0 && this.chatData.contactList && Array.isArray(this.chatData.contactList)) {
                totalUnread = this.chatData.contactList.reduce((total, user) => {
                    return total + (user.unreadCount || 0);
                }, 0);
            }

            this.unreadCount = totalUnread;
            this.updateHeaderNotification();
            this.updatePageTitle();
        },

        loadFromLocalStorage() {
            try {
                const savedChatData = localStorage.getItem('chatData');
                if (savedChatData) {
                    const data = JSON.parse(savedChatData);
                    this.calculateUnreadCountFromStorage(data);
                }
            } catch (error) {
                }
        },

        calculateUnreadCountFromStorage(data) {
            let totalUnread = 0;

            if (data.allUsers && Array.isArray(data.allUsers)) {
                totalUnread = data.allUsers.reduce((total, user) => {
                    return total + (user.unreadCount || 0);
                }, 0);
            }

            if (data.contactList && Array.isArray(data.contactList)) {
                totalUnread = data.contactList.reduce((total, user) => {
                    return total + (user.unreadCount || 0);
                }, 0);
            }

            this.unreadCount = totalUnread;
            this.updateHeaderNotification();
            this.updatePageTitle();
        },

        setupChatDataListener() {
            document.addEventListener('chat-data-updated', (event) => {
                this.chatData = event.detail;
                this.calculateUnreadCount();
                this.saveToLocalStorage();
            });

            window.addEventListener('storage', (event) => {
                if (event.key === 'chatData') {
                    this.loadFromLocalStorage();
                }
            });

            setInterval(() => {
                this.loadChatData();
            }, 10000);
        },

        saveToLocalStorage() {
            try {
                if (this.chatData) {
                    localStorage.setItem('chatData', JSON.stringify({
                        allUsers: this.chatData.allUsers || [],
                        contactList: this.chatData.contactList || [],
                        lastUpdated: new Date().toISOString()
                    }));
                }
            } catch (error) {
                }
        },

        initializePusher() {
            try {
                if (typeof Pusher === 'undefined' || typeof API_CONFIG === 'undefined') {
                    return;
                }

                const authToken = localStorage.getItem('authToken');
                if (!authToken) return;

                this.loadCurrentUserAndInitPusher();

            } catch (error) {
                }
        },

        async loadCurrentUserAndInitPusher() {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/chat/my-online-status`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        this.initPusher(data.user_id);
                    }
                }
            } catch (error) {
                }
        },

        initPusher(userId) {
            try {
                this.pusher = new Pusher(API_CONFIG.PUSHER.APP_KEY, {
                    cluster: API_CONFIG.PUSHER.CLUSTER,
                    encrypted: true
                });

                const channelName = `${API_CONFIG.PUSHER.CHANNEL_PREFIX}-${userId}`;
                this.channel = this.pusher.subscribe(channelName);

                this.channel.bind("Private_chat", (data) => {
                    this.handleNewMessage(data);
                });

            } catch (error) {
                }
        },
        
        initializeNotificationsPusher() {
            try {
                if (typeof Pusher === 'undefined' || typeof API_CONFIG === 'undefined') {
                    return;
                }
                
                // Load current user ID first
                this.loadCurrentUserAndInitNotificationsPusher();
                
            } catch (error) {
                // Error initializing notifications Pusher
            }
        },

        async loadCurrentUserAndInitNotificationsPusher() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/chat/my-online-status`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.user_id) {
                        this.initNotificationsPusher(data.user_id);
                    }
                }
            } catch (error) {
                // Error loading current user
            }
        },

        initNotificationsPusher(userId) {
            try {
                // Wait a bit to ensure Pusher is fully loaded
                setTimeout(() => {
                    try {
                        // Initialize Pusher for notifications if not already initialized
                        if (!this.pusher || !this.pusher.connection || this.pusher.connection.state !== 'connected') {
                            this.pusher = new Pusher(API_CONFIG.PUSHER.APP_KEY, {
                                cluster: API_CONFIG.PUSHER.CLUSTER,
                                encrypted: true,
                                enabledTransports: ['ws', 'wss'],
                                forceTLS: true,
                                authEndpoint: `${this.apiBaseUrl}/pusher/auth`,
                                auth: {
                                    headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                                        'Accept': 'application/json'
                                    }
                                }
                            });
                        }
                        
                        const channelName = `notification-private-channel-${userId}`;
                        
                        // Unsubscribe from previous channel if exists
                        if (this.notificationChannel) {
                            try {
                                this.pusher.unsubscribe(this.notificationChannel.name);
                            } catch (e) {
                                // Ignore unsubscribe errors
                            }
                        }
                        
                        // Subscribe to notification-private-channel-{userId}
                        this.notificationChannel = this.pusher.subscribe(channelName);
                        
                        // Wait for subscription to be ready
                        this.notificationChannel.bind('pusher:subscription_succeeded', () => {
                            console.log(`✅ Successfully subscribed to ${channelName}`);
                        });

                        this.notificationChannel.bind('pusher:subscription_error', (error) => {
                            // Subscription error
                        });
                        
                        // Bind to Private_notify event (only this one, to avoid duplicates)
                        this.notificationChannel.bind('Private_notify', (data) => {
                            this.handleNotification(data);
                        });
                        
                    } catch (error) {
                        // Error initializing notifications Pusher
                    }
                }, 500);
                
            } catch (error) {
                // Error in initNotificationsPusher
            }
        },
        
        async fetchUserNotifications() {
            try {
                // Check if ApiService is available
                if (typeof ApiService === 'undefined') {
                    return;
                }
                
                const response = await ApiService.getUserNotifications(1);
                
                if (response && response.status && response.data) {
                    let notificationsData = [];
                    
                    // Handle different response structures
                    // Response structure: { status: true, data: [...], count: 20 }
                    if (Array.isArray(response.data)) {
                        notificationsData = response.data;
                    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
                        notificationsData = response.data.data;
                    } else if (response.data && typeof response.data === 'object') {
                        // Try to find array in response.data
                        const dataKeys = Object.keys(response.data);
                        const arrayKey = dataKeys.find(key => Array.isArray(response.data[key]));
                        if (arrayKey) {
                            notificationsData = response.data[arrayKey];
                        }
                    }
                    
                    if (notificationsData.length === 0) {
                        return;
                    }
                    
                    // Convert API notifications to our format
                    const formattedNotifications = notificationsData.map(item => ({
                        id: item.id,
                        title: 'Notification',
                        message: item.notify || item.message || 'New notification',
                        type: 'info',
                        time: new Date(item.created_at),
                        isRead: item.is_read !== 'pending' && item.is_read !== '0' && item.is_read !== 0,
                        data: item
                    }));
                    
                    // Sort by time (newest first)
                    formattedNotifications.sort((a, b) => b.time - a.time);
                    
                    // Update local array
                    this.notifications = formattedNotifications;
                    
                    // Update store - create new array to trigger reactivity
                    if (Alpine.store('notifications')) {
                        Alpine.store('notifications').notifications = [...formattedNotifications];
                        Alpine.store('notifications').updateUnreadCount();
                    }
                    
                    // Update unread count
                    this.updateUnreadCount();
                    
                    // Update notification indicator
                    this.updateNotificationIndicator();
                }
            } catch (error) {
                // Error fetching user notifications
            }
        },
        
        handleNotification(data) {
            try {
                // Extract message from different possible structures
                let messageText = '';
                let notificationId = null;
                let createdDate = null;
                
                // Handle structure: { message: { message: "...", notification_id: 258, user_id: 4, created_at: "...", ... } }
                if (data.message && typeof data.message === 'object') {
                    messageText = data.message.message || data.message.notify || data.message.text || '';
                    notificationId = data.message.notification_id || data.message.id;
                    createdDate = data.message.created_at;
                } 
                // Handle structure: { message: "text", ... }
                else if (typeof data.message === 'string') {
                    messageText = data.message;
                }
                // Handle structure: { notify: "...", ... }
                else if (data.notify) {
                    messageText = data.notify;
                }
                // Handle structure: { data: { message: "...", ... } }
                else if (data.data && data.data.message) {
                    messageText = data.data.message;
                }
                // Fallback: try to stringify if it's an object
                else if (typeof data === 'object') {
                    messageText = data.message?.message || data.notify || 'New notification';
                }
                // Final fallback
                else {
                    messageText = String(data) || 'New notification';
                }
                
                // If still no message, use a default
                if (!messageText || messageText.trim() === '') {
                    messageText = 'New notification';
                }
                
                // Extract notification ID from data if available
                if (!notificationId) {
                    notificationId = data.notification_id || data.id || data.message?.notification_id || data.message?.id;
                }
                
                // Parse created date
                let notificationTime = new Date();
                if (createdDate) {
                    notificationTime = new Date(createdDate);
                } else if (data.created_at) {
                    notificationTime = new Date(data.created_at);
                } else if (data.message?.created_at) {
                    notificationTime = new Date(data.message.created_at);
                }
                
                // Check if notification already exists (to prevent duplicates)
                // Check in local notifications array
                const existingInLocal = this.notifications.find(n => 
                    (notificationId && (n.id === notificationId || n.data?.message?.notification_id === notificationId)) ||
                    (n.data?.message?.notification_id === data.message?.notification_id && data.message?.notification_id)
                );
                
                // Check in store notifications array
                let existingInStore = false;
                if (Alpine.store('notifications')) {
                    existingInStore = Alpine.store('notifications').notifications.find(n => 
                        (notificationId && (n.id === notificationId || n.data?.message?.notification_id === notificationId)) ||
                        (n.data?.message?.notification_id === data.message?.notification_id && data.message?.notification_id)
                    );
                }
                
                if (existingInLocal || existingInStore) {
                    // Notification already exists, skip
                    return;
                }
                
                // Add notification to array
                const notification = {
                    id: notificationId || (Date.now() + Math.random()), // Use real ID if available
                    title: data.title || 'New Notification',
                    message: messageText, // This is now a string, not an object
                    type: data.type || 'info',
                    time: notificationTime,
                    isRead: false,
                    data: data
                };
                
                // Add to local array
                this.notifications.unshift(notification);
                
                // Add to store (it will check for duplicates internally)
                if (Alpine.store('notifications')) {
                    Alpine.store('notifications').addNotification(notification);
                }
                
                // Limit notifications to last 50
                if (this.notifications.length > 50) {
                    this.notifications = this.notifications.slice(0, 50);
                }
                
                // Update unread count based on unread notifications
                this.updateUnreadCount();
                
                // Update notification indicator
                this.updateNotificationIndicator();
                
                // Show browser notification if permission granted
                this.showBrowserNotification(notification);
                
            } catch (error) {
                // Error handling notification
            }
        },
        
        updateUnreadCount() {
            // Always use store as the single source of truth
            if (Alpine.store('notifications')) {
                // Update store's unread count first
                Alpine.store('notifications').updateUnreadCount();
                // Then sync local count from store
                this.unreadNotificationsCount = Alpine.store('notifications').unreadCount || 0;
            } else {
                // Fallback to local calculation if store not available
                this.unreadNotificationsCount = this.notifications.filter(n => !n.isRead).length;
            }
        },
        
        updateNotificationIndicator() {
            this.updateUnreadCount();
            const indicator = document.querySelector('.notification-indicator');
            if (indicator) {
                const unreadCount = Alpine.store('notifications')?.unreadCount || this.unreadNotificationsCount;
                if (unreadCount > 0) {
                    indicator.classList.remove('hidden');
                    const badge = indicator.querySelector('.relative span');
                    if (badge) {
                        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    }
                } else {
                    indicator.classList.add('hidden');
                }
            }
        },
        
        async showBrowserNotification(notification) {
            if ('Notification' in window) {
                if (Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
                if (Notification.permission === 'granted') {
                    new Notification(notification.title, {
                        body: notification.message,
                        icon: '/favicon.png',
                        tag: 'notification-' + notification.id
                    });
                }
            }
        },
        
        async markNotificationsAsRead() {
            try {
                // Call API to mark all as read
                if (typeof ApiService !== 'undefined') {
                    await ApiService.markAllNotificationsAsRead();
                }
                
                // Mark all notifications as read locally
                this.notifications.forEach(notification => {
                    notification.isRead = true;
                });
                
                if (Alpine.store('notifications')) {
                    Alpine.store('notifications').markAllAsRead();
                }
                
                this.unreadNotificationsCount = 0;
                this.updateNotificationIndicator();
            } catch (error) {
                // Error marking all notifications as read
            }
        },
        
        async markNotificationAsReadAndRedirect(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                // Mark as read locally
                notification.isRead = true;
                if (Alpine.store('notifications')) {
                    Alpine.store('notifications').markAsRead(notificationId);
                }
                
                // Update on server
                try {
                    if (typeof ApiService !== 'undefined' && ApiService.markNotificationAsRead) {
                        await ApiService.markNotificationAsRead(notificationId);
                    }
                } catch (error) {
                    // Silent fail - continue to redirect
                }
                
                this.updateUnreadCount();
                this.updateNotificationIndicator();
                
                // Redirect to notifications page
                window.location.href = 'Notification.html';
            } else if (notification) {
                // If already read, just redirect
                window.location.href = 'Notification.html';
            }
        },
        
        async markNotificationAsRead(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                if (Alpine.store('notifications')) {
                    Alpine.store('notifications').markAsRead(notificationId);
                }
                
                // Update on server if needed
                try {
                    if (typeof ApiService !== 'undefined' && ApiService.markNotificationAsRead) {
                        await ApiService.markNotificationAsRead(notificationId);
                    }
                } catch (error) {
                    // Silent fail
                }
                
                this.updateUnreadCount();
                this.updateNotificationIndicator();
            }
        },
        
        formatTime(date) {
            if (!date) return '';
            const now = new Date();
            const diff = now - new Date(date);
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            
            if (minutes < 1) return 'Just now';
            if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
            
            return new Date(date).toLocaleDateString();
        },

        handleNewMessage(data) {
            const { sender_id, message, sender_name } = data;

            const currentUser = this.getCurrentUserId();
            if (sender_id === currentUser) return;

            this.unreadCount++;

            this.updateLocalChatData(sender_id, message);

            this.updateHeaderNotification();
            this.showHeaderNotification(sender_name, message);
            this.updatePageTitle();
            this.playNotificationSound();
        },

        updateLocalChatData(senderId, message) {
            if (!this.chatData) return;

            if (this.chatData.allUsers && Array.isArray(this.chatData.allUsers)) {
                const userIndex = this.chatData.allUsers.findIndex(user => user.userId === senderId);
                if (userIndex !== -1) {
                    this.chatData.allUsers[userIndex].unreadCount = (this.chatData.allUsers[userIndex].unreadCount || 0) + 1;
                    this.chatData.allUsers[userIndex].preview = message;
                    this.chatData.allUsers[userIndex].time = 'Just now';
                }
            }

            if (this.chatData.contactList && Array.isArray(this.chatData.contactList)) {
                const userIndex = this.chatData.contactList.findIndex(user => user.userId === senderId);
                if (userIndex !== -1) {
                    this.chatData.contactList[userIndex].unreadCount = (this.chatData.contactList[userIndex].unreadCount || 0) + 1;
                    this.chatData.contactList[userIndex].preview = message;
                    this.chatData.contactList[userIndex].time = 'Just now';
                }
            }

            this.saveToLocalStorage();
        },

        getCurrentUserId() {
            if (this.chatData && this.chatData.loginUser) {
                return this.chatData.loginUser.id;
            }

            return localStorage.getItem('currentUserId');
        },

        updateHeaderNotification() {
            const chatIcon = document.getElementById('chat-header-icon');
            const indicator = chatIcon?.querySelector('.chat-indicator');
            const countElement = indicator?.querySelector('.notification-count');

            if (indicator) {
                if (this.unreadCount > 0) {
                    indicator.classList.remove('hidden');

                    if (countElement) {
                        countElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                    }

                    chatIcon.classList.add('has-notifications');
                    setTimeout(() => {
                        chatIcon.classList.remove('animate-pulse');
                    }, 2000);
                } else {
                    indicator.classList.add('hidden');
                    chatIcon.classList.remove('has-notifications');
                }
            }
        },

        showHeaderNotification(userName, message) {
            const notification = document.createElement('div');
            notification.className = 'header-notification fixed top-20 right-4 bg-white dark:bg-[#0e1726] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-w-sm w-full transform transition-all duration-300';
            notification.innerHTML = `
                <div class="p-4">
                    <div class="flex items-start space-x-3 rtl:space-x-reverse">
                        <div class="flex-shrink-0">
                            <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="text-primary">
                                    <path d="M8 12H16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                ${userName}
                            </p>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                ${message || '[New message]'}
                            </p>
                            <div class="flex items-center justify-between mt-2">
                                <span class="text-xs text-gray-400 dark:text-gray-500">Just now</span>
                                <button class="view-chat-btn text-xs text-primary hover:text-primary-dark font-medium">
                                    View
                                </button>
                            </div>
                        </div>
                        <button class="close-notification flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;

            const viewBtn = notification.querySelector('.view-chat-btn');
            const closeBtn = notification.querySelector('.close-notification');

            viewBtn.addEventListener('click', () => {
                this.openChatPage();
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });

            closeBtn.addEventListener('click', () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });

            document.body.appendChild(notification);

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, 5000);
        },

        openChatPage() {
            window.location.href = 'apps-chat.html';
        },

        updatePageTitle() {
            if (this.unreadCount > 0) {
                document.title = `(${this.unreadCount}) Chat App`;
            } else {
                return
            }
        },

        playNotificationSound() {
            try {
                const audio = new Audio('/assets/sounds/notification.mp3');
                audio.volume = 0.3;
                audio.play().catch(() => { });
            } catch (error) { }
        },

        resetUnreadCount() {
            this.unreadCount = 0;
            this.updateHeaderNotification();
            this.updatePageTitle();

            this.resetLocalUnreadCount();
        },

        resetLocalUnreadCount() {
            if (this.chatData) {
                if (this.chatData.allUsers && Array.isArray(this.chatData.allUsers)) {
                    this.chatData.allUsers.forEach(user => {
                        user.unreadCount = 0;
                    });
                }

                if (this.chatData.contactList && Array.isArray(this.chatData.contactList)) {
                    this.chatData.contactList.forEach(user => {
                        user.unreadCount = 0;
                    });
                }

                this.saveToLocalStorage();
            }
        }
    }));
    Alpine.data('logout', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async handleLogout() {
            const token = localStorage.getItem('authToken');
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    if (response.status === 500) {
                        this.clearAuthData();
                        window.location.href = 'auth-boxed-signin.html';
                        return;
                    }

                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'فشل تسجيل الخروج');
                }

                this.clearAuthData();
                window.location.href = 'auth-boxed-signin.html';

            } catch (error) {
                this.clearAuthData();
                window.location.href = 'auth-boxed-signin.html';
            }
        },

        clearAuthData() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('chatData');
            localStorage.removeItem('userData');

            },
    }));
    Alpine.store('i18n', {
        locale: localStorage.getItem('language') || 'en',
        translations: {},
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.loadTranslations(this.locale);
        },

        async loadTranslations(locale) {
            try {
                const response = await fetch(`lang/${locale}.json`);
                if (!response.ok) throw new Error('Failed to load translations');
                this.translations = await response.json();
                this.locale = locale;
                localStorage.setItem('language', locale);
                this.applyDirection(locale);
            } catch (error) {
                if (locale !== 'en') await this.loadTranslations('en');
            }
        },

        async setLocale(locale) {
            await this.loadTranslations(locale);
            setTimeout(() => {
                window.location.reload();
            }, 0);
            if (window.multipleTable) {
                window.multipleTable.fetchManagers();
            }
        },

        t(key) {
            return this.translations[key] || key;
        },

        applyDirection(locale) {
            if (locale === 'ar') {
                document.documentElement.lang = 'ar';
            } else {
                document.documentElement.lang = 'en';
            }
        },
    });

    Alpine.store('i18n').init();

    // Create a store for header notifications
    Alpine.store('notifications', {
        notifications: [],
        unreadCount: 0,
        
        get unreadNotifications() {
            return this.notifications.filter(n => !n.isRead);
        },
        
        init() {
            // Store initialized
        },
        
        addNotification(notification) {
            // Check if notification already exists (by ID or notification_id from data)
            const notificationId = notification.id;
            const dataNotificationId = notification.data?.message?.notification_id;
            
            const exists = this.notifications.find(n => 
                n.id === notificationId ||
                (dataNotificationId && (n.data?.message?.notification_id === dataNotificationId || n.id === dataNotificationId))
            );
            
            if (!exists) {
                this.notifications.unshift(notification);
                if (this.notifications.length > 50) {
                    this.notifications = this.notifications.slice(0, 50);
                }
                this.updateUnreadCount();
            }
        },
        
        markAsRead(notificationId) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.isRead) {
                notification.isRead = true;
                this.updateUnreadCount();
            }
        },
        
        markAllAsRead() {
            this.notifications.forEach(n => n.isRead = true);
            this.updateUnreadCount();
        },
        
        updateUnreadCount() {
            this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        }
    });

});

// Horizontal Menu Scroll Functions
function scrollHorizontalMenu(direction) {
    const menu = document.getElementById('horizontalMenuList');
    if (!menu) {
        // Menu element not found
        return;
    }
    
    // Check if menu is scrollable
    const isScrollable = menu.scrollWidth > menu.clientWidth;
    if (!isScrollable) {
        return;
    }
    
    const scrollAmount = 300; // pixels to scroll
    const currentScroll = menu.scrollLeft;
    const maxScroll = menu.scrollWidth - menu.clientWidth;
    
    let newScroll;
    
    // Calculate new scroll position
    if (direction === 'left') {
        newScroll = Math.max(0, currentScroll - scrollAmount);
    } else {
        newScroll = Math.min(maxScroll, currentScroll + scrollAmount);
    }
    
    // Try multiple methods to ensure scrolling works
    if (menu.scrollTo) {
        menu.scrollTo({
            left: newScroll,
            behavior: 'smooth'
        });
    } else if (menu.scrollBy) {
        const delta = newScroll - currentScroll;
        menu.scrollBy({
            left: delta,
            behavior: 'smooth'
        });
    } else {
        // Fallback for older browsers
        menu.scrollLeft = newScroll;
    }
    
    // Check buttons after scroll
    setTimeout(checkScrollButtons, 400);
}

// Make function globally available
window.scrollHorizontalMenu = scrollHorizontalMenu;
window.checkScrollButtons = checkScrollButtons;

function checkScrollButtons() {
    const menu = document.getElementById('horizontalMenuList');
    const leftContainer = document.getElementById('scrollLeftContainer');
    const rightContainer = document.getElementById('scrollRightContainer');
    const leftBtn = document.getElementById('scrollLeftBtn');
    const rightBtn = document.getElementById('scrollRightBtn');
    
    if (!menu || !leftContainer || !rightContainer || !leftBtn || !rightBtn) return;
    
    const isScrollable = menu.scrollWidth > menu.clientWidth;
    const isRTL = document.documentElement.dir === 'rtl' || 
                  document.body.classList.contains('rtl') ||
                  menu.classList.contains('rtl');
    
    let isAtStart, isAtEnd;
    
    if (isRTL) {
        // In RTL, scrollLeft behavior is inverted
        // When scrollLeft is 0, we're at the end (right side)
        // When scrollLeft is max, we're at the start (left side)
        const maxScroll = menu.scrollWidth - menu.clientWidth;
        isAtStart = menu.scrollLeft >= maxScroll - 1;
        isAtEnd = menu.scrollLeft <= 1;
    } else {
        // Normal LTR behavior
        isAtStart = menu.scrollLeft <= 1;
        isAtEnd = menu.scrollLeft >= menu.scrollWidth - menu.clientWidth - 1;
    }
    
    // Show/hide containers based on scroll position
    if (isScrollable) {
        leftContainer.style.display = isAtStart ? 'none' : 'block';
        rightContainer.style.display = isAtEnd ? 'none' : 'block';
    } else {
        leftContainer.style.display = 'none';
        rightContainer.style.display = 'none';
    }
}

// Initialize scroll buttons on page load and resize
function initHorizontalMenuScroll() {
    const menu = document.getElementById('horizontalMenuList');
    const leftContainer = document.getElementById('scrollLeftContainer');
    const rightContainer = document.getElementById('scrollRightContainer');
    const leftBtn = document.getElementById('scrollLeftBtn');
    const rightBtn = document.getElementById('scrollRightBtn');
    
    if (!menu || !leftContainer || !rightContainer || !leftBtn || !rightBtn) {
        setTimeout(initHorizontalMenuScroll, 200);
        return;
    }
    
    // Use onclick for better compatibility
    leftBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollHorizontalMenu('left');
        return false;
    };
    
    rightBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollHorizontalMenu('right');
        return false;
    };
    
    // Also add event listeners as backup
    leftBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollHorizontalMenu('left');
    }, { once: false });
    
    rightBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        scrollHorizontalMenu('right');
    }, { once: false });
    
    // Check buttons initially
    checkScrollButtons();
    
    // Listen for scroll events
    if (menu) {
        menu.addEventListener('scroll', checkScrollButtons);
        
        // Listen for wheel events for better UX
        menu.addEventListener('wheel', (e) => {
            setTimeout(checkScrollButtons, 100);
        });
    }
    
    // Listen for resize
    window.addEventListener('resize', () => {
        setTimeout(checkScrollButtons, 100);
    });
    
    // Check after delays to ensure menu is fully rendered
    setTimeout(checkScrollButtons, 500);
    setTimeout(checkScrollButtons, 1000);
    setTimeout(checkScrollButtons, 2000);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initHorizontalMenuScroll, 300);
    });
} else {
    setTimeout(initHorizontalMenuScroll, 300);
}
