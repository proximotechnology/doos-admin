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
            const rolesTableContainer = document.getElementById('rolesTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (rolesTableContainer) rolesTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const rolesTableContainer = document.getElementById('rolesTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (rolesTableContainer) rolesTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const rolesTableContainer = document.getElementById('rolesTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (rolesTableContainer) rolesTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    Alpine.store('roleTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="roleTable"]'));
            if (tableComponent && tableComponent.fetchRoles) {
                await tableComponent.fetchRoles();
            }
        }
    });

    Alpine.data('roleTable', () => ({
        tableData: [],
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchRoles();
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const roleId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteRole(roleId);
                }
                if (e.target.closest('.update-btn')) {
                    const roleId = e.target.closest('.update-btn').dataset.id;
                    this.updateRole(roleId);
                }
                if (e.target.closest('.permissions-btn')) {
                    const roleId = e.target.closest('.permissions-btn').dataset.id;
                    const roleName = e.target.closest('.permissions-btn').dataset.name;
                    this.showPermissionsModal(roleId, roleName);
                }
            });
        },

        async fetchRoles() {
            try {
                loadingIndicator.showTableLoader();

                const data = await ApiService.getRoles();
                if (data.status && data.data && Array.isArray(data.data)) {
                    this.tableData = data.data || [];

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
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((role, index) => [
                `<span class="text-sm font-medium text-gray-900 dark:text-white">${index + 1}</span>`,
                `<div class="flex items-center gap-2">
                    <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <span class="text-sm font-medium text-gray-900 dark:text-white">${this.formatText(role.name)}</span>
                </div>`,
                this.getActionButtons1(role.id, role.permissions_count),
                `<span class="text-sm text-gray-600 dark:text-gray-400">${this.formatDate(role.created_at)}</span>`,
                this.getActionButtons(role.id, role.name),
            ]);

            this.datatable = new simpleDatatables.DataTable('#rolesTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('role_name'),
                        Alpine.store('i18n').t('permissions_count'),
                        Alpine.store('i18n').t('created_at'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: false,
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: '{info}{pager}',
                },
            });
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(roleId, name) {
            return `
                <div class="flex items-center justify-center gap-2">
                    <button class="table-action-btn table-action-btn-warning update-btn flex items-center gap-1.5" data-id="${roleId}" data-name="${name}" title="${Alpine.store('i18n').t('update')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('update')}</span>
                    </button>
                    <button class="table-action-btn table-action-btn-danger delete-btn flex items-center justify-center" data-id="${roleId}" title="${Alpine.store('i18n').t('delete')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>`;
        },

        getActionButtons1(roleId, permissionsCount) {
            return `
                <div class="flex items-center justify-center">
                    <button class="table-action-btn table-action-btn-primary permissions-btn flex items-center gap-1.5" data-id="${roleId}" data-name="${this.tableData.find(r => r.id == roleId)?.name}" title="${Alpine.store('i18n').t('permissions')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span class="text-xs font-semibold">${permissionsCount}</span>
                    </button>
                </div>`;
        },

        async showPermissionsModal(roleId, roleName) {
            Alpine.store('permissionsModal').openModal(roleId, roleName);
        },

        async updateRole(roleId) {
            const role = this.tableData.find((r) => r.id == roleId);
            if (!role) {
                coloredToast('danger', Alpine.store('i18n').t('role_not_found'));
                return;
            }

            Alpine.store('global').sharedData.name = role.name;
            Alpine.store('global').sharedData.guard_name = 'sanctum';
            Alpine.store('updateModal').openModal(roleId);
        },

        async deleteRole(roleId) {
            // Find the role to get its name
            const role = this.tableData.find((r) => r.id == roleId);
            const roleName = role?.name || 'this role';

            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(roleId, roleName, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();

                await ApiService.deleteRole(roleId);

                coloredToast('success', Alpine.store('i18n').t('role_deleted_successfully'));
                await this.fetchRoles();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_delete_role'));
            } finally {
                loadingIndicator.hide();
            }
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message,
                confirmButtonText: Alpine.store('i18n').t('ok'),
                customClass: { htmlContainer: 'text-right' }
            });
        }
    }));

    Alpine.data('Add_Role', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        name: '',
        guard_name: 'sanctum',

        async addRole() {
            try {
                if (!this.name.trim()) {
                    throw new Error(Alpine.store('i18n').t('name_required'));
                }

                loadingIndicator.show();

                await ApiService.addRole({
                    name: this.name,
                    guard_name: this.guard_name
                });

                this.name = '';
                this.guard_name = 'sanctum';
                coloredToast('success', Alpine.store('i18n').t('role_added_successfully'));
                await Alpine.store('roleTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        }
    }));

    function coloredToast(color, message) {
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${color}` },
        });
        toast.fire({ title: message });
    }
});
