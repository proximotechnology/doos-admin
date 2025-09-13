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
        },

        async confirmUpdate() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/update/${this.brandId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: Alpine.store('global').sharedData.name,
                        country: Alpine.store('global').sharedData.country,
                    }),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_update_brand'));
                }

                coloredToast('success', Alpine.store('i18n').t('brand_updated_successfully'));
                await Alpine.store('brandTable').refreshTable();
                this.closeModal();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_update_brand'));
            } finally {
                loadingIndicator.hide();
            }
        },
    });
});
