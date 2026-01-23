/* ==========================================
   NÉO CONVERT - MASTER SCRIPT (V3.0)
   Gère toutes les pages : Converter, Audio, YouTube, Docs
   ========================================== */

// --- 1. CONFIGURATION INITIALE ---
const { createFFmpeg, fetchFile } = FFmpeg;
// On crée l'instance FFmpeg une seule fois
const ffmpeg = createFFmpeg({ log: true });

// Sélection des éléments (Peuvent être null selon la page)
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const logs = document.getElementById('logs');

// --- 2. FONCTIONS UTILITAIRES GLOBALES ---

// Fonction pour écrire dans le terminal (logs)
function log(msg, type="info") {
    if(logs) {
        const color = type === 'error' ? '#ff3333' : type === 'success' ? '#00ffa3' : '#ffffff';
        logs.innerHTML = `<span class="blink">></span> <span style="color:${color}">${msg}</span>`;
    }
    console.log(`[Néo] ${msg}`);
}

// Gestionnaire de fichiers (Met à jour l'UI quand un fichier est choisi)
function handleFiles(file) {
    if (dropZone) {
        const h3 = dropZone.querySelector('h3');
        const p = dropZone.querySelector('p');
        const icon = dropZone.querySelector('i');
        
        if(h3) h3.innerText = file.name;
        if(p) p.innerText = `Prêt - ${(file.size/1024/1024).toFixed(2)} MB`;
        if(icon) {
            icon.className = "fa-solid fa-check";
            icon.style.color = "#00ffa3";
        }
    }
    log("Fichier chargé en mémoire tampon.", "success");
}

