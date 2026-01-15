import { auth } from './firebase-config.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginGoogleBtn = document.getElementById('loginWithGoogleBtn');
const loginMailBtn = document.getElementById('loginWithMailBtn');


// Giriş butonu tıklandığında
loginGoogleBtn.onclick = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider);
};

// OTURUM DURUMUNU İZLE
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Giriş başarılı, UID:", user.uid);
    
        loginGoogleBtn.classList.add('hidden'); // Google butonunu gizle
	loginMailBtn.classList.add('hidden'); // Giriş butonunu gizle         

	window.location.href = "index.html";
    } else {
        // KULLANICI YOKSA (Veya çıkış yaptıysa)
        loginGoogleBtn.classList.remove('hidden'); // Giriş butonunu göster
        loginMailBtn.classList.remove('hidden'); // Giriş butonunu göster     

        console.log("Giriş yapılmadı.");
    }
});


// Giriş Mail Butonu Tıklandığında
loginMailBtn.onclick = async () => {
    // HTML'deki input id'lerine göre bu kısımları güncellemelisin
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("E-posta ile giriş başarılı:", user.email);
        
        // Not: onAuthStateChanged zaten tetikleneceği için 
        // buton gizleme işlemlerini orada yapmaya devam edebilirsin.
    } catch (error) {
        console.error("Giriş hatası:", error.code, error.message);
        alert("Giriş yapılamadı: " + error.message);
    }

};
