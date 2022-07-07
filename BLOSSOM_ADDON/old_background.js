// Objet db pour stocker la BDD ouverte
let db;

function getWeek(bf=0) {
    let currentdate = new Date();
    let dowOffset = new Date(currentdate.getDay(), 0, 0);
    dowOffset = typeof(dowOffset) == 'number' ? dowOffset : 0; 
    var newYear = new Date(currentdate.getFullYear(),0,1);
    var day = newYear.getDay() - dowOffset; 
    day = (day >= 0 ? day : day + 7);
    var daynum = Math.floor((currentdate.getTime() - newYear.getTime() - 
    (currentdate.getTimezoneOffset()-newYear.getTimezoneOffset())*60000)/86400000) + 1;
    var weeknum;
    if(day < 4) {
        weeknum = Math.floor((daynum+day-1)/7) + 1;
        if(weeknum > 52) {
            let nYear = new Date(currentdate.getFullYear() + 1,0,1);
            let nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            weeknum = nday < 4 ? 1 : 53;
        }
    }
    else {
        weeknum = Math.floor((daynum+day-1)/7);
    }
    let wee = weeknum + bf;
    let y = new Date().getFullYear()
    if (wee <= 0) { 
        wee = 52+wee;
        y = y-1
    };
    var txt = 'W'+wee+'Y'+y
    return txt
};

function localStorage_consomationtotal(addconso) {
    chrome.storage.local.get(['consomationtotal'], function (MAconso) {
        let maconso = MAconso.consomationtotal 
        if (!(maconso > -1)) { //C'est de la merde cette vérif ca ne fonctionne pas
            chrome.storage.local.set({'consomationtotal': 0},function(){
                console.log('Creation de consomationtotal en localStorage');
            }); 
        }
        consoso = parseInt(maconso)+parseInt(addconso)
        chrome.storage.local.set({'consomationtotal': consoso});
    }); 
}

function remove_localStorage_consomationtotal(){
    chrome.storage.local.remove(['consomationtotal'])
}
async function GetSite(n) {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(['suivi_conso'], 'readwrite');
        var objectStore = transaction.objectStore('suivi_conso');
        var myIndex = objectStore.index('semaine');
        var getRequest = myIndex.get(getWeek(n));
        getRequest.onsuccess = async function() {
            let sites;
            try {
                sites = getRequest.result.site;
            } catch (error) {   // c'est un peu violant faut gérer la bonne erreur
            sites = []
            }
            resolve(sites)
        }
    });
}
function start(siteS,bdd){
    let sites0 = siteS[0]
    let sites1 = siteS[-1]
    var score = 0
    var consoparcategorie0 = {Streaming:0,Mails:0,Recherches:0,Reseaux_Sociaux:0,Autres:0,Cloud :0,E_commerce:0}
    var consoparcategorie1 = {Streaming:0,Mails:0,Recherches:0,Reseaux_Sociaux:0,Autres:0,Cloud :0,E_commerce:0}
    for (let site in sites0){
        let i = 0
        for (categorie in bdd) {
            if (bdd[categorie].indexOf(site) != -1) {
                consoparcategorie0[categorie] += Math.round(sites0[site])
            }else{i++}
            if (i==6){
                consoparcategorie0['Autres'] += Math.round(sites0[site])
            }
        }
    }
    for (let site in sites1){
        let i = 0
        for (categorie in bdd) {
            if (bdd[categorie].indexOf(site) != -1) {
                consoparcategorie1[categorie] += Math.round(sites1[site])
            }else{i++}
            if (i==6){
                consoparcategorie1['Autres'] += Math.round(sites1[site])
            }
        }
    }
    // ---
    var virtuosite = {
        Mails:2835e3,
        Streaming:9.31e9,
        Recherches:8.1e6,
        Reseaux_Sociaux:0.49e9,
        Autres:1.02e9+100e6 //autre contient autre ecommerce et cloud
    }
    consoparcategorie0['Autres'] = consoparcategorie0['Autres'] + consoparcategorie0['E_commerce'] + consoparcategorie0['Cloud']
    consoparcategorie0['E_commerce'] = consoparcategorie0['Cloud'] =0
    consoparcategorie1['Autres'] = consoparcategorie1['Autres'] + consoparcategorie1['E_commerce'] + consoparcategorie1['Cloud']
    consoparcategorie1['E_commerce'] = consoparcategorie1['Cloud'] =0
    let day=new Date().getDay()
    var multiplicateur = 1-(day/7)
    for (var cactegorie in virtuosite){
        let conso7 = consoparcategorie0[cactegorie] + consoparcategorie1[cactegorie]*multiplicateur
        //console.log(cactegorie,(conso7/virtuosite[cactegorie])*100+'%')
        if (conso7 < virtuosite[cactegorie]) {
            score += 20
        }else{
            let exces10 = (virtuosite[cactegorie]/10)
            let excesabs = conso7-(virtuosite[cactegorie])
            let pertedepoint = excesabs/ exces10
            if (pertedepoint>20){
                pertedepoint =20
            }
            score += 20-pertedepoint
        }
    }
    score = Math.round(score)
    chrome.storage.local.set({'Score': score});
}

