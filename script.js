roundNumber = 1

// get extra url parameters
var urlParams = window.location.search;
if (urlParams.includes("?")) {
    console.log(urlParams);
    var getQuery = urlParams.split('?')[1];
    var params = getQuery.split('&');
    console.log("Custom URL parameters supplied:")
    console.log(params);

    if((params.findIndex(params => params.includes("place_id")))>-1){ // get the outer radius
        var place_id = params[params.findIndex(params => params.includes("place_id"))].split("=")[1];
    }
    var extra_params = "&"+params.join("&");
    console.log(extra_params);
} else {
    extra_params = "";
    console.log("No custom URL parameters supplied")
}

function fetchDataAndProcess() {
    // STEP 1 get a random focal observation
    // Generate a random day between 1 and 28 and month between 1 and 12
    var randomDay = Math.floor(Math.random() * 28) + 1;
    //var randomMonth = Math.floor(Math.random() * 12) + 1;
    var randomPage = Math.floor(Math.random() * 100) + 1;

    // make url and get the data
    var apiUrl = `https://api.inaturalist.org/v1/observations?day=${randomDay}&per_page=1&page=${randomPage}&captive=false&geoprivacy=open&quality_grade=research&photos=true&geo=true`+extra_params;
    
    // get the random observation and then do the rest
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        console.log(data);

        // CLEAN UP --------------
        // Clear the image container before appending new images
        var imageContainer = document.getElementById("imageContainer");
        imageContainer.innerHTML = ''; // Empty the container
        document.getElementById("attribContainer").style.display = "none"; //hide the attribution

        var mapContainer = document.getElementById("mapContainer");
        mapContainer.innerHTML = '<div id="map" class="disabled"></div>'; // Remove the map
        
        // MAP --------------
        // Initialize the map
        var map = L.map('map').setView([20, 0], 2);

        // Create a tile layer using OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        // add a place geometry
        if (urlParams.includes("place_id")) {
            apiUrl3 = `https://api.inaturalist.org/v1/places/${place_id}`;
                    fetch(apiUrl3)
                        .then(response => response.json())
                        .then(data3 => {
                            var locationName = document.getElementById("locationName");
                            locationName.innerHTML = data3.results[0].display_name; // update place name

                            var placeGeojson = L.geoJSON(data3.results[0].geometry_geojson).addTo(map);
                            map.fitBounds(placeGeojson.getBounds());
                        })
                        
        }



        // IMAGES -----
        // attribution
        var attrib = [];
        var obs_ids = [];

        // Get a reference to the image container div
        var imageContainer = document.getElementById("imageContainer");

        // Set the URL of the image you want to display
        var imageUrl = data.results[0].photos[0].url.replace("/square", "/medium");

        var imgElement = document.createElement("img");
        imgElement.src = imageUrl;
        imageContainer.appendChild(imgElement);

        var focal_lat = data.results[0].geojson.coordinates[1];
        var focal_lon = data.results[0].geojson.coordinates[0];

        // attribution and observation IDs

        attrib.push(data.results[0].user.login);
        obs_ids.push(data.results[0].id);

        // OTHER IMAGES ---------
        // Get some other observations
        apiUrl2 = `https://api.inaturalist.org/v1/observations?lat=${focal_lat}&lng=${focal_lon}&radius=10&not_id=${data.results[0].id}&per_page=7&captive=false&geoprivacy=open&quality_grade=research&photos=true&geo=true`+extra_params;
        fetch(apiUrl2)
            .then(response => response.json())
            .then(data2 => {

                data2.results.forEach(function(element) {
                    attrib.push(element.user.login);
                    obs_ids.push(element.id);
                    var imgElement = document.createElement("img");
                    imgElement.src = element.photos[0].url.replace("/square", "/medium");
                    imageContainer.appendChild(imgElement);
                });


                var obs_url = 'https://www.inaturalist.org/observations?id='+obs_ids.join(",")

                var attribContainer = document.getElementById("attribContainer");
                attribContainer.innerHTML = "<p>Observations by " + attrib.join(", ") + `  <a href='${obs_url}' target='_blank'>Explore on iNaturalist</a>`+"</p>"; // add attributions
            })

        


        // SECRET LOCATIONS -----------
        // Define the secret location (latitude and longitude)
        var secretLocation = L.latLng(focal_lat, focal_lon);

        // Create a marker for the secret location
        var secretMarker = L.marker(secretLocation, {
            opacity: 0, // Initially hide the marker
        }).addTo(map);


        secretMarker._icon.classList.add("not-clickable");

        

        // Initialize a variable to keep track of whether the secret is revealed
        var secretRevealed = false;

        var clickedMarker; // To store the user's clicked marker
        var line; // To store the line between the markers


        // enable the map
        var mapContainer = document.getElementById("map");
        mapContainer.classList.remove("disabled");


        // WHAT HAPPENS WHEN YOU CLICK ON THE MAP
        // Function to reveal the secret location and distance on click
        map.on('click', function (e) {
            if (!secretRevealed) {
                // Calculate distance between clicked point and secret location
                var distance = e.latlng.distanceTo(secretLocation);

                // Update the marker opacity to reveal the secret location
                secretMarker.setOpacity(1);

                // Set the secret as revealed
                secretRevealed = true;


                if (clickedMarker) {
                    map.removeLayer(clickedMarker); // Remove previous clicked marker
                    map.removeLayer(line); // Remove previous line
                }

                // Add a marker where the user clicked
                clickedMarker = L.marker(e.latlng).addTo(map);

                // Draw a line between the clicked marker and the secret location
                line = L.polyline([e.latlng, secretLocation], {
                    color: 'blue',
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

                // show attribution
                document.getElementById("attribContainer").style.display = "inline";

                // add the scores to the board
                var scoreContainer = document.getElementById("scoreContainer");
                var roundScore = document.createElement("p");
            
                // Add some text to the <p> element
                roundScore.textContent = `Round ${roundNumber}: ${Math.round(distance)}km`;

                scoreContainer.appendChild(roundScore);
            }   
        });

    })
    .catch(error => {
    console.error('Error fetching data:', error);
    });

}


// NEXT ROUND BUTTON
document.addEventListener("DOMContentLoaded", function () {
    var refreshButton = document.getElementById("refreshButton");

    refreshButton.addEventListener("click", function () {
        roundNumber = roundNumber+1;
        fetchDataAndProcess(); // Call the function to redo the process
    });

    // Call the function initially to perform the process
    fetchDataAndProcess();
});
