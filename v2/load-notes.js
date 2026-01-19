import { db } from './firebase-config.js';
import { collection, query, where, or, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getStorage, ref as sRef, getBlob, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

// GLOBAL DEĞİŞKENLER
let allNotes = [];
let isNoteDetailOpen = false;
let selectedTags = [];
let currentUserId = null;
let currentUserName = "Kullanıcı";
let currentUserGroups = []; 
let currentUserRole = "user"; 
let selectedFiles = []; 
let selectedEntitiesList = []; // Grup/Kişi seçimi için
let searchTimer;

/**
 * ANA FONKSİYON: Notları ve Kullanıcıyı Yükle
 */
export async function loadNotes(uid, userGroups, role, displayName) {
    currentUserId = uid;
    currentUserName = displayName || "Kullanıcı";
    currentUserGroups = userGroups || [];
    currentUserRole = role || "user";
    
    console.log("Sistem hazır:", currentUserName);

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

        renderTagCloud();
        renderSidebar(allNotes);
        document.getElementById("noteList").innerHTML = `<div class="p-20 text-center text-slate-400">Lütfen filtrelemek için bir etiket seçin.</div>`;
    } catch (error) {
        console.error("Yükleme hatası:", error);
    }
}

/**
 * YENİ YAZI PANELİNİ AÇAR (Senin temanla revize edildi)
 */
window.openNoteCreate = function() {
    const createArea = document.getElementById("noteCreateArea");
    if(!createArea) {
        console.error("HATA: index.html içinde 'noteCreateArea' id'li bir div bulunamadı!");
        return;
    }

    selectedEntitiesList = []; // Temizle
    selectedFiles = []; // Temizle

    createArea.innerHTML = `
    <div class="bg-slate-50 text-slate-800 min-h-screen pb-20">
        <header class="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-30">
            <div class="flex items-center gap-4">
                <button onclick="closeNoteCreate()" class="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <h1 class="text-sm font-black uppercase tracking-wider text-slate-700 underline decoration-blue-500 decoration-2 underline-offset-4">Yeni Başlık Oluştur</h1>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="saveNewNote()" id="save-note-btn" class="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all uppercase tracking-tight">YAYINLA</button>
            </div>
        </header>

        <main class="max-w-4xl mx-auto py-10 px-4">
            <div class="bg-white rounded-[2.5rem] border border-slate-200 form-shadow overflow-hidden">
                <div class="p-8 md:p-14 space-y-12">
                    
                    <div>
                        <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Başlık</label>
                        <input type="text" id="new-note-title" placeholder="Konu başlığını buraya girin..." class="w-full text-2xl md:text-4xl font-extrabold border-none focus:ring-0 placeholder:text-slate-200 outline-none p-0 tracking-tight bg-transparent">
                    </div>

                    <div class="pt-8 border-t border-slate-50">
                        <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Ana Etiket (Zorunlu)</label>
                        <select id="new-note-primary-tag" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all cursor-pointer text-slate-700">
                            <option value="" disabled selected>Etiket Seçin...</option>
                            <option value="elektrik">Elektrik</option>
                            <option value="mekanik">Mekanik</option>
                            <option value="mimari">Mimari</option>
                            <option value="jeoloji">Jeoloji</option>
                            <option value="inşaat">İnşaat</option>
                            <option value="genel">Genel</option>
                        </select>
                    </div>

                    <div class="pt-8 border-t border-slate-50">
                        <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Alt Etiketler (Virgül ile ayırın)</label>
                        <input type="text" id="new-note-sub-tags" 
                               oninput="validateSubTags(this)"
                               placeholder="örn: kompanzasyon, trafo bakımı" 
                               class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all text-slate-700 placeholder:text-slate-300">
                        
                        <p id="sub-tags-error" class="hidden text-[10px] text-red-500 font-bold mt-2 animate-bounce">
                            ⚠️ Etiketler en fazla 2 kelime olabilir! Lütfen kelimeleri virgül (,) ile ayırın.
                        </p>
                    </div>                  

                    <div class="pt-8 border-t border-slate-50">
                        <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Görünürlük</label>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                            <label onclick="toggleSelectionArea(false)" class="relative flex flex-col p-5 bg-slate-50 rounded-2xl border-2 border-transparent cursor-pointer hover:border-blue-100 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/50 transition-all group">
                                <input type="radio" name="visibility" value="public" class="hidden" checked>
                                <span class="text-sm font-bold text-slate-800 group-hover:text-blue-700">Şirket Geneli</span>
                                <span class="text-[10px] text-slate-400 mt-1">Herkes erişebilir</span>
                            </label>
                            <label onclick="toggleSelectionArea(true)" class="relative flex flex-col p-5 bg-slate-50 rounded-2xl border-2 border-transparent cursor-pointer hover:border-blue-100 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/50 transition-all group">
                                <input type="radio" name="visibility" value="group" class="hidden">
                                <span class="text-sm font-bold text-slate-800 group-hover:text-blue-700">Grup / Kişi</span>
                                <span class="text-[10px] text-slate-400 mt-1 italic">Özel yetkilendirme</span>
                            </label>
                            <label onclick="toggleSelectionArea(false)" class="relative flex flex-col p-5 bg-slate-50 rounded-2xl border-2 border-transparent cursor-pointer hover:border-blue-100 has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50/50 transition-all group">
                                <input type="radio" name="visibility" value="private" class="hidden">
                                <span class="text-sm font-bold text-slate-800 group-hover:text-blue-700">Özel Not</span>
                                <span class="text-[10px] text-slate-400 mt-1">Sadece ben</span>
                            </label>
                        </div>

                        <div id="selection-panel" class="hidden animate-in fade-in slide-in-from-top-2 duration-300">
                            <div class="bg-blue-50/40 border-2 border-blue-100 rounded-[2.5rem] p-6 md:p-8">
                                <div class="flex flex-col gap-5">
                                    <label class="text-[10px] font-black text-blue-500 uppercase tracking-widest">Yetkilendirilecek Grubunu Ara</label>
                                    <div class="bg-white border-2 border-blue-100 rounded-2xl p-3 flex flex-wrap gap-2 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                                        <div id="selected-entities" class="flex flex-wrap gap-2"></div>
                                        <input type="text" id="group-search-input" oninput="searchEntities(this.value)" placeholder="Grup veya isim arayın..." class="flex-1 min-w-[200px] border-none focus:ring-0 text-sm py-2 outline-none">
                                    </div>
                                    <div id="search-results" class="flex flex-wrap gap-2"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-8 border-t border-slate-50">
                        <label class="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">İçerik Detayı</label>
                        <textarea id="new-note-content" placeholder="Yazmaya başlayın..." class="w-full min-h-[350px] text-[17px] leading-relaxed border-none focus:ring-0 outline-none resize-none placeholder:text-slate-200 text-slate-700 bg-transparent" spellcheck="false"></textarea>
                    </div>

                    <div class="pt-6">
                        <input type="file" id="note-file-input" class="hidden" multiple onchange="handleNoteFileSelection(event)">
                        <div onclick="document.getElementById('note-file-input').click()" class="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group">
                            <div class="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-blue-600">
                                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            </div>
                            <p class="text-[13px] font-extrabold text-slate-600">Dosya Eklemek İçin Tıklayın</p>
                            <div id="note-files-preview" class="mt-4 flex flex-wrap justify-center gap-2"></div>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center justify-start gap-10 pt-10 border-t border-slate-100">
                        <label class="flex items-center gap-3 cursor-pointer group">
                            <div class="relative">
                                <input type="checkbox" id="new-note-isUrgent" class="peer hidden">
                                <div class="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-red-500 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform shadow-sm"></div>
                            </div>
                            <span class="text-xs font-black text-slate-400 group-hover:text-red-600 transition-colors uppercase tracking-widest">Acil Durum</span>
                        </label>
                        
                        <label class="flex items-center gap-3 cursor-pointer group">
                            <div class="relative">
                                <input type="checkbox" id="new-note-isCommentsClosed" class="peer hidden">
                                <div class="w-12 h-6 bg-slate-200 rounded-full peer-checked:bg-slate-800 transition-colors"></div>
                                <div class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-transform shadow-sm"></div>
                            </div>
                            <span class="text-xs font-black text-slate-400 group-hover:text-slate-800 transition-colors uppercase tracking-widest">Yoruma Kapat</span>
                        </label>
                    </div>
                </div>
            </div>
        </main>
    </div>
    `;

    createArea.classList.remove("hidden");
    setTimeout(() => {
        createArea.classList.add("opacity-100", "translate-y-0");
        createArea.classList.remove("opacity-0", "translate-y-4");
    }, 10);
};

