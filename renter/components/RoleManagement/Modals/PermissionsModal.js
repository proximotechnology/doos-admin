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
            this.isOpen = true;
            await this.fetchPermissions();
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

                const data = await ApiService.getRolePermissions(this.roleId);
                if (data.status && data.permissions) {
                    this.permissions = data.permissions;
                } else if (data.status && Array.isArray(data.data)) {
                    this.permissions = data.data;
                } else if (data.status && Array.isArray(data)) {
                    // Handle direct array response
                    this.permissions = data;
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_permissions'));
                this.closeModal();
            } finally {
                loadingIndicator.hide();
            }
        },

        async togglePermission(permissionId, isChecked) {
            try {
                loadingIndicator.show();

                // Get current permission IDs
                const currentPermissionIds = this.permissions
                    .filter(p => p.granted || (p.id === permissionId && isChecked))
                    .map(p => p.id);

                // If unchecking, remove from array
                if (!isChecked) {
                    const index = currentPermissionIds.indexOf(permissionId);
                    if (index > -1) {
                        currentPermissionIds.splice(index, 1);
                    }
                }

                const result = await ApiService.assignPermissionsToRole(this.roleId, currentPermissionIds);

                const permission = this.permissions.find(p => p.id === permissionId);
                if (permission) {
                    permission.granted = isChecked;
                }
                coloredToast('success', result.message || Alpine.store('i18n').t('permission_updated_successfully'));
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
