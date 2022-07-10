import DateTime from '/js/luxon/src/datetime.js'
let db;
var trad = chrome.i18n.getMessage;

function getWeek(week_shift = 0){
    /* Takes into account today's date and calculates the date with a specific week shift. Returns a string in W00Y0000 format.
    
    Use of the DateTime library available on: https://github.com/moment/luxon
    param number week_shift : offset in number of weeks from the current week 
    */
    let date = DateTime.now().plus({ weeks: week_shift });
    let week = date.weekNumber;
    let year = date.year;
    return 'W'+week+'Y'+year;
}

async function GetConso(e) {
    return new Promise((resolve, reject) => {
        var transaction = db.transaction(['consumption_tracking'], 'readonly');
        var objectStore = transaction.objectStore('consumption_tracking');
        var myIndex = objectStore.index('week');
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
        var transaction = db.transaction(['consumption_tracking'], 'readonly');
        var objectStore = transaction.objectStore('consumption_tracking');
        var myIndex = objectStore.index('week');
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
let request = window.indexedDB.open('consumption_tracking', 1);
request.onerror = function() {
    console.log('Database 2 failed to open');
};
request.onsuccess = function() {
    db = request.result;
    console.log('Database 2 opened successfully');
    // Stocke la base de données ouverte dans la variable db. On l'utilise par la suite

    Promise.all([
        GetConso(getWeek( 0)),
        GetConso(getWeek(-1)),
        GetConso(getWeek(-2)),
        GetConso(getWeek(-3)),
        GetConso(getWeek(-4)),
        GetConso(getWeek(-5))
    ]).then((results) => { graphe(results)});

    Promise.all([GetSite()]).then((results) => {
        let sites = results[0]
        fetch("/../bdd_sites.json")
        .then(mockResponses => {
           return mockResponses.json();
        })
        .then(bddsite =>camembert(sites,bddsite));
    });


    function graphe(laliste) {
        var Lsemaine = []
        for (let i=0;i<7;i++){
            let gettruc = getWeek(-i)
            let Y = gettruc.indexOf('Y')
            let sem = gettruc.substring(Y+1)+ ' '+gettruc.substring(0,Y);
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
            document.getElementById('calcul4').innerHTML = trad("calcul2",km.toFixed(1))
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
            for (let categorie in bdd) {
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

document.getElementById("weekly_title3").innerHTML = trad("weekly_title3")
document.getElementById("weekly_title2").innerHTML = trad("weekly_title2")
document.getElementById("weekly_title1").innerHTML = trad("weekly_title1")
document.getElementById("conseil").innerHTML = trad("conseil")
document.getElementById("lesconseils_t01").innerHTML = trad("lesconseils_t01")
document.getElementById("lesconseils_t02").innerHTML = trad("lesconseils_t02")
document.getElementById("lesconseils_t03").innerHTML = trad("lesconseils_t03")
document.getElementById("lesconseils_t04").innerHTML = trad("lesconseils_t04")
document.getElementById("lesconseils_t05").innerHTML = trad("lesconseils_t05")
document.getElementById("lesconseils_t06").innerHTML = trad("lesconseils_t06")
document.getElementById("lesconseils_t07").innerHTML = trad("lesconseils_t07")
document.getElementById("lesconseils_t08").innerHTML = trad("lesconseils_t08")
document.getElementById("Toulouse_CDG_t01").innerHTML = trad("Toulouse_CDG_t01")
document.getElementById("Toulouse_CDG_t02").innerHTML = trad("Toulouse_CDG_t02")
