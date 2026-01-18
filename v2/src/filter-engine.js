// filter-engine.js
import { Store } from './store.js';

export const FilterEngine = {
    getFilteredNotes() {
        const { allNotes, currentUser } = Store.state;
        const role = currentUser?.role;

        return allNotes.filter(note => {
            // 1. KURAL: Admin her şeyi görür
            if (role === 'admin') return true;

            // 2. KURAL: Kendi yazdığı notları görür
            if (note.ownerId === currentUser.uid) return true;

            // 3. KURAL: Kişisel olarak yetkilendirildiği notlar
            const isAllowedUser = note.allowedUsers?.includes(currentUser.uid);

            // 4. KURAL: Grubuna/Departmanına açık olan notlar
            const isAllowedGroup = note.allowedUserGroups?.some(g => 
                currentUser.groups.includes(g)
            );

            return isAllowedUser || isAllowedGroup;
        });
    }
};