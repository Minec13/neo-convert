// Fonction pour gérer les onglets
function openTab(tabName) {
    // 1. Cacher tous les contenus
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(content => {
        content.style.display = 'none';
    });

    // 2. Enlever la classe "active" de tous les boutons
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
    });

    // 3. Afficher le contenu demandé
    document.getElementById(tabName).style.display = 'block';

    // 4. Ajouter la classe "active" sur le bouton cliqué (c'est un peu astucieux ici)
    event.currentTarget.classList.add('active');
}

// Petit message de test console
console.log("Néo Convert est prêt à démarrer !");