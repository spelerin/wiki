// ui-controller.js
export const UI = {
	elements: {},
    allArticles: [], // Gerçek veriler buraya gelecek

    init() {
        this.elements = {
            contentArea: document.getElementById('content-area'),
            searchInput: document.getElementById('search-input'),
            articleSection: document.getElementById("article-section"),
            sideBar: document.getElementById("sidebar"),
            // Layout butonlarını bir nesne içinde toplamak daha derli toplu
            layoutBtns: {
                full: document.getElementById('full-tags'),
                half: document.getElementById('half-tags'),
                third: document.getElementById('third-tags'),
                close: document.getElementById('close-tags'),
                hideSide: document.getElementById('hide-side')
            }
        };

        this.setupEventListeners();
        this.loadInitialState();
    },

    setupEventListeners() {
        const { searchInput, layoutBtns } = this.elements;

        // 1. Sidebar Toggle
        layoutBtns.hideSide?.addEventListener('click', () => this.toggleSidebar());

        // 2. Layout Değişimleri (Döngü ile daha temiz)
        const states = { full: 'full', half: 'half', third: 'third', close: 'hidden' };
        Object.entries(states).forEach(([id, state]) => {
            layoutBtns[id]?.addEventListener('click', () => this.setTagPageState(state, true));
        });

        // 3. Arama Girişi
        searchInput?.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            const state = value.length > 0 ? 'third' : (localStorage.getItem('tagPoolPreference') || 'hidden');
            this.setTagPageState(state, false);
        });
    },

    loadInitialState() {
        this.setSidebarState(localStorage.getItem('sidebarStatus') || 'open');
        this.setTagPageState(localStorage.getItem('tagPoolPreference') || 'hidden');
    },

    // --- DURUM YÖNETİCİLERİ ---
    setTagPageState(state, save = true) {
        this.elements.contentArea?.setAttribute('data-layout', state);
        if (save) localStorage.setItem('tagPoolPreference', state);
    },

    setSidebarState(state) {
        document.body.setAttribute('data-sidebar', state);
        localStorage.setItem('sidebarStatus', state);
    },

    toggleSidebar() {
        const current = document.body.getAttribute('data-sidebar') || 'open';
        this.setSidebarState(current === 'open' ? 'closed' : 'open');
    },

    // --- RENDER MANTIKLARI ---
	renderArticleList(notes) {
	    this.allArticles = notes;
	    const container = this.elements.articleSection;
	    
	    // Veritabanındaki "ownerName" ve "content"i şablona uygun eşleştiriyoruz
	    const mappedNotes = notes.map(n => ({
	        id: n.id,
	        title: n.title,
	        author: n.ownerName, // ownerName'i author olarak eşledik
	        date: n.date,
	        summary: n.content.substring(0, 100) + "..." // İlk 100 karakter
	    }));
	
	    container.innerHTML = Templates.ArticleList(mappedNotes);
	
	    container.querySelectorAll('.article-item').forEach(item => {
	        item.addEventListener('click', () => {
	            const selectedNote = notes.find(n => n.id === item.dataset.id);
	            this.renderArticleDetail(selectedNote);
	        });
	    });
	},

    renderArticleDetail(data) {
        const container = this.elements.articleSection;
        container.innerHTML = Templates.ArticleDetail(data);
        this.setTagPageState('hidden', false); // Odaklanma modu

        // Dinamik Buton Dinleyicileri (Sadece burada tanımlıyoruz)
        const uiMap = {
            'btn-close-detail': () => {
                this.setTagPageState(localStorage.getItem('tagPoolPreference') || 'hidden', false);
                this.renderArticleList(this.allArticles);
            },
            'btn-show-reply': () => {
                document.getElementById('reply-area').classList.remove('hidden');
                document.getElementById('reply-trigger').classList.add('hidden');
                document.getElementById('comment-input').focus();
            },
            'btn-hide-reply': () => {
                document.getElementById('reply-area').classList.add('hidden');
                document.getElementById('reply-trigger').classList.remove('hidden');
            },
            'btn-add-file': () => document.getElementById('comment-file-input').click(),
            'btn-send-comment': () => this.handleCommentSubmit(data.id)
        };

        Object.entries(uiMap).forEach(([id, func]) => {
            document.getElementById(id)?.addEventListener('click', func);
        });

        // Yorumları bas
        this.renderComments(sampleComments);
    },

    renderComments(comments) {
        const container = document.getElementById('comments-container');
        if (!container) return;

        container.innerHTML = comments.length > 0 
            ? comments.map(c => Templates.CommentItem(c)).join('')
            : `<p class="text-center text-slate-400 text-sm italic py-10">İlk yorumu sen yap!</p>`;

        // Event Delegation (Düzenle/Sil için)
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const { id, action } = btn.dataset;
            console.log(`${action} işlemi tetiklendi, ID: ${id}`);
        });
    },

    handleCommentSubmit(articleId) {
        const input = document.getElementById('comment-input');
        if (!input.value.trim()) return alert("Mesaj boş olamaz.");
        console.log("Gönderiliyor:", input.value, "ID:", articleId);
        // Firebase işlemi buraya gelecek
    }
};

// DOMContentLoaded olunca UI.init'i çağır
// Bind kullanıyoruz çünkü init içindeki 'this' anahtar kelimesi UI objesini göstersin

document.addEventListener('DOMContentLoaded', UI.init.bind(UI));

