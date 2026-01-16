import { db } from './firebase-config.js';
import { collection, query, where, or, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, getBlob } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

let allNotes = [];
let isNoteDetailOpen = false; // Not detayının açık olup olmadığını takip eder
let selectedTags = [];
let currentUserId = null;
/**
 * Ana Fonksiyon: Notları Yükle *
 */
export async function loadNotes(uid, userGroups, role) {
    currentUserId = uid;
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

    if (selectedTags.length === 0 && !isNoteDetailOpen) {
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
    // Timestamp'in Firestore nesnesi mi yoksa düz date mi olduğunu kontrol et
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + " yıl önce"; // > 1 değil >= 1 olmalı
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + " ay önce";
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
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    const detailArea = document.getElementById("noteDetailArea");
    const mainListArea = document.getElementById("noteList");
    const stickyHeader = document.getElementById("stickyHeader");
    const tagSection = document.getElementById("tagCloudSection"); 
    const mainContent = document.getElementById("mainContent"); 

    isNoteDetailOpen = true; 
    renderTagCloud(); 
    
    // --- 1. ADIM: SIDEBAR VURGULAMA ---
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('bg-white', 'border-blue-600', 'shadow-sm');
        el.classList.add('border-transparent');
    });
    const activeItem = document.getElementById(`side-note-${noteId}`);
    if (activeItem) {
        activeItem.classList.add('bg-white', 'border-blue-600', 'shadow-sm');
        activeItem.classList.remove('border-transparent');
    }

    // --- 2. ADIM: HAVUZU KÜÇÜLT VE ALANI HAZIRLA ---
    tagSection.style.height = "100px";
    mainContent.style.flex = "1";
    mainContent.classList.remove("opacity-0");

    // İçeriği oluştur (Bu aşamada detailArea hala hidden)
    renderDetailHTML(note);
    loadComments(note.id, currentUserId);
    
// --- GEÇİŞ ANİMASYONU ---
    const mainListArea = document.getElementById("noteList");
    const stickyHeader = document.getElementById("stickyHeader");
    const detailArea = document.getElementById("noteDetailArea");

    mainListArea.classList.add("opacity-0");
    stickyHeader.classList.add("opacity-0");

    setTimeout(() => {
        mainListArea.classList.add("hidden");
        stickyHeader.classList.add("hidden");
        detailArea.classList.remove("hidden");

        void detailArea.offsetWidth; 

        detailArea.classList.add("opacity-100", "translate-y-0");
        detailArea.classList.remove("opacity-0", "translate-y-4");
        
        detailArea.scrollTo(0, 0); 
    }, 300);

    
}


/**
 * NOT DETAY HTML'İNİ OLUŞTURUR
 */
