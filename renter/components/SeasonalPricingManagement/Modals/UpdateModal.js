document.addEventListener('alpine:init', () => {
    Alpine.store('updateModal', {
        isOpen: false,
        seasonId: null,
        initialData: null,
        onSubmit: null,

        openModal(seasonId, initialData, onSubmit) {
            this.seasonId = seasonId;
            this.initialData = initialData;
            this.onSubmit = onSubmit;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.seasonId = null;
            this.initialData = null;
            this.onSubmit = null;
        }
    });

    Alpine.data('updateModalData', () => ({
        formData: {
            title: '',
            date_from: '',
            date_end: '',
            type: 'percentage',
            value: ''
        },
        isSubmitting: false,

        init() {
            this.$watch('$store.updateModal.isOpen', (isOpen) => {
                if (isOpen && this.$store.updateModal.initialData) {
                    const data = this.$store.updateModal.initialData;
                    this.formData = {
                        title: data.title || '',
                        date_from: data.date_from || '',
                        date_end: data.date_end || '',
                        type: data.type || 'percentage',
                        value: data.value || ''
                    };
                    console.log('Modal initialized with data:', this.formData);
                } else if (!isOpen) {
                    this.formData = {
                        title: '',
                        date_from: '',
                        date_end: '',
                        type: 'percentage',
                        value: ''
                    };
                }
            });
        },

        async submitUpdate() {
            try {
                this.isSubmitting = true;
                const loadingIndicator = {
                    show: function () {
                        document.getElementById('loadingIndicator')?.classList.remove('hidden');
                    },
                    hide: function () {
                        document.getElementById('loadingIndicator')?.classList.add('hidden');
                    }
                };

                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    const coloredToast = (color, message) => {
                        const toast = window.Swal.mixin({
                            toast: true,
                            position: 'bottom-start',
                            showConfirmButton: false,
                            timer: 3000,
                            showCloseButton: true,
                            customClass: { popup: `color-${color}` },
                        });
                        toast.fire({ title: message });
                    };
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                // Prepare and validate form data
                const title = String(this.formData.title || '').trim();
                const date_from = String(this.formData.date_from || '').trim();
                const date_end = String(this.formData.date_end || '').trim();
                const type = String(this.formData.type || 'percentage').trim();
                const value = String(this.formData.value || '').trim();

                // Validate required fields
                if (!title || title.length === 0) {
                    throw new Error(Alpine.store('i18n').t('season_name_required') || 'Season name is required');
                }
                if (!date_from || date_from.length === 0) {
                    throw new Error(Alpine.store('i18n').t('date_from_required') || 'Date from is required');
                }
                if (!date_end || date_end.length === 0) {
                    throw new Error(Alpine.store('i18n').t('date_to_required') || 'Date to is required');
                }
                if (!type || (type !== 'percentage' && type !== 'fixed')) {
                    throw new Error(Alpine.store('i18n').t('invalid_increase_type') || 'Invalid increase type');
                }
                if (!value || isNaN(parseFloat(value))) {
                    throw new Error(Alpine.store('i18n').t('invalid_increase_value') || 'Invalid increase value');
                }

                const formData = {
                    title: title,
                    date_from: date_from,
                    date_end: date_end,
                    type: type,
                    value: parseFloat(value)
                };

                console.log('Updating seasonal pricing with validated data:', formData);
                console.log('Season ID:', this.$store.updateModal.seasonId);
                
                const response = await ApiService.updateSeasonalPricing(this.$store.updateModal.seasonId, formData);
                
                console.log('Update response:', response);

                if (response.success) {
                    const coloredToast = (color, message) => {
                        const toast = window.Swal.mixin({
                            toast: true,
                            position: 'bottom-start',
                            showConfirmButton: false,
                            timer: 3000,
                            showCloseButton: true,
                            customClass: { popup: `color-${color}` },
                        });
                        toast.fire({ title: message });
                    };
                    coloredToast('success', Alpine.store('i18n').t('seasonal_pricing_updated_success') || 'Seasonal pricing updated successfully');
                    
                    this.$store.updateModal.closeModal();
                    
                    if (this.$store.updateModal.onSubmit) {
                        this.$store.updateModal.onSubmit();
                    } else {
                        // Refresh table
                        Alpine.store('seasonalPricingTable').refreshTable();
                    }
                } else {
                    throw new Error(response.message || Alpine.store('i18n').t('failed_to_update_seasonal_pricing'));
                }
            } catch (error) {
                const coloredToast = (color, message) => {
                    const toast = window.Swal.mixin({
                        toast: true,
                        position: 'bottom-start',
                        showConfirmButton: false,
                        timer: 3000,
                        showCloseButton: true,
                        customClass: { popup: `color-${color}` },
                    });
                    toast.fire({ title: message });
                };
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_seasonal_pricing'));
            } finally {
                this.isSubmitting = false;
                const loadingIndicator = {
                    hide: function () {
                        document.getElementById('loadingIndicator')?.classList.add('hidden');
                    }
                };
                loadingIndicator.hide();
            }
        }
    }));
});


