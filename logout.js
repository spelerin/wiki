import { auth } from './firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


const logoutBtn = document.getElementById('btnLogout');


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



