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

    setupEventListeners() {
        const { layoutBtns, searchInput } = this.elements;

        // Sidebar gizle/göster
        layoutBtns.hideSide?.addEventListener('click', () => this.toggleSidebar());

        // Layout butonları (Döngü ile tertemiz)
        const layouts = { full: 'full', half: 'half', third: 'third', close: 'hidden' };
        Object.entries(layouts).forEach(([key, state]) => {
            layoutBtns[key]?.addEventListener('click', () => this.setTagPageState(state, true));
        });

        // Arama kutusu
        searchInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            this.setTagPageState(val.length > 0 ? 'third' : (localStorage.getItem('tagPoolPreference') || 'hidden'), false);
        });
    },

    // --- SIDEBAR LİSTESİNİ BASAN FONKSİYON ---
    renderSidebarList(notes) {
        const list = document.getElementById('sidebar-list');
        if (!list) return;

        // Acil olanları en üste alacak şekilde sıralayalım
        const sortedNotes = [...notes].sort((a, b) => (b.isUrgent === true ? 1 : -1));

        list.innerHTML = sortedNotes.map(note => Templates.SidebarItem(note)).join('');

        // Tıklama olaylarını bağla
        list.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const selected = notes.find(n => n.id === link.dataset.id);
                this.renderArticleDetail(selected);
            });
        });
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

    renderArticleDetail(data) {
        const container = this.elements.articleSection;
        container.innerHTML = Templates.ArticleDetail(data);
        this.setTagPageState('hidden', false); // Odaklanma modu

        // Detay içi butonları bağla (Geri, Cevap Yaz vb.)
        this.setupDetailListeners(data);
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
