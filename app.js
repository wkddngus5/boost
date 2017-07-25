'use strict';

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const importFilesPath = process.cwd() + '/imports';

const session = require('express-session');

const mongoose = require('mongoose');
const db = mongoose.connection;

const formidable = require('formidable');
const gm = require('gm');
const del = require('del');

const utils = require(importFilesPath + '/utils');
const dbModels = require(importFilesPath + '/dbModels');
const imageFinder = require(importFilesPath + '/imageFinder');
const imageUploader = require(importFilesPath + '/imageUploader');
const responseMessage = require(importFilesPath + '/responseMessage');

const Image = dbModels.makeImageDao(mongoose);
const User = dbModels.makeUserDao(mongoose);

mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost:27017/BoostCamp');
db.on('error', console.error);
db.once('open', function () {
  console.log("Connected to mongod server");
});

app.set('port', process.env.PORT || 3000);

app.use(bodyParser.urlencoded({extended: false}));

app.use(session({
  secret: 'keyboard cat?!',
  resave: true,
  saveUninitialized: true,
}));

//get all picture's info from mongodb
app.get('/', (req, res) => {
  // res.sendFile(__dirname + '/index.html');
  imageFinder.findAll(req, res, Image);
});

app.post('/login', jsonParser, (req, res) => {
  console.log(req.body.email);
  console.log(req.body.password);
  User.findOne({email: req.body.email}, (err, user) => {
    if (err) {
      res.status(500).json(responseMessage.responseMessage.DB_ERROR);
    }
    else if (!user) {
      res.status(401).json(responseMessage.responseMessage.NO_USER);
    }
    else if (user.password !== req.body.password) {
      res.status(401).json(responseMessage.responseMessage.WRONG_PASSWORD);
    } else {
      req.session.login_ok = true;
      req.session.login_id = user._id;
      console.log("USER: ", user);
      res.status(200).json(user);
    }
  });
});

app.get('/login', (req, res) => {
  res.status(200).send('login plz');
});

app.post('/user', jsonParser, (req, res) => {
  User.findOne({email: req.body.email}, (err, doc) => {
    if (doc) {
      res.status(406).json(responseMessage.responseMessage.EMAIL_DUPLICATION);
      return;
    }
    let user = new User();
    user.email = req.body.email;
    user.password = req.body.password;
    user.nickname = req.body.nickname;
    console.log('NEW USER: ' + user);

    user.save((err) => {
      if (err) {
        console.log(err);
        res.status(500).json(responseMessage.responseMessage.DB_ERROR);
      }
      res.status(201).json(user);
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.status(301).json(responseMessage.responseMessage.LOGOUT);
  });
});

//get own picture's info from mongodb
app.get('/image', (req, res) => {
  if (!req.session.login_ok) {
    res.status(401).json(responseMessage.responseMessage.NO_SESSION);
  } else {
    Image.find({author: req.session.login_id},
       (err, doc) => {
      res.status(200).json(doc);
    })
  }
});

//file upload(post)
app.post('/image', (req, res) => {
  User.findOne({_id: req.session.login_id}, {nickname:1}, (err, doc) => {
    imageUploader.imageUpload(req, res, Image, doc.nickname);
  });

});

//get a image file
app.get('/image/:image_name', (req, res) => {
  let fileName = req.params.image_name;
  res.status(200).sendFile(__dirname + '/uploads/' + fileName + '.jpg');
});

// delete a image file
app.delete('/image/:image_id', (req, res) => {
  imageUploader.imageDelete(req, res, Image);
});

//update a image file
app.put('/image/:image_id', (req, res) => {
  imageUploader.imageUpdate(req, res, Image);
});

app.get('/.well-known/acme-challenge/abLJVjSCk_S2MLu_IuymoEJ91gwvN9yluSafEAmJff8', (req, res) => {
  res.sendfile(__dirname + '/abLJVjSCk_S2MLu_IuymoEJ91gwvN9yluSafEAmJff8.yYch_QIBu6poQ4uSHBS_bcEU6E5CMmVBseTScmbP_Uo');
});

app.use((req, res) => {
  res.type('text/plain');
  res.status('404');
  res.status(404).send('404 - Not Found');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.type('text/plain');
  res.status('500');
  res.status(500).send('500 - Server Error');
});

app.listen(app.get('port'), () => {
  console.log('Express started on http://localhost:' +
    app.get('port') + '; press Ctrl-C to terminate.');
});
