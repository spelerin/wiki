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
    currentActiveNote: null,
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

        this.initModal();
        this.setupEventListeners();
        this.setupDelegatedActions();
        this.loadInitialState();
    },

    // --- FİLTRELEME VE ETİKET HAVUZU MANTIĞI ---
applyFilters() {
    const articles = this.allArticles || [];
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput?.value.trim().toLowerCase() || "";
    
    const filtered = articles.filter(note => {
        const matchesTags = this.selectedTags.every(t => note.tags?.includes(t));
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) || 
                              note.content.toLowerCase().includes(searchTerm);
        return matchesTags && matchesSearch;
    });

    // LAYOUT YÖNETİMİ
    if (searchTerm.length > 0) {
        this.setTagPageState('hidden', false);
    } else if (this.selectedTags.length > 0) {
        // Eğer arama yok ama etiket seçiliyse listeyi göster (1/3 mod)
        this.setTagPageState('third', false);
    } else {
        // İkisi de boşsa ana ekrana (FULL) dön
        this.setTagPageState('full', false);
    }

    this.renderArticleList(filtered);
    this.renderTagPool(filtered);
},

renderTagPool(filteredNotes = []) {
    const pool = document.querySelector('#tag-pool .flex-wrap');
    if (!pool) return;

    const currentLayout = document.getElementById('content-area')?.getAttribute('data-layout');
    const searchTerm = document.getElementById('search-input')?.value.trim() || "";

    const tagCounts = {};
    filteredNotes.forEach(note => {
        note.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const entries = Object.entries(tagCounts);
    
    // 1. ÇOK KÜÇÜK SIFIRLA BUTONU
    const hasActiveFilter = this.selectedTags.length > 0 || searchTerm.length > 0;
    const clearBtn = hasActiveFilter ? `
        <button id="clear-all-filters" 
            class="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-tighter hover:bg-red-500 hover:text-white transition-all m-1 border border-slate-200">
            × TEMİZLE
        </button>
    ` : '';

    const colors = ['text-blue-600', 'text-slate-500', 'text-slate-800', 'text-slate-400', 'text-blue-400', 'text-slate-700'];

    const tagsHtml = entries.map(([tag, count], index) => {
        const isSelected = this.selectedTags.includes(tag);
        let styleClass = "";
        let inlineStyle = "";

        if (currentLayout === 'full') {
            const colorClass = colors[index % colors.length];
            const sizeBase = Math.min(0.75 + (count * 0.2), 2.5);
            const fontWeight = count > 3 ? 'font-black' : (count > 1 ? 'font-bold' : 'font-medium');
            styleClass = `${colorClass} ${fontWeight} hover:scale-105 transition-transform`;
            inlineStyle = `font-size: ${sizeBase}rem;`;
        } else {
            styleClass = isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-blue-200';
            inlineStyle = 'font-size: 11px; font-weight: 700;'; // 1/3 görünümünde sabit boy
        }

        return `
            <button data-tag="${tag}" 
                class="tag-item transition-all outline-none p-1 ${styleClass} ${isSelected && currentLayout === 'full' ? 'underline' : ''}"
                style="${inlineStyle}">
                #${tag}
            </button>
        `;
    }).join('');

    pool.innerHTML = clearBtn + tagsHtml;
    this.setupTagEvents();
},

    
// UI nesnesi içine yeni bir metod
clearFilters() {
    console.log("Filtreler sıfırlanıyor...");
    
    // 1. Değişkenleri sıfırla
    this.selectedTags = [];
    
    // 2. Arama kutusunu temizle
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';

    // 3. Layout'u FULL moda döndür (Çünkü ne arama var ne etiket)
    this.setTagPageState('full', true);

    // 4. Her şeyi tekrar hesapla ve render et
    this.applyFilters();
},
    

// setupTagEvents içine butonun dinleyicisini ekleyelim
setupTagEvents() {
    // Mevcut etiket tıklamaları
    document.querySelectorAll('.tag-item').forEach(btn => {
        btn.onclick = () => {
            const tag = btn.dataset.tag;
            if (this.selectedTags.includes(tag)) {
                this.selectedTags = this.selectedTags.filter(t => t !== tag);
            } else {
                this.selectedTags.push(tag);
            }
            this.applyFilters();
        };
    });

    // SIFIRLA BUTONU DİNLEYİCİSİ
    document.getElementById('clear-all-filters')?.addEventListener('click', () => {
        this.clearFilters();
    });
},

    // --- EVENT LISTENERS ---
    setupEventListeners() {
        const { searchInput, layoutBtns } = this.elements;
    
        searchInput?.addEventListener('input', () => {
            this.applyFilters();
        });
    
        // Sidebar gizle/göster
        layoutBtns.hideSide?.addEventListener('click', () => this.toggleSidebar());
    
        // Manuel layout butonları (İstersen bunları devre dışı bırakabilirsin ama kalsınlar)
        const layouts = { full: 'full', half: 'half', third: 'third', close: 'hidden' };
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

            switch (action) {
                case 'remove-entity':
                    e.preventDefault();
                    this.removeEntity(id);
                    break;
                case 'edit':
                    const comment = this.currentComments.find(c => c.id === id);
                    if (comment) {
                        this.editingSession = { id, existingFiles: [...(comment.files || [])], newFiles: [] };
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
                    if (commentToDelete && confirm("Yorum silinsin mi?")) {
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
            }
        });

        this.elements.appRoot?.addEventListener('change', (e) => {
            if (e.target.id?.startsWith('edit-file-input-')) {
                const newFiles = Array.from(e.target.files);
                this.editingSession.newFiles = [...this.editingSession.newFiles, ...newFiles];
                this.refreshEditPreview();
            }
        });
    },

    // --- MODAL YÖNETİMİ ---
    openNewNoteModal() {
        this.currentEditingNoteId = null;
        this.noteEditSession = { existingFiles: [], filesToDelete: [] };
        this.filesToUploadForNote = [];
        this.selectedEntities = [];

        const modal = document.getElementById('noteCreateArea');
        if (!modal) return;

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
        
        this.noteEditSession = { existingFiles: [...(note.files || [])], filesToDelete: [] };
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

        els.visibilityRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.getElementById('selection-panel')?.classList.toggle('hidden', e.target.value !== 'group');
            });
        });

        els.close?.addEventListener('click', () => document.getElementById('noteCreateArea').classList.add('hidden'));

        els.dropZone?.addEventListener('click', () => els.fileInp.click());
        els.fileInp?.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files);
            this.filesToUploadForNote = [...this.filesToUploadForNote, ...newFiles];
            this.refreshNoteEditFilePreview();
            e.target.value = '';
        });

        els.publish?.addEventListener('click', async () => await this.handleNotePublish(els.publish));
        this.setupSearchListeners();
    },

    // --- YAYINLAMA ---
    async handleNotePublish(btn) {
        const title = document.getElementById('new-note-title').value.trim();
        const primaryTag = document.getElementById('new-note-primary-tag').value;
        const subTagsRaw = document.getElementById('new-note-sub-tags').value;
        const content = document.getElementById('new-note-content').value.trim();
        const isUrgent = document.getElementById('new-note-isUrgent').checked;
        const isCommentsClosed = document.getElementById('new-note-isCommentsClosed').checked;
        const visibility = document.querySelector('input[name="visibility"]:checked').value;

        const subTags = subTagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "");
        if (!title || !primaryTag || !content) return alert("Zorunlu alanlar eksik!");

        try {
            btn.disabled = true;
            btn.textContent = "İŞLENİYOR...";

            if (this.currentEditingNoteId && this.noteEditSession.filesToDelete.length > 0) {
                for (const file of this.noteEditSession.filesToDelete) {
                    await FirebaseService.deleteFile(file.path || file.url);
                }
            }

            const newMetadata = [];
            for (const file of this.filesToUploadForNote) {
                const meta = await FirebaseService.uploadFile(file);
                newMetadata.push(meta);
            }

            const finalFiles = [...this.noteEditSession.existingFiles, ...newMetadata];

            const noteData = {
                title, primaryTag, content, isUrgent, isCommentsClosed, visibility,
                authorizedEntities: this.selectedEntities,
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
            alert("Hata oluştu.");
        } finally {
            btn.disabled = false;
        }
    },

    // --- ARAMA SİSTEMİ ---
    setupSearchListeners() {
        const searchInput = document.getElementById('group-search-input');
        const resultsArea = document.getElementById('search-results');

        resultsArea?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="add-entity"]');
            if (btn) this.addEntity(btn.dataset.id, btn.dataset.name, btn.dataset.type);
        });
    
        searchInput?.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            if (term.length < 2) return resultsArea.innerHTML = '';
            const results = await FirebaseService.searchUsersAndGroups(term);
            this.renderSearchResults(results);
        });

        document.getElementById('selected-entities')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="remove-entity"]');
            if (btn) this.removeEntity(btn.dataset.id);
        });
    },

    renderSearchResults(results) {
        const resultsArea = document.getElementById('search-results');
        if (!resultsArea) return;
        resultsArea.innerHTML = results.map(item => `
            <button type="button" data-id="${item.id}" data-name="${item.displayName}" data-type="${item.type}" data-action="add-entity"
                class="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs hover:bg-blue-600 hover:text-white transition-all m-1">
                + ${item.displayName}
            </button>
        `).join('');
    },

    addEntity(id, name, type) {
        if (this.selectedEntities.find(e => e.id === id)) return;
        this.selectedEntities.push({ id, name, type });
        this.renderSelectedEntities();
    },

    removeEntity(id) {
        this.selectedEntities = this.selectedEntities.filter(e => e.id !== id);
        this.renderSelectedEntities();
    },

    renderSelectedEntities() {
        const container = document.getElementById('selected-entities');
        if (!container) return;
        container.innerHTML = this.selectedEntities.map(entity => `
            <div class="flex items-center gap-2 bg-blue-600 text-white px-2 py-1 rounded-full text-[10px] m-1">
                <span>${entity.name}</span>
                <button type="button" data-id="${entity.id}" data-action="remove-entity" class="font-black">×</button>
            </div>
        `).join('');
    },

    // --- GENEL RENDER ---
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
    const container = this.elements.articleSection;
    if (!container) return;

    const searchTerm = document.getElementById('search-input')?.value.trim().toLowerCase() || "";

    container.innerHTML = notes.map(note => {
        let snippet = "";
        
        if (searchTerm && note.content) {
            const contentLower = note.content.toLowerCase();
            const index = contentLower.indexOf(searchTerm);
            
            if (index !== -1) {
                const start = Math.max(0, index - 30);
                const end = Math.min(note.content.length, index + 50);
                snippet = `<p class="text-[10px] text-slate-400 mt-1 leading-tight italic">
                    ...${note.content.substring(start, end).replace(new RegExp(searchTerm, 'gi'), (m) => `<b class="text-blue-600">${m}</b>`)}...
                </p>`;
            }
        }

        return `
            <div class="article-item group cursor-pointer p-4 border-b border-slate-50 hover:bg-blue-50/30 transition-all" data-id="${note.id}">
                <div class="flex justify-between items-start">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-[13px] font-black text-slate-700 uppercase tracking-tight group-hover:text-blue-600 transition-colors">${note.title}</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${note.primaryTag}</span>
                        ${snippet}
                    </div>
                    <span class="text-[10px] font-bold text-slate-300">#${note.tags?.length || 0}</span>
                </div>
            </div>
        `;
    }).join('');

    // Tıklama olaylarını tekrar bağla
    container.querySelectorAll('.article-item').forEach(item => {
        item.onclick = () => this.openNote(item.dataset.id, notes);
    });
},

    renderSidebarList(notes) {
        const list = this.elements.sidebarList;
        if (!list) return;
        list.innerHTML = notes.map(n => Templates.SidebarItem(n)).join('');
        list.querySelectorAll('.sidebar-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                this.openNote(link.dataset.id, notes);
            };
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
        if (!confirm("Silinsin mi?")) return;
        await FirebaseService.deleteNoteWithAssets(id, this.currentActiveNote?.files || []);
        location.reload();
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
    },

    // --- YORUM SİSTEMİ FONKSİYONLARI ---
    renderComments(comments) {
        const container = document.getElementById('comments-container');
        if (!container) return;
        this.currentComments = comments;
        if (comments.length === 0) { container.innerHTML = ''; return; }
        container.innerHTML = comments.map(c => Templates.CommentItem(c, auth.currentUser?.uid)).join('');
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

        // Detay sayfasını kapatıp listeye dönme
        els.close?.addEventListener('click', () => {
            const searchTerm = document.getElementById('search-input')?.value.trim() || "";
            
            if (this.selectedTags.length > 0 || searchTerm !== "") {
                // Eğer bir filtre varsa, hoş geldiniz yerine listeyi göster
                this.applyFilters();
            } else {
                // Filtre yoksa ana ekrana dön
                this.setTagPageState('full', false);
                this.renderWelcome();
            }
        });

        // Yorum alanını aç/kapat
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

        // Dosya seçme işlemi
        els.fileTrig?.addEventListener('click', () => els.fileInp?.click());

        els.fileInp?.addEventListener('change', (e) => {
            const newFiles = Array.from(e.target.files);
            filesToUpload = [...filesToUpload, ...newFiles];
            this.renderSelectedFilesPreview(filesToUpload, els.preview);
            els.fileInp.value = "";
        });

        // YORUM KAYDETME
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

        // Yüklenmek üzere seçilen dosyayı listeden çıkarma
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


    // --- TEMEL GÖRÜNÜM VE BAŞLANGIÇ METODLARI ---

    renderWelcome() {
        const container = this.elements.articleSection;
        if (container) {
            container.innerHTML = Templates.WelcomeView();
            console.log("Hoş geldiniz ekranı yüklendi.");
        }
    },

    setTagPageState(state, save = true) {
        const contentArea = document.getElementById('content-area');
        if (contentArea) {
            contentArea.setAttribute('data-layout', state);
            if (save) localStorage.setItem('tagPoolPreference', state);
        }
    },

    toggleSidebar() {
        const current = document.body.getAttribute('data-sidebar') || 'open';
        const next = current === 'open' ? 'closed' : 'open';
        document.body.setAttribute('data-sidebar', next);
        localStorage.setItem('sidebarStatus', next);
    },

    loadInitialState() {
        // Sidebar durumunu yükle
        const savedSidebar = localStorage.getItem('sidebarStatus') || 'open';
        document.body.setAttribute('data-sidebar', savedSidebar);

        // Etiket havuzu düzenini yükle
        const savedLayout = localStorage.getItem('tagPoolPreference') || 'full';
        this.setTagPageState(savedLayout, false);
    },

    openNote(id, sourceArray) {
        const note = sourceArray.find(n => n.id === id);
        if (note) {
            this.renderArticleDetail(note);
        } else {
            console.error("Not bulunamadı:", id);
        }
    }
    
};





