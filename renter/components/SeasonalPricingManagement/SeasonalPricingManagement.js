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
            const myTable1Container = document.getElementById('myTable1Container');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (myTable1Container) myTable1Container.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const myTable1Container = document.getElementById('myTable1Container');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (myTable1Container) myTable1Container.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const myTable1Container = document.getElementById('myTable1Container');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (myTable1Container) myTable1Container.style.display = 'none';
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
            customClass: { popup: `color-${color}` },
        });
        toast.fire({ title: message });
    }

    Alpine.store('seasonalPricingTable', {
        refreshTable: async function (page = 1) {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="seasonalPricingTable"]'));
            if (tableComponent && tableComponent.fetchSeasonalPricing) {
                await tableComponent.fetchSeasonalPricing(page);
            }
        }
    });

    // Add Seasonal Pricing Form
    Alpine.data('Add_SeasonalPricing', () => ({
        title: '',
        date_from: '',
        date_end: '',
        type: 'percentage',
        value: '',
        status: 'active',
        isSubmitting: false,

        async addSeasonalPricing() {
            try {
                this.isSubmitting = true;
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const formData = {
                    title: this.title,
                    date_from: this.date_from,
                    date_end: this.date_end,
                    type: this.type,
                    value: this.value,
                    status: this.status
                };

                const response = await ApiService.createSeasonalPricing(formData);

                if (response.success) {
                    coloredToast('success', Alpine.store('i18n').t('seasonal_pricing_created_success') || 'Seasonal pricing created successfully');
                    // Reset form
                    this.title = '';
                    this.date_from = '';
                    this.date_end = '';
                    this.type = 'percentage';
                    this.value = '';
                    // Refresh table
                    Alpine.store('seasonalPricingTable').refreshTable();
                } else {
                    throw new Error(response.message || Alpine.store('i18n').t('failed_to_create_seasonal_pricing'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_create_seasonal_pricing'));
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    }));

    // Seasonal Pricing Table
    Alpine.data('seasonalPricingTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchSeasonalPricing(1);

            // Event Delegation for Delete Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const seasonId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteSeasonalPricing(seasonId);
                }
                if (e.target.closest('.update-btn')) {
                    const seasonId = e.target.closest('.update-btn').dataset.id;
                    this.updateSeasonalPricing(seasonId);
                }
                if (e.target.closest('.toggle-status-btn')) {
                    const seasonId = e.target.closest('.toggle-status-btn').dataset.id;
                    this.toggleSeasonStatus(seasonId);
                }
                // Pagination event handling
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchSeasonalPricing(page);
                }
            });
        },

        async fetchSeasonalPricing(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getSeasonalPricing(page);
                
                if (data.success && data.data && data.data.SeasonPricing) {
                    this.tableData = data.data.SeasonPricing || [];
                    this.paginationMeta = data.data.pagination || {
                        current_page: 1,
                        per_page: 10,
                        total: 0,
                        last_page: 1,
                        from: 0,
                        to: 0
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
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_load_seasonal_pricing'));
            }
        },

        populateTable() {
            if (this.datatable1) {
                this.datatable1.destroy();
            }

            const mappedData = this.tableData.map((season, index) => {
                const rowNumber = (this.currentPage - 1) * this.paginationMeta.per_page + index + 1;
                const dateFrom = this.formatDate(season.date_from);
                const dateEnd = this.formatDate(season.date_end);
                const increaseType = season.type === 'percentage' 
                    ? `${season.value}%` 
                    : `$${season.value}`;
                const statusBadge = this.getStatusBadge(season.status);
                
                return [
                    rowNumber,
                    season.title || 'N/A',
                    `${dateFrom} - ${dateEnd}`,
                    Alpine.store('i18n').t(season.type === 'percentage' ? 'percentage' : 'fixed_amount'),
                    increaseType,
                    statusBadge,
                    this.getActionButtons(season.id, season.status)
                ];
            });

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('season_name'),
                        Alpine.store('i18n').t('date_range'),
                        Alpine.store('i18n').t('increase_type'),
                        Alpine.store('i18n').t('increase_value'),
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
                    bottom: this.generatePaginationHTML() + '{info}{pager}',
                },
            });
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

        formatDate(dateString) {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString();
            } catch (e) {
                return dateString;
            }
        },

        getStatusBadge(status) {
            if (status === 'active') {
                return `<span class="badge bg-success">${Alpine.store('i18n').t('active')}</span>`;
            } else if (status === 'pending') {
                return `<span class="badge bg-warning">${Alpine.store('i18n').t('pending')}</span>`;
            } else {
                return `<span class="badge bg-gray-500">${status || 'N/A'}</span>`;
            }
        },

        getActionButtons(seasonId, status) {
            const isActive = status === 'active';
            
            // Only show deactivate button if status is active
            const toggleButton = isActive ? `
                <button class="btn btn-sm btn-warning toggle-status-btn rounded-md px-3 py-1" data-id="${seasonId}" data-status="${status}">
                    ${Alpine.store('i18n').t('deactivate')}
                </button>
            ` : '';
            
            return `
                <div class="flex items-center justify-center gap-2">
                    <button class="btn btn-sm btn-primary update-btn rounded-md px-3 py-1" data-id="${seasonId}">
                        ${Alpine.store('i18n').t('edit')}
                    </button>
                    ${toggleButton}
                    <button class="btn btn-sm btn-danger delete-btn rounded-md px-3 py-1" data-id="${seasonId}">
                        ${Alpine.store('i18n').t('delete')}
                    </button>
                </div>`;
        },

        async deleteSeasonalPricing(seasonId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('delete_seasonal_pricing_warning') || 'This action cannot be undone. The seasonal pricing entry will be permanently deleted.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                });

                if (!isConfirmed.isConfirmed) return;

                loadingIndicator.show();
                await ApiService.deleteSeasonalPricing(seasonId);
                coloredToast('success', Alpine.store('i18n').t('seasonal_pricing_deleted_success') || 'Seasonal pricing deleted successfully');
                await this.fetchSeasonalPricing(this.currentPage);
                loadingIndicator.hide();
            } catch (error) {
                loadingIndicator.hide();
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_delete_seasonal_pricing'));
            }
        },

        async toggleSeasonStatus(seasonId) {
            try {
                const season = this.tableData.find(s => s.id == seasonId);
                if (!season) {
                    coloredToast('danger', Alpine.store('i18n').t('seasonal_pricing_not_found'));
                    return;
                }

                const currentStatus = season.status || 'pending';
                
                // Only allow deactivation if status is active
                if (currentStatus !== 'active') {
                    coloredToast('danger', Alpine.store('i18n').t('can_only_deactivate_active_season') || 'You can only deactivate an active season');
                    return;
                }

                const statusText = Alpine.store('i18n').t('deactivate');

                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: `${Alpine.store('i18n').t('confirm_toggle_status') || 'Are you sure you want to'} ${statusText.toLowerCase()} ${Alpine.store('i18n').t('this_season') || 'this season'}?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                });

                if (!isConfirmed.isConfirmed) return;

                loadingIndicator.show();

                // Prepare data for update - pass 'inactive' as status
                const formData = {
                    title: season.title || '',
                    date_from: season.date_from ? (season.date_from.includes(' ') ? season.date_from.split(' ')[0] : season.date_from) : '',
                    date_end: season.date_end ? (season.date_end.includes(' ') ? season.date_end.split(' ')[0] : season.date_end) : '',
                    type: season.type || 'percentage',
                    value: season.value || '',
                    status: 'inactive'
                };

                const response = await ApiService.updateSeasonalPricing(seasonId, formData);

                if (response.success) {
                    coloredToast('success', Alpine.store('i18n').t('seasonal_pricing_updated_success') || 'Seasonal pricing updated successfully');
                    await this.fetchSeasonalPricing(this.currentPage);
                } else {
                    throw new Error(response.message || Alpine.store('i18n').t('failed_to_update_seasonal_pricing'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_seasonal_pricing'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async updateSeasonalPricing(seasonId) {
            const season = this.tableData.find(s => s.id == seasonId);
            if (!season) {
                coloredToast('danger', Alpine.store('i18n').t('seasonal_pricing_not_found'));
                return;
            }

            // Check if season is active - cannot update title, type, value, date_from for active seasons
            if (season.status === 'active') {
                coloredToast('danger', Alpine.store('i18n').t('cannot_update_active_season') || 'Cannot update title, type, value, or date_from for active season. Please deactivate it first.');
                return;
            }

            // Open update modal
            // Ensure date format is correct (YYYY-MM-DD)
            let dateFrom = season.date_from;
            let dateEnd = season.date_end;
            
            if (dateFrom && dateFrom.includes(' ')) {
                dateFrom = dateFrom.split(' ')[0];
            }
            if (dateEnd && dateEnd.includes(' ')) {
                dateEnd = dateEnd.split(' ')[0];
            }
            
            console.log('Opening update modal with data:', {
                title: season.title,
                date_from: dateFrom,
                date_end: dateEnd,
                type: season.type,
                value: season.value
            });
            
            Alpine.store('updateModal').openModal(
                seasonId,
                {
                    title: season.title || '',
                    date_from: dateFrom || '',
                    date_end: dateEnd || '',
                    type: season.type || 'percentage',
                    value: season.value || ''
                },
                async () => {
                    await this.fetchSeasonalPricing(this.currentPage);
                }
            );
        }
    }));
});

