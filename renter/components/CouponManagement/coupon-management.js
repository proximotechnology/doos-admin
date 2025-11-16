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
            document.getElementById('couponsTable')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('couponsTable')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('couponsTable')?.classList.add('hidden');
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

    Alpine.store('couponTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="couponTable"]'));
            if (tableComponent && tableComponent.fetchCoupons) {
                await tableComponent.fetchCoupons(1);
            }
        }
    });

    Alpine.data('couponTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            code: ''
        },

        async init() {
            await this.fetchCoupons(1);

            document.addEventListener('click', (e) => {
                if (e.target.closest('.update-btn')) {
                    const couponId = e.target.closest('.update-btn').dataset.id;
                    this.updateCoupon(couponId);
                }
                if (e.target.closest('.activate-btn')) {
                    const couponId = e.target.closest('.activate-btn').dataset.id;
                    this.toggleCouponStatus(couponId, 'active');
                }
                if (e.target.closest('.deactivate-btn')) {
                    const couponId = e.target.closest('.deactivate-btn').dataset.id;
                    this.toggleCouponStatus(couponId, 'inactive');
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchCoupons(page);
                }
            });
        },

        async fetchCoupons(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const queryParams = new URLSearchParams({ page, per_page: 10 });
                if (this.filters.code) queryParams.append('code', this.filters.code);

                const response = await fetch(`${this.apiBaseUrl}/api/admin/coupon/index?${queryParams.toString()}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (data.success && data.data) {
                    this.tableData = data.data.data || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page,
                        last_page: data.data.last_page,
                        per_page: data.data.per_page,
                        total: data.data.total,
                        from: data.data.from,
                        to: data.data.to
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
                console.error('Error fetching coupons:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.fetchCoupons(1);
        },

        resetFilters() {
            this.filters.code = '';
            this.fetchCoupons(1);
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((coupon, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(coupon.code),
                this.formatType(coupon.type),
                this.formatValue(coupon.value, coupon.type),
                this.formatDate(coupon.date_from),
                this.formatDate(coupon.date_end),
                this.formatStatus(coupon.status),
                this.getActionButtons(coupon.id, coupon.status),
            ]);

            this.datatable = new simpleDatatables.DataTable('#couponsTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('code'),
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

        getActionButtons(couponId, status) {
            const isActive = status === 'active';

            return `
                <div class="flex gap-1">
                    <button class="btn update-btn btn-warning btn-sm" data-id="${couponId}">
                        ${Alpine.store('i18n').t('update')}
                    </button>
                    ${isActive ?
                    `<button class="btn deactivate-btn btn-secondary btn-sm" data-id="${couponId}">
                            ${Alpine.store('i18n').t('deactivate')}
                        </button>` :
                    `<button class="btn activate-btn btn-success btn-sm" data-id="${couponId}">
                            ${Alpine.store('i18n').t('activate')}
                        </button>`
                }
                </div>`;
        },

        async updateCoupon(couponId) {
            const coupon = this.tableData.find((c) => c.id == couponId);
            if (!coupon) return;

            const updateConfirmed = await new Promise((resolve) => {
                Alpine.store('updateModal').openModal(
                    couponId,
                    coupon,
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

                const response = await fetch(`${this.apiBaseUrl}/api/admin/coupon/update/${couponId}`, {
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
                    let errorMessage = Alpine.store('i18n').t('failed_update_coupon');

                    if (result.errors) {
                        const errorMessages = [];
                        for (const field in result.errors) {
                            if (Array.isArray(result.errors[field])) {
                                errorMessages.push(...result.errors[field]);
                            }
                        }
                        errorMessage = errorMessages.join(', ');
                    } else if (result.message) {
                        errorMessage = result.message;
                    }

                    throw new Error(errorMessage);
                }

                coloredToast('success', Alpine.store('i18n').t('coupon_updated_successfully'));
                await this.fetchCoupons(this.currentPage);
            } catch (error) {
                console.error('Update error:', error);
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async toggleCouponStatus(couponId, status) {
            try {
                const coupon = this.tableData.find((c) => c.id == couponId);
                if (!coupon) {
                    throw new Error('Coupon not found');
                }

                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    loadingIndicator.hide();
                    return;
                }

                const updateData = {
                    status: status,
                    type: coupon.type,
                    code: coupon.code,
                    value: coupon.value,
                    date_from: coupon.date_from,
                    date_end: coupon.date_end
                };

                const response = await fetch(`${this.apiBaseUrl}/api/admin/coupon/update/${couponId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(updateData),
                });

                const result = await response.json();

                if (!response.ok) {
                    let errorMessage = Alpine.store('i18n').t('failed_update_coupon');

                    if (result.errors) {
                        const errorMessages = [];
                        for (const field in result.errors) {
                            if (Array.isArray(result.errors[field])) {
                                errorMessages.push(...result.errors[field]);
                            }
                        }
                        errorMessage = errorMessages.join(', ');
                    } else if (result.message) {
                        errorMessage = result.message;
                    }

                    throw new Error(errorMessage);
                }

                coloredToast('success',
                    status === 'active' ?
                        Alpine.store('i18n').t('coupon_activated_successfully') :
                        Alpine.store('i18n').t('coupon_deactivated_successfully')
                );
                await this.fetchCoupons(this.currentPage);
            } catch (error) {
                console.error('Status toggle error:', error);
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

    Alpine.data('Add_Coupon', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        code: '',
        type: '',
        value: '',
        date_from: '',
        date_end: '',
        status: 'active',

        async addCoupon() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                // Validate dates
                if (new Date(this.date_end) <= new Date(this.date_from)) {
                    throw new Error(Alpine.store('i18n').t('end_date_must_be_after_start_date'));
                }

                const payload = {
                    code: this.code,
                    type: this.type,
                    value: parseFloat(this.value),
                    date_from: this.date_from,
                    date_end: this.date_end,
                    status: this.status
                };

                const response = await fetch(`${this.apiBaseUrl}/api/admin/coupon/store`, {
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
                        Alpine.store('i18n').t('error_create_coupon');
                    throw new Error(errorMsg);
                }

                // Reset form
                this.code = '';
                this.type = '';
                this.value = '';
                this.date_from = '';
                this.date_end = '';
                this.status = 'active';

                coloredToast('success', Alpine.store('i18n').t('add_coupon_successful'));
                const couponTable = Alpine.$data(document.querySelector('[x-data="couponTable"]'));
                if (couponTable && couponTable.fetchCoupons) {
                    await couponTable.fetchCoupons(1);
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },
    }));
});
