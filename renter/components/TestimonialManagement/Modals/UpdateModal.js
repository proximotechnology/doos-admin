document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        }
    };

    Alpine.store('updateModal', {
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        testimonialId: null,
        isOpen: false,
        isUpdating: false,

        openModal(id) {
            this.testimonialId = id;
            this.isOpen = true;
            this.isUpdating = false;
        },

        closeModal() {
            this.isOpen = false;
            this.testimonialId = null;
            this.isUpdating = false;
            if (Alpine.store('global').sharedData) {
                Alpine.store('global').sharedData.name = '';
                Alpine.store('global').sharedData.comment = '';
                Alpine.store('global').sharedData.rating = '';
                Alpine.store('global').sharedData.image = '';
            }
        },

        async updateTestimonial() {
            try {
                this.isUpdating = true;
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                if (!Alpine.store('global').sharedData.name?.trim() || !Alpine.store('global').sharedData.comment?.trim() || !Alpine.store('global').sharedData.rating) {
                    throw new Error(Alpine.store('i18n').t('all_fields_required'));
                }

                const formData = new FormData();
                formData.append('name', Alpine.store('global').sharedData.name || '');
                formData.append('comment', Alpine.store('global').sharedData.comment || '');
                formData.append('rating', Alpine.store('global').sharedData.rating || '');

                const imageInput = document.querySelector('input[type="file"][x-ref="image"]');
                if (imageInput && imageInput.files && imageInput.files[0]) {
                    formData.append('image', imageInput.files[0]);
                } else {
                    const currentImage = Alpine.store('global').sharedData.image || '';
                    if (currentImage) {
                        formData.append('current_image', currentImage);
                    }
                }

                const result = await ApiService.updateTestimonial(this.testimonialId, formData);
                
                if (!result.status) {
                    const errorMsg =
                        result.message ||
                        Object.values(result.errors || {})
                            .flat()
                            .join(', ') ||
                        Alpine.store('i18n').t('failed_update_testimonial');
                    throw new Error(errorMsg);
                }

                if (result.data && result.data.image) {
                    Alpine.store('global').sharedData.image = result.data.image;
                }

                coloredToast('success', Alpine.store('i18n').t('testimonial_updated_successfully') || Alpine.store('i18n').t('update_testimonial_success'));
                await Alpine.store('testimonialTable').refreshTable();
                this.closeModal();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_update_testimonial'));
            } finally {
                this.isUpdating = false;
                loadingIndicator.hide();
            }
        }
    });
})
function coloredToast(color, message) {
    const toast = Swal.mixin({
        toast: true,
        position: 'bottom-start',
        icon: color === 'success' ? 'success' : 'error',
        title: message,
        showConfirmButton: false,
        timer: 3000,
        showCloseButton: true,
        customClass: { popup: `color-${color}` },
    });
    toast.fire();
}
