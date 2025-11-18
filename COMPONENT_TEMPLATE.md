# Component Template

Use this template when creating new components.

## File Structure

```
YourComponent/
├── YourComponent.html      # Component template
├── YourComponent.js        # Component logic (Alpine.js)
└── MainLayout.js           # Component loader
```

## YourComponent.html

```html
<div x-data="yourComponent">
    <div class="panel">
        <div class="mb-5 flex flex-col gap-5 lg:flex-row lg:items-center">
            <h5 class="text-lg font-semibold dark:text-white-light">Your Component Title</h5>
        </div>

        <!-- Component content here -->
        <div class="table-responsive">
            <!-- Your table or content -->
        </div>
    </div>
</div>
```

## YourComponent.js

```javascript
document.addEventListener('alpine:init', () => {
    Alpine.data('yourComponent', () => ({
        // Data properties
        items: [],
        loading: false,
        apiBaseUrl: API_CONFIG.BASE_URL_Renter,
        paginationMeta: {},

        // Translation helper
        t(key) {
            return Alpine.store('i18n').t(`${key}`);
        },

        // Initialization
        async init() {
            await this.loadData();
        },

        // Load data from API
        async loadData() {
            try {
                this.loading = true;
                const token = localStorage.getItem('authToken');
                
                if (!token) {
                    coloredToast('danger', this.t('auth_token_missing'));
                    return;
                }

                const response = await fetch(`${this.apiBaseUrl}/api/your-endpoint`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch data');
                }

                const data = await response.json();
                this.items = data.data || data;
                this.paginationMeta = data.meta || {};
            } catch (error) {
                console.error('Error loading data:', error);
                coloredToast('danger', this.t('failed_to_load'));
            } finally {
                this.loading = false;
            }
        },

        // Create new item
        async createItem(itemData) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/your-endpoint`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(itemData)
                });

                if (!response.ok) {
                    throw new Error('Failed to create item');
                }

                coloredToast('success', this.t('item_created_success'));
                await this.loadData();
            } catch (error) {
                console.error('Error creating item:', error);
                coloredToast('danger', this.t('failed_to_create'));
            }
        },

        // Update item
        async updateItem(id, itemData) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/your-endpoint/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(itemData)
                });

                if (!response.ok) {
                    throw new Error('Failed to update item');
                }

                coloredToast('success', this.t('item_updated_success'));
                await this.loadData();
            } catch (error) {
                console.error('Error updating item:', error);
                coloredToast('danger', this.t('failed_to_update'));
            }
        },

        // Delete item
        async deleteItem(id) {
            try {
                const token = localStorage.getItem('authToken');
                const response = await fetch(`${this.apiBaseUrl}/api/your-endpoint/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to delete item');
                }

                coloredToast('success', this.t('item_deleted_success'));
                await this.loadData();
            } catch (error) {
                console.error('Error deleting item:', error);
                coloredToast('danger', this.t('failed_to_delete'));
            }
        }
    }));
});
```

## MainLayout.js

```javascript
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/YourComponent/YourComponent.html', 
            containerId: 'your-component-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/YourComponent/YourComponent.js' 
            }
        }
    ]);
});
```

## HTML Page (YourComponent.html in renter/)

```html
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>Your Component - Doos Doos</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/x-icon" href="favicon.png" />
    <!-- Stylesheets -->
    <link rel="stylesheet" type="text/css" media="screen" href="../assets/css/style.css" />
</head>
<body x-data="main" class="relative overflow-x-hidden font-nunito text-sm font-normal antialiased">
    <!-- Containers -->
    <div id="header-container"></div>
    <div id="sidebar-container"></div>
    <div id="theme-customizer-container"></div>
    
    <div class="main-container min-h-screen text-black dark:text-white-dark">
        <div id="sidebar-container"></div>
        <div class="main-content flex min-h-screen flex-col">
            <div id="header-container"></div>
            <div class="animate__animated p-6">
                <div id="your-component-container"></div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="../assets/js/alpine.min.js"></script>
    <script src="../assets/js/config.js"></script>
    <script src="../assets/js/component-loader.js"></script>
    <script src="components/YourComponent/MainLayout.js"></script>
</body>
</html>
```

## With Modals

If your component needs modals:

### MainLayout.js (with modals)

```javascript
document.addEventListener('DOMContentLoaded', function () {
    ComponentLoader.loadStandardLayout([
        { 
            url: 'components/YourComponent/YourComponent.html', 
            containerId: 'your-component-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/YourComponent/YourComponent.js' 
            }
        },
        { 
            url: 'components/YourComponent/Modals/UpdateModal.html', 
            containerId: 'update-modal-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/YourComponent/Modals/UpdateModal.js' 
            }
        },
        { 
            url: 'components/YourComponent/Modals/DeleteModal.html', 
            containerId: 'delete-modal-container',
            options: { 
                loadScript: true, 
                scriptPath: 'components/YourComponent/Modals/DeleteModal.js' 
            }
        }
    ]);
});
```

## Register Your Component

Add to `assets/js/component-registry.js`:

```javascript
YourComponent: {
    path: 'components/YourComponent/YourComponent',
    containerId: 'your-component-container',
    page: 'renter/YourComponent.html',
    modals: ['UpdateModal', 'DeleteModal'], // if applicable
    description: 'Your component description'
}
```

## Best Practices

1. **Use API_CONFIG** for all API calls
2. **Handle authentication** - Check for auth token
3. **Error handling** - Use try-catch blocks
4. **Loading states** - Show loading indicators
5. **Internationalization** - Use `Alpine.store('i18n').t('key')`
6. **Responsive design** - Use Tailwind responsive classes
7. **Dark mode** - Use Tailwind dark mode classes: `dark:bg-dark`
8. **Toast notifications** - Use `coloredToast()` for user feedback

## Quick Checklist

- [ ] Component HTML created
- [ ] Component JS created with Alpine.js
- [ ] MainLayout.js created
- [ ] HTML page created in renter/
- [ ] Component registered in component-registry.js
- [ ] API endpoints configured
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Internationalization keys added
- [ ] Tested in browser


