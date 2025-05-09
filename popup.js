const apiKey = "AIzaSyBg59ZuksCfFB7heKXqzWWwOhe8V-lLyuY";
const defaultSettings = {
  distance: 0.5,       // Default search radius in miles
  price: "2,3",        // Google Places API uses 1-4 ($ - $$$$)
  dietary: "",         // Empty means no filter (future: vegetarian, gluten-free, etc.)
};
// Convert miles to meters (Google Maps API uses meters)
function milesToMeters(miles) {
  return miles * 1609.34;
}

// Load user settings or use defaults
async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(defaultSettings, (settings) => {
      resolve(settings);
    });
  });
}

async function fetchRestaurants() {
    try {
      // 🔄 Show Loading GIF and Hide the Wheel
      document.getElementById("loading-gif").style.display = "block";
      document.getElementById("wheel").style.display = "none";

      // ⏳ Start progress bar
      const progressInterval = showProgressBar();
  
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        const settings = await loadSettings();
  
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${milesToMeters(settings.distance)}&type=restaurant&keyword=healthy&minprice=${settings.price[0]}&maxprice=${settings.price[2]}&key=${apiKey}`;
  
        const response = await fetch(url);
        const data = await response.json();

        // ✅ Complete progress bar
        completeProgressBar(progressInterval);
  
        if (!data.results || data.results.length === 0) {
          console.error("❌ No restaurants found!");
          alert("No restaurants found! Try adjusting your settings.");
          return;
        }
  
        // ✅ Extract restaurant data
        let restaurants = data.results.map((place) => ({
          name: place.name,
          distance: (settings.distance).toFixed(1),
          price: place.price_level ? "$".repeat(place.price_level) : "Unknown",
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
          placeId: place.place_id,
          googleMapsLink: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`, // Add Google Maps link
        }));
  
        // ✅ Remove duplicate restaurant names
        const seen = new Set();
        restaurants = restaurants.filter((restaurant) => {
          if (seen.has(restaurant.name)) {
            return false; // Duplicate found, skip this restaurant
          }
          seen.add(restaurant.name);
          return true; // Unique restaurant, keep it
        });
  
        console.log("✅ Unique Restaurants fetched:", restaurants);
  
        // ✅ Store restaurant details globally
        restaurantDetails = restaurants.reduce((acc, r) => {
          acc[r.name] = r;
          return acc;
        }, {});
  
        // ⏳ Wait 5 seconds before showing the wheel
        setTimeout(() => {
          document.getElementById("loading-gif").style.display = "none"; // ✅ Hide Loading GIF
          document.getElementById("wheel").style.display = "block"; // ✅ Show the wheel
          updateWheel(restaurants); // ✅ Update the wheel with restaurant names
          completeProgressBar(progressInterval);
        }, 2000);
  
      }, (error) => {
        completeProgressBar(progressInterval);
        console.error("❌ Geolocation error:", error);
        alert("Please enable location access to fetch restaurants.");
        document.getElementById("loading-gif").style.display = "none"; // ✅ Hide loading GIF on error
        document.getElementById("wheel").style.display = "block";
      });
    } catch (error) {
      console.error("❌ Error fetching restaurants:", error);
      document.getElementById("loading-gif").style.display = "none"; // ✅ Hide loading GIF on error
      document.getElementById("wheel").style.display = "block";
    }
  }  

  function updateWheel(restaurants) {
    options.length = 0; // Clear the current options array
  
    // Randomly shuffle the restaurants array
    const shuffledRestaurants = [...restaurants].sort(() => Math.random() - 0.5);
  
    // Choose 8 random restaurants
    const selectedRestaurants = shuffledRestaurants.slice(0, 8);
  
    // Extract restaurant names and Google Maps links, and populate options array
    options.push(...selectedRestaurants.map((restaurant) => ({
      name: restaurant.name,
      googleMapsLink: restaurant.googleMapsLink, // Add Google Maps link
      placeId: restaurant.placeId,
    })));
  
    // Debugging: Log the selected restaurants with their links
    console.log("✅ Options for the Wheel:", options);
  
    // Store full restaurant details, including names and links
    restaurantDetails = selectedRestaurants.map((restaurant) => ({
      name: restaurant.name,
      googleMapsLink: restaurant.googleMapsLink // Add the Google Maps link
    }));
  
    console.log("✅ Selected Restaurants for the Wheel:", restaurantDetails);
  
    // Redraw the wheel with the updated options
    drawWheel();
  }  

