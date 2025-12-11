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

    if (!Alpine.store('global')) {
        Alpine.store('global', {
            sharedData: {
                status: '',
                admin_notes: '',
                damage_amount: ''
            }
        });
    }

    Alpine.store('updateExceptionStatusModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        exceptionId: null,
        isOpen: false,
        isUpdating: false,
        callback: null,
        exceptionData: null,

        async openModal(exception, callback) {
            if (exception.status && exception.status.toLowerCase() !== 'pending') {
                coloredToast('warning', Alpine.store('i18n').t('can_only_update_pending_exception') || 'You can only update exceptions with pending status');
                return;
            }

            this.exceptionId = exception.id;
            this.exceptionData = exception;
            this.callback = callback;
            this.isOpen = true;

            Alpine.store('global').sharedData = {
                status: '',
                admin_notes: exception.admin_notes || '',
                damage_amount: exception.damage_amount || ''
            };
        },

        closeModal() {
            this.isOpen = false;
            this.exceptionId = null;
            this.callback = null;
            this.exceptionData = null;

            Alpine.store('global').sharedData = {
                status: '',
                admin_notes: '',
                damage_amount: ''
            };
        },

        async updateStatus() {
            if (!Alpine.store('global').sharedData.status) {
                coloredToast('danger', Alpine.store('i18n').t('status_required') || 'Status is required');
                return;
            }

            const status = Alpine.store('global').sharedData.status;
            if (status !== 'approved' && status !== 'rejected') {
                coloredToast('danger', Alpine.store('i18n').t('invalid_status') || 'Invalid status. Must be approved or rejected');
                return;
            }

            const adminNotes = Alpine.store('global').sharedData.admin_notes;
            if (adminNotes && adminNotes.length > 1000) {
                coloredToast('danger', Alpine.store('i18n').t('admin_notes_max_length') || 'Admin notes cannot exceed 1000 characters');
                return;
            }

            // Damage amount is required for accident type
            const damageAmount = Alpine.store('global').sharedData.damage_amount;
            if (this.exceptionData.type === 'Accident' || this.exceptionData.type === 'accident') {
                if (!damageAmount || damageAmount.toString().trim() === '') {
                    coloredToast('danger', Alpine.store('i18n').t('damage_amount_required') || 'Damage amount is required for accident type');
                    return;
                }
                const amount = parseFloat(damageAmount);
                if (isNaN(amount) || amount < 0) {
                    coloredToast('danger', Alpine.store('i18n').t('invalid_damage_amount') || 'Invalid damage amount');
                    return;
                }
            }

            this.isUpdating = true;
            loadingIndicator.show();

            try {
                const data = { status };
                if (adminNotes && adminNotes.trim()) {
                    data.admin_notes = adminNotes.trim();
                }
                
                if (this.exceptionData.type === 'Accident' || this.exceptionData.type === 'accident') {
                    const amount = parseFloat(damageAmount);
                    data.damage_amount = amount;
                }

                const result = await ApiService.updateBookingExceptionStatus(this.exceptionId, data);

                if (result.status === true || result.success === true) {
                    coloredToast('success', result.message || Alpine.store('i18n').t('exception_status_updated') || 'Exception status updated successfully');

                    if (this.callback) {
                        await this.callback({
                            status: data.status,
                            admin_notes: data.admin_notes,
                            damage_amount: data.damage_amount
                        });
                    }

                    this.closeModal();
                } else {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_update_exception_status') || 'Failed to update exception status');
                }
            } catch (error) {
                console.error('Error updating exception status:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_exception_status') || 'Failed to update exception status');
            } finally {
                this.isUpdating = false;
                loadingIndicator.hide();
            }
        },
    });
});

