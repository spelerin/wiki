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
    const tagSection = document.getElementById("tagCloudSection");
    const tagContainer = document.getElementById("tagCloud");
    const mainContent = document.getElementById("mainContent");
    const stickyHeader = document.getElementById("stickyHeader");

    // Etiket sayıları (Aynı)
    const tagCounts = {};
    allNotes.forEach(note => {
        if (note.tags) {
            note.tags.forEach(tag => { 
                const lowerTag = tag.toLowerCase();
                tagCounts[lowerTag] = (tagCounts[lowerTag] || 0) + 1; 
            });
        }
    });

    tagContainer.innerHTML = "";

    if (selectedTags.length === 0) {
        // --- DURUM 1: TAM EKRAN (Geniş Boşluklar) ---
        tagSection.style.height = "calc(100vh - 64px)";
        // Geniş boşluk sınıfları
        tagContainer.className = "flex flex-wrap justify-center gap-x-8 gap-y-6 max-w-6xl mx-auto px-6 py-10 transition-all duration-300";
        
        mainContent.style.flex = "0"; 
        stickyHeader.classList.replace("opacity-100", "opacity-0");
        
        renderTags(tagCounts, true); 
    } else {
        // --- DURUM 2: HEADER MODU (Sıkışık Boşluklar) ---
        tagSection.style.height = "100px"; // Yüksekliği biraz daha azalttım (160'tan 100'e)
        // Çok daha dar boşluk sınıfları (gap-2 ve py-2)
        tagContainer.className = "flex flex-wrap justify-center gap-x-2 gap-y-1 max-w-6xl mx-auto px-6 py-2 transition-all duration-300";
        
        mainContent.style.flex = "1";
        stickyHeader.classList.replace("opacity-0", "opacity-100");

        renderTags(tagCounts, false); 
    }
}

