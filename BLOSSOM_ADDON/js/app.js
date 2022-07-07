let db;
var trad = chrome.i18n.getMessage;

var script = document.createElement('script');
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

function Ecrire(id, txt) {
    let popup = document.getElementById(id);
    popup.innerHTML = txt;
}
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function test() {
    alert("test")
}

function ProFun() {
    chrome.storage.local.get(['profunStorage'], function (modenormal) {
        modenormal = modenormal.profunStorage
        if (modenormal == "false"){
            chrome.storage.local.set({'profunStorage': 'true'});
            boutonprofun.value = trad("button_pro")
        }else {
            chrome.storage.local.set({'profunStorage': 'false'});
            boutonprofun.value = trad("button_normal")
        }
    });
}

function openoption() {
    window.open("option.html","newFenetre")
}
function openweek() {
    window.open("weekly_report/graphique librairie.html","newFenetre")
}
// Returns size of the data in following formats: Bytes, KB, MB, GB & TB
function bytesToSize(bytes) {
    var sizes = [trad("size_Bytes"), trad("size_KB"), trad("size_MB"), trad("size_GB"), trad("size_TB")];

    if (bytes == 0) return '0 '+trad("size_Bytes");
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes*100 / Math.pow(1024, i), 2)/100+sizes[i]
}
function getWeek(bf=0) {
    let currentdate = new Date();
    dowOffset = new Date(currentdate.getDay(), 0, 0);
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
            nYear = new Date(currentdate.getFullYear() + 1,0,1);
            nday = nYear.getDay() - dowOffset;
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

//var pourcentage = getRandomInt(101)
chrome.storage.local.get(['Score'], function (pourcentage) {
    pourcentage = pourcentage.Score
    if (pourcentage < 10){
        var Pourcentage_entier = 0
    }else if (pourcentage == 100){
        var Pourcentage_entier = 9
    }else{
        var Pourcentage_texte = pourcentage.toString();
        var Pourcentage_texte = Pourcentage_texte.slice(0, 1)
        var Pourcentage_entier = parseInt(Pourcentage_texte)
    }
    let var1 = "<img src='image/arbre_"
    let var2 = ".png 'alt='Photo dun arbre'/>"
    let var3 = var1 + Pourcentage_entier + var2;
    
    let imageinp = document.getElementById("image");
    imageinp.innerHTML = var3
    
    console.log(typeof pourcentage)
    let phrase = trad("ecoscore",pourcentage.toString())
    Ecrire('ecolo',phrase)
});

var boutonprofun = document.createElement("input");
boutonprofun.type = "button";
boutonprofun.value = "textbtn"; 
boutonprofun.id='profun';
boutonprofun.classList.add("styled");
var append =document.getElementById("profun");
append.appendChild(boutonprofun);
boutonprofun.addEventListener("click", () => {ProFun()} );
chrome.storage.local.get(['profunStorage'], function (modenormal) {
    modenormal = modenormal.profunStorage
    if (modenormal == "false"){
        var textbtn = trad("button_normal")
    }else{
        var textbtn = trad("button_pro")
    }
    boutonprofun.value = textbtn;
});

chrome.storage.local.get(['consomationtotal'], function (totoc) {
    totoc = totoc.consomationtotal
    totol = bytesToSize(totoc)
    Ecrire('toto', trad("total_consumption",totol))
});

let parametre = document.getElementById("para");
parametre.addEventListener("click", () => {openoption()} );

let weeklyreport = document.getElementById("week");
weeklyreport.addEventListener("click", () => {openweek()} );

var boutonpara = document.getElementById("para")
boutonpara.value = trad("button_settings")

var wr = document.getElementById("week")
wr.value = trad("weekly_report")

// Ouvrir la BDD; elle sera créée si elle n'existe pas déjà
let request = window.indexedDB.open('suivi_conso', 1);
request.onerror = function() {
    console.log('Database failed to open');
};
request.onsuccess = function() {
    console.log('Database opened successfully');
    // Stocke la base de données ouverte dans la variable db. On l'utilise par la suite
    db = request.result;
    showData(getWeek())
};


function showData(e) {
    var transaction = db.transaction(['suivi_conso'], 'readwrite');
    var objectStore = transaction.objectStore('suivi_conso');
  
    var myIndex = objectStore.index('semaine');
    var getRequest = myIndex.get(e);
    getRequest.onsuccess = function() {
        try {
            var con = getRequest.result.consomation;
            con = bytesToSize(con);
            var nbs = getRequest.result.site;
            nbs = Object.keys(nbs).length;
        } catch(error) {var con =0; var nbs =0;}
        Ecrire('cettesemaine',trad('week_consumption',[con,nbs]))
    }
}

document.getElementById("name").innerHTML = trad("extensionName")