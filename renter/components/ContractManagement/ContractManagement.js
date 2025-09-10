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
            document.getElementById('contractsTable').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('contractsTable').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('contractsTable').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };

    Alpine.data('contractsTable', () => ({
        tableData: [],
        meta: {
            total: 0,
            pending: 0,
            active: 0,
            completed: 0
        },
        datatable: null,
        apiBaseUrl: 'http://localhost:8000',
        filters: {
            status: '',
            start_date: '',
            end_date: '',
            min_price: ''
        },

        async initComponent() {
            await this.fetchContracts();

            // Event Delegation for buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.view-contract-btn')) {
                    const contractId = e.target.closest('.view-contract-btn').dataset.id;
                    this.showContractDetails(contractId);
                }
            });
        },

        async fetchContracts() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication token is missing. Please log in.');
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const queryParams = new URLSearchParams();
                if (this.filters.status) queryParams.append('status', this.filters.status);
                if (this.filters.start_date) queryParams.append('start_date', this.filters.start_date);
                if (this.filters.end_date) queryParams.append('end_date', this.filters.end_date);
                if (this.filters.min_price) queryParams.append('min_price', this.filters.min_price);

                const url = `${this.apiBaseUrl}/api/admin/contract/get_all?${queryParams.toString()}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (data.status && data.data) {
                    this.tableData = data.data;
                    this.meta = {
                        total: data.data.length,
                        pending: this.tableData.filter(contract => contract.status === 'pending').length,
                        active: this.tableData.filter(contract => contract.status === 'active').length,
                        completed: this.tableData.filter(contract => contract.status === 'completed').length
                    };

                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error('Invalid response format');
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.fetchContracts();
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((contract, index) => [
                this.formatText(contract.id),
                this.formatCarInfo(contract.booking?.car),
                this.formatText(contract.booking?.car?.owner?.name),
                this.formatText(contract.booking?.user?.name),
                this.formatDate(contract.created_at),
                this.formatStatus(contract.status),
                this.getActionButtons(contract.id),
            ]);

            this.datatable = new simpleDatatables.DataTable('#contractsTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('car'),
                        Alpine.store('i18n').t('owner'),
                        Alpine.store('i18n').t('renter'),
                        Alpine.store('i18n').t('created_at'),
                        Alpine.store('i18n').t('status'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: [10, 20, 30, 50, 100],
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: '{info}{select}{pager}',
                },
            });
        },

        formatCarInfo(car) {
            if (!car) return Alpine.store('i18n').t('na');
            return `
                        <div class="flex items-center w-max" x-data="{ imgError: false }">
                   
                            ${car.make || 'Car'} (${car.model_year_id || 'N/A'})
                        </div>`;
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatStatus(status) {
            const statusClass = `status-${status}`;
            const statusText = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A';
            return `<span class="status-badge ${statusClass}">${Alpine.store('i18n').t(status)}</span>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(contractId) {
            return `
                        <div class="flex items-center gap-1 justify-center">
                            <button class="btn view-contract-btn btn-primary btn-sm" data-id="${contractId}">
                                ${Alpine.store('i18n').t('view_details')}
                            </button>
                        </div>`;
        },

        async showContractDetails(contractId) {
            try {
                loadingIndicator.show();
                const contract = this.tableData.find(c => c.id == contractId);
                if (!contract) {
                    throw new Error('Contract not found');
                }

                let contractItems = [];
                try {
                    contractItems = JSON.parse(contract.contract_items || '[]');
                } catch (e) {
                    console.warn('Failed to parse contract items:', e);
                }

                const contractItemsHtml = contractItems.length > 0 ? `
                            <div class="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('contract_terms')}</h4>
                                <ul class="list-disc list-inside space-y-2 text-blue-900 dark:text-white">
                                    ${contractItems.map(item => `
                                        <li class="text-base">${item}</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : `<p class="text-red-600">${Alpine.store('i18n').t('no_contract_terms')}</p>`;

                const ownerInfoHtml = contract.booking?.car?.owner ? `
                            <div class="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                                <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('owner_info')}</h4>
                                <div class="space-y-2">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('name')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${contract.booking.car.owner.name || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('email')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${contract.booking.car.owner.email || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('phone')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${contract.booking.car.owner.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ` : '';

                const renterInfoHtml = contract.booking?.user ? `
                            <div class="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
                                <h4 class="mb-3 text-lg font-semibold text-gray-800 dark:text-white">${Alpine.store('i18n').t('renter_info')}</h4>
                                <div class="space-y-2">
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('name')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${contract.booking.user.name || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('email')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${contract.booking.user.email || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-gray-600 dark:text-gray-300 text-base">${Alpine.store('i18n').t('phone')}:</span>
                                        <span class="font-medium text-gray-800 dark:text-white text-base">${contract.booking.user.phone || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        ` : '';

                const bookingDetailsHtml = contract.booking ? `
                            <div class="mt-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                <h4 class="mb-3 text-lg font-semibold text-green-800 dark:text-green-300">${Alpine.store('i18n').t('booking_details')}</h4>
                                <div class="space-y-2">
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('start_date')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${new Date(contract.booking.date_from).toLocaleDateString() || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('end_date')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">${new Date(contract.booking.date_end).toLocaleDateString() || 'N/A'}</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('with_driver')}:</span>
                                        <span class="font-medium ${contract.booking.with_driver === '1' ? 'text-green-600' : 'text-red-600'} text-base">
                                            ${contract.booking.with_driver === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
                                        </span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span class="text-green-700 dark:text-green-200 text-base">${Alpine.store('i18n').t('total_price')}:</span>
                                        <span class="font-medium text-green-900 dark:text-white text-base">$${parseFloat(contract.booking.total_price || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        ` : '';

                const detailsHtml = `
                            <div class="space-y-6 text-base">
                                <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                    <h4 class="mb-3 text-lg font-semibold text-blue-800 dark:text-blue-300">${Alpine.store('i18n').t('contract_info')}</h4>
                                    <div class="space-y-2">
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('contract_id')}:</span>
                                            <span class="font-medium text-blue-900 dark:text-white text-base">${contract.id || 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('created_at')}:</span>
                                            <span class="font-medium text-blue-900 dark:text-white text-base">${new Date(contract.created_at).toLocaleDateString() || 'N/A'}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-blue-700 dark:text-blue-200 text-base">${Alpine.store('i18n').t('status')}:</span>
                                            <span class="font-medium ${contract.status === 'active' ? 'text-green-600' : contract.status === 'pending' ? 'text-yellow-600' : 'text-blue-600'} text-base">
                                                ${Alpine.store('i18n').t(contract.status)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                ${contractItemsHtml}
                                ${bookingDetailsHtml}
                                ${ownerInfoHtml}
                                ${renterInfoHtml}
                            </div>
                        `;

                document.getElementById('contractDetailsContent').innerHTML = detailsHtml;
                document.getElementById('contractDetailsModal').classList.remove('hidden');
            } catch (error) {
                console.error('Error in showContractDetails:', error);
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_details') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
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

function coloredToast(color, message) {
    const toast = Swal.mixin({
        toast: true,
        position: 'bottom-start',
        showConfirmButton: false,
        timer: 3000,
        showCloseButton: true,
        animation: false,
        customClass: {
            popup: `color-${color}`,
        },
    });
    toast.fire({
        title: message,
    });
}
