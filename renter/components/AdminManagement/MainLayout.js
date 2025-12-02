// Wait for Alpine to be fully initialized before loading components
document.addEventListener('alpine:initialized', async function () {
    setTimeout(async () => {
        await Promise.all([
            loadComponent('components/Header/Header.html', 'header-container'),
            loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container'),
            loadComponent('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container'),
            loadComponent('components/AdminManagement/AdminManagement.html', 'admin-management-container')
        ]);
        
        // Load modals after main content
        await Promise.all([
            loadComponent('components/AdminManagement/Modals/EditModal.html', 'edit-modal-container'),
            loadComponent('components/AdminManagement/Modals/DeleteModal.html', 'delete-modal-container')
        ]);
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
