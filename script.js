
    // --- VERSIONE SCRIPT: 2.3 (con Cantina Vini) ---

    // 2. Importa le funzioni di Firebase
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
    import { 
      getFirestore, doc, getDoc, setDoc, onSnapshot, collection, 
      query, where, addDoc, getDocs, updateDoc, deleteDoc, writeBatch
    } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
    import { 
      getAuth, signInAnonymously, onAuthStateChanged 
    } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

    // --- Passaggio 1: Configurazione Firebase ---
    // QUESTA È LA TUA CONFIGURAZIONE (già inserita)
    const firebaseConfig = {
      apiKey: "AIzaSyDWS8urdhG9RdS62rihj0FBPV38aWUclGQ",
      authDomain: "inventario-a52a4.firebaseapp.com",
      projectId: "inventario-a52a4",
      storageBucket: "inventario-a52a4.firebasestorage.app",
      messagingSenderId: "531426475103",
      appId: "1:531426475103:web:9a3c9b74547fd19a0a6fea",
      measurementId: "G-8HSKSW2Q86"
    };

    // --- Passaggio 2: ID Gruppo Condiviso ---
    // Questo ID identifica il tuo inventario. 
    // Se il tuo collega usa lo stesso link, vedrà gli stessi dati.
    const GRUPPO_ID = "inventario-segreto-123";

    // --- Variabili Globali ---
    let db, auth;
    let unsubscribeProducts = null; // Funzione per staccare il listener
    let unsubscribeWines = null; // NUOVO: Listener per i vini
    let currentUserId = null; // UID dell'utente anonimo

    // Stato dell'applicazione
    const state = {
      products: [],         // Array di tutti i prodotti
      vini: [],             // NUOVO: Array di tutti i vini
      view: 'home',         // 'home', 'inventario', 'listaSpesa', 'costi', 'cantina'
      groupBy: 'categoria', // 'categoria' (rimosso fornitore)
      inventoryView: 'compatta', // 'compatta', 'completa'
      shoppingListManual: {}, // Prodotti aggiunti/rimossi manually { id: 'add'/'remove' }
      searchTerm: '',         // Termine di ricerca
      searchTermVini: '',   // NUOVO: Termine di ricerca per i vini
      sortBy: 'nome-asc',   // NUOVO: Criterio di ordinamento
    };

    // Selettori Elementi DOM (raggruppati per comodità)
    const dom = {
      loadingOverlay: document.getElementById('loading-overlay'),
      customAlert: {
        element: document.getElementById('custom-alert'),
        icon: document.getElementById('custom-alert-icon'),
        title: document.getElementById('custom-alert-title'),
        message: document.getElementById('custom-alert-message'),
        closeBtn: document.getElementById('custom-alert-close-btn'),
      },
      header: {
        goHomeBtn: document.getElementById('btn-go-home'),
        navTabs: document.getElementById('main-nav-tabs'),
        navInventario: document.getElementById('nav-inventario'),
        navListaSpesa: document.getElementById('nav-listaSpesa'),
        navCantina: document.getElementById('nav-cantina'), // NUOVO
        shoppingListBadge: document.getElementById('shopping-list-badge'),
        // themeToggle RIMOSSO
      },
      views: {
        home: document.getElementById('view-home'),
        inventario: document.getElementById('view-inventario'),
        listaSpesa: document.getElementById('view-listaSpesa'),
        costi: document.getElementById('view-costi'),
        cantina: document.getElementById('view-cantina'), // NUOVO
      },
      home: {
        goInventario: document.getElementById('btn-go-inventario'),
        goListaSpesa: document.getElementById('btn-go-listaspesa'),
        goCosti: document.getElementById('btn-go-costi'),
        goCantina: document.getElementById('btn-go-cantina'), // NUOVO
        showCsvUpload: document.getElementById('btn-show-csv-upload'),
        csvFileInput: document.getElementById('csv-file-input'),
        showCsvUploadVini: document.getElementById('btn-show-csv-upload-vini'), // NUOVO
        csvFileInputVini: document.getElementById('csv-file-input-vini'), // NUOVO
        btnExportCsv: document.getElementById('btn-export-csv'), // NUOVO
      },
      inventario: {
        searchBar: document.getElementById('search-bar'),
        toggleFiltersBtn: document.getElementById('toggle-filters-btn'),
        filtersDropdown: document.getElementById('filters-dropdown'),
        sortBySelect: document.getElementById('sort-by-select'), // NUOVO
        viewCompatta: document.getElementById('view-compatta'),
        viewCompleta: document.getElementById('view-completa'),
        listContainer: document.getElementById('inventory-list-container'),
        noProductsMsg: document.getElementById('no-products-message'),
        noSearchResultsMsg: document.getElementById('no-search-results-message'),
      },
      // NUOVO: Selettori Cantina
      cantina: {
        searchBar: document.getElementById('search-bar-vini'),
        listContainer: document.getElementById('wine-list-container'),
        noWinesMsg: document.getElementById('no-wines-message'),
        noSearchResultsWinesMsg: document.getElementById('no-search-results-wines-message'),
      },
      listaSpesa: {
        copyBtn: document.getElementById('copy-shopping-list-btn'),
        container: document.getElementById('shopping-list-container'),
      },
      costi: {
        container: document.getElementById('cost-report-container'),
      },
      formModal: {
        overlay: document.getElementById('form-modal-overlay'),
        openBtn: document.getElementById('open-form-modal-btn'),
        closeBtn: document.getElementById('close-form-modal-btn'),
        form: document.getElementById('add-product-form'),
        inputs: {
          nome: document.getElementById('new-nome'),
          categoria: document.getElementById('new-categoria'),
          fornitore: document.getElementById('new-fornitore'),
          costo: document.getElementById('new-costo'),
          unita: document.getElementById('new-unita'),
          quantita: document.getElementById('new-quantita'),
          quantitaMinima: document.getElementById('new-quantitaMinima'),
          stato: document.getElementById('new-stato'),
        }
      },
      // NUOVO: Selettori Modale Vini
      wineModal: {
        overlay: document.getElementById('wine-modal-overlay'),
        openBtn: document.getElementById('open-wine-modal-btn'),
        closeBtn: document.getElementById('close-wine-modal-btn'),
        form: document.getElementById('add-wine-form'),
        inputs: {
          nome: document.getElementById('new-vino-nome'),
          anno: document.getElementById('new-vino-anno'),
          quantita: document.getElementById('new-vino-quantita'),
          costo: document.getElementById('new-vino-costo'),
          vendita: document.getElementById('new-vino-vendita'),
          // NUOVI
          cantina: document.getElementById('new-vino-cantina'),
          regione: document.getElementById('new-vino-regione'),
        }
      }
    };

    // --- FUNZIONI DI INIZIALIZZAZIONE ---

    /**
     * Inizializza l'app: Firebase, Auth, Listener e UI.
     */
    async function initApp() {
      try {
        // 1. Inizializza Firebase
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // 2. Gestisci Autenticazione Anonima
        onAuthStateChanged(auth, (user) => {
          if (user) {
            // Utente già loggato
            currentUserId = user.uid;
            attachProductsListener(); // Avvia l'ascolto dei dati inventario
            attachWinesListener();  // NUOVO: Avvia l'ascolto dei vini
          } else {
            // Utente non loggato, prova a loggare
            signInAnonymously(auth).catch((error) => {
              console.error("Errore signInAnonymously:", error);
              if (error.code === 'auth/configuration-not-found') {
                showCustomAlert(
                  'Errore Configurazione Firebase', 
                  "L'accesso 'Anonimo' non è abilitato. Vai nella tua Console Firebase -> Authentication -> Sign-in method e abilita 'Anonimo'.", 
                  'error'
                );
              } else {
                showCustomAlert('Errore Autenticazione', error.message, 'error');
              }
            });
          }
        });

        // 3. Inizializza Listener UI
        initUIListeners();
        
        // 4. Inizializza Dark Mode (RIMOSSO, gestito da OS)

      } catch (error) {
        console.error("Errore inizializzazione Firebase: ", error);
        showCustomAlert('Errore Critico', `Impossibile inizializzare Firebase: ${error.message}`, 'error');
        dom.loadingOverlay.style.display = 'none'; // Nascondi comunque il caricamento
      }
    }

    /**
     * Collega il listener a Firestore per aggiornamenti in tempo reale.
     */
    function attachProductsListener() {
      // Stacca il listener precedente se esiste
      if (unsubscribeProducts) {
        unsubscribeProducts();
      }
      
      const productsCollectionRef = collection(db, "inventari", GRUPPO_ID, "prodotti");
      
      // Ascolta la collezione
      unsubscribeProducts = onSnapshot(productsCollectionRef, (snapshot) => {
        state.products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // NON ordiniamo più qui, lo facciamo nel render
        // state.products.sort((a, b) => a.nome.localeCompare(b.nome));

        dom.loadingOverlay.style.display = 'none'; // Nascondi overlay
        render(); // Ridisegna tutto

      }, (error) => {
        console.error("Errore in onSnapshot: ", error);
        showCustomAlert('Errore Database', `Impossibile caricare i dati: ${error.message}`, 'error');
        dom.loadingOverlay.style.display = 'none';
      });
    }

    /**
     * NUOVO: Collega il listener a Firestore per i VINI.
     */
    function attachWinesListener() {
      if (unsubscribeWines) {
        unsubscribeWines();
      }
      
      const winesCollectionRef = collection(db, "inventari", GRUPPO_ID, "vini");
      
      unsubscribeWines = onSnapshot(winesCollectionRef, (snapshot) => {
        state.vini = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordina alfabeticamente di default (verrà ri-ordinato nel render se serve)
        state.vini.sort((a, b) => a.nome.localeCompare(b.nome));

        // Non nascondere il loading overlay qui, 
        // potrebbe essere già stato nascosto da attachProductsListener
        render(); // Ridisegna tutto

      }, (error) => {
        console.error("Errore in onSnapshot (Vini): ", error);
        showCustomAlert('Errore Database Vini', `Impossibile caricare i vini: ${error.message}`, 'error');
      });
    }

    /**
     * Aggiunge tutti i listener per i pulsanti e gli input.
     */
    function initUIListeners() {
      // Navigazione Viste
      dom.header.navInventario.addEventListener('click', () => updateState({ view: 'inventario' }));
      dom.header.navListaSpesa.addEventListener('click', () => updateState({ view: 'listaSpesa' }));
      dom.header.navCantina.addEventListener('click', () => updateState({ view: 'cantina' })); // NUOVO
      dom.header.goHomeBtn.addEventListener('click', () => updateState({ view: 'home' }));
      
      dom.home.goInventario.addEventListener('click', () => updateState({ view: 'inventario' }));
      dom.home.goListaSpesa.addEventListener('click', () => updateState({ view: 'listaSpesa' }));
      dom.home.goCosti.addEventListener('click', () => updateState({ view: 'costi' }));
      dom.home.goCantina.addEventListener('click', () => updateState({ view: 'cantina' })); // NUOVO

      // CSV Upload / Export
      dom.home.showCsvUpload.addEventListener('click', () => dom.home.csvFileInput.click());
      dom.home.csvFileInput.addEventListener('change', handleCsvUpload);
      dom.home.btnExportCsv.addEventListener('click', handleExportCSV); // NUOVO
      
      // NUOVI LISTENER PER CSV VINI
      dom.home.showCsvUploadVini.addEventListener('click', () => dom.home.csvFileInputVini.click());
      dom.home.csvFileInputVini.addEventListener('change', handleWineCsvUpload);

      // Ricerca
      dom.inventario.searchBar.addEventListener('input', (e) => {
        updateState({ searchTerm: e.target.value });
      });

      // NUOVO: Ricerca Vini
      dom.cantina.searchBar.addEventListener('input', (e) => {
        updateState({ searchTermVini: e.target.value });
      });

      // Filtri Inventario
      dom.inventario.toggleFiltersBtn.addEventListener('click', () => { 
        dom.inventario.filtersDropdown.classList.toggle('hidden');
      });
      // Chiudi dropdown se clicchi fuori
      document.addEventListener('click', (e) => {
        if (!dom.inventario.toggleFiltersBtn.contains(e.target) && !dom.inventario.filtersDropdown.contains(e.target)) {
          dom.inventario.filtersDropdown.classList.add('hidden');
        }
      });
      
      // NUOVO: Listener Ordinamento
      dom.inventario.sortBySelect.addEventListener('change', (e) => {
        updateState({ sortBy: e.target.value });
      });

      dom.inventario.viewCompatta.addEventListener('click', () => updateState({ inventoryView: 'compatta' }));
      dom.inventario.viewCompleta.addEventListener('click', () => updateState({ inventoryView: 'completa' }));

      // Modale Form
      dom.formModal.openBtn.addEventListener('click', () => {
        dom.formModal.overlay.classList.remove('hidden');
      });
      dom.formModal.closeBtn.addEventListener('click', closeFormModal);
      dom.formModal.overlay.addEventListener('click', (e) => {
        if (e.target === dom.formModal.overlay) {
          closeFormModal();
        }
      });
      dom.formModal.form.addEventListener('submit', handleAddProduct);

      // NUOVO: Modale Vini
      dom.wineModal.openBtn.addEventListener('click', () => {
        dom.wineModal.overlay.classList.remove('hidden');
      });
      dom.wineModal.closeBtn.addEventListener('click', closeWineModal);
      dom.wineModal.overlay.addEventListener('click', (e) => {
        if (e.target === dom.wineModal.overlay) {
          closeWineModal();
        }
      });
      dom.wineModal.form.addEventListener('submit', handleAddWine);

      // Lista Spesa
      dom.listaSpesa.copyBtn.addEventListener('click', copyShoppingListToClipboard);
      
      // Dark Mode (RIMOSSO)

      // Alert
      dom.customAlert.closeBtn.addEventListener('click', () => {
        dom.customAlert.element.classList.add('hidden');
      });
    }

    // Funzione initDarkMode RIMOSSA
    // Funzione setDarkMode RIMOSSA


    // --- FUNZIONI DI RENDER ---

    /**
     * Funzione principale di disegno. Chiamata ogni volta che lo stato cambia.
     */
    function render() {
      // 1. Render Viste (Home, Inventario, Lista, Costi)
      renderViews();
      
      // 2. Render Filtri (pulsanti attivi e select ordinamento)
      renderFilters();

      // 3. Render Contenuto Viste
      // Solo se la vista è quella attiva
      if (state.view === 'inventario') {
        renderInventoryList();
      }
      if (state.view === 'listaSpesa') {
        renderShoppingList();
      }
      if (state.view === 'costi') {
        renderCostReport();
      }
      if (state.view === 'cantina') {
        renderWineList(); // NUOVO
      }
      
      // 4. Render Badge Lista Spesa
      const shoppingList = getShoppingList();
      if (shoppingList.length > 0) {
        dom.header.shoppingListBadge.textContent = shoppingList.length;
        dom.header.shoppingListBadge.classList.remove('hidden');
      } else {
        dom.header.shoppingListBadge.classList.add('hidden');
      }
    }

    /**
     * Mostra/Nasconde le viste principali (Home, Inventario, ecc.)
     */
    function renderViews() {
      dom.views.home.classList.add('hidden');
      dom.views.inventario.classList.add('hidden');
      dom.views.listaSpesa.classList.add('hidden');
      dom.views.costi.classList.add('hidden');
      dom.views.cantina.classList.add('hidden'); // NUOVO
      
      dom.header.navTabs.classList.add('hidden');
      dom.header.goHomeBtn.classList.add('hidden');
      dom.formModal.openBtn.classList.add('hidden'); // Nascondi + inventario
      dom.wineModal.openBtn.classList.add('hidden'); // NUOVO: Nascondi + vini

      if (state.view === 'home') {
        dom.views.home.classList.remove('hidden');
      } else {
        // Se non siamo in Home, mostra i tab e il pulsante Home
        dom.header.navTabs.classList.remove('hidden');
        dom.header.goHomeBtn.classList.remove('hidden');

        // Reset stato attivo tab
        dom.header.navInventario.classList.add('bg-white', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
        dom.header.navInventario.classList.remove('bg-blue-600', 'text-white');
        dom.header.navListaSpesa.classList.add('bg-white', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
        dom.header.navListaSpesa.classList.remove('bg-blue-600', 'text-white');
        dom.header.navCantina.classList.add('bg-white', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
        dom.header.navCantina.classList.remove('bg-purple-600', 'text-white'); // Usa viola per cantina
        
        if (state.view === 'inventario') {
          dom.views.inventario.classList.remove('hidden');
          dom.formModal.openBtn.classList.remove('hidden'); // Mostra + inventario
          // Stato attivo tab
          dom.header.navInventario.classList.add('bg-blue-600', 'text-white');
          dom.header.navInventario.classList.remove('bg-white', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
        } else if (state.view === 'listaSpesa') {
          dom.views.listaSpesa.classList.remove('hidden');
          // Stato attivo tab
          dom.header.navListaSpesa.classList.add('bg-blue-600', 'text-white');
          dom.header.navListaSpesa.classList.remove('bg-white', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
        } else if (state.view === 'costi') {
          dom.views.costi.classList.remove('hidden');
        } else if (state.view === 'cantina') {
          dom.views.cantina.classList.remove('hidden');
          dom.wineModal.openBtn.classList.remove('hidden'); // Mostra + vini
          // Stato attivo tab
          dom.header.navCantina.classList.add('bg-purple-600', 'text-white');
          dom.header.navCantina.classList.remove('bg-white', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-200');
        }
      }
    }

    /**
     * Aggiorna lo stato attivo dei pulsanti filtro e select ordinamento.
     */
    function renderFilters() {
      // Filtri Vista
      const btnCompatta = dom.inventario.viewCompatta;
      const btnCompleta = dom.inventario.viewCompleta;
      
      if (state.inventoryView === 'compatta') {
        btnCompatta.classList.add('bg-blue-500', 'text-white');
        btnCompatta.classList.remove('bg-white', 'shadow-sm', 'dark:bg-gray-600', 'dark:text-gray-200');
        btnCompleta.classList.add('bg-white', 'shadow-sm', 'dark:bg-gray-600', 'dark:text-gray-200');
        btnCompleta.classList.remove('bg-blue-500', 'text-white');
      } else {
        btnCompleta.classList.add('bg-blue-500', 'text-white');
        btnCompleta.classList.remove('bg-white', 'shadow-sm', 'dark:bg-gray-600', 'dark:text-gray-200');
        btnCompatta.classList.add('bg-white', 'shadow-sm', 'dark:bg-gray-600', 'dark:text-gray-200');
        btnCompatta.classList.remove('bg-blue-500', 'text-white');
      }

      // NUOVO: Imposta il valore corretto per la select di ordinamento
      dom.inventario.sortBySelect.value = state.sortBy;
    }

    /**
     * Disegna la lista dei prodotti nell'inventario.
     */
    function renderInventoryList() {
      const container = dom.inventario.listContainer;
      container.innerHTML = ''; // Pulisci lista

      // 1. Applica Ordinamento (NUOVO)
      const sortedProducts = sortProducts(state.products, state.sortBy);

      // 2. Filtra i prodotti in base alla ricerca
      const filteredProducts = sortedProducts.filter(p => 
        p.nome.toLowerCase().includes(state.searchTerm.toLowerCase())
      );
      
      // 3. Gestisci messaggi di "nessun prodotto"
      dom.inventario.noProductsMsg.classList.add('hidden');
      dom.inventario.noSearchResultsMsg.classList.add('hidden');

      if (state.products.length === 0) {
        dom.inventario.noProductsMsg.classList.remove('hidden');
        return;
      }

      if (filteredProducts.length === 0 && state.searchTerm) {
        dom.inventario.noSearchResultsMsg.classList.remove('hidden');
        return;
      }

      // 4. Disegna i prodotti filtrati
      filteredProducts.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
      });
    }

    /**
     * Crea il singolo elemento card per un prodotto.
     */
    function createProductCard(product) {
      const isCompatta = state.inventoryView === 'compatta';
      const div = document.createElement('div');
      
      // Logica Bordo Colorato
      const needsShopping = isProductInShoppingList(product, true); // true = controlla solo auto
      let borderColorClass = '';
      if (needsShopping) {
        if (product.stato === 'Disponibile') {
          borderColorClass = 'status-border-red'; // Rosso
        } else {
          borderColorClass = 'status-border-yellow'; // Giallo
        }
      }

      div.className = `product-card bg-white rounded-lg shadow-md overflow-hidden transition-all duration-200 dark:bg-gray-800 ${borderColorClass}`;
      
      // Contenuto HTML (Compatto o Completo)
      div.innerHTML = isCompatta 
        ? getCompattaCardHTML(product) 
        : getCompletaCardHTML(product);

      // Aggiungi Listener (per entrambe le viste)
      
      // Pulsanti +/- (solo vista compatta)
      if (isCompatta) {
        const btnMinus = div.querySelector('.btn-minus');
        const btnPlus = div.querySelector('.btn-plus');
        
        btnMinus.addEventListener('click', (e) => {
          e.preventDefault(); // MODIFICA: previene zoom mobile
          e.stopPropagation(); 
          let newQuantita = (parseFloat(product.quantita) || 0) - 1;
          if (newQuantita < 0) newQuantita = 0;
          handleProductUpdate(product.id, 'quantita', newQuantita);
        });

        btnPlus.addEventListener('click', (e) => {
          e.preventDefault(); // MODIFICA: previene zoom mobile
          e.stopPropagation();
          let newQuantita = (parseFloat(product.quantita) || 0) + 1;
          handleProductUpdate(product.id, 'quantita', newQuantita);
        });
      }

      // Input Modificabili
      // (Listener 'change' per salvare)
      const inputs = div.querySelectorAll('[data-field]');
      inputs.forEach(input => {
        input.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          let value = (e.target.type === 'number') ? parseFloat(e.target.value) : e.target.value;
          
          // Assicura che i numeri siano validi
          if (e.target.type === 'number' && isNaN(value)) {
            value = 0;
          }

          handleProductUpdate(product.id, field, value);
        });
        // Impedisci al click sull'input di propagarsi (es. per il +/-)
        input.addEventListener('click', e => e.stopPropagation());
      });
      
      // Pulsante Rimuovi
      const deleteBtn = div.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteProduct(product.id, product.nome);
      });

      // Pulsante Lista Spesa Manuale
      const shopBtn = div.querySelector('.shop-list-btn');
      shopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleManualShoppingList(product.id);
      });

      return div;
    }

    /**
     * Ritorna l'HTML per la card in Vista Compatta
     */
    function getCompattaCardHTML(product) {
      const statoBadge = getStatoBadge(product.stato);
      const shoppingBtnHTML = getShoppingButtonHTML(product);
      
      return `
        <div class="p-3">
          <div class="flex items-center justify-between">
            <!-- Info Prodotto (Sinistra) -->
            <div class="flex-1 min-w-0 mr-3">
              <div class="flex items-center">
                <input type="text" value="${product.nome}" data-field="nome" class="text-lg font-semibold text-gray-800 truncate bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md px-1 -ml-1 w-full dark:text-gray-100 dark:focus:bg-gray-700">
              </div>
              <div class="flex items-center space-x-2">
                ${statoBadge}
                <span class="text-sm text-gray-500 dark:text-gray-400">
                  Q.Min: ${product.quantitaMinima} ${product.unita}
                </span>
              </div>
            </div>
            
            <!-- Controlli Quantità (Destra) -->
            <div class="flex items-center space-x-2">
              <button class="btn-minus p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" />
                </svg>
              </button>
              
              <!-- MODIFICATO: step="any" per decimali -->
              <input type="number" value="${product.quantita}" data-field="quantita" step="any" class="w-16 text-center text-lg font-bold border rounded-md p-1 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
              
              <button class="btn-plus p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" />
                </svg>
              </button>

              ${shoppingBtnHTML}

              <button class="delete-btn p-1 text-gray-400 hover:text-red-500 ml-2 dark:hover:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    /**
     * Ritorna l'HTML per la card in Vista Completa
     */
    function getCompletaCardHTML(product) {
      const shoppingBtnHTML = getShoppingButtonHTML(product);

      return `
        <div class="p-4">
          <!-- Riga 1: Nome, Q.tà, Pulsanti -->
          <div class="flex items-center justify-between mb-3">
            <input type="text" value="${product.nome}" data-field="nome" class="text-xl font-semibold text-gray-800 truncate bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md px-1 -ml-1 w-full dark:text-gray-100 dark:focus:bg-gray-700">
            
            <div class="flex items-center space-x-3 ml-4">
              <div class="flex flex-col items-center">
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400">Q.tà Attuale</label>
                <!-- MODIFICATO: step="any" per decimali -->
                <input type="number" value="${product.quantita}" data-field="quantita" step="any" class="w-20 text-center text-lg font-bold border rounded-md p-1 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
              </div>
              
              ${shoppingBtnHTML}
              
              <button class="delete-btn p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Riga 2: Tutti gli altri campi -->
          <!-- MODIFICATO: grid-cols-1 sm:grid-cols-2 per mobile -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            <!-- Categoria -->
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Categoria</label>
              <input type="text" value="${product.categoria}" data-field="categoria" class="text-sm border rounded-md p-1.5 shadow-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>

            <!-- Fornitore -->
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Fornitore</label>
              <input type="text" value="${product.fornitore}" data-field="fornitore" class="text-sm border rounded-md p-1.5 shadow-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>

            <!-- Costo -->
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Costo (€)</label>
              <input type="number" value="${product.costo}" data-field="costo" min="0" step="0.01" class="text-sm border rounded-md p-1.5 shadow-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>
            
            <!-- Unità -->
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Unità</label>
              <select data-field="unita" class="text-sm border rounded-md p-1.5 shadow-sm w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="pz" ${product.unita === 'pz' ? 'selected' : ''}>pz</option>
                <option value="kg" ${product.unita === 'kg' ? 'selected' : ''}>kg</option>
                <option value="gr" ${product.unita === 'gr' ? 'selected' : ''}>gr</option>
                <option value="ct" ${product.unita === 'ct' ? 'selected' : ''}>ct</option>
                <option value="lt" ${product.unita === 'lt' ? 'selected' : ''}>lt</option>
                <option value="cl" ${product.unita === 'cl' ? 'selected' : ''}>cl</option>
                <option value="ml" ${product.unita === 'ml' ? 'selected' : ''}>ml</option>
              </select>
            </div>
            
            <!-- Q.tà Minima -->
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Q.tà Minima</label>
              <!-- MODIFICATO: step="any" per decimali -->
              <input type="number" value="${product.quantitaMinima}" data-field="quantitaMinima" min="0" step="any" class="text-sm border rounded-md p-1.5 shadow-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>

            <!-- Stato -->
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Stato</label>
              <select data-field="stato" class="text-sm border rounded-md p-1.5 shadow-sm w-full bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
                <option value="Disponibile" ${product.stato === 'Disponibile' ? 'selected' : ''}>Disponibile</option>
                <option value="Non Necessario" ${product.stato === 'Non Necessario' ? 'selected' : ''}>Non Necessario</option>
                <option value="Confezione Aperta" ${product.stato === 'Confezione Aperta' ? 'selected' : ''}>Confezione Aperta</option>
              </select>
            </div>
            
          </div>
        </div>
      `;
    }

    /**
     * Ritorna l'HTML per il badge di stato.
     */
    function getStatoBadge(stato) {
      if (stato === 'Non Necessario') {
        return `<span class="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full dark:bg-gray-600 dark:text-gray-200">${stato}</span>`;
      }
      if (stato === 'Confezione Aperta') {
        return `<span class="text-xs font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full dark:bg-yellow-900/50 dark:text-yellow-300">${stato}</span>`;
      }
      return ''; // Default (Disponibile) non mostra nulla
    }
    
    /**
     * Ritorna l'HTML per il pulsante di aggiunta/rimozione dalla lista spesa
     */
    function getShoppingButtonHTML(product) {
      const isManual = state.shoppingListManual[product.id];
      const isAuto = isProductInShoppingList(product, true);

      if (isManual === 'add' || (isAuto && isManual !== 'remove')) {
        // È sulla lista (o forzato o auto non rimosso)
        let icon, text, color;
        if (isManual === 'add') {
          // Forzato manually
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-10.293a1 1 0 00-1.414-1.414L9 9.586 7.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
          text = "Rimuovi da Lista";
          color = "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900";
        } else {
          // Automatico
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" /></svg>`;
          text = "Già in Lista";
          color = "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
        }
        return `
          <button title="${text}" class="shop-list-btn p-2 rounded-full ${color} transition-all">
            ${icon}
          </button>
        `;
      } else {
        // Non è sulla lista (o è stato rimosso manually)
        let icon, text, color;
        if (isManual === 'remove') {
          // Rimosso manually
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clip-rule="evenodd" /></svg>`;
          text = "Rimetti (annulla)";
          color = "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900";
        } else {
          // Default, non in lista
          icon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
          text = "Aggiungi a Lista";
          color = "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900";
        }
        return `
          <button title="${text}" class="shop-list-btn p-2 rounded-full ${color} transition-all">
            ${icon}
          </button>
        `;
      }
    }
    
    /**
     * Disegna la lista della spesa, raggruppata per fornitore.
     */
    function renderShoppingList() {
      const container = dom.listaSpesa.container;
      const groupedList = getShoppingListGrouped();

      if (Object.keys(groupedList).length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-10 text-lg">
          La lista della spesa è vuota.
        </p>`;
        dom.listaSpesa.copyBtn.classList.add('hidden');
        return;
      }
      
      dom.listaSpesa.copyBtn.classList.remove('hidden');
      container.innerHTML = ''; // Pulisci

      Object.keys(groupedList).sort().forEach(fornitore => {
        const groupDiv = document.createElement('div');
        groupDiv.className = "mb-6";
        
        const title = document.createElement('h3');
        title.className = "text-xl font-semibold text-gray-700 border-b border-gray-300 pb-2 mb-3 dark:text-gray-200 dark:border-gray-700";
        title.textContent = fornitore;
        groupDiv.appendChild(title);
        
        const listUl = document.createElement('ul');
        listUl.className = "list-disc list-inside space-y-2";
        
        groupedList[fornitore].forEach(product => {
          const li = document.createElement('li');
          li.className = "text-gray-800 dark:text-gray-300";
          li.innerHTML = `
            <span class="font-medium">${product.nome}</span> 
            <span class="text-sm text-gray-600 dark:text-gray-400">
              (Q.tà: ${product.quantita} / Min: ${product.quantitaMinima} ${product.unita})
            </span>
          `;
          listUl.appendChild(li);
        });
        
        groupDiv.appendChild(listUl);
        container.appendChild(groupDiv);
      });
    }

    /**
     * Disegna il report dei costi.
     */
    function renderCostReport() {
      const container = dom.costi.container;
      
      // 1. Raggruppa prodotti per categoria
      const groupedByCategoria = state.products.reduce((acc, p) => {
        const categoria = p.categoria || 'Senza Categoria';
        if (!acc[categoria]) {
          acc[categoria] = [];
        }
        acc[categoria].push(p);
        return acc;
      }, {});
      
      if (state.products.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 dark:text-gray-400 py-10 text-lg">
          Nessun prodotto nell'inventario per calcolare i costi.
        </p>`;
        return;
      }

      container.innerHTML = ''; // Pulisci
      let granTotale = 0;

      // 2. Itera sulle categorie e crea le tabelle
      Object.keys(groupedByCategoria).sort().forEach(categoria => {
        const products = groupedByCategoria[categoria];
        let totaleCategoria = 0;
        
        const groupDiv = document.createElement('div');
        groupDiv.className = "mb-8";
        
        const title = document.createElement('h3');
        title.className = "text-xl font-semibold text-gray-700 border-b border-gray-300 pb-2 mb-3 dark:text-gray-200 dark:border-gray-700";
        title.textContent = categoria;
        groupDiv.appendChild(title);

        const table = document.createElement('table');
        table.className = "w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700";
        table.innerHTML = `
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Prodotto</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Q.tà x Costo/Unità</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Valore Totale</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
          </tbody>
          <tfoot class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <td colspan="2" class="px-4 py-2 text-right text-sm font-bold text-gray-700 dark:text-gray-100">Totale Categoria</td>
              <td id="totale-cat" class="px-4 py-2 text-right text-sm font-bold text-gray-900 dark:text-white"></td>
            </tr>
          </tfoot>
        `;
        
        const tbody = table.querySelector('tbody');
        
        products.forEach(p => {
          const costo = parseFloat(p.costo) || 0;
          const quantita = parseFloat(p.quantita) || 0;
          const valore = costo * quantita;
          totaleCategoria += valore;
          
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">${p.nome}</td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
              ${quantita} ${p.unita} x ${formatCurrency(costo)}
            </td>
            <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200 text-right">${formatCurrency(valore)}</td>
          `;
          tbody.appendChild(tr);
        });
        
        table.querySelector('#totale-cat').textContent = formatCurrency(totaleCategoria);
        groupDiv.appendChild(table);
        container.appendChild(groupDiv);
        
        granTotale += totaleCategoria;
      });
      
      // 3. Aggiungi Gran Totale
      const granTotaleDiv = document.createElement('div');
      granTotaleDiv.className = "mt-8 pt-4 border-t-2 border-blue-600 flex justify-end";
      granTotaleDiv.innerHTML = `
        <span class="text-2xl font-bold text-gray-800 dark:text-gray-100">Valore Totale Inventario:</span>
        <span class="text-2xl font-bold text-blue-700 dark:text-blue-400 ml-4">${formatCurrency(granTotale)}</span>
      `;
      container.appendChild(granTotaleDiv);
    }
    
    /**
     * NUOVA: Ordina l'array dei prodotti in base alla chiave di ordinamento.
     */
    function sortProducts(products, sortBy) {
      const sorted = [...products]; // Crea una copia
      
      switch (sortBy) {
        case 'nome-asc':
          sorted.sort((a, b) => a.nome.localeCompare(b.nome));
          break;
        case 'nome-desc':
          sorted.sort((a, b) => b.nome.localeCompare(a.nome));
          break;
        case 'costo-asc':
          sorted.sort((a, b) => (a.costo || 0) - (b.costo || 0));
          break;
        case 'costo-desc':
          sorted.sort((a, b) => (b.costo || 0) - (a.costo || 0));
          break;
        case 'carenza-desc':
          // Carenza = qtaMinima - qta (un numero più alto è più urgente)
          sorted.sort((a, b) => {
            const carenzaA = (a.quantitaMinima || 0) - (a.quantita || 0);
            const carenzaB = (b.quantitaMinima || 0) - (b.quantita || 0);
            // I prodotti con carenza maggiore (più negativi) vanno prima
            return carenzaB - carenzaA;
          });
          break;
      }
      return sorted;
    }


    // --- NUOVE FUNZIONI PER CANTINA VINI ---

    /**
     * NUOVO: Disegna la lista dei vini nella cantina.
     */
    function renderWineList() {
      const container = dom.cantina.listContainer;
      // 1. Filtra i vini in base alla ricerca (nome, anno, cantina, regione)
      const searchTerm = state.searchTermVini.toLowerCase();
      const filteredWines = state.vini.filter(v => 
        v.nome.toLowerCase().includes(searchTerm) ||
        String(v.anno).includes(searchTerm) ||
        (v.cantina && v.cantina.toLowerCase().includes(searchTerm)) || // AGGIUNTO
        (v.regione && v.regione.toLowerCase().includes(searchTerm))    // AGGIUNTO
      );
      
      // 2. Gestisci messaggi "nessun vino"
      dom.cantina.noWinesMsg.classList.add('hidden');
      dom.cantina.noSearchResultsWinesMsg.classList.add('hidden');

      if (state.vini.length === 0) {
        dom.cantina.noWinesMsg.classList.remove('hidden');
        return;
      }

      if (filteredWines.length === 0 && state.searchTermVini) {
        dom.cantina.noSearchResultsWinesMsg.classList.remove('hidden');
        return;
      }

      // 3. Disegna le carte dei vini
      filteredWines.forEach(wine => {
        const card = createWineCard(wine);
        container.appendChild(card);
      });
    }

    /**
     * NUOVO: Crea il singolo elemento card per un vino.
     */
    function createWineCard(wine) {
      const div = document.createElement('div');
      div.className = "wine-card bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800 flex flex-col";
      
      const costo = parseFloat(wine.costo) || 0;
      const vendita = parseFloat(wine.vendita) || 0;
      const margine = vendita - costo;
      
      const margineColor = margine > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';

      div.innerHTML = `
        <!-- Intestazione Carta Vino -->
        <div class="p-4 border-b border-gray-200 dark:border-gray-700">
          <input type="text" value="${wine.nome}" data-field="nome" class="text-xl font-semibold text-gray-800 truncate bg-transparent focus:outline-none focus:ring-1 focus:ring-purple-500 rounded-md px-1 -ml-1 w-full dark:text-gray-100 dark:focus:bg-gray-700">
          
          <!-- Wrapper per campi secondari -->
          <div class="grid grid-cols-2 gap-x-4 mt-2">
            <div class="flex items-center">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2 w-12">Anno:</span>
              <input type="number" value="${wine.anno}" data-field="anno" min="1900" max="2100" class="w-full text-sm border rounded-md p-1 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>
            
            <!-- CAMPO REGIONE -->
            <div class="flex items-center">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2 w-12">Regione:</span>
              <input type="text" value="${wine.regione || ''}" data-field="regione" class="w-full text-sm border rounded-md p-1 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>

            <!-- CAMPO CANTINA (su riga nuova) -->
            <div class="flex items-center col-span-2 mt-2">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2 w-12">Cantina:</span>
              <input type="text" value="${wine.cantina || ''}" data-field="cantina" class="w-full text-sm border rounded-md p-1 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>
          </div>
        </div>
        
        <!-- Corpo Carta Vino (Quantità) -->
        <div class="p-4 flex-grow">
          <div class="flex items-center justify-between">
            <span class="text-lg font-medium text-gray-700 dark:text-gray-200">Quantità</span>
            <div class="flex items-center space-x-2">
              <button class="btn-minus-vino p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
              </button>
              
              <input type="number" value="${wine.quantita}" data-field="quantita" step="1" min="0" class="w-16 text-center text-lg font-bold border rounded-md p-1 shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
              
              <button class="btn-plus-vino p-1 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clip-rule="evenodd" /></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Carta Vino (Costi) -->
        <div class="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div class="grid grid-cols-2 gap-4">
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Costo (€)</label>
              <input type="number" value="${costo}" data-field="costo" min="0" step="0.01" class="text-sm border rounded-md p-1.5 shadow-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>
            <div class="flex flex-col">
              <label class="text-xs font-semibold text-gray-500 dark:text-gray-400">Vendita (€)</label>
              <input type="number" value="${vendita}" data-field="vendita" min="0" step="0.01" class="text-sm border rounded-md p-1.5 shadow-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100">
            </div>
          </div>
          <div class="mt-3 flex justify-between items-center">
            <span class="text-sm font-bold text-gray-700 dark:text-gray-200">Margine:</span>
            <span class="text-lg font-bold ${margineColor}">
              ${formatCurrency(margine)}
            </span>
          </div>
        </div>
        
        <!-- Pulsante Elimina -->
        <button class="delete-btn-vino absolute top-3 right-3 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      `;

      // Aggiungi Listener
      
      // Pulsanti +/-
      const btnMinus = div.querySelector('.btn-minus-vino');
      const btnPlus = div.querySelector('.btn-plus-vino');
      
      btnMinus.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        let newQuantita = (parseInt(wine.quantita) || 0) - 1;
        if (newQuantita < 0) newQuantita = 0;
        handleWineUpdate(wine.id, 'quantita', newQuantita);
      });

      btnPlus.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        let newQuantita = (parseInt(wine.quantita) || 0) + 1;
        handleWineUpdate(wine.id, 'quantita', newQuantita);
      });

      // Input Modificabili
      const inputs = div.querySelectorAll('[data-field]');
      inputs.forEach(input => {
        input.addEventListener('change', (e) => {
          const field = e.target.dataset.field;
          let value = (e.target.type === 'number') ? parseFloat(e.target.value) : e.target.value;
          if (e.target.type === 'number' && isNaN(value)) value = 0;
          
          // Se l'anno è un numero, assicurati che sia intero
          if (field === 'anno') value = parseInt(value) || 1900;
          // Se la quantità è un numero, assicurati che sia intero
          if (field === 'quantita') value = parseInt(value) || 0;

          handleWineUpdate(wine.id, field, value);
        });
        input.addEventListener('click', e => e.stopPropagation());
      });
      
      // Pulsante Rimuovi
      const deleteBtn = div.querySelector('.delete-btn-vino');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteWine(wine.id, wine.nome);
      });

      return div;
    }


    // --- FUNZIONI DI LOGICA (GETTERS) ---

    /**
     * Ritorna true se un prodotto deve essere sulla lista spesa.
     * @param {object} product - L'oggetto prodotto.
     * @param {boolean} [autoOnly=false] - Se true, ignora le forzature manually.
     */
    function isProductInShoppingList(product, autoOnly = false) {
      const isAuto = (product.quantita < product.quantitaMinima) && 
                     (product.stato === 'Disponibile'); // Logica Modificata
                     
      if (autoOnly) {
        return isAuto;
      }
      
      const manualStatus = state.shoppingListManual[product.id];
      
      if (manualStatus === 'add') return true;
      if (manualStatus === 'remove') return false;
      
      return isAuto;
    }
    
    /**
     * Ritorna l'array completo dei prodotti per la lista spesa.
     */
    function getShoppingList() {
      return state.products.filter(p => isProductInShoppingList(p));
    }
    
    /**
     * Ritorna i prodotti della lista spesa raggruppati per fornitore.
     */
    function getShoppingListGrouped() {
      const shoppingList = getShoppingList();
      return shoppingList.reduce((acc, p) => {
        const fornitore = p.fornitore || 'Sconosciuto';
        if (!acc[fornitore]) {
          acc[fornitore] = [];
        }
        acc[fornitore].push(p);
        return acc;
      }, {});
    }


    // --- FUNZIONI DI AZIONE (HANDLERS) ---

    /**
     * Aggiorna lo stato globale e chiama render().
     */
    function updateState(newState) {
      Object.assign(state, newState);
      
      // Chiudi il menu a tendina se si cambia vista
      if (newState.view || newState.inventoryView || newState.sortBy) {
        dom.inventario.filtersDropdown.classList.add('hidden');
      }

      render();
    }
    
    /**
     * Chiude il modale e resetta il form.
     */
    function closeFormModal() {
      dom.formModal.overlay.classList.add('hidden');
      dom.formModal.form.reset();
    }

    /**
     * NUOVO: Chiude il modale VINI e resetta il form.
     */
    function closeWineModal() {
      dom.wineModal.overlay.classList.add('hidden');
      dom.wineModal.form.reset();
    }

    /**
     * Gestisce l'invio del form per un nuovo prodotto.
     */
    async function handleAddProduct(e) {
      e.preventDefault();
      
      const newProduct = {
        nome: dom.formModal.inputs.nome.value,
        categoria: dom.formModal.inputs.categoria.value,
        fornitore: dom.formModal.inputs.fornitore.value,
        costo: parseFloat(dom.formModal.inputs.costo.value) || 0,
        unita: dom.formModal.inputs.unita.value,
        quantita: parseFloat(dom.formModal.inputs.quantita.value) || 0,
        quantitaMinima: parseFloat(dom.formModal.inputs.quantitaMinima.value) || 0,
        stato: dom.formModal.inputs.stato.value,
      };

      try {
        const productsCollectionRef = collection(db, "inventari", GRUPPO_ID, "prodotti");
        await addDoc(productsCollectionRef, newProduct);
        
        closeFormModal();
        showCustomAlert('Successo!', `Prodotto "${newProduct.nome}" aggiunto.`, 'success');
        
      } catch (error) {
        console.error("Errore aggiunta prodotto: ", error);
        showCustomAlert('Errore', `Impossibile aggiungere il prodotto: ${error.message}`, 'error');
      }
    }

    /**
     * NUOVO: Gestisce l'invio del form per un nuovo vino.
     */
    async function handleAddWine(e) {
      e.preventDefault();
      
      const newWine = {
        nome: dom.wineModal.inputs.nome.value,
        anno: parseInt(dom.wineModal.inputs.anno.value) || 1900,
        quantita: parseInt(dom.wineModal.inputs.quantita.value) || 0,
        costo: parseFloat(dom.wineModal.inputs.costo.value) || 0,
        vendita: parseFloat(dom.wineModal.inputs.vendita.value) || 0,
        // NUOVI
        cantina: dom.wineModal.inputs.cantina.value || '',
        regione: dom.wineModal.inputs.regione.value || '',
      };

      try {
        const winesCollectionRef = collection(db, "inventari", GRUPPO_ID, "vini");
        await addDoc(winesCollectionRef, newWine);
        
        closeWineModal();
        showCustomAlert('Successo!', `Vino "${newWine.nome}" aggiunto alla cantina.`, 'success');
        
      } catch (error) {
        console.error("Errore aggiunta vino: ", error);
        showCustomAlert('Errore', `Impossibile aggiungere il vino: ${error.message}`, 'error');
      }
    }

    /**
     * Aggiorna un campo di un prodotto esistente su Firebase.
     */
    async function handleProductUpdate(productId, field, value) {
      const productRef = doc(db, "inventari", GRUPPO_ID, "prodotti", productId);
      
      try {
        await updateDoc(productRef, {
          [field]: value
        });
        // Non serve un alert per ogni modifica, è troppo invasivo
      } catch (error) {
        console.error(`Errore aggiornamento campo ${field}: `, error);
        showCustomAlert('Errore', `Impossibile aggiornare ${field}: ${error.message}`, 'error');
        // NOTA: il listener onSnapshot ricaricherà il vecchio valore, 
        // annullando la modifica fallita
      }
    }

    /**
     * NUOVO: Aggiorna un campo di un vino esistente su Firebase.
     */
    async function handleWineUpdate(wineId, field, value) {
      const wineRef = doc(db, "inventari", GRUPPO_ID, "vini", wineId);
      
      try {
        await updateDoc(wineRef, {
          [field]: value
        });
      } catch (error) {
        console.error(`Errore aggiornamento vino ${field}: `, error);
        showCustomAlert('Errore', `Impossibile aggiornare ${field}: ${error.message}`, 'error');
      }
    }

    /**
     * Cancella un prodotto da Firebase.
     */
    async function handleDeleteProduct(productId, productName) {
      // Sostituisci window.confirm con un modale custom (futuro)
      if (true) { // Per ora, salta la conferma
        try {
          const productRef = doc(db, "inventari", GRUPPO_ID, "prodotti", productId);
          await deleteDoc(productRef);
          showCustomAlert('Successo!', `Prodotto "${productName}" eliminato.`, 'success');
        } catch (error) {
          console.error("Errore eliminazione prodotto: ", error);
          showCustomAlert('Errore', `Impossibile eliminare: ${error.message}`, 'error');
        }
      }
    }

    /**
     * NUOVO: Cancella un vino da Firebase.
     */
    async function handleDeleteWine(wineId, wineName) {
      if (true) { // Salta conferma per ora
        try {
          const wineRef = doc(db, "inventari", GRUPPO_ID, "vini", wineId);
          await deleteDoc(wineRef);
          showCustomAlert('Successo!', `Vino "${wineName}" eliminato.`, 'success');
        } catch (error) {
          console.error("Errore eliminazione vino: ", error);
          showCustomAlert('Errore', `Impossibile eliminare: ${error.message}`, 'error');
        }
      }
    }

    /**
     * Gestisce l'aggiunta/rimozione manuale dalla lista spesa.
     */
    function handleManualShoppingList(productId) {
      const product = state.products.find(p => p.id === productId);
      if (!product) return;

      const isAuto = isProductInShoppingList(product, true);
      const manualStatus = state.shoppingListManual[productId];

      const newManualState = { ...state.shoppingListManual };

      if (manualStatus === 'add') {
        // Era forzato 'add' -> ora default (lascia decidere l'auto)
        delete newManualState[productId];
      } else if (manualStatus === 'remove') {
        // Era forzato 'remove' -> ora forzato 'add'
        newManualState[productId] = 'add';
      } else {
        // Era default
        if (isAuto) {
          // Era auto -> ora forzato 'remove'
          newManualState[productId] = 'remove';
        } else {
          // Era non-auto -> ora forzato 'add'
          newManualState[productId] = 'add';
        }
      }

      // Aggiorna lo stato (solo localmente, non serve salvare su DB)
      updateState({ shoppingListManual: newManualState });
    }

    /**
     * Gestisce il caricamento e il parsing di un file CSV.
     */
    async function handleCsvUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      dom.loadingOverlay.style.display = 'flex'; // Mostra caricamento

      try {
        const csvText = await file.text();
        const { headers, data } = parseCSV(csvText);

        // --- INIZIO MODIFICA: Controllo header migliorato ---
        const headersFound = headers.map(h => h.toLowerCase().trim());
        
        const findHeader = (possibleNames) => {
            for (const name of possibleNames) {
                const index = headersFound.indexOf(name);
                if (index !== -1) return index;
            }
            return -1;
        };

        // Cerca gli indici delle colonne necessarie
        const nomeIndex = findHeader(['nome']);
        const categoriaIndex = findHeader(['categoria']);
        const fornitoreIndex = findHeader(['fornitore']);

        const requiredHeaders = ['nome', 'categoria', 'fornitore'];
        const missingHeaders = [];

        if (nomeIndex === -1) missingHeaders.push('nome');
        if (categoriaIndex === -1) missingHeaders.push('categoria');
        if (fornitoreIndex === -1) missingHeaders.push('fornitore');

        if (missingHeaders.length > 0) {
          // Messaggio di errore migliorato
          const headersFoundString = headersFound.length > 0 ? headersFound.join(', ') : 'Nessuna';
          throw new Error(`File CSV non valido. Colonne richieste mancanti: [${missingHeaders.join(', ')}]. Colonne trovate nel file: [${headersFoundString}]`);
        }
        // --- FINE MODIFICA ---
        
        // Controlla i duplicati
        // Prendi i nomi dei prodotti esistenti
        const existingNamesLower = state.products.map(p => p.nome.toLowerCase());
        
        const productsToAdd = [];
        let skipped = 0;

        data.forEach(row => {
          const nome = row[nomeIndex];
          if (nome) {
            const nomeLower = nome.toLowerCase();
            if (!existingNamesLower.includes(nomeLower)) {
              // Prodotto nuovo, aggiungi alla lista
              productsToAdd.push({
                nome: nome,
                categoria: row[categoriaIndex] || 'Sconosciuta',
                fornitore: row[fornitoreIndex] || 'Sconosciuto',
                costo: 0,
                unita: 'pz',
                quantita: 0,
                quantitaMinima: 0,
                stato: 'Disponibile'
              });
              // Aggiungi subito all'elenco per evitare duplicati nello stesso file
              existingNamesLower.push(nomeLower); 
            } else {
              skipped++; // Prodotto duplicato, salta
            }
          }
        });

        // Esegui il caricamento massivo (Batch Write)
        if (productsToAdd.length > 0) {
          const batch = writeBatch(db);
          const productsCollectionRef = collection(db, "inventari", GRUPPO_ID, "prodotti");
          
          productsToAdd.forEach(product => {
            const newDocRef = doc(productsCollectionRef); // Crea un nuovo ID
            batch.set(newDocRef, product);
          });
          
          await batch.commit();
        }
        
        showCustomAlert('Importazione Completata', 
          `Prodotti nuovi aggiunti: ${productsToAdd.length}. Prodotti duplicati saltati: ${skipped}.`, 
          'success');

      } catch (error) {
        console.error("Errore importazione CSV: ", error);
        showCustomAlert('Errore Importazione', error.message, 'error');
      } finally {
        dom.loadingOverlay.style.display = 'none'; // Nascondi caricamento
        event.target.value = null; // Resetta l'input file
      }
    }

    /**
     * NUOVO: Gestisce il caricamento e il parsing di un file CSV per i VINI.
     */
    async function handleWineCsvUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      dom.loadingOverlay.style.display = 'flex'; // Mostra caricamento

      try {
        const csvText = await file.text();
        const { headers, data } = parseCSV(csvText);

        // --- INIZIO MODIFICA: Controllo header migliorato ---
        const headersFound = headers.map(h => h.toLowerCase().trim());
        
        const findHeader = (possibleNames) => {
            for (const name of possibleNames) {
                const index = headersFound.indexOf(name);
                if (index !== -1) return index;
            }
            return -1;
        };

        // Cerca gli indici delle colonne necessarie per i vini
        const nomeIndex = findHeader(['nome']);
        const annoIndex = findHeader(['anno']);
        const cantinaIndex = findHeader(['cantina']);
        const regioneIndex = findHeader(['regione']);
        const costoIndex = findHeader(['costo']);
        const venditaIndex = findHeader(['vendita']);
        const quantitaIndex = findHeader(['quantita', 'quantità']); // ACCETTA ENTRAMBI

        const requiredHeaders = ['nome', 'anno', 'costo', 'vendita', 'quantita/quantità'];
        const missingHeaders = [];

        if (nomeIndex === -1) missingHeaders.push('nome');
        if (annoIndex === -1) missingHeaders.push('anno');
        if (costoIndex === -1) missingHeaders.push('costo');
        if (venditaIndex === -1) missingHeaders.push('vendita');
        if (quantitaIndex === -1) missingHeaders.push('quantita/quantità');

        if (missingHeaders.length > 0) {
          // Messaggio di errore migliorato
          const headersFoundString = headersFound.length > 0 ? headersFound.join(', ') : 'Nessuna';
          throw new Error(`File CSV non valido. Colonne richieste mancanti: [${missingHeaders.join(', ')}]. Colonne trovate nel file: [${headersFoundString}]`);
        }
        // --- FINE MODIFICA ---
        
        // Controlla i duplicati (basato sui vini esistenti)
        const existingNamesLower = state.vini.map(v => v.nome.toLowerCase());
        
        const winesToAdd = [];
        let skipped = 0;

        data.forEach(row => {
          const nome = row[nomeIndex];
          if (nome) {
            const nomeLower = nome.toLowerCase();
            if (!existingNamesLower.includes(nomeLower)) {
              // Vino nuovo, aggiungi alla lista
              winesToAdd.push({
                nome: nome,
                anno: parseInt(row[annoIndex]) || 1900,
                cantina: row[cantinaIndex] || '',
                regione: row[regioneIndex] || '',
                costo: parseFloat(row[costoIndex]) || 0,
                vendita: parseFloat(row[venditaIndex]) || 0,
                quantita: parseInt(row[quantitaIndex]) || 0,
              });
              // Aggiungi subito all'elenco per evitare duplicati nello stesso file
              existingNamesLower.push(nomeLower); 
            } else {
              skipped++; // Vino duplicato, salta
            }
          }
        });

        // Esegui il caricamento massivo (Batch Write)
        if (winesToAdd.length > 0) {
          const batch = writeBatch(db);
          // Salva nella collezione VINI
          const winesCollectionRef = collection(db, "inventari", GRUPPO_ID, "vini");
          
          winesToAdd.forEach(wine => {
            const newDocRef = doc(winesCollectionRef); // Crea un nuovo ID
            batch.set(newDocRef, wine);
          });
          
          await batch.commit();
        }
        
        showCustomAlert('Importazione Vini Completata', 
          `Vini nuovi aggiunti: ${winesToAdd.length}. Vini duplicati saltati: ${skipped}.`, 
          'success');

      } catch (error) {
        console.error("Errore importazione CSV Vini: ", error);
        showCustomAlert('Errore Importazione Vini', error.message, 'error');
      } finally {
        dom.loadingOverlay.style.display = 'none'; // Nascondi caricamento
        event.target.value = null; // Resetta l'input file
      }
    }

    /**
     * NUOVA: Esporta l'inventario corrente in un file CSV.
     */
    function handleExportCSV() {
      if (state.products.length === 0) {
        showCustomAlert('Niente da esportare', 'L\'inventario è vuoto.', 'info');
        return;
      }

      const headers = ["nome", "categoria", "fornitore", "costo", "unita", "quantita", "quantitaMinima", "stato"];
      let csvContent = headers.join(",") + "\n";

      // Funzione helper per gestire virgole e virgolette nei nomi
      const escapeCSV = (str) => {
        let s = String(str || '').replace(/"/g, '""'); // Raddoppia le virgolette
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          s = `"${s}"`; // Metti tra virgolette
        }
        return s;
      };
      
      // Ordina i prodotti alfabeticamente per l'esportazione
      const productsToExport = sortProducts(state.products, 'nome-asc');

      productsToExport.forEach(product => {
        const row = [
          escapeCSV(product.nome),
          escapeCSV(product.categoria),
          escapeCSV(product.fornitore),
          product.costo || 0,
          escapeCSV(product.unita),
          product.quantita || 0,
          product.quantitaMinima || 0,
          escapeCSV(product.stato)
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      
      if (link.download !== undefined) { 
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `inventario_backup_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showCustomAlert('Esportazione Avviata', 'Il download del CSV è iniziato.', 'success');
      } else {
        showCustomAlert('Errore', 'Il tuo browser non supporta il download automatico.', 'error');
      }
    }


    // --- FUNZIONI DI UTILITÀ ---
    
    /**
     * Funzione di utility per il parsing di un file CSV.
     * (MODIFICATA PER GESTIRE VIRGOLE E PUNTO/VIRGOLA)
     */
    function parseCSV(text) {
      const lines = text.replace(/\r/g, '').split('\n');
      const headers = [];
      const data = [];

      if (lines.length === 0) return { headers, data };

      const headerLine = lines[0];
      
      // --- NUOVO: Rilevamento automatico separatore ---
      const commaCount = (headerLine.match(/,/g) || []).length;
      const semicolonCount = (headerLine.match(/;/g) || []).length;
      const separator = semicolonCount > commaCount ? ';' : ',';
      // Crea il Regex dinamicamente in base al separatore
      // Spiegazione: Cerca (inizio riga O separatore), seguito da
      // 1. (un campo tra virgolette) OPPURE 2. (un campo non-separatore)
      const csvRegex = new RegExp(`(?:^|${separator})(?:"([^"]*)"|([^${separator}]*))`, 'g');
      // --- FINE NUOVO ---

      // 1. Estrai Intestazioni (Headers)
      let match;
      // Pulisce gli header da eventuali virgolette
      while (match = csvRegex.exec(headerLine)) {
          const header = match[1] ? match[1] : match[2];
          headers.push(header.trim().replace(/^"|"$/g, ''));
      }

      // 2. Estrai Dati (Data)
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue; // Salta righe vuote
        
        const row = [];
        let lineMatch;
        const line = lines[i];
        
        csvRegex.lastIndex = 0; // Resetta l'indice del regex
        
        while (lineMatch = csvRegex.exec(line)) {
            // Pulisce i valori da eventuali virgolette
            const value = (lineMatch[1] ? lineMatch[1] : lineMatch[2]).trim().replace(/^"|"$/g, '');
            row.push(value);
        }
        
        if (row.length > 0) {
             data.push(row);
        }
      }
      return { headers, data };
    }

    /**
     * Copia la lista della spesa formattata negli appunti.
     */
    function copyShoppingListToClipboard() {
      const groupedList = getShoppingListGrouped();
      let textToCopy = "LISTA SPESA:\n\n";

      Object.keys(groupedList).sort().forEach(fornitore => {
        textToCopy += `--- ${fornitore.toUpperCase()} ---\n`;
        groupedList[fornitore].forEach(product => {
          textToCopy += `- ${product.nome}\n`;
        });
        textToCopy += "\n"; // Spazio tra i fornitori
      });
      
      // Usa un trucco per copiare (navigator.clipboard non sempre funziona in iframe)
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";  // Rimuovi dallo schermo
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showCustomAlert('Copiato!', 'Lista della spesa copiata negli appunti.', 'success');
      } catch (err) {
        showCustomAlert('Errore', 'Impossibile copiare la lista.', 'error');
      }
      document.body.removeChild(textArea);
    }
    
    /**
     * Formatta un numero come valuta.
     */
    function formatCurrency(value) {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value || 0);
    }
    
    /**
     * Mostra un alert customizzato (success, error, info).
     */
    function showCustomAlert(title, message, type = 'info') {
      const alert = dom.customAlert.element;
      const icon = dom.customAlert.icon;
      
      // Resetta classi
      alert.classList.remove('bg-green-50', 'bg-red-50', 'bg-blue-50', 'dark:bg-green-800/50', 'dark:bg-red-800/50', 'dark:bg-blue-800/50', 'hidden');
      icon.innerHTML = '';
      dom.customAlert.title.classList.remove('text-green-800', 'text-red-800', 'text-blue-800', 'dark:text-green-200', 'dark:text-red-200', 'dark:text-blue-200');
      dom.customAlert.message.classList.remove('text-green-700', 'text-red-700', 'text-blue-700', 'dark:text-green-300', 'dark:text-red-300', 'dark:text-blue-300');
      dom.customAlert.closeBtn.classList.remove('text-green-400', 'text-red-400', 'text-blue-400', 'hover:text-green-500', 'hover:text-red-500', 'hover:text-blue-500');

      let iconSvg = '';
      let baseColor = '';

      switch (type) {
        case 'success':
          baseColor = 'green';
          iconSvg = `<svg class="h-6 w-6 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
          break;
        case 'error':
          baseColor = 'red';
          iconSvg = `<svg class="h-6 w-6 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`;
          break;
        default: // info
          baseColor = 'blue';
          iconSvg = `<svg class="h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>`;
          break;
      }
      
      alert.classList.add(`bg-${baseColor}-50`, `dark:bg-${baseColor}-800/50`);
      icon.innerHTML = iconSvg;
      dom.customAlert.title.classList.add(`text-${baseColor}-800`, `dark:text-${baseColor}-200`);
      dom.customAlert.message.classList.add(`text-${baseColor}-700`, `dark:text-${baseColor}-300`);
      dom.customAlert.closeBtn.classList.add(`text-${baseColor}-400`, `hover:text-${baseColor}-500`);

      dom.customAlert.title.textContent = title;
      dom.customAlert.message.textContent = message;
      alert.classList.remove('hidden', 'animate-pulse');
      
      // Auto-chiudi dopo 5 secondi
      setTimeout(() => {
        alert.classList.add('hidden');
      }, 5000);
    }


    // --- AVVIO APPLICAZIONE ---
    initApp();

  </script>

</body>
</html>







