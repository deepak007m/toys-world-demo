// vite.config.js
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///C:/Users/deepa/Downloads/toys%20world/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/deepa/Downloads/toys%20world/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/deepa/Downloads/toys%20world/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = dirname(__filename);
var adminFallbackPlugin = () => ({
  name: "admin-fallback",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.startsWith("/admin") && !req.url.includes(".") && req.url !== "/admin/") {
        req.url = "/admin/index.html";
      }
      next();
    });
  }
});
var vite_config_default = defineConfig({
  plugins: [react(), adminFallbackPlugin()],
  server: {
    port: 5173
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        shop: resolve(__dirname, "shop.html"),
        product: resolve(__dirname, "product.html"),
        admin: resolve(__dirname, "admin/index.html"),
        login: resolve(__dirname, "login.html"),
        signup: resolve(__dirname, "signup.html"),
        "forgot-password": resolve(__dirname, "forgot-password.html"),
        "reset-password": resolve(__dirname, "reset-password.html"),
        account: resolve(__dirname, "account.html")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxkZWVwYVxcXFxEb3dubG9hZHNcXFxcdG95cyB3b3JsZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZGVlcGFcXFxcRG93bmxvYWRzXFxcXHRveXMgd29ybGRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2RlZXBhL0Rvd25sb2Fkcy90b3lzJTIwd29ybGQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyByZXNvbHZlLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcclxuXHJcbmNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XHJcbmNvbnN0IF9fZGlybmFtZSA9IGRpcm5hbWUoX19maWxlbmFtZSk7XHJcblxyXG4vLyBEZXYgc2VydmVyIG1pZGRsZXdhcmUgdG8gaGFuZGxlIFJlYWN0IFJvdXRlciBoaXN0b3J5IGZhbGxiYWNrIGZvciB0aGUgYWRtaW4gYXBwXHJcbmNvbnN0IGFkbWluRmFsbGJhY2tQbHVnaW4gPSAoKSA9PiAoe1xyXG4gICAgbmFtZTogJ2FkbWluLWZhbGxiYWNrJyxcclxuICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLnVybC5zdGFydHNXaXRoKCcvYWRtaW4nKSAmJiAhcmVxLnVybC5pbmNsdWRlcygnLicpICYmIHJlcS51cmwgIT09ICcvYWRtaW4vJykge1xyXG4gICAgICAgICAgICAgICAgcmVxLnVybCA9ICcvYWRtaW4vaW5kZXguaHRtbCc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59KTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgYWRtaW5GYWxsYmFja1BsdWdpbigpXSxcclxuICAgIHNlcnZlcjoge1xyXG4gICAgICAgIHBvcnQ6IDUxNzNcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICAgIHRhcmdldDogJ2VzbmV4dCcsXHJcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICAgICAgICBpbnB1dDoge1xyXG4gICAgICAgICAgICAgICAgbWFpbjogcmVzb2x2ZShfX2Rpcm5hbWUsICdpbmRleC5odG1sJyksXHJcbiAgICAgICAgICAgICAgICBzaG9wOiByZXNvbHZlKF9fZGlybmFtZSwgJ3Nob3AuaHRtbCcpLFxyXG4gICAgICAgICAgICAgICAgcHJvZHVjdDogcmVzb2x2ZShfX2Rpcm5hbWUsICdwcm9kdWN0Lmh0bWwnKSxcclxuICAgICAgICAgICAgICAgIGFkbWluOiByZXNvbHZlKF9fZGlybmFtZSwgJ2FkbWluL2luZGV4Lmh0bWwnKSxcclxuICAgICAgICAgICAgICAgIGxvZ2luOiByZXNvbHZlKF9fZGlybmFtZSwgJ2xvZ2luLmh0bWwnKSxcclxuICAgICAgICAgICAgICAgIHNpZ251cDogcmVzb2x2ZShfX2Rpcm5hbWUsICdzaWdudXAuaHRtbCcpLFxyXG4gICAgICAgICAgICAgICAgJ2ZvcmdvdC1wYXNzd29yZCc6IHJlc29sdmUoX19kaXJuYW1lLCAnZm9yZ290LXBhc3N3b3JkLmh0bWwnKSxcclxuICAgICAgICAgICAgICAgICdyZXNldC1wYXNzd29yZCc6IHJlc29sdmUoX19kaXJuYW1lLCAncmVzZXQtcGFzc3dvcmQuaHRtbCcpLFxyXG4gICAgICAgICAgICAgICAgYWNjb3VudDogcmVzb2x2ZShfX2Rpcm5hbWUsICdhY2NvdW50Lmh0bWwnKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1UyxTQUFTLFNBQVMsZUFBZTtBQUN4VSxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFIcUssSUFBTSwyQ0FBMkM7QUFLeE8sSUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsSUFBTSxZQUFZLFFBQVEsVUFBVTtBQUdwQyxJQUFNLHNCQUFzQixPQUFPO0FBQUEsRUFDL0IsTUFBTTtBQUFBLEVBQ04sZ0JBQWdCLFFBQVE7QUFDcEIsV0FBTyxZQUFZLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztBQUN2QyxVQUFJLElBQUksSUFBSSxXQUFXLFFBQVEsS0FBSyxDQUFDLElBQUksSUFBSSxTQUFTLEdBQUcsS0FBSyxJQUFJLFFBQVEsV0FBVztBQUNqRixZQUFJLE1BQU07QUFBQSxNQUNkO0FBQ0EsV0FBSztBQUFBLElBQ1QsQ0FBQztBQUFBLEVBQ0w7QUFDSjtBQUVBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsb0JBQW9CLENBQUM7QUFBQSxFQUN4QyxRQUFRO0FBQUEsSUFDSixNQUFNO0FBQUEsRUFDVjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0gsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ1gsT0FBTztBQUFBLFFBQ0gsTUFBTSxRQUFRLFdBQVcsWUFBWTtBQUFBLFFBQ3JDLE1BQU0sUUFBUSxXQUFXLFdBQVc7QUFBQSxRQUNwQyxTQUFTLFFBQVEsV0FBVyxjQUFjO0FBQUEsUUFDMUMsT0FBTyxRQUFRLFdBQVcsa0JBQWtCO0FBQUEsUUFDNUMsT0FBTyxRQUFRLFdBQVcsWUFBWTtBQUFBLFFBQ3RDLFFBQVEsUUFBUSxXQUFXLGFBQWE7QUFBQSxRQUN4QyxtQkFBbUIsUUFBUSxXQUFXLHNCQUFzQjtBQUFBLFFBQzVELGtCQUFrQixRQUFRLFdBQVcscUJBQXFCO0FBQUEsUUFDMUQsU0FBUyxRQUFRLFdBQVcsY0FBYztBQUFBLE1BQzlDO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFDSixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