function renderTags(tagCounts, isLarge) {
    const tagContainer = document.getElementById("tagCloud");
    
    Object.keys(tagCounts).forEach(tag => {
        if (!isLarge && selectedTags.includes(tag)) return;

        const count = tagCounts[tag];
        
        // Boyut ve Kenar Boşluğu Ayarı
        let sizeClass, marginClass;
        
        if (isLarge) {
            sizeClass = count > 10 ? "text-5xl" : (count > 5 ? "text-3xl" : "text-xl");
            marginClass = "m-4"; // Tam ekranda geniş margin
        } else {
            sizeClass = "text-[13px]"; // Daha küçük font
            marginClass = "m-1"; // Daralınca çok küçük margin
        }

        const btn = document.createElement("button");
        // 'm-4' yerine dinamik 'marginClass' kullanıyoruz
        btn.className = `${sizeClass} font-bold text-slate-400 hover:text-blue-600 ${marginClass} transition-all duration-150 cursor-pointer`;
        btn.innerText = `#${tag.toLowerCase()}`;
        btn.onclick = () => addTagFilter(tag);
        tagContainer.appendChild(btn);
    });
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
                    x
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

    notes.forEach(note => {
        const card = `
            <div onclick="showNoteDetail('${note.id}')" class="py-4 px-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div class="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                    <h4 class="text-[15px] md:text-base font-semibold ${note.isUrgent ? 'text-red-600' : 'text-blue-600'} group-hover:underline">
                        ${note.title}
                    </h4>
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
    const sidebarContainer = document.getElementById("noteSidebar");
    sidebarContainer.innerHTML = "";

    const now = new Date();
    const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);

    notes.forEach(note => {
        const isUrgent = note.isUrgent === true;
        const hasNewReply = note.lastReplyAt && note.lastReplyAt.toMillis() > twentyFourHoursAgo;
        const replyCount = hasNewReply ? (note.replyCount || "") : "";

        // Tıklama olayını buraya ekledik:
        const item = `
            <a href="#" 
               id="side-note-${note.id}"
               onclick="event.preventDefault(); showNoteDetail('${note.id}')" 
               class="sidebar-item block px-4 py-3 hover:bg-white transition-all duration-200 border-r-4 border-transparent">
                <div class="flex justify-between items-start gap-2">
                    <span class="text-[13px] font-medium ${isUrgent ? 'text-red-700' : 'text-slate-700'} leading-tight">
                        ${note.title}
                    </span>
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


/**
 * NOT DETAYINI GÖSTER
 */
function showNoteDetail(noteId) {
    //----SOL BARDA TIKLANAN BAŞLIK İÇİN
    // --- SEÇİLİ DURUMU GÜNCELLE (Sidebar Highlight) ---
    // 1. Önce tüm sidebar öğelerinden aktiflik sınıflarını kaldır
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('bg-white', 'border-blue-600', 'shadow-sm');
        el.classList.add('border-transparent');
    });

    // 2. Tıklanan öğeyi bul ve aktif yap
    const activeItem = document.getElementById(`side-note-${noteId}`);
    if (activeItem) {
        activeItem.classList.add('bg-white', 'border-blue-600', 'shadow-sm');
        activeItem.classList.remove('border-transparent');
    }
    //---
    
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const detailArea = document.getElementById("noteDetailArea");
    const mainListArea = document.getElementById("noteList");
    const stickyHeader = document.getElementById("stickyHeader");

    // 1. İçeriği her zaman olduğu gibi doldur
    renderDetailHTML(note);

    // 2. Önce listeyi ve header'ı yumuşakça gizle
    mainListArea.classList.add("opacity-0");
    stickyHeader.classList.add("opacity-0");

    setTimeout(() => {
        mainListArea.classList.add("hidden");
        stickyHeader.classList.add("hidden");

        // 3. Detay alanını görünür yap ama hala şeffaf ve aşağıda tut
        detailArea.classList.remove("hidden");
        
        // KRİTİK NOKTA: Tarayıcıyı "reflow" yapmaya zorla (Görünmez bir hesaplama)
        void detailArea.offsetWidth; 

        // 4. Şimdi animasyonu başlat
        detailArea.classList.add("opacity-100", "translate-y-0");
        detailArea.classList.remove("opacity-0", "translate-y-4");
    }, 300); // Listenin kaybolma süresiyle uyumlu
}


/**
 * NOT DETAY HTML'İNİ OLUŞTURUR
 */
function renderDetailHTML(note) {
    const detailArea = document.getElementById("noteDetailArea");
    const processedContent = note.content ? note.content.replace(/\n/g, '<br>') : "";

    // Dosyaları ayır: Resimler ve Diğerleri
    const images = note.files ? note.files.filter(f => f.type.startsWith('image/')) : [];
    const documents = note.files ? note.files.filter(f => !f.type.startsWith('image/')) : [];

    detailArea.innerHTML = `
        <div class="p-6 md:p-10 bg-white min-h-screen">
            <button onclick="closeNoteDetail()" class="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-8 cursor-pointer group">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                <span class="font-medium text-sm">Listeye Geri Dön</span>
            </button>

            <div class="mb-10">
                <h2 class="text-3xl font-black text-slate-800 mb-4 leading-tight">${note.title}</h2>
                <div class="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span class="text-slate-600">@${note.ownerName || 'kullanici'}</span>
                    <span>&bull;</span>
                    <span>${formatTimeAgo(note.createdAt)}</span>
                </div>
            </div>

            <div class="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg mb-12">
                ${processedContent}
            </div>

            ${(images.length > 0 || documents.length > 0) ? `
                <div class="mt-12 pt-8 border-t border-slate-100">
                    <h5 class="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Ekli Dosyalar</h5>
                    
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        ${images.map(img => `
                            <div class="relative aspect-square overflow-hidden rounded-lg border border-slate-200 cursor-pointer group" 
                                 onclick="openLightbox('${img.url}')">
                                <img src="${img.url}" class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110">
                                <div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="flex flex-col gap-2">
                        ${documents.map(doc => `
                            <a href="${doc.url}" target="_blank" download="${doc.name}" 
                               class="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all group">
                                <div class="flex items-center gap-3">
                                    <div class="p-2 bg-white rounded-lg border border-slate-200 text-slate-400 group-hover:text-blue-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-sm font-semibold text-slate-700">${doc.name}</span>
                                        <span class="text-[10px] text-slate-400 uppercase font-bold">${doc.type.split('/')[1] || 'dosya'}</span>
                                    </div>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </a>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="mt-12 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                ${note.tags ? note.tags.map(tag => `<span class="text-blue-600 font-bold text-sm bg-blue-50 px-3 py-1 rounded">#${tag.toLowerCase()}</span>`).join('') : ''}
            </div>
        </div>
    `;
}



/**
 * DETAYI KAPAT VE LİSTEYE DÖN
 */
window.closeNoteDetail = function() {
//----SOL BARDA TIKLANAN BAŞLIK İÇİN
document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('bg-white', 'border-blue-600', 'shadow-sm');
        el.classList.add('border-transparent');
    });
//----
    
    const detailArea = document.getElementById("noteDetailArea");
    const mainListArea = document.getElementById("noteList");
    const stickyHeader = document.getElementById("stickyHeader");

    // 1. Detayı aşağı kaydır ve şeffaflaştır
    detailArea.classList.add("opacity-0", "translate-y-4");
    detailArea.classList.remove("opacity-100", "translate-y-0");

    setTimeout(() => {
        // 2. Animasyon bitince alanı tamamen kaldır
        detailArea.classList.add("hidden");

        // 3. Listeyi geri getir
        mainListArea.classList.remove("hidden");
        stickyHeader.classList.remove("hidden");

        // 4. Listeyi yumuşakça belirginleştir
        void mainListArea.offsetWidth;
        mainListArea.classList.remove("opacity-0");
        stickyHeader.classList.remove("opacity-0");
    }, 300);
};


/**
 * LIGHTBOX AÇ
 */
window.openLightbox = function(url) {
    // Lightbox HTML'i var mı kontrol et, yoksa oluştur
    let lightbox = document.getElementById('lightbox-overlay');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox-overlay';
        lightbox.className = 'fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 opacity-0 pointer-events-none transition-opacity duration-300';
        lightbox.innerHTML = `
            <button onclick="closeLightbox()" class="absolute top-6 right-6 text-white hover:text-red-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img id="lightbox-img" src="" class="max-w-full max-h-full rounded-lg shadow-2xl transform scale-95 transition-transform duration-300">
        `;
        document.body.appendChild(lightbox);
    }

    const img = document.getElementById('lightbox-img');
    img.src = url;
    
    lightbox.classList.remove('pointer-events-none', 'opacity-0');
    lightbox.classList.add('opacity-100');
    setTimeout(() => img.classList.replace('scale-95', 'scale-100'), 10);
};

/**
 * LIGHTBOX KAPAT
 */
window.closeLightbox = function() {
    const lightbox = document.getElementById('lightbox-overlay');
    const img = document.getElementById('lightbox-img');
    
    img.classList.replace('scale-100', 'scale-95');
    lightbox.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => {
        lightbox.classList.add('pointer-events-none');
    }, 300);
};


// Global scope'a ekle (HTML'den erişim için)
window.showNoteDetail = showNoteDetail;
