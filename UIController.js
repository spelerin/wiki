// UIController.js
import { Templates } from './Templates.js';
import { auth } from './firebase-config.js';
import { FirebaseService } from './FirebaseService.js';

export const UI = {
    elements: {},
    allArticles: [],
    currentComments: [],
    activeSub: null,
    editingSession: null, 
    noteEditSession: {
        existingFiles: [],
        filesToDelete: []
    },
    selectedEntities: [], 
    filesToUploadForNote: [],
    currentEditingNoteId: null,
    currentActiveNote: null, // Eksikti, eklendi
    selectedTags: [],

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

        this.initModal(); // Modal render işlemini bir metoda aldık
        this.setupEventListeners();
        this.setupDelegatedActions();
        this.loadInitialState();
    },

    // 1. Yetkili notlardan etiketleri ve sayılarını hesapla
    renderTagPool() {
        const pool = document.querySelector('#tag-pool .flex-wrap');
        if (!pool) return;
    
        // Mevcut filtrelenmiş notları al (Eğer etiket seçiliyse onlara uyanları, değilse tüm yetkilileri)
        const filteredNotes = this.allArticles.filter(note => 
            this.selectedTags.every(tag => note.tags?.includes(tag))
        );
    
        // Etiket frekanslarını hesapla
        const tagCounts = {};
        filteredNotes.forEach(note => {
            note.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
    
        // HTML oluşturma
        pool.innerHTML = Object.entries(tagCounts).map(([tag, count]) => {
            const isSelected = this.selectedTags.includes(tag);
            // Logaritmik boyutlandırma (1'den 5'e kadar scale)
            const fontSize = Math.min(1 + (count * 0.2), 2.5); 
            
            return `
                <button data-tag="${tag}" 
                    class="tag-item transition-all duration-300 px-3 py-1 rounded-full m-1 font-bold
                    ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-600 hover:bg-blue-100'}"
                    style="font-size: ${fontSize}rem; opacity: ${isSelected ? '1' : '0.8'}">
                    #${tag} ${isSelected ? '×' : ''}
                </button>
            `;
        }).join('');
    
        this.setupTagEvents();
    },


setupTagEvents() {
    document.querySelectorAll('.tag-item').forEach(btn => {
        btn.onclick = () => { // Dinleyicileri temiz tutmak için
            const tag = btn.dataset.tag;
            
            if (this.selectedTags.includes(tag)) {
                this.selectedTags = this.selectedTags.filter(t => t !== tag);
            } else {
                this.selectedTags.push(tag);
                // İlk etiket seçildiğinde havuzu daralt (Third modu)
                if (this.selectedTags.length === 1) this.setTagPageState('third', true);
            }

            this.applyFilters();
        };
    });
},
    
    applyFilters() {
        // allArticles undefined ise hatayı önlemek için boş dizi varsay
        const articles = this.allArticles || [];
        const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || "";
        
        // 1. Notları Filtrele
        const filtered = articles.filter(note => {
            // Seçili etiketlerin tamamı notta var mı?
            const matchesTags = this.selectedTags.every(t => note.tags?.includes(t));
            // Arama terimi başlıkta veya içerikte var mı?
            const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 
                                  note.content.toLowerCase().includes(searchTerm);
            return matchesTags && matchesSearch;
        });
    
        // 2. Listeleri güncelle
        this.renderArticleList(filtered);
        
        // 3. Etiket havuzunu bu filtrelenmiş sonuçlara göre tekrar hesapla
        this.renderTagPool(filtered); 
    },

    
    // UIController.js içindeki UI objesine ekle
    setupEventListeners() {
        const { searchInput, layoutBtns } = this.elements;

        const globalSearch = document.getElementById('search-input');


        globalSearch?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
        
            if (val.length > 0) {
                // Arama yapılıyorsa etiketleri tamamen gizle (close-tags)
                this.setTagPageState('hidden', false);
            } else {
                // Arama kutusu boşsa, eğer seçili etiket varsa 'third', yoksa eski tercih
                if (this.selectedTags.length > 0) {
                    this.setTagPageState('third', false);
                } else {
                    const lastPref = localStorage.getItem('tagPoolPreference') || 'full';
                    this.setTagPageState(lastPref, false);
                }
            }
            
        this.applyFilters();
        
        // Üst arama çubuğu dinleyicisi
        searchInput?.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (val.length > 0) {
                this.setTagPageState('third', false);
            } else {
                const savedLayout = localStorage.getItem('tagPoolPreference') || 'full';
                this.setTagPageState(savedLayout, false);
            }
        });

        // Sidebar gizle/göster butonu
        layoutBtns.hideSide?.addEventListener('click', () => this.toggleSidebar());

        // Layout butonları (full, half, third, close)
        const layouts = { 
            full: 'full', 
            half: 'half', 
            third: 'third', 
            close: 'hidden' 
        };

        Object.entries(layouts).forEach(([key, state]) => {
            layoutBtns[key]?.addEventListener('click', () => this.setTagPageState(state, true));
        });
    },    

    initModal() {
        const modalRoot = document.getElementById('modal-root');
        if (modalRoot) {
            modalRoot.innerHTML = Templates.NoteCreateModal();
            this.setupNoteCreateListeners();
        }
    },

    // --- DELEGASYON SİSTEMİ ---
    setupDelegatedActions() {
        this.elements.appRoot?.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;

            const { id, action, index, type } = btn.dataset;

            if (action === 'remove-entity') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Silinmek istenen ID:", id); // Konsolda bunu görmelisin
                    this.removeEntity(id);
                }
            
            switch (action) {
                case 'edit':
                    const comment = this.currentComments.find(c => c.id === id);
                    if (comment) {
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
                    if (type === 'existing') this.editingSession.existingFiles.splice(index, 1);
                    else this.editingSession.newFiles.splice(index, 1);
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
                    if (commentToDelete && confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
                        await FirebaseService.deleteComment(id, commentToDelete.noteId, commentToDelete.files);
                    }
                    break;

                case 'download-secure':
                    this.handleFileDownload(btn);
                    break;

                case 'edit-main-article':
                    const noteToEdit = this.allArticles.find(n => n.id === id) || this.currentActiveNote;
                    if (noteToEdit) this.openNoteModal(noteToEdit);
                    break;

                case 'delete-main-article':
                    await this.handleNoteDelete(id);
                    break;

                case 'add-new-note':
                    this.openNewNoteModal();
                    break;
                
                case 'remove-entity': // removeEntity'yi delegasyona aldık (onclick hatasını önlemek için)
                    this.removeEntity(id);
                    break;

                case 'remove-entity':
                    // Tıklanan butonun içindeki ID'yi al ve listeden sil
                    const entityId = btn.dataset.id;
                    this.removeEntity(entityId);
                    break;    
            }
        });

        // Düzenleme modundaki file input dinleyicisi
        this.elements.appRoot?.addEventListener('change', (e) => {
            if (e.target.id?.startsWith('edit-file-input-')) {
                const newFiles = Array.from(e.target.files);
                this.editingSession.newFiles = [...this.editingSession.newFiles, ...newFiles];
                this.refreshEditPreview();
            }
        });
    },

    // --- NOT EKLEME / DÜZENLEME MODALI ---
    openNewNoteModal() {
        this.currentEditingNoteId = null;
        this.noteEditSession = { existingFiles: [], filesToDelete: [] };
        this.filesToUploadForNote = [];
        this.selectedEntities = []; // Temizle

        const modal = document.getElementById('noteCreateArea');
        if (!modal) return this.initModal() || this.openNewNoteModal();

        // Form temizleme
        ['new-note-title', 'new-note-primary-tag', 'new-note-sub-tags', 'new-note-content'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        document.getElementById('new-note-isUrgent').checked = false;
        document.getElementById('new-note-isCommentsClosed').checked = false;

        const publicRadio = document.querySelector('input[name="visibility"][value="public"]');
        if (publicRadio) publicRadio.checked = true;
        
        document.getElementById('selection-panel')?.classList.add('hidden');
        document.getElementById('existing-files-section')?.classList.add('hidden');
        document.getElementById('btn-publish-note').textContent = "YAYINLA";
        
        this.renderSelectedEntities();
        this.refreshNoteEditFilePreview();
        modal.classList.remove('hidden');
    },

    openNoteModal(note = null) {
        if (!note) return this.openNewNoteModal();
        
        this.currentEditingNoteId = note.id;
        this.fillNoteForm(note);
        document.getElementById('noteCreateArea')?.classList.remove('hidden');
    },

    fillNoteForm(note) {
        document.getElementById('new-note-title').value = note.title;
        document.getElementById('new-note-primary-tag').value = note.primaryTag;
        document.getElementById('new-note-content').value = note.content;
        document.getElementById('new-note-isUrgent').checked = note.isUrgent;
        document.getElementById('new-note-isCommentsClosed').checked = note.isCommentsClosed || false;

        const subTags = (note.tags || []).filter(t => t !== note.primaryTag);
        document.getElementById('new-note-sub-tags').value = subTags.join(', ');

        const visibilityRadio = document.querySelector(`input[name="visibility"][value="${note.visibility}"]`);
        if (visibilityRadio) visibilityRadio.checked = true;
        
        document.getElementById('selection-panel')?.classList.toggle('hidden', note.visibility !== 'group');

        document.getElementById('btn-publish-note').textContent = "GÜNCELLE";
        
        this.noteEditSession = {
            existingFiles: [...(note.files || [])],
            filesToDelete: []
        };
        
        // Entity'leri yükle
        this.selectedEntities = note.authorizedEntities || []; 
        this.renderSelectedEntities();
        this.refreshNoteEditFilePreview();
    },

    setupNoteCreateListeners() {
        const els = {
            close: document.getElementById('btn-close-note-create'),
            publish: document.getElementById('btn-publish-note'),
            fileInp: document.getElementById('note-file-input'),
            dropZone: document.getElementById('drop-zone-note'),
            subTagsInp: document.getElementById('new-note-sub-tags'),
            errorTags: document.getElementById('sub-tags-error'),
            visibilityRadios: document.querySelectorAll('input[name="visibility"]'),
            existingFilesContainer: document.getElementById('existing-files-list'),
            newFilesContainer: document.getElementById('new-files-preview')
        };

        // Görünürlük Paneli
        els.visibilityRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('selection-panel')?.classList.toggle('hidden', e.target.value !== 'group');
            });
        });

        els.close?.addEventListener('click', () => document.getElementById('noteCreateArea').classList.add('hidden'));

        // Dosya Seçimi
        els.dropZone?.addEventListener('click', () => els.fileInp.click());
        els.fileInp?.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files);
            this.filesToUploadForNote = [...this.filesToUploadForNote, ...newFiles];
            this.refreshNoteEditFilePreview();
            e.target.value = '';
        });

        // Mevcut Dosya Silme (Delegasyon)
        els.existingFilesContainer?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="remove-existing-note-file"]');
            if (btn) {
                const idx = parseInt(btn.dataset.index);
                const removed = this.noteEditSession.existingFiles.splice(idx, 1)[0];
                this.noteEditSession.filesToDelete.push(removed);
                this.refreshNoteEditFilePreview();
            }
        });

        // Yayınla/Güncelle
        els.publish?.addEventListener('click', async () => {
            await this.handleNotePublish(els.publish);
        });

        this.setupSearchListeners();
    },

    // --- YAYINLAMA MANTIĞI ---
    async handleNotePublish(btn) {
        const title = document.getElementById('new-note-title').value.trim();
        const primaryTag = document.getElementById('new-note-primary-tag').value;
        const subTagsRaw = document.getElementById('new-note-sub-tags').value;
        const content = document.getElementById('new-note-content').value.trim();
        const isUrgent = document.getElementById('new-note-isUrgent').checked;
        const isCommentsClosed = document.getElementById('new-note-isCommentsClosed').checked;
        const visibility = document.querySelector('input[name="visibility"]:checked').value;

        const subTags = subTagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "");

        if (!title || !primaryTag || !content) return alert("Zorunlu alanları doldurun!");

        try {
            btn.disabled = true;
            btn.textContent = "İŞLENİYOR...";

            // 1. Fiziksel Silme
            if (this.currentEditingNoteId && this.noteEditSession.filesToDelete.length > 0) {
                for (const file of this.noteEditSession.filesToDelete) {
                    await FirebaseService.deleteFile(file.path || file.url);
                }
            }

            // 2. Yeni Dosyalar
            const newMetadata = [];
            for (const file of this.filesToUploadForNote) {
                const meta = await FirebaseService.uploadFile(file);
                newMetadata.push(meta);
            }

            const finalFiles = [...this.noteEditSession.existingFiles, ...newMetadata];

            const noteData = {
                title,
                primaryTag,
                content,
                isUrgent,
                isCommentsClosed,
                visibility,
                authorizedEntities: this.selectedEntities, // Objeleri sakla (id + name)
                tags: [primaryTag, ...subTags],
                files: finalFiles
            };

            if (this.currentEditingNoteId) {
                await FirebaseService.updateNote(this.currentEditingNoteId, noteData);
            } else {
                await FirebaseService.addNote(noteData, auth.currentUser, newMetadata);
            }

            location.reload(); 
        } catch (error) {
            console.error(error);
            alert("İşlem başarısız.");
        } finally {
            btn.disabled = false;
            btn.textContent = "YAYINLA";
        }
    },

    // --- ARAMA SİSTEMİ ---
    setupSearchListeners() {
        const searchInput = document.getElementById('group-search-input');
        const resultsArea = document.getElementById('search-results');

        // Arama Sonucu Ekleme (Delegasyon)
        resultsArea?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="add-entity"]');
            if (btn) this.addEntity(btn.dataset.id, btn.dataset.name);
        });
    
        searchInput?.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            if (term.length < 2) return resultsArea.innerHTML = '';
            const results = await FirebaseService.searchUsersAndGroups(term);
            this.renderSearchResults(results);
        });

        // Pill silme işlemi için doğrudan konteyneri dinle
        document.getElementById('selected-entities')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="remove-entity"]');
            if (btn) {
                const id = btn.dataset.id;
                this.removeEntity(id);
            }
        });
        
    },

    renderSearchResults(results) {
        const resultsArea = document.getElementById('search-results');
        if (!resultsArea) return;
        
        if (results.length === 0) {
            resultsArea.innerHTML = '<span class="text-[10px] text-slate-400 italic px-2">Sonuç bulunamadı</span>';
            return;
        }
    
        resultsArea.innerHTML = results.map(item => `
                <button type="button" 
                    data-id="${item.id}" 
                    data-name="${item.displayName}"
                    data-type="${item.type}" 
                    data-action="add-entity"
                    class="...">
                    + ${item.displayName}
                </button>
            `).join('');
    },

    addEntity(id, name, type) {
        if (this.selectedEntities.find(e => e.id === id)) return;
        
        // Filtreleme fonksiyonu hem 'name' hem 'displayName' bakıyor ama biz 'name' olarak kaydedelim
        this.selectedEntities.push({ 
            id: id, 
            name: name, // Filtrelemede bakılan ana alan
            displayName: name, 
            type: type 
        });
        
        this.renderSelectedEntities();
        
        // Arama sonuçlarını temizle ve odaklan
        const resultsArea = document.getElementById('search-results');
        const input = document.getElementById('entity-search-input');
        if (resultsArea) resultsArea.innerHTML = '';
        if (input) {
            input.value = '';
            input.focus();
        }
    },

    removeEntity(id) {
        this.selectedEntities = this.selectedEntities.filter(e => e.id !== id);
        this.renderSelectedEntities();
    },

    // UIController.js içindeki renderSelectedEntities
    renderSelectedEntities() {
        const container = document.getElementById('selected-entities');
        if (!container) return;
    
        container.innerHTML = this.selectedEntities.map(entity => `
            <div class="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-sm">
                <span class="uppercase tracking-wider pointer-events-none">${entity.name}</span>
                <button type="button" 
                    data-id="${entity.id}" 
                    data-action="remove-entity" 
                    class="hover:bg-blue-800 w-5 h-5 flex items-center justify-center rounded-full transition-colors flex-shrink-0"
                    style="cursor: pointer;">
                    <span class="pointer-events-none">×</span>
                </button>
            </div>
        `).join('');
    },

    // --- DİĞER RENDER VE YARDIMCI METODLAR ---
    renderArticleDetail(data) {
        this.currentActiveNote = data; 
        const container = this.elements.articleSection;
        if (!container) return;
    
        container.innerHTML = Templates.ArticleDetail(data);
        this.setupDetailListeners(data);
        this.setTagPageState('hidden', false);

        if (this.activeSub) this.activeSub();
        this.activeSub = FirebaseService.subscribeToComments(data.id, (comments) => this.renderComments(comments));
    },

    renderArticleList(notes) {
        this.allArticles = notes;
        const container = this.elements.articleSection;
        if (!container) return;
    
        // 1. Listeyi HTML olarak bas
        container.innerHTML = Templates.ArticleList(notes);
    
        // 2. Tıklama olaylarını bağla
        container.querySelectorAll('.article-item').forEach(item => {
            item.addEventListener('click', () => {
                const noteId = item.dataset.id;
                console.log("Liste öğesi tıklandı:", noteId);
                this.openNote(noteId, notes);
            });
        });
    },

    refreshNoteEditFilePreview() {
        const existingList = document.getElementById('existing-files-list');
        const existingSection = document.getElementById('existing-files-section');
        const newFilesPreview = document.getElementById('new-files-preview');

        if (this.noteEditSession.existingFiles.length > 0) {
            existingSection?.classList.remove('hidden');
            existingList.innerHTML = this.noteEditSession.existingFiles.map((f, i) => Templates.EditFileRow(f, i)).join('');
        } else {
            existingSection?.classList.add('hidden');
        }

        if (newFilesPreview) {
            newFilesPreview.innerHTML = this.filesToUploadForNote.map((f, i) => Templates.SelectedFilePill(f, i)).join('');
        }
    },

    async handleNoteDelete(id) {
        if (!confirm("Bu başlığı silmek istediğinize emin misiniz?")) return;
        try {
            const filesToDelete = this.currentActiveNote?.files || [];
            await FirebaseService.deleteNoteWithAssets(id, filesToDelete);
            location.reload();
        } catch (error) {
            alert("Silme başarısız.");
        }
    },

