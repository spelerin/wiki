import { auth } from './firebase-config.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
        // Diğer modüle "Kullanıcı geldi, hadi çalış!" mesajı gönderiyoruz
        const event = new CustomEvent('userLoggedIn', { detail: user.uid });
        window.dispatchEvent(event);
        
        loginBtn.classList.add('hidden'); // Giriş butonunu gizle
    } else {
        console.log("Kullanıcı giriş yapmamış.");
    }
});