// store.js
export const Store = {
    state: {
        allNotes: [],
        selectedTags: [],
        view: 'landing', // 'landing', 'list', 'detail'
        activeNoteId: null,
        currentUser: null
    },

    // State güncelleyen yardımcı fonksiyonlar
    setView(newView) {
        this.state.view = newView;
        UI.render(); // Her değişimde arayüzü tazele
    },

    setSelectedTags(tags) {
        this.state.selectedTags = tags;
        this.state.view = tags.length > 0 ? 'list' : 'landing';
        UI.render();
    }


dispatch(action, payload) {
    if (action === 'SET_SEARCH_QUERY') this.state.searchQuery = payload;
    if (action === 'ADD_FILTER') this.state.selectedTags.push(payload);
    if (action === 'REMOVE_FILTER') {
        this.state.selectedTags = this.state.selectedTags.filter(t => t !== payload);
    }

    // ZİNCİRLEME REAKSİYON:
    // 1. Veriyi filtrele
    const filteredNotes = FilterEngine.getFilteredNotes();
    
    // 2. Arayüzü güncelle
    UI.renderList(filteredNotes);
    UI.renderActiveFilterBar(this.state.selectedTags);
    TagUI.update(this.state); // Bulutun daralıp genişleme kararını TagUI versin
}


};