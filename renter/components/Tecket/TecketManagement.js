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
        searchTicket: '',
        statusFilter: '',
        priorityFilter: '',
        replyMessage: '',

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



        async init() {
            await this.loadTickets();
            await this.loadStatistics();
        },

        async loadTickets() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets`, {
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
                    this.tickets = data.tickets.map(ticket => ({
                        ...ticket,
                        chats: ticket.chats || []
                    }));
                    coloredToast('success', `${this.t('loaded_tickets').replace('{count}', this.tickets.length)}`);
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_load'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async loadStatistics() {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/statistics?period=30&group_by=day`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        this.statistics = data.statistics;
                    }
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
                this.selectedTicket = { ...ticket };
                this.isShowTicketDetail = true;
                this.isShowTicketMenu = false;

                // Load full ticket details if not already loaded
                if (!this.selectedTicket.chats || this.selectedTicket.chats.length === 0) {
                    await this.loadTicketDetails(ticket.id);
                }

                coloredToast('success', `${this.t('ticket_selected').replace('{number}', ticket.ticket_number)}`);
            } catch (error) {
                coloredToast('danger', this.t('failed_to_load_ticket_details'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async loadTicketDetails(ticketId) {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${ticketId}`, {
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
                    this.selectedTicket = data.ticket;

                    // Update the ticket in the list
                    const index = this.tickets.findIndex(t => t.id === ticketId);
                    if (index !== -1) {
                        this.tickets[index] = { ...this.tickets[index], ...data.ticket };
                    }
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_load_ticket_details'));
                throw error;
            } finally {
                loadingIndicator.hide();
            }
        },

        async sendReply() {
            if (!this.replyMessage.trim() || !this.selectedTicket) {
                coloredToast('warning', this.t('please_enter_message'));
                return;
            }

            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${this.selectedTicket.id}/reply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        message: this.replyMessage.trim(),
                        is_internal_note: false,
                        attachments: []
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    // Add message to conversation
                    if (!this.selectedTicket.chats) {
                        this.selectedTicket.chats = [];
                    }

                    this.selectedTicket.chats.push({
                        id: data.chat_message.id,
                        sender_id: this.loginUser.id,
                        receiver_id: this.selectedTicket.user_id,
                        message: this.replyMessage.trim(),
                        created_at: new Date().toISOString(),
                        sender: {
                            id: this.loginUser.id,
                            name: this.loginUser.name
                        },
                        is_internal_note: false
                    });

                    this.replyMessage = '';
                    this.scrollToBottom();

                    // Refresh tickets list
                    await this.loadTickets();
                    coloredToast('success', this.t('message_sent'));
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_send'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async addInternalNote() {
            if (!this.replyMessage.trim() || !this.selectedTicket) {
                coloredToast('warning', this.t('please_enter_message'));
                return;
            }

            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${this.selectedTicket.id}/internal-note`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        message: this.replyMessage.trim(),
                        is_internal_note: true
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    // Add internal note to conversation
                    if (!this.selectedTicket.chats) {
                        this.selectedTicket.chats = [];
                    }

                    this.selectedTicket.chats.push({
                        id: Date.now(), // Temporary ID
                        sender_id: this.loginUser.id,
                        receiver_id: this.selectedTicket.user_id,
                        message: this.replyMessage.trim(),
                        created_at: new Date().toISOString(),
                        sender: {
                            id: this.loginUser.id,
                            name: this.loginUser.name
                        },
                        is_internal_note: true
                    });

                    this.replyMessage = '';
                    this.scrollToBottom();
                    coloredToast('success', this.t('internal_note_added'));
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_send'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async updateStatus(status) {
            if (!this.selectedTicket) return;

            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${this.selectedTicket.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        status: status,
                        admin_notes: `${this.t('status_changed_to').replace('{status}', this.getStatusLabel(status))}`
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    this.selectedTicket.status = status;

                    // Update ticket in list
                    const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                    if (index !== -1) {
                        this.tickets[index].status = status;
                    }

                    await this.loadStatistics();
                    coloredToast('success', this.t('status_updated'));
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_update'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async updatePriority(priority) {
            if (!this.selectedTicket) return;

            const token = localStorage.getItem('authToken');
            if (!token) return;

            try {
                loadingIndicator.show();
                const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${this.selectedTicket.id}/priority`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        priority: priority,
                        admin_notes: `${this.t('priority_changed_to').replace('{priority}', this.getPriorityLabel(priority))}`
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status === 'success') {
                    this.selectedTicket.priority = priority;

                    // Update ticket in list
                    const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                    if (index !== -1) {
                        this.tickets[index].priority = priority;
                    }

                    coloredToast('success', this.t('priority_updated'));
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_update'));
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
                    title: this.t('close_ticket'),
                    html: `
                        <input id="swal-resolution" class="swal2-input" placeholder="${this.t('resolution_summary')}">
                        <input id="swal-admin-notes" class="swal2-input" placeholder="${this.t('admin_notes')} (${this.t('optional')})">
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: this.t('close_ticket'),
                    cancelButtonText: this.t('cancel'),
                    preConfirm: () => {
                        const resolution = document.getElementById('swal-resolution').value;
                        if (!resolution) {
                            Swal.showValidationMessage(this.t('please_enter_reason'));
                            return false;
                        }
                        return {
                            resolution: resolution,
                            admin_notes: document.getElementById('swal-admin-notes').value
                        };
                    }
                });

                if (formValues) {
                    loadingIndicator.show();
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${this.selectedTicket.id}/close`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            resolution: formValues.resolution,
                            admin_notes: formValues.admin_notes
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

                    if (data.status === 'success') {
                        this.selectedTicket.status = 'closed';

                        // Update ticket in list
                        const index = this.tickets.findIndex(t => t.id === this.selectedTicket.id);
                        if (index !== -1) {
                            this.tickets[index].status = 'closed';
                        }

                        await this.loadStatistics();
                        coloredToast('success', this.t('ticket_closed'));
                    }
                }
            } catch (error) {
                coloredToast('danger', this.t('failed_to_close'));
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
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/support/tickets/${this.selectedTicket.id}/reopen`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            reason: formValues.reason,
                            admin_notes: formValues.admin_notes
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.json();

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
                'resolved': this.t('resolved'),
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
                'resolved': 'bg-primary/20 text-primary',
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
