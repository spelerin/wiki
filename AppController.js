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

// AppController içindeki renderMainApp fonksiyonuna ekle
function renderMainApp(user) {
    appRoot.innerHTML = Templates.AppShell();
    UI.init();

    // CANLI VERİ AKIŞINI BAŞLAT
    
    // 1. Etiket Havuzu
    FirebaseService.subscribeToMainTags((tags) => {
        const pool = document.querySelector('#tag-pool .flex-wrap');
        if (pool) {
            pool.innerHTML = tags.map(tag => 
                `<button class="text-sm font-medium text-slate-500 hover:text-blue-600">#${tag}</button>`
            ).join('');
        }
    });

    // 2. Makale Listesi
    FirebaseService.subscribeToNotes((notes) => {
        UI.renderArticleList(notes);
    });
}

function setupUserActions() {
    // Örnek: Çıkış butonu id'si 'logout-btn' ise
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth);
    });
}

