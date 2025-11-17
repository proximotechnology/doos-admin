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
        unreadCount: 0,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        chatData: null,

        init() {
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

            this.loadChatData();

            this.setupChatDataListener();

            if (this.isInternalPage()) {
                this.initializePusher();
            }
        },

        isInternalPage() {
            const currentPath = window.location.pathname;
            const excludedPages = [
                '/auth-boxed-signin.html',
                '/auth-boxed-signup.html',
                '/auth-cover-login.html',
                '/auth-cover-register.html',
                '/index.html'
            ];
            return !excludedPages.some(page => currentPath.includes(page));
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
                console.error('Error loading chat data from storage:', error);
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
                console.error('Error saving chat data to storage:', error);
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
                console.error('Error initializing Pusher in header:', error);
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
                console.error('Error loading user for Pusher:', error);
            }
        },

        initPusher(userId) {
            try {
                this.pusher = new Pusher('0c6840048793ecd5b54f', {
                    cluster: 'mt1',
                    encrypted: true
                });

                const channelName = `chat-private-channel-${userId}`;
                this.channel = this.pusher.subscribe(channelName);

                this.channel.bind("Private_chat", (data) => {
                    this.handleNewMessage(data);
                });

            } catch (error) {
                console.error('Error initializing Pusher in header:', error);
            }
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
                        console.warn('Server error 500 during logout - clearing token locally');
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
                console.log('Logout error:', error);

                this.clearAuthData();
                window.location.href = 'auth-boxed-signin.html';
            }
        },

        clearAuthData() {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('chatData');
            localStorage.removeItem('userData');

            console.log('Auth data cleared successfully');
        },
    }));
    Alpine.store('i18n', {
        locale: localStorage.getItem('language') || 'en',
        translations: {},

        async init() {
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
                console.error('Error loading translations:', error);
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

});
