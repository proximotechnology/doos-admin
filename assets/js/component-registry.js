/**
 * Component Registry
 * 
 * Central registry of all available components with their metadata.
 * Useful for dynamic component loading and documentation generation.
 */

const ComponentRegistry = {
    // Shared Components
    shared: {
        Header: {
            path: 'components/Header/Header',
            containerId: 'header-container',
            description: 'Top navigation bar with notifications and chat integration',
            dependencies: ['Pusher'],
            required: true
        },
        Sidebar: {
            path: 'components/Sidebar/Sidebar',
            containerId: 'sidebar-container',
            description: 'Main navigation menu',
            required: true
        },
        ThemeCustomizer: {
            path: 'components/ThemeCustomizer/ThemeCustomizer',
            containerId: 'theme-customizer-container',
            description: 'Theme and layout customization',
            required: false
        }
    },

    // Management Components
    management: {
        AdminManagement: {
            path: 'components/AdminManagement/AdminManagement',
            containerId: 'admin-management-container',
            page: 'renter/Admin.html',
            modals: ['EditModal', 'DeleteModal'],
            description: 'Manage admin users and permissions'
        },
        CarManagement: {
            path: 'components/CarManagement/CarManagement',
            containerId: 'car-management-container',
            page: 'renter/Car.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage cars with CRUD operations'
        },
        UserManagement: {
            path: 'components/UserManagement/UserManagement',
            containerId: 'user-management-container',
            page: 'renter/User.html',
            description: 'Manage regular users'
        },
        PlanManagement: {
            path: 'components/PlanManagement/PlanManagement',
            containerId: 'plan-management-container',
            page: 'renter/Plan.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage subscription plans'
        },
        BookingManagement: {
            path: 'components/BookingManagement/BookingManagement',
            containerId: 'booking-management-container',
            page: 'renter/Booking.html',
            description: 'Manage bookings and reservations'
        },
        ContractManagement: {
            path: 'components/ContractManagement/ContractManagement',
            containerId: 'contract-management-container',
            page: 'renter/Contract.html',
            description: 'Manage contracts'
        },
        SubscribeManagement: {
            path: 'components/SubscribeManagement/SubscribeManagement',
            containerId: 'subscribe-management-container',
            page: 'renter/Subscribe.html',
            description: 'Manage user subscriptions'
        },
        WalletManagement: {
            path: 'components/WalletManagement/WalletManagement',
            containerId: 'wallet-management-container',
            page: 'renter/Wallet.html',
            description: 'Manage user wallets and transactions'
        },
        ReviewsManagement: {
            path: 'components/ReviewsManagement/ReviewsManagement',
            containerId: 'reviews-management-container',
            page: 'renter/Reviews.html',
            description: 'Manage user reviews'
        },
        StationsManagement: {
            path: 'components/StationsManagement/StationsManagement',
            containerId: 'stations-management-container',
            page: 'renter/Stations.html',
            description: 'Manage stations'
        },
        BrandManagement: {
            path: 'components/BrandManagement/BrandManagement',
            containerId: 'brand-management-container',
            page: 'renter/BrandCar.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage car brands'
        },
        ModelManagement: {
            path: 'components/ModelManagement/ModelManagement',
            containerId: 'model-management-container',
            page: 'renter/ModelCar.html',
            modals: ['UpdateModal', 'DeleteModal', 'AddYears'],
            description: 'Manage car models'
        },
        CouponManagement: {
            path: 'components/CouponManagement/coupon-management',
            containerId: 'coupon-management-container',
            page: 'renter/Coupon.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage coupons'
        },
        DiscountManagement: {
            path: 'components/DiscountManagement/discount-management',
            containerId: 'discount-management-container',
            page: 'renter/Discount.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage discounts'
        },
        FeaturePlan: {
            path: 'components/FeaturePlan/FeaturePlan',
            containerId: 'feature-plan-management-container',
            page: 'renter/Feature_Plan.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage feature plans'
        },
        FeesManagement: {
            path: 'components/FeesManagement/FeesManagement',
            containerId: 'fees-management-container',
            page: 'renter/fees.html',
            modals: ['UpdateModal'],
            description: 'Manage fees'
        },
        DriverPrice: {
            path: 'components/DriverPrice/DriverPrice',
            containerId: 'driver-price-container',
            page: 'renter/driverprice.html',
            description: 'Manage driver prices'
        },
        TestimonialManagement: {
            path: 'components/TestimonialManagement/TestimonialManagement',
            containerId: 'testimonial-management-container',
            page: 'renter/Testimonial.html',
            modals: ['UpdateModal', 'DeleteModal'],
            description: 'Manage testimonials'
        },
        Tecket: {
            path: 'components/Tecket/TecketManagement',
            containerId: 'tecket',
            page: 'renter/Tecket.html',
            description: 'Manage support tickets'
        },
        RoleManagement: {
            path: 'components/RoleManagement/RoleManagement',
            containerId: 'role-management-container',
            page: 'renter/Role.html',
            modals: ['UpdateModal', 'DeleteModal', 'PermissionsModal'],
            description: 'Manage user roles'
        },
        PermissionsManagement: {
            path: 'components/PermissionsManagement/PermissionsManagement',
            containerId: 'permission-management-container',
            page: 'renter/Permission.html',
            description: 'Manage permissions'
        },
        Blacklist: {
            path: 'components/Blacklist/Blacklist',
            containerId: 'Blacklist-management-container',
            page: 'renter/black_list_location.html',
            description: 'Manage blacklisted locations'
        },
        Whitelist: {
            path: 'components/Whitelist/Whitelist',
            containerId: 'Whitelist-management-container',
            page: 'renter/white_list_location.html',
            description: 'Manage whitelisted locations'
        },
        SubscribeFooter: {
            path: 'components/SubscribeFooter/SubscribeFooter',
            containerId: 'footer-management-container',
            page: 'renter/Subscribe_Footer.html',
            description: 'Manage footer subscriptions'
        },
        ContractPolicies: {
            path: 'components/ContractPolicies/ContractPolicies',
            containerId: 'contract-policies-container',
            page: 'renter/ContractPolicies.html',
            description: 'Manage contract policies'
        },
        Profile: {
            path: 'components/profile/profile',
            containerId: 'profile-container',
            page: 'renter/profile.html',
            description: 'User profile management'
        }
    },

    // Feature Components
    features: {
        Chat: {
            path: 'components/Chat/ChatManagement',
            containerId: 'chat',
            page: 'renter/apps-chat.html',
            dependencies: ['Pusher'],
            description: 'Real-time chat system for customer support'
        }
    },

    /**
     * Get component information
     * @param {string} componentName - Name of the component
     * @returns {Object|null} Component information
     */
    get(componentName) {
        // Search in all categories
        for (const category of Object.values(this)) {
            if (typeof category === 'object' && category[componentName]) {
                return category[componentName];
            }
        }
        return null;
    },

    /**
     * Get all components in a category
     * @param {string} category - Category name (shared, management, features)
     * @returns {Object} Components in category
     */
    getByCategory(category) {
        return this[category] || {};
    },

    /**
     * Get all components
     * @returns {Object} All components
     */
    getAll() {
        return {
            ...this.shared,
            ...this.management,
            ...this.features
        };
    },

    /**
     * Load component using ComponentLoader
     * @param {string} componentName - Name of the component
     * @returns {Promise<void>}
     */
    async load(componentName) {
        const component = this.get(componentName);
        if (!component) {
            throw new Error(`Component ${componentName} not found in registry`);
        }

        if (window.ComponentLoader) {
            return ComponentLoader.loadWithScripts(
                component.path,
                component.containerId
            );
        } else {
            throw new Error('ComponentLoader not available');
        }
    },

    /**
     * Load component with modals
     * @param {string} componentName - Name of the component
     * @returns {Promise<void>}
     */
    async loadWithModals(componentName) {
        const component = this.get(componentName);
        if (!component) {
            throw new Error(`Component ${componentName} not found`);
        }

        if (!window.ComponentLoader) {
            throw new Error('ComponentLoader not available');
        }

        const components = [
            {
                url: `${component.path}.html`,
                containerId: component.containerId,
                options: {
                    loadScript: true,
                    scriptPath: `${component.path}.js`
                }
            }
        ];

        // Load modals if they exist
        if (component.modals) {
            component.modals.forEach(modalName => {
                const modalPath = `${component.path.replace(/\/[^/]+$/, '')}/Modals/${modalName}`;
                components.push({
                    url: `${modalPath}.html`,
                    containerId: `${modalName.toLowerCase()}-modal-container`,
                    options: {
                        loadScript: true,
                        scriptPath: `${modalPath}.js`
                    }
                });
            });
        }

        return ComponentLoader.loadMultiple(components);
    }
};

// Make available globally
window.ComponentRegistry = ComponentRegistry;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentRegistry;
}


