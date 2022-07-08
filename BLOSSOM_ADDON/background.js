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
    chrome.storage.local.get(['consomationtotal'], function (stockage_de_donnees){
        let maconso = stockage_de_donnees.consomationtotal;
        if (maconso == undefined){
            console.log('Creation de consomationtotal en localStorage');
            maconso = parseInt(conso_a_ajouter);
        }else{
            maconso =  parseInt(maconso)+parseInt(conso_a_ajouter);
        }
        chrome.storage.local.set({'consomationtotal': maconso});

    })
}

function remove_localStorage_consomationtotal(){
    /* Remove the localStorage 'consomationtotal'
    */
    chrome.storage.local.remove(['consomationtotal']);
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
    console.log(' ################## ############################### ################## ');
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
            console.log(' ################## Pas d autre données dans la BDD ################## ');
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

var callback_of_webRequest = function(details){
    /* 
    
    */
    let entete = details.responseHeaders
    let url = details.initiator
}

var filter = { urls: ['<all_urls>']};
var opt_extraInfoSpec = ['responseHeaders'];
chrome.webRequest.onHeadersReceived.addListener(
    callback_of_webRequest, filter, opt_extraInfoSpec
);