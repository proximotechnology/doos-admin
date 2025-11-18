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
                const data = await ApiService.getDriverPrice();
                this.currentPrice = data.driver_price.price;
                this.price = data.driver_price.price || '';
            } catch (error) {
                coloredToast('error', error.message || Alpine.store('i18n').t('failed_to_load_price'));
            }
        },

        async updatePrice() {
            this.isLoading = true;
            try {
                const data = await ApiService.updateDriverPrice(this.price);
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
