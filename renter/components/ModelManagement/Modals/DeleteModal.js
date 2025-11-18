document.addEventListener('alpine:init', () => {
    Alpine.store('deleteModal', {
        isOpen: false,
        managerId: null,
        modelName: null,
        callback: null,

        async openModal(id, modelName, callback) {
            this.managerId = id;
            this.modelName = modelName || 'this model';
            this.callback = callback;
            
            // Show SweetAlert2 confirmation dialog
            const result = await Swal.fire({
                icon: 'warning',
                title: Alpine.store('i18n').t('delete_confirmation') || 'Delete Confirmation',
                html: `
                    <div class="text-right">
                        <p class="mb-4 text-gray-700 dark:text-gray-300">
                            ${Alpine.store('i18n').t('confirm_delete_model') || 'Are you sure you want to delete this model?'}
                        </p>
                        <div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                            <div class="flex items-center gap-3">
                                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                    <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <div>
                                    <p class="font-semibold text-gray-900 dark:text-white">
                                        ${Alpine.store('i18n').t('model') || 'Model'}: <span class="text-primary">${this.modelName}</span>
                                    </p>
                                    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        ${Alpine.store('i18n').t('delete_warning') || 'This action cannot be undone.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: Alpine.store('i18n').t('yes_delete') || 'Yes, Delete',
                cancelButtonText: Alpine.store('i18n').t('cancel') || 'Cancel',
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                reverseButtons: true,
                customClass: {
                    popup: 'rounded-xl',
                    confirmButton: 'btn btn-danger',
                    cancelButton: 'btn btn-secondary',
                    htmlContainer: 'text-right'
                },
                buttonsStyling: false,
                focusConfirm: false,
                focusCancel: true
            });

            if (result.isConfirmed) {
                if (this.callback && this.managerId) {
                    this.callback(this.managerId);
                }
            }
            
            this.closeModal();
        },

        closeModal() {
            this.isOpen = false;
            this.managerId = null;
            this.modelName = null;
            this.callback = null;
        },
    });
});
