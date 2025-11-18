# Components Documentation

This document provides detailed information about all components in the Doos Admin Dashboard.

## Component Architecture

All components follow a consistent structure:
- **HTML Template**: Component markup
- **JavaScript Logic**: Alpine.js data and methods
- **MainLayout.js**: Component loader (for page-level components)

## Renter Components

### AdminManagement
**Location**: `renter/components/AdminManagement/`

**Purpose**: Manage admin users and their permissions

**Files**:
- `AdminManagement.html` - Main component template
- `AdminManagement.js` - Component logic
- `MainLayout.js` - Layout loader
- `Modals/DeleteModal.html` - Delete confirmation modal
- `Modals/DeleteModal.js` - Delete modal logic
- `Modals/EditModal.html` - Edit admin modal
- `Modals/EditModal.js` - Edit modal logic

**Usage**: Access via `renter/Admin.html`

---

### CarManagement
**Location**: `renter/components/CarManagement/`

**Purpose**: Manage cars, including CRUD operations

**Files**:
- `CarManagement.html` - Main component template
- `CarManagement.js` - Component logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Car.html`

**API Endpoints**:
- GET `/api/car/all` - Fetch all cars
- POST `/api/car/create` - Create new car
- PUT `/api/car/update/{id}` - Update car
- DELETE `/api/car/delete/{id}` - Delete car

---

### Chat
**Location**: `renter/components/Chat/`

**Purpose**: Real-time chat system for customer support

**Files**:
- `ChatManagement.html` - Chat interface template
- `ChatManagement.js` - Chat logic with Pusher integration
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/apps-chat.html`

**Features**:
- Real-time messaging via Pusher
- Online/offline status
- Unread message count
- Message history
- User search

**Configuration**:
- Uses `API_CONFIG.PUSHER` for Pusher configuration
- Channel format: `chat-private-channel-{userId}`

---

### BookingManagement
**Location**: `renter/components/BookingManagement/`

**Purpose**: Manage bookings and reservations

**Files**:
- `BookingManagement.html` - Booking list template
- `BookingManagement.js` - Booking logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Booking.html`

---

### UserManagement
**Location**: `renter/components/UserManagement/`

**Purpose**: Manage regular users

**Files**:
- `UserManagement.html` - User list template
- `UserManagement.js` - User management logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/User.html`

---

### PlanManagement
**Location**: `renter/components/PlanManagement/`

**Purpose**: Manage subscription plans

**Files**:
- `PlanManagement.html` - Plan list template
- `PlanManagement.js` - Plan management logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit plan modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete plan modal
- `Modals/DeleteModal.js` - Delete modal logic

**Usage**: Access via `renter/Plan.html`

---

### SubscribeManagement
**Location**: `renter/components/SubscribeManagement/`

**Purpose**: Manage user subscriptions

**Files**:
- `SubscribeManagement.html` - Subscription list template
- `SubscribeManagement.js` - Subscription logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Subscribe.html`

---

### WalletManagement
**Location**: `renter/components/WalletManagement/`

**Purpose**: Manage user wallets and transactions

**Files**:
- `WalletManagement.html` - Wallet list template
- `WalletManagement.js` - Wallet management logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Wallet.html`

---

### ReviewsManagement
**Location**: `renter/components/ReviewsManagement/`

**Purpose**: Manage user reviews

**Files**:
- `ReviewsManagement.html` - Reviews list template
- `ReviewsManagement.js` - Reviews logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Reviews.html`

---

### StationsManagement
**Location**: `renter/components/StationsManagement/`

**Purpose**: Manage stations

**Files**:
- `StationsManagement.html` - Stations list template
- `StationsManagement.js` - Stations logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Stations.html`

---

### BrandManagement
**Location**: `renter/components/BrandManagement/`

**Purpose**: Manage car brands

**Files**:
- `BrandManagement.html` - Brand list template
- `BrandManagement.js` - Brand management logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit brand modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete brand modal
- `Modals/DeleteModal.js` - Delete modal logic

**Usage**: Access via `renter/BrandCar.html`

---

### ModelManagement
**Location**: `renter/components/ModelManagement/`

**Purpose**: Manage car models

