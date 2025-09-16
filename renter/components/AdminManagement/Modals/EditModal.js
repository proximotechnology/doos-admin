document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        }
    };

    Alpine.store('editModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        adminId: null,
        roles: [],
        isOpen: false,

        async openModal(adminId) {
            this.adminId = adminId;
            await this.fetchRoles();
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.adminId = null;
            this.roles = [];
            Alpine.store('global').sharedData = {};
        },

        async fetchRoles() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
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
                    this.roles = data.data;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                console.error('Error fetching roles for edit:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_roles'));
            }
        },

        async updateAdmin() {
            const modal = Alpine.$data(document.querySelector('[x-data="{ isUpdating: false }"]'));
            try {
                modal.isUpdating = true;
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                if (!Alpine.store('global').sharedData.role_id || !Alpine.store('global').sharedData.name.trim() || !Alpine.store('global').sharedData.email.trim() || !Alpine.store('global').sharedData.phone.trim() || !Alpine.store('global').sharedData.country.trim()) {
                    throw new Error(Alpine.store('i18n').t('all_fields_required'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/admins/edit/${this.adminId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(Alpine.store('global').sharedData),
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_update_admin'));
                }

                coloredToast('success', Alpine.store('i18n').t('admin_updated_success'));
                this.closeModal();
                await Alpine.store('adminsTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_admin'));
            } finally {
                loadingIndicator.hide();
                modal.isUpdating = false;
            }
        }
    });

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
