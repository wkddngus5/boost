formidable = require('formidable');
const gm = require('gm');
const del = require('del');

module.exports.imageUpload = (req, res, Image) => {
  if (!req.session.passport) {
    res.redirect('/login');
  } else {
    let form = new formidable.IncomingForm();
    let responseBody;
    let fileName = guId();
    form.parse(req, (err, fields, files) => {
      logFileInfo(fields, files);

      let image = new Image();
      setImageData(image, fields, files, req);
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
            error: 'data save failure',
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
};

module.exports.imageUpdate = (req, res, Image) => {
  Image.findOne({ _id: req.params.image_id }, (err, doc) => {
    if (!req.session.passport) {
      res.redirect('/login');
    } else if (doc.author !== req.session.passport.user) {
      res.redirect('/login');
    } else {
      let form = new formidable.IncomingForm();
      let responseBody;
      let fileName = doc.image_path.split('.')[0];

      form.parse(req, function (err, fields, files) {
        logFileInfo(fields, files);

        let image = new Image();
        setImageData(image, fields, files, req);
        responseBody = [image];

        //make thumbnailImg
        gm(image.image_path)
          .thumb(100, 100, fileName + '_thumb.jpg', function (err) {
            if (err) console.error(err);
            else console.log('done - thumb');
          });

        Image.findOneAndUpdate({ _id: req.params.image_id }, {
          $set: {
            image_title: image.image_title,
            image_desc: image.image_desc,
          },
        }, (err, updatedImage) => {
          if (err) {
            res.status(500).send({
              error: 'data update failure',
            });
          }

          res.status(201).json(updatedImage);
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
};

module.exports.imageDelete = (req, res, Image) => {
  Image.findOne({ _id: req.params.image_id }, (err, doc) => {
    if (err) {
      res.status(400).send(err);
    }

    if (!req.session.passport) {
      console.log('Need to Login');
      res.status(301).redirect('/login');
    } else if (doc.author !== req.session.passport.user) {
      console.log('Can delete only author');
      res.status(301).redirect('/login');
    } else {
      let imageName = doc.image_path.split('.')[0];
      console.log(imageName);

      del([imageName + '.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });
      del([imageName + '_thumb.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });

      Image.remove({ _id: req.params.image_id }, (err) => {
        if (err) {
          res.send(500).send(err);
        }

        console.log('DOC: ', doc);
        res.status(200).json(doc);
      });
    }
  });
};

const guId = () => {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};

const setImageData = (image, fields, files, req) => {
  let newImageValue = Object.values(files)[0];
  console.log('session: ', req.session.passport.user._id);

  image.image_title = fields.image_title;
  image.image_path = newImageValue.path;
  image.image_desc = fields.image_desc;
  image.author = req.session.passport.user;
  return image;
};

const logFileInfo = (fields, files) => {
  console.log('fields: ');
  console.log(fields);
  console.log('files: ');
  console.log(files);
};
