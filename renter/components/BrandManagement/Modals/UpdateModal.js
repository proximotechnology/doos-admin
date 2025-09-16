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
    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        brandId: null,
        isOpen: false,

        openModal(id) {
            this.brandId = id;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.brandId = null;
            Alpine.store('global').sharedData.name = '';
            Alpine.store('global').sharedData.country = '';
            Alpine.store('global').sharedData.image = '';
        },

        async updateBrand() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const formData = new FormData();
                const name = Alpine.store('global').sharedData.name;
                formData.append('name', name);
                formData.append('make_id', name.charAt(0).toUpperCase() + name.slice(1));
                formData.append('country', Alpine.store('global').sharedData.country);

                const imageInput = document.querySelector('input[type="file"][x-ref="image"]');
                if (imageInput && imageInput.files[0]) {
                    formData.append('image', imageInput.files[0]);
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/update/${this.brandId}`, {
                    method: 'PUT',
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
                        Alpine.store('i18n').t('failed_update_brand');
                    throw new Error(errorMsg);
                }

                coloredToast('success', Alpine.store('i18n').t('brand_updated_successfully'));
                await Alpine.store('brandTable').refreshTable();
                this.closeModal();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_update_brand'));
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
        icon: color === 'success' ? 'success' : 'error',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        showCloseButton: true,
        customClass: { popup: `color-${color}` },
    });
    toast.fire();
}
