// main.js
import { db, auth } from './firebase-config.js';
import { collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { Store } from './store.js';
import { UI } from './ui-controller.js';
import { TagUI } from './ui-controller.js'; // TagCloud için
import { SearchService } from './search-service.js';
import { Actions } from './actions.js';

/**
 * APP INITIALIZATION (Uygulama Başlatma)
 */
const initApp = () => {
    // 1. Auth Takibi (Giriş yapan kullanıcıyı Store'a kaydet)
    auth.onAuthStateChanged(user => {
        if (user) {
            Store.state.currentUser = user;
            fetchInitialData();
            setupEventListeners();
            // Sayfayı görünür yap (Senin index.html'deki invisible sınıfını kaldırır)
            document.body.classList.remove('invisible', 'opacity-0');
        } else {
            window.location.href = "login.html";
        }
    });
};

/**
 * REAL-TIME DATA (Veriyi Canlı Dinle)
 * onSnapshot kullanarak Firebase'den veri değiştikçe Store'u otomatik güncelliyoruz.
 */
const fetchInitialData = () => {
    const notesRef = collection(db, "notes");
    const q = query(notesRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Merkezi Depoyu (Store) Güncelle
        Store.state.allNotes = notes;
        
        // Arayüzü İlk Kez Render Et
        UI.render(); 
        TagUI.update(Store.state);
    });
};

/**
 * GLOBAL EVENT LISTENERS
 */
const setupEventListeners = () => {
    // Arama Kutusu (Debounced)
    const searchInput = document.querySelector('input[placeholder="Hızlı ara..."]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => SearchService.handleSearch(e.target.value));
    }

    // Logout Butonu
    const logoutBtn = document.getElementById("btnLogout");
    if (logoutBtn) {
        logoutBtn.onclick = () => auth.signOut();
    }
};

// Uygulamayı başlat
initApp();