import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log('Renderer process starting...');
console.log('window.electronAPI:', window.electronAPI);

const container = document.getElementById('root');
console.log('Root container:', container);

if (container) {
  try {
    const root = createRoot(container);
    root.render(<App />);
    console.log('App rendered successfully');
  } catch (error) {
    console.error('Error rendering app:', error);
  }
} else {
  console.error('Root container not found!');
}