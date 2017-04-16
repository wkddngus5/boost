'use strict';

let express = require('express');
let path = require('path');

let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let session = require('express-session');

let mongoose = require('mongoose');

let db = mongoose.connection;
db.on()('error', console.error);
db.once('open', function() {
  console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost:27017/');

let Schema = mongoose.Schema;

//정보, 이미지, 작성자
let pictureSchema = new Schema( {
  name: String,
  information: String,
  author: String,
  path: String
}, {collection: 'pictures'});

let Picture = mongoose.model('pictures', pictureSchema);


let app = express();

app.set('port', process.env.PORT || 3000);

app.use('/', function(req, res) {
  let picturesArray = [];

  Picture.find({}, {_id:1, name:1, information: 1, author: 1, path: 1}, function(err, Pictures) {
    if(err) {
      return res.status(500).send({error: 'database failure'});
    }
    res.type('text/plain');
    res.status('200')
    res.send(Pictures);
  });
});

app.use(function(req, res) {
  res.type('text/plain');
  res.status('404');
  res.send('404 - Not Found');
});

app.use(function(err, req, res, next) {
  console.error(err.stack);;
  res.status('500');
  res.send('500 - Server Error');
});

app.listen(app.get('port'), function() {
  console.log('Express started on http://localhost:' +
  app.get('port') + '; press Ctrl-C to terminate');
});
