document.addEventListener('alpine:init', () => {
    function coloredToast(color, message) {
        const iconMap = {
            'success': 'success',
            'warning': 'warning',
            'danger': 'error',
            'error': 'error',
            'info': 'info'
        };
        
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            icon: iconMap[color] || 'info',
            customClass: { 
                popup: `color-${color} swal2-toast`
            }
        });
        toast.fire({ title: message });
    }

    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        }
    };

    Alpine.store('updateInsuranceModal', {
        insuranceId: null,
        currentName: '',
        callback: null,
        isOpen: false,
        isSubmitting: false,
        formData: {
            name: '',
            price: '',
            description: '',
            status: ''
        },

        openModal(insurance, callback) {
            this.insuranceId = insurance.id;
            this.currentName = insurance.name;
            this.formData = {
                name: insurance.name || '',
                price: insurance.price || '',
                description: insurance.description || '',
                status: insurance.status || ''
            };
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.insuranceId = null;
            this.currentName = '';
            this.formData = {
                name: '',
                price: '',
                description: '',
                status: ''
            };
            this.callback = null;
            this.isSubmitting = false;
        },

        async confirmUpdate() {
            if (!this.insuranceId) {
                coloredToast('danger', Alpine.store('i18n').t('insurance_not_found') || 'Insurance not found');
                return;
            }

            try {
                this.isSubmitting = true;
                loadingIndicator.show();

                const updateData = {
                    name: this.formData.name,
                    price: this.formData.price,
                    description: this.formData.description,
                    status: this.formData.status
                };

                const result = await ApiService.updateInsurance(this.insuranceId, updateData);

                if (result.status === false || result.error) {
                    throw new Error(result.message || result.error || Alpine.store('i18n').t('failed_to_update'));
                }

                coloredToast('success', result.message || Alpine.store('i18n').t('insurance_updated_successfully'));
                
                this.closeModal();
                
                // Refresh table
                await Alpine.store('insuranceTable').refreshTable();

                // Retry table refresh after delay
                setTimeout(async () => {
                    try {
                        await Alpine.store('insuranceTable').refreshTable();
                    } catch (error) {
                        console.error('Delayed refresh error:', error);
                    }
                }, 500);

                // Call callback if provided
                if (this.callback && typeof this.callback === 'function') {
                    this.callback();
                }

            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update'));
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    });

    // Load modal HTML
    document.addEventListener('DOMContentLoaded', () => {
        fetch('components/InsuranceManagement/Modals/UpdateInsuranceModal.html')
            .then(response => response.text())
            .then(html => {
                const modalContainer = document.getElementById('updateInsuranceModal');
                if (modalContainer) {
                    modalContainer.innerHTML = html;
                }
            })
            .catch(error => console.error('Error loading update insurance modal:', error));
    });
});
