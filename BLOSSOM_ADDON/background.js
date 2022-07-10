import DateTime from '/js/luxon/src/datetime.js'

// db object to store the open database
let db;

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

function localStorage_overallconsumption(consumption_to_add) {
    /* Creates the user's database local Storage and stores his overall consumption of data in bytes
    param number consumption : data used by the web user in bytes
    */
    web_browser.storage.local.get(['overallconsumption'], function (data_storage){
        let myconsumption = data_storage.overallconsumption;
        if (myconsumption == undefined){
            console.log('Overallconsumption creation in localStorage');
            myconsumption = parseInt(consumption_to_add);
        }else{
            myconsumption =  parseInt(myconsumption)+parseInt(consumption_to_add);
        }
        web_browser.storage.local.set({'overallconsumption': myconsumption});

    })
}

function remove_localStorage_overallconsumption(){
    // Deletes the overall consumption from the local Storage database
    
    web_browser.storage.local.remove(['overallconsumption']);
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
    resolve : return the result in the form of a dictionnary with this form : {week format W00Y0000, consumption : parseInt(N), website : {web_site_1 : consumption1, web_site_2 : consumption2}}
    */
    return new Promise((resolve, reject) => {
        let transaction = db.transaction(['consumption_tracking'], 'readonly'); // Opens a transaction (data exchange) in read/write
        let objectStore = transaction.objectStore('consumption_tracking'); // Retrieves the object store from the database opened by the transaction. The store object is an access to objects storages in the database. The objects storage stores recordings & each recording is composed of a key/value pair. Each value is indexed to its key. Keys are sorted to form the storage's primary index which allows a quick & organised access to values.
        let myIndex = objectStore.index('week'); // Retrieves the 'week' object in the 'consumption_tracking' storage. Thanks to this object, we'll be able to read our database, 'week' is used as an index.
        let getRequest = myIndex.get(week_of_getWeek); // On va chercher la semaine qui nous interesse grace à getWeek
        getRequest.onsuccess = async function() {
            //console.log(getRequest.result) // let websites = getRequest.result.website;
            resolve(getRequest.result) // Promise is returned
        }
        transaction.onerror = function(){
            console.log('Transaction not opened due to error.');
        }
   })
}

function addData(data_dictionnary){
    /* 
    Adds new objects to the object store in the following format : {week: getWeek(+-n), consumption : parseInt(N), website : {dico website1 : conso1, website2 : conso2}}
    */
    let transaction = db.transaction(['consumption_tracking'], 'readwrite'); // Opens a transaction (data exchange) in read/write
    let objectStore = transaction.objectStore('consumption_tracking'); // Retrieves the object store from the database opened by the transaction. The object store is an access to objects storages in the database. The objects storage stores recordings & each recording is composed of a key/value pair. Each value is indexed to its key. Keys are sorted to form the storage's primary index which allows a quick & organised access to values.
    objectStore.add(data_dictionnary); // Requests to add the new object to the object store
    transaction.oncomplete = function() {
        console.log('Transaction completed : database modification finished.');
    }
    transaction.onerror = function(){
        console.log('Transaction not opened due to error.');
    }
}

function updateData(data_dictionnary){
    /* 
    Adds new objects to the object store in the following format : {week: getWeek(+-n), consumption : parseInt(N), website : {dico website1 : conso1, website2 : conso2}}
    */
    let transaction = db.transaction(['consumption_tracking'], 'readwrite'); // Opens a transaction (data exchange) in read/write
    let objectStore = transaction.objectStore('consumption_tracking'); // Retrieves the object store from the database opened by the transaction. The object store is an access to objects storages in the database. The objects storage stores recordings & each recording is composed of a key/value pair. Each value is indexed to its key. Keys are sorted to form the storage's primary index which allows a quick & organised access to values.
    let myIndex = objectStore.index('week'); // Retrieves the 'week' object in the 'consumption_tracking' storage. Thanks to this object, we'll be able to read our database, 'week' is used as an index.
    let getRequest = myIndex.get(data_dictionnary.week); // Gets the interested week by getWeek function
        getRequest.onsuccess = async function() {
            let data_in_db = getRequest.result;
            data_in_db.consumption = data_in_db.consumption + data_dictionnary.consumption;
            data_in_db.website = merge([data_in_db.website, data_dictionnary.website]); // Merges the 2 dictionnaries, if an entity already exists, the number is added
            objectStore.put(data_in_db);
        }
    transaction.onerror = function(){
        console.log('Transaction not opened due to error.');
    }
}

