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
    getDocs,
    increment,
    limit,
    serverTimestamp,
    onSnapshot,
    query,
    where,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { ref, uploadBytes, getDownloadURL, getBlob, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
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
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `uploads/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            
            return {
                name: file.name,
                path: snapshot.ref.fullPath,
                size: file.size
            };
        } catch (error) {
            console.error("Storage yükleme hatası:", error);
            throw error;
        }
    },

    async addNote(noteData, user, files = []) {
    try {
        const docRef = await addDoc(collection(db, "notes"), {
            ...noteData,
            ownerId: user.uid,
            ownerName: user.displayName || user.email.split('@')[0],
            createdAt: serverTimestamp(),
            updatedAt: null,
            files: files,
            replyCount: 0,
            viewCount: 0
        });
        return docRef.id;
    } catch (error) {
        console.error("Not ekleme hatası:", error);
        throw error;
    }
},

// Yorum Ekleme Fonksiyonu
async addComment(noteId, content, user, files = []) { // files parametresini ekledik
    try {
        const docRef = await addDoc(collection(db, "comments"), {
            noteId: noteId,
            content: content,
            ownerId: user.uid,
            ownerName: user.displayName || user.email.split('@')[0],
            createdAt: serverTimestamp(),
            updatedAt: null,
            files: files // UI'dan gelen dizi buraya yazılır
        });

        // Sayaç güncelleme
        const noteRef = doc(db, "notes", noteId);
        await updateDoc(noteRef, { replyCount: increment(1) });

        return docRef.id;
    } catch (error) {
        console.error("Yorum eklenirken hata oluştu:", error);
        throw error;
    }
},

// FİZİKSEL DOSYA SİLME
    async deleteFile(path) {
        if (!path) return;
        try {
            const fileRef = ref(storage, path);
            await deleteObject(fileRef);
            console.log("Fiziksel dosya silindi:", path);
        } catch (error) {
            console.error("Storage silme hatası:", error);
            // Dosya zaten yoksa hata vermemesi için sessizce geçebiliriz
        }
    },

    // YORUM SİLİNDİĞİNDE TÜM DOSYALARI DA SİL
    async deleteComment(commentId, noteId, files = []) {
        try {
            // 1. Önce fiziksel dosyaları sil
            for (const file of files) {
                await this.deleteFile(file.path);
            }

            // 2. Yorumu Firestore'dan sil
            await deleteDoc(doc(db, "comments", commentId));

            // 3. Sayaç düşür
            const noteRef = doc(db, "notes", noteId);
            await updateDoc(noteRef, { replyCount: increment(-1) });
        } catch (error) {
            console.error("Yorum silme hatası:", error);
        }
    },

    // Yorum Güncelleme (updateDoc ve doc burada tanımlı olmalı)
    async updateComment(commentId, newContent, files) {
        const docRef = doc(db, "comments", commentId);
        return updateDoc(docRef, {
            content: newContent,
            files: files, // Güncellenmiş dosya listesi (Mevcut + Yeni)
            updatedAt: serverTimestamp()
        });
    },

    async downloadSecureFile(path) {
        // Path başında 'uploads/' olduğundan emin ol, veritabanına nasıl kaydettiysen öyle gelmeli
        const storageRef = ref(storage, path);
        return await getBlob(storageRef);
    },

async updateNote(noteId, updateData) {
    try {
        const docRef = doc(db, "notes", noteId);
        
        // UIController'dan gelen 'files' dizisini doğrudan kullanıyoruz
        const dataToSave = {
            ...updateData,
            updatedAt: serverTimestamp()
        };

        // Eğer 'existingFiles' gibi geçici alanlar varsa temizle
        delete dataToSave.existingFiles;

        return await updateDoc(docRef, dataToSave);
    } catch (error) {
        console.error("Firestore Güncelleme Hatası:", error);
        throw error;
    }
},


// FirebaseService.js içindeki metod
async deleteNoteWithAssets(noteId, files = []) {
    try {
        // 1. Makaleye ait yorumları sorgula
        const q = query(collection(db, "comments"), where("noteId", "==", noteId));
        const querySnapshot = await getDocs(q); // Artık getDocs tanımlı olduğu için hata vermez

        const deletePromises = [];

        // Yorumları ve yorumlara ekli dosyaları silme listesine ekle
        querySnapshot.forEach((commentDoc) => {
            const data = commentDoc.data();
            if (data.files) {
                data.files.forEach(f => {
                    const fileRef = ref(storage, f.fullPath || f.path || f.url);
                    deletePromises.push(deleteObject(fileRef).catch(() => {}));
                });
            }
            deletePromises.push(deleteDoc(commentDoc.ref));
        });

        // 2. Makalenin kendi dosyalarını silme listesine ekle
        files.forEach(f => {
            const fileRef = ref(storage, f.fullPath || f.path || f.url);
            deletePromises.push(deleteObject(fileRef).catch(() => {}));
        });

        // 3. Tüm silme işlemlerini (dosyalar ve yorumlar) paralel olarak yap
        await Promise.all(deletePromises);

        // 4. En son makalenin kendisini sil
        await deleteDoc(doc(db, "notes", noteId));
        
        return true;
    } catch (error) {
        throw error;
    }
}

};


















