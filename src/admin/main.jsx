import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './admin.css';

ReactDOM.createRoot(document.getElementById('admin-root')).render(
    <React.StrictMode>
        <BrowserRouter basename="/admin">
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
