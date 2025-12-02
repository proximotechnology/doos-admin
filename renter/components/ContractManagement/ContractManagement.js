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
            const contractsTableContainer = document.getElementById('contractsTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (contractsTableContainer) contractsTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const contractsTableContainer = document.getElementById('contractsTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (contractsTableContainer) contractsTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const contractsTableContainer = document.getElementById('contractsTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (contractsTableContainer) contractsTableContainer.style.display = 'none';
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

    Alpine.data('contractsTable', () => ({
        tableData: [],
        paginationMeta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
            from: 0,
            to: 0,
            links: []
        },
        meta: {
            total: 0,
            pending: 0,
            active: 0,
            completed: 0
        },
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            status: '',
            start_date: '',
            end_date: '',
            min_price: ''
        },
        _initialized: false,

        async initComponent() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchContracts(1);

            // Event Delegation for buttons
            if (!this._listenersAttached) {
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.view-contract-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const btn = e.target.closest('.view-contract-btn');
                        const contractId = btn.dataset.id;
                        if (contractId) {
                            this.showContractDetails(contractId);
                        }
                    }
                    if (e.target.closest('.pagination-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const page = e.target.closest('.pagination-btn').dataset.page;
                        this.fetchContracts(page);
                    }
                });
                this._listenersAttached = true;
            }
        },

        async fetchContracts(page = 1) {
            try {
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
                if (this.filters.start_date) filters.start_date = this.filters.start_date;
                if (this.filters.end_date) filters.end_date = this.filters.end_date;
                if (this.filters.min_price) filters.min_price = this.filters.min_price;

                const data = await ApiService.getContracts(page, filters);

                if (data.status && data.data && Array.isArray(data.data.data)) {
                    this.tableData = data.data.data || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page || 1,
                        last_page: data.data.last_page || 1,
                        per_page: data.data.per_page || 10,
                        total: data.data.total || (this.tableData ? this.tableData.length : 0),
                        from: data.data.from || 1,
                        to: data.data.to || (this.tableData ? this.tableData.length : 0),
                        links: data.data.links || []
                    };
                    this.meta = {
                        total: this.paginationMeta.total,
                        pending: (this.tableData || []).filter(contract => contract.status === 'pending').length,
                        active: (this.tableData || []).filter(contract => contract.status === 'active').length,
                        completed: (this.tableData || []).filter(contract => contract.status === 'completed').length
                    };

                    if (!this.tableData || this.tableData.length === 0) {
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

        applyFilters() {
            this.currentPage = 1;
            this.fetchContracts(1);
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2 rtl:space-x-reverse">';

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
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((contract, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
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
                    bottom: this.generatePaginationHTML() + '{info}{pager}'
                }
            });
        },

        formatCarInfo(car) {
            if (!car) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            
            let firstImage = car.car_image && car.car_image.length > 0
                ? car.car_image[0].image
                : 'assets/images/default-car.png';

            const defaultImage = '/assets/images/default-car.png';

            // Normalize image path
            if (firstImage) {
                if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
                    // Keep as is
                } else if (firstImage.startsWith('assets/')) {
                    firstImage = '/' + firstImage;
                } else if (firstImage.startsWith('./')) {
                    firstImage = '/' + firstImage.substring(2);
                } else {
                    firstImage = '/' + firstImage;
                }
            }

            const cleanImage = firstImage.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            const escapedMake = (car.make || 'Car').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const escapedYear = car.years?.year ? String(car.years.year).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : (car.model_year_id ? String(car.model_year_id).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'N/A');

            return `
                <div class="flex items-center gap-1.5 min-w-0 max-w-[200px]">
                    <img class="w-8 h-8 rounded flex-shrink-0 object-cover border border-gray-200 dark:border-gray-700"
                        src="${cleanImage}"
                        alt="${escapedMake}"
                        onerror="this.onerror=null; this.src='${defaultImage}';"
                        loading="lazy"
                        width="32"
                        height="32"
                        style="display: block; min-width: 32px; min-height: 32px;" />
                    <span class="text-xs font-normal text-gray-900 dark:text-white truncate" style="max-width: 150px;" title="${escapedMake} (${escapedYear})">${escapedMake} (${escapedYear})</span>
                </div>`;
        },

        formatDate(dateString) {
            if (!dateString) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            const date = new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${date}</span>`;
        },

        formatStatus(status) {
            if (!status) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            
            const statusColors = {
                'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                'active': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
                'completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            };
            
            const statusClass = statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            
            return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}">${Alpine.store('i18n').t(status) || status}</span>`;
        },

        formatText(text) {
            if (!text) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${text}</span>`;
        },

        getActionButtons(contractId) {
            return `
                <div class="flex items-center gap-2">
                    <button class="btn btn-sm btn-outline-info view-contract-btn" data-id="${contractId}" title="${Alpine.store('i18n').t('view_details')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
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

                // Hero Section
                const car = contract.booking?.car;
                const heroImage = car?.car_image && car.car_image.length > 0 ? car.car_image[0].image : '/assets/images/default-car.png';
                const heroHtml = `
                    <div class="relative h-32 w-full overflow-hidden rounded-t-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent">
                        <img src="${heroImage}" alt="${car?.make || 'Car'}" 
                             class="h-full w-full object-cover opacity-30"
                             onerror="this.src='/assets/images/default-car.png';">
                        <div class="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div class="text-center">
                                <h2 class="text-lg font-bold text-white">${car?.make || 'Car'} ${car?.model ? `(${car.model.name || ''})` : ''}</h2>
                                <p class="text-sm text-white/80">${car?.years?.year || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                `;

                // Quick Stats
                const quickStatsHtml = `
                    <div class="grid grid-cols-2 gap-2 px-4 pt-4">
                        <div class="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                            <div class="mb-1 flex items-center gap-2">
                                <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="text-xs font-medium text-blue-600 dark:text-blue-400">${Alpine.store('i18n').t('status')}</span>
                            </div>
                            <p class="text-sm font-normal text-black dark:text-white">${Alpine.store('i18n').t(contract.status) || contract.status}</p>
                        </div>
                        <div class="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                            <div class="mb-1 flex items-center gap-2">
                                <svg class="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span class="text-xs font-medium text-green-600 dark:text-green-400">${Alpine.store('i18n').t('created_at')}</span>
                            </div>
                            <p class="text-sm font-normal text-black dark:text-white">${new Date(contract.created_at).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                `;

                // Contract Info Card
                const contractInfoCard = `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('contract_info')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('contract_id')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">#${contract.id || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('status')}</span>
                                <span class="text-sm font-normal ${contract.status === 'active' ? 'text-green-600' : contract.status === 'pending' ? 'text-yellow-600' : 'text-blue-600'}">${Alpine.store('i18n').t(contract.status) || contract.status}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('created_at')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${new Date(contract.created_at).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                `;

                // Contract Terms Card
                const contractTermsCard = contractItems.length > 0 ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('contract_terms')}</h3>
                        </div>
                        <div class="space-y-2">
                            ${contractItems.map(item => `
                                <div class="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                                    <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span class="text-sm font-normal text-black dark:text-white">${item.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : '';

                // Booking Details Card
                const bookingDetailsCard = contract.booking ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('booking_details')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('date_from')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${new Date(contract.booking.date_from).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('date_to')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${new Date(contract.booking.date_end).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('with_driver')}</span>
                                <span class="text-sm font-normal ${contract.booking.with_driver === '1' ? 'text-green-600' : 'text-red-600'}">${contract.booking.with_driver === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('total_price')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${parseFloat(contract.booking.total_price || 0).toFixed(2)} ${Alpine.store('i18n').t('currency') || 'USD'}</span>
                            </div>
                        </div>
                    </div>
                ` : '';

                // Owner Info Card
                const ownerInfoCard = contract.booking?.car?.owner ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('owner_info')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('name')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${contract.booking.car.owner.name || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('email')}</span>
                                <span class="text-sm font-normal text-black dark:text-white break-all">${contract.booking.car.owner.email || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('phone')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${contract.booking.car.owner.phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                ` : '';

                // Renter Info Card
                const renterInfoCard = contract.booking?.user ? `
                    <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <div class="mb-4 flex items-center gap-2">
                            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">${Alpine.store('i18n').t('renter_info')}</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('name')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${contract.booking.user.name || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('email')}</span>
                                <span class="text-sm font-normal text-black dark:text-white break-all">${contract.booking.user.email || 'N/A'}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('phone')}</span>
                                <span class="text-sm font-normal text-black dark:text-white">${contract.booking.user.phone || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                ` : '';

                const detailsHtml = `
                    <div class="space-y-4">
                        ${heroHtml}
                        ${quickStatsHtml}
                        <div class="grid grid-cols-1 gap-4 px-4">
                            ${contractInfoCard}
                            ${contractTermsCard}
                            ${bookingDetailsCard}
                            ${ownerInfoCard}
                            ${renterInfoCard}
                        </div>
                    </div>
                `;

                const contractDetailsContent = document.getElementById('contractDetailsContent');
                const contractDetailsModal = document.getElementById('contractDetailsModal');
                
                if (!contractDetailsContent || !contractDetailsModal) {
                    throw new Error('Modal elements not found');
                }

                contractDetailsContent.innerHTML = detailsHtml;
                contractDetailsModal.classList.remove('hidden');
            } catch (error) {
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
