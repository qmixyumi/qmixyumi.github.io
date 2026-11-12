import React from 'react';
import {createRoot} from 'react-dom/client';
import Adventure from './app/adventure';
import {SharedView,isShareHash} from './app/share';
import './app/globals.css';
// A friend's read-only link (#share=…) opens the shared plan only; it never touches this device's own trips.
const shared=isShareHash(location.hash);
if(shared)document.body.classList.add('shared-body');
createRoot(document.getElementById('root')!).render(shared?<SharedView/>:<Adventure/>);
window.addEventListener('hashchange',()=>{if(isShareHash(location.hash)!==shared)location.reload()});

if(import.meta.env.PROD&&"serviceWorker" in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").then(reg=>{const announce=()=>{if(reg.waiting)window.dispatchEvent(new CustomEvent('adventure-update',{detail:reg.waiting}))};announce();reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',announce)});}).catch(()=>{});});}
