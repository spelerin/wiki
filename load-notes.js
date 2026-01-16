import { db } from './firebase-config.js';
import { collection, query, where, or, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let allNotes = [];
let selectedTags = [];

/**
 * Ana Fonksiyon: Notları Yükle *
 */
export async function loadNotes(uid, userGroups, role) {
    const notesRef = collection(db, "notes");
    let q;

    if (role === 'admin') {
        q = query(notesRef, orderBy("createdAt", "desc"));
    } else {
        q = query(
            notesRef,
            or(
                where("ownerId", "==", uid),
                where("allowedUsers", "array-contains", uid),
                where("allowedUserGroups", "array-contains-any", userGroups.length > 0 ? userGroups : ["_none_"])
            ),
            orderBy("createdAt", "desc")
        );
    }

    try {
        const querySnapshot = await getDocs(q);
        allNotes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        renderTagCloud(); // Başlangıçta büyük etiketler
        renderSidebar(allNotes);
        // renderMainContent(allNotes);  <-- BURAYI SİLDİK: Başlangıçta boş gelecek.
        document.getElementById("noteList").innerHTML = `<div class="p-20 text-center text-slate-400">Lütfen filtrelemek için bir etiket seçin.</div>`;
    } catch (error) {
        console.error("Yükleme hatası:", error);
    }
}

/**
 * ETİKET BULUTU: Dinamik Boyutlandırma ve Daralma
 */
function renderTagCloud() {
    const tagCounts = {};
    allNotes.forEach(note => {
        if (note.tags) {
            note.tags.forEach(tag => { 
                const lowerTag = tag.toLowerCase();
                tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1; 
            });
        }
    });

    const tagContainer = document.getElementById("tagCloud");
    const tagSection = document.getElementById("tagCloudSection");
    const mainContent = document.getElementById("mainContent");

    tagContainer.innerHTML = "";

    if (selectedTags.length === 0) {
        // --- BAŞLANGIÇ DURUMU: TÜM EKRAN ---
        tagSection.className = "fixed inset-0 bg-slate-50 z-50 flex items-center justify-center transition-all duration-700 ease-in-out";
        mainContent.classList.add("opacity-0"); // İçeriği gizle
        
        Object.keys(tagCounts).forEach(tag => {
            const count = tagCounts[tag];
            // Başlangıçta çok daha büyük fontlar
            const sizeClass = count > 10 ? "text-5xl font-black" : (count > 5 ? "text-3xl font-bold" : "text-xl font-medium");
            
            const btn = document.createElement("button");
            btn.className = `${sizeClass} text-slate-400 hover:text-blue-600 m-4 transition-all duration-300 hover:scale-110`;
            btn.innerText = `#${tag}`;
            btn.onclick = () => addTagFilter(tag);
            tagContainer.appendChild(btn);
        });
    } else {
        // --- SEÇİM YAPILDIĞINDA: YUKARI DARAL ---
        tagSection.className = "relative h-auto p-6 bg-slate-50 border-b border-slate-100 transition-all duration-700 ease-in-out";
        mainContent.classList.remove("opacity-0"); // İçeriği göster
        mainContent.classList.add("opacity-100");

        Object.keys(tagCounts).forEach(tag => {
            if (selectedTags.includes(tag)) return; // Seçilenleri havuzdan çıkar

            const btn = document.createElement("button");
            // Daralınca etiketler küçülsün
            btn.className = "text-sm font-bold text-slate-400 hover:text-blue-600 m-2 transition-all duration-300";
            btn.innerText = `#${tag}`;
            btn.onclick = () => addTagFilter(tag);
            tagContainer.appendChild(btn);
        });
    }
}

function renderActiveFilters() {
    const headerContainer = document.getElementById("activeFiltersHeader");
    headerContainer.innerHTML = "";

    if (selectedTags.length === 0) {
        headerContainer.innerHTML = '<h3 class="font-bold text-slate-400 text-sm">Filtrelemek için yukarıdan etiket seçin</h3>';
        document.getElementById("noteCount").classList.add("hidden");
    } else {
        selectedTags.forEach(tag => {
        const badge = `
            <span class="flex items-center gap-1 bg-transparent text-slate-700 px-2 py-1 font-bold text-base">
                #${tag.toLowerCase()}
                <button onclick="removeTagFilter('${tag.toLowerCase()}')" class="text-slate-400 text-xs leading-none ml-1">
                    ✕
                </button>
            </span>
        `;
            headerContainer.insertAdjacentHTML('beforeend', badge);
        });
        document.getElementById("noteCount").classList.remove("hidden");
    }

    applyFilters();
}

/**
 * FİLTRELEME VE SAYI GÜNCELLEME
 */
function applyFilters() {
    const noteList = document.getElementById("noteList");
    const countBadge = document.getElementById("noteCount");

    if (selectedTags.length === 0) {
        noteList.innerHTML = `<div class="p-20 text-center text-slate-400">Notları görmek için etiket seçin.</div>`;
        countBadge.innerText = "0 Başlık";
        renderTagCloud(); 
        return;
    }

    // Seçili TÜM etiketleri içeren notları filtrele (AND mantığı)
    const filtered = allNotes.filter(note => 
        selectedTags.every(t => note.tags && note.tags.includes(t))
    );

    // Sayıyı Güncelle
    countBadge.innerText = `${filtered.length} Başlık`;

    renderMainContent(filtered);
    renderTagCloud();
}

/**
 * ANA İÇERİK LİSTELEME (Sadece renderMainContent içinde bir küçük düzeltme)
 */
function renderMainContent(notes) {
    const mainContainer = document.getElementById("noteList");
    mainContainer.innerHTML = "";

    if (notes.length === 0) {
        mainContainer.innerHTML = `<div class="p-20 text-center text-slate-400">Bu etiket kombinasyonuna uygun not bulunamadı.</div>`;
        return;
    }

    notes.forEach(note => {
        // ... (Kart yapısı öncekiyle aynı) ...
        const card = `
            <div class="py-4 px-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div class="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                    <h4 class="text-[15px] md:text-base font-semibold ${note.isUrgent ? 'text-red-600' : 'text-blue-600'} group-hover:underline">
                        ${note.title}
                    </h4>
                    <div class="flex items-center gap-2 text-[11px] text-slate-400">
                        <span class="font-bold text-slate-600">@${note.ownerName || 'anonim'}</span>
                        <span>&bull;</span>
                        <span>${formatTimeAgo(note.createdAt)}</span>
                    </div>
                </div>
                <p class="text-[13px] text-slate-500 line-clamp-1 mt-1 leading-relaxed">${note.content || ''}</p>
            </div>
        `;
        mainContainer.insertAdjacentHTML('beforeend', card);
    });
}

function addTagFilter(tag) {
    if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        renderActiveFilters();
    }
}

