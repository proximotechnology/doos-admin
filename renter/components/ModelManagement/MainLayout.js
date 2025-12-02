// Wait for Alpine to be fully initialized before loading components
document.addEventListener('alpine:initialized', async function () {
    setTimeout(async () => {
        const currentPage = window.location.pathname;

        await Promise.all([
            loadComponent('components/Header/Header.html', 'header-container'),
            loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container'),
            loadComponent('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container')
        ]);

        if (currentPage.includes('model-details.html')) {
            await Promise.all([
                loadComponent('components/ModelManagement/ModelDetails.html', 'model-details-container'),
                loadComponent('components/ModelManagement/Modals/AddYears.html', 'update-modal-container')
            ]);
        } else {
            await loadComponent('components/ModelManagement/ModelManagement.html', 'model-management-container');
            await Promise.all([
                loadComponent('components/ModelManagement/Modals/UpdateModal.html', 'update-modal-container'),
                loadComponent('components/ModelManagement/Modals/DeleteModal.html', 'delete-modal-container')
            ]);
        }
    }, 100);
});

async function loadComponent(url, containerId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component ${url}:`, error);
    }
}
