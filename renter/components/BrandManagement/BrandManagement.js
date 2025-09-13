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
            document.getElementById('myTable1').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('myTable1').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('myTable1').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };



    Alpine.store('brandTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="multipleTable"]'));
            if (tableComponent && tableComponent.fetchManagers) {
                await tableComponent.fetchManagers(1);
            }
        }
    });

    Alpine.data('multipleTable', () => ({
        tableData: [],
        paginationMeta: {},
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,

        async init() {

            // Event Delegation for Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const managerId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteManager(managerId);
                }
                if (e.target.closest('.update-btn')) {
                    const managerId = e.target.closest('.update-btn').dataset.id;
                    this.updateManager(managerId);
                }
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchManagers(page);
                }
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

                const queryParams = new URLSearchParams({ page, per_page: 10 });
                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/get_all?${queryParams.toString()}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                console.log('API Response:', data);

                if (data.success && data.data) {
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
                    throw new Error(data.message || 'Invalid response format');
                }
            } catch (error) {
                console.error('Error fetching brands:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        populateTable() {
            if (this.datatable1) {
                this.datatable1.destroy();
            }

            const mappedData = this.tableData.map((manager, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatName(manager.name, manager.image, index),
                this.formatText(manager.country),
                this.getActionButtons(manager.id, manager.name, manager.image),
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('country'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
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
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary bg-blue-600 text-white' : 'btn-outline-primary border border-blue-600 text-blue-600'} hover:bg-blue-100" data-page="${i}">
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

        formatName(name, imageUrl, index) {
            const defaultImage = 'assets/images/default-avatar.png';
            const cleanUrl = imageUrl || defaultImage;

            return `
                <div class="flex items-center w-max" x-data="{ imgError: false }">
                    <img class="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                         :src="imgError ? '${defaultImage}' : '${cleanUrl}'"
                         alt="${name || Alpine.store('i18n').t('unknown')}"
                         @error="imgError = true"
                         loading="lazy"
                         width="36"
                         height="36" />
                    ${name || Alpine.store('i18n').t('unknown')}
                </div>`;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(managerId, name, image) {
            return `
                <div class="flex items-center gap-1">
                    <button class="btn update-btn btn-warning bg-yellow-500 text-white rounded-md px-3 py-1 hover:bg-yellow-600" data-id="${managerId}" data-name="${name}">
                        ${Alpine.store('i18n').t('update')}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn ml-2 rounded-md px-3 py-1 hover:bg-red-600" data-id="${managerId}">
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

        getStatusClass(status) {
            const classes = {
                active: 'btn-success bg-green-500 text-white',
                pending: 'btn-warning bg-yellow-500 text-white',
                rejected: 'btn-danger bg-red-500 text-white',
            };
            return classes[status] || 'btn-primary bg-blue-500 text-white';
        },

        async updateManager(managerId) {
            const brand = this.tableData.find((b) => b.id == managerId);
            if (!brand) return;

            Alpine.store('global').sharedData.name = brand.name;
            Alpine.store('global').sharedData.country = brand.country;

            Alpine.store('updateModal').openModal(managerId);
        },

        async deleteManager(managerId) {
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(managerId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/delete/${managerId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_delete_brand'));
                coloredToast('success', Alpine.store('i18n').t('delete_brand_successful'));

                await this.fetchManagers(this.currentPage);
            } catch (error) {
                this.showError(error.message || Alpine.store('i18n').t('error_delete_brand'));
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
                showConfirmButton: false,
            });
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message,
            });
        },
    }));

    Alpine.data('Add_Category', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        fullname: '',
        country: '',

        async Add_Category() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const formData = new FormData();
                formData.append('name', this.fullname);
                formData.append('country', this.country);

                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/store`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok) {
                    const errorMsg =
                        result.message ||
                        Object.values(result.errors || {})
                            .flat()
                            .join('\n') ||
                        Alpine.store('i18n').t('error_create_brand');
                    throw new Error(errorMsg);
                }

                this.fullname = '';
                this.country = '';

                coloredToast('success', Alpine.store('i18n').t('add_brand_successful'));
                await Alpine.store('brandTable').refreshTable();

            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },
    }));
});

// Global coloredToast function
function coloredToast(color, message) {
    const toast = window.Swal.mixin({
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
}
