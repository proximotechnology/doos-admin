# Project Structure Overview

## Directory Structure

```
doos-admin/
│
├── assets/                          # Static assets
│   ├── css/                        # Stylesheets
│   │   ├── style.css              # Compiled Tailwind CSS
│   │   └── tailwind.css           # Tailwind source
│   ├── js/                        # JavaScript files
│   │   ├── config.js              # API configuration (uses ENV)
│   │   ├── env-loader.js          # Environment variable loader
│   │   ├── authService.js         # Authentication service
│   │   ├── custom.js              # Custom utilities
│   │   └── lang/                  # Language files
│   └── images/                     # Images and icons
│
├── renter/                         # Renter admin interface
│   ├── components/                 # Reusable components (30+)
│   │   ├── AdminManagement/
│   │   ├── CarManagement/
│   │   ├── Chat/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   └── ... (see COMPONENTS.md)
│   ├── *.html                     # Main pages
│   └── lang/                      # Language files (en.json, ae.json)
│
├── uber/                           # Uber (property owner) admin
│   └── *.html                     # Uber admin pages
│
├── .env.example                    # Environment variables template
├── .cursorignore                   # Files to exclude from Cursor indexing
├── jsconfig.json                   # JavaScript project configuration
├── package.json                    # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── sitemap.xml                     # Site map for SEO
│
├── README.md                       # Main documentation
├── SETUP.md                        # Setup instructions
├── COMPONENTS.md                   # Component documentation
└── PROJECT_STRUCTURE.md            # This file
```

## Key Files

### Configuration Files

- **`.env.example`**: Template for environment variables
- **`jsconfig.json`**: JavaScript project configuration for IDE support
- **`tailwind.config.js`**: Tailwind CSS configuration
- **`package.json`**: Node.js dependencies and scripts

### Core JavaScript Files

- **`assets/js/env-loader.js`**: Loads environment variables
- **`assets/js/config.js`**: API and app configuration
- **`assets/js/authService.js`**: Authentication service
- **`assets/js/custom.js`**: Custom utilities

### Documentation Files

- **`README.md`**: Main project documentation
- **`SETUP.md`**: Setup and configuration guide
- **`COMPONENTS.md`**: Detailed component documentation
- **`PROJECT_STRUCTURE.md`**: This file

## Component Organization

### Component Pattern

Each component follows this structure:
```
ComponentName/
├── ComponentName.html      # Template
├── ComponentName.js       # Logic (Alpine.js)
└── MainLayout.js          # Loader (if page-level)
```

### Component Categories

1. **Management Components**: CRUD operations (Car, User, Plan, etc.)
2. **Shared Components**: Header, Sidebar, ThemeCustomizer
3. **Feature Components**: Chat, Reviews, Wallet
4. **Modal Components**: Reusable modals in `Modals/` subdirectories

## Environment Variables

### Required Variables

- `VITE_BASE_URL_RENTER`: Renter API base URL
- `VITE_BASE_URL_UBER`: Uber API base URL
- `VITE_PUSHER_APP_KEY`: Pusher app key for chat
- `VITE_PUSHER_CLUSTER`: Pusher cluster
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key
- `VITE_SITE_URL`: Site URL for sitemap

### Optional Variables

- `VITE_ENV`: Environment (development/staging/production)
- `VITE_DEBUG`: Enable debug mode
- `VITE_SITE_NAME`: Site name

## API Configuration

### Base URLs

- **Renter API**: `API_CONFIG.BASE_URL_Renter`
- **Uber API**: `API_CONFIG.BASE_URL_Uber`

### Common Endpoints

- `/api/login` - Authentication
- `/api/car/*` - Car management
- `/api/user/*` - User management
- `/api/chat/*` - Chat endpoints
- `/api/booking/*` - Booking management

## Build Process

### Development
```bash
npm run dev    # Watch mode for Tailwind CSS
```

### Production
```bash
npm run build  # Build optimized CSS
```

## File Naming Conventions

- **Components**: PascalCase (e.g., `CarManagement.js`)
- **Pages**: PascalCase (e.g., `Booking.html`)
- **Modals**: PascalCase (e.g., `UpdateModal.html`)
- **Config files**: kebab-case (e.g., `env-loader.js`)

## Dependencies

### Core Libraries
- Alpine.js - Reactive framework
- Tailwind CSS - Styling
- Pusher - Real-time chat
- Simple DataTables - Tables
- SweetAlert - Notifications

### Development
- Tailwind CSS CLI
- Prettier (code formatting)

## Deployment Structure

### Files to Deploy
- All HTML files
- `assets/` directory
- `renter/` directory
- `uber/` directory
- `lang/` files (if in root)
- `.htaccess` (for Apache)
- `sitemap.xml`

### Files NOT to Deploy
- `node_modules/`
- `.env` (use server-side injection)
- Source files (`.git/`, etc.)
- Development files

## Environment Setup

### Development
1. Copy `.env.example` to `.env`
2. Set local values
3. Use localStorage injection or local server

### Production
1. Set environment variables on server
2. Use server-side injection (PHP/Node.js)
3. Build Tailwind CSS
4. Deploy files

## Security Considerations

- Never commit `.env` file
- Use HTTPS in production
- Validate all API inputs
- Use authentication tokens
- Implement CORS properly
- Keep API keys secure

## Support Resources

- **Documentation**: See README.md
- **Setup Help**: See SETUP.md
- **Components**: See COMPONENTS.md
- **API Docs**: Check backend API documentation

