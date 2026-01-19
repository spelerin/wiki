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
    increment,
    limit,
    serverTimestamp,
    onSnapshot,
    query,
    where,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { ref, uploadBytes, getDownloadURL, getBlob } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { storage, db } from './firebase-config.js'; // storage'ı buradan aldığından emin ol


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

    // DOSYA YÜKLEME
    async uploadFile(file) {
        const fileName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `uploads/${fileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        return {
            name: file.name,
            path: snapshot.ref.fullPath,
            size: file.size
        };
    },

    // GÜVENLİ BLOB İNDİRME
    async downloadSecureFile(path) {
        const storageRef = ref(storage, path);
        // Dosyayı doğrudan veri (Blob) olarak çekiyoruz
        return await getBlob(storageRef);
    },

    

// Yorum Ekleme Fonksiyonu
async addComment(noteId, content, user) {
        try {
            // 1. Yorumu ekle
            const docRef = await addDoc(collection(db, "comments"), {
                noteId: noteId,
                content: content,
                ownerId: user.uid,
                ownerName: user.displayName || user.email.split('@')[0],
                createdAt: serverTimestamp(),
                updatedAt: null
            });

            // 2. Makalenin replyCount değerini 1 artır (SAYAÇ BURADA GÜNCELLENİR)
            const noteRef = doc(db, "notes", noteId);
            await updateDoc(noteRef, {
                replyCount: increment(1)
            });

            return docRef.id;
        } catch (error) {
            console.error("Hata:", error);
            throw error;
        }
    },

    async deleteComment(commentId, noteId) {
        try {
            // 1. Yorumu sil
            await deleteDoc(doc(db, "comments", commentId));

            // 2. Makalenin replyCount değerini 1 azalt
            const noteRef = doc(db, "notes", noteId);
            await updateDoc(noteRef, {
                replyCount: increment(-1)
            });
        } catch (error) {
            console.error("Hata:", error);
        }
    },

    // Yorum Güncelleme (updateDoc ve doc burada tanımlı olmalı)
    async updateComment(commentId, newContent) {
        const docRef = doc(db, "comments", commentId);
        return updateDoc(docRef, {
            content: newContent,
            updatedAt: serverTimestamp()
        });
    }  

};






