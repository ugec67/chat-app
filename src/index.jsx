import React from 'react';
import ReactDOM from 'react-dom/client'; // Correct import for React 18
import App from './App'; // Import your main App component
import './index.css'; // Import global styles

// Create a root for your React application
const root = ReactDOM.createRoot(document.getElementById('root'));

// Render your App component into the root
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
