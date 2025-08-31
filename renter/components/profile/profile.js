document.addEventListener('alpine:init', () => {
    // تعريف دالة coloredToast
    const coloredToast = (color, message) => {
        const icon = color === 'success' ? 'success' : 'error';
        Swal.fire({
            toast: true,
            position: 'bottom-start',
            icon: icon,
            title: message,
            showConfirmButton: false,
            timer: 3000,
            customClass: {
                popup: `color-${color}`,
            },
        });
    };

    const loadingIndicator = {
        show: function () {
            document.getElementById('loadingIndicator').classList.remove('hidden');
        },
        hide: function () {
            document.getElementById('loadingIndicator').classList.add('hidden');
        }
    };

    // تسجيل المكون بشكل صحيح في Alpine
    Alpine.data('profileData', () => ({
        loading: true,
        updating: false,
        user: {
            id: '',
            name: '',
            email: '',
            phone: '',
            country: '',
            created_at: '',
            type: ''
        },
        formData: {
            name: '',
            email: '',
            phone: '',
            country: '',
            password: '',
            password_confirmation: ''
        },
        init() {
            this.fetchUserData();
        },
        async fetchUserData() {
            try {
                loadingIndicator.show();
                const token = localStorage.getItem('authToken');

                if (!token) {
                    throw new Error(Alpine.store('i18n').t('no_auth_token'));
                }

                const response = await fetch(`${API_CONFIG.BASE_URL_Renter}/api/Get_my_info`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.status && data.user) {
                    this.user = data.user;
                    // Fill form data
                    this.formData = {
                        name: data.user.name,
                        email: data.user.email,
                        phone: data.user.phone || '',
                        country: data.user.country || '',
                        password: '',
                        password_confirmation: ''
                    };
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('invalid_response_format'));
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                coloredToast('danger', Alpine.store('i18n').t('failed_load_profile') + ': ' + error.message);
            } finally {
                loadingIndicator.hide();
            }
        },
        async updateProfile() {
            try {
                if (this.formData.password && this.formData.password !== this.formData.password_confirmation) {
                    coloredToast('danger', Alpine.store('i18n').t('password_mismatch'));
                    return;
                }

                this.updating = true;
                const token = localStorage.getItem('authToken');

                if (!token) {
                    throw new Error(Alpine.store('i18n').t('no_auth_token'));
                }

                // Prepare data for update
                const updateData = {
                    name: this.formData.name,
                    email: this.formData.email,
                    phone: this.formData.phone,
                    country: this.formData.country
                };

                // Only include password if provided
                if (this.formData.password) {
                    updateData.password = this.formData.password;
                    updateData.password_confirmation = this.formData.password_confirmation;
                }

                const response = await fetch(`${API_CONFIG.BASE_URL_Renter}/api/update_my_info/1`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || `HTTP error! status: ${response.status}`);
                }

                if (data.status) {
                    // Update local user data
                    this.user.name = this.formData.name;
                    this.user.email = this.formData.email;
                    this.user.phone = this.formData.phone;
                    this.user.country = this.formData.country;

                    coloredToast('success', Alpine.store('i18n').t('profile_updated_success'));

                    // Clear password fields
                    this.formData.password = '';
                    this.formData.password_confirmation = '';
                } else {
                    throw new Error(data.message || Alpine.store('i18n').t('update_failed'));
                }

            } catch (error) {
                console.error('Error updating profile:', error);
                coloredToast('danger', Alpine.store('i18n').t('failed_update_profile') + ': ' + error.message);
            } finally {
                this.updating = false;
            }
        },
        formatDate(dateString) {
            if (!dateString) return Alpine.store('i18n').t('na');
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }));
});
