/**
 * API Service
 * Centralized API service for all CRUD operations
 * Handles authentication, error handling, and response formatting
 */

(function() {
    'use strict';

    class ApiService {
        constructor() {
            // Wait for API_CONFIG to be available
            if (typeof API_CONFIG === 'undefined') {
                // Fallback if API_CONFIG is not loaded yet
                this.baseUrl = window.ENV?.BASE_URL_RENTER || 'https://api.doosdoostest.com';
            } else {
                this.baseUrl = API_CONFIG.BASE_URL_Renter || '';
            }
            this.getAuthToken = () => localStorage.getItem('authToken');
        }

        /**
         * Get default headers
         */
        getHeaders(includeAuth = true, contentType = 'application/json') {
            const headers = {
                'Accept': 'application/json',
            };

            if (contentType !== 'multipart/form-data') {
                headers['Content-Type'] = contentType;
            }

            if (includeAuth) {
                const token = this.getAuthToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            return headers;
        }

        /**
         * Handle API response
         */
        async handleResponse(response, endpoint, method, requestData = null) {
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || 'Request failed' };
                }
                
                // Log error details for debugging
                const errorDetails = {
                    endpoint: endpoint,
                    method: method,
                    status: response.status,
                    statusText: response.statusText,
                    requestData: requestData,
                    errorData: errorData,
                    errors: errorData.errors || {},
                    message: errorData.message || 'Request failed'
                };
                
                // Format error message with field names
                let errorMessage = errorData.message || 'Request failed';
                if (errorData.errors && typeof errorData.errors === 'object') {
                    const errorFields = [];
                    for (const [field, messages] of Object.entries(errorData.errors)) {
                        if (Array.isArray(messages)) {
                            errorFields.push(`${field}: ${messages.join(', ')}`);
                        } else if (typeof messages === 'string') {
                            errorFields.push(`${field}: ${messages}`);
                        } else {
                            errorFields.push(`${field}: ${JSON.stringify(messages)}`);
                        }
                    }
                    if (errorFields.length > 0) {
                        errorMessage = errorFields.join('\n');
                    }
                }
                
                // Always log errors to console for debugging
                console.group(`❌ API Error: ${method} ${endpoint}`);
                console.error('Status:', response.status, response.statusText);
                console.error('Request Data:', requestData);
                console.error('Error Data:', errorData);
                console.error('Field Errors:', errorData.errors || {});
                console.error('Formatted Message:', errorMessage);
                console.groupEnd();
                
                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        }

        /**
         * Generic GET request
         */
        async get(endpoint, params = {}, includeAuth = true) {
            const url = new URL(`${this.baseUrl}${endpoint}`);
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                    url.searchParams.append(key, params[key]);
                }
            });

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: this.getHeaders(includeAuth),
            });

            return this.handleResponse(response, endpoint, 'GET', params);
        }

        /**
         * Generic POST request
         */
        async post(endpoint, data = {}, isFormData = false, includeAuth = true) {
            const contentType = isFormData ? 'multipart/form-data' : 'application/json';
            const body = isFormData ? data : JSON.stringify(data);
            
            // Always log request data for debugging
            console.group(`📤 API Request: POST ${endpoint}`);
            if (isFormData) {
                console.log('FormData:', data);
                // Log FormData entries
                if (data instanceof FormData) {
                    for (const [key, value] of data.entries()) {
                        console.log(`  ${key}:`, value instanceof File ? `[File: ${value.name}, size: ${value.size} bytes]` : value);
                    }
                }
            } else {
                console.log('Request Data:', data);
            }
            console.groupEnd();

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: this.getHeaders(includeAuth, contentType),
                body: body,
            });

            return this.handleResponse(response, endpoint, 'POST', isFormData ? this._formDataToObject(data) : data);
        }
        
        /**
         * Convert FormData to object for logging
         * @private
         */
        _formDataToObject(formData) {
            if (!(formData instanceof FormData)) {
                return formData;
            }
            const object = {};
            for (const [key, value] of formData.entries()) {
                if (value instanceof File) {
                    object[key] = `[File: ${value.name}, size: ${value.size}]`;
                } else {
                    object[key] = value;
                }
            }
            return object;
        }

        /**
         * Generic PUT request
         */
        async put(endpoint, data = {}, isFormData = false, includeAuth = true) {
            const contentType = isFormData ? 'multipart/form-data' : 'application/json';
            const body = isFormData ? data : JSON.stringify(data);
            
            // Always log request data for debugging
            console.group(`📤 API Request: PUT ${endpoint}`);
            console.log('Request Data:', isFormData ? this._formDataToObject(data) : data);
            console.groupEnd();

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: this.getHeaders(includeAuth, contentType),
                body: body,
            });

            return this.handleResponse(response, endpoint, 'PUT', isFormData ? this._formDataToObject(data) : data);
        }

        /**
         * Generic PATCH request
         */
        async patch(endpoint, data = {}, isFormData = false, includeAuth = true) {
            const contentType = isFormData ? 'multipart/form-data' : 'application/json';
            const body = isFormData ? data : JSON.stringify(data);
            
            // Always log request data for debugging
            console.group(`📤 API Request: PATCH ${endpoint}`);
            console.log('Request Data:', isFormData ? this._formDataToObject(data) : data);
            console.groupEnd();

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PATCH',
                headers: this.getHeaders(includeAuth, contentType),
                body: body,
            });

            return this.handleResponse(response, endpoint, 'PATCH', isFormData ? this._formDataToObject(data) : data);
        }

        /**
         * Generic DELETE request
         */
        async delete(endpoint, includeAuth = true) {
            // Always log request for debugging
            console.group(`📤 API Request: DELETE ${endpoint}`);
            console.log('Endpoint:', endpoint);
            console.groupEnd();

            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: this.getHeaders(includeAuth),
            });

            return this.handleResponse(response, endpoint, 'DELETE', null);
        }

        // ==================== Car Management APIs ====================

        /**
         * Get all cars with pagination and filters
         */
        async getCars(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/get_all_mycars', params);
        }

        /**
         * Update car status
         */
        async updateCarStatus(carId, data) {
            return this.post(`/api/admin/cars/update_car_status/${carId}`, data);
        }

        /**
         * Update car features
         */
        async updateCarFeatures(carId, features) {
            return this.post(`/api/updateCarFeatures/${carId}`, { features });
        }

        /**
         * Delete car
         */
        async deleteCar(carId) {
            return this.delete(`/api/deleteCar/${carId}`);
        }

        // ==================== Brand Management APIs ====================

        /**
         * Get all brands
         */
        async getBrands(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/brand_car/get_all', params);
        }

        /**
         * Add brand
         */
        async addBrand(formData) {
            return this.post('/api/admin/brand_car/store', formData, true);
        }

        /**
         * Update brand
         */
        async updateBrand(brandId, formData) {
            return this.post(`/api/admin/brand_car/update/${brandId}`, formData, true);
        }

        /**
         * Delete brand
         */
        async deleteBrand(brandId) {
            return this.delete(`/api/admin/brand_car/delete/${brandId}`);
        }

        // ==================== Model Management APIs ====================

        /**
         * Get all models
         */
        async getModels(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/model_car/get_all_models', params);
        }

        /**
         * Add model
         */
        async addModel(data) {
            // Check if data is FormData
            const isFormData = data instanceof FormData;
            return this.post('/api/admin/model_car/store', data, isFormData);
        }

        /**
         * Update model
         */
        async updateModel(modelId, data) {
            return this.post(`/api/admin/model_car/update/${modelId}`, data);
        }

        /**
         * Delete model
         */
        async deleteModel(modelId) {
            return this.delete(`/api/admin/model_car/delete/${modelId}`);
        }

        // ==================== Plan Management APIs ====================

        /**
         * Get all plans
         */
        async getPlans(page = 1, filters = {}) {
            const params = { page, ...filters };
            return this.get('/api/admin/plan/index', params);
        }

        /**
         * Add plan
         */
        async addPlan(formData) {
            return this.post('/api/admin/plan/store', formData, true);
        }

        /**
         * Update plan
         */
        async updatePlan(planId, formData) {
            return this.post(`/api/admin/plan/update/${planId}`, formData, true);
        }

        /**
         * Delete plan
         */
        async deletePlan(planId) {
            return this.delete(`/api/admin/plan/delete/${planId}`);
        }

        // ==================== Testimonial Management APIs ====================

        /**
         * Get all testimonials
         */
        async getTestimonials(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/testimonial/get_all_testimonials', params);
        }

        /**
         * Add testimonial
         */
        async addTestimonial(formData) {
            return this.post('/api/admin/testimonial/store', formData, true);
        }

        /**
         * Update testimonial
         */
        async updateTestimonial(testimonialId, formData) {
            return this.post(`/api/admin/testimonial/update/${testimonialId}`, formData, true);
        }

        /**
         * Delete testimonial
         */
        async deleteTestimonial(testimonialId) {
            return this.delete(`/api/admin/testimonial/delete/${testimonialId}`);
        }

        // ==================== Station Management APIs ====================

        /**
         * Get all stations
         */
        async getStations(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/stations/get_all', params);
        }

        /**
         * Add station
         */
        async addStation(data) {
            return this.post('/api/admin/stations/store', data);
        }

        /**
         * Update station
         */
        async updateStation(stationId, data) {
            return this.post(`/api/admin/stations/update/${stationId}`, data);
        }

        /**
         * Delete station
         */
        async deleteStation(stationId) {
            return this.delete(`/api/admin/stations/delete/${stationId}`);
        }

        // ==================== Role Management APIs ====================

        /**
         * Get all roles
         */
        async getRoles(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/roles', params);
        }

        /**
         * Add role
         */
        async addRole(data) {
            return this.post('/api/admin/roles', data);
        }

        /**
         * Update role
         */
        async updateRole(roleId, data) {
            return this.put(`/api/admin/roles/${roleId}`, data);
        }

        /**
         * Delete role
         */
        async deleteRole(roleId) {
            return this.delete(`/api/admin/roles/${roleId}`);
        }

        /**
         * Assign permissions to role
         */
        async assignPermissionsToRole(roleId, permissionIds) {
            return this.post(`/api/admin/roles/${roleId}/permissions`, { permissions: permissionIds });
        }

        /**
         * Get role permissions
         */
        async getRolePermissions(roleId) {
            return this.get(`/api/admin/roles/${roleId}`);
        }

        // ==================== Permission Management APIs ====================

        /**
         * Get all permissions
         */
        async getPermissions(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/permissions', params);
        }

        /**
         * Add permission
         */
        async addPermission(data) {
            return this.post('/api/admin/permissions', data);
        }

        /**
         * Update permission
         */
        async updatePermission(permissionId, data) {
            return this.put(`/api/admin/permissions/${permissionId}`, data);
        }

        /**
         * Delete permission
         */
        async deletePermission(permissionId) {
            return this.delete(`/api/admin/permissions/${permissionId}`);
        }

        // ==================== Chat APIs ====================

        /**
         * Get chat users
         */
        async getChatUsers() {
            return this.get('/api/chat/getUsers');
        }

        /**
         * Get chat messages
         */
        async getChatMessages(userId, page = 1) {
            return this.get(`/api/chat/getMessages/${userId}`, { page });
        }

        /**
         * Send message
         */
        async sendMessage(userId, message) {
            return this.post(`/api/chat/SendTo/${userId}`, { message });
        }

        /**
         * Mark messages as read
         */
        async markMessagesAsRead(userId) {
            return this.post(`/api/chat/markAsRead/${userId}`);
        }

        // ==================== Booking Management APIs ====================

        /**
         * Get all bookings
         */
        async getBookings(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/bookings/get_all_bookings', params);
        }

        // ==================== Discount Management APIs ====================

        /**
         * Get all discounts
         */
        async getDiscounts(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/discounts/get_all_discounts', params);
        }

        /**
         * Add discount
         */
        async addDiscount(data) {
            return this.post('/api/admin/discounts/store', data);
        }

        /**
         * Update discount
         */
        async updateDiscount(discountId, data) {
            return this.post(`/api/admin/discounts/update/${discountId}`, data);
        }

        /**
         * Toggle discount status
         */
        async toggleDiscountStatus(discountId) {
            return this.post(`/api/admin/discounts/toggle-status/${discountId}`);
        }

        // ==================== Coupon Management APIs ====================

        /**
         * Get all coupons
         */
        async getCoupons(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/coupons/get_all_coupons', params);
        }

        /**
         * Add coupon
         */
        async addCoupon(data) {
            return this.post('/api/admin/coupons/store', data);
        }

        /**
         * Update coupon
         */
        async updateCoupon(couponId, data) {
            return this.post(`/api/admin/coupons/update/${couponId}`, data);
        }

        /**
         * Toggle coupon status
         */
        async toggleCouponStatus(couponId) {
            return this.post(`/api/admin/coupons/toggle-status/${couponId}`);
        }

        // ==================== Ticket Management APIs ====================

        /**
         * Get all tickets
         */
        async getTickets(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/tickets/get_all_tickets', params);
        }

        /**
         * Get ticket details
         */
        async getTicketDetails(ticketId) {
            return this.get(`/api/admin/tickets/${ticketId}`);
        }

        /**
         * Send ticket reply
         */
        async sendTicketReply(ticketId, data) {
            return this.post(`/api/admin/tickets/${ticketId}/reply`, data);
        }

        /**
         * Update ticket status
         */
        async updateTicketStatus(ticketId, status) {
            return this.post(`/api/admin/tickets/${ticketId}/status`, { status });
        }

        // ==================== Wallet Management APIs ====================

        /**
         * Get withdrawals
         */
        async getWithdrawals(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/wallet/withdrawals', params);
        }

        // ==================== Review Management APIs ====================

        /**
         * Get all reviews
         */
        async getReviews(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/reviews/get_all_reviews', params);
        }

        /**
         * Delete review
         */
        async deleteReview(reviewId) {
            return this.delete(`/api/admin/reviews/delete/${reviewId}`);
        }

        // ==================== Contract Management APIs ====================

        /**
         * Get all contracts
         */
        async getContracts(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/contracts/get_all_contracts', params);
        }

        // ==================== Contract Policies APIs ====================

        /**
         * Get all policies
         */
        async getPolicies(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/policies/get_all_policies', params);
        }

        /**
         * Add policy
         */
        async addPolicy(data) {
            return this.post('/api/admin/policies/store', data);
        }

        /**
         * Update policy
         */
        async updatePolicy(policyId, data) {
            return this.post(`/api/admin/policies/update/${policyId}`, data);
        }

        /**
         * Delete policy
         */
        async deletePolicy(policyId) {
            return this.delete(`/api/admin/policies/delete/${policyId}`);
        }

        // ==================== Fees Management APIs ====================

        /**
         * Get all fees
         */
        async getFees(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/fees/get_all_fees', params);
        }

        /**
         * Add fee
         */
        async addFee(data) {
            return this.post('/api/admin/fees/store', data);
        }

        /**
         * Update fee
         */
        async updateFee(feeId, data) {
            return this.post(`/api/admin/fees/update/${feeId}`, data);
        }

        /**
         * Delete fee
         */
        async deleteFee(feeId) {
            return this.delete(`/api/admin/fees/delete/${feeId}`);
        }

        // ==================== User Management APIs ====================

        /**
         * Get all users
         */
        async getUsers(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/users/get_all_users', params);
        }

        // ==================== Profile APIs ====================

        /**
         * Get user profile
         */
        async getProfile() {
            return this.get('/api/user/profile');
        }

        /**
         * Update profile
         */
        async updateProfile(data) {
            return this.post('/api/user/profile/update', data);
        }

        // ==================== Whitelist/Blacklist APIs ====================

        /**
         * Get white locations
         */
        async getWhiteLocations(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/white_locations/get_all', params);
        }

        /**
         * Add white location
         */
        async addWhiteLocation(data) {
            return this.post('/api/admin/white_locations/store', data);
        }

        /**
         * Update white location
         */
        async updateWhiteLocation(locationId, data) {
            return this.post(`/api/admin/white_locations/update/${locationId}`, data);
        }

        /**
         * Get black locations
         */
        async getBlackLocations(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/black_locations/get_all', params);
        }

        /**
         * Add black location
         */
        async addBlackLocation(data) {
            return this.post('/api/admin/black_locations/store', data);
        }

        /**
         * Update black location
         */
        async updateBlackLocation(locationId, data) {
            return this.post(`/api/admin/black_locations/update/${locationId}`, data);
        }
    }

    // Initialize and expose API service
    window.ApiService = new ApiService();
})();

