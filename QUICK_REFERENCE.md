# Component Usage Quick Reference

Quick reference guide for common component operations.

## Loading Components

### Load Single Component
```javascript
await ComponentLoader.loadWithScripts('components/CarManagement/CarManagement', 'car-container');
```

### Load Standard Layout
```javascript
await ComponentLoader.loadStandardLayout([
    { url: 'components/YourComponent/YourComponent.html', containerId: 'container' }
]);
```

### Load Using Registry
```javascript
await ComponentRegistry.load('CarManagement');
await ComponentRegistry.loadWithModals('CarManagement');
```

## Component Registry Lookup

```javascript
// Get component info
const component = ComponentRegistry.get('CarManagement');

// Get all components
const all = ComponentRegistry.getAll();

// Get by category
const management = ComponentRegistry.getByCategory('management');
```

## Common Patterns

### Standard Page Setup
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

### API Call Pattern
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
        const data = await response.json();
        this.items = data.data || data;
    } catch (error) {
        coloredToast('danger', 'Error message');
    } finally {
        this.loading = false;
    }
}
```

### Alpine.js Component Template
```javascript
Alpine.data('componentName', () => ({
    items: [],
    loading: false,
    apiBaseUrl: API_CONFIG.BASE_URL_Renter,
    
    async init() {
        await this.loadData();
    },
    
    t(key) {
        return Alpine.store('i18n').t(key);
    }
}));
```

## Component List

### Shared (Always Load)
- `Header` - `header-container`
- `Sidebar` - `sidebar-container`
- `ThemeCustomizer` - `theme-customizer-container`

### Management Components
- `CarManagement` - `car-management-container`
- `UserManagement` - `user-management-container`
- `PlanManagement` - `plan-management-container`
- `BookingManagement` - `booking-management-container`
- `Chat` - `chat`
- ... (see COMPONENTS.md for full list)

## Container IDs Pattern

```
{component-name}-container
{component-name}-management-container
{modal-name}-modal-container
```

## File Paths

### Component Files
```
components/{ComponentName}/{ComponentName}.html
components/{ComponentName}/{ComponentName}.js
components/{ComponentName}/MainLayout.js
```

### Modals
```
components/{ComponentName}/Modals/{ModalName}.html
components/{ComponentName}/Modals/{ModalName}.js
```

## Common Issues

### Component Not Loading
- Check container ID exists in HTML
- Verify file paths are correct
- Check browser console for errors

### Scripts Not Executing
- Ensure ComponentLoader is loaded first
- Check script paths
- Wait for Alpine.js: `waitForAlpine: true`

### API Errors
- Verify `API_CONFIG` is loaded
- Check authentication token
- Verify CORS settings

## Useful Commands

```javascript
// Check if component loaded
ComponentLoader.isLoaded('components/Header/Header.html');

// Clear cache
ComponentLoader.clearCache();

// Get component info
ComponentRegistry.get('CarManagement');
```


