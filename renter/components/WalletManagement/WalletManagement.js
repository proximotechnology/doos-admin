document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        },
        showTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const walletTableContainer = document.getElementById('walletTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (walletTableContainer) walletTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const walletTableContainer = document.getElementById('walletTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (walletTableContainer) walletTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const walletTableContainer = document.getElementById('walletTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (walletTableContainer) walletTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
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

    Alpine.store('walletTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="walletTable"]'));
            if (tableComponent && tableComponent.fetchWithdrawals) {
                await tableComponent.fetchWithdrawals();
            }
        }
    });

    Alpine.data('walletTable', () => ({
        tableData: [],
        paginationMeta: {},
        meta: {
            total_requests: 0,
            pending_requests: 0,
            approved_requests: 0,
            rejected_requests: 0,
            completed_requests: 0,
            total_amount_pending: "0.00",
            total_amount_approved: "0.00",
            total_amount_completed: "0.00"
        },
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            status: '',
        },

        async initComponent() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.approve-btn')) {
                    const withdrawalId = e.target.closest('.approve-btn').dataset.id;
                    this.processWithdrawal(withdrawalId, 'approved');
                }
                if (e.target.closest('.reject-btn')) {
                    const withdrawalId = e.target.closest('.reject-btn').dataset.id;
                    this.processWithdrawal(withdrawalId, 'rejected');
                }
                if (e.target.closest('.complete-btn')) {
                    const withdrawalId = e.target.closest('.complete-btn').dataset.id;
                    this.completeWithdrawal(withdrawalId);
                }
                if (e.target.closest('.view-details-btn')) {
                    const withdrawalId = e.target.closest('.view-details-btn').dataset.id;
                    this.showWithdrawalDetails(withdrawalId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchWithdrawals(page);
                }
            });
            await this.fetchWithdrawals(1);
            await this.fetchStatistics();
        },

        async fetchWithdrawals(page = 1) {
            loadingIndicator.showTableLoader();
            this.currentPage = page;

            const token = localStorage.getItem('authToken');
            if (!token) {
                this.showError(Alpine.store('i18n').t('auth_token_missing'));
                window.location.href = 'auth-boxed-signin.html';
                return;
            }

            const filters = {};
            if (this.filters.status) filters.status = this.filters.status;

            try {
                const data = await ApiService.getWithdrawals(page, filters);

                if (data.status && Array.isArray(data.data.withdrawal_requests)) {
                    this.tableData = data.data.withdrawal_requests;
                    this.paginationMeta = data.data.pagination || {
                        current_page: 1,
                        last_page: 1,
                        per_page: 10,
                        total: 0,
                        from: 0,
                        to: 0,
                        links: []
                    };


                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {

                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        async fetchStatistics() {
            try {
                const token = localStorage.getItem('authToken');
                const url = `${this.apiBaseUrl}/api/admin/withdrawal-requests/statistics/overview`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_to_load_statistics'));
                }

                const data = await response.json();

                if (data.status && data.data.statistics) {
                    this.meta = data.data.statistics;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_statistics') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.currentPage = 1;
            this.fetchWithdrawals(1);
        },

        resetFilters() {
            this.filters.status = '';
            this.applyFilters();
        },

        hasActiveFilters() {
            return !!(this.filters.status);
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2">';

            if (this.paginationMeta.current_page > 1) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary rounded-md px-3 py-1 hover:bg-blue-100" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary bg-blue-600 text-white' : 'btn-outline-primary border border-blue-600 text-blue-600'} rounded-md px-3 py-1 hover:bg-blue-100" data-page="${i}">
                    ${i}
                </button>`;
            }

            if (this.paginationMeta.current_page < this.paginationMeta.last_page) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary rounded-md px-3 py-1 hover:bg-blue-100" data-page="${this.paginationMeta.current_page + 1}">
                    ${Alpine.store('i18n').t('next')}
                </button>`;
            }

            paginationHTML += '</nav></div>';
            return paginationHTML;
        },

        populateTable() {
            if (this.datatable1) {
                try {
                    this.datatable1.destroy();
                } catch (e) {
                    console.warn('Error destroying datatable:', e);
                }
            }

            // Ensure tableData is an array
            if (!this.tableData || !Array.isArray(this.tableData) || this.tableData.length === 0) {
                loadingIndicator.showEmptyState();
                return;
            }

            const tableElement = document.getElementById('myTable1');
            if (!tableElement) {
                console.error('Table element not found');
                loadingIndicator.showEmptyState();
                return;
            }

            const mappedData = this.tableData.map((withdrawal, index) => [
                this.formatText((this.currentPage - 1) * (this.paginationMeta.per_page || 10) + index + 1),
                this.formatUserInfo(withdrawal.user),
                this.formatAmount(withdrawal.amount),
                this.formatStatus(withdrawal.status, withdrawal.id),
                this.formatDate(withdrawal.created_at),
                this.getActionButtons(withdrawal.id, withdrawal.status)
            ]);

            this.datatable1 = new simpleDatatables.DataTable(tableElement, {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('user'),
                        Alpine.store('i18n').t('amount'),
                        Alpine.store('i18n').t('status'),
                        Alpine.store('i18n').t('created_at'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: false,
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: this.generatePaginationHTML() + '{info}{pager}',
                },
            });
        },

        formatUserInfo(user) {
            return user ? `${user.name} (${user.email})` : Alpine.store('i18n').t('na');
        },

        formatAmount(amount) {
            return amount ? `$${parseFloat(amount).toFixed(2)}` : Alpine.store('i18n').t('na');
        },

        formatStatus(status, withdrawalId) {
            if (!status) return `<span class="badge badge-danger text-black dark:text-white">${Alpine.store('i18n').t('na')}</span>`;
            
            const statusLower = status.toLowerCase();
            let badgeClass = 'badge-danger';
            if (statusLower === 'approved') badgeClass = 'badge-success';
            else if (statusLower === 'pending') badgeClass = 'badge-warning';
            else if (statusLower === 'completed') badgeClass = 'badge-info';
            else if (statusLower === 'rejected') badgeClass = 'badge-danger';
            
            return `<span class="badge ${badgeClass} text-black dark:text-white">${Alpine.store('i18n').t(statusLower)}</span>`;
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(withdrawalId, status) {
            const statusLower = (status || '').toLowerCase();
            const isApproved = statusLower === 'approved';
            const isCompleted = statusLower === 'completed';
            const isRejected = statusLower === 'rejected';
            
            return `
                <div class="flex items-center gap-1 justify-center flex-wrap">
                    <button 
                        class="approve-btn btn btn-success btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" 
                        data-id="${withdrawalId}" 
                        ${isApproved || isCompleted ? 'disabled' : ''}
                        title="${Alpine.store('i18n').t('approve')}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('approve')}</span>
                    </button>
                    <button 
                        class="reject-btn btn btn-danger btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" 
                        data-id="${withdrawalId}" 
                        ${isRejected || isCompleted ? 'disabled' : ''}
                        title="${Alpine.store('i18n').t('reject')}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('reject')}</span>
                    </button>
                    <button 
                        class="complete-btn btn btn-info btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" 
                        data-id="${withdrawalId}" 
                        ${!isApproved ? 'disabled' : ''}
                        title="${Alpine.store('i18n').t('complete')}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('complete')}</span>
                    </button>
                    <button 
                        class="view-details-btn btn btn-primary btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" 
                        data-id="${withdrawalId}"
                        title="${Alpine.store('i18n').t('view_details')}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('view_details')}</span>
                    </button>
                </div>`;
        },

        async showWithdrawalDetails(withdrawalId) {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const url = `${this.apiBaseUrl}/api/admin/withdrawal-requests/${withdrawalId}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_to_load'));
                }

                const data = await response.json();
                if (data.status && data.data.withdrawal_request) {
                    const withdrawal = data.data.withdrawal_request;
                    
                    const detailsHtml = `
                        <div class="space-y-6 text-base">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                    <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('basic_info')}</h4>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('id')}:</span>
                                            <span class="font-medium text-blue-900 dark:text-white text-base">${withdrawal.id}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('amount')}:</span>
                                            <span class="font-medium text-blue-900 dark:text-white text-base">$${parseFloat(withdrawal.amount).toFixed(2)}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('status')}:</span>
                                            <span class="font-medium text-blue-900 dark:text-white text-base">${Alpine.store('i18n').t(withdrawal.status.toLowerCase())}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('created_at')}:</span>
                                            <span class="font-medium text-blue-900 dark:text-white text-base">${this.formatDate(withdrawal.created_at)}</span>
                                        </div>
                                        ${withdrawal.processed_at ? `
                                            <div class="flex justify-between">
                                                <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('processed_at')}:</span>
                                                <span class="font-medium text-blue-900 dark:text-white text-base">${this.formatDate(withdrawal.processed_at)}</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                    <h4 class="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">${Alpine.store('i18n').t('user_info')}</h4>
                                    <div class="space-y-3">
                                        <div class="flex justify-between">
                                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('name')}:</span>
                                            <span class="font-medium text-green-900 dark:text-white text-base">${withdrawal.user.name}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('email')}:</span>
                                            <span class="font-medium text-green-900 dark:text-white text-base">${withdrawal.user.email}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('phone')}:</span>
                                            <span class="font-medium text-green-900 dark:text-white text-base">${withdrawal.user.phone}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                                <h4 class="mb-3 text-lg font-semibold text-purple-800 dark:text-purple-300">${Alpine.store('i18n').t('wallet_info')}</h4>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('balance')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">$${parseFloat(withdrawal.wallet.balance).toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('available_balance')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">$${parseFloat(withdrawal.wallet.available_balance).toFixed(2)}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-purple-700 dark:text-purple-200 text-base">${Alpine.store('i18n').t('pending_balance')}:</span>
                                        <span class="font-medium text-purple-900 dark:text-white text-base">$${parseFloat(withdrawal.wallet.pending_balance).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="rounded-lg bg-teal-50 p-4 dark:bg-teal-900/20">
                                <h4 class="mb-3 text-lg font-semibold text-teal-800 dark:text-teal-300">${Alpine.store('i18n').t('payment_details')}</h4>
                                <div class="space-y-3">
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('payment_method')}:</span>
                                        <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.payment_method || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('payment_reference')}:</span>
                                        <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.payment_reference || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('account_name')}:</span>
                                        <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.account_name || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('account_number')}:</span>
                                        <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.account_number || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('bank_name')}:</span>
                                        <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.bank_name || 'N/A'}</span>
                                    </div>
                                    ${withdrawal.admin_notes ? `
                                        <div class="flex justify-between">
                                            <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('admin_notes')}:</span>
                                            <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.admin_notes}</span>
                                        </div>
                                    ` : ''}
                                    ${withdrawal.processed_by ? `
                                        <div class="flex justify-between">
                                            <span class="text-teal-700 dark:text-teal-200 text-base">${Alpine.store('i18n').t('processed_by')}:</span>
                                            <span class="font-medium text-teal-900 dark:text-white text-base">${withdrawal.processed_by.name}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                                <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('description')}:</h4>
                                <p class="text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">${withdrawal.description || 'N/A'}</p>
                            </div>
                        </div>
                    `;

                    document.getElementById('withdrawalDetailsContent').innerHTML = detailsHtml;
                    
                    // Show modal
                    const withdrawalModal = document.getElementById('withdrawalDetailsModal');
                    if (withdrawalModal) {
                        const modalData = Alpine.$data(withdrawalModal);
                        if (modalData) {
                            modalData.isOpen = true;
                        }
                        withdrawalModal.classList.remove('hidden');
                        withdrawalModal.style.display = 'flex';
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_withdrawal_details') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async processWithdrawal(withdrawalId, action) {
            try {
                const { value: formValues, isConfirmed } = await Swal.fire({
                    title: '',
                    html: this.getFormHtml(action),
                    width: '600px',
                    padding: '0',
                    background: '#fff',
                    showCloseButton: true,
                    showCancelButton: true,
                    cancelButtonText: `
                <div class="flex items-center space-x-2 rtl:space-x-reverse">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    <span>${Alpine.store('i18n').t('cancel')}</span>
                </div>
            `,
                    confirmButtonText: `
                <div class="flex items-center space-x-2 rtl:space-x-reverse">
                    ${action === 'approved' ?
                            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                        }
                    <span>${Alpine.store('i18n').t(`confirm_${action}`)}</span>
                </div>
            `,
                    cancelButtonColor: '#6b7280',
                    confirmButtonColor: action === 'approved' ? '#10b981' : '#ef4444',
                    customClass: {
                        container: 'z-50',
                        popup: 'rounded-xl shadow-2xl border-0',
                        header: 'p-0 border-0',
                        title: 'hidden',
                        closeButton: 'top-4 right-4 text-gray-400 hover:text-gray-600',
                        htmlContainer: 'p-6 pt-4',
                        actions: 'px-6 pb-6 gap-3',
                        confirmButton: `py-3 px-6 rounded-lg font-medium transition-colors duration-200 ${action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white`,
                        cancelButton: 'py-3 px-6 rounded-lg font-medium transition-colors duration-200 bg-gray-200 hover:bg-gray-300 text-gray-700'
                    },
                    preConfirm: () => {
                        const adminNotes = document.getElementById('adminNotes').value.trim();
                        let paymentMethod = '';
                        let paymentReference = '';

                        if (action === 'approved') {
                            paymentMethod = document.getElementById('paymentMethod').value;
                            paymentReference = document.getElementById('paymentReference').value.trim();

                        }


                        return {
                            admin_notes: adminNotes,
                            payment_method: paymentMethod,
                            payment_reference: paymentReference
                        };
                    }
                });

                if (!isConfirmed) {
                    return;
                }

                let payload = {};
                if (action === 'approved') {
                    payload = {
                        action: 'approved',
                        admin_notes: formValues.admin_notes,
                        payment_method: formValues.payment_method,
                        payment_reference: formValues.payment_reference
                    };
                } else if (action === 'rejected') {
                    payload = {
                        action: 'rejected',
                        admin_notes: formValues.admin_notes
                    };
                }

                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const url = `${this.apiBaseUrl}/api/admin/withdrawal-requests/${withdrawalId}/process`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(await response.text() || Alpine.store('i18n').t('failed_update_withdrawal'));
                }

                coloredToast('success', Alpine.store('i18n').t('withdrawal_updated_successfully'));
                await this.fetchWithdrawals(this.currentPage);
                await this.fetchStatistics();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        getFormHtml(action) {
            const actionColor = action === 'approved' ? 'green' : 'red';
            const actionIcon = action === 'approved' ?
                '<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' :
                '<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';

            let html = `
        <div class="max-w-md mx-auto">
            <!-- Header -->
            <div class="flex items-center justify-center mb-6 p-4 bg-${actionColor}-50 rounded-lg border border-${actionColor}-200">
                <div class="flex items-center space-x-3 rtl:space-x-reverse">
                    ${actionIcon}
                    <h3 class="text-lg font-semibold text-${actionColor}-800">
                        ${Alpine.store('i18n').t(`confirm_${action}`)}
                    </h3>
                </div>
            </div>

            <!-- Admin Notes -->
            <div class="mb-4">
                <label for="adminNotes" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                    ${Alpine.store('i18n').t('admin_notes')}
                    <span class="text-red-500 ml-1">*</span>
                </label>
                <textarea 
                    id="adminNotes" 
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${actionColor}-500 focus:border-${actionColor}-500 transition-colors duration-200 resize-none" 
                    placeholder="${Alpine.store('i18n').t('admin_notes_placeholder')}"
                    rows="4"
                    style="min-height: 100px;"
                ></textarea>
                <p class="text-xs text-gray-500 mt-1">${Alpine.store('i18n').t('admin_notes_helper')}</p>
            </div>
    `;

            if (action === 'approved') {
                html += `
            <!-- Payment Method -->
            <div class="mb-4">
                <label for="paymentMethod" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                    ${Alpine.store('i18n').t('payment_method')}
                    <span class="text-red-500 ml-1">*</span>
                </label>
                <select 
                    id="paymentMethod" 
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${actionColor}-500 focus:border-${actionColor}-500 transition-colors duration-200 appearance-none bg-white"
                >
                    <option value="">${Alpine.store('i18n').t('select_payment_method')}</option>
                    <option value="bank_transfer">🏦 ${Alpine.store('i18n').t('bank_transfer')}</option>
                    <option value="cash">💵 ${Alpine.store('i18n').t('cash')}</option>
                    <option value="card">💳 ${Alpine.store('i18n').t('card')}</option>
                    <option value="digital_wallet">📱 ${Alpine.store('i18n').t('digital_wallet')}</option>
                </select>
            </div>

            <!-- Payment Reference -->
            <div class="mb-4">
                <label for="paymentReference" class="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <svg class="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    ${Alpine.store('i18n').t('payment_reference')}
                    <span class="text-red-500 ml-1">*</span>
                </label>
                <input 
                    type="text" 
                    id="paymentReference" 
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${actionColor}-500 focus:border-${actionColor}-500 transition-colors duration-200" 
                    placeholder="${Alpine.store('i18n').t('payment_reference_placeholder')}"
                >
                <p class="text-xs text-gray-500 mt-1">${Alpine.store('i18n').t('payment_reference_helper')}</p>
            </div>

            <!-- Summary Card -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 class="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    ${Alpine.store('i18n').t('approval_summary')}
                </h4>
                <ul class="text-xs text-blue-700 space-y-1">
                    <li>• ${Alpine.store('i18n').t('approval_note_1')}</li>
                    <li>• ${Alpine.store('i18n').t('approval_note_2')}</li>
                    <li>• ${Alpine.store('i18n').t('approval_note_3')}</li>
                </ul>
            </div>
        `;
            } else {
                html += `
            <!-- Rejection Warning -->
            <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <h4 class="text-sm font-semibold text-orange-800 mb-2 flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    ${Alpine.store('i18n').t('rejection_warning')}
                </h4>
                <p class="text-xs text-orange-700">${Alpine.store('i18n').t('rejection_warning_text')}</p>
            </div>
        `;
            }

            html += `</div>`;
            return html;
        },

        async completeWithdrawal(withdrawalId) {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const url = `${this.apiBaseUrl}/api/admin/withdrawal-requests/${withdrawalId}/complete`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(await response.text() || Alpine.store('i18n').t('failed_complete_withdrawal'));
                }

                coloredToast('success', Alpine.store('i18n').t('withdrawal_completed_successfully'));
                await this.fetchWithdrawals(this.currentPage);
                await this.fetchStatistics();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },




        showSuccess(message) {
            Swal.fire({
                icon: 'success',
                title: Alpine.store('i18n').t('success'),
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message
            });
        }
    }));
});
