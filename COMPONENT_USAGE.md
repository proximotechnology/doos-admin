# Component Usage Guide

Complete guide on how to access and use all components in the Doos Admin Dashboard.

## Table of Contents

- [Component Loading Methods](#component-loading-methods)
- [Standard Component Patterns](#standard-component-patterns)
- [Component Reference](#component-reference)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Component Loading Methods

### Method 1: Using ComponentLoader (Recommended)

The centralized `ComponentLoader` utility provides the best way to load components.

#### Basic Usage

```javascript
// Load HTML only
await ComponentLoader.load('components/Header/Header.html', 'header-container');

// Load HTML + JavaScript automatically
await ComponentLoader.loadWithScripts('components/CarManagement/CarManagement', 'car-container');

// Load with options
await ComponentLoader.load('components/Chat/ChatManagement.html', 'chat-container', {
    loadScript: true,
    scriptPath: 'components/Chat/ChatManagement.js',
    waitForAlpine: true
});
```

#### Load Standard Layout

```javascript
// Load Header, Sidebar, ThemeCustomizer + your component
await ComponentLoader.loadStandardLayout([
    { 
        url: 'components/CarManagement/CarManagement.html', 
        containerId: 'car-container',
        options: { loadScript: true, scriptPath: 'components/CarManagement/CarManagement.js' }
    }
]);
```

#### Load Multiple Components

```javascript
await ComponentLoader.loadMultiple([
    { url: 'components/Header/Header.html', containerId: 'header-container' },
    { url: 'components/Sidebar/Sidebar.html', containerId: 'sidebar-container' },
    { url: 'components/CarManagement/CarManagement.html', containerId: 'car-container' }
]);
```

#### Load Modals

```javascript
await ComponentLoader.loadModal('components/CarManagement/Modals/UpdateModal.html', 'update-modal-container');
```

### Method 2: Using MainLayout.js Pattern

For page-level components, use the `MainLayout.js` pattern:

```javascript
// In MainLayout.js
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/YourComponent/YourComponent.html', 
            containerId: 'your-component-container',
            options: { loadScript: true, scriptPath: 'components/YourComponent/YourComponent.js' }
        }
    ]);
});
```

### Method 3: Direct Script Inclusion (Legacy)

For components that need immediate execution:

```html
<!-- In your HTML file -->
<script src="components/Header/Header.js"></script>
<script src="components/CarManagement/CarManagement.js"></script>
<script src="components/CarManagement/MainLayout.js"></script>
```

## Standard Component Patterns

### Pattern 1: Page-Level Component

**Structure:**
```
YourComponent/
├── YourComponent.html
├── YourComponent.js
└── MainLayout.js
```

**MainLayout.js:**
```javascript
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/YourComponent/YourComponent.html', 
            containerId: 'your-component-container',
            options: { loadScript: true, scriptPath: 'components/YourComponent/YourComponent.js' }
        }
    ]);
});
```

**HTML Page:**
```html
<div id="header-container"></div>
<div id="sidebar-container"></div>
<div id="theme-customizer-container"></div>
<div id="your-component-container"></div>

<script src="../assets/js/component-loader.js"></script>
<script src="components/YourComponent/MainLayout.js"></script>
```

### Pattern 2: Component with Modals

**MainLayout.js:**
```javascript
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/CarManagement/CarManagement.html', 
            containerId: 'car-container',
            options: { loadScript: true, scriptPath: 'components/CarManagement/CarManagement.js' }
        },
        { 
            url: 'components/CarManagement/Modals/UpdateModal.html', 
            containerId: 'update-modal-container',
            options: { loadScript: true, scriptPath: 'components/CarManagement/Modals/UpdateModal.js' }
        },
        { 
            url: 'components/CarManagement/Modals/DeleteModal.html', 
            containerId: 'delete-modal-container',
            options: { loadScript: true, scriptPath: 'components/CarManagement/Modals/DeleteModal.js' }
        }
    ]);
});
```

### Pattern 3: Conditional Component Loading

```javascript
document.addEventListener('DOMContentLoaded', function () {
    const currentPage = window.location.pathname;
    
    const baseComponents = [
        { url: 'components/Header/Header.html', containerId: 'header-container' },
        { url: 'components/Sidebar/Sidebar.html', containerId: 'sidebar-container' }
    ];

    if (currentPage.includes('details')) {
        baseComponents.push({
            url: 'components/ModelManagement/ModelDetails.html',
            containerId: 'model-details-container'
        });
    } else {
        baseComponents.push({
            url: 'components/ModelManagement/ModelManagement.html',
            containerId: 'model-management-container'
        });
    }

    ComponentLoader.loadMultiple(baseComponents);
});
```

## Component Reference

### Shared Components

#### Header
```javascript
// Load Header component
await ComponentLoader.loadWithScripts('components/Header/Header', 'header-container');
```
**Container ID:** `header-container`  
**Features:** Navigation, notifications, chat integration, language switcher

#### Sidebar
```javascript
await ComponentLoader.loadWithScripts('components/Sidebar/Sidebar', 'sidebar-container');
```
**Container ID:** `sidebar-container`  
**Features:** Main navigation menu, collapsible, active route highlighting

#### ThemeCustomizer
```javascript
await ComponentLoader.loadWithScripts('components/ThemeCustomizer/ThemeCustomizer', 'theme-customizer-container');
```
**Container ID:** `theme-customizer-container`  
**Features:** Theme selection, layout options, RTL/LTR toggle

### Management Components

#### CarManagement
```javascript
await ComponentLoader.loadWithScripts('components/CarManagement/CarManagement', 'car-management-container');
```
**Page:** `renter/Car.html`  
**Container ID:** `car-management-container`  
**Modals:** UpdateModal, DeleteModal

#### UserManagement
```javascript
await ComponentLoader.loadWithScripts('components/UserManagement/UserManagement', 'user-management-container');
```
**Page:** `renter/User.html`  
**Container ID:** `user-management-container`

#### PlanManagement
```javascript
await ComponentLoader.loadWithScripts('components/PlanManagement/PlanManagement', 'plan-management-container');
```
**Page:** `renter/Plan.html`  
**Container ID:** `plan-management-container`  
**Modals:** UpdateModal, DeleteModal

#### BookingManagement
```javascript
await ComponentLoader.loadWithScripts('components/BookingManagement/BookingManagement', 'booking-management-container');
```
**Page:** `renter/Booking.html`  
**Container ID:** `booking-management-container`

#### Chat
```javascript
await ComponentLoader.loadWithScripts('components/Chat/ChatManagement', 'chat');
```
**Page:** `renter/apps-chat.html`  
**Container ID:** `chat`  
**Features:** Real-time messaging, Pusher integration

### Complete Component List

See [COMPONENTS.md](./COMPONENTS.md) for the complete list of all 30+ components.

## Best Practices

### 1. Always Use ComponentLoader

```javascript
// ✅ Good
await ComponentLoader.loadWithScripts('components/CarManagement/CarManagement', 'car-container');

// ❌ Avoid (duplicated code)
async function loadComponent(url, containerId) {
    // ... duplicate implementation
}
```

### 2. Load Standard Layout First

```javascript
// ✅ Good - Loads Header, Sidebar, ThemeCustomizer automatically
await ComponentLoader.loadStandardLayout([
    { url: 'components/YourComponent/YourComponent.html', containerId: 'container' }
]);

// ❌ Avoid - Manual loading
await ComponentLoader.load('components/Header/Header.html', 'header-container');
await ComponentLoader.load('components/Sidebar/Sidebar.html', 'sidebar-container');
// ... etc
```

### 3. Handle Loading Errors

```javascript
try {
    await ComponentLoader.loadWithScripts('components/CarManagement/CarManagement', 'car-container');
} catch (error) {
    console.error('Failed to load component:', error);
    // Show error message to user
    coloredToast('danger', 'Failed to load component');
}
```

### 4. Wait for Alpine.js

```javascript
// ✅ Good - Waits for Alpine.js initialization
await ComponentLoader.load('components/Chat/ChatManagement.html', 'chat', {
    loadScript: true,
    waitForAlpine: true
});

// ❌ Avoid - May execute before Alpine is ready
ComponentLoader.load('components/Chat/ChatManagement.html', 'chat');
```

### 5. Use Container IDs Consistently

Follow the naming pattern: `{component-name}-container`

```javascript
// ✅ Good
'car-management-container'
'user-management-container'
'plan-management-container'

// ❌ Avoid
'car'
'userContainer'
'plan_management'
```

## Examples

### Example 1: Simple Page Component

**File: `renter/components/SimpleComponent/MainLayout.js`**
```javascript
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/SimpleComponent/SimpleComponent.html', 
            containerId: 'simple-component-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/SimpleComponent/SimpleComponent.js' 
            }
        }
    ]);
});
```

**File: `renter/Simple.html`**
```html
<!DOCTYPE html>
<html>
<head>
    <!-- Head content -->
</head>
<body>
    <div id="header-container"></div>
    <div id="sidebar-container"></div>
    <div id="theme-customizer-container"></div>
    <div id="simple-component-container"></div>
    
    <!-- Scripts -->
    <script src="../assets/js/component-loader.js"></script>
    <script src="components/SimpleComponent/MainLayout.js"></script>
</body>
</html>
```

### Example 2: Component with Multiple Modals

**File: `renter/components/CarManagement/MainLayout.js`**
```javascript
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/CarManagement/CarManagement.html', 
            containerId: 'car-management-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/CarManagement/CarManagement.js' 
            }
        },
        { 
            url: 'components/CarManagement/Modals/UpdateModal.html', 
            containerId: 'update-modal-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/CarManagement/Modals/UpdateModal.js' 
            }
        },
        { 
            url: 'components/CarManagement/Modals/DeleteModal.html', 
            containerId: 'delete-modal-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/CarManagement/Modals/DeleteModal.js' 
            }
        }
    ]);
});
```

### Example 3: Dynamic Component Loading

```javascript
async function loadComponentBasedOnRoute() {
    const route = window.location.pathname;
    let componentPath;
    let containerId;

    if (route.includes('car')) {
        componentPath = 'components/CarManagement/CarManagement';
        containerId = 'car-management-container';
    } else if (route.includes('user')) {
        componentPath = 'components/UserManagement/UserManagement';
        containerId = 'user-management-container';
    } else {
        componentPath = 'components/Dashboard/Dashboard';
        containerId = 'dashboard-container';
    }

    await ComponentLoader.loadStandardLayout([
        { 
            url: `${componentPath}.html`, 
            containerId,
            options: { 
                loadScript: true, 
                scriptPath: `${componentPath}.js` 
            }
        }
    ]);
}

document.addEventListener('DOMContentLoaded', loadComponentBasedOnRoute);
```

### Example 4: Lazy Loading Components

```javascript
// Load component when user scrolls to section
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            ComponentLoader.loadWithScripts(
                'components/ReviewsManagement/ReviewsManagement',
                'reviews-container'
            );
            observer.unobserve(entry.target);
        }
    });
});

const lazyContainer = document.getElementById('lazy-load-container');
if (lazyContainer) {
    observer.observe(lazyContainer);
}
```

## Component Events

Components dispatch events when loaded:

```javascript
document.addEventListener('component:loaded', (event) => {
    const { url, containerId } = event.detail;
    console.log(`Component ${url} loaded in ${containerId}`);
    
    // Initialize additional functionality
    if (containerId === 'chat-container') {
        // Chat-specific initialization
    }
});
```

## Troubleshooting

### Component Not Loading

1. **Check container exists:**
   ```javascript
   const container = document.getElementById('container-id');
   if (!container) {
       console.error('Container not found');
   }
   ```

2. **Check file paths:**
   - Ensure paths are relative to current page
   - Check for typos in component names

3. **Check console errors:**
   - Network errors (404, CORS)
   - JavaScript errors in component files

### Scripts Not Executing

1. **Ensure ComponentLoader is loaded first:**
   ```html
   <script src="../assets/js/component-loader.js"></script>
   ```

2. **Check script paths are correct**

3. **Wait for Alpine.js:**
   ```javascript
   await ComponentLoader.load('component.html', 'container', {
       waitForAlpine: true
   });
   ```

### Alpine.js Not Working

1. **Ensure Alpine.js is loaded:**
   ```html
   <script src="../assets/js/alpine.min.js"></script>
   ```

2. **Wait for Alpine initialization:**
   ```javascript
   document.addEventListener('alpine:init', () => {
       // Your code here
   });
   ```

## Migration Guide

### Migrating from Old loadComponent

**Old Pattern:**
```javascript
async function loadComponent(url, containerId) {
    await fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
        });
}
```

**New Pattern:**
```javascript
// Replace with ComponentLoader
await ComponentLoader.loadWithScripts('components/ComponentName/ComponentName', 'container-id');
```

---

For more details on specific components, see [COMPONENTS.md](./COMPONENTS.md).


