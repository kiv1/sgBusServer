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
            let temp = null
            let busServices = await getBus(key)
            busServices.sort(function (a, b) {
                return a.ServiceNo - b.ServiceNo
            })
            if (busServices.length == 0){
                temp = {
                    code: key,
                    lat: value.lat,
                    lng: value.lng,
                    name: value.name,
                    busServices:[]
                }
            }else{
                temp = {
                    code: key,
                    lat: value.lat,
                    lng: value.lng,
                    name: value.name,
                    busServices:busServices,
                }
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
    res.send(await getAllStopNearby(lat, lng))
});

app.get("/api/getBus", async (req, res, next) => {
    var code = req.param('code')
    res.send(await getBus(code))
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