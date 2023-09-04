


// get things from the page
var imageContainer = document.getElementById("imageContainer");
var nextRoundButton = document.getElementById("refreshButton");
var playButton = document.getElementById("playButton");
var scoreContainer = document.getElementById("scoreContainer");
var inatOutwardContainer = document.getElementById("inatOutwardContainer");
var taxonContainer = document.getElementById("taxonContainer");
var placeContainer = document.getElementById("placeContainer");

// Declare as global variables
var roundNumber = 1;
var gameScoreTotal = 0;
var scoreFactor = 1;

var roundsPerGame = 5;
var secretRevealed = false;
var secretLocation;
var secretMarker;
var map;
var gameId = Math.floor(Math.random()*5000);

// get custom user query parameters
function getCustomParams() {
    var urlParams = window.location.search;
    if (urlParams.includes("?")) {
        var getQuery = urlParams.split('?')[1];
        var params = getQuery.split('&');
        console.log("Custom URL parameters supplied")

        var extra_params = "&"+params.join("&");
    } else {
        extra_params = "";
        console.log("No custom URL parameters supplied")
    }
    return extra_params
}

// user supplied parameyers
var customParams = getCustomParams();

// things applied to all queries
var baseParams = `&captive=false&geoprivacy=open&quality_grade=research&photos=true&geo=true&acc_below=150`

// add the image to the board
function addImage(result) {

    var imageURL = result.photos[0].url.replace("/square", "/medium");

    // Create a figure element to contain the image and caption
    var figureElement = document.createElement("figure");

    // Create an img element for the image
    var imgElement = document.createElement("img");
    imgElement.src = imageURL;
    imgElement.className = "modal-target";

    // Append the img element to the figure element
    figureElement.appendChild(imgElement);

    // Create a figcaption element for the caption
    var figcaptionElement = document.createElement("figcaption");

    var captionText = "<i>"+result.taxon.name + "</i> by " + result.user.login;

    figcaptionElement.innerHTML = captionText; // Set the caption text
    figcaptionElement.style.display = "none"

    // Append the figcaption element to the figure element
    figureElement.appendChild(figcaptionElement);

    // Append the figure element to the image container
    imageContainer.appendChild(figureElement);
}

// create boundingbox
function createGlobalBoundingBoxString() {
    var lat = Math.random() * 130 - 65;
    var long = Math.random() * 340 - 170;

    

    const latRange = 15 + Math.floor(20*(Math.abs(lat)/65)); // bigger lat range nearer the poles
    const longRange = 15;

    const neLat = lat + latRange;
    const neLng = long + longRange;
    const swLat = lat - latRange;
    const swLng = long - longRange;

    const boundingBoxString = `&nelat=${neLat}&nelng=${neLng}&swlat=${swLat}&swlng=${swLng}`;
    

    return boundingBoxString;
}

// function to get a random observation
async function getRandomObvs() {
    console.log(baseParams);
    console.log(customParams);

    // if any custom parameter have been assigned
    if (customParams.includes("place_id")) {
        var apiUrl = `https://api.inaturalist.org/v1/observations?per_page=1&page=${roundNumber}&order_by=random${baseParams}${customParams}&id_above=${gameId}`;
    } else {
        var apiUrl = `https://api.inaturalist.org/v1/observations?per_page=1&page=${roundNumber}&order_by=random${baseParams}${customParams}${createGlobalBoundingBoxString()}&id_above=${gameId}`;
    }


    const response = await fetch(apiUrl);
    const data = await response.json();

    imageContainer.innerHTML=""
    addImage(data.results[0]);
    
    return data;
}



