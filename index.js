require('dotenv').config();

var express = require("express");
var app = express();

const PORT = process.env.PORT;
const URL = process.env.URL;
const ltaDataMallKey = process.env.LTA_DATAMALL_KEY
const allBusStopURL = process.env.ALL_BUS_STOP_URL

const request = require("request");


function arePointsNear(checkPoint, centerPoint, km) {
    var ky = 40000 / 360
    var kx = Math.cos(Math.PI * centerPoint.lat / 180.0) * ky
    var dx = Math.abs(centerPoint.lng - checkPoint.lng) * kx
    var dy = Math.abs(centerPoint.lat - checkPoint.lat) * ky

    return Math.sqrt(dx * dx + dy * dy) <= km
}

function distance(lat1, lon1, lat2, lon2, unit) {
	if ((lat1 == lat2) && (lon1 == lon2)) {
		return 0;
	}
	else {
		var radlat1 = Math.PI * lat1/180;
		var radlat2 = Math.PI * lat2/180;
		var theta = lon1-lon2;
		var radtheta = Math.PI * theta/180;
		var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
		if (dist > 1) {
			dist = 1;
		}
		dist = Math.acos(dist);
		dist = dist * 180/Math.PI;
		dist = dist * 60 * 1.1515;
		if (unit=="K") { dist = dist * 1.609344 }
		if (unit=="N") { dist = dist * 0.8684 }
		return dist;
	}
}

async function getBus(text) {
    return new Promise(function (resolve, reject) {
      var url =
        "http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=";
      let resultString = httpGet(url + text);
      resultString.then(function (result) {
        resolve(result.Services);
      });
    });
}

function httpGet(theUrl) {
    try {
      return new Promise(function (resolve, reject) {
        request(
          theUrl,
          {
            headers: {
              AccountKey: ltaDataMallKey,
            },
          },
          function (error, res, body) {
            if (!error && res.statusCode == 200) {
              try {
                resolve(JSON.parse(body));
              } catch (err) {
                resolve("");
              }
            } else {
              resolve("");
            }
          }
        );
      }).catch(function (reason) {
        resolve("");
        return;
      });
    } catch (err) {
      resolve("");
    }
}

function getAllBusStop() {
    return new Promise(function (resolve, reject) {
        let resultString = httpGet(allBusStopURL)
        resultString.then(function (result) {
            resolve(result)
        })
    })
}

async function asyncForEach(array, callback) {
    for (let key in array) {
      await callback(array[key], key, array);
    }
}

async function getAllStopNearby(sentLat, sentLng){
    let centerPoint = {
      lat: sentLat,
      lng: sentLng,
    };
    output = [];
    let allBusStop = await getAllBusStop()
    await asyncForEach(allBusStop, async (value, key) => {          
        let checkedPoint = {
            lat: value.lat,
            lng: value.lng
        }
        if (arePointsNear(checkedPoint, centerPoint, 0.5)) { 
            let d = distance(checkedPoint.lat, checkedPoint.lng, centerPoint.lat, centerPoint.lng, 'K')
            temp = {
                code: key,
                lat: value.lat,
                lng: value.lng,
                name: value.name,
                distance: d,
            }           
            output.push(temp);
        }
    })
    return output;
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


app.get("/api/getNearby", async (req, res, next) => {
    var lat = req.param('lat')
    var lng = req.param('lng')
    let busStops = await getAllStopNearby(lat, lng)
    busStops.sort(function (a, b) {
      return a.distacne - b.distacne
    })
    busStops.reverse();
    res.send(busStops)
});

app.get("/api/getBus", async (req, res, next) => {
    var code = req.param('code')
    let busServices = await getBus(code)

    busServices.sort(function (a, b) {
      return a.ServiceNo - b.ServiceNo
    })
    res.send(busServices)
});

app.get('/', (req, res) => {
    try{
      console.log('I am alive!')
      res.send('I am alive!');
    }catch(err){
      console.log(err)
      res.send(err);
    }
});