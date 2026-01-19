import { Templates } from './Templates.js';
import { auth } from './firebase-config.js';
import { FirebaseService } from './FirebaseService.js';

export const UI = {
    elements: {},
    allArticles: [],
    currentComments: [],
    activeSub: null,
    editingSession: null, // O an düzenlenen yorumun dosya durumunu tutar
    noteEditSession: {
        existingFiles: [],
        filesToDelete: []
    },
    selectedEntities: [], // Seçilen kişi/grupların ID'lerini tutar

    
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

        const modalRoot = document.getElementById('modal-root');
            if (modalRoot) {
                // 1. Modalı HTML'e bas
                modalRoot.innerHTML = Templates.NoteCreateModal();
                
                // 2. KRİTİK ADIM: Butonlara görevlerini (click, change vb.) şimdi ata
                this.setupNoteCreateListeners();
                console.log("Modal dinleyicileri başarıyla bağlandı.");
            }
        
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

                case 'edit-main-article':
                    console.log("Ana makale düzenleme tetiklendi, ID:", id);
                    
                    // 1. Önce genel listeden ara
                    let noteToEdit = this.allArticles.find(n => n.id === id);
                    
                    // 2. Eğer listede yoksa (örneğin sayfa yenilendi ve sadece detay açık kaldıysa)
                    // Firestore'dan o an çekilen aktif veriyi kullanabiliriz.
                    if (!noteToEdit) {
                        // currentArticleData gibi bir değişkende o anki detayı tutuyorsan onu kullan
                        // Veya daha basitçe, renderArticleDetail'e giren veriyi saklayalım
                        noteToEdit = this.currentActiveNote; 
                    }
                
                    if (noteToEdit) {
                        this.openNoteModal(noteToEdit);
                    } else {
                        console.error("Düzenlenecek makale hafızada bulunamadı! allArticles uzunluğu:", this.allArticles.length);
                        alert("Makale verisi yüklenemedi, lütfen sayfayı yenileyip tekrar deneyin.");
                    }
                break;

                case 'delete-main-article':
                    console.log("Ana makale silme tetiklendi, ID:", id);
                    // UI içindeki handleNoteDelete metodunu çağırıyoruz
                    await this.handleNoteDelete(id);
                    break;

                case 'add-new-note': // Sağ üstteki butonun data-action değeri
                    console.log("Yeni yazı ekleme başlatıldı");
                    this.openNewNoteModal();
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

openNewNoteModal() {
    // 1. Düzenleme modunda olmadığımızı belirtmek için ID'yi sıfırla
    this.currentEditingNoteId = null;
    this.noteEditSession = { existingFiles: [], filesToDelete: [] };
    this.filesToUploadForNote = [];
    const modal = document.getElementById('noteCreateArea');

    // 2. Formdaki tüm inputları temizle
    const titleInp = document.getElementById('new-note-title');
    const primaryTagInp = document.getElementById('new-note-primary-tag');
    const subTagsInp = document.getElementById('new-note-sub-tags');
    const contentInp = document.getElementById('new-note-content');
    const isUrgentInp = document.getElementById('new-note-isUrgent');
    const isCommentsClosedInp = document.getElementById('new-note-isCommentsClosed');

    
    if (titleInp) titleInp.value = '';
    if (primaryTagInp) primaryTagInp.value = '';
    if (subTagsInp) subTagsInp.value = '';
    if (contentInp) contentInp.value = '';
    if (isUrgentInp) isUrgentInp.checked = false;
    if (isCommentsClosedInp) isCommentsClosedInp.checked = false;

    // 3. Görünürlüğü varsayılan yap (Şirket Geneli)
    const publicRadio = document.querySelector('input[name="visibility"][value="public"]');
    if (publicRadio) publicRadio.checked = true;
    document.getElementById('selection-panel')?.classList.add('hidden');

    // 4. Dosya önizlemelerini temizle
    this.refreshNoteEditFilePreview();
    
    // 5. Modalı göster
    if (modal) {
        modal.classList.remove('hidden');
        console.log("Yeni yazı modalı başarıyla açıldı.");
    } else {
        console.error("HATA: 'noteCreateArea' ID'li modal bulunamadı! Templates.NoteCreateModal'ın render edildiğinden emin olun.");
        // Alternatif olarak burada zorla render edebilirsin:
        // document.getElementById('modal-root').innerHTML = Templates.NoteCreateModal();
        // document.getElementById('noteCreateArea').classList.remove('hidden');
    }

    document.getElementById('existing-files-section')?.classList.add('hidden');
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
    
    // Aktif makaleyi hafızaya al
        this.currentActiveNote = data; 
        
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
    currentEditingNoteId: null, // Düzenlenen notun ID'sini burada tutacağız


openNoteModal(note = null) {
    const modalRoot = document.getElementById('modal-root'); // Index.html'de bu div olmalı
    if (!modalRoot) return console.error("modal-root bulunamadı!");

    // 1. Modalı şablondan oluştur ve bas
    modalRoot.innerHTML = Templates.NoteCreateModal();
    
    const modal = document.getElementById('noteCreateArea');
    modal.classList.remove('hidden'); // Görünür yap
    
    // 2. Eğer note geldiyse düzenleme modudur, formu doldur
    if (note) {
        this.currentEditingNoteId = note.id;
        this.fillNoteForm(note);
    } else {
        this.currentEditingNoteId = null;
    }

    // 3. Modal içindeki butonları canlandır (Kapat, Yayınla vb.)
    this.setupNoteCreateListeners();
},

fillNoteForm(note) {
    // Form elemanlarını tek tek doldur
    document.getElementById('new-note-title').value = note.title;
    document.getElementById('new-note-primary-tag').value = note.primaryTag;
    document.getElementById('new-note-content').value = note.content;
    document.getElementById('new-note-isUrgent').checked = note.isUrgent;
    
    const subTags = note.tags.filter(t => t !== note.primaryTag);
    document.getElementById('new-note-sub-tags').value = subTags.join(', ');

    // Başlık ve butonu güncelle
    document.getElementById('btn-publish-note').textContent = "GÜNCELLE";
    document.querySelector('#noteCreateArea h1').textContent = "Başlığı Düzenle";
    this.noteEditSession = {
            existingFiles: [...(note.files || [])],
            filesToDelete: [] // Fiziksel olarak silinecek dosyaların listesi
        };

    this.refreshNoteEditFilePreview();
},

    
// Edit modundaki dosya listesini tazeler
refreshNoteEditFilePreview() {
    const existingList = document.getElementById('existing-files-list');
    const existingSection = document.getElementById('existing-files-section');
    const newFilesPreview = document.getElementById('new-files-preview');

    // 1. Mevcut Dosyaları Göster/Gizle
    if (this.noteEditSession.existingFiles.length > 0) {
        existingSection?.classList.remove('hidden');
        existingList.innerHTML = this.noteEditSession.existingFiles.map((f, i) => 
            Templates.EditFileRow(f, i)
        ).join('');
    } else {
        existingSection?.classList.add('hidden');
    }

    // 2. Yeni Seçilen (henüz yüklenmemiş) dosyaları göster
    if (newFilesPreview) {
        newFilesPreview.innerHTML = this.filesToUploadForNote.map((f, i) => 
            Templates.SelectedFilePill(f, i) // Mavi/Küçük pill şablonun
        ).join('');
    }
},
    
    
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
        errorTags: document.getElementById('sub-tags-error'),
        visibilityRadios: document.querySelectorAll('input[name="visibility"]'),
        selectionPanel: document.getElementById('selection-panel'),
        existingFilesContainer: document.getElementById('existing-files-list'),
        newFilesContainer: document.getElementById('new-files-preview'),
        publishBtn: document.getElementById('btn-publish-note')        
    };

    els.publishBtn?.addEventListener('click', async () => {
        console.log("Yayınla butonuna basıldı!"); // Konsolda bunu görmelisin
        await this.handleNotePublish(publishBtn);
    });

    
    // Görünürlük Paneli Geçişi
    els.visibilityRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            els.selectionPanel.classList.toggle('hidden', e.target.value !== 'group');
        });
    });

    // Kapatma
    els.close?.addEventListener('click', () => {
        document.getElementById('noteCreateArea').classList.add('hidden');
        this.filesToUploadForNote = [];
        this.noteEditSession = { existingFiles: [], filesToDelete: [] };
    });

    // Etiket Doğrulama
    els.subTagsInp?.addEventListener('input', (e) => {
        const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t !== "");
        const hasError = tags.some(tag => tag.split(' ').length > 2);
        els.errorTags?.classList.toggle('hidden', !hasError);
    });

    // --- DOSYA İŞLEMLERİ ---

    // 1. Dosya Seçme Tetikleyici
    els.dropZone?.addEventListener('click', () => els.fileInp.click());

    // 2. Yeni Dosya Seçildiğinde
    els.fileInp?.addEventListener('change', (e) => {
        const newFiles = Array.from(e.target.files);
        this.filesToUploadForNote = [...this.filesToUploadForNote, ...newFiles];
        this.refreshNoteEditFilePreview(); // Ekranı tazele
        e.target.value = ''; // Aynı dosyayı tekrar seçebilmek için reset
    });

    // 3. MEVCUT Dosyaları Silme (Üstteki Liste)
    els.existingFilesContainer?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="remove-existing-note-file"]');
        if (!btn) return;
        e.stopPropagation();

        const idx = parseInt(btn.dataset.index);
        const removedFile = this.noteEditSession.existingFiles.splice(idx, 1)[0];
        this.noteEditSession.filesToDelete.push(removedFile);
        
        this.refreshNoteEditFilePreview();
    });

    // 4. YENİ Seçilen Dosyaları Silme (Alttaki Drop-Zone içi)
    els.newFilesContainer?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action="remove-selected-file"]');
        if (!btn) return;
        e.stopPropagation();

        const idx = parseInt(btn.dataset.index);
        this.filesToUploadForNote.splice(idx, 1);
        
        this.refreshNoteEditFilePreview();
    });

    // 5. YAYINLA / GÜNCELLE
    els.publish?.addEventListener('click', async () => {
        await this.handleNotePublish(els.publish);
    });

    this.setupSearchListeners();
},

    
async handleNotePublish(btn) {
    const title = document.getElementById('new-note-title').value.trim();
    const primaryTag = document.getElementById('new-note-primary-tag').value;
    const subTagsRaw = document.getElementById('new-note-sub-tags').value;
    const content = document.getElementById('new-note-content').value.trim();
    const isUrgent = document.getElementById('new-note-isUrgent').checked;
    const isCommentsClosed = document.getElementById('new-note-isCommentsClosed').checked;
    const visibility = document.querySelector('input[name="visibility"]:checked').value;

    const subTags = subTagsRaw
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t !== "");

    if (!title || !primaryTag || !content) return alert("Lütfen zorunlu alanları doldurun!");

    try {
        btn.disabled = true;
        btn.textContent = "İŞLENİYOR...";

        // 1. ÖNCE FİZİKSEL SİLME (Düzenleme modundaysak ve silinecek dosya varsa)
        if (this.currentEditingNoteId && this.noteEditSession.filesToDelete.length > 0) {
            console.log("Storage temizliği başlatılıyor...");
            const deletePromises = this.noteEditSession.filesToDelete.map(file => {
                // fullPath en garanti yoldur, yoksa path veya url dene
                const pathToDelete = file.fullPath || file.path || file.url;
                return FirebaseService.deleteFile(pathToDelete);
            });
            await Promise.all(deletePromises);
            console.log("Fiziksel dosyalar Storage'dan temizlendi.");
        }

        // 2. YENİ DOSYALARI YÜKLE
        const newUploadedMetadata = [];
        for (const file of this.filesToUploadForNote) {
            const meta = await FirebaseService.uploadFile(file);
            newUploadedMetadata.push(meta);
        }

        // 3. DOSYA LİSTELERİNİ HARMANLA
        const currentFiles = this.currentEditingNoteId 
            ? (this.noteEditSession.existingFiles || []) 
            : [];
            
        const finalFiles = [...currentFiles, ...newUploadedMetadata];

        const noteData = {
            title,
            primaryTag,
            content,
            isUrgent,
            isCommentsClosed,
            visibility,
            authorizedEntities: this.selectedEntities.map(e => e.id), // Sadece ID listesi
            tags: [primaryTag, ...subTags],
            files: finalFiles
        };

        // 4. VERİTABANI KAYIT/GÜNCELLEME
        if (this.currentEditingNoteId) {
            await FirebaseService.updateNote(this.currentEditingNoteId, noteData);
            alert("Başlık başarıyla güncellendi!");
        } else {
            await FirebaseService.addNote(noteData, auth.currentUser, newUploadedMetadata);
            alert("Yeni başlık oluşturuldu!");
        }

        // State temizliği ve yönlendirme
        this.filesToUploadForNote = [];
        this.noteEditSession = { existingFiles: [], filesToDelete: [] };
        location.reload(); 

    } catch (error) {
        console.error("Yayınlama sırasında kritik hata:", error);
        alert("İşlem sırasında hata: " + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = "YAYINLA";
    }
},


