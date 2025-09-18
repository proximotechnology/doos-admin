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
            document.getElementById('myTable1')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('myTable1')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('myTable1')?.classList.add('hidden');
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
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,

        async init() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchSubscribers(page);
                }
                if (e.target.closest('.delete-subscriber-btn')) {
                    const subscriberId = e.target.closest('.delete-subscriber-btn').dataset.id;
                    this.deleteSubscriber(subscriberId);
                }
            });

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

                const queryParams = new URLSearchParams({ page, per_page: 10 });
                const response = await fetch(`${this.apiBaseUrl}/api/admin/subscribers/index?${queryParams.toString()}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_subscribers'));
                }

                const data = await response.json();
                if (data.status && data.data) {
                    this.subscribers = data.data || [];
                    this.paginationMeta = {
                        current_page: data.current_page || 1,
                        last_page: data.last_page || 1,
                        per_page: data.per_page || 10,
                        total: data.total || 0,
                        from: data.from || 0,
                        to: data.to || 0,
                        links: data.links || []
                    };

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
                console.error('Error fetching subscribers:', error);
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_subscribers_try_again'));
            }
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.subscribers.map((subscriber, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(subscriber.email),
                this.formatDate(subscriber.created_at),
                this.getActionButtons(subscriber.id)
            ]);

            this.datatable = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('email'),
                        Alpine.store('i18n').t('created_at'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: false,
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: this.generatePaginationHTML() + '{info}{pager}',
                },
            });
        },

        generatePaginationHTML() {
            if (!this.paginationMeta || this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2">';

            if (this.paginationMeta.current_page > 1) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary rounded-md px-3 py-1 hover:bg-blue-100" data-page="${this.paginationMeta.current_page - 1}">
                    ${Alpine.store('i18n').t('previous')}
                </button>`;
            }

            const startPage = Math.max(1, this.paginationMeta.current_page - 2);
            const endPage = Math.min(this.paginationMeta.last_page, startPage + 4);

            for (let i = startPage; i <= endPage; i++) {
                paginationHTML += `<button class="pagination-btn btn btn-sm ${i === this.paginationMeta.current_page ? 'btn-primary bg-blue-600 text-white' : 'btn-outline-primary border border-blue-600 text-blue-600'} rounded-md px-3 py-1 hover:bg-blue-100" data-page="${i}">
                    ${i}
                </button>`;
            }

            if (this.paginationMeta.current_page < this.paginationMeta.last_page) {
                paginationHTML += `<button class="pagination-btn btn btn-sm btn-outline-primary rounded-md px-3 py-1 hover:bg-blue-100" data-page="${this.paginationMeta.current_page + 1}">
                    ${Alpine.store('i18n').t('next')}
                </button>`;
            }

            paginationHTML += '</nav></div>';
            return paginationHTML;
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        getActionButtons(subscriberId) {
            return `
                <div class="flex items-center gap-1 justify-center">
                    <button class="btn delete-subscriber-btn btn-danger btn-sm rounded-md px-3 py-1" data-id="${subscriberId}">
                        ${Alpine.store('i18n').t('delete')}
                    </button>
                </div>`;
        },

        async deleteSubscriber(subscriberId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('delete_subscriber_warning'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_delete'),
                });

                if (!isConfirmed.isConfirmed) return;

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/subscribers/delete/${subscriberId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_delete_subscriber'));
                }

                coloredToast('success', Alpine.store('i18n').t('subscriber_deleted_success'));
                await this.fetchSubscribers(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_subscriber'));
            }
        }
    }));
});
