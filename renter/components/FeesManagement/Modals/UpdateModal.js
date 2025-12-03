document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            const indicator = document.getElementById('loadingIndicator');
            if (indicator) {
                indicator.classList.remove('hidden');
            } else {
                }
        },
        hide: function () {
            const indicator = document.getElementById('loadingIndicator');
            if (indicator) {
                indicator.classList.add('hidden');
            } else {
                }
        }
    };

    function coloredToast(color, message) {
        if (!window.Swal) {
            return;
        }
        const toast = window.Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${color}` },
        });
        toast.fire({ title: message });
    }

    Alpine.store('feesTable', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        isEditModalOpen: false,
        isUpdating: false,
        feeData: {
            id: null,
            type: '',
            price: '',
            is_active: false,
            description: ''
        },
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="feesTable"]'));
            if (tableComponent && tableComponent.fetchFees) {
                await tableComponent.fetchFees(tableComponent.currentPage);
            }
        },
        openEditModal(fee) {
            if (!fee || !fee.id) {
                console.error('Invalid fee data:', fee);
                coloredToast('danger', Alpine.store('i18n').t('invalid_fee_data') || 'Invalid fee data');
                return;
            }
            
            this.feeData = {
                id: fee.id,
                type: fee.type || 'fixed',
                price: fee.price || '',
                is_active: fee.is_active === true || fee.is_active === 1 || fee.is_active === '1' || fee.is_active === 1,
                description: fee.description || ''
            };
            this.isEditModalOpen = true;
            
            // Force Alpine to update and show modal
            setTimeout(() => {
                const modal = document.querySelector('[x-show="$store.feesTable.isEditModalOpen"]');
                if (modal) {
                    modal.style.display = 'flex';
                }
            }, 10);
        },
        closeEditModal() {
            this.isEditModalOpen = false;
            this.feeData = {
                id: null,
                type: '',
                price: '',
                is_active: false,
                description: ''
            };
        },
        async updateFee(feeData) {
            if (!feeData || !feeData.id) {
                coloredToast('danger', Alpine.store('i18n').t('invalid_fee_data') || 'Invalid fee data');
                return;
            }

            this.isUpdating = true;
            loadingIndicator.show();
            try {
                const payload = {
                    type: feeData.type || 'fixed',
                    price: feeData.price || 0,
                    is_active: feeData.is_active === true || feeData.is_active === 1 ? 1 : 0,
                    description: feeData.description || ''
                };

                const data = await ApiService.updateFee(feeData.id, payload);

                if (data.status || data.success) {
                    coloredToast('success', Alpine.store('i18n').t('fee_updated_successfully'));
                    await this.refreshTable();
                    this.closeEditModal();
                } else {
                    const errorMsg = data.message || 
                        (data.errors ? Object.values(data.errors).flat().join(', ') : '') ||
                        Alpine.store('i18n').t('failed_update_fee');
                    throw new Error(errorMsg);
                }
            } catch (error) {
                console.error('Error updating fee:', error);
                const errorMessage = error.message || 
                    (error.response?.data?.message) ||
                    (error.response?.data?.errors ? Object.values(error.response.data.errors).flat().join(', ') : '') ||
                    Alpine.store('i18n').t('failed_update_fee');
                coloredToast('danger', errorMessage);
            } finally {
                this.isUpdating = false;
                loadingIndicator.hide();
            }
        }
    });
});