**Files**:
- `ModelManagement.html` - Model list template
- `ModelManagement.js` - Model management logic
- `ModelDetails.html` - Model details view
- `ModelDetails.js` - Model details logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit model modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete model modal
- `Modals/DeleteModal.js` - Delete modal logic
- `Modals/AddYears.html` - Add years modal
- `Modals/deleteYearModal.js` - Delete year modal

**Usage**: Access via `renter/ModelCar.html` or `renter/model-details.html`

---

### ContractManagement
**Location**: `renter/components/ContractManagement/`

**Purpose**: Manage contracts

**Files**:
- `ContractManagement.html` - Contract list template
- `ContractManagement.js` - Contract logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Contract.html`

---

### ContractPolicies
**Location**: `renter/components/ContractPolicies/`

**Purpose**: Manage contract policies

**Files**:
- `ContractPolicies.html` - Policies list template
- `ContractPolicies.js` - Policies logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/ContractPolicies.html`

---

### CouponManagement
**Location**: `renter/components/CouponManagement/`

**Purpose**: Manage coupons

**Files**:
- `coupon-management.html` - Coupon list template
- `coupon-management.js` - Coupon management logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit coupon modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete coupon modal
- `Modals/DeleteModal.js` - Delete modal logic

**Usage**: Access via `renter/Coupon.html`

---

### DiscountManagement
**Location**: `renter/components/DiscountManagement/`

**Purpose**: Manage discounts

**Files**:
- `discount-management.html` - Discount list template
- `discount-management.js` - Discount management logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit discount modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete discount modal
- `Modals/DeleteModal.js` - Delete modal logic

**Usage**: Access via `renter/Discount.html`

---

### FeaturePlan
**Location**: `renter/components/FeaturePlan/`

**Purpose**: Manage feature plans

**Files**:
- `FeaturePlan.html` - Feature plan list template
- `FeaturePlan.js` - Feature plan logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit feature plan modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete feature plan modal
- `Modals/DeleteModal.js` - Delete modal logic

**Usage**: Access via `renter/Feature_Plan.html`

---

### FeesManagement
**Location**: `renter/components/FeesManagement/`

**Purpose**: Manage fees

**Files**:
- `FeesManagement.html` - Fees list template
- `FeesManagement.js` - Fees management logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit fee modal
- `Modals/UpdateModal.js` - Edit modal logic

**Usage**: Access via `renter/fees.html`

---

### DriverPrice
**Location**: `renter/components/DriverPrice/`

**Purpose**: Manage driver prices

**Files**:
- `DriverPrice.html` - Driver price list template
- `DriverPrice.js` - Driver price logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/driverprice.html`

---

### TestimonialManagement
**Location**: `renter/components/TestimonialManagement/`

**Purpose**: Manage testimonials

**Files**:
- `TestimonialManagement.html` - Testimonial list template
- `TestimonialManagement.js` - Testimonial logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit testimonial modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete testimonial modal
- `Modals/DeleteModal.js` - Delete modal logic

**Usage**: Access via `renter/Testimonial.html`

---

### Tecket (Support Tickets)
**Location**: `renter/components/Tecket/`

**Purpose**: Manage support tickets

**Files**:
- `TecketManagement.html` - Ticket list template
- `TecketManagement.js` - Ticket management logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Tecket.html`

**Features**:
- Ticket filtering by status and priority
- Search functionality
- Ticket details view

---

### RoleManagement
**Location**: `renter/components/RoleManagement/`

**Purpose**: Manage user roles

**Files**:
- `RoleManagement.html` - Role list template
- `RoleManagement.js` - Role management logic
- `MainLayout.js` - Layout loader
- `Modals/UpdateModal.html` - Edit role modal
- `Modals/UpdateModal.js` - Edit modal logic
- `Modals/DeleteModal.html` - Delete role modal
- `Modals/DeleteModal.js` - Delete modal logic
- `Modals/PermissionsModal.html` - Permissions assignment modal
- `Modals/PermissionsModal.js` - Permissions modal logic

**Usage**: Access via `renter/Role.html`

---

### PermissionsManagement
**Location**: `renter/components/PermissionsManagement/`

**Purpose**: Manage permissions

**Files**:
- `PermissionsManagement.html` - Permissions list template
- `PermissionsManagement.js` - Permissions logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Permission.html`

---

### Blacklist
**Location**: `renter/components/Blacklist/`

**Purpose**: Manage blacklisted locations

**Files**:
- `Blacklist.html` - Blacklist template
- `Blacklist.js` - Blacklist logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/black_list_location.html`

