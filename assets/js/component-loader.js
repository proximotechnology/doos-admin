/**
 * Component Loader Utility
 * 
 * Centralized component loading system for the Doos Admin Dashboard.
 * Handles loading of HTML templates and associated JavaScript files.
 * 
 * Usage:
 *   ComponentLoader.load('components/Header/Header.html', 'header-container')
 *   ComponentLoader.loadMultiple([...])
 *   ComponentLoader.loadWithScripts('components/CarManagement', 'car-container')
 */

class ComponentLoader {
    constructor() {
        this.loadedComponents = new Set();
        this.loadedScripts = new Set();
        this.loadingPromises = new Map();
        
        // Initialize loaded scripts from existing DOM scripts
        this._initializeLoadedScripts();
    }
    
    /**
     * Initialize loaded scripts from existing DOM
     * @private
     */
    _initializeLoadedScripts() {
        const allScripts = document.querySelectorAll('script[src]');
        allScripts.forEach(script => {
            const src = script.getAttribute('src');
            if (src) {
                // Add exact path
                this.loadedScripts.add(src);
                // Add relative path if different
                if (src.startsWith('../')) {
                    this.loadedScripts.add(src.substring(3));
                } else if (!src.startsWith('http') && !src.startsWith('/')) {
                    this.loadedScripts.add('../' + src);
                }
                // Add filename only
                const fileName = src.split('/').pop();
                if (fileName) {
                    this.loadedScripts.add(fileName);
                }
            }
        });
    }

    /**
     * Load a single component (HTML only)
     * @param {string} url - Path to component HTML file
     * @param {string} containerId - ID of container element
     * @param {Object} options - Additional options
     * @returns {Promise<void>}
     */
    async load(url, containerId, options = {}) {
        const { loadScript = false, scriptPath = null, waitForAlpine = true } = options;
        
        // Check if already loaded
        if (this.loadedComponents.has(url)) {
            return;
        }

        // Check if currently loading
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }

        const loadPromise = this._loadComponent(url, containerId, loadScript, scriptPath, waitForAlpine);
        this.loadingPromises.set(url, loadPromise);

