document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const icon = color === 'success' ? 'success' : 'error';
        Swal.fire({
            toast: true,
            position: 'bottom-start',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            customClass: {
                popup: `color-${color}`,
            },
        });
    }

    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        discountId: null,
        isOpen: false,
        callback: null,
        discountData: null,
        brands: [],
        models: [],

        async openModal(id, discountData, callback) {
            this.discountId = id;
            this.discountData = discountData;
            this.callback = callback;
            this.isOpen = true;

            Alpine.store('global').sharedData = {
                title: discountData.title,
                type: discountData.type,
                value: discountData.value,
                date_from: this.formatDateForInput(discountData.date_from),
                date_end: this.formatDateForInput(discountData.date_end),
                brand_id: '',
                model_id: ''
            };

            await this.fetchBrands();
            if (discountData.title === 'model') {
                await this.fetchModels();
            }
        },

        closeModal() {
            this.isOpen = false;
            this.discountId = null;
            this.callback = null;
            this.discountData = null;
            this.brands = [];
            this.models = [];

            Alpine.store('global').sharedData = {
                title: '',
                type: '',
                value: '',
                date_from: '',
                date_end: '',
                brand_id: '',
                model_id: ''
            };
        },

        async fetchBrands() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const response = await fetch(`${this.apiBaseUrl}/api/admin/brand_car/get_all?per_page=1000`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();
                if (response.ok && result.data) {
                    this.brands = result.data.data;
                }
            } catch (error) {
                console.error('Error fetching brands:', error);
            }
        },

        async fetchModels() {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error(Alpine.store('i18n').t('auth_token_not_found'));

                const response = await fetch(`${this.apiBaseUrl}/api/admin/model_car/get_all_models?per_page=1000`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();
                if (response.ok && result.data) {
                    this.models = result.data.data;
                }
            } catch (error) {
                console.error('Error fetching models:', error);
            }
        },

        formatDateForInput(dateString) {
            if (!dateString) return '';
            return new Date(dateString).toISOString().split('T')[0];
        },

        onTitleChange() {
            if (Alpine.store('global').sharedData.title === 'model') {
                this.fetchModels();
            }
            // Reset dependent fields
            Alpine.store('global').sharedData.brand_id = '';
            Alpine.store('global').sharedData.model_id = '';
        },

        updateDiscount() {
            if (this.callback) {
                const updatedData = {
                    title: Alpine.store('global').sharedData.title,
                    type: Alpine.store('global').sharedData.type,
                    value: parseFloat(Alpine.store('global').sharedData.value),
                    date_from: Alpine.store('global').sharedData.date_from,
                    date_end: Alpine.store('global').sharedData.date_end
                };

                if (updatedData.title === 'brand' && Alpine.store('global').sharedData.brand_id) {
                    updatedData.brands = [parseInt(Alpine.store('global').sharedData.brand_id)];
                }

                if (updatedData.title === 'model' && Alpine.store('global').sharedData.model_id) {
                    updatedData.models = [parseInt(Alpine.store('global').sharedData.model_id)];
                }

                this.callback(updatedData);
            }
            this.closeModal();
        },
    });
});
