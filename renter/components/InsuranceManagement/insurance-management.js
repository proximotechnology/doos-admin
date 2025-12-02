document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        },
        showTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const insurancesTableContainer = document.getElementById('insurancesTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (insurancesTableContainer) insurancesTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const insurancesTableContainer = document.getElementById('insurancesTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (insurancesTableContainer) insurancesTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const insurancesTableContainer = document.getElementById('insurancesTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (insurancesTableContainer) insurancesTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const iconMap = {
            'success': 'success',
            'warning': 'warning',
            'danger': 'error',
            'error': 'error',
            'info': 'info'
        };
        
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            icon: iconMap[color] || 'info',
            customClass: { 
                popup: `color-${color} swal2-toast`
            }
        });
        toast.fire({ title: message });
    }

    Alpine.store('insuranceTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="insuranceTable"]'));
            if (tableComponent && tableComponent.fetchInsurances) {
                await tableComponent.fetchInsurances(1);
            }
        }
    });

    Alpine.data('insuranceTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable: null,
        currentPage: 1,
        filters: {
            name: '',
            min_price: '',
            max_price: '',
            status: ''
        },
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchInsurances(1);

            document.addEventListener('click', (e) => {
                if (e.target.closest('.update-btn')) {
                    const insuranceId = e.target.closest('.update-btn').dataset.id;
                    this.updateInsurance(insuranceId);
                }
                if (e.target.closest('.activate-btn')) {
                    const insuranceId = e.target.closest('.activate-btn').dataset.id;
                    this.toggleInsuranceStatus(insuranceId, 'active');
                }
                if (e.target.closest('.deactivate-btn')) {
                    const insuranceId = e.target.closest('.deactivate-btn').dataset.id;
                    this.toggleInsuranceStatus(insuranceId, 'inactive');
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchInsurances(page);
                }
            });
        },

        async fetchInsurances(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const filters = {};
                if (this.filters.name) filters.name = this.filters.name;
                if (this.filters.min_price) filters.min_price = this.filters.min_price;
                if (this.filters.max_price) filters.max_price = this.filters.max_price;
                if (this.filters.status) filters.status = this.filters.status;

                const data = await ApiService.getInsurances(page, filters);

                if (data.success && data.data) {
                    this.tableData = data.data || [];
                    this.paginationMeta = {
                        current_page: page,
                        last_page: 1,
                        per_page: data.count || 0,
                        total: data.count || 0,
                        from: this.tableData.length > 0 ? 1 : 0,
                        to: data.count || 0
                    };

                    if (!this.tableData || this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || 'Invalid response format');
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        populateTable() {
            const tbody = document.getElementById('insurancesTableBody');
            if (!tbody) return;

            tbody.innerHTML = '';

            this.tableData.forEach((insurance) => {
                const row = document.createElement('tr');
                
                const statusBadge = insurance.status === 'active' 
                    ? `<span class="badge badge-outline-success">${Alpine.store('i18n').t('active')}</span>`
                    : `<span class="badge badge-outline-danger">${Alpine.store('i18n').t('inactive')}</span>`;

                const truncatedDescription = insurance.description && insurance.description.length > 50 
                    ? insurance.description.substring(0, 50) + '...'
                    : insurance.description || '-';

                row.innerHTML = `
                    <td>${insurance.id}</td>
                    <td class="font-semibold">${insurance.name || '-'}</td>
                    <td>${parseFloat(insurance.price || 0).toFixed(2)}</td>
                    <td class="max-w-xs truncate" title="${insurance.description || ''}">${truncatedDescription}</td>
                    <td>${statusBadge}</td>
                    <td>${insurance.created_at ? new Date(insurance.created_at).toLocaleDateString() : '-'}</td>
                    <td>
                        <div class="flex items-center gap-2">
                            <button class="update-btn btn btn-sm btn-outline-primary" data-id="${insurance.id}" title="${Alpine.store('i18n').t('edit')}">
                                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>
                            ${insurance.status === 'active' 
                                ? `<button class="deactivate-btn btn btn-sm btn-outline-warning" data-id="${insurance.id}" title="${Alpine.store('i18n').t('deactivate')}">
                                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                   </button>`
                                : `<button class="activate-btn btn btn-sm btn-outline-success" data-id="${insurance.id}" title="${Alpine.store('i18n').t('activate')}">
                                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                   </button>`
                            }
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });

            this.renderPagination();
        },

        renderPagination() {
            const container = document.getElementById('paginationContainer');
            if (!container) return;

            container.innerHTML = '';
            const { current_page, last_page } = this.paginationMeta;

            if (last_page <= 1) return;

            // Previous button
            if (current_page > 1) {
                const prevBtn = document.createElement('button');
                prevBtn.className = 'pagination-btn btn btn-sm btn-outline-primary';
                prevBtn.dataset.page = current_page - 1;
                prevBtn.innerHTML = `
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                `;
                container.appendChild(prevBtn);
            }

            // Page numbers
            for (let i = 1; i <= last_page; i++) {
                if (i === 1 || i === last_page || (i >= current_page - 1 && i <= current_page + 1)) {
                    const pageBtn = document.createElement('button');
                    pageBtn.className = `pagination-btn btn btn-sm ${i === current_page ? 'btn-primary' : 'btn-outline-primary'}`;
                    pageBtn.dataset.page = i;
                    pageBtn.textContent = i;
                    container.appendChild(pageBtn);
                } else if (i === current_page - 2 || i === current_page + 2) {
                    const dots = document.createElement('span');
                    dots.className = 'px-2 text-gray-500';
                    dots.textContent = '...';
                    container.appendChild(dots);
                }
            }

            // Next button
            if (current_page < last_page) {
                const nextBtn = document.createElement('button');
                nextBtn.className = 'pagination-btn btn btn-sm btn-outline-primary';
                nextBtn.dataset.page = current_page + 1;
                nextBtn.innerHTML = `
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                `;
                container.appendChild(nextBtn);
            }
        },

        clearFilters() {
            this.filters = {
                name: '',
                min_price: '',
                max_price: '',
                status: ''
            };
            this.fetchInsurances(1);
        },

        updateInsurance(insuranceId) {
            const insurance = this.tableData.find(i => i.id == insuranceId);
            if (!insurance) {
                return;
            }
            
            // Check if Alpine store is available
            if (!Alpine.store('updateInsuranceModal')) {
                coloredToast('danger', 'Modal system not ready. Please refresh the page.');
                return;
            }
            
            // Open modal using Alpine store (same as Model modal)
            Alpine.store('updateInsuranceModal').openModal(insurance, () => {
                // Callback after successful update
                this.fetchInsurances(this.currentPage);
            });
        },

        async toggleInsuranceStatus(insuranceId, newStatus) {
            const result = await Swal.fire({
                title: Alpine.store('i18n').t('are_you_sure'),
                text: Alpine.store('i18n').t('change_status_confirmation'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: Alpine.store('i18n').t('yes_change'),
                cancelButtonText: Alpine.store('i18n').t('cancel'),
                customClass: {
                    confirmButton: 'btn btn-primary',
                    cancelButton: 'btn btn-outline-danger'
                }
            });

            if (result.isConfirmed) {
                try {
                    loadingIndicator.show();
                    
                    const insurance = this.tableData.find(i => i.id == insuranceId);
                    if (!insurance) throw new Error('Insurance not found');

                    const updateData = {
                        name: insurance.name,
                        price: insurance.price,
                        description: insurance.description,
                        status: newStatus
                    };

                    const response = await ApiService.updateInsurance(insuranceId, updateData);
                    
                    if (response.success || response.status) {
                        coloredToast('success', response.message || Alpine.store('i18n').t('status_updated'));
                        await this.fetchInsurances(this.currentPage);
                    } else {
                        throw new Error(response.message || Alpine.store('i18n').t('failed_to_update'));
                    }
                } catch (error) {
                    coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update'));
                } finally {
                    loadingIndicator.hide();
                }
            }
        },

    }));

    Alpine.data('Add_Insurance', () => ({
        name: '',
        price: '',
        description: '',
        status: '',
        isSubmitting: false,

        init() {
            // Initialize component
        },

        async addInsurance() {
            try {
                this.isSubmitting = true;
                loadingIndicator.show();

                const insuranceData = {
                    name: this.name,
                    price: this.price,
                    description: this.description,
                    status: this.status
                };

                const result = await ApiService.addInsurance(insuranceData);

                // Check for API errors
                if (result.status === false || result.error) {
                    throw new Error(result.message || result.error || Alpine.store('i18n').t('failed_to_add'));
                }

                // Success
                coloredToast('success', result.message || Alpine.store('i18n').t('insurance_added_successfully'));
                
                // Reset form
                this.name = '';
                this.price = '';
                this.description = '';
                this.status = '';

                // Refresh table immediately
                await Alpine.store('insuranceTable').refreshTable();

                // Retry table refresh after delay
                setTimeout(async () => {
                    try {
                        await Alpine.store('insuranceTable').refreshTable();
                    } catch (error) {
                        console.error('Delayed refresh error:', error);
                    }
                }, 500);

            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_add'));
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    }));
});

