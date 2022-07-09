import DateTime from '/js/luxon/src/datetime.js'

// Objet db pour stocker la BDD ouverte
let db;

function getWeek(decalage_semaine=0){
    /* Used to return in the form of W00Y0000 the week and the year requested in relation to today
    Use moment/luxon : https://github.com/moment/luxon
    
    param number decalage_semaine: offset in number of weeks from the current week

    return string : In this format W00Y0000 
    */
    let date = DateTime.now().plus({ weeks: decalage_semaine });
    let week = date.weekNumber;
    let year = date.year;
    return 'W'+week+'Y'+year;
}

function localStorage_consomationtotal(conso_a_ajouter) {
    /* Create the local Storage and calculate the total of the user consummption 
    
    param number conso: number of date in kb
    */
    navigateur.storage.local.get(['consomationtotal'], function (stockage_de_donnees){
        let maconso = stockage_de_donnees.consomationtotal;
        if (maconso == undefined){
            console.log('Creation de consomationtotal en localStorage');
            maconso = parseInt(conso_a_ajouter);
        }else{
            maconso =  parseInt(maconso)+parseInt(conso_a_ajouter);
        }
        navigateur.storage.local.set({'consomationtotal': maconso});

    })
}

function remove_localStorage_consomationtotal(){
    /* Remove the localStorage 'consomationtotal'
    */
    navigateur.storage.local.remove(['consomationtotal']);
}

function merge(object_list){
    /* Merge all object of a list, if 2 object have the same name, the function add the 2 values of the 2 object
    
    param list object_list: list with all object who will be merged 

    return object: one object merge
    */
    let object_merged = object_list.reduce((object_merged, one_object) => {
        for (const [site_name, site_consumption] of Object.entries(one_object)) {
            if (!object_merged[site_name]) {
                object_merged[site_name] = 0;
            }
            object_merged[site_name] += site_consumption;
        }
        return object_merged;
    }, {});
    return object_merged;
}

async function getData(week_of_getWeek){
    /* Take data (sites and conso) stocked

    param string: Week in this format W00Y0000 (obtained by getWeek)
    
    resolve : renvoi le resultat sous forme d'un dico avec site (dico) et consomation (number)
    */
    return new Promise((resolve, reject) => {
        let transaction = db.transaction(['suivi_conso'], 'readwrite'); // ouvrir une transaction (un échange de données) en lecture/écriture
        let objectStore = transaction.objectStore('suivi_conso'); // récupérer l'object store de la base de données qui a été ouvert avec la transaction, l'object store est un accès aux magasins d'objet de la base de données. Le magasin d'objet emmagasine des enregistrements. Chaque enregistrement est constitué d'un couple clé/valeur. Chaque valeurs est indexée sur sa clé. Les clés sont triées pour former l'index primaire du magasin. Ce qui permet un accès rapide et ordonnée aux valeurs.
        let myIndex = objectStore.index('semaine'); // Dans notre magasin 'suivi_conso' On récupère l'objet 'semaine' c'est à partir de lui qu'on va pouvoir lire notre bdd, il nous sert d'index
        let getRequest = myIndex.get(week_of_getWeek); // On va chercher la semaine qui nous interesse grace à getWeek
        getRequest.onsuccess = async function() {
            //console.log(getRequest.result) // let sites = getRequest.result.site;
            resolve(getRequest.result) // la promesse est renvoyée (remplace le return)
        }
        transaction.onerror = function(){
            console.log('Transaction not opened due to error');
        }
   })
}

function addData(dico_data){ //semaine: getWeek(+-n), consomation : parseInt(N), site : {dico site1 : conso1, site2 : conso2}})
    /* 
    
    */
    let transaction = db.transaction(['suivi_conso'], 'readwrite'); // ouvrir une transaction (un échange de données) en lecture/écriture
    let objectStore = transaction.objectStore('suivi_conso'); // récupérer l'object store de la base de données qui a été ouvert avec la transaction, l'object store est un accès aux magasins d'objet de la base de données. Le magasin d'objet emmagasine des enregistrements. Chaque enregistrement est constitué d'un couple clé/valeur. Chaque valeurs est indexée sur sa clé. Les clés sont triées pour former l'index primaire du magasin. Ce qui permet un accès rapide et ordonnée aux valeurs.
    objectStore.add(dico_data); // demander l'ajout de notre nouvel objet à l'object store
    transaction.oncomplete = function() {
        console.log('Transaction completed: database modification finished.');
    }
    transaction.onerror = function(){
        console.log('Transaction not opened due to error');
    }
}

