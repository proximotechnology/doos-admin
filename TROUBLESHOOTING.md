# Troubleshooting Guide

Common issues and solutions for the Doos Admin Dashboard component system.

## Quick Debugging Steps

1. **Open Browser Console** (F12)
2. **Check for errors** - Look for red error messages
3. **Check ComponentLoader status** - Look for "ComponentLoader initialized successfully"
4. **Check component loading** - Look for "ComponentLoader is ready" messages

## Common Issues

### Issue 1: ComponentLoader not found

**Error:** `ComponentLoader is not a function` or `ComponentLoader.loadStandardLayout is not a function`

**Solutions:**
1. Make sure `component-loader.js` is loaded before `MainLayout.js`
2. Check script order in HTML:
   ```html
   <script src="../assets/js/component-loader.js"></script>
   <script src="components/YourComponent/MainLayout.js"></script>
   ```
3. Hard refresh browser (Ctrl+Shift+R)
4. Check browser console for script loading errors

### Issue 2: Alpine.js errors

**Error:** `Cannot read properties of undefined (reading 't')` or `header is not defined`

**Solutions:**
1. Make sure Alpine.js is loaded before components
2. Check that i18n store is initialized (Header.js must load first)
3. Verify script loading order:
   ```html
   <script src="../assets/js/alpine.min.js"></script>
   <script src="../assets/js/config.js"></script>
   <script src="../assets/js/component-loader.js"></script>
   ```

### Issue 3: Components not loading

**Symptoms:** Empty containers, no content visible

**Solutions:**
1. Check network tab for 404 errors
2. Verify file paths are correct
3. Check CORS settings if loading from different domain
4. Verify container IDs exist in HTML

### Issue 4: Scripts not executing

**Symptoms:** Components load but functionality doesn't work

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify scripts are loading (Network tab)
3. Check that dependencies (API_CONFIG, Alpine) are available
4. Look for timing issues - scripts may need to wait

## Debugging Commands

Open browser console and run:

```javascript
// Check ComponentLoader
console.log('ComponentLoader:', window.ComponentLoader);
console.log('Methods:', Object.getOwnPropertyNames(window.ComponentLoader));

// Check Alpine
console.log('Alpine:', typeof Alpine !== 'undefined' ? Alpine : 'Not loaded');
console.log('i18n store:', Alpine?.store('i18n'));

// Check loaded components
console.log('Loaded:', ComponentLoader.loadedComponents);
console.log('Loaded scripts:', ComponentLoader.loadedScripts);

// Check API config
console.log('API_CONFIG:', window.API_CONFIG);
```

## Step-by-Step Debugging

### 1. Verify Scripts Load

```javascript
// In browser console
document.querySelectorAll('script[src*="component-loader"]').length
// Should return 1 or more
```

### 2. Check ComponentLoader Initialization

Look for these console messages:
- ✅ "ComponentLoader initialized successfully"
- ✅ "ComponentLoader is ready"
- ❌ "ComponentLoader failed to load" - Script not loading
- ❌ "ComponentLoader not available" - Timing issue

### 3. Check Component Registration

```javascript
// Check if Alpine components are registered
console.log('Alpine data:', Object.keys(Alpine._x_dataStack || {}));
```

### 4. Check Store Initialization

```javascript
// Check i18n store
const i18n = Alpine.store('i18n');
console.log('i18n store:', i18n);
console.log('Translations loaded:', Object.keys(i18n?.translations || {}));
```

## File Path Issues

### Relative Path Problems

Components use relative paths. Make sure:
- Paths are relative to the HTML page location
- `components/Header/Header.html` is correct from `renter/` directory
- Check actual file structure matches paths

### Common Path Mistakes

❌ Wrong: `../components/Header/Header.html` (from renter/)
✅ Correct: `components/Header/Header.html` (from renter/)

## Network Issues

### CORS Errors

If loading from `file://` protocol:
- Use a local server instead
- Python: `python -m http.server 8000`
- Node: `npx http-server -p 8000`

### 404 Errors

Check:
1. File actually exists at path
2. Case sensitivity (Windows vs Linux)
3. File extensions (.html, .js)

## Timing Issues

### Scripts Loading Too Fast

If scripts execute before dependencies:

```javascript
// Add delay in MainLayout.js
setTimeout(() => {
    ComponentLoader.loadStandardLayout([...]);
}, 100);
```

### Alpine Not Ready

Wait for Alpine:

```javascript
document.addEventListener('alpine:init', () => {
    // Your code here
});
```

## Getting Help

When reporting issues, include:

1. **Browser console errors** (copy full error message)
2. **Network tab** (check for failed requests)
3. **ComponentLoader status** (console logs)
4. **Browser and version**
5. **Steps to reproduce**

## Quick Fixes

### Reset Everything

```javascript
// In browser console
ComponentLoader.clearCache();
location.reload();
```

### Force Reload Scripts

```javascript
// Remove and re-add component-loader
const script = document.createElement('script');
script.src = '../assets/js/component-loader.js';
document.body.appendChild(script);
```

### Check All Dependencies

```javascript
const deps = {
    Alpine: typeof Alpine !== 'undefined',
    API_CONFIG: typeof API_CONFIG !== 'undefined',
    ComponentLoader: typeof ComponentLoader !== 'undefined',
    Swal: typeof Swal !== 'undefined'
};
console.table(deps);
```