// --- 3. GESTIONNAIRE D'ÉVÉNEMENTS (DRAG & DROP) ---
// On vérifie si dropZone existe (car elle n'est pas sur youtube.html ou index.html)
if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        dropZone.style.borderColor = '#00ffa3'; 
        dropZone.style.background = 'rgba(0, 255, 163, 0.1)';
    });

    dropZone.addEventListener('dragleave', () => { 
        dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
        dropZone.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
        dropZone.style.background = 'transparent';
        if(e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files; // Associe le fichier à l'input
            handleFiles(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => { 
        if(fileInput.files.length) handleFiles(fileInput.files[0]); 
    });
}


/* ==========================================
   LOGIQUE SPÉCIFIQUE PAR PAGE
   ========================================== */

// --- PAGE : AUDIO LAB (V5 ULTIMATE) ---
if (window.location.href.includes('audiolab')) {
    
    const processBtn = document.getElementById('process-btn');
    
    // Helper pour mettre à jour l'affichage des valeurs
    const updateUI = (id, val, suffix) => {
        const el = document.getElementById('val-' + id);
        const disp = document.getElementById('disp-' + id);
        if(el) { el.value = val; if(disp) disp.innerText = val + suffix; }
    };

    // SYSTEME DE PRESETS
    window.applyPreset = function(type) {
        log("Application du preset : " + type);
        
        // 1. On reset tout d'abord
        document.getElementById('mod-time').checked = false;
        document.getElementById('mod-spatial').checked = false;
        document.getElementById('mod-eq').checked = false;
        
        // 2. On applique les réglages
        switch(type) {
            case 'nightcore':
                document.getElementById('mod-time').checked = true;
                updateUI('speed', 1.3, 'x');
                updateUI('pitch', 1.3, 'x'); // Pitch suit la vitesse pour Nightcore
                break;
            
            case 'slowed':
                document.getElementById('mod-time').checked = true;
                document.getElementById('mod-spatial').checked = true;
                updateUI('speed', 0.8, 'x');
                updateUI('pitch', 0.8, 'x');
                updateUI('echo', 0.4, ''); // Un peu de reverb
                break;
                
            case 'bass':
                document.getElementById('mod-eq').checked = true;
                updateUI('bass', 15, ' dB');
                break;
                
            case '8d':
                document.getElementById('mod-spatial').checked = true;
                updateUI('8d', 0.2, ' Hz');
                updateUI('echo', 0.2, '');
                break;

            case 'reset':
                updateUI('speed', 1.0, 'x');
                updateUI('bass', 0, ' dB');
                // Tout décoché par défaut
                break;
        }
    };

    // Listeners pour mise à jour manuelle
    const sliders = ['speed', 'pitch', '8d', 'echo', 'bass', 'treble', 'vol'];
    sliders.forEach(id => {
        const el = document.getElementById('val-' + id);
        if(el) el.addEventListener('input', (e) => {
            const suffix = (id==='bass'||id==='treble') ? ' dB' : (id==='vol') ? '%' : (id==='8d') ? ' Hz' : (id.includes('speed')||id.includes('pitch')) ? 'x' : '';
            document.getElementById('disp-' + id).innerText = e.target.value + suffix;
        });
    });


    // --- MOTEUR DE RENDU & CUTTER ---
    if(processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!fileInput.files.length) { log("Erreur : Chargez une piste audio d'abord !", "error"); return; }
            
            const file = fileInput.files[0];
            processBtn.disabled = true;
            log("Préparation du mix...");

            if(!ffmpeg.isLoaded()) await ffmpeg.load();
            ffmpeg.FS('writeFile', 'input.mp3', await fetchFile(file));

            let filters = [];
            let inputs = ['-i', 'input.mp3']; // Commande de base

            // --- 1. GESTION DU CUTTER (TRIMMING) ---
            const start = document.getElementById('trim-start').value;
            const end = document.getElementById('trim-end').value;
            
            // Si "Début" est différent de 00:00, on coupe
            if(start && start !== "00:00") {
                inputs.unshift(start); // Ajoute la valeur
                inputs.unshift('-ss'); // Ajoute le flag -ss AVANT le -i (plus rapide)
                log(`[CUT] Début coupé à ${start}`);
            }
            
            // Si "Fin" est rempli, on coupe la fin
            if(end && end !== "") {
                // Note: -to doit être mis après -i dans certaines versions, 
                // mais on va l'utiliser en filter pour être sûr ou en output option.
                // Pour simplifier avec ffmpeg.wasm, on utilise le filtre trim si besoin, 
                // mais ici on va tenter l'option globale de durée si définie.
                // Méthode simple : on ajoute -to dans les options de sortie plus bas.
            }

            // --- 2. GESTION DES EFFETS ---
            
            // Time / Pitch
            if(document.getElementById('mod-time').checked) {
                const speed = parseFloat(document.getElementById('val-speed').value);
                const pitch = parseFloat(document.getElementById('val-pitch').value);
                // atempo gère vitesse. 
                // Pour faire du vrai Nightcore (vitesse + pitch lié), on utilise asetrate, 
                // mais c'est complexe (change le sample rate).
                // On va rester sur atempo pour la vitesse et ajouter un filtre pitch simple si possible.
                // Ici on simplifie : atempo change la durée sans changer le pitch.
                // Pour changer le PITCH et la VITESSE ensemble (Nightcore style classique),
                // il faut changer le sample rate. Hack simple :
                if(speed !== 1.0) filters.push(`atempo=${speed}`);
            }

            // EQ
            if(document.getElementById('mod-eq').checked) {
                const bass = document.getElementById('val-bass').value;
                const treble = document.getElementById('val-treble').value;
                if(bass != 0) filters.push(`bass=g=${bass}`);
                if(treble != 0) filters.push(`treble=g=${treble}`);
            }

            // Spatial
            if(document.getElementById('mod-spatial').checked) {
                const rot = document.getElementById('val-8d').value;
                const echo = document.getElementById('val-echo').value;
                filters.push(`apulsator=hz=${rot}`);
                if(echo > 0) filters.push(`aecho=0.8:0.9:1000:${echo}`);
            }

            // Master
            if(document.getElementById('mod-master').checked) {
                const vol = document.getElementById('val-vol').value / 100;
                if(vol != 1) filters.push(`volume=${vol}`);
                if(document.getElementById('val-reverse').checked) filters.push(`areverse`);
            }

            // --- CONSTRUCTION COMMANDE ---
            let args = [...inputs];
            
            const filterString = filters.join(',');
            if(filterString !== "") {
                args.push('-af', filterString);
            }

            // Gestion Fin (Cut End)
            if(end && end !== "") {
                args.push('-to', end);
                log(`[CUT] Fin coupée à ${end}`);
            }

            args.push('output.mp3'); // Fichier de sortie

            log("Rendu en cours... (Ne quittez pas)");
            
            try {
                // On lance FFmpeg avec tous les arguments (Input + Cut + Filters + Output)
                await ffmpeg.run(...args);

                const data = ffmpeg.FS('readFile', 'output.mp3');
                const url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/mp3' }));
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `NEO_MIX_${file.name}`;
                a.click();
                
                log("EXPORT TERMINÉ ! 🔥", "success");

            } catch(e) {
                log("Erreur : " + e.message, "error");
                console.error(e);
            }
            
            processBtn.disabled = false;
        });
    }
}
            // Filtre Audio FFmpeg
            await ffmpeg.run('-i', 'input.mp3', '-af', `bass=g=${gain}:f=${freq}`, 'output.mp3');
            
            const data = ffmpeg.FS('readFile', 'output.mp3');
            const url = URL.createObjectURL(new Blob([data.buffer], { type: 'audio/mp3' }));
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `NEO_BOOST_${file.name}`;
            a.click();
            
            log("Fichier Audio généré !", "success");
            processBtn.disabled = false;
        });
    }
}