async handleNoteDelete(id) {
    // 1. Kullanıcıdan onay al
    if (!confirm("Bu başlığı ve içindeki tüm dosyaları/yorumları silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;

    try {
        // 2. Silinecek dosyaları hazırla (aktif makaleden al)
        const filesToDelete = this.currentActiveNote?.files || [];
        
        // 3. Firebase temizliğini başlat
        await FirebaseService.deleteNoteWithAssets(id, filesToDelete);
        
        alert("Başlık ve tüm içerikler başarıyla silindi.");
        
        // 4. Kullanıcıyı ana listeye döndür
        const originalState = localStorage.getItem('tagPoolPreference') || 'full';
        this.setTagPageState(originalState, false);
        this.renderArticleList(this.allArticles.filter(n => n.id !== id)); // Listeden çıkar
        this.renderWelcome(); // Hoşgeldiniz ekranına dön
        
    } catch (error) {
        console.error("Silme hatası:", error);
        alert("Silme işlemi başarısız oldu: " + error.message);
    }
},

setupSearchListeners() {
        const searchInput = document.getElementById('group-search-input');
        const resultsArea = document.getElementById('search-results');

        document.getElementById('search-results')?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="add-entity"]');
            if (!btn) return;
            
            const { id, name } = btn.dataset;
            this.addEntity(id, name);
        });
    
        searchInput?.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            if (term.length < 2) {
                resultsArea.innerHTML = '';
                return;
            }

            const results = await FirebaseService.searchUsersAndGroups(term);
            this.renderSearchResults(results);
        });
    },

    renderSearchResults(results) {
        const resultsArea = document.getElementById('search-results');
        if (results.length === 0) {
            resultsArea.innerHTML = '<span class="text-[10px] text-slate-400 italic px-2">Sonuç bulunamadı</span>';
            return;
        }
    
        resultsArea.innerHTML = results.map(item => `
            <button type="button" 
                data-id="${item.id}" 
                data-name="${item.displayName}"
                data-action="add-entity"
                class="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-all">
                + ${item.displayName}
            </button>
        `).join('');
    },

    addEntity(id, name) {
        if (this.selectedEntities.find(e => e.id === id)) return; // Zaten ekliyse ekleme

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
        container.innerHTML = this.selectedEntities.map(entity => `
            <div class="flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-bold animate-in zoom-in duration-200">
                <span>${entity.name}</span>
                <button type="button" onclick="UI.removeEntity('${entity.id}')" class="hover:text-red-200">×</button>
            </div>
        `).join('');
    }    
};












