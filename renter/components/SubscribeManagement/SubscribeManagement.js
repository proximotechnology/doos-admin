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
        },
        hideTableLoader: function () {
            document.getElementById('tableLoading').classList.add('hidden');
        },

    };

    Alpine.data('subscriptionsTable', () => ({
        subscriptions: { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10, from: 0, to: 0 },
        currentFilter: 'pending',
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        currentPage: 1,
        users: [],
        plans: [],
        isLoading: false,
        filters: {
            status: '',
            user_id: '',
            plan_id: '',
            start_date: '',
            end_date: '',
        },

        async init() {
                        await this.fetchSubscriptions();

            await this.fetchUsers();
            await this.fetchPlans();
        },
        async fetchUsers() {
            try {
                const data = await ApiService.getUsers(1, { per_page: 999 });
                
                this.users = data.data.data.filter((u) => u.type === '0');
            } catch (error) {
                coloredToast('error', error.message);
            }
        },
        async fetchPlans() {
            try {
                const data = await ApiService.getPlans();
                this.plans = data.data;
            } catch (error) {
                coloredToast('error', error.message);
            }
        },
        async fetchSubscriptions() {
            try {
                this.isLoading = true;
                loadingIndicator.showTableLoader();

                const token = localStorage.getItem('authToken');
                if (!token) {
                    coloredToast('error', Alpine.store('i18n').t('auth_token_missing'));
                    window.location.href = 'auth-boxed-signin.html';
                    return;
                }

                const filters = {};
                if (this.filters.status) filters.status = this.filters.status;
                if (this.filters.user_id) filters.user_id = this.filters.user_id;
                if (this.filters.plan_id) filters.plan_id = this.filters.plan_id;
                if (this.filters.start_date) filters.start_date = this.filters.start_date;
                if (this.filters.end_date) filters.end_date = this.filters.end_date;

                const data = await ApiService.getSubscriptions(this.currentPage, filters);
                this.subscriptions = data.data || { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10, from: 0, to: 0 };
            } catch (error) {
                coloredToast('error', error.message || Alpine.store('i18n').t('failed_to_fetch_subscriptions'));
                this.subscriptions = { data: [], total: 0, current_page: 1, last_page: 1, per_page: 10, from: 0, to: 0 };
            } finally {
                this.isLoading = false;
                loadingIndicator.hideTableLoader();
            }
        },
        changeFilter(filter) {
            this.currentFilter = filter;
            this.currentPage = 1;
            this.fetchSubscriptions();
        },

        nextPage() {
            if (this.currentPage < this.subscriptions.last_page) {
                this.currentPage++;
                this.fetchSubscriptions();
            }
        },

        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.fetchSubscriptions();
            }
        },

        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('not_available');
            const date = new Date(dateString);
            return date.toLocaleDateString();
        },

        getStatusCount(status) {
            if (!this.subscriptions || !this.subscriptions.data) return 0;
            return this.subscriptions.data.filter(s => s.status === status).length;
        },

        isTableLoading() {
            return this.isLoading;
        },

        hasSubscriptions() {
            return this.subscriptions && this.subscriptions.data && this.subscriptions.data.length > 0;
        },

        parseRenewalData(renewalData) {
            if (!renewalData) return { last_renewed: null, next_renewal: null };
            
            try {
                // If it's already an object
                if (typeof renewalData === 'object') {
                    return {
                        last_renewed: renewalData.last_renewed || null,
                        next_renewal: renewalData.next_renewal || null
                    };
                }
                
                // If it's a string, try to parse it
                if (typeof renewalData === 'string') {
                    const parsed = JSON.parse(renewalData);
                    return {
                        last_renewed: parsed.last_renewed || null,
                        next_renewal: parsed.next_renewal || null
                    };
                }
                
                return { last_renewed: null, next_renewal: null };
            } catch (e) {
                return { last_renewed: null, next_renewal: null };
            }
        },

        formatRenewalDate(dateString) {
            if (!dateString) return '-';
            try {
                // Check if it's a valid date string
                const date = new Date(dateString);
                // Check if date is valid
                if (isNaN(date.getTime())) {
                    // If not a valid date, return as is (might be phone number or other text)
                    return dateString;
                }
                return date.toLocaleDateString();
            } catch (e) {
                // If parsing fails, return as is
                return dateString;
            }
        },

        async markAsPaid(subscriptionId) {
            try {
                const isConfirmed = await Swal.fire({
                    title: Alpine.store('i18n').t('are_you_sure'),
                    text: Alpine.store('i18n').t('approve_subscription_confirm'),
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#3085d6',
                    cancelButtonColor: '#d33',
                    confirmButtonText: Alpine.store('i18n').t('yes_approve'),
                });

                if (!isConfirmed.isConfirmed) return;

                await ApiService.markSubscriptionAsPaid(subscriptionId);

                await this.fetchSubscriptions();
                Swal.fire(Alpine.store('i18n').t('approved'),
                    Alpine.store('i18n').t('subscription_approved_success'), 'success');
            } catch (error) {
                Swal.fire(
                    Alpine.store('i18n').t('error'),
                    error.message || Alpine.store('i18n').t('failed_to_approve_subscription'),
                    'error'
                );
            }
        },
    }));
});
