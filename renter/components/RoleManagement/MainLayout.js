document.addEventListener('DOMContentLoaded', function () {
    loadComponent('components/Header/Header.html', 'header-container');
    loadComponent('components/Sidebar/Sidebar.html', 'sidebar-container');
    loadComponent('components/ThemeCustomizer/ThemeCustomizer.html', 'theme-customizer-container');
    loadComponent('components/RoleManagement/RoleManagement.html', 'role-management-container');
    loadComponent('components/RoleManagement/Modals/UpdateModal.html', 'update-modal-container');
    loadComponent('components/RoleManagement/Modals/DeleteModal.html', 'delete-modal-container');
    loadComponent('components/RoleManagement/Modals/PermissionsModal.html', 'permissions-modal-container');

});

async function loadComponent(url, containerId) {

    await fetch(url)
        .then(response => response.text())
        .then(data => {
            document.getElementById(containerId).innerHTML = data;
        })
        .catch(error => console.error('Error loading component:', error));
}
