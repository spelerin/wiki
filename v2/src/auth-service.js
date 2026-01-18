// auth-service.js
import { db, auth } from './firebase-config.js';
import { doc, getDoc } from "firebase-firestore";
import { Store } from './store.js';

export const AuthService = {
    async syncUserProfile(user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Merkezi depoya yetki bilgilerini yaz
            Store.state.currentUser = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'reader', // Varsayılan yetki
                groups: userData.groups || []   // Dahil olduğu departmanlar
            };
        }
    }
};