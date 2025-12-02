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
            const brandTableContainer = document.getElementById('brandTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (brandTableContainer) brandTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const brandTableContainer = document.getElementById('brandTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (brandTableContainer) brandTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const brandTableContainer = document.getElementById('brandTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (brandTableContainer) brandTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            icon: color === 'success' ? 'success' : 'error',
            title: message,
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${color}` },
        });
        toast.fire();
    }

    Alpine.store('brandTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="brandTable"]'));
            if (tableComponent && tableComponent.fetchBrands) {
                await tableComponent.fetchBrands(1);
            }
        }
    });



    Alpine.data('brandTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            name: ''
        },
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const brandId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteBrand(brandId);
                }
                if (e.target.closest('.update-btn')) {
                    const brandId = e.target.closest('.update-btn').dataset.id;
                    this.updateBrand(brandId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchBrands(page);
                }
            });
        },

        async fetchBrands(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const filters = {
                    ...this.filters
                };

                const data = await ApiService.getBrands(page, filters);
                if (data.success && data.data) {
                    this.tableData = data.data.data || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page || 1,
                        last_page: data.data.last_page || 1,
                        per_page: data.data.per_page || 10,
                        total: data.data.total || 0,
                        from: data.data.from || 0,
                        to: data.data.to || 0,
                        links: data.data.links || []
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
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_brands'));
            }
        },

        applyFilters() {
            this.fetchBrands(1);
        },

        resetFilters() {
            this.filters.name = '';
            this.fetchBrands(1);
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((brand, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatName(brand.name, brand.image, index),
                this.formatText(brand.country),
                this.getActionButtons(brand.id, brand.name, brand.image),
            ]);

            this.datatable = new simpleDatatables.DataTable('#brandTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('country'),
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

        formatName(name, imageUrl, index) {
            const defaultImage = '/assets/images/avatar-car.webp'; // Ensure this path is correct
            const cleanUrl = imageUrl && imageUrl !== 'null' && imageUrl !== '' ? imageUrl : defaultImage;

            return `
        <div class="flex items-center w-max">
            <img class="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                 src="${cleanUrl}"
                 alt="${name || Alpine.store('i18n').t('unknown')}"
                 onerror="this.src='/assets/images/avatar-car.webp';"
                 loading="lazy"
                 width="36"
                 height="36" />
            <span>${name || Alpine.store('i18n').t('unknown')}</span>
        </div>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(brandId, name, image) {
            return `
                <div class="flex items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary update-btn" data-id="${brandId}" data-name="${name}" title="${Alpine.store('i18n').t('update')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${brandId}" title="${Alpine.store('i18n').t('delete')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>`;
        },

        async updateBrand(brandId) {
            const brand = this.tableData.find((b) => b.id == brandId);
            if (!brand) {
                coloredToast('danger', Alpine.store('i18n').t('brand_not_found'));
                return;
            }

            Alpine.store('global').sharedData.name = brand.name || '';
            Alpine.store('global').sharedData.country = brand.country || '';
            Alpine.store('global').sharedData.image = brand.image || '';
            Alpine.store('global').sharedData.imageFile = null;

            Alpine.store('updateModal').openModal(brandId);
        },

        async deleteBrand(brandId) {
            // Find the brand to get its name
            const brand = this.tableData.find((b) => b.id == brandId);
            const brandName = brand?.name || 'this brand';

            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(brandId, brandName, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                await ApiService.deleteBrand(brandId);
                coloredToast('success', Alpine.store('i18n').t('delete_brand_successful'));
                await this.fetchBrands(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_brand'));
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

    Alpine.data('Add_Brand', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        country: '',
        image: null,

        async addBrand() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                if (!this.name.trim() || !this.country.trim() || !this.$refs.image.files[0]) {

                    throw new Error(Alpine.store('i18n').t('all_fields_required'));
                }

                const makeId = this.name.charAt(0).toUpperCase() + this.name.slice(1);

                const formData = new FormData();
                formData.append('make_id', makeId);
                formData.append('name', this.name);
                formData.append('country', this.country);
                formData.append('image', this.$refs.image.files[0]);

                await ApiService.addBrand(formData);

                this.name = '';
                this.country = '';
                this.$refs.image.value = '';
                coloredToast('success', Alpine.store('i18n').t('add_brand_successful'));
                await Alpine.store('brandTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_add_brand'));
            } finally {
                loadingIndicator.hide();
            }
        }
    }));
});