function autoData(data_dictionnary){ 
    /*
    Determines the existence of the dictionnary. If it exists, updates it, if it doesn't exist, creates it and adds data
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
    /*  Opens the object store and retrieves a cursor - which allows to iterate on the entries of the object store and then displays the content of iterations.
    
    */
    console.log(' ################## ################## ');
    let objectStore = db.transaction('consumption_tracking').objectStore('consumption_tracking');
    objectStore.openCursor().onsuccess = function(e) {
        let cursor = e.target.result; // Retrieves a reference to the cursor
        if(cursor) { // If there are still entries we need to iterate, we execute this codeS'il reste des entrées sur lesquelles itérer, on exécute ce code
            console.log('@---@');
            console.log(cursor.value.week);
            console.log(cursor.value.consumption);
            console.log(cursor.value.website);
            console.log('@-^-@');
            
            cursor.continue(); // Continues the iteration to the next entry of the cursor
        } else {
            console.log(' ######## No more data in the database ######## ');
        }
    };
}

function deleteItembyid(id) {
    /* 
    Allows to delete item by its id
    */
    let request = db.transaction(["consumption_tracking"], "readwrite").objectStore("consumption_tracking").delete(id);
    request.onsuccess = function(event) {
        console.log("Entry deleted successfully.");
        console.log('consumption_tracking ' + id + ' deleted.');
    };
}

function deleteItembyweek(week_of_getWeek) {
    /* 
    Deletes items from a specific week
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

function deleteDB() {
    /* 
    Deletes all the data in a database
    */
    let DBDeleteRequest = self.indexedDB.deleteDatabase("consumption_tracking");
    DBDeleteRequest.onerror = function(event) {
        console.log("Error when deleting database.");
    };  
    DBDeleteRequest.onsuccess = function(event) {
        console.log("Database consumption_tracking was killed by you.");
        console.log(event.result); // undefined
    };
}

function deleteAllDATA(){
    /* 
    Deletes all the data related to the user's consumption
    */
    deleteDB()
    remove_localStorage_overallconsumption()
}

async function state_profunStorage(){
    /* 
    Executes the right code depending on the button state of the user's mode. If the user is on Pro mode, the consumption tracking is stopped until the user goes back to the Fun mode.
    */
    return new Promise((resolve, reject) => {
        web_browser.storage.local.get(['profunStorage'], function (result) { 
            let button_state = result.profunStorage
            resolve(button_state);
        })
    })
}

function take_name_website(hosturl){
    var namewebsite;

    let index = []; // Contains all indexes of points : '.'
    for(let i=0; i < hosturl.length; i++) {
        if (hosturl[i] == ".") index.push(i);
    }

    let lastpoint = index[index.length-1];
    if (index.length > 1) {
        let penultimatepoint = index[index.length-2];
        let specific_cases = ['mail','outlook','web-mail','messageriepro3','drive','cloud','photos','live','music','webmail'];
        let indexvoila = (specific_cases).indexOf(hosturl.substring(0,penultimatepoint));
        if (indexvoila == -1){
            namewebsite = hosturl.substring(penultimatepoint+1, lastpoint);
        } else {
            namewebsite = hosturl.substring(0, lastpoint);
        }
    } else {
        namewebsite = hosturl.substring(lastpoint, 0);
    }
    return namewebsite;
}

var callback_of_webRequest = function(details){
    /* 
    Je sais pas quoi dire de çça pelo
    */
    Promise.all([state_profunStorage()]).then((result) => {// Execution is stopped if Pro mode is activated
        if (result == false){ return; };
    })

    // Reads URLs to retrieve websites
    let header = details.responseHeaders;
    let url_txt = details.initiator; // URLs' string
    let url; // Le mettre ici c'est important et pas dans le try directement
    try{
        url = new URL(url_txt); // Creates an object of the URL type
    }catch(error){
        return; //Stops the execution if the object is not an URL or not what we need to go on
    }
    let host_url = url.host; // The interesting part of the URL
    
    // Retrieves the elements sizes in bytes in the headers, if there isn't we ignore them
    let content_length = header.find(e => e.name === 'content-length');
    if (content_length == undefined){ return; }; // Ignores if the size in bytes isn't specified
    
    // We can now add consumption in our local storage
    localStorage_overallconsumption(content_length.value);

    // We now add the same consumption in the database with the website
    let name_website = take_name_website(host_url); // Retrieves the name of the website
    let object_website = {};
    object_website[name_website] = parseInt(content_length.value);
    autoData({week : getWeek(), consumption : parseInt(content_length.value), website : object_website });
}

