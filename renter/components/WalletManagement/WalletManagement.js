document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading').classList.remove('hidden');
            document.getElementById('myTable1').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('myTable1').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('myTable1').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
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

            const queryParams = new URLSearchParams({ page });
            if (this.filters.status) queryParams.append('status', this.filters.status);

            const url = `${this.apiBaseUrl}/api/admin/withdrawal-requests/index?${queryParams}`;
            console.log(url);
            
            try {

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
                console.log("sad", data);

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
                    console.log();


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

                console.error('Error fetching withdrawals:', error);
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
                console.log(data);

                if (data.status && data.data.statistics) {
                    this.meta = data.data.statistics;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                console.error('Error fetching statistics:', error);
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_statistics') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.currentPage = 1;
            this.fetchWithdrawals(1);
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
                this.datatable1.destroy();
            }

            const mappedData = this.tableData.map((withdrawal, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatUserInfo(withdrawal.user),
                this.formatAmount(withdrawal.amount),
                this.formatStatus(withdrawal.status, withdrawal.id),
                this.formatDate(withdrawal.created_at),
                this.getActionButtons(withdrawal.id, withdrawal.status)
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
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
            const statusClass = `status-${status.toLowerCase()}`;
            return `<span class="status-badge ${statusClass} px-3 py-1 rounded-md">${Alpine.store('i18n').t(status.toLowerCase())}</span>`;
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(withdrawalId, status) {
            return `
                <div class="flex items-center gap-1 justify-center">
                    <button class="approve-btn btn btn-success btn-sm rounded-md px-3 py-1" data-id="${withdrawalId}" ${status === 'approved' || status === 'completed' ? 'disabled' : ''}>
                        ${Alpine.store('i18n').t('approve')}
                    </button>
                    <button class="reject-btn btn btn-danger btn-sm rounded-md px-3 py-1" data-id="${withdrawalId}" ${status === 'rejected' || status === 'completed' ? 'disabled' : ''}>
                        ${Alpine.store('i18n').t('reject')}
                    </button>
                    <button class="complete-btn btn btn-info btn-sm rounded-md px-3 py-1" data-id="${withdrawalId}" ${status !== 'approved' ? 'disabled' : ''}>
                        ${Alpine.store('i18n').t('complete')}
                    </button>
                    <button class="view-details-btn btn btn-primary btn-sm rounded-md px-3 py-1" data-id="${withdrawalId}">
                        ${Alpine.store('i18n').t('view_details')}
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
                    document.getElementById('withdrawalDetailsModal').classList.remove('hidden');
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
                let payload = {};
                if (action === 'approved') {
                    payload = {
                        action: 'approved',
                        admin_notes: await this.getAdminNotes(),
                        payment_method: await this.getPaymentMethod(),
                        payment_reference: await this.getPaymentReference()
                    };
                } else if (action === 'rejected') {
                    payload = {
                        action: 'rejected',
                        admin_notes: await this.getAdminNotes()
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

        async getAdminNotes() {
            const { value: adminNotes } = await Swal.fire({
                title: Alpine.store('i18n').t('enter_admin_notes'),
                input: 'text',
                inputPlaceholder: Alpine.store('i18n').t('admin_notes_placeholder'),
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) return Alpine.store('i18n').t('admin_notes_required');
                }
            });
            return adminNotes || '';
        },

        async getPaymentMethod() {
            const { value: paymentMethod } = await Swal.fire({
                title: Alpine.store('i18n').t('select_payment_method'),
                input: 'select',
                inputOptions: {
                    bank_transfer: Alpine.store('i18n').t('bank_transfer'),
                    cash: Alpine.store('i18n').t('cash'),
                    card: Alpine.store('i18n').t('card')
                },
                inputPlaceholder: Alpine.store('i18n').t('select_payment_method'),
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) return Alpine.store('i18n').t('payment_method_required');
                }
            });
            return paymentMethod || '';
        },

        async getPaymentReference() {
            const { value: paymentReference } = await Swal.fire({
                title: Alpine.store('i18n').t('enter_payment_reference'),
                input: 'text',
                inputPlaceholder: Alpine.store('i18n').t('payment_reference_placeholder'),
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) return Alpine.store('i18n').t('payment_reference_required');
                }
            });
            return paymentReference || '';
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