function updateData(dico_data){//semaine: getWeek(+-n), consomation : parseInt(N), site : {dico site1 : conso1, site2 : conso2}})
    /* 
    
    */
    let transaction = db.transaction(['suivi_conso'], 'readwrite'); // ouvrir une transaction (un échange de données) en lecture/écriture
    let objectStore = transaction.objectStore('suivi_conso'); // récupérer l'object store de la base de données qui a été ouvert avec la transaction, l'object store est un accès aux magasins d'objet de la base de données. Le magasin d'objet emmagasine des enregistrements. Chaque enregistrement est constitué d'un couple clé/valeur. Chaque valeurs est indexée sur sa clé. Les clés sont triées pour former l'index primaire du magasin. Ce qui permet un accès rapide et ordonnée aux valeurs.
    let myIndex = objectStore.index('semaine'); // Dans notre magasin 'suivi_conso' On récupère l'objet 'semaine' c'est à partir de lui qu'on va pouvoir lire notre bdd, il nous sert d'index
    let getRequest = myIndex.get(dico_data.semaine); // On va chercher la semaine qui nous interesse grace à getWeek
        getRequest.onsuccess = async function() {
            let data_in_bdd = getRequest.result;
            data_in_bdd.consomation = data_in_bdd.consomation + dico_data.consomation;
            data_in_bdd.site = merge([data_in_bdd.site, dico_data.site]); // fusionne les deux dico, si une entité existe déja son nombre est additionné (GG mec)
            objectStore.put(data_in_bdd);
        }
    transaction.onerror = function(){
        console.log('Transaction not opened due to error');
    }
}

function autoData(dico_data){ // J'espère que ca fonctionne sinon faut reprendre l'ancien ou améliorer celui ci...
    /*
    
    */
    Promise.all([getData(dico_data.semaine)]).then((result) => {
        result = result[0]
        if (result != undefined){
            updateData(dico_data);
        }else{
            addData(dico_data);
        }
    })

}

function displayData(dico_data){
    /*  Ouvre l'object store puis récupère un curseur - qui va nous permettre d'itérer sur les entrées de l'object store, On affiche alors le contenu des itérations
    
    */
    console.log(' ################## ################## ');
    let objectStore = db.transaction('suivi_conso').objectStore('suivi_conso');
    objectStore.openCursor().onsuccess = function(e) {
        let cursor = e.target.result; // Récupère une référence au curseur
        if(cursor) { // S'il reste des entrées sur lesquelles itérer, on exécute ce code
            console.log('@---@');
            console.log(cursor.value.semaine);
            console.log(cursor.value.consomation);
            console.log(cursor.value.site);
            console.log('@-^-@');
            
            cursor.continue(); // Continue l'itération vers la prochaine entrée du curseur
        } else {
            console.log(' ######## Pas d autre données dans la BDD ######## ');
        }
    };
}

function deleteItembyid(id) {
    /* 
    
    */
    let request = db.transaction(["suivi_conso"], "readwrite").objectStore("suivi_conso").delete(id);
    request.onsuccess = function(event) {
        console.log("Entrée surpprimée avec succès !");
        console.log('Suivi_conso ' + id + ' deleted.');
    };
}

function deleteItembyweek(week_of_getWeek) {
    /* 
    
    */
    let transaction = db.transaction(['suivi_conso'], 'readwrite');
    let objectStore = transaction.objectStore('suivi_conso');
  
    let myIndex = objectStore.index('semaine');
    let getRequest = myIndex.get(week_of_getWeek);
    getRequest.onsuccess = function() {
        let ID = getRequest.result.id
        deleteItembyid(ID)
    }
}

