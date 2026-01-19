import { 
    onAuthStateChanged, 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth, googleProvider } from './firebase-config.js';
import { UI } from './UIController.js';
import { Templates } from './Templates.js';
import { FirebaseService } from './FirebaseService.js'; // Bu importu unutma!

const appRoot = document.getElementById('app-root');

// 1. GLOBAL AUTH DİNLEYİCİSİ
onAuthStateChanged(auth, (user) => {
    if (user) {
        renderMainApp(user);
    } else {
        renderLoginScreen();
    }
});

// 2. GÖRÜNÜM YÖNETİCİLERİ
function renderLoginScreen() {
    // Şablonu bas
    appRoot.innerHTML = Templates.LoginView();
    // Buton dinleyicilerini bağla (E-posta ve Google burada bağlanacak)
    setupLoginEvents();
}

function setupLoginEvents() {
    const loginMailBtn = document.getElementById('loginWithMailBtn');
    const googleBtn = document.getElementById('loginWithGoogleBtn');

    // --- E-POSTA İLE GİRİŞ ---
    loginMailBtn?.addEventListener('click', async () => {
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;
        const spinner = document.getElementById('loginSpinner');
        const btnText = document.getElementById('loginBtnText');

        if (!email || !password) {
            alert("Lütfen e-posta ve şifrenizi girin.");
            return;
        }

        try {
            loginMailBtn.disabled = true;
            spinner?.classList.remove('hidden');
            if (btnText) btnText.textContent = "Giriş yapılıyor...";

            await signInWithEmailAndPassword(auth, email, password);
            // Başarılı olunca onAuthStateChanged otomatik çalışacak
            
        } catch (error) {
            console.error("Giriş hatası:", error);
            alert("Hatalı e-posta veya şifre!");
        } finally {
            loginMailBtn.disabled = false;
            spinner?.classList.add('hidden');
            if (btnText) btnText.textContent = "Giriş Yap";
        }
    });

    // --- GOOGLE İLE GİRİŞ ---
    googleBtn?.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Giriş hatası:", error);
            alert("Google girişi engellendi (Firewall olabilir): " + error.message);
        }
    });
}

function renderMainApp(user) {
// 1. Ana iskeleti bas
    appRoot.innerHTML = Templates.AppShell();
    
    // 2. UI logic'lerini başlat (Elementleri yakala, dinleyicileri kur)
    UI.init();


    //3. Girişte havuzu FULL yap
    UI.setTagPageState('full', false);
    
    // HOŞ GELDİN EKRANINI AKTİF ET (İşte o kritik satır!)
    UI.renderWelcome();    

    // CANLI VERİ AKIŞINI BAŞLAT
    
    // 1. Etiket Havuzu
    FirebaseService.subscribeToMainTags((tags) => {
        UI.renderTagPool(tags); // Etiket havuzunu doldurur
    });

    // 2. Makale Listesi
    FirebaseService.subscribeToNotes((notes) => {
        UI.renderSidebarList(notes);
    });

    // 3. Kullanıcı İşlemleri (Çıkış vb.)
    setupUserActions();
}

function setupUserActions() {
    // Navbar'da veya Sidebar'da logout-btn id'li bir butonun varsa
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        signOut(auth);
    });
}

let activeCommentSubscription = null;

// UIController içindeki renderArticleDetail'i çağırdığımız her yerde şunu yapmalıyız:
function openArticle(note) {
    // 1. Önceki yorum aboneliğini iptal et (Bellek sızıntısını önlemek için)
    if (activeCommentSubscription) activeCommentSubscription();

    // 2. Detay sayfasını render et
    UI.renderArticleDetail(note);

    // 3. Bu makaleye ait yorumları dinlemeye başla
    activeCommentSubscription = FirebaseService.subscribeToComments(note.id, (comments) => {
        UI.renderComments(comments);
    });



