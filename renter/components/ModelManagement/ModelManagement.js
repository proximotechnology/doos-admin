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
    }; Alpine.store('modelTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="multipleTable"]'));
            if (tableComponent && tableComponent.fetchManagers) {
                await tableComponent.fetchManagers();
            }
        }
    });
    Alpine.data('multipleTable', () => ({
        tableData: [],
        datatable1: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async init() {
            await this.fetchManagers();

            // Event Delegation for Delete Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const managerId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteManager(managerId);
                }
                if (e.target.closest('.update-btn')) {
                    const managerId = e.target.closest('.update-btn').dataset.id;
                    this.updateManager(managerId);
                }
            });

            // Event Delegation for Status Dropdown
            document.addEventListener('click', (e) => {
                const dropdownBtn = e.target.closest('.dropdown-toggle');
                const statusOption = e.target.closest('.status-option');

                // Handle dropdown toggle
                if (dropdownBtn) {
                    const dropdown = dropdownBtn.closest('.dropdown');
                    const menu = dropdown.querySelector('.dropdown-menu');
                    menu.classList.toggle('hidden');
                }

                // Handle status selection
                if (statusOption) {
                    const dropdown = statusOption.closest('.dropdown');
                    const managerId = dropdown.dataset.id;
                    const newStatus = statusOption.dataset.value;
                    const toggleBtn = dropdown.querySelector('.dropdown-toggle');

                    // Update button appearance
                    toggleBtn.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                    toggleBtn.className = `dropdown-toggle btn btn-sm ${this.getStatusClass(newStatus)}`;

                    // Close dropdown
                    dropdown.querySelector('.dropdown-menu').classList.add('hidden');

                    // Update status via API
                }
            });
        },

        // جلب بيانات المديرين من API
        async fetchManagers() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'renter/auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/get_all`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                this.tableData = data;

                if (this.tableData.length === 0) {
                    loadingIndicator.showEmptyState();
                } else {
                    this.populateTable();
                    loadingIndicator.hideTableLoader();
                }
            } catch (error) {
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
                this.formatText(index + 1),
                this.formatText(manager.name),

                this.getActionButtons(manager.id, manager.name, manager.imag),
            ]);

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: [10, 20, 30, 50, 100],
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: this.getPaginationIcon('first'),
                lastText: this.getPaginationIcon('last'),
                prevText: this.getPaginationIcon('prev'),
                nextText: this.getPaginationIcon('next'),
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: '{info}{select}{pager}',
                },
            });
        },

        // تنسيق الاسم مع الصورة
        formatName(name, imageUrl, index) {
            const defaultImage = 'assets/images/default-avatar.png';
            const cleanUrl = imageUrl;

            return `
            <div class="flex items-center w-max" x-data="{ imgError: false }">
                <img class="w-9 h-9 rounded-full ltr:mr-2 rtl:ml-2 object-cover"
                     :src="imgError ? '${defaultImage}' : '${cleanUrl}'"
                     alt="${name || Alpine.store('i18n').t('user')}"
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
        formatType(text) {
            if (text == '1') text = Alpine.store('i18n').t('service');
            else {
                text = Alpine.store('i18n').t('product');
            }
            return text;
        },

        // أزرار الإجراءات
        getActionButtons(managerId, name, imag) {
            return `
                <div class="flex items-center  gap-1">
                    <!-- Status Dropdown -->
                    <button class="btn update-btn btn-warning" data-id="${[managerId, name]}">
                        ${Alpine.store('i18n').t('update')}
                    </button>

                    <!-- Delete Button -->
                    <button class="btn btn-sm btn-danger delete-btn ml-2" data-id="${managerId}">
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

        // Helper function for status button classes
        getStatusClass(status) {
            const classes = {
                active: 'btn-success',
                pending: 'btn-warning',
                rejected: 'btn-danger',
            };
            return classes[status] || 'btn-primary';
        },

        async updateManager(managerId) {
            // الحصول على بيانات الموديل الحالية
            const model = this.tableData.find((m) => m.id == managerId[0]);
            if (!model) return;

            // تعبئة النموذج بالبيانات الحالية
            Alpine.store('global').sharedData.name = model.name;

            const updateConfirmed = await new Promise((resolve) => {
                Alpine.store('updateModal').openModal(managerId, () => {
                    resolve(true);
                });
            });

            if (!updateConfirmed) return;

            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    loadingIndicator.hide();
                    return;
                } const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/update/${managerId[0]}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: Alpine.store('global').sharedData.name,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_update_model'));
                }

                // استخدام SweetAlert2 بشكل صحيح
                Swal.fire({
                    toast: true,
                    position: 'bottom-start',
                    icon: 'success',
                    title: Alpine.store('i18n').t('success'),
                    text: Alpine.store('i18n').t('model_updated_successfully'),
                    showConfirmButton: false,
                    timer: 3000,
                    customClass: {
                        popup: 'color-success',
                    },
                });

                await this.fetchManagers();
            } catch (error) {
                console.error('Update error:', error);
                Swal.fire({
                    toast: true,
                    position: 'bottom-start',
                    icon: 'error',
                    title: Alpine.store('i18n').t('error'),
                    text: error.message || Alpine.store('i18n').t('failed_update_model'),
                    showConfirmButton: false,
                    timer: 3000,
                    customClass: {
                        popup: 'color-danger',
                    },
                });
            } finally {
                loadingIndicator.hide();
            }
        },
        // حذف المدير
        async deleteManager(managerId) {
            // استخدام المودال بدلاً من confirm
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(managerId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/delete/${managerId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_delete_model'));
                coloredToast('success', Alpine.store('i18n').t('delete_model_successful'));

                await this.fetchManagers();
            } catch (error) {
                this.showError(error.message || Alpine.store('i18n').t('error_delete_model'));
            } finally {
                loadingIndicator.hide();
            }
        },
        // بقية الدوال المساعدة...
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
                first: '<svg...></svg>',
                last: '<svg...></svg>',
                prev: '<svg...></svg>',
                next: '<svg...></svg>',
            };
            return icons[type];
        },

        showSuccess(message) {
            alert(message);
        },

        showError(message) {
            alert(message);
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
    Alpine.data('Add_Category', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter, // Ensure API_CONFIG is defined
        fullname: '',

        async Add_Category() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const formData = new FormData();
                formData.append('name', this.fullname);

                const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/store`, {
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
                        Alpine.store('i18n').t('error_create_model');
                    throw new Error(errorMsg);
                }

                this.fullname = '';
                this.price = '';

                coloredToast('success', Alpine.store('i18n').t('add_model_successful'));
                await Alpine.store('modelTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },
    }));
});
