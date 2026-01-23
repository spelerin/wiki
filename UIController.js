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
    sidebarFilter: 'recent', // Varsayılan filtre
    quill: null, // Editör referansı burada duracak

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
            },
            sidebarFilters: {
                recent: document.getElementById('btn-filter-recent'),
                urgent: document.getElementById('btn-filter-urgent'),
                todo: document.getElementById('btn-filter-todo'),
                private: document.getElementById('btn-filter-private') // Yeni buton eklendi
            }
        };

        this.initModal();
        this.setupEventListeners();
        this.setupDelegatedActions();
        this.setupSidebarFilters(); // Filtreleri bağla
        this.loadInitialState();
        // YENİ: Görsel olarak "SON" butonunu aktif hale getirir
        this.refreshSidebarUI();
    },



// --- SOL BAR FİLTRELEME MANTIĞI ---
    setupSidebarFilters() {
        const filters = this.elements.sidebarFilters;
        
        Object.entries(filters).forEach(([type, btn]) => {
            if (!btn) return;
            btn.onclick = () => {
                this.sidebarFilter = type;
                this.refreshSidebarUI();
            };
        });
    },

refreshSidebarUI() {
        // Buton renklerini güncelle
        const { recent, urgent, todo, private: privateBtn } = this.elements.sidebarFilters;
        const activeClass = ['bg-blue-600', 'text-white', 'shadow-sm'];
        const inactiveClass = ['text-slate-500', 'hover:bg-slate-50'];

        // Hepsini temizle ve aktif olanı boya
        [recent, urgent, todo, privateBtn].forEach(btn => {
            btn?.classList.remove(...activeClass, ...inactiveClass);
        });

        const activeBtn = this.elements.sidebarFilters[this.sidebarFilter];
        activeBtn?.classList.add(...activeClass);
        
        [recent, urgent, todo, privateBtn].filter(b => b !== activeBtn).forEach(b => {
            b?.classList.add(...inactiveClass);
        });

        // Listeyi filtrele ve tekrar bas
        this.renderSidebarList(this.allArticles);
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

// 2. Etiket Havuzu Render (Boyutlandırma mantığını tamamen CSS'e bıraktık)
renderTagPool(filteredNotes = []) {
    const poolWrap = document.querySelector('#tag-pool .flex-wrap');
    if (!poolWrap) return;

    const currentLayout = document.getElementById('content-area')?.getAttribute('data-layout') || 'full';
    const searchTerm = document.getElementById('search-input')?.value.trim() || "";

    // Frekans Hesaplama
    const tagCounts = {};
    filteredNotes.forEach(note => {
        note.tags?.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
    });

    const entries = Object.entries(tagCounts);

    // Sadece şablonu al ve bas. CSS (data-layout) yüksekliği halledecek.
    poolWrap.innerHTML = Templates.TagPool(entries, currentLayout, this.selectedTags, searchTerm);

    this.setupTagEvents();
},

setupTagEvents() {
    // Etiket Tıklamaları
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

    // Temizle Butonu
    document.getElementById('clear-all-filters')?.addEventListener('click', () => {
        this.clearFilters();
    });
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
    

    // --- EVENT LISTENERS ---
    setupEventListeners() {
        const { searchInput, layoutBtns } = this.elements;
    
        searchInput?.addEventListener('input', () => {
            this.applyFilters();
        });


        document.getElementById('btn-logout')?.addEventListener('click', async () => {
            if (confirm("Oturumu kapatmak istediğinize emin misiniz?")) {
                try {
                    await auth.signOut();
                    location.reload(); // Sayfayı yenileyerek temiz bir başlangıç yapıyoruz
                } catch (error) {
                    console.error("Çıkış hatası:", error);
                    alert("Oturum kapatılırken bir hata oluştu.");
                }
            }
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

        // Quill'i Başlat
            this.quill = new Quill('#new-note-editor', {
                theme: 'snow',
                placeholder: 'Yazmaya başlayın veya Google Docs\'tan yapıştırın...',
                modules: {
                    toolbar: [
                        [{ 'header': [1, 2, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        ['link', 'clean'] // Tablo yapıştırma desteği default olarak aktiftir
                    ]
                }
            });
            
            this.setupNoteCreateListeners();
        }
    },

    // --- DELEGASYON SİSTEMİ ---
setupDelegatedActions() {
    // 1. TIKLAMA AKSIYONLARI (Click)
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const { id, action, index, type } = btn.dataset;
        
        // Hata ayıklama için: Hangi butona basıldığını konsola yazar
        console.log(`Aksiyon: ${action} | ID: ${id}`);

        switch (action) {
            case 'edit':
                // Hafızadaki yorumlarda ara
                const comment = this.currentComments.find(c => c.id === id);
                if (comment) {
                    this.editingSession = { 
                        id, 
                        existingFiles: [...(comment.files || [])], 
                        newFiles: [] 
                    };
                    this.renderEditMode(id);
                } else {
                    console.warn("Yorum verisi henüz hafızaya işlenmemiş, ID:", id);
                }
                break;

            case 'trigger-edit-file':
                document.getElementById(`edit-file-input-${id}`)?.click();
                break;

            case 'remove-file-edit':
                if (this.editingSession) {
                    if (type === 'existing') this.editingSession.existingFiles.splice(index, 1);
                    else this.editingSession.newFiles.splice(index, 1);
                    this.refreshEditPreview();
                }
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
                if (commentToDelete && confirm("Bu yorum silinsin mi?")) {
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

            case 'remove-entity':
                e.preventDefault();
                this.removeEntity(id);
                break;

            case 'remove-existing-note-file': {
                // index string olarak gelir, sayıya çeviriyoruz
                const idx = parseInt(index); 
                const fileToRemove = this.noteEditSession.existingFiles[idx];
            
                if (fileToRemove) {
                    // 1. Silinecekler listesine ekle
                    this.noteEditSession.filesToDelete.push(fileToRemove);
                    // 2. Mevcut listeden çıkar
                    this.noteEditSession.existingFiles.splice(idx, 1);
                    // 3. Önizlemeyi güncelle
                    this.refreshNoteEditFilePreview();
                    console.log("Dosya silme listesine alındı:", fileToRemove.name);
                }
                break;
            }
            
            case 'remove-selected-file': {
                const idx = parseInt(index);
                this.filesToUploadForNote.splice(idx, 1);
                this.refreshNoteEditFilePreview();
                break;
            }

                
        }
    });

    // Change olayı için de aynısını yapabiliriz (opsiyonel ama güvenlidir)
    document.addEventListener('change', (e) => {
        if (e.target.id?.startsWith('edit-file-input-') && this.editingSession) {
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

this.quill.root.innerHTML = note.content || ''; // Editöre HTML içeriği basar

        
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
        const content = this.quill.root.innerHTML;
        const isUrgent = document.getElementById('new-note-isUrgent').checked;
        const isCommentsClosed = document.getElementById('new-note-isCommentsClosed').checked;
        const visibility = document.querySelector('input[name="visibility"]:checked').value;

        const subTags = subTagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== "");
        if (!title || !primaryTag || !content) return alert("Zorunlu alanlar eksik!");
        
        if (content === '<p><br></p>') {
            return alert("İçerik boş olamaz!");
        }
        
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
// 3. Makale Detayını Açma (Girişte Layout'u Hidden yap)
renderArticleDetail(data) {
    this.currentActiveNote = data; 
    const container = this.elements.articleSection;
    if (!container) return;

    // CSS'deki [data-layout="hidden"] kuralını tetikle
    this.setTagPageState('hidden', false);

    container.innerHTML = Templates.ArticleDetail(data);
    this.setupDetailListeners(data);

    // Yorum aboneliği
    if (this.activeSub) this.activeSub();
    this.activeSub = FirebaseService.subscribeToComments(data.id, (comments) => this.renderComments(comments));
},

renderArticleList(notes) {
    const container = this.elements.articleSection;
    if (!container) return;

    const searchTerm = document.getElementById('search-input')?.value.trim() || "";

    // 1. Şablonu Templates üzerinden çağır (Temiz Veri Aktarımı)
    container.innerHTML = Templates.ArticleList(notes, searchTerm, this.selectedTags);

    // 2. Tıklama olaylarını bağla
    container.querySelectorAll('.article-item').forEach(item => {
        item.onclick = () => this.openNote(item.dataset.id, notes);
    });

    // 3. Filtre silme (x) butonlarını bağla
    container.querySelectorAll('button[data-action="remove-filter-tag"]').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            this.selectedTags = this.selectedTags.filter(t => t !== btn.dataset.tag);
            this.applyFilters();
        };
    });
},

renderSidebarList(notes) {
    const list = this.elements.sidebarList;
    if (!list) return;

    let filteredNotes = [...notes];

    if (this.sidebarFilter === 'urgent') {
        filteredNotes = notes.filter(n => n.isUrgent === true);
    } else if (this.sidebarFilter === 'todo') {
        filteredNotes = notes.filter(n => n.tags?.some(tag => tag.toLowerCase().includes('yapılacak')));
    } else if (this.sidebarFilter === 'private') {
        filteredNotes = notes.filter(n => n.visibility === 'private');
    } else {
        // 'recent' veya varsayılan durum
        filteredNotes = [...notes]; 
    }

        // 2. Maksimum 50 adet göster
        const limitedNotes = filteredNotes.slice(0, 50);

        // 3. Render Et
        list.innerHTML = limitedNotes.map(n => Templates.SidebarItem(n)).join('');

        // 4. Sayfalama Kontrolü (Eğer 50'den fazla varsa)
        if (filteredNotes.length > 50) {
            list.innerHTML += `
                <div class="p-4 text-center">
                    <button class="text-[10px] font-black text-blue-600 hover:underline uppercase tracking-widest">
                        DAHA FAZLA GÖSTER (Sayfa 2)
                    </button>
                </div>`;
        }

        // Tıklama olaylarını tekrar bağla
        list.querySelectorAll('.sidebar-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                this.openNote(link.dataset.id, notes);
                if (window.matchMedia("(orientation: portrait)").matches) {
                    this.toggleSidebar();
                }
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

    // 1. Layout Değiştirici (Artık sadece öznitelik atıyor)
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
    // 1. Ekran genişliğini kontrol et (768px altı mobildir)
    const isMobile = window.innerWidth < 768;

    // 2. Durumu belirle: Hafızada kayıt varsa onu al, yoksa cihaz tipine göre ata
    const savedStatus = localStorage.getItem('sidebarStatus');
    const initialStatus = savedStatus || (isMobile ? 'closed' : 'open');

    // 3. Durumu uygula
    document.body.setAttribute('data-sidebar', initialStatus);

    // 4. Etiket havuzu tercihini yükle (Mevcut mantığın)
    const savedLayout = localStorage.getItem('tagPoolPreference') || 'full';
    this.setTagPageState(savedLayout, false);
},
    

    openNote(id, sourceArray) {
        const note = sourceArray.find(n => n.id === id);
        if (note) this.renderArticleDetail(note);
    },

    // --- YORUM SİSTEMİ FONKSİYONLARI ---
    renderComments(comments) {
        this.currentComments = comments;
        const container = document.getElementById('comments-container');
        if (!container) return;
        if (comments.length === 0) { container.innerHTML = ''; return; }
        container.innerHTML = comments.map(c => Templates.CommentItem(c, auth.currentUser?.uid)).join('');
    },


// --- YORUM DÜZENLEME VE DOSYA YÖNETİMİ ---
    renderEditMode(id) {
        const comment = this.currentComments.find(c => c.id === id);
        const card = document.getElementById(`comment-${id}`);
        const contentDiv = card?.querySelector('.entry-content');
        
        if (contentDiv && comment) {
            // Templates içindeki düzenleme formunu basıyoruz
            contentDiv.innerHTML = Templates.CommentEditForm(comment);
            // Kartın altındaki orijinal aksiyon barını (Düzenle/Sil butonlarını) gizle
            card.querySelector('.comment-actions-bar')?.classList.add('hidden');
        }
    },

    async handleSaveEdit(btn, id) {
        const input = document.getElementById(`edit-input-${id}`);
        const content = input?.value.trim();
        const session = this.editingSession; // Mevcut düzenleme oturumu verileri
        
        const originalComment = this.currentComments.find(c => c.id === id);
        const originalFiles = originalComment?.files || [];

        try {
            btn.disabled = true;
            btn.textContent = "...";

            // 1. Silinecek Dosyalar: Orijinal listede olup session.existingFiles'da KALMAYANLAR
            const filesToDelete = originalFiles.filter(orig => 
                !session.existingFiles.find(ex => (ex.path || ex.url) === (orig.path || orig.url))
            );
            
            for (const file of filesToDelete) {
                await FirebaseService.deleteFile(file.path || file.url);
            }

            // 2. Yeni Dosyalar: Session.newFiles içindekileri Storage'a yükle
            const newMetadata = [];
            for (const file of session.newFiles) {
                const meta = await FirebaseService.uploadFile(file);
                newMetadata.push(meta);
            }

            // 3. Final Listesi: Kalan eski dosyalar + Yeni yüklenenler
            const finalFiles = [...session.existingFiles, ...newMetadata];

            // 4. Veritabanı Güncelleme
            await FirebaseService.updateComment(id, content, finalFiles);

            this.editingSession = null;
        } catch (error) {
            console.error("Güncelleme Hatası:", error);
            alert("Kaydedilirken bir hata oluştu.");
        } finally {
            btn.disabled = false;
            btn.textContent = "Kaydet";
        }
    },

    refreshEditPreview() {
        const session = this.editingSession;
        const container = document.getElementById(`edit-preview-${session.id}`);
        if (!container) return;

        // Düzenleme panelindeki dosya önizlemelerini tazele
        container.innerHTML = [
            ...session.existingFiles.map((f, i) => Templates.EditFilePill(f, i, false)),
            ...session.newFiles.map((f, i) => Templates.EditFilePill(f, i, true))
        ].join('');
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
            this.currentActiveNote = null; // Aktif notu sıfırla
            const searchTerm = document.getElementById('search-input')?.value.trim() || "";
            
            // Eğer filtre varsa 'third', yoksa 'full' moduna CSS üzerinden dön
            if (this.selectedTags.length > 0 || searchTerm !== "") {
                this.setTagPageState('third', false);
                this.applyFilters();
            } else {
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

