// get n supporting observations
async function getSupportingObvs(nObvs, lat, lng,idIgnore) {
    var radius = 10;
    var apiUrl = `https://api.inaturalist.org/v1/observations?lat=${lat}&lng=${lng}&radius=${radius}&per_page=${nObvs}&order_by=random${baseParams}${customParams}&not_id=${idIgnore}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    data.results.forEach(function(element) {
        addImage(element);
    });

    return data;
}



function clearPage(){
    imageContainer.innerHTML="Loading observations..."
    inatOutwardContainer.style.display = "none";
    nextRoundButton.style.display = "none";
    var mapContainer = document.getElementById("mapContainer");
    mapContainer.innerHTML = '<div id="map" class="disabled"></div>'; // Remove the map
    secretRevealed = false;
}




function createMap(focal_lat,focal_lng,imageUrl){
    // MAP --------------
    // Initialize the map
    map = L.map('map',{minZoom: 1}).setView([0, 0], 1);

    // Create a tile layer using OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    // SECRET LOCATION ON MAP -----------
    // Define the secret location (latitude and longitude)
    secretLocation = L.latLng(focal_lat, focal_lng);


    // Create a custom icon for the marker
    const obsvsMarkerIcon = L.icon({
        iconUrl: imageUrl, // URL of the custom image
        iconSize: [32, 32], // Size of the icon image (width, height)
        iconAnchor: [16, 16], // Anchor point of the icon (centered at the bottom)
        popupAnchor: [0, -32] // Popup anchor point relative to the icon (above the icon)
    });


    // Create a marker for the secret location
    secretMarker = L.marker(secretLocation, {
        opacity: 0, // Initially hide the marker
        icon: obsvsMarkerIcon // add the custom marker type
    }).addTo(map);

    secretMarker._icon.style.borderRadius = '50%';
    secretMarker._icon.style.boxShadow = '0px 0px 10px rgba(0, 0, 0, 0.4)'; // Add a drop shadow

    secretMarker._icon.classList.add("not-clickable");

    // Attach a click event listener to the map
    map.on('click', handleMapClick);

    // stop going round and round
    map.setMaxBounds([
        [-90, -270], // South-West corner of the bounding box
        [90, 270],   // North-East corner of the bounding box
    ]);

}


// Add this function to your code to handle map clicks
function handleMapClick(e) {

    if (!secretRevealed) {
        // Calculate distance between clicked point and secret location
        var distance = e.latlng.distanceTo(secretLocation);

        // Update the marker opacity to reveal the secret location
        secretMarker.setOpacity(1);

        // Set the secret as revealed
        secretRevealed = true;


        // move the users guess in longitude if they are far away
        let angularDifference = e.latlng.lng - secretMarker._latlng.lng;
        // Adjust longitude2 to be closer to longitude1 by wrapping around
        if (angularDifference > 180) {
            e.latlng.lng-= 360;
        } else if (angularDifference < -180) {
            e.latlng.lng += 360;
        }

        // Add a marker where the user clicked
        var clickedMarker = L.marker(e.latlng).addTo(map);

        // Draw a line between the clicked marker and the secret location
        var line = L.polyline([e.latlng, secretLocation], {
            color: '#45a049',
        }).addTo(map);

        // Calculate the midpoint between the clicked point and the secret location
        var midpoint = L.latLng(
            (e.latlng.lat + secretLocation.lat) / 2,
            (e.latlng.lng + secretLocation.lng) / 2
        );

        // Display the distance in a popup at the midpoint
        var distance = e.latlng.distanceTo(secretLocation)/1000;
        L.popup({ closeButton: false, offset: [0, -15] })
            .setLatLng(midpoint)
            .setContent('Distance: ' + Math.round(distance) + ' km')
            .openOn(map);

        // zoom to the map
        var group = new L.featureGroup([clickedMarker, secretMarker]);
        map.fitBounds(group.getBounds());

        // Get all figure elements within #imageContainer
        const figureElements = document.querySelectorAll('#imageContainer figure');

        // Loop through each figure and reveal its caption
        figureElements.forEach(function (figureElement) {
            const caption = figureElement.querySelector('figcaption');
            if (caption) {
                caption.style.display = 'block'; // or 'inline' as needed
            }
        });


        addScore(distance);

        // make the button reappear
        nextRoundButton.style.display = "inline-block";
        inatOutwardContainer.style.display = "inline-block";
    }
}

// see how many grid cells contain results for score scaling
async function scoreScaleFactor(){
    var apiUrl = `https://api.inaturalist.org/v1/heatmap/0/0/0.grid.json?per_page=0`+baseParams+customParams;
    var nGrids = 0;

    const response = await fetch(apiUrl);
    const data = await response.json();

    data.grid.forEach(function(row) {
        nGrids += row.trim().length;
    });

    // no filter = 3060 grids
    return Math.sqrt(Math.min(1,nGrids/3060)); 
}

// trigger it immediately so it'll be cached by inat for later use
async function main() {
    await scoreScaleFactor();
}
main();

// Calculate the score based on the distance
function calculateGlobalScore(distance) {
  if (distance < 100*Math.sqrt(scoreFactor)) {
    return 5000;
  } else {
    // Calculate a score inversely proportional to the distance
    return Math.floor(5000 * Math.exp(-distance/2500/scoreFactor));
  }
}

function addScore(distance){
    let score = calculateGlobalScore(distance);

    var roundScore = document.createElement("p");
           
    // Add some text to the <p> element
    roundScore.innerHTML = `<a href=${inatOutwardContainer.querySelector('a').getAttribute('href')} target="_blank">Round ${roundNumber}</a>: <b>${score}</b> Points (${Math.round(distance)}km)`;
    gameScoreTotal += score;

    scoreContainer.appendChild(roundScore);

    if((roundNumber%roundsPerGame)==0){
        endGame();
    }

    roundNumber += 1;
}

// end game
function endGame(){
    var gameScore = document.createElement("p");
    gameScore.innerHTML = `<b>Game ${roundNumber/roundsPerGame}: ${gameScoreTotal} / 25000 Points</b>`;
    scoreContainer.appendChild(gameScore);
}