// YARDIMCI FONKSİYONLAR
window.closeNoteCreate = function() {
    const createArea = document.getElementById("noteCreateArea");
    createArea.classList.replace("opacity-100", "opacity-0");
    createArea.classList.replace("translate-y-0", "translate-y-4");
    setTimeout(() => { createArea.classList.add("hidden"); }, 300);
};

window.toggleSelectionArea = function(show) {
    const panel = document.getElementById('selection-panel');
    if (show) panel.classList.remove('hidden');
    else panel.classList.add('hidden');
};

window.searchMyGroups = function(val) {
    const resultsDiv = document.getElementById("search-results");
    resultsDiv.innerHTML = "";
    if (!val) return;

    const filtered = currentUserGroups.filter(g => g.toLowerCase().includes(val.toLowerCase()));
    filtered.forEach(groupName => {
        const btn = `<button onclick="addSelectedEntity('${groupName}')" class="bg-white border border-blue-200 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">+ ${groupName}</button>`;
        resultsDiv.insertAdjacentHTML('beforeend', btn);
    });
};

window.addSelectedEntity = function(name, type, id = null, email = "") {
    // E-posta boş geliyorsa veya yanlış geliyorsa konsola bas
    console.log("Seçilen Kişi Verisi:", { name, type, id, email });

    // Aynı kişiyi (ID bazlı) veya aynı grubu (Isim bazlı) tekrar ekleme
    const isExist = selectedEntitiesList.find(e => (type === 'user' ? e.id === id : e.name === name));
    
    if (!isExist) {
        // Obje içine parametre olarak gelen email'i koyduğumuzdan eminiz
        selectedEntitiesList.push({ 
            name: name, 
            type: type, 
            id: id, 
            email: email 
        });
        
        renderSelectedEntities();
        
        // Formu temizle
        document.getElementById("group-search-input").value = "";
        document.getElementById("search-results").innerHTML = "";
    } else {
        alert("Bu seçim zaten listede mevcut.");
    }
};

window.removeEntity = function(index) {
    selectedEntitiesList.splice(index, 1);
    renderSelectedEntities();
};

window.handleNoteFileSelection = function(event) {
    const files = Array.from(event.target.files);
    const preview = document.getElementById("note-files-preview");
    selectedFiles = [...selectedFiles, ...files];
    preview.innerHTML = selectedFiles.map((f, i) => `
        <div class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-blue-100">
            ${f.name} <button onclick="removeSelectedFileNote(${i})">×</button>
        </div>
    `).join('');
};

window.removeSelectedFileNote = function(index) {
    selectedFiles.splice(index, 1);
    const preview = document.getElementById("note-files-preview");
    preview.innerHTML = selectedFiles.map((f, i) => `
        <div class="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-blue-100">
            ${f.name} <button onclick="removeSelectedFileNote(${i})">×</button>
        </div>
    `).join('');
};

/**
 * YAYINLAMA MOTORU
 */
