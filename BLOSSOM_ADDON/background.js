import DateTime from '/js/luxon/src/datetime.js'

// Objet db pour stocker la BDD ouverte
let db;

function getWeek(decalage_semaine=0){
    /* Used to return in the form of W00Y0000 the week and the year requested in relation to today
    Use moment/luxon : https://github.com/moment/luxon
    
    param number decalage_semaine: offset in number of weeks from the current week
    */
    var date = DateTime.now().plus({ weeks: decalage_semaine });
    var week = date.weekNumber;
    var year = date.year;
    return 'W'+week+'Y'+year;
}

function localStorage_consomationtotal(conso_a_ajouter) {
    /* 
    
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
    chrome.storage.local.remove(['consomationtotal']);
}