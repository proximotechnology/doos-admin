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
        isOpen: false,

        openModal(adminId) {
            this.adminId = adminId;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.adminId = null;
            Alpine.store('global').sharedData = {};
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
