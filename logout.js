import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. Adım: Butonu seç
const logoutBtn = document.getElementById('btnLogout');

// 2. Adım: Buton bulundu mu kontrol et
if (logoutBtn) {
    console.log("Çıkış butonu başarıyla bulundu, olay dinleyici ekleniyor...");
    
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log("Çıkış butonuna tıklandı!");

        try {
            await signOut(auth);
            console.log("Firebase oturumu kapatıldı.");
            window.location.replace("login.html"); // .href yerine .replace daha sağlıklıdır
        } catch (error) {
            console.error("Çıkış hatası:", error);
            alert("Çıkış yapılamadı!");
        }
    });
} else {
    // Eğer konsolda bunu görüyorsan, JS butona ulaşamıyor demektir.
    console.error("HATA: 'btnLogout' id'li buton bulunamadı!");
}

