import fs from 'fs';

// Full mapping of state FIPS codes to state names
const stateFipsToName = {
    "01": "Alabama", "02": "Alaska", "04": "Arizona", "05": "Arkansas",
    "06": "California", "08": "Colorado", "09": "Connecticut", "10": "Delaware",
    "11": "District of Columbia", "12": "Florida", "13": "Georgia",
    "15": "Hawaii", "16": "Idaho", "17": "Illinois", "18": "Indiana",
    "19": "Iowa", "20": "Kansas", "21": "Kentucky", "22": "Louisiana",
    "23": "Maine", "24": "Maryland", "25": "Massachusetts", "26": "Michigan",
    "27": "Minnesota", "28": "Mississippi", "29": "Missouri", "30": "Montana",
    "31": "Nebraska", "32": "Nevada", "33": "New Hampshire", "34": "New Jersey",
    "35": "New Mexico", "36": "New York", "37": "North Carolina", "38": "North Dakota",
    "39": "Ohio", "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania",
    "44": "Rhode Island", "45": "South Carolina", "46": "South Dakota", "47": "Tennessee",
    "48": "Texas", "49": "Utah", "50": "Vermont", "51": "Virginia",
    "53": "Washington", "54": "West Virginia", "55": "Wisconsin", "56": "Wyoming"
};

function addStateNames(geojsonData) {
    geojsonData.features.forEach(feature => {
        const stateFp = feature.properties.STATEFP;
        feature.properties.STATENAME = stateFipsToName[stateFp] || "Unknown";
    });
    return geojsonData;
}

// Load and update GeoJSON
fs.readFile('../us-counties.json', 'utf8', (err, data) => {
    if (err) throw err;
    let geojsonData = JSON.parse(data);
    const updatedGeoJson = addStateNames(geojsonData);
    console.log(JSON.stringify(updatedGeoJson));
});

