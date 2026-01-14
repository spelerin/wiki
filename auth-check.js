// auth-check.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function checkAuth(redirectIfNotLoggedIn = true) {
    onAuthStateChanged(auth, (user) => {
        if (!user && redirectIfNotLoggedIn) {
            // Kullanıcı giriş yapmamışsa login sayfasına gönder
            console.log("Yetkisiz erişim! Yönlendiriliyor...");
            window.location.href = "login.html";
        } else if (user) {
            console.log("Hoş geldin:", user.email);
            // Burada istersen kullanıcı adını ekrana basan bir fonksiyon çağırabilirsin
        }
    });
}