# Doos Admin Dashboard

A comprehensive admin dashboard for managing the Doos platform, featuring separate interfaces for Renter and Uber (property owner) management.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Components](#components)
- [Usage Instructions](#usage-instructions)
- [Development](#development)
- [Deployment](#deployment)

## ✨ Features

- **Dual Interface**: Separate admin panels for Renter and Uber (property owner) management
- **Real-time Chat**: Integrated Pusher-based chat system for customer support
- **Comprehensive Management**: 
  - Car, Model, and Brand Management
  - User and Admin Management
  - Booking and Contract Management
  - Subscription and Plan Management
  - Reviews and Testimonials
  - Wallet and Payment Management
  - Station Management
  - And much more...
- **Multi-language Support**: English and Arabic (AE) support
- **Responsive Design**: Built with Tailwind CSS
- **Dark Mode**: Full dark mode support
- **Component-based Architecture**: Modular and reusable components

## 📁 Project Structure

```
doos-admin/
├── assets/
│   ├── css/              # Stylesheets (Tailwind, custom CSS)
│   ├── js/               # JavaScript files
│   │   ├── config.js     # API configuration
│   │   ├── env-loader.js # Environment variable loader
│   │   ├── component-loader.js # Component loading utility
│   │   ├── component-registry.js # Component registry
│   │   └── core/         # Core utilities
│   └── images/           # Images and assets
├── renter/               # Renter admin interface
│   ├── components/       # Reusable components
│   │   ├── AdminManagement/
│   │   ├── CarManagement/
│   │   ├── Chat/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── ... (30+ components)
│   ├── *.html           # Main pages
│   └── lang/            # Language files
├── uber/                # Uber (property owner) admin interface
│   └── *.html          # Uber admin pages
├── .env.example        # Environment variables template
├── jsconfig.json       # JavaScript configuration
├── package.json        # Dependencies
└── README.md           # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A web server (Apache, Nginx, or any static file server)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd doos-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update with your actual values (see [Configuration](#configuration))

4. **Build Tailwind CSS** (for development with watch mode)
   ```bash
   npm run dev
   ```
   Or build for production:
   ```bash
   npm run build
   ```

5. **Serve the application**
   - For development, use a local server:
     ```bash
     # Using Python
     python -m http.server 8000
     
     # Using Node.js http-server
     npx http-server -p 8000
     ```
   - For production, deploy to your web server (Apache/Nginx)

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# API Configuration
VITE_BASE_URL_RENTER=https://api.doosdoostest.com
VITE_BASE_URL_UBER=https://api.doosdoos.com/api/v1

# Chat Configuration (Pusher)
VITE_PUSHER_APP_KEY=your_pusher_key
VITE_PUSHER_CLUSTER=mt1

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Site Configuration
VITE_SITE_URL=https://admin.doosdoostest.com
```

### Loading Environment Variables

The project uses `env-loader.js` to load environment variables. There are three methods:

1. **Server-side Injection** (Recommended for production):
   Add a script tag in your HTML:
   ```html
   <script type="application/env">
   {
     "VITE_BASE_URL_RENTER": "https://api.doosdoostest.com",
     "VITE_PUSHER_APP_KEY": "your_key"
   }
   </script>
   ```

2. **Meta Tag Injection**:
   ```html
   <meta name="env-config" content='{"VITE_BASE_URL_RENTER":"https://api.doosdoostest.com"}' />
   ```

3. **LocalStorage** (For development):
   ```javascript
   localStorage.setItem('app_env', JSON.stringify({
     VITE_BASE_URL_RENTER: 'http://localhost:8000'
   }));
   ```

### Including Environment Loader

Make sure to include `env-loader.js` before `config.js` in your HTML:

```html
<script src="/assets/js/env-loader.js"></script>
<script src="/assets/js/config.js"></script>
```

## 🧩 Components

### Component Loading System

The project uses a centralized **ComponentLoader** system for efficient component management:

```javascript
// Load component with automatic script loading
await ComponentLoader.loadWithScripts('components/CarManagement/CarManagement', 'car-container');

// Load standard layout (Header, Sidebar, ThemeCustomizer) + your component
await ComponentLoader.loadStandardLayout([
    { url: 'components/YourComponent/YourComponent.html', containerId: 'container' }
]);
```

**Key Files:**
- `assets/js/component-loader.js` - Centralized component loader
- `assets/js/component-registry.js` - Component registry with metadata

**Documentation:**
- [COMPONENT_USAGE.md](./COMPONENT_USAGE.md) - Complete component usage guide
- [COMPONENTS.md](./COMPONENTS.md) - Detailed component documentation
- [COMPONENT_TEMPLATE.md](./COMPONENT_TEMPLATE.md) - Template for new components
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Quick reference guide

### Component Structure

Each component follows this structure:
```
ComponentName/
├── ComponentName.html      # Component template
├── ComponentName.js        # Component logic (Alpine.js)
└── MainLayout.js           # Layout loader (uses ComponentLoader)
```

### Available Components

#### Renter Components
- **AdminManagement**: Admin user management
- **CarManagement**: Car CRUD operations
- **Chat**: Real-time chat interface
- **BookingManagement**: Booking management
- **UserManagement**: User management
- **PlanManagement**: Subscription plan management
- **WalletManagement**: Wallet and payment management
- **ReviewsManagement**: Reviews management
- **StationsManagement**: Station management
- And 20+ more components...

#### Shared Components
- **Header**: Top navigation with notifications
- **Sidebar**: Main navigation menu
- **ThemeCustomizer**: Theme and layout customization

### Using Components

Components are loaded dynamically using the `loadComponent` function:

```javascript
// In MainLayout.js
async function loadComponent(url, containerId) {
    const response = await fetch(url);
    const html = await response.text();
    document.getElementById(containerId).innerHTML = html;
    
    // Load associated JS if exists
    const script = document.createElement('script');
    script.src = url.replace('.html', '.js');
    document.body.appendChild(script);
}
```

## 📖 Usage Instructions

### Accessing the Dashboard

1. **Main Entry Point**: Open `index.html` in your browser
2. **Select Account Type**: Choose between "Renter" or "Uber"
3. **Enter Password**: Use the provided password to access
4. **Login**: After password verification, you'll be redirected to the login page

### Renter Admin Features

- **Dashboard**: Overview of statistics and metrics
- **Car Management**: Manage cars, models, and brands
- **User Management**: Manage users and admins
- **Booking Management**: View and manage bookings
- **Subscription Management**: Manage plans and subscriptions
- **Chat**: Real-time customer support chat
- **Reviews**: Manage user reviews
- **Wallet**: Manage user wallets and transactions

### Uber Admin Features

- **User Management**: Manage property owners
- **Reviews**: View and manage reviews
- **Stations**: Manage stations
- **Content Management**: 
  - Packages
  - Ride Types
  - Countries and Cities
  - Order Rejection Reasons

### API Integration

All components use the `API_CONFIG` object for API endpoints:

```javascript
// Example API call
const token = localStorage.getItem('authToken');
const response = await fetch(`${API_CONFIG.BASE_URL_Renter}/api/endpoint`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    }
});
```

### Authentication

Authentication tokens are stored in `localStorage`:
- Token key: `authToken`
- User data: Retrieved from API on login

### Chat System

The chat system uses Pusher for real-time messaging:

1. **Configuration**: Set in `API_CONFIG.PUSHER`
2. **Channels**: Private channels per user (`chat-private-channel-{userId}`)
3. **Events**: `Private_chat` event for new messages

## 🛠️ Development

### Adding a New Component

1. Create component directory in `renter/components/`
2. Create `ComponentName.html` and `ComponentName.js`
3. Use Alpine.js for reactivity:
   ```javascript
   Alpine.data('componentName', () => ({
       // Component data and methods
   }))
   ```
4. Load component in your page's MainLayout.js

### Styling

- **Tailwind CSS**: Primary styling framework
- **Custom CSS**: Additional styles in `assets/css/style.css`
- **Dark Mode**: Use Tailwind dark mode classes: `dark:bg-dark`

### Internationalization

Language files are in `renter/lang/` and `assets/js/lang/`:
- `en.json`: English translations
- `ae.json`: Arabic translations

Access translations via Alpine store:
```javascript
Alpine.store('i18n').t('key')
```

## 🚢 Deployment

### Build for Production

1. **Update environment variables** in `.env`
2. **Build Tailwind CSS**:
   ```bash
   npm run build
   ```
3. **Deploy files** to your web server

### Server Configuration

For Apache, use the provided `.htaccess` file which includes:
- Directory indexing disabled
- Security headers
- Caching rules
- Error handling

### Environment Setup

For production, inject environment variables server-side:

**PHP Example**:
```php
<script type="application/env">
<?php
echo json_encode([
    'VITE_BASE_URL_RENTER' => getenv('VITE_BASE_URL_RENTER'),
    'VITE_PUSHER_APP_KEY' => getenv('VITE_PUSHER_APP_KEY'),
    // ... other vars
]);
?>
</script>
```

**Node.js Example**:
```javascript
const envVars = {
    VITE_BASE_URL_RENTER: process.env.VITE_BASE_URL_RENTER,
    // ... other vars
};
// Inject into HTML template
```

## 📝 API Endpoints

### Renter API Base: `API_CONFIG.BASE_URL_Renter`
- `/api/login` - User authentication
- `/api/car/*` - Car management
- `/api/user/*` - User management
- `/api/chat/*` - Chat endpoints
- `/api/booking/*` - Booking management
- And more...

### Uber API Base: `API_CONFIG.BASE_URL_Uber`
- `/api/admin/*` - Admin endpoints
- `/api/review/*` - Review management
- And more...

## 🔒 Security Notes

- Never commit `.env` file to version control
- Keep API keys and secrets secure
- Use HTTPS in production
- Implement proper CORS policies
- Validate all user inputs
- Use authentication tokens for API calls

## 📄 License

[Your License Here]

## 🤝 Support

For support, please contact [your support email] or open an issue in the repository.

---

**Note**: This is a frontend-only application. Make sure your backend API is properly configured and accessible.

