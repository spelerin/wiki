import { auth, db } from './firebase-config.js'; // db'yi ekledik
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // Firestore metotları

const loginGoogleBtn = document.getElementById('loginWithGoogleBtn');
const loginMailBtn = document.getElementById('loginWithMailBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');

// Google giriş butonu tıklandığında
loginGoogleBtn.onclick = async () => {
    loginGoogleBtn.disabled = true;
    loginGoogleBtn.innerText = "Bağlanıyor...";
    
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        loginGoogleBtn.disabled = false;
        loginGoogleBtn.innerText = "Google ile Devam Et";
    }
};

// OTURUM DURUMUNU İZLE
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Oturum açık, UID:", user.uid);
        
        // 1. KULLANICIYI VERİTABANINA KAYDET/KONTROL ET
        await syncUserToFirestore(user);

        // Giriş butonlarını kilitle ve yönlendir
        loginGoogleBtn.disabled = true;
        loginMailBtn.disabled = true;       
        window.location.replace("index.html");
    } else {
        console.log("Giriş yapılmadı.");
    }
});

/**
 * Kullanıcı dökümanı yoksa varsayılan (pasif) değerlerle oluşturur
 */
async function syncUserToFirestore(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Eğer kullanıcı dökümanı henüz yoksa (İlk giriş)
        if (!userSnap.exists()) {
            console.log("Yeni kullanıcı kaydı oluşturuluyor...");
            
            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || user.email.split('@')[0], // Google ismi veya mail başı
                email: user.email,
                role: "user",           // Varsayılan rol
                userGroups: [],         // Varsayılan boş grup listesi
                isEnabled: false,       // ADMIN ONAYI BEKLİYOR (Aramalarda çıkmaz)
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
        } else {
            // Kullanıcı zaten varsa sadece son giriş tarihini güncelle
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        }
    } catch (error) {
        console.error("Kullanıcı senkronizasyon hatası:", error);
    }
}


// Şifreli giriş Butonuna Tıklandığında
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




