import DateTime from '/js/luxon/src/datetime.js'

// Objet db pour stocker la BDD ouverte 
let db;

function getWeek(week_shift = 0){
    /* Takes into account today's date and calculates the date with a specific week shift. Returns a string in W00Y0000 format.
    
    Use of the DateTime library available on : https://github.com/moment/luxon
    param number week_shift : offset in number of weeks from the current week
    */
    let date = DateTime.now().plus({ weeks: week_shift });
    let week = date.weekNumber;
    let year = date.year;
    return 'W'+week+'Y'+year;
}

function localStorage_overallconsumption(consumption_to_add) {
    /* Creates the user's database local Storage and stores his overall consumption of data in bytes
    param number consumption : data used by the web user in kb
    */
    navigateur.storage.local.get(['overallconsumption'], function (data_storage){
        let myconsumption = data_storage.overallconsumption;
        if (myconsumption == undefined){
            console.log('Overallconsumption creation in localStorage');
            myconsumption = parseInt(consumption_to_add);
        }else{
            myconsumption =  parseInt(myconsumption)+parseInt(consumption_to_add);
        }
        navigateur.storage.local.set({'overallconsumption': myconsumption});

    })
}

function remove_localStorage_overallconsumption(){
    // Deletes the overall consumption from the local Storage database
    
    navigateur.storage.local.remove(['overallconsumption']);
}

function merge(objects_list){
    /* Merge all object of a list, if 2 object have the same name, the function add the 2 values of the 2 objects
    
    param list objects_list : list with all the objects which will be merged
    return object : one merged objects
    */
    let merged_object = objects_list.reduce((merged_object, one_object) => {
        for (const [website_name, website_consumption] of Object.entries(one_object)) {
            if (!merged_object[website_name]) {
                merged_object[website_name] = 0;
            }
            merged_object[website_name] += website_consumption;
        }
        return merged_object;
    }, {});
    return merged_object;
}

async function getData(week_of_getWeek){
    /* Uses data (websites and consumption) stored in the indexedDB (database) and creates a dictionnary with website and all the consumption on this website
    
    param string : Week in W00Y0000 format obtained by the getWeek function
    resolve : return the result in the form of a dictionnary with this form : {week format W00Y0000, consomation : parseInt(N), site : {web_site_1 : consumption1, web_site_2 : consumption2}}
    */
    return new Promise((resolve, reject) => {
        let transaction = db.transaction(['consumption_tracking'], 'readwrite'); // Opens a transaction (data exchange) in read/write
        let objectStore = transaction.objectStore('consumption_tracking'); // Retrieves the store object from the database opened by the transaction. The store object is an access to objects storages in the database. The objects storage stores recordings & each recording is composed of a key/value pair. Each value is indexed to its key. Keys are sorted to form the storage's primary index which allows a quick & organised access to values.
        let myIndex = objectStore.index('week'); // Retrieves the 'week' object in the 'consumption_tracking' storage. Thanks to this object, we'll be able to read our database, 'week' is used as an index.
        getRequest.onsuccess = async function() {
            //console.log(getRequest.result) // let sites = getRequest.result.site;
            resolve(getRequest.result) // Promise is returned
        }
        transaction.onerror = function(){
            console.log('Transaction not opened due to error');
        }
   })
}

function addData(data_dictionnary){
    /* 
    Adds new objects to the store object in the following format : {week: getWeek(+-n), consomation : parseInt(N), site : {dico site1 : conso1, site2 : conso2}}
    */
    let transaction = db.transaction(['consumption_tracking'], 'readwrite'); // Opens a transaction (data exchange) in read/write
    let objectStore = transaction.objectStore('consumption_tracking'); // Retrieves the store object from the database opened by the transaction. The store object is an access to objects storages in the database. The objects storage stores recordings & each recording is composed of a key/value pair. Each value is indexed to its key. Keys are sorted to form the storage's primary index which allows a quick & organised access to values.
    objectStore.add(data_dictionnary); // Requests to add the new object to the store object
    transaction.oncomplete = function() {
        console.log('Transaction completed : database modification finished.');
    }
    transaction.onerror = function(){
        console.log('Transaction not opened due to error');
    }
}