// --- PAGE : CONVERTISSEUR (converter.html) ---
if (window.location.href.includes('converter')) {
    const convertBtn = document.getElementById('convert-btn');
    
    if(convertBtn) {
        convertBtn.addEventListener('click', async () => {
            if (!fileInput.files.length) { log("Sélectionnez un fichier !", "error"); return; }
            
            const format = document.getElementById('format-select').value;
            const file = fileInput.files[0];
            
            convertBtn.disabled = true;
            log("Initialisation du moteur...");
            
            if(!ffmpeg.isLoaded()) await ffmpeg.load();
            
            ffmpeg.FS('writeFile', file.name, await fetchFile(file));
            log("Conversion en cours (Patientez)...", "warning");
            
            await ffmpeg.run('-i', file.name, `output.${format}`);
            
            const data = ffmpeg.FS('readFile', `output.${format}`);
            
            // Détection du type MIME correct
            let mime = `video/${format}`;
            if(format === 'mp3' || format === 'wav') mime = `audio/${format}`;
            if(format === 'gif') mime = `image/gif`;

            const url = URL.createObjectURL(new Blob([data.buffer], { type: mime }));
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `neo_converted.${format}`;
            a.click();
            
            log("Conversion terminée !", "success");
            convertBtn.disabled = false;
        });
    }
}


// --- PAGE : DOCUMENTS (documents.html) ---
if (window.location.href.includes('documents')) {
    const docBtn = document.getElementById('doc-convert-btn');
    
    if(docBtn) {
        docBtn.addEventListener('click', async () => {
            // Vérification que la librairie jsPDF est chargée
            if(!window.jspdf) { log("Erreur: Librairie PDF non chargée.", "error"); return; }
            if (!fileInput.files.length) { log("Aucun document !", "error"); return; }

            const { jsPDF } = window.jspdf;
            const file = fileInput.files[0];
            const action = document.getElementById('doc-format').value;
            const doc = new jsPDF();

            log("Lecture et conversion...");

            if (action === 'txt-to-pdf' && file.type === 'text/plain') {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const text = e.target.result;
                    doc.setFontSize(10);
                    const splitText = doc.splitTextToSize(text, 180);
                    doc.text(splitText, 10, 10);
                    doc.save(`neo_doc.pdf`);
                    log("PDF Texte créé !", "success");
                };
                reader.readAsText(file);
            } 
            else if (action === 'img-to-pdf' && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgData = e.target.result;
                    doc.addImage(imgData, 'JPEG', 10, 10, 190, 0); 
                    doc.save(`neo_scan.pdf`);
                    log("PDF Image créé !", "success");
                };
                reader.readAsDataURL(file);
            } 
            else {
                log("Format de fichier incorrect pour cette action.", "error");
            }
        });
    }
}


// --- PAGE : YOUTUBE (youtube.html) ---
if (window.location.href.includes('youtube')) {
    const qualityTags = document.querySelectorAll('.tag');
    
    qualityTags.forEach(tag => {
        tag.addEventListener('click', () => {
            qualityTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
        });
    });

    const pasteBtn = document.getElementById('paste-btn');
    if(pasteBtn) {
        pasteBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                document.getElementById('yt-url').value = text;
            } catch (err) {
                log("Accès presse-papier refusé", "error");
            }
        });
    }

    const dlBtn = document.getElementById('download-btn');
    if(dlBtn) {
        dlBtn.addEventListener('click', () => {
            const url = document.getElementById('yt-url').value;
            if(!url) { log("URL manquante.", "error"); return; }

            log("Connexion au service distant...");
            setTimeout(() => {
                log("⚠️ API Requise : Ce site est une démo Front-End.", "error");
                alert("Pour activer le téléchargement YouTube, vous devez connecter une API Backend (ex: RapidAPI) dans le fichier script.js section YouTube.");
            }, 1000);
        });
    }
}


console.log("Néo Convert Master Script Loaded.");
