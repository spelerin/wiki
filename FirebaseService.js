import { db } from './firebase-config.js';
import { 
    collection, doc, onSnapshot, getDoc, 
    query, where, orderBy, limit 
} from "firebase/firestore";

export const FirebaseService = {
    // 1. Etiket Havuzunu Dinle (settings/main_tags)
    subscribeToMainTags(callback) {
        const docRef = doc(db, "settings", "main_tags");
        return onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                callback(docSnap.data().tags || []);
            }
        });
    },

    // 2. Makaleleri Dinle (Son eklenen 20 not)
    subscribeToNotes(callback) {
        const q = query(
            collection(db, "notes"), 
            orderBy("createdAt", "desc"), 
            limit(20)
        );
        return onSnapshot(q, (snapshot) => {
            const notes = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Tarihi formatlıyoruz
                date: doc.data().createdAt?.toDate().toLocaleDateString('tr-TR') || ''
            }));
            callback(notes);
        });
    },

    // 3. Makaleye Ait Yorumları Dinle
    subscribeToComments(noteId, callback) {
        const q = query(
            collection(db, "comments"), 
            where("noteId", "==", noteId),
            orderBy("createdAt", "asc")
        );
        return onSnapshot(q, (snapshot) => {
            const comments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                fullTimestamp: doc.data().createdAt?.toDate().toLocaleString('tr-TR') || ''
            }));
            callback(comments);
        });
    }
};