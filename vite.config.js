import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Dev server middleware to handle React Router history fallback for the admin app
const adminFallbackPlugin = () => ({
    name: 'admin-fallback',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            if (req.url.startsWith('/admin') && !req.url.includes('.') && req.url !== '/admin/') {
                req.url = '/admin/index.html';
            }
            next();
        });
    }
});

export default defineConfig({
    plugins: [react(), adminFallbackPlugin()],
    server: {
        port: 5173
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                shop: resolve(__dirname, 'shop.html'),
                product: resolve(__dirname, 'product.html'),
                admin: resolve(__dirname, 'admin/index.html'),
                login: resolve(__dirname, 'login.html'),
                signup: resolve(__dirname, 'signup.html'),
                'forgot-password': resolve(__dirname, 'forgot-password.html'),
                'reset-password': resolve(__dirname, 'reset-password.html'),
                account: resolve(__dirname, 'account.html'),
                cart: resolve(__dirname, 'cart.html'),
                wishlist: resolve(__dirname, 'wishlist.html'),
                checkout: resolve(__dirname, 'checkout.html'),
                orders: resolve(__dirname, 'orders.html'),
                about: resolve(__dirname, 'about.html'),
                contact: resolve(__dirname, 'contact.html'),
                faq: resolve(__dirname, 'faq.html'),
                '404': resolve(__dirname, '404.html'),
                shipping: resolve(__dirname, 'shipping.html'),
                returns: resolve(__dirname, 'returns.html'),
                privacy: resolve(__dirname, 'privacy.html'),
                terms: resolve(__dirname, 'terms.html')
            }
        }
    }
});
