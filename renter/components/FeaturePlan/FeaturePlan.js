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
            const featuresTable = document.getElementById('featuresTable');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (featuresTable) featuresTable.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const featuresTable = document.getElementById('featuresTable');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (featuresTable) featuresTable.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const featuresTable = document.getElementById('featuresTable');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (featuresTable) featuresTable.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    Alpine.store('featureTable', {
        refreshTable: async function (page = 1) {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="featurePlans"]'));
            if (tableComponent && tableComponent.fetchFeatures) {
                await tableComponent.fetchFeatures(page);
            }
        }
    });

    Alpine.data('featurePlans', () => ({
        plans: [],
        tableData: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        form: {
            plan_id: '',
            feature: ''
        },
        _initialized: false,

        async initComponent() {
            if (this._initialized) return;
            this._initialized = true;

            await Promise.all([this.fetchPlans(), this.fetchFeatures(1)]);

            // Event Delegation for Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.edit-btn')) {
                    const featureId = e.target.closest('.edit-btn').dataset.id;
                    this.editFeature(featureId);
                }
                if (e.target.closest('.delete-btn')) {
                    const featureId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteFeature(featureId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchFeatures(page);
                }
            });
        },

        async fetchPlans() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication token is missing. Please log in.');
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getPlans();
                if (data.success && data.data) {
                    this.plans = data.data;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('failed_to_load_plans'));
                }
            } catch (error) {
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_plans') + ': ' + error.message);
            }
        },

        async fetchFeatures(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const data = await ApiService.getFeaturePlans(page);

                // Initialize defaults first
                this.tableData = [];
                this.paginationMeta = {
                    current_page: 1,
                    last_page: 1,
                    per_page: 10,
                    total: 0,
                    from: 0,
                    to: 0,
                    links: []
                };

                // Handle API response structure:
                // {
                //     "status": true,
                //     "data": {
                //         "current_page": 1,
                //         "data": [...],
                //         "per_page": 2,
                //         "total": 1,
                //         "links": [...],
                //         ...
                //     }
                // }
                if (data && data.status === true && data.data) {
                    const responseData = data.data;
                    
                    // Extract features array from data.data.data
                    if (responseData.data && Array.isArray(responseData.data)) {
                        this.tableData = responseData.data;
                    } else {
                        this.tableData = [];
                    }
                    
                    // Extract pagination metadata
                    this.paginationMeta = {
                        current_page: responseData.current_page || 1,
                        last_page: responseData.last_page || 1,
                        per_page: responseData.per_page || 10,
                        total: responseData.total || 0,
                        from: responseData.from || 0,
                        to: responseData.to || 0,
                        links: Array.isArray(responseData.links) ? responseData.links : []
                    };

                    // Check if we have data
                    if (Array.isArray(this.tableData) && this.tableData.length > 0) {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    } else {
                        loadingIndicator.showEmptyState();
                    }
                } else {
                    // No valid response
                    this.tableData = [];
                    throw new Error(data?.message || data?.error || Alpine.store('i18n').t('failed_to_load_features'));
                }
            } catch (error) {
                // Ensure tableData is initialized even on error
                if (!Array.isArray(this.tableData)) {
                    this.tableData = [];
                }
                if (!this.paginationMeta || typeof this.paginationMeta !== 'object') {
                    this.paginationMeta = {
                        current_page: 1,
                        last_page: 1,
                        per_page: 10,
                        total: 0,
                        from: 0,
                        to: 0,
                        links: []
                    };
                }
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                const errorMessage = error?.message || error?.toString() || Alpine.store('i18n').t('failed_to_load_features');
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_features') + ': ' + errorMessage);
            }
        },

        populateTable() {
            try {
                // Check if table element exists
                const tableContainer = document.getElementById('featuresTable');
                if (!tableContainer) {
                    console.error('populateTable: featuresTable container not found');
                    loadingIndicator.showEmptyState();
                    return;
                }

                // Find or create the table element inside the container
                let tableElement = tableContainer.querySelector('table');
                if (!tableElement) {
                    tableElement = document.createElement('table');
                    tableElement.className = 'min-w-full divide-y divide-gray-200 dark:divide-gray-700 whitespace-nowrap';
                    tableContainer.appendChild(tableElement);
                }

                if (this.datatable) {
                    try {
                        this.datatable.destroy();
                    } catch (e) {
                        console.warn('Error destroying datatable:', e);
                    }
                }

                // Ensure tableData is an array before mapping
                if (!this.tableData || !Array.isArray(this.tableData) || this.tableData.length === 0) {
                    console.warn('populateTable: tableData is empty or not an array');
                    loadingIndicator.showEmptyState();
                    return;
                }

                // Ensure paginationMeta exists and has required properties
                if (!this.paginationMeta || typeof this.paginationMeta !== 'object') {
                    this.paginationMeta = {
                        current_page: 1,
                        last_page: 1,
                        per_page: 10,
                        total: 0,
                        from: 0,
                        to: 0,
                        links: []
                    };
                }

                // Map data and ensure all values are valid
                const mappedData = this.tableData.map((feature, index) => {
                    if (!feature || typeof feature !== 'object') {
                        return ['', '', '', '', '', ''];
                    }
                    return [
                        this.formatText((this.currentPage - 1) * (this.paginationMeta.per_page || 10) + index + 1) || '',
                        this.formatText(feature?.feature) || '',
                        this.formatText(feature?.plan?.name) || '',
                        this.formatDate(feature?.created_at) || '',
                        this.formatDate(feature?.updated_at) || '',
                        this.getActionButtons(feature?.id) || '',
                    ];
                }).filter(row => row && Array.isArray(row) && row.length > 0);

                // Ensure mappedData is valid
                if (!mappedData || !Array.isArray(mappedData) || mappedData.length === 0) {
                    console.warn('populateTable: mappedData is empty or invalid');
                    loadingIndicator.showEmptyState();
                    return;
                }

                // Define headings
                const headings = [
                    Alpine.store('i18n').t('id') || 'ID',
                    Alpine.store('i18n').t('feature') || 'Feature',
                    Alpine.store('i18n').t('plan') || 'Plan',
                    Alpine.store('i18n').t('created_at') || 'Created At',
                    Alpine.store('i18n').t('updated_at') || 'Updated At',
                    `<div class="text-center">${Alpine.store('i18n').t('action') || 'Action'}</div>`
                ];

                // Ensure headings and data rows have the same length
                const expectedColumns = 6;
                if (headings.length !== expectedColumns) {
                    console.error('populateTable: headings length mismatch', headings.length, expectedColumns);
                    loadingIndicator.showEmptyState();
                    return;
                }

                // Validate each row has correct number of columns
                const validMappedData = mappedData.filter(row => {
                    if (!Array.isArray(row) || row.length !== expectedColumns) {
                        console.warn('populateTable: invalid row length', row);
                        return false;
                    }
                    return true;
                });

                if (validMappedData.length === 0) {
                    console.warn('populateTable: no valid rows after filtering');
                    loadingIndicator.showEmptyState();
                    return;
                }

                // Use the table element directly instead of selector
                this.datatable = new simpleDatatables.DataTable(tableElement, {
                    data: {
                        headings: headings,
                        data: validMappedData,
                    },
                    searchable: true,
                    perPage: this.paginationMeta.per_page || 10,
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
                        bottom: this.generatePaginationHTML() + '{info}{pager}',
                    },
                });
            } catch (error) {
                console.error('Error populating table:', error);
                loadingIndicator.showEmptyState();
            }
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || typeof this.paginationMeta !== 'object' || !this.paginationMeta.last_page || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2">';

            if (this.paginationMeta.current_page > 1) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary' : 'btn-outline-primary'}" data-page="${i}">
                    ${i}
                </button>`;
            }

            if (this.paginationMeta.current_page < this.paginationMeta.last_page) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page + 1}">
                    ${Alpine.store('i18n').t('next')}
                </button>`;
            }

            paginationHTML += '</nav></div>';
            return paginationHTML;
        },

        async addFeature() {
            try {
                loadingIndicator.show();
                const result = await ApiService.addFeaturePlan({
                    plan_id: this.form.plan_id,
                    feature: this.form.feature
                });

                if (result.status) {
                    coloredToast('success', Alpine.store('i18n').t('feature_added_successfully'));
                    this.form.plan_id = '';
                    this.form.feature = '';
                    await this.fetchFeatures(this.currentPage);
                } else {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_add_feature'));
                }
            } catch (error) {

                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async editFeature(featureId) {
            try {
                if (!this.tableData || !Array.isArray(this.tableData)) {
                    throw new Error('Table data is not available');
                }
                const feature = this.tableData.find(f => f && f.id == featureId);
                if (!feature) {
                    throw new Error('Feature not found');
                }

                const updateConfirmed = await new Promise((resolve) => {
                    Alpine.store('featureUpdateModal').openModal(featureId, feature, this.plans, (id, formValues) => {
                        if (formValues && formValues.plan_id && formValues.feature.trim()) {
                            resolve(formValues);
                        } else {
                            resolve(null);
                        }
                    });
                });

                if (!updateConfirmed) return;

                loadingIndicator.show();
                const result = await ApiService.updateFeaturePlan(featureId, updateConfirmed);

                if (result.status) {
                    coloredToast('success', Alpine.store('i18n').t('feature_updated_successfully'));
                    await this.fetchFeatures(this.currentPage);
                } else {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_update_feature'));
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async deleteFeature(featureId) {
            try {
                const result = await Swal.fire({
                    title: Alpine.store('i18n').t('confirm_delete'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel')
                });

                if (result.isConfirmed) {
                    loadingIndicator.show();
                    const data = await ApiService.deleteFeaturePlan(featureId);
                    if (data.status) {
                        coloredToast('success', Alpine.store('i18n').t('feature_deleted_successfully'));
                        await this.fetchFeatures(this.currentPage);
                    } else {
                        throw new Error(data.message || Alpine.store('i18n').t('failed_to_delete_feature'));
                    }
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        formatDate(dateString) {
            if (!dateString) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            const date = new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${date}</span>`;
        },

        formatText(text) {
            if (!text) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            // Truncate long text
            const maxLength = 100;
            const truncated = String(text).length > maxLength ? String(text).substring(0, maxLength) + '...' : String(text);
            return `<span class="text-sm font-normal text-gray-900 dark:text-white" title="${String(text).replace(/"/g, '&quot;')}">${truncated.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
        },

        getActionButtons(featureId) {
            return `
                <div class="flex items-center gap-1">
                    <button class="edit-btn table-action-btn btn btn-warning btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" data-id="${featureId}" title="${Alpine.store('i18n').t('edit')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('edit')}</span>
                    </button>
                    <button class="delete-btn table-action-btn btn btn-danger btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" data-id="${featureId}" title="${Alpine.store('i18n').t('delete')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('delete')}</span>
                    </button>
                </div>`;
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message
            });
        }
    }));

    coloredToast = (color, message) => {
        const toast = Swal.mixin({
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
    };
});
