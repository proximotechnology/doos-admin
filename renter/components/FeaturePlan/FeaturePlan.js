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
        paginationMeta: {}, // إضافة متغير لتخزين بيانات التصفح
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1, // إضافة متغير لتتبع الصفحة الحالية
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
                console.log('API Response:', data);

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
                console.error('Error fetching features:', error);
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
                perPage: this.paginationMeta.per_page || 10, // استخدام per_page من الـ API
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

            // زر "السابق"
            if (this.paginationMeta.current_page > 1) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            // أرقام الصفحات
            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary' : 'btn-outline-primary'}" data-page="${i}">
                    ${i}
                </button>`;
            }

            // زر "التالي"
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

                const { value: formValues } = await Swal.fire({
                    title: Alpine.store('i18n').t('edit_feature'),
                    html: `
                        <div class="text-left">
                            <label class="block mb-2 text-sm font-medium">${Alpine.store('i18n').t('plan')}</label>
                            <select id="planId" class="swal2-select w-full p-2 border rounded mb-4" required>
                                <option value="" disabled>${Alpine.store('i18n').t('select_plan')}</option>
                                ${this.plans.map(plan => `
                                    <option value="${plan.id}" ${plan.id == feature.plan_id ? 'selected' : ''}>${plan.name}</option>
                                `).join('')}
                            </select>
                            <label class="block mb-2 text-sm font-medium">${Alpine.store('i18n').t('feature')}</label>
                            <textarea id="featureText" class="swal2-textarea w-full p-2 border rounded" rows="4" placeholder="${Alpine.store('i18n').t('enter_feature_text')}">${feature.feature}</textarea>
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('save'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                    preConfirm: () => {
                        const planId = document.getElementById('planId').value;
                        const featureText = document.getElementById('featureText').value;
                        if (!planId || !featureText.trim()) {
                            Swal.showValidationMessage(Alpine.store('i18n').t('feature_and_plan_required'));
                            return false;
                        }
                        return { plan_id: planId, feature: featureText.trim() };
                    }
                });

                if (formValues) {
                    loadingIndicator.show();
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/feature/update/${featureId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(formValues)
                    });

                    const result = await response.json();

                    if (response.ok && result.status) {
                        coloredToast('success', Alpine.store('i18n').t('feature_updated_successfully'));
                        await this.fetchFeatures(this.currentPage);
                    } else {
                        throw new Error(result.message || Alpine.store('i18n').t('failed_to_update_feature'));
                    }
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
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/plan/feature/destroy/${featureId}`, {
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
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(featureId) {
            return `
                <div class="flex items-center gap-1">
                    <button class="btn edit-btn btn-warning btn-sm" data-id="${featureId}">
                        ${Alpine.store('i18n').t('edit')}
                    </button>
                    <button class="btn delete-btn btn-danger btn-sm" data-id="${featureId}">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path opacity="0.5" d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path d="M18.8334 8.5L18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path opacity="0.5" d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            <path opacity="0.5" d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
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