var callback = function(details) {
    //console.log('--- ici ---')
    var entete = details.responseHeaders
    let url = details.initiator
    try{
        let objeturl = new URL(url)
        let hosturl = objeturl.host
        chrome.storage.local.get(['profunStorage'], function (modenormal) { 
            modenormal = modenormal.profunStorage
            for (const element of entete){
                length = element.name // ici test
                if (length == 'content-length' && modenormal != 'false') {
                    localStorage_consomationtotal(element.value)
                    autoData({semaine: getWeek(), consomation : parseInt(element.value), site : {}}) 
                    if (element.value > 0) {
                        var indices = []; 
                        for(var i=0; i<hosturl.length;i++) {
                            if (hosturl[i] == ".") indices.push(i);
                        }
                        let dernierpoint = indices[indices.length-1];
                        if (indices.length > 1) {
                            let avantdernierpoint = indices[indices.length-2];
                            let caschiant = ['mail','outlook','web-mail','messageriepro3','drive','cloud','photos','live','music','webmail'];
                            let indexvoila = (caschiant).indexOf(hosturl.substring(0,avantdernierpoint))
                            if (indexvoila == -1){
                                var nomsite = hosturl.substring(avantdernierpoint+1, dernierpoint);
                            } else {
                                var nomsite = hosturl.substring(0,dernierpoint);
                            }
                        } else {
                            var nomsite = hosturl.substring(dernierpoint, 0);
                        caschiant = []
                        motcledecaschiant = []
                        }
                        updateSites(getWeek(), nomsite, parseInt(element.value))
                    }
                }
            }
        });
    }catch (error){
        //console.warn('Ce nest pas une url '+error)
    }
}

var filter = { urls: ['<all_urls>']
};
var opt_extraInfoSpec = ['responseHeaders'];

chrome.webRequest.onHeadersReceived.addListener(
    callback, filter, opt_extraInfoSpec
);

//chrome.notifications.create('test', {
//    type: 'basic',
//    iconUrl: "icons/icon16.png",
//    title: 'Test Message',
//    message: 'You are awesome!',
//    priority: 2
//},
//function(id) { console.log("Last error:", chrome.runtime.lastError); });

// Ouvrir la BDD; elle sera créée si elle n'existe pas déjà
let request = self.indexedDB.open('suivi_conso', 1);
request.onerror = function() {
    console.log('Database failed to open');
};
request.onsuccess = function() {
    console.log('Database opened successfully');
    // Stocke la base de données ouverte dans la variable db. On l'utilise par la suite
    db = request.result;
    //displayData(); 
    let thelistesite = Promise.all([GetSite(0),GetSite(-1)]).then((results) => {
        let sites = results
        fetch("/../bdd_sites.json")
        .then(mockResponses => {
           return mockResponses.json();
        })
        .then(bddsite =>start(sites,bddsite));
    });
};
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

function addData(e) {
    // ouvrir une transaction en lecture/écriture
    let transaction = db.transaction(['suivi_conso'], 'readwrite');
    // récupérer l'object store de la base de données qui a été ouvert avec la transaction
    let objectStore = transaction.objectStore('suivi_conso');
    // demander l'ajout de notre nouvel objet à l'object store
    var request = objectStore.add(e);
    // attendre la fin de la transaction, quand l'ajout a été effectué
    transaction.oncomplete = function() {
    console.log('Transaction completed: database modification finished.');
    // mettre à jour l'affichage pour montrer le nouvel item en exécutant displayData()
    //displayData(); 
    };
    transaction.onerror = function() {
    console.log('Transaction not opened due to error');
    };
}

