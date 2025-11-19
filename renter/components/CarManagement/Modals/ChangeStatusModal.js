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

    Alpine.store('changeStatusModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        carId: null,
        isOpen: false,
        callback: null,
        currentStatus: null,
        selectedStatus: null,
        rejectionReasons: [''],
        statusOptions: [
            { value: 'active', label: Alpine.store('i18n').t('active') },
            { value: 'inactive', label: Alpine.store('i18n').t('inactive') },
            { value: 'rejected', label: Alpine.store('i18n').t('rejected') }
        ],

        openModal(carId, currentStatus, callback) {
            this.carId = carId;
            this.currentStatus = currentStatus;
            this.selectedStatus = currentStatus;
            this.callback = callback;
            this.isOpen = true;
            this.rejectionReasons = [''];

            // Update status options with translations - filter based on current status
            const allOptions = [
                { value: 'active', label: Alpine.store('i18n').t('active') },
                { value: 'inactive', label: Alpine.store('i18n').t('inactive') },
                { value: 'rejected', label: Alpine.store('i18n').t('rejected') }
            ];

            // Filter options based on business rules:
            // - Can only deactivate if current status is active
            // - Can always activate (from any status)
            // - Can always reject (from any status)
            this.statusOptions = allOptions.filter(option => {
                if (option.value === 'inactive') {
                    // Can only set to inactive if current status is active
                    return currentStatus === 'active';
                }
                // Can always set to active or rejected
                return true;
            });

            // If no valid options, show all (fallback)
            if (this.statusOptions.length === 0) {
                this.statusOptions = allOptions;
            }

            this.renderRejectionReasons();
            this.toggleRejectionSection();
        },

        toggleRejectionSection() {
            // This will be handled by x-show in the template
        },

        renderRejectionReasons() {
            const container = document.getElementById('rejectionReasonsContainer');
            if (!container) return;

            const html = this.rejectionReasons.map((reason, index) => {
                const safeReason = (reason || '').toString().replace(/"/g, '&quot;');
                return `
                <div class="flex items-center gap-3 reason-item">
                    <input
                        type="text"
                        class="form-input flex-1 rejection-reason-input"
                        placeholder="${Alpine.store('i18n').t('write_reason_here')}"
                        value="${safeReason}"
                        data-index="${index}"
                    />
                    <button
                        type="button"
                        class="remove-reason-btn btn btn-danger btn-sm flex items-center justify-center ${this.rejectionReasons.length > 1 ? '' : 'hidden'}"
                        data-index="${index}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            `;
            }).join('');

            container.innerHTML = html;

            // Add event listeners for inputs and remove buttons
            container.querySelectorAll('.rejection-reason-input').forEach(input => {
                input.addEventListener('input', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    this.rejectionReasons[index] = e.target.value;
                });
            });

            container.querySelectorAll('.remove-reason-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const index = parseInt(btn.dataset.index);
                    this.removeReason(index);
                });
            });
        },

        addReason() {
            this.rejectionReasons.push('');
            this.renderRejectionReasons();
        },

        removeReason(index) {
            this.rejectionReasons.splice(index, 1);
            if (this.rejectionReasons.length === 0) {
                this.rejectionReasons = [''];
            }
            this.renderRejectionReasons();
        },

        updateStatus() {
            if (!this.callback) return;

            // Always get status directly from select element to ensure we have the current value
            const statusSelect = document.getElementById('statusSelect');
            if (!statusSelect) {
                coloredToast('danger', Alpine.store('i18n').t('please_select_status'));
                return;
            }

            let status = statusSelect.value || this.selectedStatus;
            
            // Normalize status
            if (status) {
                status = status.toString().trim().toLowerCase();
            }

            // Validate status
            if (!status) {
                coloredToast('danger', Alpine.store('i18n').t('please_select_status'));
                return;
            }

            const validStatuses = ['active', 'inactive', 'rejected'];
            if (!validStatuses.includes(status)) {
                console.error('Invalid status value:', status, 'Valid statuses:', validStatuses);
                coloredToast('danger', Alpine.store('i18n').t('invalid_status'));
                return;
            }

            // Business rule validation: Can only deactivate if current status is active
            if (status === 'inactive' && this.currentStatus !== 'active') {
                coloredToast('danger', Alpine.store('i18n').t('can_only_deactivate_active_car'));
                return;
            }

            // Collect rejection reasons from inputs
            const reasonInputs = document.querySelectorAll('.rejection-reason-input');
            const reasons = [];
            reasonInputs.forEach(input => {
                const value = input.value.trim();
                if (value) {
                    reasons.push(value);
                }
            });

            const result = {
                status: status,
                rejection_reasons: []
            };

            if (status === 'rejected') {
                if (reasons.length === 0) {
                    coloredToast('danger', Alpine.store('i18n').t('please_enter_rejection_reasons'));
                    return;
                }
                result.rejection_reasons = reasons;
            }

            console.log('Status update data:', result);
            this.callback(result);
            this.closeModal();
        },

        closeModal() {
            this.isOpen = false;
            this.carId = null;
            this.callback = null;
            this.currentStatus = null;
            this.selectedStatus = null;
            this.rejectionReasons = [''];
        },
    });
});

