document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        }
    };

    Alpine.store('permissionsModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        roleId: null,
        roleName: '',
        permissions: [],
        isOpen: false,

        async openModal(roleId, roleName) {
            this.roleId = roleId;
            this.roleName = roleName;
            await this.fetchPermissions();
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.roleId = null;
            this.roleName = '';
            this.permissions = [];
        },

        async fetchPermissions() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/roles/${this.roleId}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_permissions'));
                }

                const data = await response.json();
                if (data.status && data.permissions) {
                    this.permissions = data.permissions;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_permissions'));
            } finally {
                loadingIndicator.hide();
            }
        },

        async togglePermission(permissionId, isChecked) {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/permissions/role`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        role_id: this.roleId,
                        permission_id: permissionId
                    }),
                });

                const result = await response.json();


                const permission = this.permissions.find(p => p.id === permissionId);
                if (permission) {
                    permission.granted = isChecked;
                }
                coloredToast('success', result.message);
                await Alpine.store('roleTable').refreshTable();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_permission'));
            } finally {
                loadingIndicator.hide();
                Alpine.$data(document.querySelector('[x-data="{ isUpdating: false }"]')).isUpdating = false;
            }
        }
    });
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
