'use strict';

const express = require('express');
const app = express();

const path = require('path');

const logger = require('morgan');

const bodyParser = require('body-parser').json();
const session = require('express-session');

app.use(session({
    secret: 'secure key',
    resave: false,
    saveUnitialized: false,
    cookie: { secure: false }
}));

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
const User = dbModels.makeUserDao(mongoose);

const del = require('del');

app.set('port', process.env.PORT || 3000);

app.post('/user', bodyParser, (req, res) => {
    User.findOne({ email: req.body.email }, (err, doc) => {
        if(doc) {
            res.status(403).send({
                error: 'email overlaped!'
            });
            return;
        }

        let user = new User();
        user.email = req.body.email;
        user.password = req.body.password;
        user.nickname = req.body.nickname;
        console.log('NEW USER: ' + user);

        user.save((err) => {
            if(err) {
                console.log(err);
                res.status(500).send({
                    error: 'data save failure'
                });
            }
            res.send(user);
        });
    });
});

app.post('/login', bodyParser, (req, res) => {
    User.findOne({ email: req.body.email }, (err, doc) => {
        if(!doc) {
            res.status(403).send({
                error: 'not found account'
            });
            return;
        }
        if(doc.password != req.body.password) {
            res.status(403).send({
                error: 'password wrong'
            });
            return;
        }
        req.session.login_ok = true;
        req.session.login_id = doc._id;
        res.status(200).send({
            login_id: req.session.login_id
        });
    });
});

app.get('/logout', (req, res) => {
   req.session .destroy(() => {
       res.send(req.session);
   });
});

//get picture's info from mongodb
app.get('/', (req, res) => {
  imageFinder.findAll(Image, res);
});

//file upload(post)
app.post('/image', (req, res) => {
  let form = new formidable.IncomingForm();
  let responseBody;
  let fileName = utils.guid();
  form.parse(req, (err, fields, files) => {
    utils.logFileInfo(fields, files);

    let image = new Image();
    utils.setImageData(image, fields, files);
    responseBody = [image];

    //make thumbnailImg
    gm(image.image_path)
    .thumb(100, 100, 'uploads/' + fileName + '_thumb.jpg', (err) => {
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

//get a image file
app.get('/image/:image_name', (req, res) => {
  let filePath = req.params.image_name;
  res.status(200).sendFile(__dirname + '/uploads/' +  filePath + '.jpg');
});

//delete a image file
app.delete('/image/:image_id', (req, res) => {
    Image.findOne({ _id: req.params.image_id }, (err, doc) => {
        let imageName = doc.image_path.split('.')[0];
        console.log(imageName);

        del([imageName + '.jpg']).then( (paths) => {
            console.log('Deleted files and folders:\n', paths.join('\n'));
        });
        del([imageName + '_thumb.jpg']).then( (paths) => {
            console.log('Deleted files and folders:\n', paths.join('\n'));
        });

        Image.remove({ _id: req.params.image_id }, function(err) {
            res.status(200).json(doc);
        });
    });
});

//update a image file
app.put('/image/:image_id', (req, res) => {
    Image.findOne({ _id: req.params.image_id }, (err, doc) => {
        console.log(doc);
        let form = new formidable.IncomingForm();
        let responseBody;
        let fileName = doc.image_path.split('.')[0];

        form.parse(req, function(err, fields, files) {
            utils.logFileInfo(fields, files);

            let image = new Image();
            utils.setImageData(image, fields, files);
            responseBody = [image];

            //make thumbnailImg
            gm(image.image_path)
                .thumb(100, 100, fileName + '_thumb.jpg', function (err) {
                    if (err) console.error(err);
                    else console.log('done - thumb');
                });

            Image.findOneAndUpdate({ _id: req.params.image_id }, {$set: {
                image_title: image.image_title,
                image_desc: image.image_desc
                }}, (err, doc) => {
                res.status(200).json(image);
            });
        });

        form.on('fileBegin', (name, file) => {
            file.path = fileName +'.jpg';
        });

        form.on('progress', (bytesReceived, bytesExpected) => {
            console.log(bytesReceived + '/' + bytesExpected);
        });
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
