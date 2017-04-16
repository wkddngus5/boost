'use strict';

let express = require('express');
let app = express();

let path = require('path');

let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let session = require('express-session');

let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

let db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
  console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost:27017/BoostCamp');

let formidable = require('formidable');

let Schema = mongoose.Schema;

//정보, 이미지, 작성자
let pictureSchema = new Schema({
    name: String,
    information: String,
    author: String,
    path: String
}, {
    collection: 'picture'
});

let Picture = mongoose.model('picture', pictureSchema);

app.set('port', process.env.PORT || 3000);

app.get('/', (req, res) => {
    Picture.find((err, members) => {
        if (err) return res.status(500).send({
            error: 'database failure'
        });
        console.log(members);
        res.json(members);
    });
});

app.post('/upload_do', (req, res) => {
  let form = new formidable.IncomingForm();
  let response;
  form.parse(req, function(err, fields, files) {
    console.log('fields: ');
    console.log(fields);
    console.log('files: ');
    console.log(files);

    let newPictureValue = Object.values(files)[0];

    let picture = new Picture();
    picture.name = newPictureValue.name;
    picture.path = newPictureValue.path;
    console.log('name: ' + picture.name + ' path: ' + picture.path);
    response = [picture];
    picture.save((err) => {
      if(err) {
        console.log(err);
        res.status(500).send({
          error: 'data save failure'
        });
      }
      res.status(200).json(response);
    });
  });

  form.on('fileBegin', (name, file) => {
    file.path = __dirname + '/uploads/' + file.name;
  });
  form.on('progress', (bytesReceived, bytesExpected) => {
    console.log(bytesReceived + '/' + bytesExpected);
  });
});

app.use((req, res) => {
    res.type('text/plain');
    res.status('404');
    res.send('404 - Not Found');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.type('text/plain');
    res.status('500');
    res.send('500 - Server Error');
});

app.listen(app.get('port'), () => {
    console.log('Express started on http://localhost:' +
        app.get('port') + '; press Ctrl-C to terminate.');

});
