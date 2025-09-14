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
            document.getElementById('rolesTable')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('rolesTable')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('rolesTable')?.classList.add('hidden');
            document.getElementById('tableLoading')?.classList.add('hidden');
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

        async init() {
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
            });
        },

        async fetchRoles() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/roles`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_roles'));
                }

                const data = await response.json();
                if (data.status && Array.isArray(data.data)) {
                    this.tableData = data.data;

                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                console.error('Error fetching roles:', error);
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
                this.formatText(index + 1),
                this.formatText(role.name),
                this.formatText(role.permissions_count),
                this.formatDate(role.created_at),
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
                layout: {
                    top: '{search}',
                    bottom: '{info}',
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
                <div class="flex items-center gap-1 justify-center">
                    <button class="btn update-btn btn-warning bg-yellow-500 text-white rounded-md px-3 py-1 hover:bg-yellow-600" data-id="${roleId}" data-name="${name}">
                        ${Alpine.store('i18n').t('update')}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn rounded-md px-3 py-1 hover:bg-red-600" data-id="${roleId}">
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
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(roleId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/roles/${roleId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) throw new Error(Alpine.store('i18n').t('failed_to_delete_role'));
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
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_missing'));

                const response = await fetch(`${this.apiBaseUrl}/api/admin/roles`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: this.name,
                        guard_name: this.guard_name
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    const errorMsg = result.message || Object.values(result.errors || {}).flat().join('\n') || Alpine.store('i18n').t('failed_to_add_role');
                    throw new Error(errorMsg);
                }

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
