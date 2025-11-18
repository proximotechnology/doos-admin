# Setup Guide

Quick setup guide for the Doos Admin Dashboard.

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
# Use your preferred editor (nano, vim, code, etc.)
nano .env
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Assets

```bash
# Development (watch mode)
npm run dev

# Production build
npm run build
```

### 4. Configure Environment Variables

#### Option A: Server-Side Injection (Recommended for Production)

**PHP Example:**
```php
<!-- In your index.html or a PHP wrapper -->
<script type="application/env">
<?php
$env = [
    'VITE_BASE_URL_RENTER' => getenv('VITE_BASE_URL_RENTER') ?: 'https://api.doosdoostest.com',
    'VITE_BASE_URL_UBER' => getenv('VITE_BASE_URL_UBER') ?: 'https://api.doosdoos.com/api/v1',
    'VITE_PUSHER_APP_KEY' => getenv('VITE_PUSHER_APP_KEY') ?: '0c6840048793ecd5b54f',
    'VITE_PUSHER_CLUSTER' => getenv('VITE_PUSHER_CLUSTER') ?: 'mt1',
    'VITE_GOOGLE_MAPS_API_KEY' => getenv('VITE_GOOGLE_MAPS_API_KEY') ?: 'your_key',
    'VITE_SITE_URL' => getenv('VITE_SITE_URL') ?: 'https://admin.doosdoostest.com',
];
echo json_encode($env);
?>
</script>
```

**Node.js/Express Example:**
```javascript
// In your server.js
app.get('*.html', (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, req.path), 'utf8');
    const envScript = `
        <script type="application/env">
        ${JSON.stringify({
            VITE_BASE_URL_RENTER: process.env.VITE_BASE_URL_RENTER,
            VITE_PUSHER_APP_KEY: process.env.VITE_PUSHER_APP_KEY,
            // ... other vars
        })}
        </script>
    `;
    const modifiedHtml = html.replace('</head>', `${envScript}</head>`);
    res.send(modifiedHtml);
});
```

#### Option B: Meta Tag Injection

```html
<meta name="env-config" content='{
    "VITE_BASE_URL_RENTER": "https://api.doosdoostest.com",
    "VITE_PUSHER_APP_KEY": "your_key"
}' />
```

#### Option C: LocalStorage (Development Only)

Open browser console and run:
```javascript
localStorage.setItem('app_env', JSON.stringify({
    VITE_BASE_URL_RENTER: 'http://localhost:8000',
    VITE_PUSHER_APP_KEY: 'your_key',
    // ... other vars
}));
// Then reload the page
location.reload();
```

### 5. Include Environment Loader

Make sure to include `env-loader.js` before `config.js` in your HTML files:

```html
<!-- In the <head> section -->
<script src="/assets/js/env-loader.js"></script>
<script src="/assets/js/config.js"></script>
```

## Verification

After setup, verify configuration:

1. Open browser console
2. Check `window.ENV` object:
   ```javascript
   console.log(window.ENV);
   console.log(API_CONFIG);
   ```
3. Verify all values are correct

## Troubleshooting

### Environment variables not loading?

1. **Check script order**: `env-loader.js` must load before `config.js`
2. **Check injection method**: Verify your server-side injection is working
3. **Check console**: Look for errors in browser console
4. **Fallback values**: If injection fails, default values from `config.js` will be used

### API calls failing?

1. **Check API URLs**: Verify `API_CONFIG.BASE_URL_Renter` and `API_CONFIG.BASE_URL_Uber`
2. **Check CORS**: Ensure your API server allows requests from your domain
3. **Check authentication**: Verify auth token is stored in `localStorage.getItem('authToken')`

### Chat not working?

1. **Check Pusher config**: Verify `API_CONFIG.PUSHER.APP_KEY` and `API_CONFIG.PUSHER.CLUSTER`
2. **Check network**: Ensure Pusher service is accessible
3. **Check console**: Look for Pusher connection errors

## Production Checklist

- [ ] Environment variables set in `.env`
- [ ] Server-side injection configured
- [ ] Tailwind CSS built (`npm run build`)
- [ ] `.env` file excluded from version control
- [ ] API endpoints verified
- [ ] Pusher credentials verified
- [ ] Google Maps API key configured
- [ ] HTTPS enabled
- [ ] CORS configured on API server
- [ ] Error logging configured

## Development vs Production

### Development
- Use `npm run dev` for Tailwind watch mode
- Use localStorage for environment variables
- Enable debug mode: `VITE_DEBUG=true`

### Production
- Use `npm run build` for optimized CSS
- Use server-side injection for environment variables
- Disable debug mode: `VITE_DEBUG=false`
- Minify and optimize all assets
- Enable caching headers

