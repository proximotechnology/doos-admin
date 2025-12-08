const loadingIndicator = {
    show: function () {
        document.getElementById('loadingIndicator').classList.remove('hidden');
    },
    hide: function () {
        document.getElementById('loadingIndicator').classList.add('hidden');
    },
    showTableLoader: function () {
    },
    hideTableLoader: function () {
    },
    showEmptyState: function () {
    }
};

function coloredToast(color, message) {
    const toast = window.Swal.mixin({
        toast: true,
        position: 'bottom-start',
        showConfirmButton: false,
        timer: 3000,
        showCloseButton: true,
        customClass: {
            popup: `color-${color}`,
        },
    });
    toast.fire({
        title: message,
    });
}

document.addEventListener('alpine:init', () => {
    Alpine.data('supportTickets', () => ({
        t(key) {
            return Alpine.store('i18n').t(`${key}`);
        },
        // State
        isShowTicketDetail: false,
        isShowTicketMenu: false,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        loginUser: {
            id: null,
            name: 'Admin User'
        },

        // Data
        tickets: [],
        selectedTicket: null,
        ticketMessages: [],
        searchTicket: '',
        statusFilter: '',
        priorityFilter: '',
        replyMessage: '',
        attachments: [],
        attachmentInput: null,

        // Statistics
        statistics: {
            overview: {},
            priority_breakdown: {},
            status_breakdown: {},
            category_breakdown: [],
            time_series: [],
            performance: {}
        },

        quickReplies: [
            {
                id: 1,
                label: Alpine.store('i18n').t('quick_reply_templates_thanks_contacting'),
                text: Alpine.store('i18n').t('quick_reply_templates_thanks_contacting') + '. ' + Alpine.store('i18n').t('quick_replies_text_thanks_contacting')
            },
            {
                id: 2,
                label: Alpine.store('i18n').t('quick_reply_templates_need_more_info'),
                text: Alpine.store('i18n').t('quick_reply_templates_need_more_info') + '. ' + Alpine.store('i18n').t('quick_replies_text_need_more_info')
            },
            {
                id: 3,
                label: Alpine.store('i18n').t('quick_reply_templates_issue_resolved'),
                text: Alpine.store('i18n').t('quick_reply_templates_issue_resolved') + '. ' + Alpine.store('i18n').t('quick_replies_text_issue_resolved')
            },
            {
                id: 4,
                label: Alpine.store('i18n').t('quick_reply_templates_follow_up'),
                text: Alpine.store('i18n').t('quick_reply_templates_follow_up') + '. ' + Alpine.store('i18n').t('quick_replies_text_follow_up')
            }
        ],
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            // Get logged in user info
            await this.loadUserInfo();

            await this.loadTickets();
            await this.loadStatistics();
            
            // Initialize attachment input after DOM is ready
            this.$nextTick(() => {
                this.initAttachmentInput();
            });
        },

        async loadUserInfo() {
            try {
                // Only check localStorage, don't call API
                const userInfo = localStorage.getItem('userInfo');
                if (userInfo) {
                    try {
                        const user = JSON.parse(userInfo);
                        this.loginUser.id = user.id || user.user_id;
                        this.loginUser.name = user.name || 'Admin User';
                        console.log('User info loaded from localStorage:', this.loginUser);
                        return;
                    } catch (e) {
                        console.warn('Failed to parse userInfo from localStorage:', e);
                    }
                }
                
                // If not found, don't fetch automatically
                console.log('User info not found in localStorage. Will fetch when needed.');
            } catch (error) {
                console.error('Error loading user info:', error);
            }
        },

        async fetchUserInfoFromAPI() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    console.warn('No auth token found');
                    return false;
                }

                // Use ApiService instead of direct fetch
                const data = await ApiService.getProfile();

                if (data.status === true && data.user) {
                    this.loginUser.id = data.user.id;
                    this.loginUser.name = data.user.name || 'Admin User';
                    
                    // Save to localStorage for future use
                    localStorage.setItem('userInfo', JSON.stringify({
                        id: data.user.id,
                        name: data.user.name,
                        email: data.user.email,
                        type: data.user.type
                    }));
                    
                    console.log('User info fetched from API:', this.loginUser);
                    return true;
                }
                return false;
            } catch (error) {
                console.error('Error fetching user info from API:', error);
                return false;
            }
        },

        async loadTickets() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const data = await ApiService.getTickets();

                if (data.status === true && Array.isArray(data.data)) {
                    this.tickets = data.data.map(ticket => ({
                        id: ticket.id,
                        ticket_number: ticket.ticket_number,
                        title: ticket.title,
                        subject: ticket.title, // For backward compatibility
                        user_name: ticket.user_name,
                        user: { name: ticket.user_name }, // For backward compatibility
                        priority: ticket.priority ? ticket.priority.toLowerCase() : 'medium', // Convert to lowercase
                        status: ticket.status ? ticket.status.toLowerCase() : 'open', // Read from API or default to 'open'
                        created_at: ticket.created_at_short,
                        created_at_short: ticket.created_at_short,
                        unread_messages_count: ticket.unread_messages_count || 0,
                        chat_count: ticket.unread_messages_count || 0 // For backward compatibility
                    }));
                    coloredToast('success', `${this.t('loaded_tickets')?.replace('{count}', this.tickets.length) || `Loaded ${this.tickets.length} tickets`}`);
                }
            } catch (error) {
                console.error('Error loading tickets:', error);
                coloredToast('danger', this.t('failed_to_load') || 'Failed to load tickets');
            } finally {
                loadingIndicator.hide();
            }
        },

        async loadStatistics() {
            try {
                const data = await ApiService.getTicketStatistics(30, 'day');
                if (data.status === 'success') {
                    this.statistics = data.statistics;
                }
            } catch (error) {
                }
        },

        filteredTickets() {
            let filtered = this.tickets;

            if (this.searchTicket) {
                const searchTerm = this.searchTicket.toLowerCase();
                filtered = filtered.filter(ticket =>
                    ticket.ticket_number.toLowerCase().includes(searchTerm) ||
                    ticket.subject.toLowerCase().includes(searchTerm) ||
                    ticket.user?.name.toLowerCase().includes(searchTerm)
                );
            }

            if (this.statusFilter) {
                filtered = filtered.filter(ticket => ticket.status === this.statusFilter);
            }

            if (this.priorityFilter) {
                filtered = filtered.filter(ticket => ticket.priority === this.priorityFilter);
            }

            return filtered;
        },

        async selectTicket(ticket) {
            try {
                loadingIndicator.show();
                this.isShowTicketDetail = true;
                this.isShowTicketMenu = false;

                // Always load full ticket details
                await this.loadTicketDetails(ticket.id);

                coloredToast('success', `${this.t('ticket_selected')?.replace('{number}', ticket.ticket_number) || `Ticket ${ticket.ticket_number} selected`}`);
            } catch (error) {
                console.error('Error selecting ticket:', error);
                coloredToast('danger', this.t('failed_to_load_ticket_details') || 'Failed to load ticket details');
            } finally {
                loadingIndicator.hide();
            }
        },

        async loadTicketDetails(ticketId) {
            try {
                loadingIndicator.show();
                const data = await ApiService.getTicketDetails(ticketId);

                if (data.status === true && data.ticket) {
                    // Update selected ticket with ticket info
                    this.selectedTicket = {
                        id: data.ticket.id,
                        ticket_number: `DSS-${data.ticket.id}`, // Fallback if not provided
                        title: data.ticket.description?.substring(0, 50) || 'No title',
                        subject: data.ticket.description?.substring(0, 50) || 'No title',
                        user_name: data.ticket.user_name,
                        user: { 
                            name: data.ticket.user_name,
                            email: data.ticket.user_name // Fallback
                        },
                        category: data.ticket.category,
                        priority: data.ticket.priority?.toLowerCase() || 'medium',
                        status: data.ticket.status || 'open',
                        created_at: data.ticket.created_at,
                        last_ativity: data.ticket.last_ativity,
                        description: data.ticket.description,
                        updated_at: data.ticket.last_ativity
                    };

                    // Load messages
                    if (Array.isArray(data.messages)) {
                        this.ticketMessages = data.messages.map(msg => {
                            // Check if is_internal_note exists in API response
                            let isInternalNote = 0;
                            if (msg.is_internal_note !== undefined && msg.is_internal_note !== null) {
                                // Use value from API
                                isInternalNote = (msg.is_internal_note === 1 || msg.is_internal_note === '1' || msg.is_internal_note === true) ? 1 : 0;
                            } else {
                                // Fallback: detect from message content
                                isInternalNote = (msg.message?.startsWith('Priority changed') || msg.message?.startsWith('Resolution:')) ? 1 : 0;
                            }
                            
                            return {
                                id: msg.id,
                                message: msg.message,
                                attachments: msg.attachments || [],
                                created_at: msg.created_at,
                                sender: msg.sender, // "me" or "other"
                                sender_id: msg.sender === 'me' ? this.loginUser.id : null,
                                is_internal_note: isInternalNote
                            };
                        });
                        
                        // Debug: log messages to console
                        console.log('Loaded ticket messages:', this.ticketMessages);
                    } else {
                        this.ticketMessages = [];
                    }

                    // Update the ticket in the list
                    const index = this.tickets.findIndex(t => t.id === ticketId);
                    if (index !== -1) {
                        this.tickets[index] = { 
                            ...this.tickets[index], 
                            status: this.selectedTicket.status,
                            priority: this.selectedTicket.priority
                        };
                    }
                }
            } catch (error) {
                console.error('Error loading ticket details:', error);
                coloredToast('danger', this.t('failed_to_load_ticket_details') || 'Failed to load ticket details');
                throw error;
            } finally {
                loadingIndicator.hide();
            }
        },

        async sendReply(isInternalNote = false) {
            if (!this.replyMessage.trim() || !this.selectedTicket) {
                coloredToast('warning', this.t('please_enter_message') || 'Please enter a message');
                return;
            }

            try {
                loadingIndicator.show();
                
                // Prepare form data if there are attachments
                let requestData;
                let isFormData = false;
                
                if (this.attachments.length > 0) {
                    const formData = new FormData();
                    formData.append('message', this.replyMessage.trim());
                    formData.append('is_internal_note', isInternalNote ? '1' : '0');
                    
                    // Add attachments
                    this.attachments.forEach((file, index) => {
                        formData.append(`attachments[${index}]`, file);
                    });
                    
                    requestData = formData;
                    isFormData = true;
                } else {
                    requestData = {
                        message: this.replyMessage.trim(),
                        is_internal_note: isInternalNote ? 1 : 0,
                        attachments: []
                    };
                }

                const data = await ApiService.sendTicketReply(this.selectedTicket.id, requestData, isFormData);

                if (data.status === 'success' || data.status === true) {
                    // Add message to conversation
                    this.ticketMessages.push({
                        id: Date.now(), // Temporary ID
                        message: this.replyMessage.trim(),
                        attachments: this.attachments.map(f => ({ name: f.name, url: '' })),
                        created_at: 'just now',
                        sender: 'me',
                        sender_id: this.loginUser.id,
                        is_internal_note: isInternalNote
                    });

                    this.replyMessage = '';
                    this.attachments = [];
                    this.clearAttachmentInput();
                    this.scrollToBottom();

                    // Reload ticket details to get updated messages
                    await this.loadTicketDetails(this.selectedTicket.id);
                    
                    const successMessage = isInternalNote 
                        ? (this.t('internal_note_added') || 'Internal note added successfully')
                        : (this.t('message_sent') || 'Message sent successfully');
                    coloredToast('success', successMessage);
                }
            } catch (error) {
                console.error('Error sending reply:', error);
                coloredToast('danger', this.t('failed_to_send') || 'Failed to send message');
            } finally {
                loadingIndicator.hide();
            }
        },

        async addInternalNote() {
            // Use the same sendReply function with isInternalNote = true
            await this.sendReply(true);
        },

        async updateStatus(status) {
            if (!this.selectedTicket) return;

            try {
                loadingIndicator.show();
                
                // Ensure we have a valid user ID
                if (!this.loginUser.id) {
                    // Try to fetch from API only when needed
                    const fetched = await this.fetchUserInfoFromAPI();
                    if (!fetched || !this.loginUser.id) {
                        coloredToast('danger', 'Could not load user information. Please login again.');
                        loadingIndicator.hide();
                        return;
                    }
                }

                const data = await ApiService.updateTicketStatus(
                    this.selectedTicket.id, 
                    status,
                    String(this.loginUser.id) // Convert to string as required by API
                );

                if (data.status === 'success' || data.status === true) {
                    this.selectedTicket.status = status;

                    // Update ticket in list
                    const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                    if (index !== -1) {
                        this.tickets[index].status = status;
                    }

                    await this.loadStatistics();
                    coloredToast('success', this.t('status_updated') || 'Status updated successfully');
                }
            } catch (error) {
                console.error('Error updating status:', error);
                coloredToast('danger', this.t('failed_to_update') || 'Failed to update status');
            } finally {
                loadingIndicator.hide();
            }
        },

        async updatePriority(priority) {
            if (!this.selectedTicket) return;

            try {
                loadingIndicator.show();
                const data = await ApiService.updateTicketPriority(this.selectedTicket.id, priority.toLowerCase());

                if (data.status === 'success' || data.status === true) {
                    this.selectedTicket.priority = priority.toLowerCase();

                    // Update ticket in list
                    const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                    if (index !== -1) {
                        this.tickets[index].priority = priority.toLowerCase();
                    }

                    // Add system message about priority change
                    this.ticketMessages.push({
                        id: Date.now(),
                        message: `Priority changed to ${this.getPriorityLabel(priority)}`,
                        attachments: [],
                        created_at: new Date().toISOString(),
                        sender: 'other',
                        is_internal_note: false
                    });

                    coloredToast('success', this.t('priority_updated') || 'Priority updated successfully');
                }
            } catch (error) {
                console.error('Error updating priority:', error);
                coloredToast('danger', this.t('failed_to_update') || 'Failed to update priority');
            } finally {
                loadingIndicator.hide();
            }
        },

        async closeTicket() {
            if (!this.selectedTicket) return;

            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const { value: formValues } = await Swal.fire({
                    title: this.t('close_ticket') || 'Close Ticket',
                    html: `
                        <input id="swal-resolution" class="swal2-input" placeholder="${this.t('resolution_summary') || 'Resolution Summary'}">
                        <input id="swal-admin-notes" class="swal2-input" placeholder="${this.t('admin_notes') || 'Admin Notes'} (${this.t('optional') || 'Optional'})">
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: this.t('close_ticket') || 'Close Ticket',
                    cancelButtonText: this.t('cancel') || 'Cancel',
                    preConfirm: () => {
                        const resolution = document.getElementById('swal-resolution').value;
                        if (!resolution) {
                            Swal.showValidationMessage(this.t('please_enter_reason') || 'Please enter a resolution');
                            return false;
                        }
                        return {
                            resolution: resolution,
                            admin_notes: document.getElementById('swal-admin-notes').value || ''
                        };
                    }
                });

                if (formValues) {
                    loadingIndicator.show();
                    const data = await ApiService.closeTicket(this.selectedTicket.id, {
                        resolution: formValues.resolution,
                        admin_notes: formValues.admin_notes
                    });

                    if (data.status === 'success' || data.status === true) {
                        this.selectedTicket.status = 'closed';

                        // Update ticket in list
                        const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                        if (index !== -1) {
                            this.tickets[index].status = 'closed';
                        }

                        // Add system message about resolution
                        this.ticketMessages.push({
                            id: Date.now(),
                            message: `Resolution: ${formValues.resolution}`,
                            attachments: [],
                            created_at: new Date().toISOString(),
                            sender: 'other',
                            is_internal_note: false
                        });

                        await this.loadStatistics();
                        coloredToast('success', this.t('ticket_closed') || 'Ticket closed successfully');
                    }
                }
            } catch (error) {
                console.error('Error closing ticket:', error);
                coloredToast('danger', this.t('failed_to_close') || 'Failed to close ticket');
            } finally {
                loadingIndicator.hide();
            }
        },

        async reopenTicket() {
            if (!this.selectedTicket) return;

            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const { value: formValues } = await Swal.fire({
                    title: this.t('reopen_ticket'),
                    html: `
                        <input id="swal-reason" class="swal2-input" placeholder="${this.t('reason_reopening')}">
                        <input id="swal-admin-notes" class="swal2-input" placeholder="${this.t('admin_notes')} (${this.t('optional')})">
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: this.t('reopen_ticket'),
                    cancelButtonText: this.t('cancel'),
                    preConfirm: () => {
                        const reason = document.getElementById('swal-reason').value;
                        if (!reason) {
                            Swal.showValidationMessage(this.t('please_enter_reason'));
                            return false;
                        }
                        return {
                            reason: reason,
                            admin_notes: document.getElementById('swal-admin-notes').value
                        };
                    }
                });

                if (formValues) {
                    loadingIndicator.show();
                    const data = await ApiService.reopenTicket(this.selectedTicket.id, {
                        reason: formValues.reason,
                        admin_notes: formValues.admin_notes
                    });

                    if (data.status === 'success') {
                        this.selectedTicket.status = 'open';

                        // Update ticket in list
                        const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                        if (index !== -1) {
                            this.tickets[index].status = 'open';
                        }

                        await this.loadStatistics();
                        coloredToast('success', this.t('ticket_reopened'));
                    }
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_reopen'));
            } finally {
                loadingIndicator.hide();
            }
        },

        applyQuickReply(reply) {
            this.replyMessage = reply.text;
        },

        // Utility methods
        getStatusLabel(status) {
            const statusLabels = {
                'open': this.t('open'),
                'in_progress': this.t('in_progress'),
                'closed': this.t('closed')
            };
            return statusLabels[status] || status;
        },

        getPriorityLabel(priority) {
            const priorityLabels = {
                'low': this.t('low'),
                'medium': this.t('medium'),
                'high': this.t('high'),
                'urgent': this.t('urgent')
            };
            return priorityLabels[priority] || priority;
        },

        getStatusBadgeClass(status) {
            const badgeClasses = {
                'open': 'bg-success/20 text-success',
                'in_progress': 'bg-warning/20 text-warning',
                'closed': 'bg-danger/20 text-danger'
            };
            return badgeClasses[status] || 'bg-gray-200 text-gray-800';
        },

        getPriorityBadgeClass(priority) {
            const badgeClasses = {
                'low': 'bg-success/20 text-success',
                'medium': 'bg-warning/20 text-warning',
                'high': 'bg-danger/20 text-danger',
                'urgent': 'bg-purple-500/20 text-purple-600'
            };
            return badgeClasses[priority] || 'bg-gray-200 text-gray-800';
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

        scrollToBottom() {
            setTimeout(() => {
                const element = document.querySelector('.ticket-conversation-box');
                if (element) {
                    element.scrollTop = element.scrollHeight;
                }
            }, 100);
        },

        // Attachment management
        initAttachmentInput() {
            this.attachmentInput = document.getElementById('attachmentInput');
            if (this.attachmentInput) {
                this.attachmentInput.addEventListener('change', (e) => {
                    this.handleFileSelect(e.target.files);
                });
            }
        },

        handleFileSelect(files) {
            Array.from(files).forEach(file => {
                // Validate file size (max 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    coloredToast('warning', `File ${file.name} is too large. Maximum size is 10MB.`);
                    return;
                }
                this.attachments.push(file);
            });
        },

        removeAttachment(index) {
            this.attachments.splice(index, 1);
        },

        clearAttachmentInput() {
            if (this.attachmentInput) {
                this.attachmentInput.value = '';
            }
        },

        openFilePicker() {
            if (this.attachmentInput) {
                this.attachmentInput.click();
            }
        },

        async openCamera() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                coloredToast('warning', 'Camera not supported on this device');
                return;
            }

            try {
                // Show camera modal
                const { value: photoConfirmed } = await Swal.fire({
                    title: this.t('take_photo') || 'Take Photo',
                    html: `
                        <div class="flex flex-col items-center gap-4 p-4">
                            <video id="cameraPreview" autoplay class="w-full max-h-96 rounded-lg bg-black"></video>
                            <canvas id="photoCanvas" class="hidden"></canvas>
                            <img id="capturedPhoto" class="hidden w-full max-h-96 rounded-lg"/>
                        </div>
                    `,
                    width: '600px',
                    showCancelButton: true,
                    confirmButtonText: '<span id="captureButtonText">📷 ' + (this.t('capture') || 'Capture') + '</span>',
                    cancelButtonText: this.t('cancel') || 'Cancel',
                    didOpen: async () => {
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ 
                                video: { facingMode: 'environment' }
                            });
                            
                            const videoPreview = document.getElementById('cameraPreview');
                            if (videoPreview) {
                                videoPreview.srcObject = stream;
                            }

                            window._cameraStream = stream;
                            window._photoCapture = false;

                        } catch (error) {
                            console.error('Error accessing camera:', error);
                            Swal.close();
                            coloredToast('danger', 'Failed to access camera. Please allow camera permission.');
                        }
                    },
                    preConfirm: () => {
                        const videoPreview = document.getElementById('cameraPreview');
                        const canvas = document.getElementById('photoCanvas');
                        const capturedPhoto = document.getElementById('capturedPhoto');
                        const captureButton = document.getElementById('captureButtonText');

                        if (!window._photoCapture && videoPreview && canvas) {
                            // First click: Capture photo
                            canvas.width = videoPreview.videoWidth;
                            canvas.height = videoPreview.videoHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(videoPreview, 0, 0);
                            
                            // Convert to blob
                            canvas.toBlob((blob) => {
                                window._capturedPhotoBlob = blob;
                                const photoUrl = URL.createObjectURL(blob);
                                
                                if (capturedPhoto) {
                                    capturedPhoto.src = photoUrl;
                                    capturedPhoto.classList.remove('hidden');
                                }
                                if (videoPreview) {
                                    videoPreview.classList.add('hidden');
                                }
                                if (captureButton) {
                                    captureButton.innerHTML = '✓ ' + (this.t('use_photo') || 'Use Photo');
                                }
                            }, 'image/jpeg', 0.95);

                            window._photoCapture = true;
                            return false; // Don't close modal yet
                        } else {
                            // Second click: Confirm and use photo
                            return true;
                        }
                    },
                    willClose: () => {
                        if (window._cameraStream) {
                            window._cameraStream.getTracks().forEach(track => track.stop());
                        }
                    }
                });

                if (photoConfirmed && window._capturedPhotoBlob) {
                    const photoFile = new File(
                        [window._capturedPhotoBlob], 
                        `photo_${Date.now()}.jpg`, 
                        { type: 'image/jpeg' }
                    );
                    
                    this.attachments.push(photoFile);
                    coloredToast('success', 'Photo captured successfully');
                    
                    delete window._capturedPhotoBlob;
                    delete window._cameraStream;
                    delete window._photoCapture;
                }

            } catch (error) {
                console.error('Error in photo capture:', error);
                coloredToast('danger', 'Failed to capture photo');
            }
        },

        async openVideoRecorder() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                coloredToast('warning', 'Video recording not supported on this device');
                return;
            }

            try {
                // Show recording modal
                const { value: recordingConfirmed } = await Swal.fire({
                    title: this.t('record_video') || 'Record Video',
                    html: `
                        <div class="flex flex-col items-center gap-4 p-4">
                            <video id="videoPreview" autoplay muted class="w-full max-h-64 rounded-lg bg-black"></video>
                            <div id="videoRecordingStatus" class="flex items-center gap-3">
                                <div class="h-12 w-12 rounded-full bg-danger animate-pulse flex items-center justify-center">
                                    <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="8"/>
                                    </svg>
                                </div>
                                <div>
                                    <p class="text-lg font-bold text-danger">Recording...</p>
                                    <p id="videoRecordingTimer" class="text-sm text-gray-500">00:00</p>
                                </div>
                            </div>
                        </div>
                    `,
                    width: '600px',
                    showCancelButton: true,
                    confirmButtonText: this.t('stop_recording') || 'Stop & Use',
                    cancelButtonText: this.t('cancel') || 'Cancel',
                    didOpen: async () => {
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ 
                                video: { width: 1280, height: 720 },
                                audio: true 
                            });
                            
                            const videoPreview = document.getElementById('videoPreview');
                            if (videoPreview) {
                                videoPreview.srcObject = stream;
                            }

                            const mediaRecorder = new MediaRecorder(stream);
                            const videoChunks = [];
                            let startTime = Date.now();
                            let timerInterval;

                            // Update timer
                            timerInterval = setInterval(() => {
                                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                                const minutes = Math.floor(elapsed / 60);
                                const seconds = elapsed % 60;
                                const timerElement = document.getElementById('videoRecordingTimer');
                                if (timerElement) {
                                    timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                                }
                            }, 1000);

                            mediaRecorder.ondataavailable = (event) => {
                                videoChunks.push(event.data);
                            };

                            mediaRecorder.onstop = () => {
                                clearInterval(timerInterval);
                                const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
                                window._recordedVideoBlob = videoBlob;
                                stream.getTracks().forEach(track => track.stop());
                            };

                            mediaRecorder.start();
                            window._videoMediaRecorder = mediaRecorder;
                            window._videoTimerInterval = timerInterval;
                            window._videoMediaStream = stream;

                        } catch (error) {
                            console.error('Error accessing camera:', error);
                            Swal.close();
                            coloredToast('danger', 'Failed to access camera. Please allow camera permission.');
                        }
                    },
                    preConfirm: () => {
                        if (window._videoMediaRecorder && window._videoMediaRecorder.state === 'recording') {
                            window._videoMediaRecorder.stop();
                            return new Promise((resolve) => {
                                setTimeout(() => resolve(true), 500);
                            });
                        }
                        return true;
                    },
                    willClose: () => {
                        if (window._videoTimerInterval) {
                            clearInterval(window._videoTimerInterval);
                        }
                        if (window._videoMediaStream) {
                            window._videoMediaStream.getTracks().forEach(track => track.stop());
                        }
                    }
                });

                if (recordingConfirmed && window._recordedVideoBlob) {
                    const videoFile = new File(
                        [window._recordedVideoBlob], 
                        `video_${Date.now()}.webm`, 
                        { type: 'video/webm' }
                    );
                    
                    this.attachments.push(videoFile);
                    coloredToast('success', 'Video recorded successfully');
                    
                    delete window._recordedVideoBlob;
                    delete window._videoMediaRecorder;
                    delete window._videoTimerInterval;
                    delete window._videoMediaStream;
                }

            } catch (error) {
                console.error('Error in video recording:', error);
                coloredToast('danger', 'Failed to record video');
            }
        },

        async openAudioRecorder() {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                coloredToast('warning', 'Audio recording not supported on this device');
                return;
            }

            try {
                // Show recording modal
                const { value: recordingConfirmed } = await Swal.fire({
                    title: this.t('record_audio') || 'Record Audio',
                    html: `
                        <div class="flex flex-col items-center gap-4 p-4">
                            <div id="audioRecordingStatus" class="flex items-center gap-3">
                                <div class="h-12 w-12 rounded-full bg-danger animate-pulse flex items-center justify-center">
                                    <svg class="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                                    </svg>
                                </div>
                                <div>
                                    <p class="text-lg font-bold text-danger">Recording...</p>
                                    <p id="recordingTimer" class="text-sm text-gray-500">00:00</p>
                                </div>
                            </div>
                            <audio id="audioPlayback" controls class="hidden w-full mt-4"></audio>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: this.t('stop_recording') || 'Stop & Use',
                    cancelButtonText: this.t('cancel') || 'Cancel',
                    showClass: {
                        popup: 'animate__animated animate__fadeInDown'
                    },
                    didOpen: async () => {
                        try {
                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            const mediaRecorder = new MediaRecorder(stream);
                            const audioChunks = [];
                            let startTime = Date.now();
                            let timerInterval;

                            // Update timer
                            timerInterval = setInterval(() => {
                                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                                const minutes = Math.floor(elapsed / 60);
                                const seconds = elapsed % 60;
                                const timerElement = document.getElementById('recordingTimer');
                                if (timerElement) {
                                    timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                                }
                            }, 1000);

                            mediaRecorder.ondataavailable = (event) => {
                                audioChunks.push(event.data);
                            };

                            mediaRecorder.onstop = () => {
                                clearInterval(timerInterval);
                                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                                const audioUrl = URL.createObjectURL(audioBlob);
                                
                                // Show playback
                                const statusDiv = document.getElementById('audioRecordingStatus');
                                const playbackAudio = document.getElementById('audioPlayback');
                                if (statusDiv && playbackAudio) {
                                    statusDiv.classList.add('hidden');
                                    playbackAudio.src = audioUrl;
                                    playbackAudio.classList.remove('hidden');
                                }

                                // Store for later use
                                window._recordedAudioBlob = audioBlob;
                                
                                // Stop all tracks
                                stream.getTracks().forEach(track => track.stop());
                            };

                            mediaRecorder.start();

                            // Store mediaRecorder for stop button
                            window._mediaRecorder = mediaRecorder;
                            window._timerInterval = timerInterval;
                            window._mediaStream = stream;

                        } catch (error) {
                            console.error('Error accessing microphone:', error);
                            Swal.close();
                            coloredToast('danger', 'Failed to access microphone. Please allow microphone permission.');
                        }
                    },
                    preConfirm: () => {
                        if (window._mediaRecorder && window._mediaRecorder.state === 'recording') {
                            window._mediaRecorder.stop();
                            // Wait for onstop to complete
                            return new Promise((resolve) => {
                                setTimeout(() => resolve(true), 500);
                            });
                        }
                        return true;
                    },
                    willClose: () => {
                        // Cleanup
                        if (window._timerInterval) {
                            clearInterval(window._timerInterval);
                        }
                        if (window._mediaStream) {
                            window._mediaStream.getTracks().forEach(track => track.stop());
                        }
                    }
                });

                if (recordingConfirmed && window._recordedAudioBlob) {
                    // Convert blob to file
                    const audioFile = new File(
                        [window._recordedAudioBlob], 
                        `audio_${Date.now()}.webm`, 
                        { type: 'audio/webm' }
                    );
                    
                    this.attachments.push(audioFile);
                    coloredToast('success', 'Audio recorded successfully');
                    
                    // Cleanup
                    delete window._recordedAudioBlob;
                    delete window._mediaRecorder;
                    delete window._timerInterval;
                    delete window._mediaStream;
                }

            } catch (error) {
                console.error('Error in audio recording:', error);
                coloredToast('danger', 'Failed to record audio');
            }
        },

        getFileIcon(file) {
            const type = file.type || '';
            if (type.startsWith('image/')) return 'image';
            if (type.startsWith('video/')) return 'video';
            if (type.startsWith('audio/')) return 'audio';
            return 'file';
        },

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        },

        // Additional translation keys for dynamic content
        getTranslatedQuickReplies() {
            return [
                {
                    id: 1,
                    label: this.t('quick_reply_templates.thanks_contacting'),
                    text: this.t('quick_replies_text.thanks_contacting')
                },
                {
                    id: 2,
                    label: this.t('quick_reply_templates.need_more_info'),
                    text: this.t('quick_replies_text.need_more_info')
                },
                {
                    id: 3,
                    label: this.t('quick_reply_templates.issue_resolved'),
                    text: this.t('quick_replies_text.issue_resolved')
                },
                {
                    id: 4,
                    label: this.t('quick_reply_templates.follow_up'),
                    text: this.t('quick_replies_text.follow_up')
                }
            ];
        }
    }));
});