function updateData(data_dictionnary){//week: getWeek(+-n), consomation : parseInt(N), site : {dico site1 : conso1, site2 : conso2}})
    /* 
    Adds new objects to the store object in the following format : {week: getWeek(+-n), consomation : parseInt(N), site : {dico site1 : conso1, site2 : conso2}}
    */
    let transaction = db.transaction(['consumption_tracking'], 'readwrite'); // Opens a transaction (data exchange) in read/write
    let objectStore = transaction.objectStore('consumption_tracking'); // Retrieves the store object from the database opened by the transaction. The store object is an access to objects storages in the database. The objects storage stores recordings & each recording is composed of a key/value pair. Each value is indexed to its key. Keys are sorted to form the storage's primary index which allows a quick & organised access to values.
    let myIndex = objectStore.index('week'); // Retrieves the 'week' object in the 'consumption_tracking' storage. Thanks to this object, we'll be able to read our database, 'week' is used as an index.
    let getRequest = myIndex.get(data_dictionnary.week); // Gets the interested week by getWeek function
        getRequest.onsuccess = async function() {
            let data_in_bdd = getRequest.result;
            data_in_bdd.consomation = data_in_bdd.consomation + data_dictionnary.consomation;
            data_in_bdd.site = merge([data_in_bdd.site, data_dictionnary.site]); // fusionne les deux dico, si une entité existe déja son nombre est additionné (GG mec)
            objectStore.put(data_in_bdd);
        }
    transaction.onerror = function(){
        console.log('Transaction not opened due to error');
    }
}

function autoData(data_dictionnary){ // J'espère que ca fonctionne sinon faut reprendre l'ancien ou améliorer celui ci...
    /*
    
    */
    Promise.all([getData(data_dictionnary.week)]).then((result) => {
        result = result[0]
        if (result != undefined){
            updateData(data_dictionnary);
        }else{
            addData(data_dictionnary);
        }
    })

}

function displayData(data_dictionnary){
    /*  Ouvre l'object store puis récupère un curseur - qui va nous permettre d'itérer sur les entrées de l'object store, On affiche alors le contenu des itérations
    
    */
    console.log(' ################## ################## ');
    let objectStore = db.transaction('consumption_tracking').objectStore('consumption_tracking');
    objectStore.openCursor().onsuccess = function(e) {
        let cursor = e.target.result; // Récupère une référence au curseur
        if(cursor) { // S'il reste des entrées sur lesquelles itérer, on exécute ce code
            console.log('@---@');
            console.log(cursor.value.week);
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
    let request = db.transaction(["consumption_tracking"], "readwrite").objectStore("consumption_tracking").delete(id);
    request.onsuccess = function(event) {
        console.log("Entrée surpprimée avec succès !");
        console.log('consumption_tracking ' + id + ' deleted.');
    };
}

function deleteItembyweek(week_of_getWeek) {
    /* 
    
    */
    let transaction = db.transaction(['consumption_tracking'], 'readwrite');
    let objectStore = transaction.objectStore('consumption_tracking');
  
    let myIndex = objectStore.index('week');
    let getRequest = myIndex.get(week_of_getWeek);
    getRequest.onsuccess = function() {
        let ID = getRequest.result.id
        deleteItembyid(ID)
    }
}

function deleteBDD() {
    /* 
    
    */
    let DBDeleteRequest = self.indexedDB.deleteDatabase("consumption_tracking");
    DBDeleteRequest.onerror = function(event) {
        console.log("Erreur lors de la suppression de la base");
    };  
    DBDeleteRequest.onsuccess = function(event) {
        console.log("BDD consumption_tracking was kill by you !");
        console.log(event.result); // undefined
    };
}

function deleteAllDATA(){
    /* 
    
    */
    deleteBDD()
    remove_localStorage_overallconsumption()
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
    localStorage_overallconsumption(content_length.value);

    //Maintenant on ajoute cette même conso à la bdd et on ajoute les sites et leur conso
    let nom_du_site = take_name_site(host_url); //On récupère le nom du site
    let object_site = {};
    object_site[nom_du_site] = parseInt(content_length.value);
    autoData({week : getWeek(), consomation : parseInt(content_length.value), site : object_site });
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
    let coefficient_multiplicateur_week_precedente = 1-(day/7);
    let consomation_week_actuelle = consomation_par_categorie[0];
    let consomation_week_precedente = consomation_par_categorie[1];
    
    for (let categorie in vertuosite){
        let conso_equivalent_une_week_1_categorie = consomation_week_actuelle[categorie] + consomation_week_precedente[categorie]*coefficient_multiplicateur_week_precedente;
        if (conso_equivalent_une_week_1_categorie < vertuosite[categorie]){
            score += 20;
        }else{
            let exces10 = (vertuosite[categorie]/10);
            let excesabs = conso_equivalent_une_week_1_categorie-(vertuosite[categorie]);
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
let request = self.indexedDB.open('consumption_tracking', 1);
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
    let objectStore = db.createObjectStore('consumption_tracking', { keyPath: 'id', autoIncrement:true });
    // Définit les champs que l'objectStore contient
    objectStore.createIndex('week', 'week', { unique: true });
    objectStore.createIndex('consomation', 'consomation', { unique: false });
    objectStore.createIndex('site', 'site', { unique: false });
    console.log('Database setup complete');
};
