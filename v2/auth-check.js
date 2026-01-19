import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// notes.js dosyasındaki fonksiyonu içeri aktar
import { loadNotes } from './load-notes.js';

// Global değişkenler (diğer scriptlerden erişebilmek için)
export let currentUserData = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Oturum açık, veriler getiriliyor...");
        
        try {
            // 1. Firestore'dan Ekstra Verileri Al (Role, Groups)
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
        if (userDoc.exists()) {
            currentUserData = userDoc.data();

            const priorityName = currentUserData.name || user.email.split('@')[0];
        
            console.log("Belirlenen isim:", priorityName);
        
            // Hazırladığımız ismi 4. parametre olarak gönderiyoruz
            await loadNotes(user.uid, currentUserData.userGroups, currentUserData.role, priorityName);

                // Sayfayı görünür yap
                document.body.classList.remove('invisible', 'opacity-0');
                document.body.classList.add('transition-opacity', 'duration-500', 'opacity-100');
            } else {
                console.error("Kullanıcı dökümanı yok!");
                // Eğer döküman yoksa (ilk kayıt vb.) bir hata sayfasına veya profile yönlendirebilirsin
            }
        } catch (error) {
            console.error("Veri yükleme hatası:", error);
        }
    } else {
        // Oturum kapalıysa direkt login'e at
        window.location.replace("login.html");
    }
});





