// /root/courtia/frontend/src/portal/main.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import PortalApp from './PortalApp.jsx';
import '../index.css';

createRoot(document.getElementById('portal-root')).render(<PortalApp />);