function deleteBDD() {
    /* 
    
    */
    let DBDeleteRequest = self.indexedDB.deleteDatabase("suivi_conso");
    DBDeleteRequest.onerror = function(event) {
        console.log("Erreur lors de la suppression de la base");
    };  
    DBDeleteRequest.onsuccess = function(event) {
        console.log("BDD suivi_conso was kill by you !");
        console.log(event.result); // undefined
    };
}

function deleteAllDATA(){
    /* 
    
    */
    deleteBDD()
    remove_localStorage_consomationtotal()
}

async function state_profunStorage(){
    /* 
    
    */
    return new Promise((resolve, reject) => {
        navigateur.storage.local.get(['profunStorage'], function (result) { 
            let etat_du_bouton = result.profunStorage
            resolve(etat_du_bouton);
        })
    })
}

function take_name_site(hosturl){
    var nomsite;

    let indices = []; //Contient tous les indices des points : '.'
    for(let i=0; i<hosturl.length;i++) {
        if (hosturl[i] == ".") indices.push(i);
    }

    let dernierpoint = indices[indices.length-1];
    if (indices.length > 1) {
        let avantdernierpoint = indices[indices.length-2];
        let caschiant = ['mail','outlook','web-mail','messageriepro3','drive','cloud','photos','live','music','webmail'];
        let indexvoila = (caschiant).indexOf(hosturl.substring(0,avantdernierpoint));
        if (indexvoila == -1){
            nomsite = hosturl.substring(avantdernierpoint+1, dernierpoint);
        } else {
            nomsite = hosturl.substring(0,dernierpoint);
        }
    } else {
        nomsite = hosturl.substring(dernierpoint, 0);
    }
    return nomsite;
}

var callback_of_webRequest = function(details){
    /* 
    
    */
    Promise.all([state_profunStorage()]).then((result) => {// si on est en mode pro on stop l'execution
        if (result == false){ return; };
    })

    //On va maintenant récupérer les sites pour ca on lit les url
    let entete = details.responseHeaders;
    let url_txt = details.initiator; // string de l'url
    let url; // Le mettre ici c'est important et pas dans le try dirrectement
    try{
        url = new URL(url_txt); //On créer un objet type URL
    }catch(error){
        return; //si ca n'a pas d'url c'est que c'est pas ce qu'on veut alors on coupe
    }
    let host_url = url.host; // C'est la partie de l'url qui nous interesse 
    
    // Ici on va chercher dans les headers (entête) le poids en octet des éléments, si il en ont pas ont les ignores
    let content_length = entete.find(e => e.name === 'content-length');
    if (content_length == undefined){ return; }; // Si ca n'as pas de masse en octet alors ca nous interesse pas
    
    // On peut maintenant ajouter dans notre local storage la conso
    localStorage_consomationtotal(content_length.value);

    //Maintenant on ajoute cette même conso à la bdd et on ajoute les sites et leur conso
    let nom_du_site = take_name_site(host_url); //On récupère le nom du site
    let object_site = {};
    object_site[nom_du_site] = parseInt(content_length.value);
    autoData({semaine : getWeek(), consomation : parseInt(content_length.value), site : object_site });
}

