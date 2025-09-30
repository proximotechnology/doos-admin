document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            const indicator = document.getElementById('loadingIndicator');
            if (indicator) {
                indicator.classList.remove('hidden');
            } else {
                console.warn('loadingIndicator element not found');
            }
        },
        hide: function () {
            const indicator = document.getElementById('loadingIndicator');
            if (indicator) {
                indicator.classList.add('hidden');
            } else {
                console.warn('loadingIndicator element not found');
            }
        }
    };

    function coloredToast(color, message) {
        if (!window.Swal) {
            console.warn('SweetAlert2 is not loaded');
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
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="feesTable"]'));
            if (tableComponent && tableComponent.fetchFees) {
                await tableComponent.fetchFees(tableComponent.currentPage);
            } else {
                console.warn('Table component or fetchFees method not found');
            }
        },
        openEditModal(fee) {
            this.isEditModalOpen = true;
            const modalData = Alpine.$data(document.querySelector('[x-data][x-show="$store.feesTable.isEditModalOpen"]'));
            if (modalData) {
                modalData.feeData = {
                    id: fee.id,
                    type: fee.type,
                    is_active: fee.is_active,
                    description: fee.description || ''
                };
            } else {
                console.warn('Modal data component not found');
            }
        },
        closeEditModal() {
            this.isEditModalOpen = false;
            const modalData = Alpine.$data(document.querySelector('[x-data][x-show="$store.feesTable.isEditModalOpen"]'));
            if (modalData) {
                modalData.resetForm();
            } else {
                console.warn('Modal data component not found');
            }
        },
        async updateFee(feeData) {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const payload = {
                    type: feeData.type || '',
                    is_active: feeData.is_active ? 1 : 0,
                    description: feeData.description || ''
                };

                const response = await fetch(`${this.apiBaseUrl}/api/admin/fees/update/${feeData.id}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();


                if (!response.ok) {
                    const errorMsg =
                        result.message ||
                        Object.values(result.errors || {})
                            .flat()
                            .join(', ') ||
                        Alpine.store('i18n').t('failed_update_fee');
                    throw new Error(errorMsg);
                }

                coloredToast('success', Alpine.store('i18n').t('fee_updated_successfully'));
                await this.refreshTable();
                this.closeEditModal();
            } catch (error) {
                console.error('Update Fee Error:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_update_fee'));
            } finally {
                loadingIndicator.hide();
            }
        }
    });
});
