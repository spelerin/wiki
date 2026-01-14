import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const logoutBtn = document.getElementById('btnLogout');

// 'userLoggedIn' sinyalini dinle
window.addEventListener('userLoggedIn', async (e) => {
    const uid = e.detail;
    console.log("AfterLogin modülü çalışıyor. Veriler çekilecek...");
    await veriCek();
});

async function veriCek() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = "Veriler yükleniyor...";

    try {
        const q = query(collection(db, "notes"), where("category", "==", "elektrik"));
        const querySnapshot = await getDocs(q);
        
        resultsDiv.innerHTML = ""; // Temizle

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Tailwind kartımızı buraya basıyoruz
            resultsDiv.innerHTML += `
                <div class="bg-white p-4 border-l-4 border-yellow-500 shadow mb-2 rounded">
                    <h3 class="font-bold">${data.title || "Başlıksız Not"}</h3>
                    <p class="text-sm text-gray-600">${data.content || ""}</p>
                </div>
            `;
        });
    } catch (err) {
        console.error("Veri çekme hatası:", err);
    }

}