//
function addCustomPlace(){
    // get place names
    var params = customParams.split('&');
    if((params.findIndex(params => params.includes("place_id")))>-1){ // get the outer radius
        var place_id = params[params.findIndex(params => params.includes("place_id"))].split("=")[1];

        // set bounds
        var bounds = L.latLngBounds([]);

        placeContainer.innerHTML = "Selected place(s): ";
        
        // get each of the places
        place_id.split(",").forEach(function (place) { 
            apiUrl3 = `https://api.inaturalist.org/v1/places/${place}`;
                        fetch(apiUrl3)
                            .then(response => response.json())
                            .then(data3 => {
                                //var locationName = document.getElementById("locationName");
                                //locationName.innerHTML = data3.results[0].display_name; // update place name

                                var placeGeojson = L.geoJSON(data3.results[0].geometry_geojson).addTo(map);
                                placeContainer.innerHTML += data3.results[0].name

                                // Update the map bounds with the GeoJSON layer's bounds
                                bounds.extend(placeGeojson.getBounds());
                                map.fitBounds(bounds);
                            })   
        })
    } else {
        placeContainer.innerHTML = "";
    }
}


function addCustomTaxon(){
    // get place names
    var params = customParams.split('&');
    if((params.findIndex(params => params.includes("taxon_id")))>-1){ // get the outer radius
        var taxon_id = params[params.findIndex(params => params.includes("taxon_id"))].split("=")[1];

        taxonContainer.innerHTML = "Selected taxonomic group(s): "
       
        // get each of the places
        taxon_id.split(",").forEach(function (taxon) { 
            apiUrl= `https://api.inaturalist.org/v1/taxa/${taxon}`;
                        fetch(apiUrl)
                            .then(response => response.json())
                            .then(data => {
                                taxonContainer.innerHTML += data.results[0].name
                            })   
        })
    } else {
        taxonContainer.innerHTML = "Selected taxonomic group(s): All species";
    }



}



// generate a new round
async function generateNewRound() {
    scoreFactor = await scoreScaleFactor();
    console.log("Score factor:"+scoreFactor);

    clearPage();

    // get main observation
    var focalObvs = await getRandomObvs();

    // create the map
    createMap(
        focalObvs.results[0].location.split(",")[0],
        focalObvs.results[0].location.split(",")[1],
        focalObvs.results[0].photos[0].url
        )

    // get supporting observations
    var supportObvs = await getSupportingObvs(
        7, 
        focalObvs.results[0].location.split(",")[0], 
        focalObvs.results[0].location.split(",")[1],
        focalObvs.results[0].id
        );

    addCustomPlace();
    addCustomTaxon();

    // build a list of IDs for outward URL
    var obs_ids = [focalObvs.results[0].id];
    supportObvs.results.forEach(function(element) {
        obs_ids.push(element.id);
    })

    var obs_url = 'https://www.inaturalist.org/observations?place_id=any&id='+obs_ids.join(",");
    
    inatOutwardContainer.innerHTML = `<a href='${obs_url}' target='_blank'>View observations on iNaturalist</a>`;
    
}


// play game button
playButton.addEventListener("click", function () {
    document.getElementById("game").style.display="flex";
    playButton.style.display="none";
    document.getElementById("tutorial").style.display="none";
    


    // Call the function initially to perform the process
    generateNewRound();
})

// next round
nextRoundButton.addEventListener("click", function () {
    generateNewRound();
})

// next game
// nextGameButton.addEventListener("click", function () {
//     generateNewRound();
// })


// IMAGE MODAL
// Modal Setup
var modal = document.getElementById('modal');

// close the modal
modal.addEventListener('click', function() { 
  modal.style.display = "none";
});

// global handler
document.addEventListener('click', function (e) { 
  if (e.target.className.indexOf('modal-target') !== -1) {
      var img = e.target;
      var modalImg = document.getElementById("modal-content");
      modal.style.display = "block";
      modalImg.src = img.src.replace("medium","large");
   }
});


// copy to clipboard
// Function to copy the content of scoreContainer to the clipboard
function copyToClipboard() {
    const scoreContainer = document.getElementById('scoreContainer');

    // Create a range and select the contents of scoreContainer
    const range = document.createRange();
    range.selectNodeContents(scoreContainer);

    // Get the current selection and remove any previous selections
    const selection = window.getSelection();
    selection.removeAllRanges();

    // Add the new range to the selection
    selection.addRange(range);

    // Copy the selected content to the clipboard
    document.execCommand('copy');

    // Deselect the text (optional)
    selection.removeAllRanges();
}

// Attach an event listener to the copyButton
document.getElementById('copyButton').addEventListener('click', copyToClipboard);