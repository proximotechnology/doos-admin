document.addEventListener('alpine:init', () => {
    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator')?.classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator')?.classList.add('hidden');
        },
        showTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const usersTableContainer = document.getElementById('usersTableContainer');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (usersTableContainer) usersTableContainer.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const usersTableContainer = document.getElementById('usersTableContainer');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (usersTableContainer) usersTableContainer.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const usersTableContainer = document.getElementById('usersTableContainer');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (usersTableContainer) usersTableContainer.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
        }
    };

    function coloredToast(color, message) {
        const iconMap = {
            'success': 'success',
            'warning': 'warning',
            'danger': 'error',
            'error': 'error',
            'info': 'info'
        };
        
        const toast = window.Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            icon: iconMap[color] || 'info',
            customClass: { 
                popup: `color-${color} swal2-toast`
            },
            didOpen: (popup) => {
                // Force consistent sizing for all toast types - use !important to override SweetAlert defaults
                popup.style.setProperty('width', 'auto', 'important');
                popup.style.setProperty('max-width', '350px', 'important');
                popup.style.setProperty('min-width', '300px', 'important');
                popup.style.setProperty('font-size', '14px', 'important');
                popup.style.setProperty('padding', '0.75rem 1rem', 'important');
                popup.style.setProperty('line-height', '1.5', 'important');
                popup.style.setProperty('box-sizing', 'border-box', 'important');
                
                // Fix icon size if exists - make it much smaller and consistent
                const iconElement = popup.querySelector('.swal2-icon');
                if (iconElement) {
                    iconElement.style.setProperty('width', '1.2em', 'important');
                    iconElement.style.setProperty('height', '1.2em', 'important');
                    iconElement.style.setProperty('min-width', '1.2em', 'important');
                    iconElement.style.setProperty('min-height', '1.2em', 'important');
                    iconElement.style.setProperty('max-width', '1.2em', 'important');
                    iconElement.style.setProperty('max-height', '1.2em', 'important');
                    iconElement.style.setProperty('margin', '0 0.5em 0 0', 'important');
                    iconElement.style.setProperty('flex-shrink', '0', 'important');
                    iconElement.style.setProperty('font-size', '0.875em', 'important');
                    iconElement.style.setProperty('line-height', '1.2em', 'important');
                    
                    // Fix icon content size - make SVG much smaller
                    const iconContent = iconElement.querySelector('svg');
                    if (iconContent) {
                        iconContent.style.setProperty('width', '0.875em', 'important');
                        iconContent.style.setProperty('height', '0.875em', 'important');
                        iconContent.style.setProperty('max-width', '0.875em', 'important');
                        iconContent.style.setProperty('max-height', '0.875em', 'important');
                    }
                    
                    // Fix icon text/characters if exists (for warning icon with !)
                    const iconText = iconElement.querySelector('.swal2-icon-content');
                    if (iconText) {
                        iconText.style.setProperty('font-size', '0.875em', 'important');
                        iconText.style.setProperty('line-height', '1', 'important');
                        iconText.style.setProperty('width', '0.875em', 'important');
                        iconText.style.setProperty('height', '0.875em', 'important');
                    }
                    
                    // Fix warning ring if exists
                    const warningRing = iconElement.querySelector('.swal2-warning-ring');
                    if (warningRing) {
                        warningRing.style.setProperty('width', '1.2em', 'important');
                        warningRing.style.setProperty('height', '1.2em', 'important');
                    }
                }
                
                // Fix title size - make it consistent
                const titleElement = popup.querySelector('.swal2-title');
                if (titleElement) {
                    titleElement.style.setProperty('font-size', '14px', 'important');
                    titleElement.style.setProperty('padding', '0', 'important');
                    titleElement.style.setProperty('margin', '0', 'important');
                    titleElement.style.setProperty('line-height', '1.5', 'important');
                    titleElement.style.setProperty('font-weight', '500', 'important');
                }
                
                // Fix html container if exists
                const htmlContainer = popup.querySelector('.swal2-html-container');
                if (htmlContainer) {
                    htmlContainer.style.setProperty('font-size', '14px', 'important');
                    htmlContainer.style.setProperty('padding', '0', 'important');
                    htmlContainer.style.setProperty('margin', '0', 'important');
                }
                
                // Ensure flex layout is consistent
                if (popup.style.display !== 'flex') {
                    popup.style.setProperty('display', 'flex', 'important');
                    popup.style.setProperty('align-items', 'center', 'important');
                }
            }
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

    // Make functions globally accessible
    window.showUserDetails = (userId) => {
        const component = document.querySelector('[x-data="usersTable"]')?._x_dataStack?.[0];
        if (component) {
            component.showUserDetails(userId);
        }
    };

    // Make toggleBlock function globally accessible
    window.toggleUserBlock = async function(userId) {
        try {
            // Wait a bit for Alpine to be ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Try to get Alpine component
            const element = document.querySelector('[x-data="usersTable"]');
            if (element && typeof Alpine !== 'undefined') {
                const tableComponent = Alpine.$data(element);
                if (tableComponent && typeof tableComponent.toggleBlock === 'function') {
                    await tableComponent.toggleBlock(userId);
                    return;
                }
            }
            
            // Fallback: direct API call and refresh
            if (typeof ApiService !== 'undefined') {
                const response = await ApiService.toggleUserBlock(userId);
                if (response.status) {
                    const isBlocked = response.is_blocked === true || response.is_blocked === 1 || response.is_blocked === '1';
                    const message = response.message || (isBlocked 
                        ? (Alpine.store('i18n')?.t('user_blocked_success') || 'User blocked successfully')
                        : (Alpine.store('i18n')?.t('user_unblocked_success') || 'User unblocked successfully'));
                    
                    if (isBlocked) {
                        coloredToast('warning', message);
                    } else {
                        coloredToast('success', message);
                    }
                    
                    // Refresh table via store
                    const store = Alpine.store('usersTable');
                    if (store && typeof store.refreshTable === 'function') {
                        await store.refreshTable();
                    } else {
                        // Force page reload as last resort
                        window.location.reload();
                    }
                }
            }
        } catch (error) {
            console.error('Error in toggleUserBlock:', error);
            coloredToast('danger', error.message || 'Failed to toggle block status');
        }
    };

    Alpine.data('usersTable', () => ({
        users: [],
        paginationMeta: {},
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        _initialized: false,
        showUserDetailsModal: false,
        selectedUser: null,
        isLoadingUserDetails: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

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

                const data = await ApiService.getUsers(page);
                
                // Handle different response structures
                let usersData = null;
                let paginationData = null;
                
                if (data && data.data) {
                    // Standard Laravel pagination structure
                    usersData = data.data.data || data.data;
                    paginationData = data.data;
                } else if (data && Array.isArray(data)) {
                    // Direct array response
                    usersData = data;
                } else if (data) {
                    // Try to find data in response
                    usersData = data.data || data.users || [];
                    paginationData = data;
                }
                
                if (usersData && Array.isArray(usersData)) {
                    this.users = usersData.filter(user => user.type === '0') || [];
                    
                    if (paginationData) {
                        this.paginationMeta = {
                            current_page: paginationData.current_page || page,
                            last_page: paginationData.last_page || 1,
                            per_page: paginationData.per_page || 10,
                            total: paginationData.total || this.users.length,
                            from: paginationData.from || 1,
                            to: paginationData.to || this.users.length,
                            links: paginationData.links || []
                        };
                    } else {
                        // Default pagination if not provided
                        this.paginationMeta = {
                            current_page: page,
                            last_page: 1,
                            per_page: 10,
                            total: this.users.length,
                            from: 1,
                            to: this.users.length,
                            links: []
                        };
                    }

                    if (this.users.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data?.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_fetch_users_try_again'));
            }
        },

        populateTable() {
            // Destroy existing datatable if it exists
            if (this.datatable) {
                try {
                    this.datatable.destroy();
                } catch (e) {
                    console.warn('Error destroying datatable:', e);
                }
                this.datatable = null;
            }

            // Clear table content
            const tableElement = document.getElementById('myTable1');
            if (!tableElement) {
                console.error('Table element not found');
                loadingIndicator.showEmptyState();
                return;
            }
            
            // Clear table completely
            tableElement.innerHTML = '';

            const mappedData = this.users.map((user, index) => [
                this.formatText((this.currentPage - 1) * this.paginationMeta.per_page + index + 1),
                this.formatText(user.name),
                this.formatText(user.email),
                this.formatText(user.phone),
                this.formatText(user.country),
                this.formatDate(user.created_at),
                this.formatActions(user.id, user.is_blocked),
            ]);

            this.datatable = new simpleDatatables.DataTable(tableElement, {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('name'),
                        Alpine.store('i18n').t('email'),
                        Alpine.store('i18n').t('phone'),
                        Alpine.store('i18n').t('country'),
                        Alpine.store('i18n').t('registration_date'),
                        Alpine.store('i18n').t('actions'),
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

        formatBlocked(isBlocked) {
            const blocked = isBlocked === true || isBlocked === 1 || isBlocked === '1';
            return `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                blocked 
                    ? 'bg-danger/20 text-danger border border-danger/30' 
                    : 'bg-success/20 text-success border border-success/30'
            }">
                ${blocked ? Alpine.store('i18n').t('blocked') : Alpine.store('i18n').t('active')}
            </span>`;
        },

        formatActions(userId, isBlocked) {
            const blocked = isBlocked === true || isBlocked === 1 || isBlocked === '1';
            const buttonClass = blocked 
                ? 'btn btn-sm btn-outline-success' 
                : 'btn btn-sm btn-outline-danger';
            const buttonTitle = blocked 
                ? Alpine.store('i18n').t('unblock') 
                : Alpine.store('i18n').t('block');
            const icon = blocked 
                ? '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>'
                : '<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>';
            
            return `
                <div class="flex items-center gap-2">
                    <button 
                        onclick="window.showUserDetails(${userId})" 
                        class="btn btn-sm btn-outline-info"
                        title="${Alpine.store('i18n').t('view_details') || 'View Details'}"
                    >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <button 
                        onclick="window.toggleUserBlock(${userId})" 
                        class="${buttonClass}"
                        title="${buttonTitle}"
                    >
                        ${icon}
                    </button>
                </div>
            `;
        },

        async showUserDetails(userId) {
            this.isLoadingUserDetails = true;
            this.showUserDetailsModal = true;
            this.selectedUser = null;
            
            try {
                const response = await ApiService.getUserDetails(userId);
                
                if (response && response.status && response.data) {
                    // Find the user in the data array
                    let userData = null;
                    if (response.data.data && Array.isArray(response.data.data)) {
                        userData = response.data.data.find(u => u.id === userId);
                    } else if (Array.isArray(response.data)) {
                        userData = response.data.find(u => u.id === userId);
                    }
                    
                    if (userData) {
                        this.selectedUser = userData;
                    } else {
                        coloredToast('danger', Alpine.store('i18n').t('user_not_found') || 'User not found');
                        this.showUserDetailsModal = false;
                    }
                } else {
                    coloredToast('danger', Alpine.store('i18n').t('failed_to_load_user_details') || 'Failed to load user details');
                    this.showUserDetailsModal = false;
                }
            } catch (error) {
                console.error('Error fetching user details:', error);
                coloredToast('danger', Alpine.store('i18n').t('error_loading_user_details') || 'Error loading user details');
                this.showUserDetailsModal = false;
            } finally {
                this.isLoadingUserDetails = false;
            }
        },

        closeUserDetailsModal() {
            this.showUserDetailsModal = false;
            this.selectedUser = null;
        },

        getParsedAddress(addressData) {
            if (!addressData) return {};
            try {
                return JSON.parse(addressData);
            } catch (e) {
                console.error('Error parsing address data:', e);
                return {};
            }
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

                await ApiService.deleteUser(userId);

                coloredToast('success', Alpine.store('i18n').t('user_deleted_success'));
                await this.fetchUsers(this.currentPage);
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_delete_user'));
            }
        },

        async toggleBlock(userId) {
            try {
                loadingIndicator.show();
                const response = await ApiService.toggleUserBlock(userId);
                
                // Check if response is successful (has is_blocked property or message)
                if (response && (response.is_blocked !== undefined || response.message)) {
                    const isBlocked = response.is_blocked === true || response.is_blocked === 1 || response.is_blocked === '1';
                    const message = response.message || (isBlocked 
                        ? Alpine.store('i18n').t('user_blocked_success') 
                        : Alpine.store('i18n').t('user_unblocked_success'));
                    
                    // Show success toast for unblock (green), warning for block (orange/yellow)
                    if (isBlocked) {
                        coloredToast('warning', message);
                    } else {
                        coloredToast('success', message);
                    }
                    
                    // Force refresh the table data - destroy and rebuild
                    this.currentPage = this.currentPage || 1;
                    // Small delay to ensure API has updated
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await this.fetchUsers(this.currentPage);
                } else {
                    throw new Error(response?.message || Alpine.store('i18n').t('failed_to_toggle_block'));
                }
            } catch (error) {
                console.error('Error toggling block:', error);
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_toggle_block'));
            } finally {
                loadingIndicator.hide();
            }
        }
    }));
});
