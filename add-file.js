import { db } from './firebase-config.js';
import { doc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function addFileToNote(noteId, fileData) {
    const noteRef = doc(db, "notes", noteId);

    try {
        await updateDoc(noteRef, {
            // files dizisine yeni bir OBJE ekliyoruz
            files: arrayUnion({
                name: fileData.name,
                url: fileData.url,
                type: fileData.type,
                createdAt: new Date()
            })
        });
        console.log("Dosya başarıyla eklendi!");
    } catch (e) {
        console.error("Hata: ", e);
    }
}

// Örnek kullanım:
// addFileToNote("not_id_123", { name: "rapor.pdf", url: "...", type: "application/pdf" });