window.saveNewNote = async function() {
    const title = document.getElementById("new-note-title").value.trim();
    const content = document.getElementById("new-note-content").value.trim();
    const primaryTag = document.getElementById("new-note-primary-tag").value;
    const subTagsRaw = document.getElementById("new-note-sub-tags").value;
    const segments = subTagsRaw.split(',').map(s => s.trim()).filter(s => s !== "");
    
    
    const visibility = document.querySelector('input[name="visibility"]:checked').value;
    const isUrgent = document.getElementById("new-note-isUrgent").checked;
    const isCommentsClosed = document.getElementById("new-note-isCommentsClosed").checked;
    const isPrivate = visibility === 'private';


    for (let s of segments) {
        if (s.split(/\s+/).filter(w => w.length > 0).length > 2) {
            alert("Lütfen 2 kelimeden uzun etiketleri düzeltin.");
            return; // İşlemi durdur
        }
    }
    
    
    if (!title || !content || !primaryTag) {
        alert("Başlık, içerik ve ana etiket zorunludur.");
        return;
    }

// --- ETİKET İŞLEME VE DOĞRULAMA MANTIĞI ---
    let subTags = [];
    if (subTagsRaw) {
        // Virgülle ayır ve her bir parçayı kontrol et
        const rawSegments = subTagsRaw.split(',');
        
        for (let segment of rawSegments) {
            const trimmedSegment = segment.trim();
            if (trimmedSegment === "") continue;

            // Kelime sayısını kontrol et (Boşluklara göre böl)
            const wordCount = trimmedSegment.split(/\s+/).length;

            if (wordCount > 2) {
                alert(`"${trimmedSegment}" etiketi çok uzun. Etiketler en fazla 2 kelime olabilir. Lütfen etiketleri virgül (,) ile ayırdığınızdan emin olun.`);
                return; // Kayıt işlemini durdur
            }
            
            subTags.push(trimmedSegment.toLowerCase());
        }
    }

    const finalTags = [...new Set([primaryTag.toLowerCase(), ...subTags])];
    // ------------------------------------------

    const saveBtn = document.getElementById("save-note-btn");
    saveBtn.disabled = true;
    saveBtn.innerText = "YAYINLANIYOR...";

    try {
        const uploadedFiles = [];
        for (const file of selectedFiles) {
            const fData = await uploadFileToStorage(file);
            uploadedFiles.push(fData);
        }

        let allowedUserGroups = [];
        let allowedUsers = [currentUserId];

        if (visibility === 'public') {
            allowedUserGroups = ["genel"];
        } else if (visibility === 'group') {
            allowedUserGroups = [...selectedEntitiesList.map(e => e.name)];
        }

        const newNoteData = {
            title,
            content,
            tags: finalTags, // İşlenmiş küçük harf listesini gönderiyoruz
            ownerId: currentUserId,
            ownerName: currentUserName,
            createdAt: serverTimestamp(),
            replyCount: 0,
            isUrgent,
            isCommentsClosed,
            isPrivate,
            allowedUserGroups,
            allowedUsers,
            files: uploadedFiles
        };

        const docRef = await addDoc(collection(db, "notes"), newNoteData);
        
        // Yerel listeye de ekleyelim
        allNotes.unshift({ id: docRef.id, ...newNoteData, createdAt: { toDate: () => new Date() } });
        
        renderSidebar(allNotes);
        renderTagCloud();
        closeNoteCreate();
        showNoteDetail(docRef.id);

    } catch (error) {
        console.error("Hata:", error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "YAYINLA";
    }
};

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

        const item = `
            <a href="#" id="side-note-${note.id}" onclick="event.preventDefault(); showNoteDetail('${note.id}')" 
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
 * Tam tarih ve saat formatı: 29.01.2026 10:30:23
 */
function formatFullDateTime(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
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

    // --- 2. ADIM: ETİKET HAVUZUNU TAMAMEN KAPAT ---
    tagSection.style.height = "0"; // Havuzu tamamen sıfıra indiriyoruz
    tagSection.style.overflow = "hidden";
    mainContent.style.flex = "1";

    renderDetailHTML(note);
    loadComments(note.id, currentUserId);
    
    // Geçiş Animasyonu
    mainListArea.classList.add("opacity-0");
    stickyHeader.classList.add("opacity-0");

    setTimeout(() => {
        mainListArea.classList.add("hidden");
        stickyHeader.classList.add("hidden");
        detailArea.classList.remove("hidden");
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
    
    // Oluşturulma tarihi (Header için sadeleştirildi)
    const noteDate = note.createdAt?.toDate ? 
        note.createdAt.toDate().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 
        "Yakın zamanda";

    const primaryTag = (note.tags && note.tags.length > 0) ? note.tags[0] : "Bilgi Bankası";
    const isOwner = note.ownerId === currentUserId;

    detailArea.innerHTML = `
        <div class="max-w-4xl mx-auto py-8 px-4 md:px-8 min-h-screen">
            <div class="mb-8 flex items-center justify-between">
                <button onclick="closeNoteDetail()" class="text-blue-600 font-bold hover:bg-slate-100 px-3 py-1 rounded-lg transition-all flex items-center gap-2">
                    ← Geri
                </button>
                <div class="flex items-center gap-4">
                    ${isOwner ? `
                        <button onclick="editNote('${note.id}')" class="text-slate-300 hover:text-blue-600 transition-colors" title="Düzenle">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="mb-10">
                <h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight capitalize">
                    ${note.title}
                </h1>
                <div class="flex items-center gap-3">
                    <span class="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded uppercase">${primaryTag}</span>
                    <span class="text-xs text-slate-400 font-medium">${noteDate} tarihinde oluşturuldu</span>
                </div>
            </div>

            <article id="main-note-card" class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-12 overflow-hidden">
                <div class="pt-2 pb-6 px-6 md:pt-4 md:pb-10 md:px-10">
                    <div class="entry-content text-slate-700 text-[16px] leading-relaxed space-y-4">
                        ${processedContent}
                    </div>

                    ${note.files && note.files.length > 0 ? `
                        <div class="mt-10 pt-6 border-t border-slate-50">
                            </div>
                    ` : ''}
                </div>

            <div class="bg-slate-50/50 px-6 py-3 flex items-center justify-end border-t border-slate-100 text-right">
                <div>
                    <span class="text-xs font-bold text-blue-600">@${note.ownerName || 'isimsiz'}</span>
                    <p class="text-[10px] text-slate-400 font-medium tracking-tight">
                        ${note.updatedAt ? 
                            `${formatFullDateTime(note.updatedAt)} (Düzenlendi)` : 
                            `${formatFullDateTime(note.createdAt)} (Eklendi)`
                        }
                    </p>
                </div>
            </div>
            </article>

    <div id="comments-container" class="space-y-6"></div>
            ${note.isCommentsClosed ? `
                <div class="mt-20 bg-slate-50 rounded-2xl p-8 border border-slate-100 text-center">
                    <p class="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Bu yazı yorumlara kapatılmıştır.</p>
                </div>
            ` : `
                <div class="mt-20 pt-12 border-t border-slate-100">
                    <div id="reply-trigger" class="flex flex-col items-center">
                        <p class="text-sm text-slate-400 italic mb-6 text-center">Bu başlığa bir katkıda bulunmak ister misiniz?</p>
                        <button onclick="toggleReplyArea(true)" class="bg-white border-2 border-slate-200 text-slate-700 px-10 py-3 rounded-full text-sm font-black hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95">
                            CEVAP YAZ
                        </button>
                    </div>

                    <div id="reply-area" class="animate-in fade-in slide-in-from-bottom-6 duration-500 hidden">
                        <div class="bg-white rounded-3xl border border-blue-100 p-6 md:p-8 shadow-2xl shadow-blue-900/5">
                            <div class="flex items-center justify-between mb-6">
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Yeni Entry Yaz</h4>
                                <button onclick="toggleReplyArea(false)" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                            
                            <textarea id="comment-input" placeholder="Buraya yazmaya başlayın..." class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 rounded-2xl p-5 text-slate-700 resize-none min-h-[180px] text-[15px] outline-none transition-all placeholder:text-slate-400" spellcheck="false"></textarea>
                            
                            <div id="selected-files-preview" class="flex flex-wrap gap-2 mt-4"></div>

                            <div class="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                                <div class="flex gap-2">
                                    <input type="file" id="comment-file-input" class="hidden" multiple onchange="handleFileSelection(event)">
                                    <button onclick="document.getElementById('comment-file-input').click()" class="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-bold text-xs uppercase tracking-tight">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                        Dosya Ekle
                                    </button>
                                </div>
                                <button onclick="saveNewComment('${note.id}')" class="w-full sm:w-auto bg-blue-600 text-white px-10 py-3 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase tracking-widest">
                                    GÖNDER
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `}
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
        // HATA BURADAYDI: 'ref' tanımlı değil çünkü 'sRef' olarak import edildi.
        const fileRef = sRef(storage, filePath); 
        
        // getBlob, kullanıcının o anki giriş bilgilerini kullanır.
        const blob = await getBlob(fileRef);
        
        // Geçici bir link oluşturur.
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
    const q = query(
        collection(db, "comments"), 
        where("noteId", "==", noteId), 
        orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    
    container.innerHTML = ""; 

    // Eğer hiç yorum yoksa hiçbir şey yazmıyoruz (Görüntü temizliği)
    if (snap.empty) return;

    snap.forEach(doc => {
        const comment = { id: doc.id, ...doc.data() };
        const isOwner = comment.ownerId === currentUid;

        const commentHtml = `
            <article id="comment-${comment.id}" class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div class="p-6">
                    <div class="entry-content text-slate-700 text-[15px]">
                        ${comment.content ? comment.content.replace(/\n/g, '<br>') : ""}
                    </div>
                    
                    ${comment.files && comment.files.length > 0 ? `
                        <div class="mt-4 flex flex-wrap gap-2">
                            ${comment.files.map(file => `
                                <button onclick="handleSecureDownload(this, '${file.path}', '${file.name}')" class="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                    ${file.name}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
            <div class="bg-slate-50/50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
                <div class="flex items-center gap-3">
                    ${isOwner ? `
                        <button onclick="editComment('${comment.id}')" class="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase">Düzenle</button>
                        <button onclick="deleteComment('${comment.id}', '${noteId}')" class="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase">Sil</button>
                    ` : '<span class="text-[10px] font-bold text-slate-300 uppercase italic">İlave Not</span>'}
                </div>
                <div class="text-right">
                    <span class="text-xs font-bold text-blue-600">@${comment.ownerName || 'isimsiz'}</span>
                    <p class="text-[10px] text-slate-400 font-medium tracking-tight">
                        ${comment.updatedAt ? 
                            `${formatFullDateTime(comment.updatedAt)} (Düzenlendi)` : 
                            `${formatFullDateTime(comment.createdAt)} (Eklendi)`
                        }
                    </p>
                </div>
            </div>
            </article>
        `;
        container.insertAdjacentHTML('beforeend', commentHtml);
    });
}


window.deleteComment = async function(commentId, noteId) {
    if (!confirm("Bu eklemeyi ve ekli dosyalarını kalıcı olarak silmek istediğinize emin misiniz?")) return;
    
    try {
        // 1. Önce yorum dökümanını çekerek dosya listesini alalım
        const commentRef = doc(db, "comments", commentId);
        const commentSnap = await getDoc(commentRef);
        
        if (commentSnap.exists()) {
            const commentData = commentSnap.data();
            
            // 2. Varsa ekli dosyaları Storage'dan sil
            if (commentData.files && commentData.files.length > 0) {
                for (const file of commentData.files) {
                    try {
                        const fileStorageRef = sRef(storage, file.path);
                        await deleteObject(fileStorageRef);
                        console.log(`${file.name} Storage'dan silindi.`);
                    } catch (storageError) {
                        console.error("Dosya Storage'dan silinemedi (muhtemelen zaten yok):", storageError);
                    }
                }
            }
        }

        // 3. Yorum dökümanını Firestore'dan sil
        await deleteDoc(commentRef);

        // 4. Ana dökümandaki (notes) replyCount'u 1 azalt
        const noteRef = doc(db, "notes", noteId);
        await updateDoc(noteRef, {
            replyCount: increment(-1)
        });

        // 5. Yerel hafızayı ve Sidebar'ı güncelle
        const noteIndex = allNotes.findIndex(n => n.id === noteId);
        if (noteIndex !== -1) {
            allNotes[noteIndex].replyCount = Math.max(0, (allNotes[noteIndex].replyCount || 1) - 1);
            renderSidebar(allNotes); 
        }

        // 6. Arayüzden yorumu kaldır
        const commentEl = document.getElementById(`comment-${commentId}`);
        if (commentEl) commentEl.remove();

        // Sayaç badge'ini güncellemek için yorumları tekrar yükle
        await loadComments(noteId, currentUserId);

    } catch (e) {
        console.error("Silme hatası:", e);
        alert("Silme işlemi sırasında bir hata oluştu.");
    }
};

