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
            const feesTableContainer = document.getElementById('feesTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (feesTableContainer) feesTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const feesTableContainer = document.getElementById('feesTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (feesTableContainer) feesTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const feesTableContainer = document.getElementById('feesTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (feesTableContainer) feesTableContainer.style.display = 'none';
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

    Alpine.store('global', {
        sharedData: {
            name: '',
            role: ''
        }
    });


    Alpine.data('feesTable', () => ({
        fees: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            // Event delegation for buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchFees(page);
                }
                if (e.target.closest('.edit-btn')) {
                    e.preventDefault();
                    e.stopPropagation();
                    const btn = e.target.closest('.edit-btn');
                    if (!btn) return;
                    
                    const feeId = btn.getAttribute('data-id') || btn.dataset.id;
                    if (!feeId) {
                        console.error('No fee ID found on edit button');
                        return;
                    }
                    
                    const fee = this.fees.find(f => {
                        const id = f.id;
                        return id == feeId || id === parseInt(feeId) || String(id) === String(feeId);
                    });
                    
                    if (fee) {
                        Alpine.store('feesTable').openEditModal(fee);
                    } else {
                        console.error('Fee not found for id:', feeId, 'Available fees:', this.fees.map(f => ({ id: f.id, label: f.label })));
                        coloredToast('danger', Alpine.store('i18n').t('fee_not_found') || 'Fee not found');
                    }
                }
            });

            await this.fetchFees(1);
        },

        async fetchFees(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getFees(page);
                if (data.status && data.data) {
                    this.fees = data.data.data || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page,
                        last_page: data.data.last_page,
                        per_page: data.data.per_page,
                        total: data.data.total,
                        from: data.data.from,
                        to: data.data.to,
                        links: data.data.links
                    };

                    if (this.fees.length === 0) {
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
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_fees_try_again'));
            }
        },

        populateTable() {
            if (this.datatable) {
                try {
                    this.datatable.destroy();
                } catch (e) {
                    console.warn('Error destroying datatable:', e);
                }
            }

            // Ensure fees is an array
            if (!this.fees || !Array.isArray(this.fees) || this.fees.length === 0) {
                loadingIndicator.showEmptyState();
                return;
            }

            const tableElement = document.getElementById('myTable1');
            if (!tableElement) {
                console.error('Table element not found');
                loadingIndicator.showEmptyState();
                return;
            }

            const mappedData = this.fees.map((fee, index) => [
                this.formatText((this.currentPage - 1) * (this.paginationMeta.per_page || 10) + index + 1),
                this.formatText(fee.label),
                this.formatText(fee.type),
                this.formatText(fee.price),
                this.formatActive(fee.is_active),
                this.formatText(fee.description),
                this.formatDate(fee.created_at),
                this.getActionButtons(fee.id)
            ]);

            this.datatable = new simpleDatatables.DataTable(tableElement, {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('label'),
                        Alpine.store('i18n').t('type'),
                        Alpine.store('i18n').t('price'),
                        Alpine.store('i18n').t('is_active'),
                        Alpine.store('i18n').t('description'),
                        Alpine.store('i18n').t('created_at'),
                        Alpine.store('i18n').t('action')
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 15,
                perPageSelect: false,
                columns: [{ select: 0, sort: 'asc' }, { select: 7, sortable: false }],
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

        formatText(text) {
            if (text == "fixed") {
                return Alpine.store('i18n').t('fixed');
            }
            else if (text == "percentage") {
                return Alpine.store('i18n').t('percentage');
            } else
                return text || Alpine.store('i18n').t('na');
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatActive(isActive) {
            // Handle null, undefined, or empty values
            if (isActive === null || isActive === undefined || isActive === '') {
                return `<span class="badge badge-danger text-black dark:text-white">
                    ${Alpine.store('i18n').t('no')}
                </span>`;
            }
            
            const isActiveValue = isActive === true || isActive === 1 || isActive === '1' || isActive === 1;
            return `<span class="badge ${isActiveValue ? 'badge-success' : 'badge-danger'} text-black dark:text-white">
                ${isActiveValue ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
            </span>`;
        },

        getActionButtons(feeId) {
            return `
                <div class="flex items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${feeId}" title="${Alpine.store('i18n').t('edit')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                </div>`;
        }
    }));
});
