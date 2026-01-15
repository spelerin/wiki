import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Bu fonksiyon dosya çağrıldığı an otomatik çalışacak
onAuthStateChanged(auth, (user) => {
    if (user) {
        // KULLANICI VAR: Sayfayı görünür yap
        console.log("Yetki onaylandı:", user.email);
        
        // Kullanıcı varsa gizliliği kaldıran sınıfları sil veya stili değiştir
        const body = document.body;
        
        // Tailwind kullanıyorsan:
        body.classList.remove('invisible', 'opacity-0');
        body.classList.add('transition-opacity', 'duration-500', 'opacity-100'); // Yumuşak açılış için
    } else {
        window.location.replace("login.html");
    }
});