window.editComment = function(commentId) {
    // Sınıf adını .prose yerine .entry-content olarak güncelledik
    const container = document.querySelector(`#comment-${commentId} .entry-content`);
    
    if (!container) {
        console.error("Hata: Yorum içeriği alanı bulunamadı.");
        return;
    }

    const currentText = container.innerHTML.replace(/<br>/g, '\n');
    
    container.innerHTML = `
        <textarea id="edit-area-${commentId}" class="w-full p-4 border-2 border-blue-100 rounded-xl text-sm text-slate-700 bg-slate-50 focus:bg-white outline-none min-h-[120px] transition-all">${currentText}</textarea>
        <div class="flex justify-end gap-3 mt-3">
            <button onclick="cancelEdit('${commentId}', \`${currentText.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">İptal</button>
            <button onclick="saveEdit('${commentId}')" class="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">Değişikliği Kaydet</button>
        </div>
    `;
};

/**
 * YENİ YORUM KAYDET
 */
window.saveNewComment = async function(noteId) {
    const commentInput = document.getElementById("comment-input");
    const content = commentInput.value.trim();
    
    // Hem metin yoksa hem dosya seçilmemişse gönderme
    if (!content && selectedFiles.length === 0) return;

    const sendBtn = event.target;
    sendBtn.disabled = true;
    sendBtn.innerText = "Ekleniyor...";

    try {
        // 1. Önce dosyaları yükle (varsa)
        const uploadedFiles = [];
        for (const file of selectedFiles) {
            const fileData = await uploadFileToStorage(file);
            uploadedFiles.push(fileData);
        }

        // 2. Yorumu kaydet
        // DİKKAT: Burada sadece yukarıda tanımladığımız global değişkenleri kullanıyoruz
        await addDoc(collection(db, "comments"), {
            noteId: noteId,
            content: content,
            ownerId: currentUserId,   // loadNotes'ta dolan global ID
            ownerName: currentUserName, // loadNotes'ta dolan global İsim (Ali Emre)
            createdAt: serverTimestamp(),
            files: uploadedFiles
        });

        // 3. Not dökümanındaki sayacı güncelle
        await updateDoc(doc(db, "notes", noteId), {
            replyCount: increment(1),
            lastReplyAt: serverTimestamp()
        });

        // Formu ve önizlemeyi temizle
        commentInput.value = "";
        selectedFiles = [];
        document.getElementById("selected-files-preview").innerHTML = "";
        
        // Yorumları tazele
        await loadComments(noteId, currentUserId);
        
    } catch (error) {
        console.error("Yorum kaydetme hatası:", error);
        alert("Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerText = "Ekle";
    }
};

/**
 * DÜZENLEMEYİ KAYDET
 */
window.saveEdit = async function(commentId) {
    const newContent = document.getElementById(`edit-area-${commentId}`).value.trim();
    if (!newContent) return;

    try {
        const commentRef = doc(db, "comments", commentId);
        await updateDoc(commentRef, { content: newContent });
        
        // UI'yı güncelle
        const container = document.querySelector(`#comment-${commentId} .prose`);
        container.innerHTML = newContent.replace(/\n/g, '<br>');
    } catch (e) {
        alert("Güncelleme hatası: " + e.message);
    }
};

/**
 * DÜZENLEMEYİ İPTAL ET
 */
window.cancelEdit = function(commentId, originalText) {
    const container = document.querySelector(`#comment-${commentId} .prose`);
    container.innerHTML = originalText.replace(/\n/g, '<br>');
};


/**
 * FIREBASE STORAGE'A DOSYA YÜKLER
 * @returns {Object} {name, path, type}
 */
async function uploadFileToStorage(file) {
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${file.name}`;
    const filePath = `uploads/${uniqueName}`;
    const storageRef = sRef(storage, filePath);

    try {
        const snapshot = await uploadBytes(storageRef, file);
        return {
            name: file.name,
            path: filePath,
            type: file.type
        };
    } catch (error) {
        console.error("Yükleme hatası:", error);
        throw error;
    }
}

/**
 * DOSYA SEÇİLDİĞİNDE ÇALIŞIR
 */
window.handleFileSelection = function(event) {
    const files = Array.from(event.target.files);
    const previewContainer = document.getElementById("selected-files-preview");
    
    selectedFiles = [...selectedFiles, ...files]; // Dosyaları listeye ekle
    
    previewContainer.innerHTML = selectedFiles.map((file, index) => `
        <div class="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-100">
            <span class="truncate max-w-[150px]">${file.name}</span>
            <button onclick="removeSelectedFile(${index})" class="text-blue-400 hover:text-red-500 font-black">×</button>
        </div>
    `).join('');
};

window.removeSelectedFile = function(index) {
    selectedFiles.splice(index, 1);
    handleFileSelection({ target: { files: [] } }); // Görünümü tazele
};

window.deleteNote = async function(noteId) {
    if (!confirm("DİKKAT: Bu yazıyı, ekli tüm dosyaları ve yapılmış tüm yorumları kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;

    try {
        // 1. ADIM: Yazıya Ait Ana Dosyaları Sil
        const note = allNotes.find(n => n.id === noteId);
        if (note && note.files && note.files.length > 0) {
            for (const file of note.files) {
                try {
                    await deleteObject(sRef(storage, file.path));
                } catch (e) { console.error("Not dosyası silinemedi:", e); }
            }
        }

        // 2. ADIM: Yazıya Ait Tüm Yorumları Bul
        const commentsQ = query(collection(db, "comments"), where("noteId", "==", noteId));
        const commentSnaps = await getDocs(commentsQ);

        // 3. ADIM: Her Yorumun Kendi İçindeki Dosyaları ve Yorumun Kendisini Sil
        for (const commentDoc of commentSnaps.docs) {
            const commentData = commentDoc.data();
            
            // Yorumun dosyalarını Storage'dan sil
            if (commentData.files && commentData.files.length > 0) {
                for (const cFile of commentData.files) {
                    try {
                        await deleteObject(sRef(storage, cFile.path));
                    } catch (e) { console.error("Yorum dosyası silinemedi:", e); }
                }
            }
            // Yorum dökümanını Firestore'dan sil
            await deleteDoc(commentDoc.ref);
        }

        // 4. ADIM: Ana Yazıyı (Note) Firestore'dan Sil
        await deleteDoc(doc(db, "notes", noteId));

        // 5. ADIM: Yerel Hafızayı ve UI'yı Güncelle
        allNotes = allNotes.filter(n => n.id !== noteId);
        renderSidebar(allNotes);
        renderTagCloud(); // Etiket sayıları değişeceği için bulutu tazele
        
        // Eğer detay sayfası açıksa kapat ve listeye dön
        closeNoteDetail();
        
        // Listeyi tazele (Filtreler aktifse onlara göre tekrar render eder)
        applyFilters();

        alert("Yazı ve tüm bağlı veriler başarıyla temizlendi.");

    } catch (error) {
        console.error("Zincirleme silme hatası:", error);
        alert("Silme işlemi sırasında bir hata oluştu.");
    }
};

// Arama sonuçlarını ve seçimleri yönetmek için nesne yapısını güncelleyelim
window.searchEntities = function(val) {
    // Eski zamanlayıcıyı iptal et (Hızlı yazarken sürekli sıfırlanır)
    clearTimeout(searchTimer);
    
    const resultsDiv = document.getElementById("search-results");
    if (!val || val.length < 2) {
        resultsDiv.innerHTML = "";
        return;
    }

    // Kullanıcı yazmayı bıraktıktan 300ms sonra çalıştır
    searchTimer = setTimeout(async () => {
        const searchVal = val.toLowerCase();
        
        // Arama başlamadan önce UI'ı temizle
        resultsDiv.innerHTML = '<p class="text-[10px] text-slate-400 animate-pulse">Aranıyor...</p>';

        try {
            const usersRef = collection(db, "users");
            const q = query(
                usersRef, 
                where("isEnabled", "==", true),
                orderBy("name"), 
                where("name", ">=", searchVal), 
                where("name", "<=", searchVal + "\uf8ff")
            );
            
            const querySnapshot = await getDocs(q);
            
            // SONUÇLARI BASMADAN HEMEN ÖNCE İÇERİĞİ SIFIRLA
            resultsDiv.innerHTML = ""; 

            querySnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                const resultId = userDoc.id;
                const resultName = userData.name || "isimsiz";
                const resultEmail = userData.email || "e-posta yok";

                // Eğer bulduğumuz kişi şu an giriş yapmış kullanıcı DEĞİLSE ekle
                if (resultId !== currentUserId) {
                    const userBtnHtml = `
                        <button type="button" 
                                onclick="addSelectedEntity('${resultName}', 'user', '${resultId}', '${resultEmail}')" 
                                class="flex flex-col items-start bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-2xl text-xs hover:border-blue-500 transition-all w-full md:w-auto text-left group">
                            <span class="font-bold group-hover:text-blue-600">${resultName}</span>
                            <span class="text-[10px] text-slate-400 font-medium">${resultEmail}</span>
                        </button>`;
                    resultsDiv.insertAdjacentHTML('beforeend', userBtnHtml);
                }
            });

            // Eğer hiç sonuç çıkmadıysa (Kullanıcının kendisi hariç)
            if (resultsDiv.innerHTML === "") {
                resultsDiv.innerHTML = '<p class="text-[10px] text-slate-400 italic">Uygun kullanıcı bulunamadı.</p>';
            }

        } catch (error) {
            console.error("Arama hatası:", error);
            resultsDiv.innerHTML = "";
        }
    }, 300); 
};

function renderSelectedEntities() {
    const container = document.getElementById("selected-entities");
    container.innerHTML = selectedEntitiesList.map((item, index) => `
        <div class="flex items-center gap-2 ${item.type === 'user' ? 'bg-slate-800' : 'bg-blue-600'} text-white pl-3 pr-2 py-2 rounded-2xl text-[11px] font-bold shadow-lg">
            <div class="flex flex-col leading-tight">
                <span>${item.name}</span>
                ${item.type === 'user' ? `<span class="text-[9px] opacity-60 font-medium">${item.email}</span>` : ''}
            </div>
            <button onclick="removeEntity(${index})" class="hover:bg-white/20 rounded-lg p-1 transition-colors text-lg">×</button>
        </div>
    `).join('');
}

window.toggleReplyArea = function(show) {
    const trigger = document.getElementById("reply-trigger");
    const area = document.getElementById("reply-area");
    
    if (show) {
        trigger.classList.add("hidden");
        area.classList.remove("hidden");
        // Otomatik olarak yazı alanına odaklan
        setTimeout(() => document.getElementById("comment-input")?.focus(), 100);
    } else {
        trigger.classList.remove("hidden");
        area.classList.add("hidden");
        // Formu temizle
        document.getElementById("comment-input").value = "";
        selectedFiles = [];
        document.getElementById("selected-files-preview").innerHTML = "";
    }
};

window.editNote = function(noteId) {
    const container = document.querySelector(`#main-note-card .entry-content`);
    const note = allNotes.find(n => n.id === noteId);
    if (!container || !note) return;

    selectedFiles = []; // Yeni eklenecek dosyalar için listeyi sıfırla
    const currentText = note.content || ""; 

    container.innerHTML = `
        <div class="bg-blue-50/30 p-4 md:p-6 rounded-xl border border-blue-100">
            <label class="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">İçeriği Güncelle</label>
            <textarea id="edit-note-area" class="w-full min-h-[300px] bg-white border-none focus:ring-0 text-[16px] text-slate-700 leading-relaxed outline-none resize-none p-0">${currentText}</textarea>
            
            <div class="mt-8 pt-6 border-t border-blue-100/50">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 italic">Dosyaları Yönet</label>
                <div id="edit-files-list" class="flex flex-wrap gap-3 mb-4">
                    ${note.files && note.files.length > 0 ? note.files.map((file, idx) => `
                        <div class="flex items-center gap-2 bg-white border border-slate-200 pl-3 pr-1 py-1 rounded-lg shadow-sm">
                            <span class="text-[11px] font-bold text-slate-600 truncate max-w-[120px]">${file.name}</span>
                            <button onclick="removeFileFromNote('${noteId}', ${idx})" class="text-slate-300 hover:text-red-600 transition-colors p-1">×</button>
                        </div>
                    `).join('') : ''}
                </div>

                <input type="file" id="edit-file-input" class="hidden" multiple onchange="handleEditFileSelection(event)">
                <div id="edit-new-files-preview" class="flex flex-wrap gap-2 mb-3"></div>
                <button onclick="document.getElementById('edit-file-input').click()" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition-all">
                    + YENİ DOSYA İLAVE ET
                </button>
            </div>

            <div class="flex justify-end gap-4 mt-8 pt-4 border-t border-blue-100/50">
                <button onclick="renderDetailHTML(window.getCurrentNote('${noteId}'))" class="text-xs font-bold text-slate-400 uppercase tracking-tighter">Vazgeç</button>
                <button onclick="saveNoteEdit('${noteId}')" id="save-edit-btn" class="bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-md">DEĞİŞİKLİKLERİ YAYINLA</button>
            </div>
        </div>
    `;
};

// Düzenleme sırasında seçilen dosyaların önizlemesi
window.handleEditFileSelection = function(event) {
    const files = Array.from(event.target.files);
    selectedFiles = [...selectedFiles, ...files];
    const preview = document.getElementById("edit-new-files-preview");
    preview.innerHTML = selectedFiles.map((f, i) => `
        <div class="bg-blue-600 text-white px-2 py-1 rounded text-[9px] font-bold flex items-center gap-2 animate-pulse">
            ${f.name} <span class="cursor-pointer" onclick="selectedFiles.splice(${i}, 1); handleEditFileSelection({target:{files:[]}})">×</span>
        </div>
    `).join('');
};

window.removeFileFromNote = async function(noteId, fileIndex) {
    if (!confirm("Bu dosyayı yazıdan kaldırmak istediğinize emin misiniz? (Dosya kalıcı olarak silinecektir)")) return;

    try {
        const noteIndex = allNotes.findIndex(n => n.id === noteId);
        const fileToDelete = allNotes[noteIndex].files[fileIndex];

        // 1. Storage'dan sil
        const fileRef = sRef(storage, fileToDelete.path);
        await deleteObject(fileRef);

        // 2. Yerel listeden çıkar
        allNotes[noteIndex].files.splice(fileIndex, 1);

        // 3. Firestore'u güncelle
        const noteRef = doc(db, "notes", noteId);
        await updateDoc(noteRef, { files: allNotes[noteIndex].files });

        // 4. Arayüzü tazele (Düzenleme modunda kalmaya devam et)
        window.editNote(noteId);
        
    } catch (error) {
        console.error("Dosya silme hatası:", error);
        alert("Dosya silinirken bir hata oluştu.");
    }
};

window.saveNoteEdit = async function(noteId) {
    const newContent = document.getElementById("edit-note-area").value.trim();
    if (!newContent) return;

    const saveBtn = document.getElementById("save-edit-btn");
    saveBtn.disabled = true;
    saveBtn.innerText = "YAYINLANIYOR...";

    try {
        const newUploadedFiles = [];
        for (const file of selectedFiles) {
            const fData = await uploadFileToStorage(file);
            newUploadedFiles.push(fData);
        }

        const noteIndex = allNotes.findIndex(n => n.id === noteId);
        const note = allNotes[noteIndex];
        const finalFilesList = [...(note.files || []), ...newUploadedFiles];

        const noteRef = doc(db, "notes", noteId);
        
        // GÜNCELLEME: updatedAt alanını ekledik
        const updateData = {
            content: newContent,
            files: finalFilesList,
            updatedAt: serverTimestamp() 
        };

        await updateDoc(noteRef, updateData);

        // Yerel hafızayı güncelle (Arayüzde hemen görmek için)
        note.content = newContent;
        note.files = finalFilesList;
        note.updatedAt = { toDate: () => new Date() }; // Yerel saati hemen yansıtmak için

        renderDetailHTML(note);
        loadComments(noteId, currentUserId);

        selectedFiles = [];
        alert("Yazı başarıyla güncellendi.");
    } catch (e) {
        console.error("Güncelleme hatası:", e);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "DEĞİŞİKLİKLERİ YAYINLA";
    }
};

window.validateSubTags = function(input) {
    const errorEl = document.getElementById("sub-tags-error");
    const tags = input.value.split(',');
    let hasError = false;

    for (let tag of tags) {
        const trimmedTag = tag.trim();
        if (trimmedTag === "") continue;

        // Kelime sayısını kontrol et
        const wordCount = trimmedTag.split(/\s+/).filter(w => w.length > 0).length;

        if (wordCount > 2) {
            hasError = true;
            break;
        }
    }

    if (hasError) {
        // Hata varsa: Kırmızı border ve uyarıyı göster
        input.classList.add("border-red-500", "bg-red-50");
        input.classList.remove("border-slate-100", "bg-slate-50");
        errorEl.classList.remove("hidden");
        
        // Kaydet butonunu geçici olarak pasif yapabiliriz (opsiyonel)
        document.getElementById("save-note-btn").style.opacity = "0.5";
        document.getElementById("save-note-btn").style.pointerEvents = "none";
    } else {
        // Hata yoksa: Eski haline döndür
        input.classList.remove("border-red-500", "bg-red-50");
        input.classList.add("border-slate-100", "bg-slate-50");
        errorEl.classList.add("hidden");
        
        document.getElementById("save-note-btn").style.opacity = "1";
        document.getElementById("save-note-btn").style.pointerEvents = "auto";
    }
};



// --- YARDIMCI: HIGHLIGHT ---
function highlightText(text, term) {
    if (!term || !text) return text || "";
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, "gi");
    return text.replace(regex, `<mark class="bg-yellow-100 text-blue-900 rounded-sm px-0.5 font-bold">$1</mark>`);
}

