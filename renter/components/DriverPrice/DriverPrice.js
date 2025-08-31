document.addEventListener('alpine:init', () => {

    Alpine.data('driverPrice', () => ({
        currentPrice: null,
        price: '',
        isLoading: false,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async init() {
            await this.fetchCurrentPrice();
        },

        async fetchCurrentPrice() {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/driver_price/show`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_to_fetch_price'));
                }

                const data = await response.json();
                this.currentPrice = data.driver_price.price;
                this.price = data.driver_price.price || '';
            } catch (error) {
                coloredToast('error', error.message || Alpine.store('i18n').t('failed_to_load_price'));
            }
        },

        async updatePrice() {
            this.isLoading = true;
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/driver_price/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        price: this.price,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || Alpine.store('i18n').t('failed_to_update_price'));
                }

                const data = await response.json();
                this.currentPrice = data.price;
                coloredToast('success', Alpine.store('i18n').t('price_updated_success'));
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_price'));
            } finally {
                this.isLoading = false;
            }
        },
    }));
});
