'use strict';

const express = require('express');
const app = express();

const path = require('path');

const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
  console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost:27017/BoostCamp');
const formidable = require('formidable');
const Schema = mongoose.Schema;

const gm = require('gm');

const importFilesPath = process.cwd();
const utils = require(importFilesPath + '/config/utils');
const dbModels = require(importFilesPath + '/config/dbModels');
const imageFinder = require(importFilesPath + '/config/imageFinder');
const imageUploader = require(importFilesPath + '/config/imageUploader');

const Image = dbModels.makeImageDao(mongoose);

app.set('port', process.env.PORT || 3000);

//get picture's info from mongodb
app.get('/', (req, res) => {
  imageFinder.findAll(Image, res);
});

//file upload(post)
app.post('/image', (req, res) => {
  let form = new formidable.IncomingForm();
  let responseBody;
  let fileName = utils.guid();
  form.parse(req, function(err, fields, files) {
    utils.logFileInfo(fields, files);

    let image = new Image();
    utils.setImageData(image, fields, files);
    responseBody = [image];

    //make thumbnailImg
    gm(image.image_path)
    .thumb(100, 100, 'uploads/' + fileName + '_thumb.jpg', function (err) {
      if (err) console.error(err);
      else console.log('done - thumb');
    });

    //db save
    image.save((err) => {
      if(err) {
        console.log(err);
        res.status(500).send({
          error: 'data save failure'
        });
      }
      res.status(201).json(responseBody);
    });
  });
  form.on('fileBegin', (name, file) => {
    file.path = __dirname + '/uploads/' + fileName +'.jpg';
  });
  form.on('progress', (bytesReceived, bytesExpected) => {
    console.log(bytesReceived + '/' + bytesExpected);
  });
});

//get a picture file
app.get('/image/:image_name', (req, res) => {
  let filePath = req.params.image_name;
  res.status(200).sendFile("/Users/Naver/Desktop/boost/uploads/" + filePath);
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
