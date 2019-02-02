const express = require('express')
const app = express()
const fs = require("fs")


const updater = require("./update")
const update = updater.update
const emitter = updater.emitter

// this is for testing
let calendar_id = ""
let begin = "2019-1-21"
let end = "2019-1-26"

// fetch the data for update
update(calendar_id, begin, end)

let data = fs.readFileSync("json/timetable.json")
let timetable = JSON.parse(data)

function parseURL(url) {
    var hash;
    var myJson = {};
    var hashes = url.slice(url.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        myJson[hash[0]] = hash[1];
    }
    Object.keys(myJson).forEach(key => {
        if (myJson[key] === undefined) {
          delete myJson[key]
        }
      })
    return myJson;
}

app.get('/\*', (req, res) => {
    url = req.url
    url = url.substr(1)
    if (url !== "favicon.ico") {
        queries = parseURL(url)
    }
    console.dir(queries)
    calendar_id = queries.id
    begin = queries.begin
    end = queries.end
    update(calendar_id, begin, end)
    
    // when received data, send it to client
    emitter.addListener("received", () => {
        data = fs.readFileSync("json/timetable.json")
        timetable = JSON.parse(data)
        res.send(timetable)
        emitter.removeAllListeners("received")
    }) 
    console.log("timetable sent", timetable)
})

const server = app.listen(8081, () => {
    const host = server.address().address
    const port = server.address().port
    console.log("Example app listening at http://%s:%s", host, port)
})