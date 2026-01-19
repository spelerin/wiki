// FirebaseService.js

// Firebase Firestore fonksiyonlarını CDN üzerinden import ediyoruz
import { 
    getFirestore, 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc,
    getDoc,
    limit,
    serverTimestamp,
    onSnapshot,
    query,
    where,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from './firebase-config.js'; // firebase-config dosyasındaki 'db' nesnesini alıyoruz


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
    },

// Yorum Ekleme Fonksiyonu
    async addComment(noteId, content, user) {
        try {
            // addDoc, collection ve serverTimestamp burada tanımlı olmalı
            const docRef = await addDoc(collection(db, "comments"), {
                noteId: noteId,
                content: content,
                ownerId: user.uid,
                ownerName: user.displayName || user.email.split('@')[0],
                createdAt: serverTimestamp(),
                updatedAt: null,
                files: []
            });
            return docRef.id;
        } catch (error) {
            console.error("Yorum ekleme hatası:", error);
            throw error;
        }
    },

    // Yorum Güncelleme (updateDoc ve doc burada tanımlı olmalı)
    async updateComment(commentId, newContent) {
        const docRef = doc(db, "comments", commentId);
        return updateDoc(docRef, {
            content: newContent,
            updatedAt: serverTimestamp()
        });
    },

    // Yorum Silme (deleteDoc ve doc burada tanımlı olmalı)
    async deleteComment(commentId) {
        const docRef = doc(db, "comments", commentId);
        return deleteDoc(docRef);
    }    

};



