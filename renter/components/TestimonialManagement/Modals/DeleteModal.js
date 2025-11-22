document.addEventListener('alpine:init', () => {
    Alpine.store('deleteModal', {
        isOpen: false,
        testimonialId: null,
        testimonialName: null,
        callback: null,
        isDeleting: false,

        openModal(id, callback) {
            this.testimonialId = id;
            this.callback = callback;
            // Get testimonial name from table data if available
            const tableComponent = Alpine.$data(document.querySelector('[x-data="testimonialTable"]'));
            if (tableComponent && tableComponent.tableData) {
                const testimonial = tableComponent.tableData.find(t => t.id == id);
                this.testimonialName = testimonial ? testimonial.name : 'this testimonial';
            } else {
                this.testimonialName = 'this testimonial';
            }
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
            this.testimonialId = null;
            this.testimonialName = null;
            this.callback = null;
            this.isDeleting = false;
        },

        async confirmDelete() {
            if (this.callback) {
                this.isDeleting = true;
                try {
                    await this.callback();
                } finally {
                    this.isDeleting = false;
                }
            }
            this.closeModal();
        }
    });
})
