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
            const myTable1Container = document.getElementById('myTable1Container');
            const tableEmptyState = document.getElementById('tableEmptyState');
            if (tableLoading) tableLoading.classList.remove('hidden');
            if (myTable1Container) myTable1Container.style.display = 'none';
            if (tableEmptyState) tableEmptyState.classList.add('hidden');
        },
        hideTableLoader: function () {
            const tableLoading = document.getElementById('tableLoading');
            const myTable1Container = document.getElementById('myTable1Container');
            if (tableLoading) tableLoading.classList.add('hidden');
            if (myTable1Container) myTable1Container.style.display = 'block';
        },
        showEmptyState: function () {
            const tableEmptyState = document.getElementById('tableEmptyState');
            const myTable1Container = document.getElementById('myTable1Container');
            const tableLoading = document.getElementById('tableLoading');
            if (tableEmptyState) tableEmptyState.classList.remove('hidden');
            if (myTable1Container) myTable1Container.style.display = 'none';
            if (tableLoading) tableLoading.classList.add('hidden');
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

    // Cookies Policy Table
    Alpine.data('cookiesPolicyTable', () => ({
        tableData: [],
        datatable1: null,
        _initialized: false,

        async init() {
            if (this._initialized) return;
            this._initialized = true;

            await this.fetchCookiesPolicy();

            // Event Delegation for Delete and Update Buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn')) {
                    const id = e.target.closest('.delete-btn').dataset.id;
                    this.deleteCookiesPolicy(id);
                }
                if (e.target.closest('.update-btn')) {
                    const id = e.target.closest('.update-btn').dataset.id;
                    this.openUpdateModal(id);
                }
            });
        },

        async fetchCookiesPolicy() {
            try {
                loadingIndicator.showTableLoader();
                const response = await ApiService.getCookiesPolicy();
                
                // Handle different response structures
                let data = null;
                if (response.success) {
                    data = response.data;
                } else if (Array.isArray(response)) {
                    data = response;
                } else if (response.data) {
                    data = Array.isArray(response.data) ? response.data : (response.data.data || []);
                }
                
                if (data && Array.isArray(data) && data.length > 0) {
                    this.tableData = data;
                    this.populateTable();
                } else {
                    this.tableData = [];
                    loadingIndicator.showEmptyState();
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_load_cookies_policy'));
                loadingIndicator.showEmptyState();
            } finally {
                loadingIndicator.hideTableLoader();
            }
        },

        populateTable() {
            if (this.datatable1) {
                this.datatable1.destroy();
            }

            if (this.tableData.length === 0) {
                loadingIndicator.showEmptyState();
                return;
            }

            const mappedData = this.tableData.map((item, index) => {
                const statusBadge = item.is_active == 1 
                    ? `<span class="badge bg-success">${Alpine.store('i18n').t('active')}</span>`
                    : `<span class="badge bg-gray-500">${Alpine.store('i18n').t('inactive')}</span>`;

                // Format points for display - professional badges style
                let pointsDisplay = '<span class="text-gray-400">-</span>';
                if (item.points && Array.isArray(item.points) && item.points.length > 0) {
                    const pointsHtml = item.points.slice(0, 3).map(p => {
                        const title = p.title || 'N/A';
                        const shortTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
                        return `<span class="badge bg-primary/10 text-primary border border-primary/20 px-2 py-1 text-xs mr-1 mb-1 inline-block">${shortTitle}</span>`;
                    }).join('');
                    const moreCount = item.points.length > 3 ? `<span class="badge bg-gray-100 text-gray-600 border border-gray-200 px-2 py-1 text-xs">+${item.points.length - 3}</span>` : '';
                    pointsDisplay = pointsHtml + moreCount;
                }

                return [
                    index + 1,
                    item.title || 'N/A',
                    item.content ? (item.content.length > 50 ? item.content.substring(0, 50) + '...' : item.content) : 'N/A',
                    item.order || 'N/A',
                    item.points ? item.points.length : 0,
                    pointsDisplay,
                    statusBadge,
                    this.getActionButtons(item.id)
                ];
            });

            this.datatable1 = new simpleDatatables.DataTable('#myTable1', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('title'),
                        Alpine.store('i18n').t('content'),
                        Alpine.store('i18n').t('order'),
                        Alpine.store('i18n').t('points_count'),
                        Alpine.store('i18n').t('points'),
                        Alpine.store('i18n').t('status'),
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
                    bottom: '{info}{pager}',
                },
            });
        },

        getActionButtons(id) {
            return `
                <div class="flex items-center justify-center gap-2">
                    <button class="btn btn-sm btn-primary update-btn rounded-md px-3 py-1" data-id="${id}">
                        ${Alpine.store('i18n').t('edit')}
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn rounded-md px-3 py-1" data-id="${id}">
                        ${Alpine.store('i18n').t('delete')}
                    </button>
                </div>`;
        },

        async deleteCookiesPolicy(id) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('delete_cookies_policy_warning') || 'This action cannot be undone.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                });

                if (!isConfirmed.isConfirmed) return;

                loadingIndicator.show();
                await ApiService.deleteCookiesPolicy(id);
                coloredToast('success', Alpine.store('i18n').t('cookies_policy_deleted_success') || 'Cookies Policy deleted successfully');
                await this.fetchCookiesPolicy();
                loadingIndicator.hide();
            } catch (error) {
                loadingIndicator.hide();
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_delete_cookies_policy'));
            }
        },


        openUpdateModal(id) {
            // Convert id to number if it's a string
            const numericId = typeof id === 'string' ? parseInt(id) : id;
            const item = this.tableData.find(t => String(t.id) === String(numericId) || String(t.id) === String(id));
            
            if (!item || !item.id) {
                coloredToast('danger', Alpine.store('i18n').t('cookies_policy_not_found'));
                return;
            }

            // Find modal element - try multiple selectors
            let modalElement = document.querySelector('[x-data*="updateCookiesPolicyModal"]');
            
            // If not found, try to find by data attribute or class
            if (!modalElement) {
                modalElement = document.querySelector('[x-data="updateCookiesPolicyModal"]');
            }
            
            // If still not found, try to initialize Alpine on modals container
            if (!modalElement) {
                const modalsContainer = document.getElementById('cookies-policy-modals-container');
                if (modalsContainer && typeof Alpine !== 'undefined') {
                    Alpine.initTree(modalsContainer);
                    // Wait a bit for Alpine to initialize
                    setTimeout(() => {
                        modalElement = document.querySelector('[x-data*="updateCookiesPolicyModal"]') || 
                                      document.querySelector('[x-data="updateCookiesPolicyModal"]');
                        if (modalElement) {
                            const modal = Alpine.$data(modalElement);
                            if (modal && typeof modal.openModal === 'function') {
                                modal.openModal(item);
                            }
                        }
                    }, 200);
                    return;
                }
            }
            
            // If modal element found, try to get Alpine data
            if (modalElement) {
                try {
                    const modal = Alpine.$data(modalElement);
                    if (modal && typeof modal.openModal === 'function') {
                        modal.openModal(item);
                    } else {
                        // Modal element exists but Alpine not initialized, try to initialize
                        if (typeof Alpine !== 'undefined') {
                            Alpine.initTree(modalElement);
                            setTimeout(() => {
                                const modal = Alpine.$data(modalElement);
                                if (modal && typeof modal.openModal === 'function') {
                                    modal.openModal(item);
                                }
                            }, 100);
                        }
                    }
                } catch (error) {
                    // Try to initialize Alpine
                    if (typeof Alpine !== 'undefined') {
                        Alpine.initTree(modalElement);
                        setTimeout(() => {
                            try {
                                const modal = Alpine.$data(modalElement);
                                if (modal && typeof modal.openModal === 'function') {
                                    modal.openModal(item);
                                }
                            } catch (e) {
                                // Silently handle error
                            }
                        }, 100);
                    }
                }
            } else {
                coloredToast('danger', 'Modal not found. Please refresh the page.');
            }
        }
    }));

    // Create Form
    Alpine.data('createCookiesPolicyForm', () => ({
        isSubmitting: false,
        formData: {
            title: '',
            content: '',
            order: '',
            points: [{ title: '' }]
        },

        resetForm() {
            this.formData = {
                title: '',
                content: '',
                order: '',
                points: [{ title: '' }]
            };
        },

        addPoint() {
            this.formData.points.push({ title: '' });
        },

        removePoint(index) {
            if (this.formData.points.length > 1) {
                this.formData.points.splice(index, 1);
            }
        },

        async submitCreate() {
            try {
                this.isSubmitting = true;
                loadingIndicator.show();

                // Filter out empty points
                const points = this.formData.points.filter(p => p.title && p.title.trim());

                const data = {
                    title: this.formData.title,
                    content: this.formData.content,
                    order: this.formData.order || null,
                    points: points
                };

                const response = await ApiService.createCookiesPolicy(data);

                // Check if response is successful (either response.success or response.data exists)
                if (response && (response.success || response.data || response.status === 'success')) {
                    coloredToast('success', Alpine.store('i18n').t('cookies_policy_created_success') || 'Cookies Policy created successfully');
                    this.resetForm();
                    
                    // Refresh table
                    const table = Alpine.$data(document.querySelector('[x-data="cookiesPolicyTable"]'));
                    if (table) {
                        await table.fetchCookiesPolicy();
                    }
                } else {
                    throw new Error(response?.message || Alpine.store('i18n').t('failed_to_create_cookies_policy'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_create_cookies_policy'));
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    }));

    // Update Modal
    Alpine.data('updateCookiesPolicyModal', () => ({
        isOpen: false,
        isSubmitting: false,
        currentId: null,
        originalPoints: [],
        formData: {
            title: '',
            content: '',
            order: '',
            is_active: '1',
            points: [{ title: '' }]
        },

        openModal(item) {
            if (!item || !item.id) {
                coloredToast('danger', Alpine.store('i18n').t('cookies_policy_not_found'));
                return;
            }
            
            this.currentId = item.id;
            
            // Ensure points is always an array with at least one item
            let points = [];
            if (item.points && Array.isArray(item.points) && item.points.length > 0) {
                points = item.points.map(p => ({ 
                    title: (p.title && typeof p.title === 'string') ? p.title : '' 
                }));
            }
            
            // Always ensure at least one point exists
            if (points.length === 0) {
                points = [{ title: '' }];
            }
            
            // Save original points to restore on cancel
            this.originalPoints = JSON.parse(JSON.stringify(points));
            
            this.formData = {
                title: item.title || '',
                content: item.content || '',
                order: item.order || '',
                is_active: item.is_active == 1 ? '1' : '0',
                points: JSON.parse(JSON.stringify(points)) // Deep copy to ensure reactivity
            };
            this.isOpen = true;
        },

        closeModal() {
            // Restore original points when closing
            if (this.originalPoints.length > 0) {
                this.formData.points = JSON.parse(JSON.stringify(this.originalPoints));
            }
            this.isOpen = false;
            this.currentId = null;
            this.originalPoints = [];
            this.resetForm();
        },

        resetForm() {
            this.formData = {
                title: '',
                content: '',
                order: '',
                is_active: '1',
                points: [{ title: '' }]
            };
            this.originalPoints = [];
        },

        addPoint() {
            if (!this.formData.points) {
                this.formData.points = [];
            }
            // Create a new array to trigger Alpine reactivity
            this.formData.points = [...this.formData.points, { title: '' }];
        },

        removePoint(index) {
            if (!this.formData.points || this.formData.points.length <= 1) {
                return;
            }
            // Create a new array to trigger Alpine reactivity
            this.formData.points = this.formData.points.filter((_, i) => i !== index);
        },

        async submitUpdate() {
            try {
                if (!this.currentId) {
                    coloredToast('danger', Alpine.store('i18n').t('cookies_policy_not_found'));
                    return;
                }
                
                this.isSubmitting = true;
                loadingIndicator.show();

                // Filter out empty points - ensure points array exists and has valid data
                const points = (this.formData.points || [])
                    .filter(p => p && p.title && typeof p.title === 'string' && p.title.trim().length > 0)
                    .map(p => ({ title: p.title.trim() }));

                const data = {
                    title: this.formData.title,
                    content: this.formData.content,
                    order: this.formData.order || null,
                    is_active: this.formData.is_active,
                    points: points
                };

                const response = await ApiService.updateCookiesPolicy(this.currentId, data);

                // Check if response is successful (either response.success or response.data exists)
                if (response && (response.success || response.data || response.status === 'success' || response.status === 200 || (response.status >= 200 && response.status < 300))) {
                    coloredToast('danger', Alpine.store('i18n').t('cookies_policy_updated_success') || 'Cookies Policy updated successfully');
                    this.closeModal();
                    
                    // Wait a bit before refreshing to ensure modal is closed
                    setTimeout(async () => {
                        // Refresh table
                        const tableElement = document.querySelector('[x-data="cookiesPolicyTable"]');
                        if (tableElement) {
                            const table = Alpine.$data(tableElement);
                            if (table && typeof table.fetchCookiesPolicy === 'function') {
                                await table.fetchCookiesPolicy();
                            }
                        }
                    }, 300);
                } else {
                    throw new Error(response?.message || Alpine.store('i18n').t('failed_to_update_cookies_policy'));
                }
            } catch (error) {
                coloredToast('danger', error.message || Alpine.store('i18n').t('failed_to_update_cookies_policy'));
            } finally {
                this.isSubmitting = false;
                loadingIndicator.hide();
            }
        }
    }));
});

