// UIController.js
import { Templates } from './Templates.js';
import { auth } from './firebase-config.js';
import { FirebaseService } from './FirebaseService.js';

export const UI = {
    elements: {},
    allArticles: [],
    currentComments: [],
    activeSub: null,

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

    // --- YARDIMCI METODLAR ---

    // Not açma mantığını tek merkezde topladık
    openNote(id, sourceArray) {
        const note = sourceArray.find(n => n.id === id);
        if (note) this.renderArticleDetail(note);
    },

    // --- DELEGASYON (Yorum ve Dosya İşlemleri) ---

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
                    const comment = this.currentComments?.find(c => c.id === id);
                    if (contentDiv && comment) {
                        contentDiv.innerHTML = Templates.CommentEditForm(comment);
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
            console.error("İndirme Hatası:", err);
            alert("Dosya indirilemedi.");
        } finally {
            btn.classList.remove('animate-pulse', 'opacity-50');
        }
    },

    // --- RENDER METODLARI ---

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
            fileTrig: document.getElementById('btn-trigger-file')
        };

        let filesToUpload = [];

        els.close?.addEventListener('click', () => {
            const original = localStorage.getItem('tagPoolPreference') || 'hidden';
            this.setTagPageState(original, false);
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
            if (els.preview) els.preview.innerHTML = "";
            filesToUpload = [];
        });

        els.fileTrig?.addEventListener('click', () => els.fileInp?.click());

        els.fileInp?.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files);
            filesToUpload = [...filesToUpload, ...newFiles];
            this.renderSelectedFilesPreview(filesToUpload, els.preview);
            els.fileInp.value = "";
        });

        els.save?.addEventListener('click', async () => {
            const content = els.input?.value.trim();
            if (!content && filesToUpload.length === 0) return alert("Boş içerik gönderilemez.");

            try {
                els.save.disabled = true;
                els.save.textContent = "YÜKLENİYOR...";

                const uploadedMetadata = [];
                for (const file of filesToUpload) {
                    const meta = await FirebaseService.uploadFile(file);
                    uploadedMetadata.push(meta);
                }

                await FirebaseService.addComment(data.id, content, auth.currentUser, uploadedMetadata);
                els.hide.click();
            } catch (error) {
                alert("Gönderim sırasında bir hata oluştu.");
            } finally {
                els.save.disabled = false;
                els.save.textContent = "GÖNDER";
            }
        });

        els.preview?.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('button[data-action="remove-file"]');
            if (!removeBtn) return;
            filesToUpload.splice(parseInt(removeBtn.dataset.index), 1);
            this.renderSelectedFilesPreview(filesToUpload, els.preview);
        });
    },

    renderSelectedFilesPreview(files, container) {
        if (!container) return;
        container.innerHTML = files.map((f, i) => Templates.SelectedFilePill(f, i)).join('');
    },

    renderArticleDetail(data) {
        const container = this.elements.articleSection;
        if (!container) return;

        container.innerHTML = Templates.ArticleDetail(data);
        this.setupDetailListeners(data); 
        this.setTagPageState('hidden', false);

        if (this.activeSub) this.activeSub();
        this.activeSub = FirebaseService.subscribeToComments(data.id, (comments) => {
            this.renderComments(comments);
        });
    },

    renderSidebarList(notes) {
        const list = this.elements.sidebarList;
        if (!list) return;

        list.innerHTML = notes.map(n => Templates.SidebarItem(n)).join('');
        list.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.openNote(link.dataset.id, notes);
            });
        });
    },

    renderArticleList(notes) {
        this.allArticles = notes;
        const container = this.elements.articleSection;
        if (!container) return;

        container.innerHTML = Templates.ArticleList(notes);
        container.querySelectorAll('.article-item').forEach(item => {
            item.addEventListener('click', () => this.openNote(item.dataset.id, notes));
        });
    },

    // --- GENEL UI YÖNETİMİ ---

    renderTagPool(tags) {
        const pool = document.querySelector('#tag-pool .flex-wrap');
        if (!pool) return;

        pool.innerHTML = tags.map(t => `<button class="tag-item ...">#${t}</button>`).join('');
        pool.querySelectorAll('.tag-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.textContent.replace('#', '');
                this.setTagPageState('third', false);
                this.renderArticleList(this.allArticles.filter(n => n.tags?.includes(tag)));
            });
        });
    },

    setupEventListeners() {
        const { searchInput, layoutBtns } = this.elements;
        
        searchInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length > 0) {
                this.setTagPageState('third', false);
            } else {
                this.setTagPageState(localStorage.getItem('tagPoolPreference') || 'full', false);
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
        if (container) container.innerHTML = Templates.WelcomeView();
    },

    setTagPageState(state, save = true) {
        document.getElementById('content-area')?.setAttribute('data-layout', state);
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