function calculate_score(data, bdd){
    /* 
    Determines the user's ecoscore shown in the pop-up depending on the virtuosity of his actions on the Internet.
    */
    let virtuosity = { // The amount of data in bytes the user needs to comply with to stay virtuous
        Emails:2835e3,
        Streaming:9.31e9,
        Searches:8.1e6,
        Social_Media:0.49e9,
        Others:1.02e9+100e6 // Contains non identified websites (not listed in the bdd_sites.json), e-commerce & cloud
    }

    let score = 0;
    let web_site = [];
    let category_consumption = []
    let empty_category = {Streaming:0,Emails:0,Searches:0,Social_Media:0,Others:0,Cloud :0,E_commerce:0}
    
    for (let el of data){
        if(el != undefined){
            web_site.push(el.website);
        }else{
            web_site.push({});
        }
       category_consumption.push(JSON.parse(JSON.stringify(empty_category))); //JSON.parse(JSON.stringify(monObjet)) allows to clone an object
    }
    for (let i=0; i<web_site.length ; i++){
        for (let website in web_site[i]){
            let count = 0;
            for (let category in bdd){
                if (bdd[category].indexOf(website) != -1){
                    category_consumption[i][category] += Math.round(web_site[i][website]);
                }else{
                    count++
                }
                if (i==6){
                    category_consumption[i]['Others'] += Math.round(web_site[i][website]);
                }
                
            }
        }
        category_consumption[i]['Others'] +=  category_consumption[i]['E_commerce'] +  category_consumption[i]['Cloud'];
        category_consumption[i]['E_commerce'] = category_consumption[i]['Cloud'] = 0;        
    }

    let day = new Date().getDay();
    let multiplying_factor_last_week = 1-(day/7);
    let actual_weekly_consumption = category_consumption[0];
    let last_weekly_consumption = category_consumption[1];
    
    for (let category in virtuosity){
        let equivalent_consumption_one_week_1_category = actual_weekly_consumption[category] + last_weekly_consumption[category]*multiplying_factor_last_week;
        if (equivalent_consumption_one_week_1_category < virtuosity[category]){
            score += 20;
        }else{
            let exces10 = (virtuosity[category]/10);
            let excesabs = equivalent_consumption_one_week_1_category - (virtuosity[category]);
            let pointloss = excesabs / exces10;
            if (pointloss>20){
                //pointloss = 20;
            }
            score += 20 - pointloss;
        }
    }
    score = Math.round(score);
    web_browser.storage.local.set({'Score': score});
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

var web_browser;
if (isChrome || isEdgeChromium){web_browser = chrome;}
else if (isFirefox){web_browser = browser;}

// Opens the database; It will be created if it doesn't exist
let request = self.indexedDB.open('consumption_tracking', 1);
request.onerror = function() {
    console.log('Database failed to open.');
};
request.onsuccess = function() {
    console.log('Database opened successfully.');
    // Stores the open database in db variable which will be used further
    db = request.result;
    displayData(); 
    Promise.all([getData(getWeek()),getData(getWeek(-1))]).then((datas) => {
        fetch("/bdd_sites.json").then(mockResponses => {
            return mockResponses.json();
        }).then(bddsite =>calculate_score(datas,bddsite));
    });
}

// Specifies the data tables of the database if it is not already done
request.onupgradeneeded = function(e) {
    // Retrieves a reference to the open database
    let db = e.target.result;
    // Creates an objectStore to store our notes (a data table)
    // With a field which will self-increment as a key
    let objectStore = db.createObjectStore('consumption_tracking', { keyPath: 'id', autoIncrement:true });
    // Defines the fields the objectStore contains
    objectStore.createIndex('week', 'week', { unique: true });
    objectStore.createIndex('consumption', 'consumption', { unique: false });
    objectStore.createIndex('website', 'website', { unique: false });
    console.log('Database setup completed.');
};

var filter = { urls: ['<all_urls>']};
var opt_extraInfoSpec = ['responseHeaders'];
web_browser.webNavigation.onBeforeNavigate.addListener(function(){
    web_browser.webRequest.onHeadersReceived.addListener( //Do not replace web_browser by browser
        callback_of_webRequest, filter, opt_extraInfoSpec
    )
});
