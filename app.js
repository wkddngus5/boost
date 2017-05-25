'use strict';

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const jsonParser = bodyParser.json();

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const db = mongoose.connection;
db.on('error', console.error);
db.once('open', function () {
  console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost:27017/BoostCamp');
const formidable = require('formidable');
const Schema = mongoose.Schema;

const gm = require('gm');

const importFilesPath = process.cwd();
const utils = require(importFilesPath + '/utils');
const dbModels = require(importFilesPath + '/dbModels');
const imageFinder = require(importFilesPath + '/imageFinder');
const imageUploader = require(importFilesPath + '/imageUploader');

const Image = dbModels.makeImageDao(mongoose);
const User = dbModels.makeUserDao(mongoose);

const del = require('del');

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('port', process.env.PORT || 3000);

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function (email, password, done) {

    User.findOne({email: email}, function (err, user) {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, {message: 'Incorrect username.'});
      }
      if (user.password !== password) {
        return done(null, false, {message: 'Incorrect password.'});
      }
      return done(null, user);
    });
  }
));

passport.serializeUser(function (user, done) {
  console.log("serialize", user, user.id);
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  console.log("deserialize");
  User.findOne({_id: id}, function (err, user) {
    console.log(id, user);
    done(err, user);
  });
});

app.get('/login', (req, res) => {
  res.status(200).send('login plz');
});

app.post('/login_local', jsonParser,
  passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/fail',
    }
  ));

app.get('/ok', (req, res) => {
  res.send(req.user);
});

app.get('/fail', (req, res) => {
  res.send('FAIL');
});


app.post('/user', jsonParser, (req, res) => {
  User.findOne({email: req.body.email}, (err, doc) => {
    if (doc) {
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
      if (err) {
        console.log(err);
        res.status(500).send({
          error: 'data save failure'
        });
      }
      res.status(200).send(user);
    });
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

//get picture's info from mongodb
app.get('/', (req, res) => {
  if (!req.session.passport) {
    res.redirect('/login');
  } else {
    console.log('SESSION: ', req.session.passport.user);
    Image.find({author: req.session.passport.user}, (err, doc) => {
      res.status(200).json(doc);
    });
  }
});

//file upload(post)
app.post('/image', (req, res) => {
  if (!req.session.passport) {
    res.redirect('/login');
  } else {
    let form = new formidable.IncomingForm();
    let responseBody;
    let fileName = utils.guid();
    form.parse(req, (err, fields, files) => {
      utils.logFileInfo(fields, files);

      let image = new Image();
      utils.setImageData(image, fields, files, req);
      responseBody = [image];

      //make thumbnailImg
      gm(image.image_path)
        .thumb(100, 100, 'uploads/' + fileName + '_thumb.jpg', (err) => {
          if (err) console.error(err);
          else console.log('done - thumb');
        });

      //db save
      image.save((err) => {
        if (err) {
          console.log(err);
          res.status(500).send({
            error: 'data save failure'
          });
        }
        res.status(201).json(responseBody);
      });
    });
    form.on('fileBegin', (name, file) => {
      file.path = __dirname + '/uploads/' + fileName + '.jpg';
    });
    form.on('progress', (bytesReceived, bytesExpected) => {
      console.log(bytesReceived + '/' + bytesExpected);
    });
  }
});

//get a image file
app.get('/image/:image_name', (req, res) => {
  let filePath = req.params.image_name;
  res.status(200).sendFile(__dirname + '/uploads/' + filePath + '.jpg');
});

//delete a image file
app.delete('/image/:image_id', (req, res) => {
  Image.findOne({_id: req.params.image_id}, (err, doc) => {
    if (!req.session.passport) {
      res.redirect('/login');
    } else if (doc.author !== req.session.passport.user) {
      res.redirect('/login');
    } else {
      let imageName = doc.image_path.split('.')[0];
      console.log(imageName);

      del([imageName + '.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });
      del([imageName + '_thumb.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });

      Image.remove({_id: req.params.image_id}, function (err) {
        res.status(200).json(doc);
      });
    }
  });
});

//update a image file
app.put('/image/:image_id', (req, res) => {
  Image.findOne({_id: req.params.image_id}, (err, doc) => {
    if (!req.session.passport) {
      res.redirect('/login');
    } else if (doc.author !== req.session.passport.user) {
      res.redirect('/login');
    } else {
      let form = new formidable.IncomingForm();
      let responseBody;
      let fileName = doc.image_path.split('.')[0];

      form.parse(req, function (err, fields, files) {
        utils.logFileInfo(fields, files);

        let image = new Image();
        utils.setImageData(image, fields, files, req);
        responseBody = [image];

        //make thumbnailImg
        gm(image.image_path)
          .thumb(100, 100, fileName + '_thumb.jpg', function (err) {
            if (err) console.error(err);
            else console.log('done - thumb');
          });

        Image.findOneAndUpdate({_id: req.params.image_id}, {
          $set: {
            image_title: image.image_title,
            image_desc: image.image_desc
          }
        }, (err, doc) => {
          res.status(200).json(image);
        });
      });

      form.on('fileBegin', (name, file) => {
        file.path = fileName + '.jpg';
      });

      form.on('progress', (bytesReceived, bytesExpected) => {
        console.log(bytesReceived + '/' + bytesExpected);
      });
    }

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
