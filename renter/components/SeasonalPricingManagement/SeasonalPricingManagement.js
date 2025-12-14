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
        is_brand: false,
        brands: [],
        allBrands: [],
        isSubmitting: false,

        async init() {
            await this.fetchBrands();
        },

        async fetchBrands() {
            try {
                const result = await ApiService.getBrands(1, { per_page: 1000 });
                if (result.data && result.data.data) {
                    this.allBrands = result.data.data;
                }
            } catch (error) {
                // Error fetching brands
            }
        },

        toggleBrand(brandId) {
            const index = this.brands.indexOf(brandId);
            if (index > -1) {
                this.brands.splice(index, 1);
            } else {
                this.brands.push(brandId);
            }
        },

        isBrandSelected(brandId) {
            return this.brands.includes(brandId);
        },

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
                    is_brand: this.is_brand,
                    brands: this.is_brand ? this.brands : []
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
                    this.is_brand = false;
                    this.brands = [];
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
        showManageBrandsModal: false,
        selectedSeasonId: null,
        selectedBrands: [],
        allBrands: [],
        isLoadingBrands: false,

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
                if (e.target.closest('.manage-brands-btn')) {
                    const btn = e.target.closest('.manage-brands-btn');
                    const seasonId = btn.dataset.id;
                    const brands = JSON.parse(btn.dataset.brands || '[]');
                    this.openManageBrandsModal(seasonId, brands);
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

                // Fetch all seasons including inactive ones
                const data = await ApiService.getSeasonalPricing(page, { include_inactive: true });
                
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
                const brandsInfo = this.formatBrands(season.brand || []);
                
                return [
                    rowNumber,
                    season.title || 'N/A',
                    `${dateFrom} - ${dateEnd}`,
                    Alpine.store('i18n').t(season.type === 'percentage' ? 'percentage' : 'fixed_amount'),
                    increaseType,
                    brandsInfo,
                    statusBadge,
                    this.getActionButtons(season.id, season.status, season.is_brand, season.brand || [])
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
                        Alpine.store('i18n').t('brands') || 'Brands',
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

        formatBrands(brands) {
            if (!brands || brands.length === 0) {
                return `<span class="text-gray-400">${Alpine.store('i18n').t('all_brands') || 'All Brands'}</span>`;
            }
            const brandNames = brands.map(b => b.brand?.name || `Brand ${b.brand_id}`).join(', ');
            return `<span class="text-sm text-gray-700 dark:text-gray-300" title="${brandNames}">${brandNames.length > 30 ? brandNames.substring(0, 30) + '...' : brandNames}</span>`;
        },

        getStatusBadge(status) {
            if (status === 'active') {
                return `<span class="badge bg-success">${Alpine.store('i18n').t('active')}</span>`;
            } else if (status === 'pending') {
                return `<span class="badge bg-warning">${Alpine.store('i18n').t('pending')}</span>`;
            } else if (status === 'inactive') {
                return `<span class="badge bg-danger">${Alpine.store('i18n').t('inactive') || 'Inactive'}</span>`;
            } else {
                return `<span class="badge bg-gray-500">${status || 'N/A'}</span>`;
            }
        },

        getActionButtons(seasonId, status, isBrand, brands) {
            const isActive = status === 'active';
            
            // Only show deactivate button if status is active
            const toggleButton = isActive ? `
                <button class="btn btn-sm btn-outline-warning toggle-status-btn" data-id="${seasonId}" data-status="${status}" title="${Alpine.store('i18n').t('deactivate')}">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </button>
            ` : '';
            
            const manageBrandsButton = isBrand ? `
                <button class="btn btn-sm btn-outline-info manage-brands-btn" data-id="${seasonId}" data-brands='${JSON.stringify(brands)}' title="${Alpine.store('i18n').t('manage_brands') || 'Manage Brands'}">
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                </button>
            ` : '';
            
            return `
                <div class="flex items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary update-btn" data-id="${seasonId}" title="${Alpine.store('i18n').t('edit')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    ${manageBrandsButton}
                    ${toggleButton}
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${seasonId}" title="${Alpine.store('i18n').t('delete')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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

                // Only send status for deactivation - cannot update title, type, value, date_from for active seasons
                const formData = {
                    status: 'inactive'
                };

                const response = await ApiService.updateSeasonalPricing(seasonId, formData);

                if (response.success) {
                    coloredToast('success', Alpine.store('i18n').t('seasonal_pricing_updated_success') || 'Seasonal pricing updated successfully');
                    // Refresh table to show inactive seasons
                    await this.fetchSeasonalPricing(1);
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
        },

        async openManageBrandsModal(seasonId, currentBrands) {
            this.selectedSeasonId = seasonId;
            // Extract brand IDs from the brands array
            const brandIds = currentBrands.map(b => {
                if (typeof b === 'object' && b !== null) {
                    return b.brand_id || b.id || (b.brand && b.brand.id) || b;
                }
                return b;
            });
            this.selectedBrands = brandIds;
            this.showManageBrandsModal = true;
            this.isLoadingBrands = true;
            
            try {
                const result = await ApiService.getBrands(1, { per_page: 1000 });
                if (result.data && result.data.data) {
                    this.allBrands = result.data.data;
                }
            } catch (error) {
                coloredToast('danger', error.message || 'Failed to load brands');
            } finally {
                this.isLoadingBrands = false;
            }
        },

        closeManageBrandsModal() {
            this.showManageBrandsModal = false;
            this.selectedSeasonId = null;
            this.selectedBrands = [];
        },

        toggleBrandSelection(brandId) {
            const index = this.selectedBrands.indexOf(brandId);
            if (index > -1) {
                this.selectedBrands.splice(index, 1);
            } else {
                this.selectedBrands.push(brandId);
            }
        },

        isBrandSelected(brandId) {
            return this.selectedBrands.includes(brandId);
        },

        async addBrands() {
            if (this.selectedBrands.length === 0) {
                coloredToast('warning', Alpine.store('i18n').t('please_select_brands') || 'Please select at least one brand');
                return;
            }

            try {
                loadingIndicator.show();
                const response = await ApiService.addBrandsToSeasonalPricing(this.selectedSeasonId, this.selectedBrands);
                
                if (response.success) {
                    coloredToast('success', Alpine.store('i18n').t('brands_added_successfully') || 'Brands added successfully');
                    await this.fetchSeasonalPricing(this.currentPage);
                    this.closeManageBrandsModal();
                } else {
                    throw new Error(response.message || 'Failed to add brands');
                }
            } catch (error) {
                coloredToast('danger', error.message || 'Failed to add brands');
            } finally {
                loadingIndicator.hide();
            }
        },

        async removeBrands() {
            if (this.selectedBrands.length === 0) {
                coloredToast('warning', Alpine.store('i18n').t('please_select_brands') || 'Please select at least one brand');
                return;
            }

            try {
                loadingIndicator.show();
                const response = await ApiService.removeBrandsFromSeasonalPricing(this.selectedSeasonId, this.selectedBrands);
                
                if (response.success) {
                    coloredToast('success', Alpine.store('i18n').t('brands_removed_successfully') || 'Brands removed successfully');
                    await this.fetchSeasonalPricing(this.currentPage);
                    this.closeManageBrandsModal();
                } else {
                    throw new Error(response.message || 'Failed to remove brands');
                }
            } catch (error) {
                coloredToast('danger', error.message || 'Failed to remove brands');
            } finally {
                loadingIndicator.hide();
            }
        }
    }));
});

