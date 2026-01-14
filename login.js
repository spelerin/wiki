import { auth } from './firebase-config.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const logoutBtn = document.getElementById('btnLogout');
const loginBtn = document.getElementById('loginBtn');

// Giriş butonu tıklandığında
loginBtn.onclick = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
};

// OTURUM DURUMUNU İZLE
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Giriş başarılı, UID:", user.uid);
    
        loginBtn.classList.add('hidden'); // Giriş butonunu gizle
        logoutBtn.classList.remove('hidden'); // Çıkış butonunu göster
        
        // Diğer modüle "Kullanıcı geldi, hadi çalış!" mesajı gönderiyoruz   
        const event = new CustomEvent('userLoggedIn', { detail: user.uid });
        window.dispatchEvent(event);
    } else {
        // KULLANICI YOKSA (Veya çıkış yaptıysa)
        loginBtn.classList.remove('hidden'); // Giriş butonunu göster
        logoutBtn.classList.add('hidden');    // Çıkış butonunu gizle        
        console.log("Kullanıcı giriş yapmamış.");
    }
});

// Çıkış butonuna basıldığında
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        console.log("Oturum başarıyla kapatıldı.");
        
        // Çıkış yapınca kullanıcıyı login sayfasına yönlendirebilirsin
        window.location.href = "index.html"; 
    } catch (error) {
        console.error("Çıkış yapılırken hata oluştu:", error);
    }

});