// --- MODAL KONTROLLERİ ---
window.openSearchModal = function() {
    const modal = document.getElementById('search-modal');
    modal.classList.remove('hidden');
    document.getElementById('modal-search-input').focus();
    document.body.style.overflow = 'hidden'; // Kaydırmayı dondur
};

window.closeSearchModal = function() {
    const modal = document.getElementById('search-modal');
    modal.classList.add('hidden');
    document.getElementById('modal-search-input').value = '';
    document.body.style.overflow = ''; // Kaydırmayı aç
};

// --- KLAVYE KISAYOLLARI ---
window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        window.openSearchModal();
    }
    if (e.key === 'Escape') window.closeSearchModal();
});

// --- GELİŞMİŞ FİLTRELEME ---
window.handleAdvancedSearch = function(query) {
    const val = query.trim().toLowerCase();
    const resultsArea = document.getElementById('modal-results-area');

    if (val.length < 2) {
        resultsArea.innerHTML = `<div class="py-16 text-center text-slate-400 italic">En az 2 harf yazın...</div>`;
        return;
    }

    // 1. Yazıları Filtrele
    const matchedNotes = allNotes.filter(n => 
        (n.title || "").toLowerCase().includes(val) || 
        (n.content || "").toLowerCase().includes(val)
    );

    // 2. Etiketleri Filtrele
    const allTags = [...new Set(allNotes.flatMap(n => n.tags || []))];
    const matchedTags = allTags.filter(t => t.toLowerCase().includes(val));

    // 3. Kişileri Filtrele
    const allAuthors = [...new Set(allNotes.map(n => n.ownerName).filter(Boolean))];
    const matchedAuthors = allAuthors.filter(a => a.toLowerCase().includes(val));

    renderModalResults(matchedNotes, matchedTags, matchedAuthors, val);
};

