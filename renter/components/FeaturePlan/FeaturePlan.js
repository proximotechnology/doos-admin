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
            document.getElementById('featuresTable').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('featuresTable').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('featuresTable').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
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

        async initComponent() {
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

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/index`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
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

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication token is missing. Please log in.');
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/feature/index?page=${page}&per_page=10`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (data.status && data.data) {
                    this.tableData = data.data.data || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page,
                        last_page: data.data.last_page,
                        per_page: data.data.per_page,
                        total: data.data.total,
                        from: data.data.from,
                        to: data.data.to,
                        links: data.data.links
                    };

                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('failed_to_load_features'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load_features') + ': ' + error.message);
            }
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((feature, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(feature.feature),
                this.formatText(feature.plan?.name),
                this.formatDate(feature.created_at),
                this.formatDate(feature.updated_at),
                this.getActionButtons(feature.id),
            ]);

            this.datatable = new simpleDatatables.DataTable('#featuresTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('feature'),
                        Alpine.store('i18n').t('plan'),
                        Alpine.store('i18n').t('created_at'),
                        Alpine.store('i18n').t('updated_at'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
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
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

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
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_not_found'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/feature/store`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        plan_id: this.form.plan_id,
                        feature: this.form.feature
                    }),
                });

                const result = await response.json();

                if (response.ok && result.status) {
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
                const feature = this.tableData.find(f => f.id == featureId);
                if (!feature) {
                    throw new Error('Feature not found');
                }

                const updateConfirmed = await new Promise((resolve) => {
                    Alpine.store('updateModal').openModal(featureId, feature, this.plans, (id, formValues) => {
                        if (formValues && formValues.plan_id && formValues.feature.trim()) {
                            resolve(formValues);
                        } else {
                            resolve(null);
                        }
                    });
                });

                if (!updateConfirmed) return;

                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/feature/update/${featureId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateConfirmed)
                });

                const result = await response.json();

                if (response.ok && result.status) {
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
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/feature/delete/${featureId}`, {
                        method: 'DELETE',
                        headers: {
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        }
                    });

                    const data = await response.json();
                    if (response.ok && data.status) {
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
            animation: false,
            customClass: {
                popup: `color-${color}`,
            },
        });
        toast.fire({
            title: message,
        });
    };
});