function calculate_score(data, bdd){
    /* 
    
    */
    let vertuosite = {
        Mails:2835e3,
        Streaming:9.31e9,
        Recherches:8.1e6,
        Reseaux_Sociaux:0.49e9,
        Autres:1.02e9+100e6 //autre contient autre ecommerce et cloud
    }

    let score = 0;
    let web_site = [];
    let consomation_par_categorie = []
    let empty_categorie = {Streaming:0,Mails:0,Recherches:0,Reseaux_Sociaux:0,Autres:0,Cloud :0,E_commerce:0}
    
    for (let el of data){
        if(el != undefined){
            web_site.push(el.site);
        }else{
            web_site.push({});
        }
        consomation_par_categorie.push(JSON.parse(JSON.stringify(empty_categorie))); //JSON.parse(JSON.stringify(monObjet)) permet le clonage d'un objet
    }
    for (let i=0; i<web_site.length ; i++){
        for (let site in web_site[i]){
            let count = 0;
            for (let categorie in bdd){
                if (bdd[categorie].indexOf(site) != -1){
                    consomation_par_categorie[i][categorie] += Math.round(web_site[i][site]);
                }else{
                    count++
                }
                if (i==6){
                    consomation_par_categorie[i]['Autres'] += Math.round(web_site[i][site]);
                }
                
            }
        }
        consomation_par_categorie[i]['Autres'] +=  consomation_par_categorie[i]['E_commerce'] +  consomation_par_categorie[i]['Cloud'];
        consomation_par_categorie[i]['E_commerce'] = consomation_par_categorie[i]['Cloud'] = 0;        
    }

    let day = new Date().getDay();
    let coefficient_multiplicateur_semaine_precedente = 1-(day/7);
    let consomation_semaine_actuelle = consomation_par_categorie[0];
    let consomation_semaine_precedente = consomation_par_categorie[1];
    
    for (let categorie in vertuosite){
        let conso_equivalent_une_semaine_1_categorie = consomation_semaine_actuelle[categorie] + consomation_semaine_precedente[categorie]*coefficient_multiplicateur_semaine_precedente;
        if (conso_equivalent_une_semaine_1_categorie < vertuosite[categorie]){
            score += 20;
        }else{
            let exces10 = (vertuosite[categorie]/10);
            let excesabs = conso_equivalent_une_semaine_1_categorie-(vertuosite[categorie]);
            let pertedepoint = excesabs / exces10;
            if (pertedepoint>20){
                //pertedepoint = 20;
            }
            score += 20-pertedepoint;
        }
    }
    score = Math.round(score);
    navigateur.storage.local.set({'Score': score});
}

// Opera 8.0+
var isOpera = (!!self.opr && !!opr.addons) || !!self.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
// Firefox 1.0+
var isFirefox = typeof InstallTrigger !== 'undefined';
// Safari 3.0+ "[object HTMLElementConstructor]" 
var isSafari = /constructor/i.test(self.HTMLElement) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!self['safari'] || (typeof safari !== 'undefined' && self['safari'].pushNotification));
// Chrome 1 - 79
var isChrome = !!self.chrome && (!!self.chrome.webstore || !!self.chrome.runtime);
// Edge (based on chromium) detection
var isEdgeChromium = isChrome && (navigator.userAgent.indexOf("Edg") != -1);
// Blink engine detection
var isBlink = (isChrome || isOpera) && !!self.CSS;

var navigateur;
if (isChrome || isEdgeChromium){navigateur = chrome;}
else if (isFirefox){navigateur = browser;}

var filter = { urls: ['<all_urls>']};
var opt_extraInfoSpec = ['responseHeaders'];
navigateur.webRequest.onHeadersReceived.addListener(
    callback_of_webRequest, filter, opt_extraInfoSpec
);
// Ouvrir la BDD; elle sera créée si elle n'existe pas déjà
let request = self.indexedDB.open('suivi_conso', 1);
request.onerror = function() {
    console.log('Database failed to open');
};
request.onsuccess = function() {
    console.log('Database opened successfully');
    // Stocke la base de données ouverte dans la variable db. On l'utilise par la suite
    db = request.result;
    displayData(); 
    Promise.all([getData(getWeek()),getData(getWeek(-1))]).then((datas) => {
        fetch("/bdd_sites.json").then(mockResponses => {
            return mockResponses.json();
        }).then(bddsite =>calculate_score(datas,bddsite));
    });
}

// Spécifie les tables de la BDD si ce n'est pas déjà pas fait
request.onupgradeneeded = function(e) {
    // Récupère une référence à la BDD ouverte
    let db = e.target.result;
    // Crée un objectStore pour stocker nos notes (une table)
    // Avec un champ qui s'auto-incrémente comme clé
    let objectStore = db.createObjectStore('suivi_conso', { keyPath: 'id', autoIncrement:true });
    // Définit les champs que l'objectStore contient
    objectStore.createIndex('semaine', 'semaine', { unique: true });
    objectStore.createIndex('consomation', 'consomation', { unique: false });
    objectStore.createIndex('site', 'site', { unique: false });
    console.log('Database setup complete');
};