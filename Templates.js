	// templates.js
	export const Templates = {
		
	// GİRİŞ EKRANI BİLEŞENİ
		LoginView() {
			return `
			<div class="bg-slate-50 flex items-center justify-center min-h-screen animate-in fade-in duration-500">
				<div class="max-w-md w-full bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-100 p-8">
					<div class="text-center mb-10">
						<div class="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-200">
							<svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
						</div>
						<h1 class="text-2xl font-bold text-slate-800">PYU-Not</h1>
						<p class="text-slate-500 mt-2 text-sm">Kurumsal Bilgi Üssü</p>
					</div>
					<button id="loginWithGoogleBtn" class="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 py-3 px-4 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition-all mb-6">
						Google ile Giriş Yap
					</button>
					<form class="space-y-4">
						<input id="emailInput" type="email" placeholder="E-posta" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
						<input id="passwordInput" type="password" placeholder="Şifre" class="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500">
						<button id="loginWithMailBtn" type="button" class="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold hover:bg-slate-900 transition-all">Giriş Yap</button>
					</form>
				</div>
			</div>`;
		},

		// ANA UYGULAMA İSKELETİ (App Shell)
		AppShell() {
			return `
				<div class="flex h-screen overflow-hidden">

					<aside id="sidebar" class="fixed inset-y-0 left-0 z-50 bg-slate-50 border-r border-slate-200 w-64 lg:w-72 flex flex-col transform -translate-x-full transition-all duration-300 ease-in-out md:relative md:translate-x-0 flex-shrink-0 overflow-hidden">
						
						<div class="p-4 border-b border-slate-200 min-w-[256px] lg:min-w-[288px]">
							<h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Başlıklar</h2>
							
							<div class="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
								<button class="flex-1 text-[10px] font-bold py-1 rounded bg-blue-600 text-white shadow-sm">SON</button>
								<button class="flex-1 text-[10px] font-bold py-1 rounded text-slate-500 hover:bg-slate-50">ACİL</button>
								<button class="flex-1 text-[10px] font-bold py-1 rounded text-slate-500 hover:bg-slate-50">HABER</button>
							</div>
						</div>

						<div class="flex-1 overflow-y-auto custom-scrollbar min-w-[256px] lg:min-w-[288px]">
							<nav class="divide-y divide-slate-100">
								<a href="#" class="block px-4 py-3 hover:bg-white transition-colors">
									<div class="flex justify-between items-start gap-2">
										<span class="text-[13px] font-medium text-slate-700 leading-tight">Yıllık izinlerin kullanımı hakkında yeni duyuru</span>
										<span class="text-[10px] font-bold text-slate-400 bg-slate-200 px-1 rounded">14</span>
									</div>
								</a>
								<a href="#" class="article-link block px-4 py-3 hover:bg-white transition-colors bg-red-50/50" data-id="vpn-001">
									<div class="flex justify-between items-start gap-2">
										<span class="text-[13px] font-medium text-red-700 leading-tight">VPN bağlantı sorunu (Tüm kullanıcılar)</span>
										<span class="text-[10px] font-bold text-white bg-red-500 px-1 rounded italic uppercase">Acil</span>
									</div>
								</a>
								</nav>
						</div>
					</aside>

			<div class="flex-1 flex flex-col min-w-0 bg-white">
				
				<header class="h-14 md:h-16 border-b border-slate-200 flex items-center justify-between px-4 md:px-6 gap-4 bg-white z-40">
					<div class="flex items-center gap-2 md:gap-4 flex-shrink-0">
						<button id="hide-side" class="p-2 hover:bg-slate-100 rounded-lg text-blue-600">
							<svg class="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
						</button>
						
						<div class="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[150px]">
							<span class="bg-blue-50 text-blue-600 text-[11px] px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1 whitespace-nowrap">
								#yazılım <button class="hover:text-red-500">&times;</button>
							</span>
						</div>
					</div>

					<div class="flex-1 max-w-xl">
						<div class="relative">
							<span class="absolute inset-y-0 left-3 flex items-center text-slate-400">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
							</span>
							<input id="search-input" type="text" placeholder="Hızlı ara..." class="w-full bg-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 border-none rounded-lg py-1.5 md:py-2 pl-9 text-sm outline-none transition-all">
						</div>
					</div>

					<div class="flex items-center gap-1 md:gap-3">
						<div class="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 mr-2">
							<button id="full-tags" class="px-2 py-1 text-[10px] font-bold hover:bg-white rounded transition-all uppercase">Full</button>
							<button id="half-tags" class="px-2 py-1 text-[10px] font-bold hover:bg-white rounded transition-all uppercase">Yarım</button>
							<button id="third-tags" class="px-2 py-1 text-[10px] font-bold hover:bg-white rounded transition-all uppercase">1/3</button>				
							<button id="close-tags" class="px-2 py-1 text-[10px] font-bold hover:bg-white rounded transition-all uppercase text-slate-400">Kapat</button>
						</div>

						<button class="bg-blue-600 text-white p-2 md:px-4 md:py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all flex-shrink-0">
							<span class="hidden md:inline">Ekle</span>
							<svg class="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
						</button>
					</div>
				</header>

				<main id="content-area" class="flex-grow flex flex-col h-full overflow-hidden state-hidden">
					
					<section id="tag-pool" class="bg-slate-50 border-b border-slate-200 transition-all duration-500 ease-in-out overflow-y-auto">
						<div class="p-6 md:p-10 text-center">
							<h2 class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Etiket Havuzu</h2>
							<div class="flex flex-wrap justify-center gap-x-6 gap-y-4 max-w-4xl mx-auto">
								<button class="text-xl font-bold text-blue-600 hover:underline">#javascript</button>
								<button class="text-sm font-medium text-slate-500 hover:text-blue-600">#ik</button>
								<button class="text-3xl font-black text-slate-800 hover:scale-105 transition-transform">#toplantı</button>
								<button class="text-xs text-slate-400 hover:text-slate-600">#eğitim</button>
								<button class="text-lg font-semibold text-blue-400 hover:underline">#firebase</button>
								<button class="text-sm font-medium text-slate-500 hover:text-blue-600">#kurumsal-kimlik</button>
								<button class="text-2xl font-bold text-slate-700">#yazılım</button>
							</div>
						</div>
					</section>

				<article id="article-section" class="flex-grow bg-white overflow-y-auto custom-scrollbar">

					</article>
				</main>
			</div>`;
	},
		
		
		
	// Liste Görünümü (Makaleler)
		ListView(items) {
			return `
				<div class="max-w-5xl mx-auto">
					<div class="p-4 border-b sticky top-0 bg-white">
						<h3 class="font-bold">#akış</h3>
					</div>
					<div class="divide-y">
						${items.map(item => `<div>${item.title}</div>`).join('')}
					</div>
				</div>
			`;
		},
		
		// Arama Sonuçları Görünümü
		SearchView(results, query) {
			return `
				<div class="p-8 text-center">
					<h2 class="text-xl font-bold">"${query}" için sonuçlar</h2>
					<p class="text-slate-500">${results.length} sonuç bulundu.</p>
					</div>
			`;
		},
		
		
		
		
		ArticleDetail(data) {
			return `
				<div class="max-w-4xl mx-auto py-8 px-4 md:px-8 animate-in fade-in duration-500">
					<div class="mb-8 flex items-center justify-between">
						<button id="btn-close-detail" class="text-blue-600 font-bold hover:bg-slate-100 px-3 py-1 rounded-lg transition-all flex items-center gap-2">
							← Geri
						</button>
						<div class="flex items-center gap-4">
							<button class="text-slate-300 hover:text-blue-600 transition-colors" title="Düzenle">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
							</button>
						</div>
					</div>

					<div class="mb-10">
						<h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-tight capitalize">
							${data.title}
						</h1>
						<div class="flex items-center gap-3">
							<span class="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded uppercase">${data.category}</span>
							<span class="text-xs text-slate-400 font-medium">${data.date} tarihinde oluşturuldu</span>
						</div>
					</div>

					<article class="bg-white border border-slate-200 rounded-2xl shadow-sm mb-12 overflow-hidden">
						<div class="pt-6 pb-6 px-6 md:pt-10 md:pb-10 md:px-10">
							<div class="entry-content text-slate-700 text-[16px] leading-relaxed space-y-4">
								${data.content}
							</div>
						</div>
						<div class="bg-slate-50/50 px-6 py-3 flex items-center justify-end border-t border-slate-100">
							<div>
								<span class="text-xs font-bold text-blue-600">@${data.author}</span>
								<p class="text-[10px] text-slate-400 font-medium">${data.fullTimestamp}</p>
							</div>
						</div>
					</article>

					<div id="comments-container" class="space-y-6"></div>
					
					<div class="mt-20 pt-12 border-t border-slate-100">
						<div id="reply-trigger" class="flex flex-col items-center">
							<p class="text-sm text-slate-400 italic mb-6 text-center">Bu başlığa bir katkıda bulunmak ister misiniz?</p>
							<button id="btn-show-reply" class="bg-white border-2 border-slate-200 text-slate-700 px-10 py-3 rounded-full text-sm font-black hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-95">
								CEVAP YAZ
							</button>
						</div>

						<div id="reply-area" class="animate-in fade-in slide-in-from-bottom-6 duration-500 hidden">
							<div class="bg-white rounded-3xl border border-blue-100 p-6 md:p-8 shadow-2xl shadow-blue-900/5">
								<div class="flex items-center justify-between mb-6">
									<h4 class="text-sm font-black text-slate-800 uppercase tracking-widest">Yeni Entry Yaz</h4>
									<button id="btn-hide-reply" class="p-2 text-slate-300 hover:text-red-500 transition-colors">
										<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
									</button>
								</div>
								
								<textarea id="comment-input" placeholder="Buraya yazmaya başlayın..." class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-100 rounded-2xl p-5 text-slate-700 resize-none min-h-[180px] text-[15px] outline-none transition-all placeholder:text-slate-400" spellcheck="false"></textarea>
								
								<div id="selected-files-preview" class="flex flex-wrap gap-2 mt-4"></div>

								<div class="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
									<div class="flex gap-2">
										<input type="file" id="comment-file-input" class="hidden" multiple>
										<button id="btn-add-file" class="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all font-bold text-xs uppercase tracking-tight">
											<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
											Dosya Ekle
										</button>
									</div>
									<button id="btn-send-comment" class="w-full sm:w-auto bg-blue-600 text-white px-10 py-3 rounded-2xl text-sm font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase tracking-widest">
										GÖNDER
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			`;
		},


	// Makale Listesi Şablonu
    ArticleList(articles) {
        return `
            <div class="max-w-5xl mx-auto md:px-6 animate-in fade-in duration-300">
                <div class="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <h3 class="font-bold text-slate-700 flex items-center gap-2">
                        <span class="w-2 h-2 bg-blue-500 rounded-full"></span>
                        Son Başlıklar
                    </h3>
                    <span class="text-[11px] text-slate-400 font-bold uppercase tracking-wider">${articles.length} Başlık</span>
                </div>
                <div class="divide-y divide-slate-100">
                    ${articles.map(article => this.ArticleListItem(article)).join('')}
                </div>
            </div>
        `;
    },

    // Her bir makale satırı
    ArticleListItem(article) {
        return `
            <div class="py-5 px-4 hover:bg-slate-50 transition-colors cursor-pointer group article-item" data-id="${article.id}">
                <div class="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1">
                    <h4 class="text-[15px] md:text-base font-semibold text-blue-600 group-hover:underline">${article.title}</h4>
                    <div class="flex items-center gap-2 text-[11px] text-slate-400">
                        <span class="font-bold text-slate-600">@${article.author}</span>
                        <span>&bull;</span>
                        <span>${article.date}</span>
                    </div>
                </div>
                <p class="text-[13px] text-slate-500 line-clamp-1 mt-1">${article.summary}</p>
            </div>
        `;
    },


	CommentItem(comment) {
		// isOwner: Eğer yorumu yazan kişi şu anki kullanıcıysa Düzenle/Sil butonlarını göster
		const actionButtons = comment.isOwner ? `
			<button data-id="${comment.id}" data-action="edit" class="text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase transition-colors">Düzenle</button>
			<button data-id="${comment.id}" data-action="delete" class="text-[10px] font-bold text-slate-400 hover:text-red-600 uppercase transition-colors">Sil</button>
		` : '';

		return `
			<article id="comment-${comment.id}" class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
				<div class="p-6">
					<div class="entry-content text-slate-700 text-[15px] leading-relaxed">
						${comment.content}
					</div>
				</div>
				
				<div class="bg-slate-50/50 px-6 py-3 flex items-center justify-between border-t border-slate-100">
					<div class="flex items-center gap-3">
						${actionButtons}
					</div>
					<div class="text-right">
						<span class="text-xs font-bold text-blue-600">@${comment.author}</span>
						<p class="text-[10px] text-slate-400 font-medium tracking-tight">
							${comment.fullTimestamp}
						</p>
					</div>
				</div>
			</article>
		`;
	}	
		
};