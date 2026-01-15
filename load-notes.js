import { db } from './firebase-config.js';
import { 
    collection, query, where, or, getDocs, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Global değişkenler
let allNotes = [];

/**
 * Ana Fonksiyon: Notları Yükle
 */
export async function loadNotes(uid, userGroups, role) {
    const notesRef = collection(db, "notes");
    let q;

    // 1. Yetki bazlı sorgu oluşturma
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

        renderTagCloud(allNotes);
        renderSidebar(allNotes);
        renderMainContent(allNotes); // Başlangıçta tümünü göster
    } catch (error) {
        console.error("Notlar yüklenirken hata:", error);
    }
}

/**
 * ETİKET BULUTU: Sayıya göre boyutlandırma
 */
function renderTagCloud(notes) {
    const tagCounts = {};
    notes.forEach(note => {
        if (note.tags) {
            note.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
    });

    const tagContainer = document.querySelector(".flex-wrap.justify-center"); // HTML'deki yer
    tagContainer.innerHTML = "";

    // Boyut belirleme mantığı (Tailwind sınıfları)
    const getTagClass = (count) => {
        if (count > 10) return "text-2xl font-black text-slate-800";
        if (count > 5) return "text-xl font-bold text-blue-600";
        if (count > 2) return "text-lg font-semibold text-blue-400";
        return "text-sm font-medium text-slate-500";
    };

    Object.keys(tagCounts).forEach(tag => {
        const btn = document.createElement("button");
        btn.className = `${getTagClass(tagCounts[tag])} hover:underline cursor-pointer transition-all`;
        btn.innerText = `#${tag}`;
        btn.onclick = () => filterByTag(tag);
        tagContainer.appendChild(btn);
    });
}

/**
 * SOL MENÜ: Başlık Listesi
 */
function renderSidebar(notes) {
    const sidebarContainer = document.querySelector("nav.divide-y");
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
 * ANA İÇERİK: Detaylı Liste
 */
function renderMainContent(notes) {
    const mainContainer = document.querySelector(".divide-y.divide-slate-100"); // İçerik alanı
    mainContainer.innerHTML = "";

    notes.forEach(note => {
        const timeAgo = formatTimeAgo(note.createdAt);
        const preview = note.content ? note.content.substring(0, 150) + "..." : "";

        const card = `
            <div class="py-4 px-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                <div class="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                    <h4 class="text-[15px] md:text-base font-semibold text-blue-600 group-hover:underline">${note.title}</h4>
                    <div class="flex items-center gap-2 text-[11px] text-slate-400">
                        <span class="font-bold text-slate-600">@${note.ownerName || 'kullanici'}</span>
                        <span>&bull;</span>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                <p class="text-[13px] text-slate-500 line-clamp-1 mt-1 leading-relaxed">${preview}</p>
            </div>
        `;
        mainContainer.insertAdjacentHTML('beforeend', card);
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
