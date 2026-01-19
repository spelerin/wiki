import { auth, googleProvider } from './firebase-config.js';
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { UI } from './UIController.js';
import { Templates } from './Templates.js';

const appRoot = document.getElementById('app-root');

// 1. GLOBAL AUTH DİNLEYİCİSİ
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Kullanıcı var -> Uygulamayı Yükle
        renderMainApp(user);
    } else {
        // Kullanıcı yok -> Login Ekranını Yükle
        renderLoginScreen();
    }
});

// 2. GÖRÜNÜM YÖNETİCİLERİ
function renderLoginScreen() {
    appRoot.innerHTML = Templates.LoginView();
    
    // Login Olaylarını Bağla
    document.getElementById('loginWithGoogleBtn')?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // onAuthStateChanged otomatik tetiklenecek
        } catch (error) {
            console.error("Giriş hatası:", error);
            alert("Giriş yapılamadı: " + error.message);
        }
    });
}

function renderMainApp(user) {
    appRoot.innerHTML = Templates.AppShell();
    
    // UI Logic'lerini Başlat (Sidebar, Layout vb.)
    UI.init();

    // Opsiyonel: Header'a kullanıcı adını veya çıkış butonunu bağla
    setupUserActions();
}

function setupUserActions() {
    // Örnek: Çıkış butonu id'si 'logout-btn' ise
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth);
    });
}
