import { db } from './firebase-config.js';
import { collection, query, where, or, getDocs, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref as sRef, getBlob, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const storage = getStorage();

// --- GLOBAL DEĞİŞKENLER ---
let allNotes = [];
let isNoteDetailOpen = false;
let selectedTags = [];
let currentUserId = null;
let currentUserName = "Kullanıcı";
let currentUserGroups = []; 
let currentUserRole = "user"; 
let selectedFiles = []; 
let selectedEntitiesList = [];
let searchTimer;

// --- 1. MERKEZİ GÖRÜNÜM YÖNETİCİSİ (UI STATE MANAGER) ---
window.updateUIVisibility = function(mode) {
    const tagSection = document.getElementById("tagCloudSection");
    const stickyHeader = document.getElementById("stickyHeader");
    const resultsArea = document.getElementById("searchResultsArea");
    const mainList = document.getElementById("noteList");
    const detailArea = document.getElementById("noteDetailArea");

    // Adım 1: Her şeyi gizle (Reset)
    const sections = [resultsArea, mainList, detailArea, stickyHeader];
    sections.forEach(el => el?.classList.add("hidden"));

    // Adım 2: Modlara Göre Sahneyi Kur
    switch(mode) {
        case "START": // İlk giriş: Tam Ekran Tag Cloud
            tagSection.style.setProperty('height', 'calc(100vh - 64px)', 'important');
            tagSection.style.opacity = "1";
            tagSection.style.display = "flex";
            isNoteDetailOpen = false;
            break;

        case "HOME": // Etiket seçili: Liste Görünümü
            tagSection.style.setProperty('height', '100px', 'important');
            tagSection.style.opacity = "1";
            tagSection.style.display = "flex";
            mainList.classList.remove("hidden");
            stickyHeader.classList.remove("hidden");
            isNoteDetailOpen = false;
            break;

        case "SEARCH": // Arama yapılıyor
            tagSection.style.setProperty('height', '0px', 'important');
            tagSection.style.opacity = "0";
            tagSection.style.display = "none";
            resultsArea.classList.remove("hidden");
            isNoteDetailOpen = false;
            break;

        case "DETAIL": // Yazı okunuyor
            tagSection.style.setProperty('height', '0px', 'important');
            tagSection.style.opacity = "0";
            tagSection.style.display = "none";
            detailArea.classList.remove("hidden");
            isNoteDetailOpen = true;
            break;
    }
};

// --- 2. VERİ YÜKLEME VE BAŞLATMA ---
export async function loadNotes(uid, userGroups, role, displayName) {
    currentUserId = uid;
    currentUserName = displayName || "Kullanıcı";
    currentUserGroups = userGroups || [];
    currentUserRole = role || "user";

    const notesRef = collection(db, "notes");
    let q = (role === 'admin') ? 
        query(notesRef, orderBy("createdAt", "desc")) :
        query(notesRef, or(
            where("ownerId", "==", uid),
            where("allowedUsers", "array-contains", uid),
            where("allowedUserGroups", "array-contains-any", userGroups.length > 0 ? userGroups : ["_none_"])
        ), orderBy("createdAt", "desc"));

    try {
        const querySnapshot = await getDocs(q);
        allNotes = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        renderTagCloud();
        renderSidebar(allNotes);

        // Başlangıç Modu Kararı
        if (selectedTags.length === 0) window.updateUIVisibility("START");
        else window.updateUIVisibility("HOME");

    } catch (error) { console.error("Yükleme hatası:", error); }
}

// --- 3. ARAMA MOTORU ---
window.globalSearch = function(query) {
    const val = query.trim().toLowerCase();
    if (val.length < 2) {
        selectedTags.length === 0 ? updateUIVisibility("START") : updateUIVisibility("HOME");
        return;
    }

    updateUIVisibility("SEARCH");
    const filtered = allNotes.filter(n => 
        (n.title || "").toLowerCase().includes(val) || 
        (n.content || "").toLowerCase().includes(val) ||
        n.tags?.some(t => t.toLowerCase().includes(val))
    );
    renderSearchResults(filtered, val);
};

function renderSearchResults(results, term) {
    const area = document.getElementById("searchResultsArea");
    if (results.length === 0) {
        area.innerHTML = `<div class="py-20 text-center text-slate-400 italic">"${term}" için sonuç yok.</div>`;
        return;
    }
    area.innerHTML = `
        <div class="max-w-4xl mx-auto py-8">
            <h2 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">Sonuçlar (${results.length})</h2>
            ${results.map(note => `
                <div onclick="showNoteDetail('${note.id}')" class="bg-white border border-slate-200 p-6 rounded-3xl mb-4 hover:border-blue-500 cursor-pointer transition-all">
                    <h3 class="text-xl font-black text-slate-800">${highlightText(note.title, term)}</h3>
                    <p class="text-sm text-slate-500 mt-2">${highlightText((note.content || "").substring(0, 150) + "...", term)}</p>
                </div>
            `).join('')}
        </div>`;
}

// --- 4. ETİKET SİSTEMİ ---
function renderTagCloud() {
    const container = document.getElementById("tagCloud");
    const tagCounts = {};
    allNotes.forEach(n => n.tags?.forEach(t => { 
        const low = t.toLowerCase(); tagCounts[low] = (tagCounts[low] || 0) + 1; 
    }));

    container.innerHTML = "";
    const isStart = selectedTags.length === 0 && !isNoteDetailOpen;

    Object.keys(tagCounts).forEach(tag => {
        const btn = document.createElement("button");
        const size = isStart ? (tagCounts[tag] > 5 ? 'text-4xl' : 'text-xl') : 'text-xs';
        btn.className = `${size} font-bold ${selectedTags.includes(tag) ? 'text-blue-600' : 'text-slate-400'} hover:text-blue-500 m-2 transition-all`;
        btn.innerText = `#${tag}`;
        btn.onclick = () => {
            if(!selectedTags.includes(tag)) selectedTags.push(tag);
            renderActiveFilters();
            updateUIVisibility("HOME");
        };
        container.appendChild(btn);
    });
}

function renderActiveFilters() {
    const container = document.getElementById("activeFiltersHeader");
    container.innerHTML = selectedTags.map(tag => `
        <span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
            #${tag} <button onclick="removeTagFilter('${tag}')" class="hover:text-red-500">×</button>
        </span>
    `).join('') || '<h3 class="font-bold text-slate-400 text-sm">Filtrelemek için etiket seçin</h3>';
    applyFilters();
}

window.removeTagFilter = (tag) => {
    selectedTags = selectedTags.filter(t => t !== tag);
    renderActiveFilters();
    if (selectedTags.length === 0) updateUIVisibility("START");
};

function applyFilters() {
    const filtered = allNotes.filter(n => selectedTags.every(t => n.tags?.includes(t)));
    renderMainContent(filtered);
    document.getElementById("noteCount").innerText = `${filtered.length} Başlık`;
}

// --- 5. YAZI DETAY VE YORUMLAR ---
window.showNoteDetail = function(noteId) {
    updateUIVisibility("DETAIL");
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;

    renderDetailHTML(note);
    loadComments(note.id, currentUserId);
};

function renderDetailHTML(note) {
    const area = document.getElementById("noteDetailArea");
    area.innerHTML = `
        <div class="max-w-4xl mx-auto py-8 px-6">
            <button onclick="closeNoteDetail()" class="text-blue-600 font-bold mb-8">← Geri Dön</button>
            <h1 class="text-5xl font-black text-slate-900 mb-4 capitalize">${note.title}</h1>
            <div class="flex items-center gap-2 mb-10 text-xs text-slate-400 font-bold uppercase">
                <span class="bg-blue-100 text-blue-600 px-2 py-1 rounded">#${note.tags?.[0]}</span>
                <span>• ${formatFullDateTime(note.createdAt)}</span>
            </div>
            <div class="entry-content text-lg text-slate-700 leading-relaxed bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm">
                ${note.content?.replace(/\n/g, '<br>')}
            </div>
            <div id="comments-container" class="mt-12 space-y-6"></div>
        </div>`;
}

// --- YARDIMCILAR ---
function formatFullDateTime(ts) {
    if (!ts) return "Az önce";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.toLocaleDateString('tr-TR')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function highlightText(text, term) {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term})`, "gi");
    return text.replace(regex, `<mark class="bg-yellow-200 rounded-sm">$1</mark>`);
}

// Sidebar Render
function renderSidebar(notes) {
    const container = document.getElementById("noteSidebar");
    container.innerHTML = notes.map(n => `
        <a href="#" onclick="showNoteDetail('${n.id}')" class="block px-4 py-3 hover:bg-white border-r-4 border-transparent hover:border-blue-500 transition-all">
            <div class="text-[13px] font-medium ${n.isUrgent ? 'text-red-600' : 'text-slate-700'}">${n.title}</div>
        </a>
    `).join('');
}

// Window Atamaları
window.closeNoteDetail = () => {
    const s = document.querySelector('input[oninput*="globalSearch"]')?.value;
    (s && s.length >= 2) ? updateUIVisibility("SEARCH") : (selectedTags.length === 0 ? updateUIVisibility("START") : updateUIVisibility("HOME"));
};
window.getCurrentNote = (id) => allNotes.find(n => n.id === id);
window.renderMainContent = renderMainContent; // Gerekiyorsa