---

### Whitelist
**Location**: `renter/components/Whitelist/`

**Purpose**: Manage whitelisted locations

**Files**:
- `Whitelist.html` - Whitelist template
- `Whitelist.js` - Whitelist logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/white_list_location.html`

---

### SubscribeFooter
**Location**: `renter/components/SubscribeFooter/`

**Purpose**: Manage footer subscriptions

**Files**:
- `SubscribeFooter.html` - Footer subscription template
- `SubscribeFooter.js` - Footer subscription logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/Subscribe_Footer.html`

---

### Profile
**Location**: `renter/components/profile/`

**Purpose**: User profile management

**Files**:
- `profile.html` - Profile template
- `profile.js` - Profile logic
- `MainLayout.js` - Layout loader

**Usage**: Access via `renter/profile.html`

---

## Shared Components

### Header
**Location**: `renter/components/Header/`

**Purpose**: Top navigation bar with notifications and chat integration

**Files**:
- `Header.html` - Header template
- `Header.js` - Header logic with Pusher integration

**Features**:
- User menu
- Language switcher
- Chat notifications
- Unread message count
- Theme toggle

**Usage**: Loaded automatically in all pages via MainLayout.js

---

### Sidebar
**Location**: `renter/components/Sidebar/`

**Purpose**: Main navigation menu

**Files**:
- `Sidebar.html` - Sidebar template
- `Sidebar.js` - Sidebar logic

**Features**:
- Collapsible menu
- Active route highlighting
- Multi-level navigation
- RTL support

**Usage**: Loaded automatically in all pages via MainLayout.js

---

### ThemeCustomizer
**Location**: `renter/components/ThemeCustomizer/`

**Purpose**: Theme and layout customization

**Files**:
- `ThemeCustomizer.html` - Customizer template
- `ThemeCustomizer.js` - Customizer logic

**Features**:
- Theme selection (light/dark)
- Layout options
- Color schemes
- RTL/LTR toggle

**Usage**: Loaded automatically in all pages via MainLayout.js

---

## Component Development Guidelines

### Creating a New Component

1. **Create Component Directory**
   ```
   renter/components/YourComponent/
   ├── YourComponent.html
   ├── YourComponent.js
   └── MainLayout.js (if page-level)
   ```

2. **Component Template (HTML)**
   ```html
   <div x-data="yourComponent">
       <!-- Component markup -->
   </div>
   ```

3. **Component Logic (JavaScript)**
   ```javascript
   document.addEventListener('alpine:init', () => {
       Alpine.data('yourComponent', () => ({
           // Data
           items: [],
           loading: false,
           apiBaseUrl: API_CONFIG.BASE_URL_Renter,
           
           // Methods
           async init() {
               await this.loadData();
           },
           
           async loadData() {
               // Load data logic
           }
       }));
   });
   ```

4. **MainLayout.js (for page-level components)**
   ```javascript
   document.addEventListener('DOMContentLoaded', function () {
       loadComponent('components/Header/Header.html', 'header-container');
       loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container');
       loadComponent('components/YourComponent/YourComponent.html', 'component-container');
   });
   ```

### Best Practices

1. **Use API_CONFIG** for all API endpoints
2. **Handle authentication** - Check for auth token
3. **Error handling** - Use try-catch blocks
4. **Loading states** - Show loading indicators
5. **Internationalization** - Use `Alpine.store('i18n').t('key')`
6. **Responsive design** - Use Tailwind responsive classes
7. **Dark mode** - Use Tailwind dark mode classes

### API Integration Pattern

```javascript
async fetchData() {
    try {
        this.loading = true;
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${this.apiBaseUrl}/api/endpoint`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch');
        
        const data = await response.json();
        this.items = data.data || data;
    } catch (error) {
        console.error('Error:', error);
        coloredToast('danger', 'Failed to load data');
    } finally {
        this.loading = false;
    }
}
```

---

## Component Dependencies

### Required Scripts
- Alpine.js - Reactive framework
- Tailwind CSS - Styling
- Pusher - Real-time chat
- Simple DataTables - Table functionality
- SweetAlert - Notifications

### Global Objects
- `API_CONFIG` - API configuration
- `Alpine.store('i18n')` - Internationalization
- `coloredToast()` - Toast notifications