function renderModalResults(notes, tags, authors, term) {
    const resultsArea = document.getElementById('modal-results-area');
    let html = '';

    // ETIKETLER KATEGORİSİ
    if (tags.length > 0) {
        html += `<div class="mb-6"><h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 italic">Etiketler</h3><div class="grid grid-cols-1 gap-1">`;
        tags.forEach(tag => {
            html += `
                <div onclick="selectTagFromSearch('${tag}')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition-all group">
                    <div class="bg-slate-100 group-hover:bg-blue-100 p-2 rounded-lg text-slate-400 group-hover:text-blue-600">#</div>
                    <span class="font-bold text-slate-700 group-hover:text-blue-700">${highlightText(tag, term)}</span>
                </div>`;
        });
        html += `</div></div>`;
    }

    // YAZILAR KATEGORİSİ
    if (notes.length > 0) {
        html += `<div class="mb-6"><h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 italic">Yazılar</h3><div class="grid grid-cols-1 gap-1">`;
        notes.forEach(note => {
            html += `
                <div onclick="showNoteDetail('${note.id}'); window.closeSearchModal();" class="flex flex-col px-3 py-3 rounded-xl hover:bg-blue-600 cursor-pointer transition-all group">
                    <span class="font-bold text-slate-700 group-hover:text-white">${highlightText(note.title, term)}</span>
                    <span class="text-xs text-slate-400 group-hover:text-blue-100 line-clamp-1">${note.content.substring(0, 100)}</span>
                </div>`;
        });
        html += `</div></div>`;
    }

    // KİŞİLER KATEGORİSİ
    if (authors.length > 0) {
        html += `<div><h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2 italic">Kişiler</h3><div class="grid grid-cols-1 gap-1">`;
        authors.forEach(author => {
            html += `
                <div onclick="filterByAuthor('${author}')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 cursor-pointer transition-all group">
                    <div class="w-8 h-8 bg-slate-100 group-hover:bg-blue-500 rounded-full flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:text-white uppercase">${author.substring(0,2)}</div>
                    <span class="font-bold text-slate-700 group-hover:text-blue-700">@${highlightText(author, term)}</span>
                </div>`;
        });
        html += `</div></div>`;
    }

    resultsArea.innerHTML = html || `<div class="py-16 text-center text-slate-400 italic">Hiçbir eşleşme bulunamadı.</div>`;
}

window.selectTagFromSearch = function(tag) {
    window.closeSearchModal();
    if (window.toggleTag) window.toggleTag(tag);
};



window.getCurrentNote = function(noteId) {
    return allNotes.find(n => n.id === noteId);
};

window.renderDetailHTML = renderDetailHTML;

window.showNoteDetail = showNoteDetail;
