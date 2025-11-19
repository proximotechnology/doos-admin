document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            const loader = document.getElementById('loadingIndicator');
            if (loader) loader.classList.remove('hidden');
        },
        hide: function () {
            const loader = document.getElementById('loadingIndicator');
            if (loader) loader.classList.add('hidden');
        }
    };

    Alpine.data('driverPrice', () => ({
        currentPrice: null,
        price: '',
        isLoading: false,
        isInitialLoading: true,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async init() {
            await this.fetchCurrentPrice();
        },

        async fetchCurrentPrice() {
            try {
                this.isInitialLoading = true;
                loadingIndicator.show();
                const data = await ApiService.getDriverPrice();
                
                // Handle different response structures
                let priceValue = null;
                if (data) {
                    if (data.driver_price && data.driver_price.price !== undefined) {
                        priceValue = data.driver_price.price;
                    } else if (data.data && data.data.price !== undefined) {
                        priceValue = data.data.price;
                    } else if (data.price !== undefined) {
                        priceValue = data.price;
                    }
                }
                
                this.currentPrice = priceValue;
                this.price = priceValue !== null && priceValue !== undefined ? priceValue.toString() : '';
            } catch (error) {
                console.error('Error fetching driver price:', error);
                coloredToast('error', error.message || Alpine.store('i18n').t('failed_to_load_price'));
            } finally {
                this.isInitialLoading = false;
                loadingIndicator.hide();
            }
        },

        async updatePrice() {
            this.isLoading = true;
            loadingIndicator.show();
            try {
                const data = await ApiService.updateDriverPrice(this.price);
                
                // Handle different response structures
                let priceValue = null;
                if (data) {
                    if (data.driver_price && data.driver_price.price !== undefined) {
                        priceValue = data.driver_price.price;
                    } else if (data.data && data.data.price !== undefined) {
                        priceValue = data.data.price;
                    } else if (data.price !== undefined) {
                        priceValue = data.price;
                    } else if (data.status && data.data && data.data.price !== undefined) {
                        priceValue = data.data.price;
                    }
                }
                
                // Fallback to the submitted price if API doesn't return it
                if (priceValue === null || priceValue === undefined) {
                    priceValue = parseFloat(this.price);
                }
                
                this.currentPrice = priceValue;
                this.price = priceValue !== null && priceValue !== undefined ? priceValue.toString() : '';
                coloredToast('success', Alpine.store('i18n').t('price_updated_success'));
            } catch (error) {
                console.error('Error updating driver price:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_price'));
            } finally {
                this.isLoading = false;
                loadingIndicator.hide();
            }
        },
    }));
});
