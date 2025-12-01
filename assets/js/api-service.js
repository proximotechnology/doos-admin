/**
 * API Service
 * Centralized API service for all CRUD operations
 * Handles authentication, error handling, and response formatting
 */

(function () {
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

                // Log API errors
                const fullUrl = `${this.baseUrl}${endpoint}`;
                console.log(`[API Error] ${method} ${fullUrl}:`, {
                    url: fullUrl,
                    status: response.status,
                    statusText: response.statusText,
                    message: errorMessage
                });

                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            let result;

            if (contentType && contentType.includes('application/json')) {
                result = await response.json();

                // Log successful API responses
                const fullUrl = `${this.baseUrl}${endpoint}`;
                console.log(`[API Response] ${method} ${fullUrl}:`, {
                    url: fullUrl,
                    status: response.status,
                    data: result,
                    requestData: requestData
                });

                return result;
            } else {
                result = await response.text();

                // Log text responses
                const fullUrl = `${this.baseUrl}${endpoint}`;
                console.log(`[API Response] ${method} ${fullUrl}:`, {
                    url: fullUrl,
                    status: response.status,
                    data: result,
                    requestData: requestData
                });

                return result;
            }
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

            console.log(`[API] GET ${endpoint}`, params);
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

            // Log API request
            console.log(`[API] POST ${endpoint}`, isFormData ? '[FormData]' : data);

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

            // Log API request
            console.log(`[API] PUT ${endpoint}`, isFormData ? '[FormData]' : data);

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

            // Log API request
            console.log(`[API] PATCH ${endpoint}`, isFormData ? '[FormData]' : data);

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
            // Log API request
            console.log(`[API] DELETE ${endpoint}`);

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

        /**
         * Store new car
         */
        async storeCar(formData) {
            return this.post('/api/admin/cars/storeCar', formData, true);
        }

        /**
         * Get car details by ID
         */
        async getCarDetails(carId) {
            return this.get(`/api/admin/cars/show/${carId}`);
        }

        /**
         * Update car
         */
        async updateCar(carId, formData) {
            return this.post(`/api/admin/cars/updateCar/${carId}`, formData, true);
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

        /**
         * Get model details
         */
        async getModelDetails(modelId) {
            return this.get(`/api/admin/model_car/show/${modelId}`);
        }

        /**
         * Add year to model
         */
        async addYear(data) {
            const isFormData = data instanceof FormData;
            return this.post('/api/admin/year_model/store', data, isFormData);
        }

        /**
         * Update year
         */
        async updateYear(yearId, data) {
            const isFormData = data instanceof FormData;
            return this.post(`/api/admin/year_model/update/${yearId}`, data, isFormData);
        }

        /**
         * Delete year
         */
        async deleteYear(yearId) {
            return this.delete(`/api/admin/year_model/delete/${yearId}`);
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

        // ==================== Seasonal Pricing Management APIs ====================

        /**
         * Get seasonal pricing list
         */
        async getSeasonalPricing(page = 1, filters = {}) {
            const params = { page, ...filters };
            return this.get('/api/admin/seasonpricing/index', params);
        }

        /**
         * Create seasonal pricing
         */
        async createSeasonalPricing(formData) {
            return this.post('/api/admin/seasonpricing/store', formData);
        }

        /**
         * Update seasonal pricing
         */
        async updateSeasonalPricing(seasonId, formData) {
            return this.put(`/api/admin/seasonpricing/update/${seasonId}`, formData);
        }

        /**
         * Delete seasonal pricing
         */
        async deleteSeasonalPricing(seasonId) {
            return this.delete(`/api/admin/seasonpricing/delete/${seasonId}`);
        }

        /**
         * Add brands to seasonal pricing
         * @param {number} seasonId - The ID of the seasonal pricing
         * @param {Array<number>} brands - Array of brand IDs
         */
        async addBrandsToSeasonalPricing(seasonId, brands) {
            return this.post(`/api/admin/seasonpricing/add-brands/${seasonId}`, { brands });
        }

        /**
         * Remove brands from seasonal pricing
         * @param {number} seasonId - The ID of the seasonal pricing
         * @param {Array<number>} brands - Array of brand IDs
         */
        async removeBrandsFromSeasonalPricing(seasonId, brands) {
            return this.post(`/api/admin/seasonpricing/remove-brands/${seasonId}`, { brands });
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
            return this.put(`/api/admin/stations/update/${stationId}`, data);
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
         * Get all bookings with filters
         */
        async getBookings(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/cars/booking/get_all_filter', params);
        }

        /**
         * Change booking status
         */
        async changeBookingStatus(bookingId, status) {
            return this.post(`/api/admin/booking/change_status_admin/${bookingId}`, { status });
        }

        /**
         * Change booking payment status
         */
        async changeBookingPaymentStatus(bookingId, isPaid) {
            return this.post(`/api/admin/booking/change_is_paid/${bookingId}`, { is_paid: isPaid });
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
            return this.post('/api/admin/discount/store', data);
        }

        /**
         * Update discount
         */
        async updateDiscount(discountId, data) {
            return this.put(`/api/admin/discount/update/${discountId}`, data);
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
            return this.post('/api/admin/coupon/store', data);
        }

        /**
         * Update coupon
         */
        async updateCoupon(couponId, data) {
            return this.put(`/api/admin/coupon/update/${couponId}`, data);
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
            return this.get(`/api/admin/support/tickets/${ticketId}`);
        }

        /**
         * Send ticket reply
         */
        async sendTicketReply(ticketId, data) {
            return this.post(`/api/admin/support/tickets/${ticketId}/reply`, data);
        }

        /**
         * Add internal note to ticket
         */
        async addTicketInternalNote(ticketId, data) {
            return this.post(`/api/admin/support/tickets/${ticketId}/internal-note`, data);
        }

        /**
         * Update ticket status
         */
        async updateTicketStatus(ticketId, data) {
            return this.put(`/api/admin/support/tickets/${ticketId}/status`, data);
        }

        /**
         * Update ticket priority
         */
        async updateTicketPriority(ticketId, data) {
            return this.put(`/api/admin/support/tickets/${ticketId}/priority`, data);
        }

        /**
         * Close ticket
         */
        async closeTicket(ticketId, data) {
            return this.post(`/api/admin/support/tickets/${ticketId}/close`, data);
        }

        /**
         * Reopen ticket
         */
        async reopenTicket(ticketId, data) {
            return this.post(`/api/admin/support/tickets/${ticketId}/reopen`, data);
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

        /**
         * Delete review (admin endpoint)
         */
        async deleteReviewAdmin(reviewId) {
            return this.delete(`/api/admin/review/delete_admin/${reviewId}`);
        }

        // ==================== Contract Management APIs ====================

        /**
         * Get all contracts
         */
        async getContracts(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/contract/get_all', params);
        }

        // ==================== Contract Policies APIs ====================

        /**
         * Get all contract policies
         */
        async getContractPolicies(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/contract_polices/get_all', params);
        }

        /**
         * Add contract policy
         */
        async addContractPolicy(data) {
            return this.post('/api/admin/contract_polices/store', data);
        }

        /**
         * Update contract policy
         */
        async updateContractPolicy(policyId, data) {
            return this.put(`/api/admin/contract_polices/update/${policyId}`, data);
        }

        /**
         * Delete contract policy
         */
        async deleteContractPolicy(policyId) {
            return this.delete(`/api/admin/contract_polices/destroy/${policyId}`);
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
            return this.put(`/api/admin/fees/update/${feeId}`, data);
        }

        /**
         * Delete fee
         */
        async deleteFee(feeId) {
            return this.delete(`/api/admin/fees/delete/${feeId}`);
        }

        // ==================== Feature Plan APIs ====================

        /**
         * Get all feature plans
         */
        async getFeaturePlans(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/plan/feature/index', params);
        }

        /**
         * Add feature plan
         */
        async addFeaturePlan(data) {
            return this.post('/api/admin/plan/feature/store', data);
        }

        /**
         * Update feature plan
         */
        async updateFeaturePlan(featureId, data) {
            return this.post(`/api/admin/plan/feature/update/${featureId}`, data);
        }

        /**
         * Delete feature plan
         */
        async deleteFeaturePlan(featureId) {
            return this.delete(`/api/admin/plan/feature/delete/${featureId}`);
        }

        // ==================== User Management APIs ====================

        /**
         * Get all users
         */
        async getUsers(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/user/get_all', params);
        }

        /**
         * Get user details by ID
         * @param {number} userId - The ID of the user
         */
        async getUserDetails(userId) {
            return this.get(`/api/admin/user/get_all?user_id=${userId}`);
        }

        /**
         * Delete user
         */
        async deleteUser(userId) {
            return this.delete(`/api/admin/user/delete/${userId}`);
        }

        /**
         * Toggle user block status
         * @param {number} userId - User ID
         */
        async toggleUserBlock(userId) {
            return this.patch(`/api/admin/users/toggle-block/${userId}`);
        }

        // ==================== Profile APIs ====================

        /**
         * Get user profile
         */
        async getProfile() {
            return this.get('/api/Get_my_info');
        }

        /**
         * Update profile
         */
        async updateProfile(data) {
            return this.post('/api/update_my_info', data);
        }

        // ==================== Admin Management APIs ====================

        /**
         * Get all admins
         */
        async getAdmins() {
            return this.get('/api/admin/admins/all');
        }

        /**
         * Get countries
         */
        async getCountries() {
            return this.get('/api/admin/admins/countries');
        }

        /**
         * Verify email with OTP
         */
        async verifyEmail(data) {
            return this.post('/api/register/verify', data);
        }

        /**
         * Resend OTP
         */
        async resendOTP(data) {
            return this.post('/api/register/resend_otp', data);
        }

        /**
         * Add admin
         */
        async addAdmin(data) {
            return this.post('/api/admin/admins/create', data);
        }

        /**
         * Update admin
         */
        async updateAdmin(adminId, data) {
            return this.put(`/api/admin/admins/update/${adminId}`, data);
        }

        /**
         * Delete admin
         */
        async deleteAdmin(adminId) {
            return this.delete(`/api/admin/admins/delete/${adminId}`);
        }

        // ==================== Testimonial Management APIs ====================

        /**
         * Get all testimonials with filters
         */
        async getTestimonials(page = 1, filters = {}) {
            const params = { page, per_page: 15, ...filters };
            return this.get('/api/admin/testimonial/filter', params);
        }

        // ==================== Fees Management APIs ====================

        /**
         * Get all fees (updated endpoint)
         */
        async getFees(page = 1, filters = {}) {
            const params = { page, per_page: 15, ...filters };
            return this.get('/api/admin/fees/index', params);
        }

        // ==================== Discount Management APIs ====================

        /**
         * Get all discounts (updated endpoint)
         */
        async getDiscounts(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/discount/index', params);
        }

        /**
         * Delete discount
         */
        async deleteDiscount(discountId) {
            return this.delete(`/api/admin/discount/delete/${discountId}`);
        }

        // ==================== Coupon Management APIs ====================

        /**
         * Get all coupons (updated endpoint)
         */
        async getCoupons(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/coupon/index', params);
        }

        /**
         * Delete coupon
         */
        async deleteCoupon(couponId) {
            return this.delete(`/api/admin/coupon/delete/${couponId}`);
        }

        // ==================== Ticket Management APIs ====================

        /**
         * Get all tickets (updated endpoint)
         */
        async getTickets(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/support/tickets', params);
        }

        /**
         * Get ticket statistics
         */
        async getTicketStatistics(period = 30, groupBy = 'day') {
            return this.get('/api/admin/support/statistics', { period, group_by: groupBy });
        }

        // ==================== Wallet Management APIs ====================

        /**
         * Get withdrawals (updated endpoint)
         */
        async getWithdrawals(page = 1, filters = {}) {
            const params = { page, ...filters };
            return this.get('/api/admin/withdrawal-requests/index', params);
        }

        /**
         * Get withdrawal statistics
         */
        async getWithdrawalStatistics() {
            return this.get('/api/admin/withdrawal-requests/statistics/overview');
        }

        /**
         * Get withdrawal details
         */
        async getWithdrawalDetails(withdrawalId) {
            return this.get(`/api/admin/withdrawal-requests/${withdrawalId}`);
        }

        /**
         * Process withdrawal (approve/reject)
         */
        async processWithdrawal(withdrawalId, data) {
            return this.post(`/api/admin/withdrawal-requests/${withdrawalId}/process`, data);
        }

        /**
         * Complete withdrawal
         */
        async completeWithdrawal(withdrawalId) {
            return this.post(`/api/admin/withdrawal-requests/${withdrawalId}/complete`);
        }

        // ==================== Driver Price APIs ====================

        /**
         * Get driver price
         */
        async getDriverPrice() {
            return this.get('/api/admin/driver_price/show');
        }

        /**
         * Update driver price
         */
        async updateDriverPrice(price) {
            return this.post('/api/admin/driver_price/update', { price });
        }

        // ==================== Subscription Management APIs ====================

        /**
         * Get all subscriptions
         */
        async getSubscriptions(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/subscribe/index', params);
        }

        /**
         * Update subscription
         */
        async updateSubscription(subscriptionId, data) {
            return this.post(`/api/admin/subscribe/update/${subscriptionId}`, data);
        }

        /**
         * Approve subscription
         */
        async approveSubscription(subscriptionId) {
            return this.post(`/api/admin/subscribe/approve/${subscriptionId}`);
        }

        /**
         * Mark subscription as paid
         */
        async markSubscriptionAsPaid(subscriptionId) {
            return this.post(`/api/admin/subscribe/mark_as_paid/${subscriptionId}`);
        }

        /**
         * Get subscribers
         */
        async getSubscribers(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/subscribers/index', params);
        }

        /**
         * Delete subscriber
         */
        async deleteSubscriber(subscriberId) {
            return this.delete(`/api/admin/subscribers/delete/${subscriberId}`);
        }

        // ==================== Chat Management APIs ====================

        /**
         * Get current user online status
         */
        async getMyOnlineStatus() {
            return this.get('/api/chat/my-online-status');
        }

        /**
         * Get online users
         */
        async getOnlineUsers() {
            return this.get('/api/chat/online-users');
        }

        /**
         * Send message to user
         */
        async sendChatMessage(userId, message) {
            return this.post(`/api/chat/SendTo/${userId}`, { message });
        }

        /**
         * Mark messages as read
         */
        async markMessagesAsRead(userId, messageIds, conversationId) {
            return this.post('/api/chat/mark-as-read', {
                userId,
                messageIds,
                conversationId
            });
        }

        /**
         * Update last seen
         */
        async updateLastSeen() {
            return this.post('/api/chat/update-last-seen');
        }

        /**
         * Mark user as offline
         */
        async markOffline() {
            return this.post('/api/chat/mark-offline');
        }

        /**
         * Mark user as online
         */
        async markOnline() {
            return this.post('/api/chat/mark-online');
        }

        /**
         * Get conversation with user
         */
        async getConversation(userId, page = 1, perPage = 20) {
            const params = { page, per_page: perPage };
            return this.get(`/api/chat/getConversation/${userId}`, params);
        }

        // ==================== Review Management APIs ====================

        /**
         * Get all reviews
         */
        async getReviews(carId = null) {
            const endpoint = carId ? `/api/review/by_car/${carId}` : '/api/review/all';
            return this.get(endpoint);
        }

        /**
         * Get all cars for reviews filter
         */
        async getCarsForReviews() {
            return this.get('/api/get_all_mycars');
        }

        // ==================== Home Stats API ====================

        /**
         * Get home statistics
         */
        async getHomeStats() {
            return this.get('/api/admin/home-stats');
        }

        // ==================== Notifications API ====================

        /**
         * Get user notifications
         * @param {number} page - Page number (default: 1)
         */
        async getUserNotifications(page = 1) {
            return this.get(`/api/admin/notification/getUserNotifications?page=${page}`);
        }

        /**
         * Get unread notifications count
         */
        async getUnreadNotificationsCount() {
            return this.get('/api/admin/notification/getUnreadCount');
        }

        /**
         * Send notification to all users
         * @param {string} message - Notification message
         */
        async sendNotificationToAll(message) {
            return this.post('/api/admin/notification/sendToAll', { message });
        }

        /**
         * Send notification to admins only
         * @param {string} message - Notification message
         */
        async sendNotificationToAdmins(message) {
            return this.post('/api/admin/notification/sendToAdmins', { message });
        }

        /**
         * Send notification to specific user
         * @param {number} userId - User ID
         * @param {string} message - Notification message
         */
        async sendNotificationToUser(userId, message) {
            return this.post('/api/admin/notification/sendToUser', { user_id: userId, message });
        }

        /**
         * Mark all notifications as read
         */
        async markAllNotificationsAsRead() {
            return this.post('/api/admin/notification/markAllAsRead', {});
        }

        /**
         * Mark a single notification as read
         * @param {number} notificationId - The ID of the notification to mark as read
         */
        async markNotificationAsRead(notificationId) {
            return this.post(`/api/admin/notification/${notificationId}/markAsRead`, {});
        }

        // ==================== Whitelist/Blacklist APIs ====================

        /**
         * Get white locations
         */
        async getWhiteLocations(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/white_location/index', params);
        }

        /**
         * Add white location
         */
        async addWhiteLocation(data) {
            return this.post('/api/admin/white_location/store', data);
        }

        /**
         * Update white location
         */
        async updateWhiteLocation(locationId, data) {
            return this.put(`/api/admin/white_location/update/${locationId}`, data);
        }

        /**
         * Delete white location
         */
        async deleteWhiteLocation(locationId) {
            return this.delete(`/api/admin/white_location/delete/${locationId}`);
        }

        /**
         * Get black locations
         */
        async getBlackLocations(page = 1, filters = {}) {
            const params = { page, per_page: 10, ...filters };
            return this.get('/api/admin/black_location/index', params);
        }

        /**
         * Add black location
         */
        async addBlackLocation(data) {
            return this.post('/api/admin/black_location/store', data);
        }

        /**
         * Update black location
         */
        async updateBlackLocation(locationId, data) {
            return this.put(`/api/admin/black_location/update/${locationId}`, data);
        }

        /**
         * Delete black location
         */
        async deleteBlackLocation(locationId) {
            return this.delete(`/api/admin/black_location/delete/${locationId}`);
        }

        /**
         * Terms & Conditions Management
         */
        async getTermsConditions() {
            return this.get('/api/admin/terms-conditions');
        }

        async createTermsConditions(data) {
            return this.post('/api/admin/terms-conditions', data);
        }

        async updateTermsConditions(id, data) {
            return this.put(`/api/admin/terms-conditions/${id}`, data);
        }

        async deleteTermsConditions(id) {
            return this.delete(`/api/admin/terms-conditions/${id}`);
        }

        /**
         * Cookies Policy Management
         */
        async getCookiesPolicy() {
            return this.get('/api/admin/cookie-policy');
        }

        async createCookiesPolicy(data) {
            return this.post('/api/admin/cookie-policy', data);
        }

        async updateCookiesPolicy(id, data) {
            return this.put(`/api/admin/cookie-policy/${id}`, data);
        }

        async deleteCookiesPolicy(id) {
            return this.delete(`/api/admin/cookie-policy/${id}`);
        }

        /**
         * Privacy Policy Management
         */
        async getPrivacyPolicy() {
            return this.get('/api/admin/privacy-policy');
        }

        async createPrivacyPolicy(data) {
            return this.post('/api/admin/privacy-policy', data);
        }

        async updatePrivacyPolicy(id, data) {
            return this.put(`/api/admin/privacy-policy/${id}`, data);
        }

        async deletePrivacyPolicy(id) {
            return this.delete(`/api/admin/privacy-policy/${id}`);
        }
    }

    // Initialize and expose API service
    window.ApiService = new ApiService();
})();

