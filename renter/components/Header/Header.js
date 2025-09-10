document.addEventListener('alpine:init', () => {
    Alpine.data('header', () => ({
        languages: [
            {
                id: 3,
                key: 'English',
                value: 'en',
            },

            {
                id: 16,
                key: 'Arabic',
                value: 'ae',
            },
        ],
        init() {
            const selector = document.querySelector('ul.horizontal-menu a[href="' + window.location.pathname + '"]');
            if (selector) {
                selector.classList.add('active');
                const ul = selector.closest('ul.sub-menu');
                if (ul) {
                    let ele = ul.closest('li.menu').querySelectorAll('.nav-link');
                    if (ele) {
                        ele = ele[0];
                        setTimeout(() => {
                            ele.classList.add('active');
                        });
                    }
                }
            }
        },
    }));

    Alpine.data('logout', () => ({
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,

        async handleLogout() {
            const token = localStorage.getItem('authToken');
            try {
                const response = await fetch(`${this.apiBaseUrl}/api/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || 'فشل تسجيل الخروج');
                }

                localStorage.removeItem('authToken');
                window.location.href = 'auth-boxed-signin.html';
            } catch (error) {
                alert('حدث خطأ أثناء تسجيل الخروج. يرجى المحاولة لاحقًا.', error);
            }
        },
    }));
    Alpine.store('i18n', {
        locale: localStorage.getItem('language') || 'en',
        translations: {},

        async init() {
            await this.loadTranslations(this.locale);
        },

        async loadTranslations(locale) {
            try {
                const response = await fetch(`lang/${locale}.json`);
                if (!response.ok) throw new Error('Failed to load translations');
                this.translations = await response.json();
                this.locale = locale;
                localStorage.setItem('language', locale);
                this.applyDirection(locale);
            } catch (error) {
                console.error('Error loading translations:', error);
                if (locale !== 'en') await this.loadTranslations('en');
            }
        },

        async setLocale(locale) {
            await this.loadTranslations(locale);
            setTimeout(() => {
                window.location.reload();
            }, 0);
            if (window.multipleTable) {
                window.multipleTable.fetchManagers();
            }
        },

        t(key) {
            return this.translations[key] || key;
        },

        applyDirection(locale) {
            if (locale === 'ar') {
                document.documentElement.lang = 'ar';
            } else {
                document.documentElement.lang = 'en';
            }
        },
    });

    Alpine.store('i18n').init();

});
