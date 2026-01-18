// actions.js
import { Store } from './store.js';
import { UI } from './ui-controller.js';
import { FormController } from './create-note-controller.js';

export const Actions = {
    // Detay Sayfasını Aç
    showNoteDetail: (noteId) => {
        const note = Store.state.allNotes.find(n => n.id === noteId);
        Store.state.isNoteDetailOpen = true;
        Store.state.activeNoteId = noteId;
        
        UI.showDetail(note, Store.state.currentUser.uid);
    },

    // Filtre Ekle/Kaldır
    addFilter: (tag) => {
        if (!Store.state.selectedTags.includes(tag)) {
            Store.state.selectedTags.push(tag);
            UI.render(); // Store üzerinden otomatik tetiklenebilir
        }
    },

    removeFilter: (tag) => {
        Store.state.selectedTags = Store.state.selectedTags.filter(t => t !== tag);
        UI.render();
    }
};

// ESKİ ONCLICK YAPILARI İÇİN GLOBAL BINDING
window.showNoteDetail = Actions.showNoteDetail;
window.openNoteCreate = () => FormController.init();
window.addTagFilter = Actions.addFilter; // Etiket bulutuna tıklandığında
window.removeTagFilter = Actions.removeFilter; // Header'daki x butonuna tıklandığında