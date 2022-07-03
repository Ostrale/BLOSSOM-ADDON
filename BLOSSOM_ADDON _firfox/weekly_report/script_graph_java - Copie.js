let db;
var trad = browser.i18n.getMessage;

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

async function GetConso(e) {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(['suivi_conso'], 'readwrite');
        var objectStore = transaction.objectStore('suivi_conso');
        var myIndex = objectStore.index('semaine');
        var getRequest = myIndex.get(e);
        getRequest.onsuccess = async function() {
            let con;
            try {
                con = getRequest.result.consomation;
            } catch (error) {   // c'est un peu violant faut gérer la bonne erreur
                con = 0
            }
            con = con * 9.5367431640625e-7
            resolve(con)
        }
    });
}
async function GetSite() {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(['suivi_conso'], 'readwrite');
        var objectStore = transaction.objectStore('suivi_conso');
        var myIndex = objectStore.index('semaine');
        var getRequest = myIndex.get(getWeek());
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
// Ouvrir la BDD; elle sera créée si elle n'existe pas déjà
let request = window.indexedDB.open('suivi_conso', 1);
request.onerror = function() {
    console.log('Database 2 failed to open');
};
request.onsuccess = function() {
    db = request.result;
    console.log('Database 2 opened successfully');
    // Stocke la base de données ouverte dans la variable db. On l'utilise par la suite

    thelisteconso = Promise.all([
        GetConso(getWeek( 0)),
        GetConso(getWeek(-1)),
        GetConso(getWeek(-2)),
        GetConso(getWeek(-3)),
        GetConso(getWeek(-4)),
        GetConso(getWeek(-5))
    ]).then((results) => { graphe(results)});

    thelistesite = Promise.all([GetSite()]).then((results) => {
        sites = results[0]
        fetch("/../bdd_sites.json")
        .then(mockResponses => {
           return mockResponses.json();
        })
        .then(bddsite =>camembert(sites,bddsite));
    });


    function graphe(laliste) {
        var Lsemaine = []
        for (let i=0;i<7;i++){
            gettruc = getWeek(-i)
            Y = gettruc.indexOf('Y')
            sem = gettruc.substring(Y+1)+ ' '+gettruc.substring(0,Y);
            Lsemaine.push(sem)
        }
        
        new Morris.Line({
            element :'barres',
            lineColors: ["#35a82f"],
            data: [
                { barre :Lsemaine[5], value: laliste[5].toFixed(1)},
                { barre :Lsemaine[4], value: laliste[4].toFixed(1)},
                { barre :Lsemaine[3], value: laliste[3].toFixed(1)},
                { barre :Lsemaine[2], value: laliste[2].toFixed(1)},
                { barre :Lsemaine[1], value: laliste[1].toFixed(1)},
                { barre :Lsemaine[0], value: laliste[0].toFixed(1)},
                

            ],
            xkey:'barre',
            ykeys:['value'],
            yLabelFormat: function (y) { return y.toString() + ' '+trad('size_MB'); },
            hideHover: ['auto'],
            labels: [trad("consumption")],
            goalStrokeWidth: '2px',
            resize: true
            
        });
        window.onload = function(){
            var kcenter = 7.2*10**(-11);
            var kwifi = 1.52*10**(-10);
            var tot = laliste[0];
            var prodE = 59;
            tot = tot/9.5367431640625e-7
            var kWh = tot*kcenter
            kWh = kWh + tot*kwifi
            CO2 = (kWh*prodE).toFixed(1);
            var AR = (CO2/76.5).toFixed(1);
            var km = CO2/0.126;
            var ampoule = kWh/0.009;
            var ent = Math.trunc(ampoule);
            var min = (ampoule-ent)*60;
            document.getElementById('calcul1').innerHTML = trad("calcul1",[laliste[0].toFixed(1), CO2]);
            document.getElementById('calcul3').innerHTML = trad("calcul3",[ent, min.toFixed(0)])
            document.getElementById('calcul4').innerHTML = trad("calcul2",(km/76.5).toFixed(1))
        }; 
    }

    function camembert(sites,bdd) {
        var consoparcategorie = {
            Streaming:0,
            Mails:0,
            Recherches:0,
            Telechargement:0,//abandon
            Reseaux_Sociaux:0,
            Autres:0.01,
            Cloud :0,
            E_commerce:0
        }
        for (let site in sites){
            let i = 0
            for (categorie in bdd) {
                if (bdd[categorie].indexOf(site) != -1) {
                    consoparcategorie[categorie] += sites[site]* 9.5367431640625e-7
                }else{i++}
                if (i==6){
                    consoparcategorie['Autres'] += sites[site]* 9.5367431640625e-7
                }
            }
        }
        new Morris.Donut({
            element :'donut',
            colors: ["#35a82f", "#f06c0e"],
            data: [
                { label :trad("Streaming"), value: consoparcategorie['Streaming'].toFixed(2)},
                { label :trad("Email"), value: consoparcategorie['Mails'].toFixed(2)},
                { label :trad("Research"), value: consoparcategorie['Recherches'].toFixed(2)},
                { label :trad("Social_Networks"), value: consoparcategorie['Reseaux_Sociaux'].toFixed(2)},
                { label :trad("Others"), value: consoparcategorie['Autres'].toFixed(2)},
                { label :trad("Cloud"), value: consoparcategorie['Cloud'].toFixed(2)},
                { label :trad("Ecommerce"), value: consoparcategorie['E_commerce'].toFixed(2)},
                

            ],
            labelColor:"#FFFFFF",
            formatter: function (y, data) { return y + ' '+trad('size_MB')},
        });
    }
};

document.getElementById("weekly_title3").textContent = trad("weekly_title3")
document.getElementById("weekly_title2").textContent = trad("weekly_title2")
document.getElementById("weekly_title1").textContent = trad("weekly_title1")
document.getElementById("conseil").textContent = trad("conseil")
document.getElementById("lesconseils_t01").textContent = trad("lesconseils_t01")
document.getElementById("lesconseils_t02").textContent = trad("lesconseils_t02")
document.getElementById("lesconseils_t03").textContent = trad("lesconseils_t03")
document.getElementById("lesconseils_t04").textContent = trad("lesconseils_t04")
document.getElementById("lesconseils_t05").innerHTML = trad("lesconseils_t05")
document.getElementById("lesconseils_t06").innerHTML = trad("lesconseils_t06")
document.getElementById("lesconseils_t07").textContent = trad("lesconseils_t07")
document.getElementById("lesconseils_t08").textContent = trad("lesconseils_t08")
document.getElementById("Toulouse_CDG_t01").innerHTML = trad("Toulouse_CDG_t01")
document.getElementById("Toulouse_CDG_t02").innerHTML = trad("Toulouse_CDG_t02")
