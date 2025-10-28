document.addEventListener('alpine:init', () => {
    Alpine.data('chat', () => ({
        isShowUserChat: false,
        isShowChatMenu: false,
        pusher: null,
        channel: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        onlineStatus: true,

        loginUser: {
            id: null,
            name: '',
            path: 'profile-34.jpeg',
            designation: 'User',
            is_online: false,
            last_seen_at: null
        },

        contactList: [],
        selectedUser: null,
        searchUser: '',
        textMessage: '',
        isLoading: true,
        allUsers: [],
        showAllUsers: true,

        // دالة الترجمة
        t(key) {
            return Alpine.store('i18n').t(`${key}`);
        },

        async init() {
            await this.loadCurrentUser();
            this.onlineStatus = this.loginUser.is_online;
            await this.loadAllUsers();
            await this.loadOnlineUsers();
            this.initializePusher();
            this.startOnlineUsersPolling();
            this.startLastSeenUpdates();
            this.setupPageVisibilityHandlers();
            this.notifyHeaderUpdate();
        },

        notifyHeaderUpdate() {
            const event = new CustomEvent('chat-data-updated', {
                detail: this
            });
            document.dispatchEvent(event);
        },

        startLastSeenUpdates() {
            setInterval(async () => {
                await this.updateLastSeen();
            }, 60000);
        },

        setupPageVisibilityHandlers() {
            window.addEventListener('beforeunload', async () => {
                if (this.onlineStatus) {
                    await this.markOffline();
                }
            });

            document.addEventListener('visibilitychange', async () => {
                if (document.hidden) {
                    if (this.onlineStatus) {
                        await this.updateLastSeen();
                    }
                } else {
                    if (this.onlineStatus) {
                        await this.markOnline();
                        await this.updateLastSeen();
                    }
                }
            });

            window.addEventListener('pagehide', async () => {
                if (this.onlineStatus) {
                    await this.markOffline();
                }
            });
        },

        initializePusher() {
            try {
                this.pusher = new Pusher('0c6840048793ecd5b54f', {
                    cluster: 'mt1',
                    encrypted: true
                });

                const channelName = `chat-private-channel-${this.loginUser.id}`;
                this.channel = this.pusher.subscribe(channelName);

                this.channel.bind("Private_chat", (data) => {
                    this.handlePrivateChat(data);
                });
            } catch (error) {
                console.error('Pusher initialization error:', error);
            }
        },

        async loadAllUsers() {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/admin/user/get_all?per_page=100`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status && data.data) {
                    this.allUsers = data.data.data
                        .filter(user => user.id !== this.loginUser.id && user.type === '0')
                        .map(user => ({
                            userId: user.id,
                            name: user.name,
                            email: user.email,
                            path: user.image || this.getUserAvatar(user.id),
                            phone: user.phone,
                            country: user.country,
                            time: this.formatTime(user.last_seen_at),
                            preview: this.t('start_conversation'),
                            messages: [],
                            active: false,
                            is_online: false,
                            unreadCount: 0,
                            last_seen_at: user.last_seen_at,
                            last_seen_formatted: user.last_seen_formatted,
                            created_at: user.created_at
                        }));

                    this.mergeUsers();
                }
            } catch (error) {
                console.error('Error loading users:', error);
            }
        },

        mergeUsers() {
            this.allUsers.forEach(user => {
                const onlineUser = this.contactList.find(online => online.userId === user.userId);
                if (onlineUser) {
                    user.active = onlineUser.active;
                    user.is_online = onlineUser.is_online;
                    user.time = onlineUser.time;
                    user.last_seen_at = onlineUser.last_seen_at;
                    user.last_seen_formatted = onlineUser.last_seen_formatted;

                    if (onlineUser.messages && onlineUser.messages.length > 0) {
                        user.messages = [...onlineUser.messages];
                    }

                    user.unreadCount = onlineUser.unreadCount || 0;
                }
            });

            this.contactList.forEach(onlineUser => {
                const existingUser = this.allUsers.find(user => user.userId === onlineUser.userId);
                if (!existingUser) {
                    this.allUsers.push({ ...onlineUser });
                }
            });

            this.sortUsers();
        },

        sortUsers() {
            this.allUsers.sort((a, b) => {
                if (a.is_online && !b.is_online) return -1;
                if (!a.is_online && b.is_online) return 1;
                return new Date(b.last_seen_at) - new Date(a.last_seen_at);
            });
        },

        async loadMoreMessages(userId, page) {
            if (!this.selectedUser || this.selectedUser.userId !== userId) return;

            try {
                const messages = await this.getConversation(userId, page, 20);

                if (messages.length > 0) {
                    const newMessages = messages.map(msg => ({
                        id: msg.id,
                        fromUserId: msg.sender_id || msg.from_user_id,
                        toUserId: msg.receiver_id || msg.to_user_id,
                        text: msg.message || msg.text,
                        time: this.formatTime(msg.created_at || msg.timestamp),
                        timestamp: msg.created_at || msg.timestamp,
                        isRead: msg.is_read || msg.read_at !== null,
                        conversationId: msg.conversation_id
                    }));

                    this.selectedUser.messages = [...newMessages, ...this.selectedUser.messages];
                }
            } catch (error) {
                console.error('Error loading more messages:', error);
            }
        },

        async loadCurrentUser() {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return;
            }

            try {
                const url = `${this.apiBaseUrl}/api/chat/my-online-status`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    this.loginUser = {
                        id: data.user_id,
                        name: data.name,
                        path: 'profile-34.jpeg',
                        designation: 'User',
                        is_online: data.is_online,
                        last_seen_at: data.last_seen_at,
                        last_seen_formatted: data.last_seen_formatted,
                        is_recently_active: data.is_recently_active
                    };

                    this.onlineStatus = data.is_online;
                } else {
                    throw new Error(data.message || 'Failed to load user data');
                }
            } catch (error) {
                console.error('Error loading current user:', error);
            } finally {
                this.isLoading = false;
            }
        },

        handlePrivateChat(data) {
            const { sender_id, message, sender_name, created_at, message_id, conversation_id } = data;

            if (sender_id !== this.loginUser.id) {
                let user = this.allUsers.find(u => u.userId === sender_id);

                if (!user) {
                    user = {
                        userId: sender_id,
                        name: sender_name || `User ${sender_id}`,
                        path: this.getUserAvatar(sender_id),
                        time: this.formatTime(created_at),
                        preview: message || this.t('new_message'),
                        messages: [],
                        active: true,
                        unreadCount: 0,
                        conversationId: conversation_id
                    };
                    this.allUsers.unshift(user);
                }

                this.allUsers = [...this.allUsers];
            }
        },

        async loadOnlineUsers() {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/online-users`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                if (data.status === 'success') {
                    this.contactList = data.online_users
                        .filter(onlineUser => onlineUser.id !== this.loginUser.id)
                        .map(onlineUser => ({
                            userId: onlineUser.id,
                            name: onlineUser.name,
                            path: onlineUser.image || this.getUserAvatar(onlineUser.id),
                            time: onlineUser.last_seen_formatted,
                            preview: this.t('start_conversation'),
                            messages: [],
                            active: true,
                            is_online: true,
                            unreadCount: 0,
                            last_seen_at: onlineUser.last_seen_at,
                            last_seen_formatted: onlineUser.last_seen_formatted
                        }));

                    this.mergeUsers();
                }
            } catch (error) {
                console.error('Error loading online users:', error);
            }
        },

        startOnlineUsersPolling() {
            setInterval(() => {
                this.loadOnlineUsers();
            }, 60000);
        },

        handleMessageRead(data) {
            const { userId, messageIds, conversationId } = data;

            if (this.selectedUser && this.selectedUser.userId === userId) {
                this.selectedUser.messages.forEach(message => {
                    if (messageIds.includes(message.id) || message.conversationId === conversationId) {
                        message.isRead = true;
                    }
                });
            }
        },

        async sendMessage() {
            if (this.textMessage.trim() && this.selectedUser) {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    return;
                }

                const url = `${this.apiBaseUrl}/api/chat/SendTo/${this.selectedUser.userId}`;

                const messageData = {
                    message: this.textMessage.trim()
                };

                try {
                    this.addMessageLocally(this.textMessage.trim());

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                        },
                        body: JSON.stringify(messageData)
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();
                    await this.updateLastSeen();

                    // إشعار بنجاح الإرسال
                    this.showToast(this.t('message_sent'), 'success');
                } catch (error) {
                    this.markMessageAsFailed();
                    this.showToast(this.t('message_failed'), 'error');
                }
            }
        },

        markMessageAsFailed() {
            if (this.selectedUser && this.selectedUser.messages && this.selectedUser.messages.length > 0) {
                const lastMessage = this.selectedUser.messages[this.selectedUser.messages.length - 1];
                lastMessage.isSent = false;
                lastMessage.isFailed = true;

                this.selectedUser.messages = [...this.selectedUser.messages];
            }
        },

        addMessageLocally(messageText, messageId = null, conversationId = null, isSent = true) {
            if (!this.selectedUser) {
                return;
            }

            const newMessage = {
                id: messageId || `temp_${Date.now()}`,
                fromUserId: this.loginUser.id,
                toUserId: this.selectedUser.userId,
                text: messageText,
                time: this.t('just_now'),
                timestamp: new Date().toISOString(),
                isRead: true,
                isSent: isSent,
                isSentByMe: true,
                conversationId: conversationId || this.selectedUser.conversationId
            };

            if (!this.selectedUser.messages) {
                this.selectedUser.messages = [];
            }

            this.selectedUser.messages.push(newMessage);
            this.selectedUser.preview = messageText;
            this.selectedUser.time = this.t('just_now');

            if (conversationId && !this.selectedUser.conversationId) {
                this.selectedUser.conversationId = conversationId;
            }

            const contactUser = this.contactList.find(u => u.userId === this.selectedUser.userId);
            if (contactUser) {
                if (!contactUser.messages) {
                    contactUser.messages = [];
                }
                contactUser.messages.push(newMessage);
                contactUser.preview = messageText;
                contactUser.time = this.t('just_now');
            }

            this.textMessage = '';
            this.scrollToBottom();
            this.contactList = [...this.contactList];
        },

        async markMessagesAsRead(userId) {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return;
            }

            try {
                const unreadMessages = this.selectedUser.messages.filter(
                    msg => msg.fromUserId === userId && !msg.isRead
                );

                if (unreadMessages.length > 0) {
                    const messageIds = unreadMessages.map(msg => msg.id);

                    const response = await fetch(`${this.apiBaseUrl}/api/chat/mark-as-read`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${token}`,
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                        },
                        body: JSON.stringify({
                            userId: userId,
                            messageIds: messageIds,
                            conversationId: this.selectedUser.conversationId
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const result = await response.json();

                    if (result.status === 'success') {
                        unreadMessages.forEach(msg => {
                            msg.isRead = true;
                        });
                        this.selectedUser.unreadCount = 0;
                    }
                }
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        },

        async loadChatHistory(userId) {
            try {
                const messages = await this.getConversation(userId, 1, 50);

                if (messages && messages.length > 0) {
                    let user = this.contactList.find(u => u.userId === userId);

                    if (!user) {
                        user = {
                            userId: userId,
                            name: `User ${userId}`,
                            path: this.getUserAvatar(userId),
                            time: this.t('just_now'),
                            preview: messages[0]?.message || this.t('new_message'),
                            messages: [],
                            active: true,
                            unreadCount: 0
                        };
                        this.contactList.push(user);
                    }

                    user.messages = messages.map(msg => ({
                        id: msg.id,
                        fromUserId: msg.sender_id,
                        toUserId: msg.receiver_id,
                        text: msg.message,
                        time: msg.time_ago || this.formatTime(msg.created_at),
                        timestamp: msg.created_at,
                        isRead: msg.is_read === 1,
                        isSentByMe: msg.is_sent_by_me,
                        conversationId: msg.chat_id
                    }));

                    user.messages.reverse();

                    if (this.selectedUser && this.selectedUser.userId === userId) {
                        this.selectedUser.messages = [...user.messages];
                        this.scrollToBottom();
                    }
                } else {
                    if (this.selectedUser && this.selectedUser.userId === userId) {
                        this.selectedUser.messages = this.selectedUser.messages || [];
                    }
                }
            } catch (error) {
                console.error('Error loading chat history:', error);
                if (this.selectedUser && this.selectedUser.userId === userId) {
                    this.selectedUser.messages = this.selectedUser.messages || [];
                }
            }
        },

        async updateLastSeen() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/update-last-seen`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    // تم التحديث بنجاح
                }
            } catch (error) {
                console.error('Error updating last seen:', error);
            }
        },

        async markOffline() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/mark-offline`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    // تم التعطيل بنجاح
                }
            } catch (error) {
                console.error('Error marking offline:', error);
            }
        },

        async markOnline() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/mark-online`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    // تم التفعيل بنجاح
                }
            } catch (error) {
                console.error('Error marking online:', error);
            }
        },

        async getConversation(userId, page = 1, perPage = 20) {
            const token = localStorage.getItem('authToken');
            if (!token) {
                return [];
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/getConversation/${userId}?page=${page}&per_page=${perPage}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    return data.data || [];
                } else {
                    throw new Error(data.message || 'Failed to load conversation');
                }
            } catch (error) {
                console.error('Error getting conversation:', error);
                return [];
            }
        },

        searchUsers() {
            setTimeout(() => {
                const element = document.querySelector('.chat-users');
                if (element) {
                    element.scrollTop = 0;
                }
            });

            if (!this.searchUser.trim()) {
                return this.allUsers;
            }

            const searchTerm = this.searchUser.toLowerCase();
            return this.allUsers.filter((user) => {
                return user.name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    user.userId.toString().includes(searchTerm);
            });
        },

        async selectUser(user) {
            const userIndex = this.allUsers.findIndex(u => u.userId === user.userId);
            if (userIndex !== -1) {
                this.selectedUser = {
                    ...this.allUsers[userIndex],
                    messages: this.allUsers[userIndex].messages ? [...this.allUsers[userIndex].messages] : []
                };
            } else {
                this.selectedUser = {
                    ...user,
                    messages: user.messages ? [...user.messages] : []
                };
            }

            this.isShowUserChat = true;
            this.isShowChatMenu = false;

            await this.updateLastSeen();

            if (!this.selectedUser.messages || this.selectedUser.messages.length === 0) {
                await this.loadChatHistory(user.userId);
            }

            if (user.unreadCount > 0) {
                await this.markMessagesAsRead(user.userId);

                const userInAll = this.allUsers.find(u => u.userId === user.userId);
                if (userInAll) {
                    userInAll.unreadCount = 0;
                }
            }

            this.scrollToBottom();
            this.allUsers = [...this.allUsers];
        },

        scrollToBottom() {
            if (this.isShowUserChat) {
                setTimeout(() => {
                    const element = document.querySelector('.chat-conversation-box');
                    if (element) {
                        element.scrollTop = element.scrollHeight;
                    }
                }, 100);
            }
        },

        formatTime(timestamp) {
            if (!timestamp) return this.t('just_now');

            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return this.t('just_now');
            if (diffMins < 60) return `${diffMins}${this.t('minutes_ago')}`;
            if (diffHours < 24) return `${diffHours}${this.t('hours_ago')}`;
            if (diffDays < 7) return `${diffDays}${this.t('days_ago')}`;

            return date.toLocaleDateString();
        },

        getUserAvatar(userId) {
            const avatars = [
                'profile-1.jpeg', 'profile-2.jpeg', 'profile-3.jpeg',
                'profile-4.jpeg', 'profile-5.jpeg', 'profile-6.jpeg',
                'profile-7.jpeg', 'profile-8.jpeg', 'profile-9.jpeg', 'profile-10.jpeg'
            ];
            return avatars[userId % avatars.length] || 'profile-default.jpeg';
        },

        async toggleOnlineStatus() {
            try {
                if (this.loginUser.is_online) {
                    await this.goOffline();
                } else {
                    await this.goOnline();
                }
                this.showToast(this.t('status_updated'), 'success');
            } catch (error) {
                this.showToast(this.t('failed_status_change'), 'error');
            }
        },

        async goOffline() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/mark-offline`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    this.loginUser.is_online = false;
                    this.onlineStatus = false;
                }
            } catch (error) {
                throw error;
            }
        },

        async goOnline() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/chat/mark-online`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    this.loginUser.is_online = true;
                    this.onlineStatus = true;
                    await this.updateLastSeen();
                }
            } catch (error) {
                throw error;
            }
        },

        showToast(message, type = 'info') {
            // يمكنك استخدام مكتبة الإشعارات الخاصة بك هنا
            const toast = window.Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
            });

            toast.fire({
                icon: type,
                title: message
            });
        }
    }));
});
