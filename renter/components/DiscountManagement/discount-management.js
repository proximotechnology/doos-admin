document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading')?.classList.remove('hidden');
            document.getElementById('discountsTable')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('discountsTable')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('discountsTable')?.classList.add('hidden');
            document.getElementById('tableLoading')?.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const icon = color === 'success' ? 'success' : 'error';
        Swal.fire({
            toast: true,
            position: 'bottom-start',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            customClass: {
                popup: `color-${color}`,
            },
        });
    }

    Alpine.store('discountTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="discountTable"]'));
            if (tableComponent && tableComponent.fetchDiscounts) {
                await tableComponent.fetchDiscounts(1);
            }
        }
    });

    Alpine.data('discountTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            title: ''
        },

        async init() {
            await this.fetchDiscounts(1);

            document.addEventListener('click', (e) => {

                if (e.target.closest('.update-btn')) {
                    const discountId = e.target.closest('.update-btn').dataset.id;
                    this.updateDiscount(discountId);
                }
                if (e.target.closest('.activate-btn')) {
                    const discountId = e.target.closest('.activate-btn').dataset.id;
                    this.toggleDiscountStatus(discountId, 'active');
                }
                if (e.target.closest('.deactivate-btn')) {
                    const discountId = e.target.closest('.deactivate-btn').dataset.id;
                    this.toggleDiscountStatus(discountId, 'inactive');
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchDiscounts(page);
                }
            });
        },

        async fetchDiscounts(page = 1) {
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
                if (this.filters.title) filters.title = this.filters.title;

                const data = await ApiService.getDiscounts(page, filters);

                if (data.success && data.data) {
                    this.tableData = data.data.discounts || [];
                    this.paginationMeta = {
                        current_page: data.data.pagination.current_page,
                        last_page: data.data.pagination.last_page,
                        per_page: data.data.pagination.per_page,
                        total: data.data.pagination.total,
                        from: data.data.pagination.from,
                        to: data.data.pagination.to
                    };

                    if (this.tableData.length === 0) {
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

        applyFilters() {
            this.fetchDiscounts(1);
        },

        resetFilters() {
            this.filters.title = '';
            this.fetchDiscounts(1);
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((discount, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatTitle(discount.title),
                this.formatType(discount.type),
                this.formatValue(discount.value, discount.type),
                this.formatDate(discount.date_from),
                this.formatDate(discount.date_end),
                this.formatStatus(discount.status),
                this.getActionButtons(discount.id, discount.status),
            ]);

            this.datatable = new simpleDatatables.DataTable('#discountsTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('scope'),
                        Alpine.store('i18n').t('type'),
                        Alpine.store('i18n').t('value'),
                        Alpine.store('i18n').t('start_date'),
                        Alpine.store('i18n').t('end_date'),
                        Alpine.store('i18n').t('status'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: false,
                perPage: 10,
                perPageSelect: false,
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: this.getPaginationIcon('first'),
                lastText: this.getPaginationIcon('last'),
                prevText: this.getPaginationIcon('prev'),
                nextText: this.getPaginationIcon('next'),
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

        formatTitle(title) {
            const titles = {
                'all_cars': Alpine.store('i18n').t('all_cars'),
                'brand': Alpine.store('i18n').t('by_brand'),
                'model': Alpine.store('i18n').t('by_model')
            };
            return titles[title] || this.formatText(title);
        },

        formatType(type) {
            const types = {
                'percentage': Alpine.store('i18n').t('percentage'),
                'fixed': Alpine.store('i18n').t('fixed_amount')
            };
            return types[type] || this.formatText(type);
        },

        formatValue(value, type) {
            if (type === 'percentage') {
                return `${value}%`;
            } else {
                return `$${parseFloat(value).toFixed(2)}`;
            }
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatStatus(status) {
            const statusClass = `status-${status.toLowerCase()}`;
            const statusText = status === 'active' ? Alpine.store('i18n').t('active') :
                status === 'inactive' ? Alpine.store('i18n').t('inactive') :
                    Alpine.store('i18n').t('pending');

            return `<span class="status-badge ${statusClass} px-2 py-1 rounded-md text-xs">${statusText}</span>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(discountId, status) {
            const isActive = status === 'active';
            const isPending = status === 'pending';
            const isInactive = status === 'inactive';

            const isUpdateDisabled = isActive || isInactive;
            const isStatusDisabled = isPending || isInactive;

            return `
        <div class="flex gap-1">
            <button class="btn update-btn btn-warning btn-sm" data-id="${discountId}" ${isUpdateDisabled ? 'disabled' : ''}>
                ${Alpine.store('i18n').t('update')}
            </button>
            ${isActive ?
                    `<button class="btn deactivate-btn btn-secondary btn-sm" data-id="${discountId}">
                    ${Alpine.store('i18n').t('deactivate')}
                </button>` :
                    `<button class="btn activate-btn btn-success btn-sm" data-id="${discountId}" ${isStatusDisabled ? 'disabled' : ''}>
                    ${Alpine.store('i18n').t('activate')}
                </button>`
                }
        </div>`;
        },

        async updateDiscount(discountId) {
            const discount = this.tableData.find((d) => d.id == discountId);
            if (!discount) return;

            if (discount.status === 'active' || discount.status === 'inactive') {
                coloredToast('danger', 'Cannot update discount with ' + discount.status + ' status. Only pending discounts can be updated.');
                return;
            }

            const updateConfirmed = await new Promise((resolve) => {
                Alpine.store('updateModal').openModal(
                    discountId,
                    discount,
                    (updatedData) => {
                        resolve(updatedData);
                    }
                );
            });

            if (!updateConfirmed) return;

            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    loadingIndicator.hide();
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/discount/update/${discountId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateConfirmed),
                });

                const result = await response.json();

                if (!response.ok) {
                    const errorMsg = result.message ||
                        (result.errors ? Object.values(result.errors).flat().join(', ') : Alpine.store('i18n').t('failed_update_discount'));
                    throw new Error(errorMsg);
                }

                coloredToast('success', Alpine.store('i18n').t('discount_updated_successfully'));
                await this.fetchDiscounts(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async toggleDiscountStatus(discountId, status) {
            try {
                const discount = this.tableData.find((d) => d.id == discountId);
                if (!discount) {
                    throw new Error('Discount not found');
                }

                if (discount.status === 'pending' || discount.status === 'inactive') {
                    coloredToast('danger', 'Cannot change status of discount with ' + discount.status + ' status');
                    return;
                }

                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    loadingIndicator.hide();
                    return;
                }

                const updateData = { status };

                const response = await fetch(`${this.apiBaseUrl}/api/admin/discount/update/${discountId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateData),
                });


                if (!response.ok) {
                    const errorData = await response.json();

                    const errorMsg = errorData.message ||
                        (errorData.errors ? Object.values(errorData.errors).flat().join(', ') :
                            Alpine.store('i18n').t('failed_update_discount'));
                    throw new Error(errorMsg);
                }

                const result = await response.json();

                coloredToast('success',
                    status === 'active' ?
                        Alpine.store('i18n').t('discount_activated_successfully') :
                        Alpine.store('i18n').t('discount_deactivated_successfully')
                );
                await this.fetchDiscounts(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },


        getPaginationIcon(type) {
            const icons = {
                first: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                last: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prev: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                next: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
            };
            return icons[type];
        }
    }));

    Alpine.data('Add_Discount', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        title: '',
        type: '',
        value: '',
        date_from: '',
        date_end: '',
        brand_id: '',
        model_id: '',
        brands: [],
        models: [],

        async init() {
            await this.fetchBrands();
        },

        async fetchBrands() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/get_all?per_page=1000`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_load_brands'));
                }

                this.brands = result.data.data;
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },

        async fetchModels() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/get_all_models?per_page=1000`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_load_models'));
                }

                this.models = result.data.data;
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },

        onTitleChange() {
            if (this.title === 'model') {
                this.fetchModels();
            }
            this.brand_id = '';
            this.model_id = '';
        },

        async addDiscount() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                if (new Date(this.date_end) <= new Date(this.date_from)) {
                    throw new Error(Alpine.store('i18n').t('end_date_must_be_after_start_date'));
                }

                const payload = {
                    title: this.title,
                    type: this.type,
                    value: parseFloat(this.value),
                    date_from: this.date_from,
                    date_end: this.date_end
                };

                if (this.title === 'brand' && this.brand_id) {
                    payload.brands = [parseInt(this.brand_id)];
                }

                if (this.title === 'model' && this.model_id) {
                    payload.models = [parseInt(this.model_id)];
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/discount/store`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                });

                const result = await response.json();

                if (!response.ok) {
                    const errorMsg =
                        result.message ||
                        Object.values(result.errors || {})
                            .flat()
                            .join('\n') ||
                        Alpine.store('i18n').t('error_create_discount');
                    throw new Error(errorMsg);
                }

                this.title = '';
                this.type = '';
                this.value = '';
                this.date_from = '';
                this.date_end = '';
                this.brand_id = '';
                this.model_id = '';

                coloredToast('success', Alpine.store('i18n').t('add_discount_successful'));
                const discountTable = Alpine.$data(document.querySelector('[x-data="discountTable"]'));
                if (discountTable && discountTable.fetchDiscounts) {
                    await discountTable.fetchDiscounts(1);
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },
    }));
});
