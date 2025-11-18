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
            document.getElementById('policiesTable')?.classList.add('hidden');
            document.getElementById('tableEmptyState')?.classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading')?.classList.add('hidden');
            document.getElementById('policiesTable')?.classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState')?.classList.remove('hidden');
            document.getElementById('policiesTable')?.classList.add('hidden');
            document.getElementById('tableLoading')?.classList.add('hidden');
        }
    };

    Alpine.data('contractPolicies', () => ({
        allTableData: [], // Store all data fetched from backend
        tableData: [], // Store current page data
        paginationMeta: {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
            from: 0,
            to: 0,
            links: []
        },
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        form: {
            item: ''
        },

        async initComponent() {
            await this.fetchPolicies();
            
            if (!this._listenersAttached) {
                document.addEventListener('click', (e) => {
                    if (e.target.closest('.edit-policy-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const btn = e.target.closest('.edit-policy-btn');
                        const policyId = btn.dataset.id;
                        console.log('Edit policy clicked, policyId:', policyId);
                        if (policyId) {
                            this.editPolicy(policyId);
                        }
                    }
                    if (e.target.closest('.delete-policy-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const btn = e.target.closest('.delete-policy-btn');
                        const policyId = btn.dataset.id;
                        console.log('Delete policy clicked, policyId:', policyId);
                        if (policyId) {
                            this.deletePolicy(policyId);
                        }
                    }
                    if (e.target.closest('.pagination-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        const page = e.target.closest('.pagination-btn').dataset.page;
                        this.setPage(page);
                    }
                });
                this._listenersAttached = true;
            }
        },

        async fetchPolicies() {
            try {
                loadingIndicator.showTableLoader();
                this.currentPage = 1;

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError(Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/contract_polices/get_all`, {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(Alpine.store('i18n').t('failed_fetch_policies'));
                }

                const data = await response.json();
                if (data.status === 'success' && Array.isArray(data.data)) {
                    this.allTableData = data.data;
                    this.paginationMeta.total = this.allTableData.length;
                    this.paginationMeta.last_page = Math.ceil(this.allTableData.length / this.paginationMeta.per_page);
                    this.setPage(1);
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        setPage(page) {
            this.currentPage = parseInt(page);
            const start = (this.currentPage - 1) * this.paginationMeta.per_page;
            const end = start + this.paginationMeta.per_page;
            this.tableData = this.allTableData.slice(start, end);
            this.paginationMeta.from = start + 1;
            this.paginationMeta.to = Math.min(end, this.allTableData.length);

            if (this.tableData.length === 0) {
                loadingIndicator.showEmptyState();
            } else {
                this.populateTable();
                loadingIndicator.hideTableLoader();
            }
        },

        generatePaginationHTML() {
            if (this.paginationMeta.last_page <= 1) return '';

            let paginationHTML = '<div class="pagination-container flex justify-center my-4">';
            paginationHTML += '<nav class="flex items-center space-x-2 rtl:space-x-reverse">';

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

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((policy, index) => [
                `<span class="text-sm font-medium text-gray-900 dark:text-white">${(this.currentPage - 1) * this.paginationMeta.per_page + index + 1}</span>`,
                this.formatText(policy.item),
                this.formatDate(policy.created_at),
                this.getActionButtons(policy.id),
            ]);

            this.datatable = new simpleDatatables.DataTable('#policiesTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('policy_item'),
                        Alpine.store('i18n').t('created_at'),
                        `<div class="text-center">${Alpine.store('i18n').t('action')}</div>`
                    ],
                    data: mappedData,
                },
                searchable: true,
                perPage: 10,
                perPageSelect: [10, 20, 30, 50, 100],
                columns: [{ select: 0, sort: 'asc' }],
                firstLast: true,
                firstText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>',
                lastText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>',
                prevText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>',
                nextText: '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>',
                labels: { perPage: '{select}' },
                layout: {
                    top: '{search}',
                    bottom: this.generatePaginationHTML() + '{info}{select}{pager}',
                },
            });
        },

        async submitPolicyForm() {
            try {
                if (!this.form.item.trim()) {
                    throw new Error(Alpine.store('i18n').t('policy_item_required'));
                }

                loadingIndicator.show();
                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error(Alpine.store('i18n').t('auth_token_missing'));
                }

                const response = await fetch(`${this.apiBaseUrl}/api/admin/contract_polices/store`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ item: this.form.item })
                });

                const result = await response.json();
                if (response.ok && result.status === 'success') {
                    coloredToast('success', Alpine.store('i18n').t('policy_added_successfully'));
                    this.resetForm();
                    await this.fetchPolicies();
                } else {
                    throw new Error(result.message || Alpine.store('i18n').t('failed_to_add_policy'));
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async editPolicy(policyId) {
            try {
                const policy = this.allTableData.find(p => p.id == policyId);
                if (!policy) {
                    throw new Error(Alpine.store('i18n').t('policy_not_found'));
                }

                const { value: item } = await Swal.fire({
                    title: Alpine.store('i18n').t('edit_policy'),
                    html: `
                        <div class="text-right">
                            <label class="block mb-2 text-sm font-medium">${Alpine.store('i18n').t('policy_item')}</label>
                            <textarea id="policyItem" class="swal2-textarea w-full p-2 border rounded" rows="5" placeholder="${Alpine.store('i18n').t('enter_policy_text')}">${policy.item}</textarea>
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('save'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                    customClass: {
                        htmlContainer: 'text-right'
                    },
                    preConfirm: () => {
                        const input = document.getElementById('policyItem');
                        if (!input.value.trim()) {
                            Swal.showValidationMessage(Alpine.store('i18n').t('policy_item_required'));
                            return false;
                        }
                        return input.value.trim();
                    }
                });

                if (item) {
                    loadingIndicator.show();
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/contract_polices/update/${policyId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ item })
                    });

                    const result = await response.json();
                    if (response.ok && result.status === 'success') {
                        coloredToast('success', Alpine.store('i18n').t('policy_updated_successfully'));
                        await this.fetchPolicies();
                    } else {
                        throw new Error(result.message || Alpine.store('i18n').t('failed_to_update_policy'));
                    }
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        async deletePolicy(policyId) {
            try {
                const policy = this.allTableData.find(p => p.id == policyId);
                const policyText = policy ? (policy.item.length > 50 ? policy.item.substring(0, 50) + '...' : policy.item) : '';
                
                const result = await Swal.fire({
                    title: Alpine.store('i18n').t('confirm_delete'),
                    html: `
                        <div class="text-center">
                            <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <svg class="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <p class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">${Alpine.store('i18n').t('are_you_sure')}</p>
                            ${policyText ? `<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">"${policyText.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</p>` : ''}
                            <p class="text-sm text-red-600 dark:text-red-400">${Alpine.store('i18n').t('this_action_cannot_be_undone') || 'This action cannot be undone.'}</p>
                        </div>
                    `,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    reverseButtons: true
                });

                if (result.isConfirmed) {
                    loadingIndicator.show();
                    const token = localStorage.getItem('authToken');
                    const response = await fetch(`${this.apiBaseUrl}/api/admin/contract_polices/destroy/${policyId}`, {
                        method: 'DELETE',
                        headers: {
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        }
                    });

                    const data = await response.json();
                    if (response.ok && data.status === 'success') {
                        coloredToast('success', Alpine.store('i18n').t('policy_deleted_successfully'));
                        await this.fetchPolicies();
                    } else {
                        throw new Error(data.message || Alpine.store('i18n').t('failed_to_delete_policy'));
                    }
                }
            } catch (error) {
                coloredToast('danger', error.message);
            } finally {
                loadingIndicator.hide();
            }
        },

        formatDate(dateString) {
            if (!dateString) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            const date = new Date(dateString).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
            return `<span class="text-sm font-normal text-gray-900 dark:text-white">${date}</span>`;
        },

        formatText(text) {
            if (!text) return `<span class="text-sm text-gray-500 dark:text-gray-400">${Alpine.store('i18n').t('na')}</span>`;
            // Truncate long text
            const maxLength = 100;
            const truncated = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
            return `<span class="text-sm font-normal text-gray-900 dark:text-white" title="${text.replace(/"/g, '&quot;')}">${truncated.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`;
        },

        getActionButtons(policyId) {
            return `
                <div class="flex items-center gap-1">
                    <button class="edit-policy-btn table-action-btn btn btn-warning btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" data-id="${policyId}" title="${Alpine.store('i18n').t('edit')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('edit')}</span>
                    </button>
                    <button class="delete-policy-btn table-action-btn btn btn-danger btn-sm flex items-center gap-1.5 rounded-md px-3 py-1.5 hover:opacity-90" data-id="${policyId}" title="${Alpine.store('i18n').t('delete')}">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span class="text-xs">${Alpine.store('i18n').t('delete')}</span>
                    </button>
                </div>`;
        },

        resetForm() {
            this.form.item = '';
        },

        showError(message) {
            Swal.fire({
                icon: 'error',
                title: Alpine.store('i18n').t('error'),
                text: message,
                confirmButtonText: Alpine.store('i18n').t('ok'),
                customClass: {
                    htmlContainer: 'text-right'
                }
            });
        }
    }));

    function coloredToast(color, message) {
        const toast = Swal.mixin({
            toast: true,
            position: 'bottom-start',
            showConfirmButton: false,
            timer: 3000,
            showCloseButton: true,
            customClass: { popup: `color-${color}` },
        });
        toast.fire({ title: message });
    }
});