// --- YORUM VE DETAY DİNLEYİCİLERİ ---
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
            this.renderWelcome();
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

    renderComments(comments) {
        const container = document.getElementById('comments-container');
        if (!container) return;
        this.currentComments = comments;

        if (comments.length === 0) {
            container.innerHTML = ''; //'<p class="text-center text-slate-400 text-xs uppercase tracking-widest pt-10 italic">Henüz yorum yapılmamış.</p>'; 
            return;
        }

        const currentUserId = auth.currentUser?.uid;
        container.innerHTML = comments.map(c => Templates.CommentItem(c, currentUserId)).join('');
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

    async handleSaveEdit(btn, id) {
        const input = document.getElementById(`edit-input-${id}`);
        const content = input?.value.trim();
        const session = this.editingSession;
        const originalComment = this.currentComments.find(c => c.id === id);
        const originalFiles = originalComment.files || [];

        try {
            btn.disabled = true;
            btn.textContent = "...";

            // 1. Fiziksel Silme
            const filesToDelete = originalFiles.filter(orig => 
                !session.existingFiles.find(ex => (ex.fullPath || ex.path) === (orig.fullPath || orig.path))
            );
            
            for (const file of filesToDelete) {
                await FirebaseService.deleteFile(file.fullPath || file.path);
            }

            // 2. Yeni Dosya Yükleme
            const newMetadata = [];
            for (const file of session.newFiles) {
                const meta = await FirebaseService.uploadFile(file);
                newMetadata.push(meta);
            }

            // 3. Güncelleme
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

    refreshEditPreview() {
        const session = this.editingSession;
        const container = document.getElementById(`edit-preview-${session.id}`);
        if (!container) return;

        container.innerHTML = [
            ...session.existingFiles.map((f, i) => Templates.EditFilePill(f, i, false)),
            ...session.newFiles.map((f, i) => Templates.EditFilePill(f, i, true))
        ].join('');
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

    // --- YARDIMCI GÖRÜNÜM METODLARI ---
    renderSelectedFilesPreview(files, container) {
        if (!container) return;
        container.innerHTML = files.map((f, i) => Templates.SelectedFilePill(f, i)).join('');
    },

    renderSidebarList(notes) {
        const list = this.elements.sidebarList;
        if (!list) return;
    
        // 1. Listeyi HTML olarak bas
        list.innerHTML = notes.map(n => Templates.SidebarItem(n)).join('');
    
        // 2. Tıklama olaylarını bağla
        list.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const noteId = link.dataset.id;
                console.log("Sidebar başlığı tıklandı:", noteId);
                this.openNote(noteId, notes);
            });
        });
    },

