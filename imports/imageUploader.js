formidable = require('formidable');
const gm = require('gm');
const del = require('del');
const uploadsPath = process.cwd() + '/uploads/';

const DEMAND_LOGIN_MESSAGE = {
  error: "Login please"
}
const DIFFRENT_AUTHOR_MESSAGE = {
  error: "Author is diffrent"
}


module.exports.imageUpload = (req, res, Image) => {
  console.log(req.user);
  if (!req.user) {
    res.status(401).json(DEMAND_LOGIN_MESSAGE);
  } else {
    let form = new formidable.IncomingForm();
    let responseBody;
    let fileName = guId();
    form.parse(req, (err, fields, files) => {
      console.log("LEN: ", !Object.keys(files).length);
      if(!Object.keys(files).length) {
        res.status(406).json({error : "no images"});
      } else {
        logFileInfo(fields, files);

        let image = new Image();
        setImageData(image, fields, files, req);
        responseBody = [image];

        //make thumbnailImg
        gm(image.image_path)
          .thumb(100, 100, uploadsPath + fileName + '_thumb.jpg', (err) => {
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
      }
    });
    form.on('fileBegin', (name, file) => {
      file.path = uploadsPath + fileName + '.jpg';
    });
    form.on('progress', (bytesReceived, bytesExpected) => {
      console.log(bytesReceived + '/' + bytesExpected);
    });
  }
}

module.exports.imageUpdate = (req, res, Image) => {
  Image.findOne({_id: req.params.image_id}, (err, doc) => {
    if (!req.session.passport) {
      res.status(401).json(DEMAND_LOGIN_MESSAGE);
    } else if (doc.author !== req.session.passport.user) {
      res.status(403).json(DIFFRENT_AUTHOR_MESSAGE);
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

        Image.findOneAndUpdate({_id: req.params.image_id}, {
          $set: {
            image_title: image.image_title,
            image_desc: image.image_desc
          }
        }, (err, updatedImage) => {
          if(err) {
            res.status(500).send({
              error: 'data update failure'
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
}

module.exports.imageDelete = (req, res, Image) => {
  Image.findOne({_id: req.params.image_id}, (err, doc) => {
    if (err) {
      res.status(400).send(err);
    }
    if (!req.session.passport) {
      console.log("Need to Login");
      res.status(401).json(DEMAND_LOGIN_MESSAGE);
    } else if (doc.author !== req.session.passport.user) {
      console.log("Can delete only author");
      res.status(403).json(DIFFRENT_AUTHOR_MESSAGE);
    } else {
      let imageName = doc.image_path.split('.')[0];
      console.log(imageName);

      del([imageName + '.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });
      del([imageName + '_thumb.jpg']).then((paths) => {
        console.log('Deleted files and folders:\n', paths.join('\n'));
      });

      Image.remove({_id: req.params.image_id}, (err) => {
        if(err) {
          res.send(500).send(err);
        }
        console.log('DOC: ', doc);
        res.status(200).json(doc);
      });
    }
  });
}

const guId = () => {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

const setImageData = (image, fields, files, req) => {
  let newImageValue = {files}.files.image_data;
  console.log('session: ', req.session.passport.user);
  image.image_title = fields.image_title;
  image.image_path = newImageValue.path;
  image.image_desc = fields.image_desc;
  image.author = req.session.passport.user;
  return image;
}

const logFileInfo = (fields, files) => {
  console.log('fields: ');
  console.log(fields);
  console.log('files: ');
  console.log(files);
}