        try {
            await loadPromise;
            this.loadedComponents.add(url);
        } catch (error) {
            throw error;
        } finally {
            this.loadingPromises.delete(url);
        }
    }

    /**
     * Load component HTML and automatically load associated JS file
     * @param {string} componentPath - Base path to component (without .html/.js)
     * @param {string} containerId - ID of container element
     * @param {Object} options - Additional options
     * @returns {Promise<void>}
     */
    async loadWithScripts(componentPath, containerId, options = {}) {
        const { waitForAlpine = true } = options;
        const htmlPath = `${componentPath}.html`;
        const jsPath = `${componentPath}.js`;

        await this.load(htmlPath, containerId, { 
            loadScript: true, 
            scriptPath: jsPath,
            waitForAlpine 
        });
    }

    /**
     * Load multiple components in parallel
     * @param {Array<{url: string, containerId: string, options?: Object}>} components
     * @returns {Promise<void[]>}
     */
    async loadMultiple(components) {
        const promises = components.map(comp => 
            this.load(comp.url, comp.containerId, comp.options || {})
        );
        return Promise.all(promises);
    }

    /**
     * Load standard layout components (Header, Sidebar, ThemeCustomizer) + additional components
     * @param {Array|Object} additionalComponents - Additional components to load (array) or config object with header, sidebar, themeCustomizer, main
     * @returns {Promise<void[]>}
     */
    async loadStandardLayout(additionalComponents = []) {
        // Helper to check if script is already loaded in DOM
        const isScriptLoaded = (scriptPath) => {
            return document.querySelector(`script[src="${scriptPath}"]`) !== null ||
                   document.querySelector(`script[src*="${scriptPath.split('/').pop()}"]`) !== null;
        };
        
        // Support both object config and array format
        let standardComponents = [];
        let extraComponents = [];
        
        // If additionalComponents is an object with header, sidebar, etc.
        if (additionalComponents && typeof additionalComponents === 'object' && !Array.isArray(additionalComponents)) {
            // Object format: { header: {...}, sidebar: {...}, themeCustomizer: {...}, main: {...} }
            standardComponents = [
                additionalComponents.header ? {
                    url: additionalComponents.header.path || 'components/Header/Header.html',
                    containerId: additionalComponents.header.container || 'header-container',
                    options: {
                        loadScript: additionalComponents.header.loadScript !== false && !isScriptLoaded('components/Header/Header.js'),
                        scriptPath: 'components/Header/Header.js'
                    }
                } : {
                    url: 'components/Header/Header.html',
                    containerId: 'header-container',
                    options: {
                        loadScript: !isScriptLoaded('components/Header/Header.js'),
                        scriptPath: 'components/Header/Header.js'
                    }
                },
                additionalComponents.sidebar ? {
                    url: additionalComponents.sidebar.path || 'components/Sidebar/Sidebar.html',
                    containerId: additionalComponents.sidebar.container || 'sidebar-container',
                    options: {
                        loadScript: additionalComponents.sidebar.loadScript !== false && !isScriptLoaded('components/Sidebar/Sidebar.js'),
                        scriptPath: 'components/Sidebar/Sidebar.js'
                    }
                } : {
                    url: 'components/Sidebar/Sidebar.html',
                    containerId: 'sidebar-container',
                    options: {
                        loadScript: !isScriptLoaded('components/Sidebar/Sidebar.js'),
                        scriptPath: 'components/Sidebar/Sidebar.js'
                    }
                },
                additionalComponents.themeCustomizer ? {
                    url: additionalComponents.themeCustomizer.path || 'components/ThemeCustomizer/ThemeCustomizer.html',
                    containerId: additionalComponents.themeCustomizer.container || 'theme-customizer-container',
                    options: {
                        loadScript: additionalComponents.themeCustomizer.loadScript !== false && !isScriptLoaded('components/ThemeCustomizer/ThemeCustomizer.js'),
                        scriptPath: 'components/ThemeCustomizer/ThemeCustomizer.js'
                    }
                } : {
                    url: 'components/ThemeCustomizer/ThemeCustomizer.html',
                    containerId: 'theme-customizer-container',
                    options: {
                        loadScript: !isScriptLoaded('components/ThemeCustomizer/ThemeCustomizer.js'),
                        scriptPath: 'components/ThemeCustomizer/ThemeCustomizer.js'
                    }
                }
            ];
            
            // Add main component if provided
            if (additionalComponents.main) {
                extraComponents.push({
                    url: additionalComponents.main.path,
                    containerId: additionalComponents.main.container,
                    options: {
                        loadScript: additionalComponents.main.loadScript !== false,
                        scriptPath: additionalComponents.main.scriptPath || additionalComponents.main.path.replace('.html', '.js')
                    }
                });
            }
        } else {
            // Array format (legacy)
            standardComponents = [
                { 
                    url: 'components/Header/Header.html', 
                    containerId: 'header-container', 
                    options: { 
                        loadScript: !isScriptLoaded('components/Header/Header.js'), 
                        scriptPath: 'components/Header/Header.js' 
                    } 
                },
                { 
                    url: 'components/Sidebar/Sidebar.html', 
                    containerId: 'sidebar-container', 
                    options: { 
                        loadScript: !isScriptLoaded('components/Sidebar/Sidebar.js'), 
                        scriptPath: 'components/Sidebar/Sidebar.js' 
                    } 
                },
                { 
                    url: 'components/ThemeCustomizer/ThemeCustomizer.html', 
                    containerId: 'theme-customizer-container', 
                    options: { 
                        loadScript: !isScriptLoaded('components/ThemeCustomizer/ThemeCustomizer.js'), 
                        scriptPath: 'components/ThemeCustomizer/ThemeCustomizer.js' 
                    } 
                }
            ];
            
            // additionalComponents is an array
            extraComponents = Array.isArray(additionalComponents) ? additionalComponents : [];
        }

        const allComponents = [...standardComponents, ...extraComponents];
        return this.loadMultiple(allComponents);
    }

    /**
     * Load a modal component
     * @param {string} modalPath - Path to modal HTML
     * @param {string} containerId - ID of container element
     * @param {boolean} loadScript - Whether to load associated JS
     * @returns {Promise<void>}
     */
    async loadModal(modalPath, containerId, loadScript = true) {
        const jsPath = modalPath.replace('.html', '.js');
        return this.load(modalPath, containerId, { 
            loadScript, 
            scriptPath: jsPath,
            waitForAlpine: false 
        });
    }

    /**
     * Internal method to load component HTML
     * @private
     */
    async _loadComponent(url, containerId, loadScript, scriptPath, waitForAlpine) {
        const container = document.getElementById(containerId);
        if (!container) {
            throw new Error(`Container with ID "${containerId}" not found`);
        }

        try {
            // Load script FIRST if requested (so Alpine components are registered before HTML is inserted)
            if (loadScript && scriptPath) {
                await this._loadScript(scriptPath);
                // Wait a bit for script to execute and register Alpine components
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // If Alpine is already initialized, trigger alpine:reinit for late-loaded scripts
                // This won't re-trigger plugin loading but will allow components to register
                if (typeof Alpine !== 'undefined' && Alpine.store) {
                    // Dispatch alpine:reinit event for late-loaded components
                    // Components should listen to this and register themselves
                    document.dispatchEvent(new CustomEvent('alpine:reinit'));
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.statusText}`);
            }

            let html = await response.text();
            
            // Extract body content if it's a full HTML document
            // This handles components that are saved as full HTML files
            if (html.includes('<body')) {
                const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                if (bodyMatch && bodyMatch[1]) {
                    html = bodyMatch[1].trim();
                }
            } else if (html.includes('<!DOCTYPE') || html.includes('<html')) {
                // If it's a full HTML document without body tag, extract content after </head>
                const headMatch = html.match(/<\/head>([\s\S]*)/i);
                if (headMatch && headMatch[1]) {
                    // Remove closing html/body tags if present
                    html = headMatch[1]
                        .replace(/<\/html>[\s\S]*$/i, '')
                        .replace(/<\/body>[\s\S]*$/i, '')
                        .trim();
                }
            }
            
            // Remove html/head/body tags if present
            html = html.replace(/<!DOCTYPE[^>]*>/gi, '');
            html = html.replace(/<html[^>]*>/gi, '');
            html = html.replace(/<\/html>/gi, '');
            html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
            html = html.replace(/<body[^>]*>/gi, '');
            html = html.replace(/<\/body>/gi, '');
            
            // Remove all script tags from component HTML to prevent duplicate loading
            // Scripts should be loaded separately via loadScript option
            html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            
            // Add x-cloak to prevent Alpine from evaluating before ready
            // This will be removed after Alpine initializes
            if (html.includes('x-data') && !html.includes('x-cloak')) {
                // Add x-cloak to elements with x-data
                html = html.replace(/(<[^>]*x-data[^>]*)(>)/gi, '$1 x-cloak$2');
            }
            
            container.innerHTML = html;

            // Wait for DOM to update
            await new Promise(resolve => setTimeout(resolve, 10));

            // Wait for Alpine.js to initialize if needed
            if (waitForAlpine && typeof Alpine !== 'undefined') {
                await this._waitForAlpine();
                // Wait for i18n store to be initialized and ready
                await this._waitForAlpineStore('i18n');
                
                // Additional wait to ensure i18n translations are loaded
                await this._waitForI18nReady();
            }

            // Remove x-cloak after Alpine is ready
            if (container.querySelector('[x-cloak]')) {
                container.querySelectorAll('[x-cloak]').forEach(el => {
                    el.removeAttribute('x-cloak');
                });
            }
            
            // Re-dispatch alpine:init to ensure late-loaded components register
            // This is important when scripts are loaded before HTML
            // We dispatch it but Alpine plugins should check if they're already loaded
            if (typeof Alpine !== 'undefined' && typeof document !== 'undefined') {
                setTimeout(() => {
                    // Dispatch a custom event that components can listen to
                    // This won't re-trigger plugin loading if they're already loaded
                    document.dispatchEvent(new CustomEvent('alpine:reinit'));
                }, 100);
            }

            // Dispatch custom event
            this._dispatchComponentLoaded(url, containerId);
            } catch (error) {
                throw error;
            }
    }

    /**
     * Internal method to load JavaScript file
     * @private
     */
    async _loadScript(scriptPath) {
        // Check if script already loaded
        if (this.loadedScripts.has(scriptPath)) {
            return;
        }

        // Check if script tag already exists (exact match)
        const existingScript = document.querySelector(`script[src="${scriptPath}"]`);
        if (existingScript) {
            this.loadedScripts.add(scriptPath);
            return;
        }

        // Check if script tag exists with different path (relative vs absolute)
        const scriptFileName = scriptPath.split('/').pop();
        const allScripts = document.querySelectorAll('script[src]');
        for (const script of allScripts) {
            const src = script.getAttribute('src');
            if (src && (src.endsWith(scriptFileName) || src.includes(scriptFileName))) {
                // Script already loaded, mark it and return
                this.loadedScripts.add(scriptPath);
                return;
            }
        }

        // Check if Alpine plugins are already loaded (alpine-persist, alpine-collaspe, etc.)
        // Check BEFORE trying to load to prevent redefinition errors
        if (scriptPath.includes('alpine-persist')) {
            if (typeof Alpine !== 'undefined' && Alpine.$persist) {
                this.loadedScripts.add(scriptPath);
                return;
            }
            // Also check if script is in DOM
            const persistScripts = document.querySelectorAll('script[src*="alpine-persist"]');
            if (persistScripts.length > 0) {
                this.loadedScripts.add(scriptPath);
                return;
            }
        }
        if (scriptPath.includes('alpine-collaspe')) {
            if (typeof Alpine !== 'undefined' && Alpine.collapse) {
                this.loadedScripts.add(scriptPath);
                return;
            }
            const collapseScripts = document.querySelectorAll('script[src*="alpine-collaspe"]');
            if (collapseScripts.length > 0) {
                this.loadedScripts.add(scriptPath);
                return;
            }
        }
        if (scriptPath.includes('alpine-ui')) {
            if (typeof Alpine !== 'undefined' && Alpine.ui) {
                this.loadedScripts.add(scriptPath);
                return;
            }
            const uiScripts = document.querySelectorAll('script[src*="alpine-ui"]');
            if (uiScripts.length > 0) {
                this.loadedScripts.add(scriptPath);
                return;
            }
        }
        if (scriptPath.includes('alpine-focus')) {
            if (typeof Alpine !== 'undefined' && Alpine.focus) {
                this.loadedScripts.add(scriptPath);
                return;
            }
            const focusScripts = document.querySelectorAll('script[src*="alpine-focus"]');
            if (focusScripts.length > 0) {
                this.loadedScripts.add(scriptPath);
                return;
            }
        }

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = scriptPath;
            // Don't use async - we need scripts to execute in order
            script.async = false;
            
            script.onload = () => {
                this.loadedScripts.add(scriptPath);
                // Wait a bit more to ensure script has fully executed
                setTimeout(() => resolve(), 10);
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script ${scriptPath}`));
            };

            document.body.appendChild(script);
        });
    }

    /**
     * Wait for Alpine.js to be ready
     * @private
     */
    async _waitForAlpine() {
        return new Promise((resolve) => {
            if (typeof Alpine !== 'undefined' && Alpine.store) {
                // Alpine is ready
                resolve();
            } else {
                // Wait for Alpine to initialize
                document.addEventListener('alpine:init', () => resolve(), { once: true });
                // Fallback timeout
                setTimeout(resolve, 100);
            }
        });
    }

    /**
     * Wait for Alpine store to be initialized
     * @private
     */
    async _waitForAlpineStore(storeName, maxAttempts = 50, interval = 50) {
        return new Promise((resolve) => {
            let attempts = 0;
            
            const checkStore = () => {
                attempts++;
                if (typeof Alpine !== 'undefined' && Alpine.store && Alpine.store(storeName)) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    resolve(); // Resolve anyway to not block
                } else {
                    setTimeout(checkStore, interval);
                }
            };
            
            checkStore();
        });
    }

    /**
     * Wait for i18n store to be fully ready with translations loaded
     * @private
     */
    async _waitForI18nReady(maxAttempts = 100, interval = 50) {
        return new Promise((resolve) => {
            let attempts = 0;
            
            const checkI18n = () => {
                attempts++;
                const i18n = Alpine?.store('i18n');
                
                // Check if i18n exists, has translations, and has t method
                if (i18n && i18n.translations && typeof i18n.t === 'function' && Object.keys(i18n.translations).length > 0) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    resolve(); // Resolve anyway to not block
                } else {
                    setTimeout(checkI18n, interval);
                }
            };
            
            checkI18n();
        });
    }

    /**
     * Dispatch component loaded event
     * @private
     */
    _dispatchComponentLoaded(url, containerId) {
        const event = new CustomEvent('component:loaded', {
            detail: { url, containerId },
            bubbles: true
        });
        document.dispatchEvent(event);
    }

    /**
     * Check if component is loaded
     * @param {string} url - Component URL
     * @returns {boolean}
     */
    isLoaded(url) {
        return this.loadedComponents.has(url);
    }

    /**
     * Clear loaded components cache (useful for testing)
     */
    clearCache() {
        this.loadedComponents.clear();
        this.loadedScripts.clear();
        this.loadingPromises.clear();
    }
}

// Create global instance
try {
    const instance = new ComponentLoader();
    window.ComponentLoader = instance;
    
    // Also set ComponentLoader directly (for compatibility)
    if (typeof window.ComponentLoader === 'undefined') {
        window.ComponentLoader = instance;
    }
    
    // Verify initialization
    if (window.ComponentLoader && typeof window.ComponentLoader.loadStandardLayout === 'function') {
        // ComponentLoader initialized successfully
    } else {
        // ComponentLoader failed to initialize properly
    }
} catch (error) {
    // Create a fallback object to prevent errors
    window.ComponentLoader = {
        loadStandardLayout: function() {
            return Promise.reject(new Error('ComponentLoader not initialized'));
        }
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}

