
document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading').classList.remove('hidden');
            document.getElementById('tableContent').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
        },
        showContent: function () {
            const tableContent = document.getElementById('tableContent');
            const tableLoading = document.getElementById('tableLoading');
            const tableEmptyState = document.getElementById('tableEmptyState');
            
            if (tableContent) {
                tableContent.classList.remove('hidden');
                tableContent.style.display = '';
            }
            if (tableLoading) {
                tableLoading.classList.add('hidden');
            }
            if (tableEmptyState) {
                tableEmptyState.classList.add('hidden');
            }
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('tableContent').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };

    Alpine.store('deleteModal', {
        isOpen: false,
        itemId: null,
        callback: null,

        openModal(id, callback) {
            this.itemId = id;
            this.callback = callback;
            this.isOpen = true;
        },

        closeModal() {
            this.isOpen = false;
        },

        confirmDelete() {
            if (this.callback && this.itemId) {
                this.callback(this.itemId);
            }
            this.closeModal();
        },
    });

    coloredToast = (color, message) => {
        const toast = window.Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            animation: false,
            customClass: {
                popup: `color-${color}`,
            },
        });
        toast.fire({
            title: message,
        });
    };

    Alpine.data('reviewsTable', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        reviews: [],
        cars: [],
        selectedCar: '',
        datatable: null,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            // Initialize event listeners
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const reviewId = e.target.closest('.delete-btn').dataset.id;
                    this.deleteReview(reviewId);
                }
            });
        },

        async fetchReviews() {
            try {
                loadingIndicator.showTableLoader();

                const data = await ApiService.getReviews(this.selectedCar || null);
                this.reviews = Array.isArray(data.data.data) ? data.data.data : Array.isArray(data.data) ? data.data : data.data.data;

                this.populateTable();

                if (this.reviews.length > 0) {
                    loadingIndicator.showContent();
                } else {
                    loadingIndicator.showEmptyState();
                }
            } catch (error) {
                coloredToast('danger', Alpine.store('i18n').t('failed_load_reviews'));
                loadingIndicator.showEmptyState();
            }
        },

        async fetchCars() {
            try {
                const data = await ApiService.getCarsForReviews();
                this.cars = data.data.data || [];
            } catch (error) {
                }
        },

        filterReviews() {
            this.fetchReviews();
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            // Ensure table container is visible
            const tableContent = document.getElementById('tableContent');
            if (tableContent) {
                tableContent.style.display = '';
                tableContent.classList.remove('hidden');
            }

            const mappedData = this.reviews.map((review, index) => [
                index + 1,
                review.user_id,
                review.car_id,
                this.formatRating(review.rating),
                this.formatText(review.comment),
                this.formatStatus(review.status),
                this.formatDate(review.created_at),
                this.getActionButtons(review.id),
            ]);

            // Wait a bit for DOM to be ready
            setTimeout(() => {
                this.datatable = new simpleDatatables.DataTable('#reviewsTable', {
                    data: {
                        headings: [
                            Alpine.store('i18n').t('id'),
                            Alpine.store('i18n').t('user_id'),
                            Alpine.store('i18n').t('car_id'),
                            Alpine.store('i18n').t('rating'),
                            Alpine.store('i18n').t('comment'),
                            Alpine.store('i18n').t('status'),
                            Alpine.store('i18n').t('date'),
                            Alpine.store('i18n').t('action')
                        ],
                        data: mappedData,
                    },
                    searchable: true,
                    perPage: 10,
                    perPageSelect: [10, 20, 30, 50, 100],
                    columns: [{ select: 0, sort: 'asc' }],
                    firstLast: true,
                    labels: { perPage: '{select}' },
                    layout: {
                        top: '{search}',
                        bottom: '{info}{select}{pager}',
                    },
                });
            }, 100);
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        formatRating(rating) {
            return `${rating}/5`;
        },

        formatStatus(status) {
            return status.charAt(0).toUpperCase() + status.slice(1);
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            const date = new Date(dateString);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },

        getActionButtons(reviewId) {
            return `
                        <div class="flex items-center justify-center">
                            <button class="btn btn-sm btn-danger delete-btn" data-id="${reviewId}">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path opacity="0.5" d="M9.17065 4C9.58249 2.83481 10.6937 2 11.9999 2C13.3062 2 14.4174 2.83481 14.8292 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path d="M20.5001 6H3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path d="M18.8334 8.5L18.3735 15.3991C18.1965 18.054 18.108 19.3815 17.243 20.1907C16.378 21 15.0476 21 12.3868 21H11.6134C8.9526 21 7.6222 21 6.75719 20.1907C5.89218 19.3815 5.80368 18.054 5.62669 15.3991L5.16675 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path opacity="0.5" d="M9.5 11L10 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                    <path opacity="0.5" d="M14.5 11L14 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>`;
        },

        async deleteReview(reviewId) {
            const deleteConfirmed = await new Promise((resolve) => {
                Alpine.store('deleteModal').openModal(reviewId, () => {
                    resolve(true);
                });
            });

            if (!deleteConfirmed) return;

            try {
                await ApiService.deleteReviewAdmin(reviewId);

                coloredToast('success', Alpine.store('i18n').t('review_deleted_success'));
                await this.fetchReviews();
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_review'));
            }
        },
    }));
});

