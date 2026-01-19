// UIController.js
import { Templates } from './Templates.js';
import { auth } from './firebase-config.js';
import { FirebaseService } from './FirebaseService.js';

export const UI = {
    elements: {},
    allArticles: [],
    activeCommentSub: null,

    init() {
        this.elements = {
            contentArea: document.getElementById('app-root'),
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
        this.setupEventListeners();
        this.loadInitialState();
    },

    // --- DETAY DİNLEYİCİLERİ (BİRLEŞTİRİLDİ) ---
    setupDetailListeners(data) {
        const showBtn = document.getElementById('btn-show-reply');
        const hideBtn = document.getElementById('btn-hide-reply');
        const replyArea = document.getElementById('reply-area');
        const replyTrigger = document.getElementById('reply-trigger');
        const saveBtn = document.getElementById('btn-save-comment');
        const commentInput = document.getElementById('comment-input');
        const closeDetailBtn = document.getElementById('btn-close-detail');

        // 1. GERİ DÖN BUTONU
        closeDetailBtn?.addEventListener('click', () => {
            this.setTagPageState(localStorage.getItem('tagPoolPreference') || 'hidden', false);
            this.renderArticleList(this.allArticles);
        });

        // 2. CEVAP YAZ ALANINI AÇ
        showBtn?.addEventListener('click', () => {
            replyArea?.classList.remove('hidden');
            replyTrigger?.classList.add('hidden');
            commentInput?.focus();
        });

        // 3. CEVAP YAZ ALANINI KAPAT
        hideBtn?.addEventListener('click', () => {
            replyArea?.classList.add('hidden');
            replyTrigger?.classList.remove('hidden');
            if (commentInput) commentInput.value = "";
        });

        // 4. DOSYA TETİKLEYİCİ
        document.getElementById('btn-trigger-file')?.addEventListener('click', () => {
            document.getElementById('comment-file-input').click();
        });

        // 5. GÖNDER BUTONU
        saveBtn?.addEventListener('click', async () => {
            const content = commentInput?.value.trim();
            if (!content) return alert("Boş entry gönderilemez.");

            try {
                saveBtn.disabled = true;
                saveBtn.textContent = "GÖNDERİLİYOR...";
                await FirebaseService.addComment(data.id, content, auth.currentUser);
                
                replyArea?.classList.add('hidden');
                replyTrigger?.classList.remove('hidden');
                if (commentInput) commentInput.value = "";
            } catch (error) {
                alert("Hata oluştu: " + error.message);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "GÖNDER";
            }
        });
    },

    // --- DETAY RENDER ---
    renderArticleDetail(data) {
        const container = this.elements.articleSection;
        if (!container) return;

        container.innerHTML = Templates.ArticleDetail(data);
        
        // Dinleyicileri bağla
        this.setupDetailListeners(data); 

        // Havuzu kapat
        this.setTagPageState('hidden', false);

        // Yorumları dinle
        if (this.activeCommentSub) this.activeCommentSub();
        this.activeCommentSub = FirebaseService.subscribeToComments(data.id, (comments) => {
            this.renderComments(comments);
        });
    },

    // --- SIDEBAR LİSTESİ ---
    renderSidebarList(notes) {
        const sidebarNav = document.getElementById('sidebar-list');
        if (!sidebarNav) return;

        sidebarNav.innerHTML = notes.map(note => Templates.SidebarItem(note)).join('');

        sidebarNav.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedNote = notes.find(n => n.id === link.dataset.id);
                this.renderArticleDetail(selectedNote);
                // Not: Yorum aboneliği artık renderArticleDetail içinde merkezi olarak yapılıyor.
            });
        });
    },


    // ETİKET HAVUZUNU BASAN FONKSİYON
    renderTagPool(tags) {
        const poolContainer = document.querySelector('#tag-pool .flex-wrap');
        if (!poolContainer) return;

        poolContainer.innerHTML = tags.map(tag => 
            `<button class="tag-item text-xl font-bold text-blue-600 hover:underline">#${tag}</button>`
        ).join('');

        // Etiketlere tıklama olayını bağla
        poolContainer.querySelectorAll('.tag-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tagName = btn.textContent.replace('#', '');
                this.handleTagSelection(tagName);
            });
        });
    },

    renderComments(comments) {
        const container = document.getElementById('comments-container');
        if (!container) return;
    
        if (comments.length === 0) {
            container.innerHTML = `<p class="text-center text-slate-400 text-sm italic py-10">Henüz yorum yapılmamış. İlk yorumu sen yap!</p>`;
            return;
        }
    
        const currentUserId = auth.currentUser?.uid;
        container.innerHTML = comments.map(c => Templates.CommentItem(c, currentUserId)).join('');
    
        // Buton Dinleyicileri (Düzenle/Sil)
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const { id, action } = btn.dataset;
                if (action === 'delete') {
                    if(confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
                        console.log("Silinecek yorum ID:", id);
                        // FirebaseService.deleteComment(id);
                    }
                } else if (action === 'edit') {
                    console.log("Düzenlenecek yorum ID:", id);
                    // Düzenleme mantığı buraya gelecek
                }
            });
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
                const selectedNote = notes.find(n => n.id === item.dataset.id);
                this.renderArticleDetail(selectedNote);
                
                // Dinleyiciyi burada başlatmak için FirebaseService'i kullanabiliriz
                if (this.activeSub) this.activeSub(); // Eskiyi temizle
                this.activeSub = FirebaseService.subscribeToComments(selectedNote.id, (comments) => {
                    this.renderComments(comments);
                });
            });
        });
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


















