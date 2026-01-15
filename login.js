import { auth } from './firebase-config.js';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginGoogleBtn = document.getElementById('loginWithGoogleBtn');
const loginMailBtn = document.getElementById('loginWithMailBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');

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

	window.location.replace("index.html");
    } else {
        // KULLANICI YOKSA (Veya çıkış yaptıysa)
        loginGoogleBtn.classList.remove('hidden'); // Giriş butonunu göster
        loginMailBtn.classList.remove('hidden'); // Giriş butonunu göster     

        console.log("Giriş yapılmadı.");
    }
});


// Giriş Mail Butonu Tıklandığında
loginMailBtn.onclick = async () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;

    if (!email || !password) return alert("Lütfen tüm alanları doldurun.");

    setLoginLoading(true); // BEKLEME EFEKTİNİ BAŞLAT

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Giriş başarılı olduğunda onAuthStateChanged zaten yönlendirme yapacak
    } catch (error) {
        setLoginLoading(false); // HATA OLURSA EFEKTİ DURDUR (Kullanıcı tekrar denesin)
        console.error("Giriş hatası:", error.code);
        alert("Hatalı e-posta veya şifre!");
    }
};



// Bekleme durumunu kontrol eden fonksiyon
function setLoginLoading(isLoading) {
    if (isLoading) {
        loginMailBtn.disabled = true; // Tekrar basılmasını engelle
        loginSpinner.classList.remove('hidden'); // Spinner'ı göster
        loginBtnText.innerText = "Giriş yapılıyor..."; // Metni değiştir
    } else {
        loginMailBtn.disabled = false;
        loginSpinner.classList.add('hidden'); // Spinner'ı gizle
        loginBtnText.innerText = "Giriş Yap";
    }
}

