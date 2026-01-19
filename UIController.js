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
    },

    renderSearchResults(results) {
        const resultsArea = document.getElementById('search-results');
        if (!resultsArea) return;
        if (results.length === 0) return resultsArea.innerHTML = '<span class="text-xs p-2">Sonuç yok</span>';
    
        resultsArea.innerHTML = results.map(item => `
            <button type="button" data-id="${item.id}" data-name="${item.displayName}" data-action="add-entity"
                class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
                + ${item.displayName}
            </button>
        `).join('');
    },

    addEntity(id, name) {
        if (this.selectedEntities.find(e => e.id === id)) return;
        this.selectedEntities.push({ id, name });
        this.renderSelectedEntities();
        document.getElementById('group-search-input').value = '';
        document.getElementById('search-results').innerHTML = '';
    },

    removeEntity(id) {
        this.selectedEntities = this.selectedEntities.filter(e => e.id !== id);
        this.renderSelectedEntities();
    },

    renderSelectedEntities() {
        const container = document.getElementById('selected-entities');
        if (!container) return;
        container.innerHTML = this.selectedEntities.map(entity => `
            <div class="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                <span>${entity.name}</span>
                <button type="button" data-id="${entity.id}" data-action="remove-entity" class="hover:text-red-200 font-black">×</button>
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
        container.innerHTML = Templates.ArticleList(notes);
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

    // ... (renderComments, handleFileDownload, setupDetailListeners vb. kısımlar aynı yapıda devam eder)
};
