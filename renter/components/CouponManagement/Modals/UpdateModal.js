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
        couponId: null,
        isOpen: false,
        isUpdating: false,
        callback: null,
        couponData: null,

        async openModal(id, couponData, callback) {
            this.couponId = id;
            this.couponData = couponData;
            this.callback = callback;
            this.isOpen = true;

            Alpine.store('global').sharedData = {
                code: couponData.code,
                type: couponData.type,
                value: couponData.value,
                status: couponData.status,
                date_from: this.formatDateForInput(couponData.date_from),
                date_end: this.formatDateForInput(couponData.date_end)
            };
        },

        closeModal() {
            this.isOpen = false;
            this.couponId = null;
            this.callback = null;
            this.couponData = null;

            Alpine.store('global').sharedData = {
                code: '',
                type: '',
                value: '',
                status: '',
                date_from: '',
                date_end: ''
            };
        },

        formatDateForInput(dateString) {
            if (!dateString) return '';
            return new Date(dateString).toISOString().split('T')[0];
        },

        async updateCoupon() {
            this.isUpdating = true;
            loadingIndicator.show();
            try {
                if (this.callback) {
                    const updatedData = {
                        code: Alpine.store('global').sharedData.code,
                        type: Alpine.store('global').sharedData.type,
                        value: parseFloat(Alpine.store('global').sharedData.value),
                        status: Alpine.store('global').sharedData.status,
                        date_from: Alpine.store('global').sharedData.date_from,
                        date_end: Alpine.store('global').sharedData.date_end
                    };

                    await this.callback(updatedData);
                }
                this.closeModal();
            } catch (error) {
                console.error('Error updating coupon:', error);
            } finally {
                this.isUpdating = false;
                loadingIndicator.hide();
            }
        },
    });
});
