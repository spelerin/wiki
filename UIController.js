// UIController.js
import { Templates } from './Templates.js';
import { auth } from './firebase-config.js';
import { FirebaseService } from './FirebaseService.js';

export const UI = {
    elements: {},
    allArticles: [],
    currentComments: [],
    activeSub: null,
    editingSession: null, // O an düzenlenen yorumun dosya durumunu tutar

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

            const { id, action, index, type } = btn.dataset;
            
            const commentCard = document.getElementById(`comment-${id}`);
            const contentDiv = commentCard?.querySelector('.entry-content');

            switch (action) {

                case 'edit':
                    const comment = this.currentComments.find(c => c.id === id);
                    if (comment) {
                        // Yeni bir düzenleme oturumu başlat
                        this.editingSession = {
                            id: id,
                            existingFiles: [...(comment.files || [])],
                            newFiles: []
                        };
                        this.renderEditMode(id);
                    }
                    break;

                case 'trigger-edit-file':
                    document.getElementById(`edit-file-input-${id}`)?.click();
                    break;

                case 'remove-file-edit':
                    // Düzenleme sırasında dosyayı listeden çıkar
                    const session = this.editingSession;
                    if (type === 'existing') session.existingFiles.splice(index, 1);
                    else session.newFiles.splice(index, 1);
                    this.refreshEditPreview();
                    break;

                case 'save-edit':
                    await this.handleSaveEdit(btn, id);
                    break;
                
                case 'cancel-edit':
                    this.editingSession = null;
                    this.renderComments(this.currentComments);
                    break;
                    
                    
                case 'delete':
                    const commentToDelete = this.currentComments.find(c => c.id === id);
                    if (confirm("Bu yorumu ve ekli dosyaları silmek istediğinize emin misiniz?")) {
                        // noteId'yi comment objesinden alıyoruz
                        await FirebaseService.deleteComment(id, commentToDelete.noteId, commentToDelete.files);
                    }
                break;

                case 'download-secure':
                    this.handleFileDownload(btn);
                    break;
            }
        });

        // Düzenleme modundaki file input dinleyicisi (Delegasyon üzerinden)
        this.elements.appRoot?.addEventListener('change', (e) => {
            if (e.target.id?.startsWith('edit-file-input-')) {
                const newFiles = Array.from(e.target.files);
                this.editingSession.newFiles = [...this.editingSession.newFiles, ...newFiles];
                this.refreshEditPreview();
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
    },

    renderEditMode(id) {
        const comment = this.currentComments.find(c => c.id === id);
        const card = document.getElementById(`comment-${id}`);
        const contentDiv = card?.querySelector('.entry-content');
        if (contentDiv) {
            contentDiv.innerHTML = Templates.CommentEditForm(comment);
            card.querySelector('.comment-actions-bar')?.classList.add('hidden');
        }
    },

    refreshEditPreview() {
        const session = this.editingSession;
        const container = document.getElementById(`edit-preview-${session.id}`);
        if (!container) return;

        const html = [
            ...session.existingFiles.map((f, i) => Templates.EditFilePill(f, i, false)),
            ...session.newFiles.map((f, i) => Templates.EditFilePill(f, i, true))
        ].join('');
        
        container.innerHTML = html;
    },    

async handleSaveEdit(btn, id) {
    const input = document.getElementById(`edit-input-${id}`);
    const content = input?.value.trim();
    const session = this.editingSession;
    
    // Orijinal yorumu bul (silinen dosyaları tespit etmek için)
    const originalComment = this.currentComments.find(c => c.id === id);
    const originalFiles = originalComment.files || [];

    try {
        btn.disabled = true;
        btn.textContent = "...";

        // 1. FİZİKSEL SİLME: Orijinal listede olup session.existingFiles'da olmayanları sil
        const filesToDelete = originalFiles.filter(orig => 
            !session.existingFiles.find(ex => ex.path === orig.path)
        );
        
        for (const file of filesToDelete) {
            await FirebaseService.deleteFile(file.path);
        }

        // 2. YENİ DOSYALARI YÜKLE
        const newMetadata = [];
        for (const file of session.newFiles) {
            const meta = await FirebaseService.uploadFile(file);
            newMetadata.push(meta);
        }

        // 3. VERİTABANINI GÜNCELLE
        const finalFiles = [...session.existingFiles, ...newMetadata];
        await FirebaseService.updateComment(id, content, finalFiles);

        this.editingSession = null;
    } catch (error) {
        alert("Güncelleme başarısız.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Kaydet";
    }
},

    filesToUploadForNote: [],
    
    initNoteCreate() {
        const modalContainer = document.getElementById('modal-root');
        if (!modalContainer) return;

        modalContainer.innerHTML = Templates.NoteCreateModal();
        const modal = document.getElementById('noteCreateArea');
        
        // Modalı göster
        modal.classList.remove('hidden');
        
        this.setupNoteCreateListeners();
    },

    setupNoteCreateListeners() {
        const els = {
            close: document.getElementById('btn-close-note-create'),
            publish: document.getElementById('btn-publish-note'),
            fileInp: document.getElementById('note-file-input'),
            dropZone: document.getElementById('drop-zone-note'),
            subTagsInp: document.getElementById('new-note-sub-tags'),
            errorTags: document.getElementById('sub-tags-error')
        };

        // Kapatma
        els.close?.addEventListener('click', () => {
            document.getElementById('noteCreateArea').classList.add('hidden');
            this.filesToUploadForNote = [];
        });

        // Etiket Doğrulama (En fazla 2 kelime kuralı)
        els.subTagsInp?.addEventListener('input', (e) => {
            const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t !== "");
            const hasError = tags.some(tag => tag.split(' ').length > 2);
            els.errorTags.classList.toggle('hidden', !hasError);
        });

        // Dosya Seçimi
        els.dropZone?.addEventListener('click', () => els.fileInp.click());
        els.fileInp?.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files);
            this.filesToUploadForNote = [...this.filesToUploadForNote, ...newFiles];
            this.renderSelectedFilesPreview(this.filesToUploadForNote, document.getElementById('note-files-preview'));
        });

        // YAYINLA
        els.publish?.addEventListener('click', async () => {
            await this.handleNotePublish(els.publish);
        });
    },

    async handleNotePublish(btn) {
        const title = document.getElementById('new-note-title').value.trim();
        const primaryTag = document.getElementById('new-note-primary-tag').value;
        const subTagsRaw = document.getElementById('new-note-sub-tags').value;
        const content = document.getElementById('new-note-content').value.trim();
        const isUrgent = document.getElementById('new-note-isUrgent').checked;

        if (!title || !primaryTag || !content) return alert("Lütfen zorunlu alanları doldurun!");

        try {
            btn.disabled = true;
            btn.textContent = "YÜKLENİYOR...";

            // 1. Dosyaları yükle
            const uploadedMetadata = [];
            for (const file of this.filesToUploadForNote) {
                const meta = await FirebaseService.uploadFile(file);
                uploadedMetadata.push(meta);
            }

            // 2. Not Verisini Hazırla
            const subTags = subTagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "");
            const noteData = {
                title,
                primaryTag,
                tags: [primaryTag, ...subTags],
                content,
                isUrgent,
                visibility: "public" // Şimdilik varsayılan
            };

            // 3. Kaydet
            await FirebaseService.addNote(noteData, auth.currentUser, uploadedMetadata);

            // Başarılı: Modalı kapat ve sayfayı yenile
            alert("Yeni başlık başarıyla oluşturuldu!");
            location.reload(); 

        } catch (error) {
            alert("Yayınlama sırasında hata oluştu.");
        } finally {
            btn.disabled = false;
            btn.textContent = "YAYINLA";
        }
    }
};



