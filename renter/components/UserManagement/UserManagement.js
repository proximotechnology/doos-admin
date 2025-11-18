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

    Alpine.store('global', {
        sharedData: {
            name: '',
            role: ''
        }
    });




    Alpine.store('usersTable', {
        refreshTable: async function () {
            const tableComponent = Alpine.$data(document.querySelector('[x-data="usersTable"]'));
            if (tableComponent && tableComponent.fetchUsers) {
                await tableComponent.fetchUsers(tableComponent.currentPage);
            }
        }
    });

    Alpine.data('usersTable', () => ({
        users: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,

        async init() {
            document.addEventListener('click', (e) => {
                if (e.target.closest('.pagination-btn')) {
                    const page = e.target.closest('.pagination-btn').dataset.page;
                    this.fetchUsers(page);
                }

            });

            await this.fetchUsers(1);
        },

        async fetchUsers(page = 1) {
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
                const response = await fetch(`${this.apiBaseUrl}/api/admin/user/get_all?${queryParams.toString()}`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_users'));
                }

                const data = await response.json();
                if (data.status && data.data) {
                    this.users = data.data.data.filter(user => user.type === '0') || [];
                    this.paginationMeta = {
                        current_page: data.data.current_page,
                        last_page: data.data.last_page,
                        per_page: data.data.per_page,
                        total: data.data.total,
                        from: data.data.from,
                        to: data.data.to,
                        links: data.data.links
                    };

                    if (this.users.length === 0) {
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
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_users_try_again'));
            }
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.users.map((user, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(user.name),
                this.formatText(user.email),
                this.formatText(user.phone),
                this.formatText(user.country),
                this.formatVerified(user.email_verified_at),
                this.formatLicense(user.has_license),
                this.formatDate(user.created_at),
            ]);

            this.datatable = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('email'),
                        Alpine.store('i18n').t('phone'),
                        Alpine.store('i18n').t('country'),
                        Alpine.store('i18n').t('email_verified'),
                        Alpine.store('i18n').t('has_license'),
                        Alpine.store('i18n').t('registration_date'),
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

        formatVerified(emailVerifiedAt) {
            return `<span class="${emailVerifiedAt ? 'text-success' : 'text-danger'}">
                ${emailVerifiedAt ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
            </span>`;
        },

        formatLicense(hasLicense) {
            return `<span class="${hasLicense === '1' ? 'text-success' : 'text-danger'}">
                ${hasLicense === '1' ? Alpine.store('i18n').t('yes') : Alpine.store('i18n').t('no')}
            </span>`;
        },


        async deleteUser(userId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('delete_warning'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_delete'),
                });

                if (!isConfirmed.isConfirmed) return;

                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/admin/user/delete/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_delete_user'));
                }

                coloredToast('success', Alpine.store('i18n').t('user_deleted_success'));
                await this.fetchUsers(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_user'));
            }
        }
    }));
});
