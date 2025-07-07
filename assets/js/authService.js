// authService.js

class AuthService {
    
    constructor() {
        this.baseUrl = window.API_CONFIG.BASE_URL;
        this.endpoints = window.API_CONFIG.ENDPOINTS;
        this.defaultHeaders = window.API_CONFIG.DEFAULT_HEADERS;
    }

    async login(email, password) {
        try {
            const url = `${this.baseUrl}${this.endpoints.LOGIN}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: this.defaultHeaders,
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'فشل تسجيل الدخول');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
}

// جعل AuthService متاحًا عالميًا
window.authService = new AuthService();