function renderDetailHTML(note) {
    const detailArea = document.getElementById("noteDetailArea");
    const processedContent = note.content ? note.content.replace(/\n/g, '<br>') : "";
    
    // Veri tipi güvenliği
    let noteFiles = [];
    if (note.files) {
        noteFiles = Array.isArray(note.files) ? note.files : [note.files];
    }

    detailArea.innerHTML = `
        <div class="p-6 md:p-10 bg-white min-h-screen">
            <button onclick="closeNoteDetail()" class="flex items-center gap-2 text-slate-400 hover:text-slate-600 mb-8 cursor-pointer group">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
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

            ${noteFiles.length > 0 ? `
                <div class="mt-12 pt-8 border-t border-slate-100">
                    <h5 class="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6">Ekli Dosyalar (${noteFiles.length})</h5>
                    <div id="secure-file-list" class="flex flex-col gap-3">
                        ${noteFiles.map((file, index) => `
                            <div class="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 transition-all group">
                                <div class="flex items-center gap-3 overflow-hidden">
                                    <div class="p-2 bg-white rounded-lg border border-slate-200 text-slate-400">
                                        ${(file.type && file.type.startsWith('image/')) ? 
                                            '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>' : 
                                            '<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>'
                                        }
                                    </div>
                                    <div class="flex flex-col truncate">
                                        <span class="text-sm font-semibold text-slate-700 truncate">${file.name}</span>
                                        <span class="text-[10px] text-slate-400 uppercase font-bold">${file.type.split('/')[1] || 'dosya'}</span>
                                    </div>
                                </div>
                                
                                <button onclick="handleSecureDownload(this, '${file.path}', '${file.name}')" 
                                        class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shrink-0">
                                    <span>İndir / Görüntüle</span>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
// (etiketlerden hemen önce):
`
    <div class="mt-16 pt-10 border-t-2 border-slate-100">
        <div class="flex items-center justify-between mb-8">
            <h3 class="text-xl font-bold text-slate-800">Yorumlar ve İlave Notlar</h3>
            <span id="comment-count-badge" class="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded-full">0 Yorum</span>
        </div>

        <div id="comments-container" class="space-y-8 mb-12">
            <div class="animate-pulse flex space-x-4">
                <div class="flex-1 space-y-4 py-1">
                    <div class="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div class="space-y-2">
                        <div class="h-4 bg-slate-200 rounded"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h4 class="text-sm font-bold text-slate-700 uppercase mb-4">Yeni Ekleme Yap</h4>
            <textarea id="comment-input" rows="3" class="w-full p-4 rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-slate-600 mb-4" placeholder="Eklemek istediğiniz bilgileri buraya yazın..."></textarea>
            
            <div class="flex items-center justify-between">
                <button class="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    <span>Dosya Ekle</span>
                </button>

                <button onclick="saveNewComment('${note.id}')" class="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                    Gönder
                </button>
            </div>
        </div>
    </div>
`
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
    isNoteDetailOpen = false;
    const tagSection = document.getElementById("tagCloudSection");
    const mainContent = document.getElementById("mainContent");
    const detailArea = document.getElementById("noteDetailArea");
    const mainListArea = document.getElementById("noteList");
    const stickyHeader = document.getElementById("stickyHeader");

    // Sidebar vurgusunu temizle
    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('bg-white', 'border-blue-600', 'shadow-sm');
        el.classList.add('border-transparent');
    });

    // Detayı gizle
    detailArea.classList.add("opacity-0", "translate-y-4");
    detailArea.classList.remove("opacity-100", "translate-y-0");

    setTimeout(() => {
        detailArea.classList.add("hidden");

        // Listeyi ve header'ı geri getir
        mainListArea.classList.remove("hidden");
        stickyHeader.classList.remove("hidden");

        void mainListArea.offsetWidth;
        mainListArea.classList.remove("opacity-0");
        stickyHeader.classList.remove("opacity-0");
    }, 300);

    renderTagCloud();
    
    if (selectedTags.length === 0) {
        tagSection.style.height = "calc(100vh - 64px)";
        mainContent.style.flex = "0";
    }
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


/**
 * GÜVENLİ DOSYA GÖRÜNTÜLEME
 * Bu fonksiyon, dosyayı Blob olarak indirir ve geçici bir tarayıcı linki oluşturur.
 */
async function getSecureFileUrl(filePath) {
    try {
        const fileRef = ref(storage, filePath);
        // getBlob, kullanıcının o anki giriş bilgilerini (Active Auth) kullanır.
        const blob = await getBlob(fileRef);
        // Sadece bu tarayıcı sekmesinde geçerli, dışarıda çalışmayan geçici bir link oluşturur.
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error("Dosyaya erişim yetkiniz yok veya dosya bulunamadı:", error);
        return null;
    }
}

/**
 * DOSYAYI GÜVENLİ ŞEKİLDE İNDİRİR VEYA AÇAR
 */
window.handleSecureDownload = async function(btn, filePath, fileName) {
    const originalContent = btn.innerHTML;
    
    // Spinner / Yükleniyor Durumu
    btn.disabled = true;
    btn.innerHTML = `
        <svg class="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Hazırlanıyor...</span>
    `;

    try {
        // Sadece bu aşamada getBlob çalışır
        const secureUrl = await getSecureFileUrl(filePath);
        
        if (secureUrl) {
            const a = document.createElement('a');
            a.href = secureUrl;
            a.download = fileName;
            a.target = "_blank"; // Tarayıcı destekliyorsa yeni sekmede açar
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    } catch (error) {
        alert("Dosya indirilemedi. Yetkiniz olmayabilir.");
    } finally {
        // Butonu eski haline döndür
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
};


/**
 * YORUMLARI GETİR VE GÖSTER
 */
async function loadComments(noteId, currentUid) {
    const container = document.getElementById("comments-container");
    const badge = document.getElementById("comment-count-badge");
    
    // Firestore sorgusu
    const q = query(collection(db, "comments"), where("noteId", "==", noteId), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    
    container.innerHTML = snap.empty ? '<p class="text-slate-400 text-center italic">Henüz bir ekleme yapılmamış.</p>' : "";
    badge.innerText = `${snap.size} Yorum`;

    snap.forEach(doc => {
        const comment = { id: doc.id, ...doc.data() };
        const isOwner = comment.authorId === currentUid;

        const commentHtml = `
            <div id="comment-${comment.id}" class="group relative">
                <div class="flex items-center gap-3 mb-2">
                    <span class="font-bold text-sm text-slate-800">@${comment.authorName}</span>
                    <span class="text-[10px] text-slate-400 uppercase font-bold">${formatTimeAgo(comment.createdAt)}</span>
                    
                    ${isOwner ? `
                        <div class="hidden group-hover:flex items-center gap-2 ml-auto">
                            <button onclick="editComment('${comment.id}')" class="text-xs text-slate-400 hover:text-blue-600 font-bold">Düzenle</button>
                            <button onclick="deleteComment('${comment.id}')" class="text-xs text-slate-400 hover:text-red-600 font-bold">Sil</button>
                        </div>
                    ` : ''}
                </div>

                <div class="prose prose-slate max-w-none text-slate-600 leading-relaxed bg-white border-l-4 border-slate-200 pl-4 py-1">
                    ${comment.content.replace(/\n/g, '<br>')}
                </div>

                ${comment.files && comment.files.length > 0 ? `
                    <div class="mt-4 ml-4 space-y-2">
                        ${comment.files.map(file => `
                            <button onclick="handleSecureDownload(this, '${file.path}', '${file.name}')" 
                                    class="flex items-center gap-2 text-[11px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                ${file.name}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', commentHtml);
    });
}


window.deleteComment = async function(commentId) {
    if (!confirm("Bu eklemeyi kalıcı olarak silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "comments", commentId));
        document.getElementById(`comment-${commentId}`).remove();
    } catch (e) { alert("Silme hatası: " + e.message); }
};

window.editComment = function(commentId) {
    const container = document.querySelector(`#comment-${commentId} .prose`);
    const currentText = container.innerHTML.replace(/<br>/g, '\n');
    
    container.innerHTML = `
        <textarea id="edit-area-${commentId}" class="w-full p-2 border rounded-lg text-sm">${currentText}</textarea>
        <div class="flex justify-end gap-2 mt-2">
            <button onclick="cancelEdit('${commentId}', '${currentText}')" class="text-xs font-bold text-slate-400">İptal</button>
            <button onclick="saveEdit('${commentId}')" class="text-xs font-bold text-blue-600">Kaydet</button>
        </div>
    `;
};


// Global scope'a ekle (HTML'den erişim için)
window.showNoteDetail = showNoteDetail;
