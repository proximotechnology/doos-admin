document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        },
        showTableLoader: function () {
            document.getElementById('tableLoading')?.classList.remove('hidden');
            document.getElementById('subscribersTableContainer')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('subscribersTableContainer')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('subscribersTableContainer')?.classList.add('hidden');
            document.getElementById('tableLoading')?.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
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

    Alpine.store('subscribersTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="subscribersTable"]'));
            if (tableComponent && tableComponent.fetchSubscribers) {
                await tableComponent.fetchSubscribers(tableComponent.currentPage);
            }
        }
    });

    Alpine.data('subscribersTable', () => ({
        subscribers: [],
        paginationMeta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
            from: 0,
            to: 0
        },
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchSubscribers(1);
        },

        async fetchSubscribers(page = 1) {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = page;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('danger', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const data = await ApiService.getSubscribers(page, { per_page: 10 });
                console.log('Subscribers API Response:', data);
                
                if (data.status && data.data) {
                    // Handle different response structures
                    if (Array.isArray(data.data)) {
                        // Direct array response
                        this.subscribers = data.data;
                        this.paginationMeta = {
                            current_page: data.current_page || 1,
                            last_page: data.last_page || 1,
                            per_page: data.per_page || 10,
                            total: data.total || 0,
                            from: data.from || 0,
                            to: data.to || 0,
                            links: data.links || []
                        };
                    } else if (data.data.data && Array.isArray(data.data.data)) {
                        // Nested structure: data.data.data
                        this.subscribers = data.data.data;
                        this.paginationMeta = {
                            current_page: data.data.current_page || data.current_page || 1,
                            last_page: data.data.last_page || data.last_page || 1,
                            per_page: data.data.per_page || data.per_page || 10,
                            total: data.data.total || data.total || 0,
                            from: data.data.from || data.from || 0,
                            to: data.data.to || data.to || 0,
                            links: data.data.links || data.links || []
                        };
                    } else {
                        // Fallback: ensure subscribers is always an array
                        this.subscribers = [];
                        this.paginationMeta = {
                            current_page: data.current_page || data.data?.current_page || 1,
                            last_page: data.last_page || data.data?.last_page || 1,
                            per_page: data.per_page || data.data?.per_page || 10,
                            total: data.total || data.data?.total || 0,
                            from: data.from || data.data?.from || 0,
                            to: data.to || data.data?.to || 0,
                            links: data.links || data.data?.links || []
                        };
                    }

                    console.log('Subscribers array:', this.subscribers);
                    console.log('Subscribers length:', this.subscribers.length);
                    
                    if (this.subscribers.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_subscribers_try_again'));
            }
        },

        populateTable() {
            const tbody = document.getElementById('subscribersTableBody');
            if (!tbody) {
                console.error('subscribersTableBody not found!');
                return;
            }

            // Clear existing rows
            tbody.innerHTML = '';

            // Ensure subscribers is an array
            if (!Array.isArray(this.subscribers)) {
                console.warn('subscribers is not an array:', this.subscribers);
                this.subscribers = [];
            }
            
            console.log('Populating table with', this.subscribers.length, 'subscribers');

            // Store reference to this for use in event handlers
            const self = this;
            
            // Populate table rows
            this.subscribers.forEach((subscriber, index) => {
                const row = document.createElement('tr');
                row.className = 'transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50';
                
                const rowNumber = (this.currentPage - 1) * this.paginationMeta.per_page + index + 1;
                
                // Create cells
                const idCell = document.createElement('td');
                idCell.className = 'whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100';
                idCell.textContent = rowNumber;
                
                const emailCell = document.createElement('td');
                emailCell.className = 'whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100';
                emailCell.innerHTML = `
                    <div class="flex items-center gap-2">
                        <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>${this.formatText(subscriber.email)}</span>
                    </div>
                `;
                
                const dateCell = document.createElement('td');
                dateCell.className = 'whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100';
                dateCell.innerHTML = `
                    <div class="flex items-center gap-2">
                        <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>${this.formatDate(subscriber.created_at)}</span>
                    </div>
                `;
                
                const actionCell = document.createElement('td');
                actionCell.className = 'whitespace-nowrap px-6 py-4 text-center text-sm';
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger btn-sm flex items-center gap-2 rounded-md px-3 py-1.5 transition-colors hover:bg-red-600';
                deleteBtn.innerHTML = `
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>${Alpine.store('i18n').t('delete')}</span>
                `;
                deleteBtn.addEventListener('click', () => {
                    self.deleteSubscriber(subscriber.id);
                });
                actionCell.appendChild(deleteBtn);
                
                row.appendChild(idCell);
                row.appendChild(emailCell);
                row.appendChild(dateCell);
                row.appendChild(actionCell);
                
                tbody.appendChild(row);
            });
        },

        getPageNumbers() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return [];
            
            const current = this.paginationMeta.current_page;
            const last = this.paginationMeta.last_page;
            const pages = [];
            
            // Show max 5 pages
            let start = Math.max(1, current - 2);
            let end = Math.min(last, start + 4);
            
            // Adjust start if we're near the end
            if (end - start < 4) {
                start = Math.max(1, end - 4);
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            return pages;
        },

        prevPage() {
            if (this.currentPage > 1) {
                this.fetchSubscribers(this.currentPage - 1);
            }
        },

        nextPage() {
            if (this.currentPage < this.paginationMeta.last_page) {
                this.fetchSubscribers(this.currentPage + 1);
            }
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            try {
                const date = new Date(dateString);
                return date.toLocaleDateString();
            } catch (e) {
                return dateString;
            }
        },

        async deleteSubscriber(subscriberId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('delete_subscriber_warning') || 'This action cannot be undone. The subscriber will be permanently deleted.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                });

                if (!isConfirmed.isConfirmed) return;

                await ApiService.deleteSubscriber(subscriberId);

                coloredToast('success', Alpine.store('i18n').t('subscriber_deleted_success') || 'Subscriber deleted successfully');
                await this.fetchSubscribers(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_subscriber') || 'Failed to delete subscriber');
            }
        }
    }));
});
