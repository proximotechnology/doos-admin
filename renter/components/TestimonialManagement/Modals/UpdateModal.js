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

        openModal(id) {
            this.testimonialId = id;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.testimonialId = null;
            Alpine.store('global').sharedData.name = '';
            Alpine.store('global').sharedData.comment = '';
            Alpine.store('global').sharedData.rating = '';
            Alpine.store('global').sharedData.image = '';
        },

        async updateTestimonial() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const formData = new FormData();
                formData.append('name', Alpine.store('global').sharedData.name || '');
                formData.append('comment', Alpine.store('global').sharedData.comment || '');
                formData.append('rating', Alpine.store('global').sharedData.rating || '');

                const imageInput = document.querySelector('input[type="file"][x-ref="image"]');
                if (!imageInput) {
                    console.error('Image input not found');
                    throw new Error(Alpine.store('i18n').t('image_input_missing'));
                }

                if (imageInput.files && imageInput.files[0]) {
                    formData.append('image', imageInput.files[0]);
                } else {
                    const currentImage = Alpine.store('global').sharedData.image || '';
                    if (currentImage) {
                        formData.append('current_image', currentImage);
                    }
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/testimonial/update/${this.testimonialId}`, {
                    method: 'POST', // Using POST with _method=PUT for Laravel
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                    body: formData,
                });

                const result = await response.json();
                if (!response.ok) {
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

                coloredToast('success', Alpine.store('i18n').t('testimonial_updated_successfully'));
                await Alpine.store('testimonialTable').refreshTable();
                this.closeModal();
            } catch (error) {
                console.error('Update Testimonial Error:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_update_testimonial'));
            } finally {
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