// 🛠️ Toggle Settings View
function showSettings() {
  document.getElementById("main-view").style.display = "none";
  document.getElementById("settings-view").style.display = "block";
}

function hideSettings() {
  document.getElementById("main-view").style.display = "block";
  document.getElementById("settings-view").style.display = "none";
}

function showProgressBar() {
  const container = document.getElementById("progress-container");
  const bar = document.getElementById("progress-bar");
  container.style.display = "block";
  bar.style.width = "0%";

  // Simulate progress (for demo, since fetch doesn't have true progress)
  let width = 0;
  const interval = setInterval(() => {
    if (width >= 90) {
      clearInterval(interval); // Don't go to 100% until fetch completes
    } else {
      width += 10;
      bar.style.width = `${width}%`;
    }
  }, 300);

  return interval; // So we can clear it later
}

function completeProgressBar(interval) {
  clearInterval(interval);
  const bar = document.getElementById("progress-bar");
  bar.style.width = "100%";
  setTimeout(() => {
    document.getElementById("progress-container").style.display = "none";
  }, 500);
}


// Ensure scripts run only after DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  await fetchRestaurants();

  // Spin button event
  document.getElementById("spin").addEventListener("click", () => spin());

  //logic for viewing restaurant history
  document.getElementById("view-history").addEventListener("click", () => {
    const container = document.getElementById("history-container");
  
    // Toggle visibility
    const isVisible = container.style.display === "block";
    container.style.display = isVisible ? "none" : "block";
  
    if (isVisible) return; // Don't reload if hiding
  
    // Load and display history
    chrome.storage.local.get(["restaurantLog"], (result) => {
      const history = result.restaurantLog || [];
      container.innerHTML = ""; // Clear any previous content
  
      if (history.length === 0) {
        container.textContent = "No history yet!";
        return;
      }
  
      const list = document.createElement("ul");
      list.style.paddingLeft = "0";
  
      history.forEach(entry => {
        const item = document.createElement("li");
        item.style.listStyle = "none";
        item.style.marginBottom = "10px";
  
        const name = document.createElement("strong");
        name.textContent = entry.name || "Unknown";
  
        const time = document.createElement("div");
        time.textContent = `Chosen: ${new Date(entry.timeChosen).toLocaleString()}`;
        time.style.fontSize = "11px";
        time.style.color = "#666";
  
        const link = document.createElement("a");
        link.href = entry.googleMapsLink || "#";
        link.target = "_blank";
        link.textContent = "View on Google Maps";
        link.style.fontSize = "11px";
        link.style.color = "#007BFF";
  
        item.appendChild(name);
        item.appendChild(document.createElement("br"));
        item.appendChild(link);
        item.appendChild(document.createElement("br"));
        item.appendChild(time);
  
        list.appendChild(item);
      });
  
      container.appendChild(list);
    });
  });    
  
  // Open settings view
  document.getElementById("open-settings").addEventListener("click", showSettings);

  // Close settings view
  document.getElementById("close-settings").addEventListener("click", hideSettings);

  // Load saved settings into inputs
  const settings = await loadSettings();
  document.getElementById("distance").value = settings.distance;
  document.getElementById("price").value = settings.price;

  // Save settings
  document.getElementById("save-settings").addEventListener("click", async () => {
    const distance = parseFloat(document.getElementById("distance").value);
    const price = document.getElementById("price").value;
  
    // Save the updated settings
    chrome.storage.sync.set({ distance, price }, async () => {
      swal({
        title: `Settings saved!`,
        icon: "success",
        button: false, // Hide the default OK button
      });
  
      // Hide the settings view and fetch new restaurants
      hideSettings();
      await fetchRestaurants(); // Fetch restaurants with the new settings
    });
  });  
});