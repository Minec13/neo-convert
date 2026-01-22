// GESTION DES ONGLETS
function switchTab(tabId, btnElement) {
    // Masquer tout
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Afficher la cible
    document.getElementById(tabId).style.display = 'block';
    document.getElementById(tabId).animate([
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 300, easing: 'ease-out' });
    
    // Activer bouton
    btnElement.classList.add('active');
}

// MISE A JOUR DES SLIDERS AUDIO
function updateVal(id, value) {
    document.getElementById(id).innerText = value + '%';
}

// GESTION DRAG & DROP (Effet visuel)
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

// Clic sur la zone ouvre l'explorateur
dropZone.addEventListener('click', () => fileInput.click());

// Quand on survole avec un fichier
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

// Quand on quitte la zone
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

// Quand on lâche le fichier
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFiles(files[0]);
    }
});

// Quand on sélectionne via l'explorateur
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFiles(fileInput.files[0]);
    }
});

function handleFiles(file) {
    // Mise à jour de l'interface pour montrer que le fichier est pris
    document.querySelector('.drop-zone h3').innerText = file.name;
    document.querySelector('.drop-zone p').innerText = `Taille : ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    document.querySelector('.icon-circle i').className = "fa-solid fa-check";
    document.querySelector('.icon-circle i').style.color = "#00ffa3";
    
    document.getElementById('logs').innerHTML = `<span class="blink">></span> Fichier "${file.name}" prêt pour conversion.`;
}

console.log("Néo Convert Pro Loaded.");
