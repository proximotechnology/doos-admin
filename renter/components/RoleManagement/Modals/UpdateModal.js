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

    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        roleId: null,
        isOpen: false,

        openModal(id) {
            this.roleId = id;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.roleId = null;
            Alpine.store('global').sharedData.name = '';
            Alpine.store('global').sharedData.guard_name = 'sanctum';
        },

        async confirmUpdate() {
            try {
                if (!Alpine.store('global').sharedData.name.trim()) {
                    throw new Error(Alpine.store('i18n').t('name_required'));
                }

                loadingIndicator.show();

                await ApiService.updateRole(this.roleId, {
                    name: Alpine.store('global').sharedData.name,
                    guard_name: Alpine.store('global').sharedData.guard_name || 'sanctum'
                });

                coloredToast('success', Alpine.store('i18n').t('role_updated_successfully'));
                await Alpine.store('roleTable').refreshTable();
                this.closeModal();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_role'));
            } finally {
                loadingIndicator.hide();
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

