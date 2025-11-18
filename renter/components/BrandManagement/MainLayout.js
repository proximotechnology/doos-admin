document.addEventListener('DOMContentLoaded', function () {
    loadComponent('components/Header/Header.html', 'header-container');
    loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container');
    loadComponent('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
    loadComponent('components/BrandManagement/BrandManagement.html', 'brand-management-container');
    loadComponent('components/BrandManagement/Modals/UpdateModal.html', 'update-modal-container');
    loadComponent('components/BrandManagement/Modals/DeleteModal.html', 'delete-modal-container');
});

async function loadComponent(url, containerId) {

    await fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
        })
        .catch(error => {
            // Silently handle error
        });
}