renderTagPool(filteredNotes = []) {
    const pool = document.querySelector('#tag-pool .flex-wrap');
    if (!pool) return;

    // Etiket frekanslarını (sayılarını) hesapla
    const tagCounts = {};
    filteredNotes.forEach(note => {
        note.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const entries = Object.entries(tagCounts);

    // HATA ÖNLEME: Eğer hiç etiket yoksa boş mesaj yaz ve çık
    if (entries.length === 0) {
        pool.innerHTML = '<span class="text-[10px] text-slate-400 uppercase font-black italic">Eşleşen etiket bulunamadı</span>';
        return;
    }

    // HTML oluşturma (Boyutlandırma mantığı dahil)
    pool.innerHTML = entries.map(([tag, count]) => {
        const isSelected = this.selectedTags.includes(tag);
        // Yazı boyutu: En az 0.7rem, en fazla 2rem olacak şekilde ölçekle
        const fontSize = Math.min(0.7 + (count * 0.15), 2); 
        
        return `
            <button data-tag="${tag}" 
                class="tag-item transition-all duration-300 px-4 py-2 rounded-full m-1 font-bold flex items-center gap-2
                ${isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-blue-200'}"
                style="font-size: ${fontSize}rem;">
                #${tag}
                ${isSelected ? '<span class="text-xs">×</span>' : `<span class="text-[10px] opacity-50">${count}</span>`}
            </button>
        `;
    }).join('');

    this.setupTagEvents();
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
        const savedLayout = localStorage.getItem('tagPoolPreference') || 'full';
        this.setTagPageState(savedLayout, false);
    },

    openNote(id, sourceArray) {
        const note = sourceArray.find(n => n.id === id);
        if (note) this.renderArticleDetail(note);
    }
};













