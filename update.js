const fs = require('fs')
const readline = require('readline')
const { google } = require('googleapis')
const EventEmitter = require('events')

// create an event: when receive data from google server and written it into the json file successfully, emit event to update to the client
class Emitter extends EventEmitter {}
const emitter = new Emitter()


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'json/token.json'
const TIMETABLE_PATH = "json/timetable.json"

// Load client secrets from a local file.
const update = (calendar_id="", begin="", end="") => (fs.readFile('json/credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err)
  // Authorize a client with credentials, then call the Google Calendar API.
  authorize(JSON.parse(content), get, calendar_id, begin, end)
}))

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, calendar_id, begin, end) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, calendar_id, begin, end);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function get(auth, calendar_id, begin, end) {
  // calendar_id string: the id of the calendar requested
  // begin datetime: the datetime of the period requested, should be in form "yyyy-mm-dd"
  // end datetime: the datetime of the period requested, should be in form "yyyy-mm-dd"
  // the return data will contain the data requested, the beginning and the ending time of each event
  const calendar = google.calendar({ version: 'v3', auth });
  console.log(calendar_id, begin, end)
  calendar.events.list({
    calendarId: calendar_id,
    timeMin: (new Date(begin)).toISOString(),
    timeMax: (new Date(end)).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    let responsebody = []
    for (let e of events) {
      item = {
        id: e.id,
        htmlLink: e.htmlLink,
        summary: e.summary,
        start: e.start,
        end: e.end,
        location: e.location
      }
      Object.keys(item).forEach(key => {
        if (item[key] === undefined) {
          delete item[key]
        }
      })
      responsebody.push(item)
    }
    console.log(responsebody)
    responsebody = JSON.stringify(responsebody)
    fs.writeFile(TIMETABLE_PATH, responsebody, (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
      emitter.emit("received")
    })
  });
}

exports.update = update
exports.emitter = emitter