// Get default configuration
require('dotenv').config();

var version = "1.0.0";

var http = require("http");
var fs = require('fs');
var url = require('url');
var bodyParser = require('body-parser');

var express = require('express');
var app = express();

var www = __dirname + '/public';
app.use(express.static(www));
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var Gelf = require('gelf');
var gelf = new Gelf({
  graylogPort: process.env.NODE_GRAYLOG_PORT,
  graylogHostname: process.env.NODE_GRAYLOG_HOST,
  connection: 'lan',
  maxChunkSizeWan: 1420,
  maxChunkSizeLan: 8154
});

var StatsD = require('node-statsd');
var client = new StatsD({
    host: process.env.NODE_STATSD_HOST,
    port: process.env.NODE_STATSD_PORT,
    prefix: process.env.NODE_STATSD_PREFIX,
    // suffix: 'dev',
    // globalize: true,
    // mock: true,
    // global_tags: ['gtag']
    debug: true
});

client.socket.on('error', function(error) {
  return console.error("Error in socket: ", error);
});

const InfluxDB = require('influxdb-nodejs');
console.log(process.env.NODE_INFLUXDB_URI);
const influx = new InfluxDB(process.env.NODE_INFLUXDB_URI);

// console.log(JSON.stringify(result));

// app.use('/js', express.static(__dirname + '/js'));
// app.use('/images', express.static(__dirname + '/images'));

var start = process.hrtime();

// var elapsed_time = function(note){
//     var precision = 3; // 3 decimal places
//     var elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
//     console.log(process.hrtime(start)[0] + " s, " + elapsed.toFixed(precision) + " ms - " + note); // print message + time
//     start = process.hrtime(); // reset the timer
// }

function renderHTML(res, filePath){
  var start = process.hrtime();

  gelf.emit('gelf.log', 'GET /'+filePath);

  html = "";

  html += fs.readFileSync(www+"/header.html", 'utf8');
  html += fs.readFileSync(www+"/"+filePath, 'utf8');
  html += fs.readFileSync(www+"/footer.html", 'utf8');

  client.increment('visitor_counter');
  // client.increment('foo');

  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(html);
  res.end();

  var loadtime = (process.hrtime(start)[1] / 1000000).toFixed(3);
  client.histogram('loadtime_'+filePath, loadtime);
  console.log("GET /" + filePath + " ("+loadtime+"ms)")
}

app.get('/', function(req, res){
  renderHTML(res, "200.html");
});

app.get('/about', function(req, res){
  renderHTML(res, "about.html");
});

app.get('/graylog', function(req, res){
  renderHTML(res, "graylog.html");
});

app.get('/statsd', function(req, res){
  renderHTML(res, "statsd.html");
  // client.timing('response_time', 42);
  // client.increment('my_counter');
  // client.decrement('my_counter');
  // client.histogram('my_histogram', 42);
  // client.gauge('my_gauge', 123.45);
  // client.set('my_unique', 'foobar');
  // client.unique('my_unique', 'foobarbaz');
  // client.increment(['these', 'are', 'different', 'stats']);
  // client.increment('my_counter', 1, 0.25);
  // client.histogram('my_histogram', 42, ['foo', 'bar']);
});

app.post('/api/v1/statsd', function(req, res){
  // console.log(req.body.func, req.body.value);
  if(req.body.func != undefined && req.body.value != undefined){
    gelf.emit('gelf.log', 'POST API /api/v1/statsd ['+req.body.func+', '+req.body.value+']');
    switch(req.body.func){
      case "inc.btc": client.increment('btc.values', req.body.value); console.log("[API v1] increase BTC +"+req.body.value); res.json({ status: true }); break;
      case "dec.btc": client.decrement('btc.values', req.body.value); console.log("[API v1] decrease BTC -"+req.body.value); res.json({ status: true }); break;
      case "inc.xrp": client.increment('xrp.values', req.body.value); console.log("[API v1] increase XRP +"+req.body.value); res.json({ status: true }); break;
      case "dec.xrp": client.decrement('xrp.values', req.body.value); console.log("[API v1] decrease XRP -"+req.body.value); res.json({ status: true }); break;
      case "get.visitor.count":
        var reader = influx.query('nazuna_visitor_counter');
        // reader.addFunction('count', 'value');
        reader.addFunction('sum', 'value');
        // reader.addFunction('time', '1h');
        // reader.addGroup('time', '1h');
        reader.then(data => {
          // res.json({ status: data });
          var visitor_count = data.results[0].series[0].values[0][1];
          console.info(visitor_count);
          res.json({ status: true, result: visitor_count });
        }).catch(err => {
          console.error(err);
        });
        break;
      default: res.json({ status: true }); break;
    }
  }else{
    res.json({ status: false });
  }
});

app.post('/send', function(req, res){
  res.send('id: ' + req.body.money);
});

app.post('/gelf', function(req, res){
  console.log("POST => " + req.body);

  var message = {
    "version": version,
    // "host": "opsta.hk",
    "short_message": req.body.short_message,
    "full_message": req.body.full_message,
    // "full_message": "Hello worlds, you're welcome\n\nmore best regard.",
    "timestamp": new Date(),
    "level": 1,
    // "facility": "IT@Ladkrabang",
    // "file": "/var/www/somefile.rb",
    // "line": 356,
    // "_user_id": 42,
    // "_something_else": "foo"
  };
  gelf.emit('gelf.log', message);

  res.redirect('/');
});

app.get('/healthcheck', function(req, res){
  gelf.emit('gelf.log', 'HEALTHCHECK HTTP 200 OK, Nazuna is alive~');
  res.end('HTTP 200 OK\n');
});

app.listen(8081);

// http.createServer(function (request, response) {
//
//   var pathname = url.parse(request.url).pathname;
//
//   // Print the name of the file for which request is made.
//   console.log("Request for " + pathname + " received.");
//
//   // Read the requested file content from file system
//   fs.readFile(pathname.substr(1), function (err, data) {
//      if (err) {
//         console.log(err);
//         response.writeHead(404, {'Content-Type': 'text/html'});
//      }else {
//         response.writeHead(200, {'Content-Type': 'text/html'});
//
//         response.write(data.toString());
//      }
//      // Send the response body
//      response.end();
//   });
//    // Send the HTTP header
//    // HTTP Status: 200 : OK
//    // Content Type: text/plain
//    // response.writeHead(200, {'Content-Type': 'text/plain'});
//
//    //send just a shortmessage
//     gelf.emit('gelf.log', 'myshortmessage');
//
//     //send a full message
//     var message = {
//       "version": "1.0",
//       "host": "www1",
//       "short_message": "Hello worlds",
//       "full_message": "Hello worlds, you're welcome\n\nmore best regard.",
//       "timestamp": 1291899930.412,
//       "level": 1,
//       "facility": "payment-backend",
//       "file": "/var/www/somefile.rb",
//       "line": 356,
//       "_user_id": 42,
//       "_something_else": "foo"
//     };
//
//     gelf.emit('gelf.log', message);
//    // Send the response body as "Hello World"
//    // response.end('Hello World\n');
// }).listen(8081);

console.log('Server running at http://127.0.0.1:8081/');
