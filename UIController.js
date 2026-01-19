// UIController.js
import { Templates } from './Templates.js';
import { auth } from './firebase-config.js'; // Kullanıcı kontrolü için
import { FirebaseService } from './FirebaseService.js'; // BU SATIR EKSİKTİ, EKLE!

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
        // 1. Ekranı 1/3 düzenine getir (Layout: third)
        this.setTagPageState('third', false);
        
        // 2. Orta alana (article-section) listeyi bas
        // Burada Firebase'den o etikete ait notları filtreleyip basacağız
        const filteredNotes = this.allArticles.filter(n => n.tags && n.tags.includes(tagName));
        this.renderArticleList(filteredNotes);
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


    // --- SENARYO B: YAZI BAŞLIĞINA TIKLANDIĞINDA ---
    renderArticleDetail(data) {
        const container = document.getElementById('article-section');
        if (!container) return;
    
        // 1. Şablonu bas (Bu işlem DOM'u günceller)
        container.innerHTML = Templates.ArticleDetail(data);
    
        // 2. KRİTİK ADIM: Dinleyicileri tam bu satırda bağla!
        this.setupDetailListeners(data); 
    
        // 3. Havuzu kapat
        this.setTagPageState('hidden', false);
    
        // 4. Yorumları dinlemeye başla
        if (this.activeCommentSub) this.activeCommentSub();
        this.activeCommentSub = FirebaseService.subscribeToComments(data.id, (comments) => {
            this.renderComments(comments);
        });
    },

    

    // UIController.js içinde
    setupDetailListeners(data) {
        const showBtn = document.getElementById('btn-show-reply');
        const hideBtn = document.getElementById('btn-hide-reply');
        const replyArea = document.getElementById('reply-area');
        const replyTrigger = document.getElementById('reply-trigger');
        const saveBtn = document.getElementById('btn-save-comment');
        const commentInput = document.getElementById('comment-input');
    
        // Hata ayıklama için:
        if (showBtn) console.log("Cevap Yaz butonu başarıyla yakalandı.");
    
        // AÇMA BUTONU
        showBtn?.addEventListener('click', () => {
            console.log("Cevap yazma alanı açılıyor...");
            replyArea?.classList.remove('hidden');
            replyTrigger?.classList.add('hidden');
            commentInput?.focus();
        });
    
        // KAPATMA BUTONU
        hideBtn?.addEventListener('click', () => {
            replyArea?.classList.add('hidden');
            replyTrigger?.classList.remove('hidden');
            if (commentInput) commentInput.value = "";
        });
    
        // GÖNDER BUTONU
        saveBtn?.addEventListener('click', async () => {
            const content = commentInput?.value.trim();
            if (!content) return alert("Boş entry gönderilemez.");
    
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = "GÖNDERİLİYOR...";
                
                await FirebaseService.addComment(data.id, content, auth.currentUser);
                
                // Başarılıysa alanı temizle ve kapat
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
    }


        
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
                this.renderArticleDetail(selectedNote);
                
                // Dinleyiciyi burada başlatmak için FirebaseService'i kullanabiliriz
                if (this.activeSub) this.activeSub(); // Eskiyi temizle
                this.activeSub = FirebaseService.subscribeToComments(selectedNote.id, (comments) => {
                    this.renderComments(comments);
                });
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
                const selectedNote = notes.find(n => n.id === noteId);
                this.renderArticleDetail(selectedNote);
                
                // Dinleyiciyi burada başlatmak için FirebaseService'i kullanabiliriz
                if (this.activeSub) this.activeSub(); // Eskiyi temizle
                this.activeSub = FirebaseService.subscribeToComments(selectedNote.id, (comments) => {
                    this.renderComments(comments);
                });
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















