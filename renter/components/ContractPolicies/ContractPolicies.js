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
            document.getElementById('policiesTable').classList.add('hidden');
            document.getElementById('tableEmptyState').classList.add('hidden');
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
            document.getElementById('policiesTable').classList.remove('hidden');
        },
        showEmptyState: function () {
            document.getElementById('tableEmptyState').classList.remove('hidden');
            document.getElementById('policiesTable').classList.add('hidden');
            document.getElementById('tableLoading').classList.add('hidden');
        }
    };

    Alpine.data('contractPolicies', () => ({
        tableData: [],
        datatable: null,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        form: {
            item: ''
        },

        async initComponent() {
            await this.fetchPolicies();

            // Event Delegation for buttons
            document.addEventListener('click', (e) => {
                if (e.target.closest('.edit-policy-btn')) {
                    const policyId = e.target.closest('.edit-policy-btn').dataset.id;
                    this.editPolicy(policyId);
                }
                if (e.target.closest('.delete-policy-btn')) {
                    const policyId = e.target.closest('.delete-policy-btn').dataset.id;
                    this.deletePolicy(policyId);
                }
            });
        },

        async fetchPolicies() {
            try {
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    this.showError('Authentication token is missing. Please log in.');
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

                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    this.tableData = data.data;

                    if (this.tableData.length === 0) {
                        loadingIndicator.showEmptyState();
                    } else {
                        this.populateTable();
                        loadingIndicator.hideTableLoader();
                    }
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('failed_to_load'));
                }
            } catch (error) {
                loadingIndicator.hideTableLoader();
                loadingIndicator.showEmptyState();
                coloredToast('danger', Alpine.store('i18n').t('failed_to_load') + ': ' + error.message);
            }
        },

        populateTable() {
            if (this.datatable) {
                this.datatable.destroy();
            }

            const mappedData = this.tableData.map((policy, index) => [
                this.formatText(policy.id),
                this.formatText(policy.item),
                this.formatDate(policy.created_at),
                this.formatDate(policy.updated_at),
                this.getActionButtons(policy.id),
            ]);

            this.datatable = new simpleDatatables.DataTable('#policiesTable', {
                data: {
                    headings: [
                        Alpine.store('i18n').t('id'),
                        Alpine.store('i18n').t('policy_item'),
                        Alpine.store('i18n').t('created_at'),
                        Alpine.store('i18n').t('updated_at'),
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
                    bottom: '{info}{select}{pager}',
                },
            });
        },

        async submitPolicyForm() {
            try {
                loadingIndicator.show();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    throw new Error('Authentication token not found');
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
                const policy = this.tableData.find(p => p.id == policyId);
                if (!policy) {
                    throw new Error('Policy not found');
                }

                const { value: item } = await Swal.fire({
                    title: Alpine.store('i18n').t('edit_policy'),
                    html: `
                        <div class="text-left">
                            <label class="block mb-2 text-sm font-medium">${Alpine.store('i18n').t('policy_item')}</label>
                            <textarea id="policyItem" class="swal2-textarea w-full p-2 border rounded" rows="5" placeholder="${Alpine.store('i18n').t('enter_policy_text')}">${policy.item}</textarea>
                        </div>
                    `,
                    focusConfirm: false,
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('save'),
                    cancelButtonText: Alpine.store('i18n').t('cancel'),
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
                const result = await Swal.fire({
                    title: Alpine.store('i18n').t('confirm_delete'),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: Alpine.store('i18n').t('delete'),
                    cancelButtonText: Alpine.store('i18n').t('cancel')
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
            if (!dateString) return Alpine.store('i18n').t('na');
            return new Date(dateString).toLocaleDateString();
        },

        formatText(text) {
            return text || Alpine.store('i18n').t('na');
        },

        getActionButtons(policyId) {
            return `
                <div class="flex items-center gap-1 justify-center">
                    <button class="btn edit-policy-btn btn-warning btn-sm" data-id="${policyId}">
                        ${Alpine.store('i18n').t('edit')}
                    </button>
                    <button class="btn delete-policy-btn btn-danger btn-sm" data-id="${policyId}">
                        ${Alpine.store('i18n').t('delete')}
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
                text: message
            });
        }
    }));

    coloredToast = (color, message) => {
        const toast = Swal.mixin({
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
});
