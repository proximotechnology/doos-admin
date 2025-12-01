// Wait for ComponentLoader to be available
function waitForComponentLoader(maxAttempts = 50, interval = 50) {
    return new Promise((resolve, reject) => {
        const checkLoader = () => {
            if (typeof ComponentLoader !== 'undefined') {
                resolve(ComponentLoader);
            } else if (maxAttempts > 0) {
                maxAttempts--;
                setTimeout(checkLoader, interval);
            } else {
                reject(new Error('ComponentLoader not found'));
            }
        };
        
        checkLoader();
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    // Try to use ComponentLoader, fallback to old method if not available
    waitForComponentLoader()
        .then(async loader => {
            // Use ComponentLoader to load standard layout + UpdateCarManagement component
            await loader.loadStandardLayout([
                { 
                    url: 'components/UpdateCarManagement/UpdateCarManagement.html', 
                    containerId: 'update-car-management-container',
                    options: { 
                        loadScript: false  // Script already loaded in UpdateCar.html
                    }
                }
            ]);
        })
        .catch(error => {
            // Fallback to old method
            loadComponentFallback('components/Header/Header.html', 'header-container');
            loadComponentFallback('components/Sidebar/Sidebar.html', 'sidebar-container');
            loadComponentFallback('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
            loadComponentFallback('components/UpdateCarManagement/UpdateCarManagement.html', 'update-car-management-container');
        });
});

// Fallback function if ComponentLoader is not available
async function loadComponentFallback(url, containerId) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error(`Failed to load ${url}:`, error);
    }
}

