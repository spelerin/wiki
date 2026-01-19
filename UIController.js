// UIController.js
import { Templates } from './Templates.js';

export const UI = {
    elements: {},
    allArticles: [],

    init() {
        // 1. Elementleri Yakala
        this.elements = {
            contentArea: document.getElementById('app-root'), // Ana kapsayıcı
            articleSection: document.getElementById("article-section"),
            sidebarList: document.getElementById('sidebar-list'),
            searchInput: document.getElementById('search-input'),
            layoutBtns: {
                full: document.getElementById('full-tags'),
                half: document.getElementById('half-tags'),
                third: document.getElementById('third-tags'),
                close: document.getElementById('close-tags'),
                hideSide: document.getElementById('hide-side')
            }
        };

        // 2. Dinleyicileri Çalıştır (Sorduğun kritik satır)
        this.setupEventListeners();
        
        // 3. Hafızadaki durumu yükle
        this.loadInitialState();
    },

    // --- SENARYO A: ETİKET SEÇİLDİĞİNDE ---
    handleTagSelection(tagName) {
        console.log(`${tagName} etiketi seçildi`);
        // 1. Ekranı 1/3 düzenine getir (Kalıcı kaydetmiyoruz, sadece o anki durum)
        this.setTagPageState('third', false);
        
        // 2. Filtrelenmiş listeyi getir (FirebaseService ile)
        // FirebaseService.getNotesByTag(tagName, (notes) => this.renderArticleList(notes));
    },

// --- SENARYO B: YAZI BAŞLIĞINA TIKLANDIĞINDA ---
    renderArticleDetail(data) {
        const container = this.elements.articleSection;
        container.innerHTML = Templates.ArticleDetail(data);

        // 1. HAVUZU KAPAT (Layout: Hidden)
        this.setTagPageState('hidden', false);

        // 2. Dinleyicileri Kur (Geri Butonu Dahil)
        this.setupDetailListeners();
    },

    setupDetailListeners() {
        document.getElementById('btn-close-detail')?.addEventListener('click', () => {
            // GERİ DÖNÜŞ MANTIĞI:
            const searchVal = this.elements.searchInput?.value.trim();
            const savedPreference = localStorage.getItem('tagPoolPreference') || 'full';

            if (searchVal && searchVal.length > 0) {
                // Arama devam ediyorsa 1/3 ekran
                this.setTagPageState('third', false);
            } else {
                // Arama yoksa hafızadaki tercihe (Full/Half vb.) geri dön
                this.setTagPageState(savedPreference, false);
            }

            // Listeyi tekrar göster
            this.renderArticleList(this.allArticles);
        });
    },

    // --- SENARYO C: ARAMA ÇUBUĞU VE BOŞ DURUM ---

    setupEventListeners() {
        
        const { searchInput, layoutBtns } = this.elements;
        
        // Arama kutusu
        searchInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length > 0) {
                this.setTagPageState('third', false);
            } else {
                // Arama silindiğinde hafızadaki orijinal haline dön
                const original = localStorage.getItem('tagPoolPreference') || 'full';
                this.setTagPageState(original, false);
            }
        });
        

        // Sidebar gizle/göster
        layoutBtns.hideSide?.addEventListener('click', () => this.toggleSidebar());

        // Layout butonları (Döngü ile tertemiz)
        const layouts = { full: 'full', half: 'half', third: 'third', close: 'hidden' };
        Object.entries(layouts).forEach(([key, state]) => {
            layoutBtns[key]?.addEventListener('click', () => this.setTagPageState(state, true));
        });
    },

    // --- SIDEBAR LİSTESİNİ BASAN FONKSİYON ---
    renderSidebarList(notes) {
        // 1. Hedef elementi doğrudan DOM'dan bul
        const sidebarNav = document.getElementById('sidebar-list');
        
        if (!sidebarNav) {
            console.error("Hata: sidebar-list elementi bulunamadı!");
            return;
        }
    
        // 2. İçeriği temizle ve yeni başlıkları bas
        sidebarNav.innerHTML = notes.map(note => Templates.SidebarItem(note)).join('');
    
        // 3. Tıklama olaylarını bağla
        sidebarNav.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const noteId = link.dataset.id;
                const selectedNote = notes.find(n => n.id === noteId);
                
                // Tıklandığında orta alanda (article-section) detayı aç
                this.renderArticleDetail(selectedNote);
            });
        });
    },


    renderWelcome() {
        const container = document.getElementById('article-section');
        if (!container) return;
    
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full p-10 text-center animate-in fade-in duration-700">
                <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                    <svg class="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                </div>
                <h2 class="text-xl font-bold text-slate-800 mb-2">Bilgi Üssüne Hoş Geldiniz</h2>
                <p class="text-slate-500 max-w-sm leading-relaxed text-sm">
                    Okumak istediğiniz makaleyi sol taraftaki listeden seçebilir veya yukarıdaki arama kutusunu kullanabilirsiniz.
                </p>
            </div>
        `;
    },
    
    
    // --- MAKALE LİSTESİNİ BASAN FONKSİYON ---
    renderArticleList(notes) {
        this.allArticles = notes;
        const container = this.elements.articleSection;
        if (!container) return;

        container.innerHTML = Templates.ArticleList(notes);

        container.querySelectorAll('.article-item').forEach(item => {
            item.addEventListener('click', () => {
                const selected = notes.find(n => n.id === item.dataset.id);
                this.renderArticleDetail(selected);
            });
        });
    },



    setupDetailListeners(data) {
        document.getElementById('btn-close-detail')?.addEventListener('click', () => {
            this.setTagPageState(localStorage.getItem('tagPoolPreference') || 'hidden', false);
            this.renderArticleList(this.allArticles);
        });
        
        // Buraya Cevap Yaz butonlarını da ekleyebilirsin...
    },

    // --- DURUM YÖNETİCİLERİ ---
    setTagPageState(state, save = true) {
        const area = document.getElementById('content-area');
        area?.setAttribute('data-layout', state);
        if (save) localStorage.setItem('tagPoolPreference', state);
    },

    toggleSidebar() {
        const current = document.body.getAttribute('data-sidebar') || 'open';
        const next = current === 'open' ? 'closed' : 'open';
        document.body.setAttribute('data-sidebar', next);
        localStorage.setItem('sidebarStatus', next);
    },

    loadInitialState() {
        document.body.setAttribute('data-sidebar', localStorage.getItem('sidebarStatus') || 'open');
    }
};







