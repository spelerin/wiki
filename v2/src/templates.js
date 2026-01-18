// templates.js
export const Templates = {
    noteDetail: (note, currentUser) => {
        // Düzenleme yetkisi var mı? (Sahibi mi yoksa Admin mi?)
        const canEdit = note.ownerId === currentUser.uid || currentUser.role === 'admin';
        
        return `
            <div class="header">
                <h1>${note.title}</h1>
                ${canEdit ? `
                    <button onclick="Actions.editNote('${note.id}')" class="edit-btn">
                        Düzenle
                    </button>
                ` : ''}
            </div>
            `;
    }
};