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
            const adminsTableContainer = document.getElementById('adminsTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (adminsTableContainer) adminsTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const adminsTableContainer = document.getElementById('adminsTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (adminsTableContainer) adminsTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const adminsTableContainer = document.getElementById('adminsTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (adminsTableContainer) adminsTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

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

    Alpine.store('adminsTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="adminsTable"]'));
            if (tableComponent && tableComponent.fetchAdmins) {
                await tableComponent.fetchAdmins();
            }
        }
    });

    Alpine.data('adminsTable', () => ({
        admins: [],
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async init() {
            await this.fetchAdmins();
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const adminId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteAdmin(adminId);
                }
                if (e.target.closest('.update-btn')) {
                    const adminId = e.target.closest('.update-btn').dataset.id;
                    const adminName = e.target.closest('.update-btn').dataset.name;
                    this.editAdmin(adminId, adminName);
                }
            });
        },

        async fetchAdmins() {
            try {
                loadingIndicator.showTableLoader();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getAdmins();
                if (data.status && Array.isArray(data.data)) {
                    this.admins = data.data;
                    if (this.admins.length > 0) {
                        loadingIndicator.hideTableLoader();
                    } else {
                        loadingIndicator.showEmptyState();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_admins'));
                loadingIndicator.showEmptyState();
            }
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' });
        },

        async editAdmin(adminId, adminName) {
            const admin = this.admins.find((a) => a.id == adminId);
            if (!admin) {
                coloredToast('danger', Alpine.store('i18n').t('admin_not_found'));
                return;
            }

            // Open modal with admin data - it will handle loading roles
            await Alpine.store('editModal').openModal(adminId, {
                role_id: admin.role_id || '',
                name: admin.name,
                email: admin.email,
                phone: admin.phone,
                country: admin.country
            });
        },

        async deleteAdmin(adminId) {
            return new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(adminId, async () => {
                    try {
                        loadingIndicator.show();
                        const token = localStorage.getItem('authToken');
                        if (!token) {
                            throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                        }

                        await ApiService.deleteAdmin(adminId);

                        coloredToast('success', Alpine.store('i18n').t('admin_deleted_success'));
                        await this.fetchAdmins();
                        resolve(true);
                    } catch (error) {
                        coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_delete_admin'));
                        resolve(false);
                    } finally {
                        loadingIndicator.hide();
                    }
                });
            });
        }
    }));

    Alpine.data('Add_Admin', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        roles: [],
        role_id: '',
        name: '',
        email: '',
        phone: '',
        country: '',

        async init() {
            await this.fetchRoles();
        },

        async fetchRoles() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getRoles();
                if (data.status && Array.isArray(data.data)) {
                    this.roles = data.data;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_roles'));
            }
        },

        async addAdmin() {
            try {
                if (!this.role_id || !this.name.trim() || !this.email.trim() || !this.phone.trim() || !this.country.trim()) {
                    throw new Error(Alpine.store('i18n').t('all_fields_required'));
                }

                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const result = await ApiService.addAdmin({
                    role_id: this.role_id,
                    name: this.name,
                    email: this.email,
                    phone: this.phone,
                    country: this.country
                });

                if (!result.status) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_add_admin'));
                }

                this.role_id = '';
                this.name = '';
                this.email = '';
                this.phone = '';
                this.country = '';
                coloredToast('success', Alpine.store('i18n').t('admin_added_success'));
                await Alpine.store('adminsTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_add_admin'));
            } finally {
                loadingIndicator.hide();
            }
        }
    }));


});
