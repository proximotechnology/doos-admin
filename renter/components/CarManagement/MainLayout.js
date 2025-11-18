/**
 * CarManagement MainLayout
 * 
 * Uses ComponentLoader for efficient component loading.
 * Loads Header, Sidebar, ThemeCustomizer, and CarManagement component.
 */

// Function to wait for ComponentLoader to be available
function waitForComponentLoader(maxAttempts = 50, interval = 50) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkLoader = () => {
            attempts++;
            const loader = window.ComponentLoader;
            
            if (loader && typeof loader.loadStandardLayout === 'function') {
                resolve(loader);
            } else if (attempts >= maxAttempts) {
                reject(new Error('ComponentLoader not available after ' + maxAttempts + ' attempts'));
            } else {
                setTimeout(checkLoader, interval);
            }
        };
        
        checkLoader();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Try to use ComponentLoader, fallback to old method if not available
    waitForComponentLoader()
        .then(loader => {
            // Use ComponentLoader to load standard layout + CarManagement component
            // Note: Component scripts are already loaded in Car.html, so we only load HTML
            return loader.loadStandardLayout([
                { 
                    url: 'components/CarManagement/CarManagement.html', 
                    containerId: 'car-management-container',
                    options: { 
                        loadScript: false  // Script already loaded in Car.html
                    }
                }
            ]);
        })
        .catch(error => {
            // Fallback to old method
            loadComponentFallback('components/Header/Header.html', 'header-container');
            loadComponentFallback('components/Sidebar/Sidebar.html', 'sidebar-container');
            loadComponentFallback('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
            loadComponentFallback('components/CarManagement/CarManagement.html', 'car-management-container');
        });
});

// Fallback function if ComponentLoader is not available
async function loadComponentFallback(url, containerId) {
    try {
        const response = await fetch(url);
        const data = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = data;
        }
    } catch (error) {
        // Silently handle error
    }
}
