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

// --- PAGE : AUDIO LAB (audiolab.html) ---
if (window.location.href.includes('audiolab')) {
    const gainSlider = document.getElementById('bass-gain');
    const freqSlider = document.getElementById('bass-freq');
    const processBtn = document.getElementById('process-btn');

    // Fonction globale pour les presets (appelée depuis le HTML)
    window.setPreset = function(level) {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('selected'));
        event.currentTarget.classList.add('selected');

        switch(level) {
            case 'light': gainSlider.value = 3; freqSlider.value = 60; break;
            case 'medium': gainSlider.value = 6; freqSlider.value = 80; break;
            case 'moderate': gainSlider.value = 10; freqSlider.value = 100; break;
            case 'heavy': gainSlider.value = 15; freqSlider.value = 120; break;
            case 'extreme': gainSlider.value = 25; freqSlider.value = 150; break;
        }
        updateAudioDisplay();
    }

    function updateAudioDisplay() {
        document.getElementById('bass-display').innerText = gainSlider.value + " dB";
        document.getElementById('freq-display').innerText = freqSlider.value + " Hz";
    }

    if(gainSlider) gainSlider.addEventListener('input', updateAudioDisplay);
    if(freqSlider) freqSlider.addEventListener('input', updateAudioDisplay);

    if(processBtn) {
        processBtn.addEventListener('click', async () => {
            if (!fileInput.files.length) { log("Erreur : Aucun fichier audio !", "error"); return; }
            
            const file = fileInput.files[0];
            const gain = gainSlider.value;
            const freq = freqSlider.value;
            
            processBtn.disabled = true;
            log("Chargement du moteur Audio...");
            
            if(!ffmpeg.isLoaded()) await ffmpeg.load();
            
            log("Écriture du fichier...");
            ffmpeg.FS('writeFile', 'input.mp3', await fetchFile(file));
            
            log(`Traitement : Basses +${gain}dB @ ${freq}Hz...`);
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