// Global scope'a taşıyoruz ki HTML'deki onclick çalışsın
window.removeTagFilter = (tag) => {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderActiveFilters();
};

/**
 * SOL MENÜ: Başlık Listesi
 */
function renderSidebar(notes) {
    const sidebarContainer = document.getElementById("noteSidebar"); // Güncellendi
    sidebarContainer.innerHTML = "";

    const now = new Date();
    const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);

    notes.forEach(note => {
        const isUrgent = note.isUrgent === true;
        
        // Yeni cevap kontrolü (Veritabanında 'lastReplyAt' veya benzeri bir alan olduğunu varsayıyoruz)
        const hasNewReply = note.lastReplyAt && note.lastReplyAt.toMillis() > twentyFourHoursAgo;
        const replyCount = hasNewReply ? (note.replyCount || "") : "";

        const item = `
            <a href="#" class="block px-4 py-3 hover:bg-white transition-colors ${isUrgent ? 'bg-red-50/50' : ''}">
                <div class="flex justify-between items-start gap-2">
                    <span class="text-[13px] font-medium ${isUrgent ? 'text-red-700' : 'text-slate-700'} leading-tight">${note.title}</span>
                    ${isUrgent ? 
                        '<span class="text-[10px] font-bold text-white bg-red-500 px-1 rounded italic shrink-0">ACİL</span>' : 
                        (hasNewReply ? `<span class="text-[10px] font-bold text-slate-400 bg-slate-200 px-1 rounded">${replyCount}</span>` : '')
                    }
                </div>
            </a>
        `;
        sidebarContainer.insertAdjacentHTML('beforeend', item);
    });
}



/**
 * Filtreleme Fonksiyonu
 */
function filterByTag(tag) {
    const filtered = allNotes.filter(n => n.tags && n.tags.includes(tag));
    renderMainContent(filtered);
}

/**
 * Yardımcı Fonksiyon: Zaman formatlama
 */
function formatTimeAgo(timestamp) {
    if (!timestamp) return "Az önce";
    const seconds = Math.floor((new Date() - timestamp.toDate()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval > 1) return interval + " yıl önce";
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) return interval + " ay önce";
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval === 1 ? "Dün" : interval + " gün önce";
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + " sa önce";
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + " dk önce";
    return "Az önce";
}
