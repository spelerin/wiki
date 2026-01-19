// UIController.js
import { Templates } from './Templates.js';
import { auth } from './firebase-config.js';
import { FirebaseService } from './FirebaseService.js';

export const UI = {
    elements: {},
    allArticles: [],
    currentComments: [],
    activeSub: null, // Yorum aboneliği için tekil değişken

    init() {
        this.elements = {
            appRoot: document.getElementById('app-root'),
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
        this.setupDelegatedActions();
        this.loadInitialState();
    },

    // MERKEZİ TIKLAMA YÖNETİCİSİ (Yorumlar ve Dosyalar)
    setupDelegatedActions() {
        this.elements.appRoot?.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const { id, action } = btn.dataset;
            const commentCard = document.getElementById(`comment-${id}`);
            const contentDiv = commentCard?.querySelector('.entry-content');

            switch (action) {
                case 'delete':
                    if (confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
                        await FirebaseService.deleteComment(id);
                    }
                    break;

                case 'edit':
                    const commentToEdit = this.currentComments?.find(c => c.id === id);
                    if (contentDiv && commentToEdit) {
                        contentDiv.innerHTML = Templates.CommentEditForm(commentToEdit);
                        commentCard.querySelector('.comment-actions-bar')?.classList.add('hidden');
                    }
                    break;

                case 'cancel-edit':
                    this.renderComments(this.currentComments);
                    break;

                case 'save-edit':
                    const input = document.getElementById(`edit-input-${id}`);
                    const newContent = input?.value.trim();
                    if (newContent) {
                        btn.disabled = true;
                        btn.textContent = "...";
                        await FirebaseService.updateComment(id, newContent);
                    }
                    break;

                case 'download-secure':
                    this.handleFileDownload(btn);
                    break;
            }
        });
    },

    // DOSYA İNDİRME MANTIĞI (Temizlendi)
    async handleFileDownload(btn) {
        const { path, name } = btn.dataset;
        try {
            btn.classList.add('animate-pulse', 'opacity-50');
            const blob = await FirebaseService.downloadSecureFile(path);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (err) {
            alert("Dosya indirilemedi.");
        } finally {
            btn.classList.remove('animate-pulse', 'opacity-50');
        }
    },

    // YORUM RENDER (Temizlendi)
    renderComments(comments) {
        const container = document.getElementById('comments-container');
        if (!container) return;
        this.currentComments = comments;

        if (comments.length === 0) {
            container.innerHTML = ''; 
            return;
        }

        const currentUserId = auth.currentUser?.uid;
        container.innerHTML = comments.map(c => Templates.CommentItem(c, currentUserId)).join('');
    },

    // CEVAP YAZMA PANELİ DİNLEYİCİLERİ
    setupDetailListeners(data) {
        const els = {
            show: document.getElementById('btn-show-reply'),
            hide: document.getElementById('btn-hide-reply'),
            area: document.getElementById('reply-area'),
            trig: document.getElementById('reply-trigger'),
            save: document.getElementById('btn-save-comment'),
            input: document.getElementById('comment-input'),
            close: document.getElementById('btn-close-detail'),
            fileInp: document.getElementById('comment-file-input'),
            preview: document.getElementById('selected-files-preview'),
            fileTrigger: document.getElementById('btn-trigger-file')
        };

        let selectedFiles = [];

        els.close?.addEventListener('click', () => {
            this.setTagPageState(localStorage.getItem('tagPoolPreference') || 'hidden', false);
            this.renderArticleList(this.allArticles);
        });

        els.show?.addEventListener('click', () => {
            els.area?.classList.remove('hidden');
            els.trig?.classList.add('hidden');
            els.input?.focus();
        });

        els.hide?.addEventListener('click', () => {
            els.area?.classList.add('hidden');
            els.trig?.classList.remove('hidden');
            if (els.input) els.input.value = "";
        });


        // Dosya seçme penceresini açan tetikleyici
        fileTrigger?.addEventListener('click', () => {
            console.log("Dosya seçici açılıyor...");
            fileInp?.click();
        });
        
    els.fileInp?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        for (const file of files) {
            try {
                // Görsel geri bildirim ekle
                if (els.preview) {
                    els.preview.innerHTML += `<span id="up-${file.name}" class="text-[10px] bg-blue-50 px-2 py-1 rounded">...</span>`;
                }

                // Dosyayı yükle ve meta veriyi al (name ve path içerir)
                const uploadedMeta = await FirebaseService.uploadFile(file);
                
                // Meta veriyi diziye ekle
                selectedFiles.push(uploadedMeta); 

                // Önizlemeyi güncelle
                const badge = document.getElementById(`up-${file.name}`);
                if (badge) badge.innerHTML = `${file.name} ✓`;
                
            } catch (err) { alert("Dosya yüklenemedi: " + file.name); }
        }
    });

    els.save?.addEventListener('click', async () => {
        const content = els.input?.value.trim();
        if (!content) return alert("Lütfen bir mesaj yazın.");

        try {
            els.save.disabled = true;
            els.save.textContent = "GÖNDERİLİYOR...";

            // KRİTİK: selectedFiles dizisini burada servis fonksiyonuna paslıyoruz
            await FirebaseService.addComment(data.id, content, auth.currentUser, selectedFiles);

            // Başarılıysa temizle
            selectedFiles = []; 
            if (els.preview) els.preview.innerHTML = "";
            // ... (diğer kapatma işlemleri)
        } catch (error) {
            alert("Hata oluştu.");
        } finally {
            els.save.disabled = false;
            els.save.textContent = "GÖNDER";
        }
    });
},

    // MERKEZİ MAKALE DETAY RENDER (Abonelik dahil)
    renderArticleDetail(data) {
        const container = this.elements.articleSection;
        if (!container) return;

        container.innerHTML = Templates.ArticleDetail(data);
        this.setupDetailListeners(data); 
        this.setTagPageState('hidden', false);

        // Yorum Aboneliğini Yönet (Eskiyi temizle, yeniyi başlat)
        if (this.activeSub) this.activeSub();
        this.activeSub = FirebaseService.subscribeToComments(data.id, (comments) => {
            this.renderComments(comments);
        });
    },

    // SIDEBAR LİSTESİ
    renderSidebarList(notes) {
        const sidebarNav = this.elements.sidebarList;
        if (!sidebarNav) return;

        sidebarNav.innerHTML = notes.map(note => Templates.SidebarItem(note)).join('');
        sidebarNav.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const note = notes.find(n => n.id === link.dataset.id);
                if (note) this.renderArticleDetail(note);
            });
        });
    },

    // MAKALE LİSTESİ (Orta Alan)
    renderArticleList(notes) {
        this.allArticles = notes;
        const container = this.elements.articleSection;
        if (!container) return;

        container.innerHTML = Templates.ArticleList(notes);
        container.querySelectorAll('.article-item').forEach(item => {
            item.addEventListener('click', () => {
                const note = notes.find(n => n.id === item.dataset.id);
                if (note) this.renderArticleDetail(note);
            });
        });
    },

    renderTagPool(tags) {
        const poolContainer = document.querySelector('#tag-pool .flex-wrap');
        if (!poolContainer) return;

        poolContainer.innerHTML = tags.map(tag => 
            `<button class="tag-item text-xl font-bold text-blue-600 hover:underline">#${tag}</button>`
        ).join('');

        poolContainer.querySelectorAll('.tag-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleTagSelection(btn.textContent.replace('#', ''));
            });
        });
    },

    handleTagSelection(tagName) {
        this.setTagPageState('third', false);
        const filtered = this.allArticles.filter(n => n.tags?.includes(tagName));
        this.renderArticleList(filtered);
    },

    setupEventListeners() {
        const { searchInput, layoutBtns } = this.elements;
        
        searchInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length > 0) {
                this.setTagPageState('third', false);
            } else {
                const original = localStorage.getItem('tagPoolPreference') || 'full';
                this.setTagPageState(original, false);
            }
        });

        layoutBtns.hideSide?.addEventListener('click', () => this.toggleSidebar());

        const layouts = { full: 'full', half: 'half', third: 'third', close: 'hidden' };
        Object.entries(layouts).forEach(([key, state]) => {
            layoutBtns[key]?.addEventListener('click', () => this.setTagPageState(state, true));
        });
    },

    renderWelcome() {
        const container = this.elements.articleSection;
        if (!container) return;
        container.innerHTML = Templates.WelcomeView(); // Şablona taşındı varsayalım
    },

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


