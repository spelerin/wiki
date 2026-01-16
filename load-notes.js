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
                                        <input type="text" id="group-search-input" oninput="searchMyGroups(this.value)" placeholder="Grup ismi yazın..." class="flex-1 min-w-[200px] border-none focus:ring-0 text-sm py-2 outline-none">
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

window.addSelectedEntity = function(name) {
    if (!selectedEntitiesList.includes(name)) {
        selectedEntitiesList.push(name);
        renderSelectedEntities();
    }
};

function renderSelectedEntities() {
    const container = document.getElementById("selected-entities");
    container.innerHTML = selectedEntitiesList.map((name, index) => `
        <div class="flex items-center gap-2 bg-blue-600 text-white pl-3 pr-1.5 py-1.5 rounded-xl text-xs font-bold shadow-md shadow-blue-200">
            <span>${name}</span>
            <button onclick="removeEntity(${index})" class="hover:bg-blue-700 rounded-lg p-1 transition-colors">×</button>
        </div>
    `).join('');
}

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
    const visibility = document.querySelector('input[name="visibility"]:checked').value;
    
    const isUrgent = document.getElementById("new-note-isUrgent").checked;
    const isCommentsClosed = document.getElementById("new-note-isCommentsClosed").checked;
    const isPrivate = visibility === 'private';

    if (!title || !content || !primaryTag) {
        alert("Lütfen başlık, içerik ve ana etiket alanlarını doldurun.");
        return;
    }

    const saveBtn = document.getElementById("save-note-btn");
    saveBtn.disabled = true;
    saveBtn.innerText = "YÜKLENİYOR...";

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
            allowedUserGroups = [...selectedEntitiesList];
        }

        const newNoteData = {
            title,
            content,
            tags: [primaryTag],
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
        
        allNotes.unshift({ id: docRef.id, ...newNoteData, createdAt: { toDate: () => new Date() } });
        renderSidebar(allNotes);
        renderTagCloud();
        closeNoteCreate();
        showNoteDetail(docRef.id);

    } catch (error) {
        console.error("Yayınlama hatası:", error);
        alert("Yayınlanırken bir hata oluştu.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "YAYINLA";
    }
};

// ... Geri kalan fonksiyonlar (showNoteDetail, loadComments, deleteNote vb.) aynı kalıyor ...

window.showNoteDetail = showNoteDetail;
