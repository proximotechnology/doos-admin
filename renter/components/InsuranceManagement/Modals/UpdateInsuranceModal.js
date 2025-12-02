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

    Alpine.data('UpdateInsuranceModal', () => ({
        UpdateInsuranceModal_isOpen: false,
        UpdateInsurance_isSubmitting: false,
        UpdateInsurance_insuranceId: null,
        UpdateInsurance_formData: {
            name: '',
            price: '',
            description: '',
            status: ''
        },

        openUpdateInsuranceModal(insurance) {
            this.UpdateInsurance_insuranceId = insurance.id;
            this.UpdateInsurance_formData = {
                name: insurance.name || '',
                price: insurance.price || '',
                description: insurance.description || '',
                status: insurance.status || ''
            };
            this.UpdateInsuranceModal_isOpen = true;
        },

        closeUpdateInsuranceModal() {
            this.UpdateInsuranceModal_isOpen = false;
            this.UpdateInsurance_insuranceId = null;
            this.UpdateInsurance_formData = {
                name: '',
                price: '',
                description: '',
                status: ''
            };
        },

        async handleUpdateInsurance() {
            try {
                this.UpdateInsurance_isSubmitting = true;
                loadingIndicator.show();

                const updateData = {
                    name: this.UpdateInsurance_formData.name,
                    price: this.UpdateInsurance_formData.price,
                    description: this.UpdateInsurance_formData.description,
                    status: this.UpdateInsurance_formData.status
                };

                const result = await ApiService.updateInsurance(this.UpdateInsurance_insuranceId, updateData);

                if (result.status === false || result.error) {
                    throw new Error(result.message || result.error || Alpine.store('i18n').t('failed_to_update'));
                }

                coloredToast('success', result.message || Alpine.store('i18n').t('insurance_updated_successfully'));
                
                this.closeUpdateInsuranceModal();
                
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

            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update'));
            } finally {
                this.UpdateInsurance_isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    }));

    // Load modal HTML
    document.addEventListener('DOMContentLoaded', () => {
        fetch('components/InsuranceManagement/Modals/UpdateInsuranceModal.html')
            .then(response => response.text())
            .then(html => {
                const modalContainer = document.getElementById('updateInsuranceModal');
                if (modalContainer) {
                    modalContainer.innerHTML = html;
                    // Wait for next tick before initializing Alpine
                    setTimeout(() => {
                        const modalElement = document.getElementById('update_insurance_modal');
                        if (modalElement) {
                            Alpine.initTree(modalElement);
                        }
                    }, 100);
                }
            })
            .catch(error => console.error('Error loading update insurance modal:', error));
    });
});

// Global function to open modal
window.openUpdateInsuranceModal = function(insurance) {
    const modalElement = document.getElementById('update_insurance_modal');
    if (modalElement) {
        const alpineData = Alpine.$data(modalElement);
        if (alpineData && alpineData.openUpdateInsuranceModal) {
            alpineData.openUpdateInsuranceModal(insurance);
        }
    }
};

