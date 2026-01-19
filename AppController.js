import { Templates } from './Templates.js';
import { UI } from './UIController.js';
// import { auth } from './firebase-config.js'; // Firebase bağlıyken açacağız

const appRoot = document.getElementById('app-root');

// SİMÜLASYON: Şimdilik manuel test için
let isLoggedIn = false; 

function render() {
    if (isLoggedIn) {
        // 1. Ana Uygulamayı Bas
        appRoot.innerHTML = Templates.AppShell();
        // 2. UI Logic'lerini Başlat (Butonlar, Sidebar vb.)
        UI.init();
    } else {
        // 1. Login Ekranını Bas
        appRoot.innerHTML = Templates.LoginView();
        // 2. Login Butonlarını Bağla
        setupLoginEvents();
    }
}

function setupLoginEvents() {
    document.getElementById('loginWithGoogleBtn')?.addEventListener('click', () => {
        console.log("Google login tetiklendi");
        isLoggedIn = true; // Simüle ediyoruz
        render(); 
    });
}

// Uygulamayı başlat
render();