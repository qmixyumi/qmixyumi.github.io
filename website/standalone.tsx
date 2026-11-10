import React from 'react';
import {createRoot} from 'react-dom/client';
import Adventure from './app/adventure';
import './app/globals.css';
createRoot(document.getElementById('root')!).render(<Adventure/>);

if(import.meta.env.PROD&&"serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(reg=>{const announce=()=>{if(reg.waiting)window.dispatchEvent(new CustomEvent('adventure-update',{detail:reg.waiting}))};announce();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',announce)});}).catch(()=>{});});}