function displayData(e) {
    // Ouvre l'object store puis récupère un curseur - qui va nous permettre d'itérer sur les entrées de l'object store
    let objectStore = db.transaction('suivi_conso').objectStore('suivi_conso');
    objectStore.openCursor().onsuccess = function(e) {
        // Récupère une référence au curseur
        let cursor = e.target.result;
        // S'il reste des entrées sur lesquelles itérer, on exécute ce code
        if(cursor) {
        
        sem = cursor.value.semaine;
        con = cursor.value.consomation;
        sit = cursor.value.site;
        console.log('@---@')
        console.log(sem)
        console.log(con)
        console.log(sit)
        console.log('@-^-@')
        // Continue l'itération vers la prochaine entrée du curseur
        cursor.continue();
        } else {
        console.log('Pas d autre données dans la BDD');
        }
    };
}

function deleteItembyid(e) {
    var request = db.transaction(["suivi_conso"], "readwrite")
    .objectStore("suivi_conso")
    .delete(e);

    request.onsuccess = function(event) {
        console.log("Entrée surpprimée avec succès !");
        console.log('Suivi_conso ' + e + ' deleted.');
    };
}

function deleteItem(e) {
    var transaction = db.transaction(['suivi_conso'], 'readwrite');
    var objectStore = transaction.objectStore('suivi_conso');
  
    var myIndex = objectStore.index('semaine');
    var getRequest = myIndex.get(e);
    getRequest.onsuccess = function() {
        var ID = getRequest.result.id
        deleteItembyid(ID)
    }
}

function updateData(e) {
    sem = e.semaine
    conso = e.consomation
    sites = e.site
    var transaction = db.transaction(['suivi_conso'], 'readwrite');
    var objectStore = transaction.objectStore('suivi_conso');
  
    var myIndex = objectStore.index('semaine');
    var getRequest = myIndex.get(sem);
    getRequest.onsuccess = function() {
        var data = getRequest.result;
        data.consomation = data.consomation + conso // ajonte la conso actuelle avec la précédente 
        data.site = Object.assign({}, data.site, sites); // fusionne les deux dico, si une entité existe déja son nombre est remplacé
        var updateTitleRequest = objectStore.put(data);
        updateTitleRequest.onsuccess = function() {
            //displayData();
        };
    }
}

function autoData(ladata) {
    var sem = ladata.semaine
    var transaction = db.transaction(['suivi_conso'], 'readwrite');
    var objectStore = transaction.objectStore('suivi_conso');
  
    var myIndex = objectStore.index('semaine');
    var getRequest = myIndex.get(sem);
    getRequest.onsuccess = function() {
        var resultat = getRequest.result
        if (resultat != undefined) {
            updateData(ladata)
        }else {
            addData(ladata)
        }
    }
}

function updateSites(lasemaine, name, consodusite) {
    var transaction = db.transaction(['suivi_conso'], 'readwrite');
    var objectStore = transaction.objectStore('suivi_conso');
  
    var myIndex = objectStore.index('semaine');
    var getRequest = myIndex.get(lasemaine);
    getRequest.onsuccess = function() {
        try{
            var sites = getRequest.result.site
            if (sites[name] != undefined) {
                sites[name] = sites[name] + consodusite 
            }else{
                sites[name] = consodusite
            }
            autoData({semaine: lasemaine, consomation : 0, site : sites})
        }catch (error){}
    }
}

function deleteBDD() {
    var DBDeleteRequest = self.indexedDB.deleteDatabase("suivi_conso");
    DBDeleteRequest.onerror = function(event) {
      console.log("Erreur lors de la suppression de la base");
    };
    
    DBDeleteRequest.onsuccess = function(event) {
      console.log("BDD suivi_conso was kill by you !");
      console.log(event.result); // undefined
    };
}

function deleteAllDATA(){
    deleteBDD()
    remove_localStorage_consomationtotal()
}