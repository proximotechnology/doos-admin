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

    Alpine.data('multipleTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        filters: {
            name: ''
        },

        async init() {
            await this.fetchManagers(1);

            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const managerId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteManager(managerId);
                }
                if (e.target.closest('.update-btn')) {
                    const managerId = e.target.closest('.update-btn').dataset.id;
                    this.updateManager(managerId);
                }
                if (e.target.closest('.view-details-btn')) {
                    const managerId = e.target.closest('.view-details-btn').dataset.id;
                    this.viewDetails(managerId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchManagers(page);
                }
            });

            document.addEventListener('click', (e) => {
                const dropdownBtn = e.target.closest('.dropdown-toggle');
                const statusOption = e.target.closest('.status-option');

                if (dropdownBtn) {
                    const dropdown = dropdownBtn.closest('.dropdown');
                    const menu = dropdown.querySelector('.dropdown-menu');
                    menu.classList.toggle('hidden');
                }

                if (statusOption) {
                    const dropdown = statusOption.closest('.dropdown');
                    const managerId = dropdown.dataset.id;
                    const newStatus = statusOption.dataset.value;
                    const toggleBtn = dropdown.querySelector('.dropdown-toggle');

                    toggleBtn.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                    toggleBtn.className = `dropdown-toggle btn btn-sm ${this.getStatusClass(newStatus)}`;
                    dropdown.querySelector('.dropdown-menu').classList.add('hidden');
                }
            });
        },

        async fetchManagers(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const filters = {
                    ...this.filters
                };

                const data = await ApiService.getModels(page, filters);

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
                    throw new Error(data.message || 'Invalid response format');
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        applyFilters() {
            this.fetchManagers(1);
        },

        resetFilters() {
            this.filters.name = '';
            this.fetchManagers(1);
        },

        populateTable() {
            if (this.datatable1) {
                this.datatable1.destroy();
            }

            const mappedData = this.tableData.map((manager, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(manager.name),
                this.formatText(manager.brand?.name || 'N/A'),
                this.getActionButtons(manager.id, manager.name, manager.image),
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('brand'),
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

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(managerId, name, image) {
            return `
                <div class="flex items-center gap-1">
                    <button class="btn update-btn btn-warning btn-sm" data-id="${managerId}">
                        ${Alpine.store('i18n').t('update')}
                    </button>
                    <button class="btn view-details-btn btn-info btn-sm" data-id="${managerId}">
                        ${Alpine.store('i18n').t('view_details')}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${managerId}">
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

        viewDetails(managerId) {
            window.location.href = `model-details.html?id=${managerId}`;
        },

        getStatusClass(status) {
            const classes = {
                active: 'btn-success',
                pending: 'btn-warning',
                rejected: 'btn-danger',
            };
            return classes[status] || 'btn-primary';
        },

        async updateManager(managerId) {
            const model = this.tableData.find((m) => m.id == managerId);
            if (!model) return;

            const updateConfirmed = await new Promise((resolve) => {
                Alpine.store('updateModal').openModal(
                    managerId,
                    model.name,
                    (id, name) => {
                        resolve({ id, name });
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

                const formData = new FormData();
                formData.append('name', updateConfirmed.name);

                await ApiService.updateModel(managerId, formData);

                coloredToast('success', Alpine.store('i18n').t('model_updated_successfully'));
                await this.fetchManagers(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async deleteManager(managerId) {
            // Find the model to get its name
            const model = this.tableData.find((m) => m.id == managerId);
            const modelName = model?.name || 'this model';

            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(managerId, modelName, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }
                await ApiService.deleteModel(managerId);
                coloredToast('success', Alpine.store('i18n').t('delete_model_successful'));
                await this.fetchManagers(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('error_delete_model'));
            } finally {
                loadingIndicator.hide();
            }
        },

        getStatusColor(status) {
            const statusColors = {
                active: 'success',
                inactive: 'danger',
                pending: 'warning',
                suspended: 'secondary',
                banned: 'dark',
            };
            return statusColors[status?.toLowerCase()] || 'primary';
        },

        getPaginationIcon(type) {
            const icons = {
                first: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                last: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prev: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                next: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
            };
            return icons[type];
        },

        showSuccess(message) {
            Swal.fire({
                icon: 'success',
                title: Alpine.store('i18n').t('success'),
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message
            });
        },
    }));

    Alpine.data('Add_Category', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        brand_id: '',
        brands: [],
        modelImage: null,
        years: [
            {
                year: '',
                image: null
            }
        ],

        async init() {
            await this.fetchBrands();
        },

        async fetchBrands() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const result = await ApiService.getBrands(1, { per_page: 1000 });

                this.brands = result.data.data;
            } catch (error) {
                coloredToast('danger', error.message);
            }
        },

        addYear() {
            this.years.push({
                year: '',
                image: null
            });
        },

        removeYear(index) {
            if (this.years.length > 1) {
                this.years.splice(index, 1);
            }
        },

        handleModelImage(event) {
            const file = event.target.files[0];
            if (file) {
                this.modelImage = file;
            }
        },

        handleYearImage(event, index) {
            const file = event.target.files[0];
            if (file) {
                this.years[index].image = file;
            }
        },

        async Add_Category() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                if (!this.name || !this.brand_id) {
                    throw new Error(Alpine.store('i18n').t('fill_required_fields'));
                }

                // Validate years
                if (!this.years || this.years.length === 0) {
                    throw new Error(Alpine.store('i18n').t('year_required'));
                }

                for (let i = 0; i < this.years.length; i++) {
                    const year = this.years[i];
                    if (!year.year || year.year.toString().trim() === '') {
                        throw new Error(Alpine.store('i18n').t('year_required') + ` (${i + 1})`);
                    }
                    if (!year.image) {
                        throw new Error(Alpine.store('i18n').t('year_image_required') + ` (${i + 1})`);
                    }
                }

                const formData = new FormData();
                formData.append('name', this.name);
                formData.append('brand_id', this.brand_id.toString());

                if (this.modelImage) {
                    formData.append('image', this.modelImage);
                }

                // Append years data - ensure proper format
                this.years.forEach((yearData, index) => {
                    // Append year value as string
                    const yearValue = yearData.year.toString().trim();
                    formData.append(`years[${index}][year]`, yearValue);
                    // Append year image file
                    if (yearData.image instanceof File) {
                        formData.append(`years[${index}][image]`, yearData.image);
                    }
                });

                // Debug: Log FormData before sending
                console.group('📋 FormData before sending Model');
                console.log('Name:', this.name);
                console.log('Brand ID:', this.brand_id);
                console.log('Model Image:', this.modelImage ? `[File: ${this.modelImage.name}]` : 'None');
                console.log('Years Count:', this.years.length);
                for (let i = 0; i < this.years.length; i++) {
                    console.log(`Year ${i}:`, {
                        year: this.years[i].year,
                        image: this.years[i].image instanceof File ? `[File: ${this.years[i].image.name}]` : 'None'
                    });
                }
                // Log FormData entries
                for (const [key, value] of formData.entries()) {
                    if (value instanceof File) {
                        console.log(`${key}: [File: ${value.name}, size: ${value.size} bytes]`);
                    } else {
                        console.log(`${key}:`, value);
                    }
                }
                console.groupEnd();

                await ApiService.addModel(formData);

                this.resetForm();

                coloredToast('success', Alpine.store('i18n').t('add_model_successful'));
                const multipleTable = Alpine.$data(document.querySelector('[x-data="multipleTable"]'));
                if (multipleTable && multipleTable.fetchManagers) {
                    await multipleTable.fetchManagers(1);
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        resetForm() {
            this.name = '';
            this.brand_id = '';
            this.modelImage = null;
            this.years = [
                {
                    year: '',
                    image: null
                }
            ];

            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => {
                input.value = '';
            });
        },
    }));

    coloredToast = (color, message) => {
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
    };
});
