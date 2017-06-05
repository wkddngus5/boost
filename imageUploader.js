formidable = require('formidable');
const gm = require('gm');


module.exports.imageUpload = (req, res, Image) => {
  let form = new formidable.IncomingForm();
  let requestBody;
  let fileName = guId();

  form.parse(req, function(err, fields, files) {
    let image = new Image();
    setImageData(image, fields, files);
    requestBody = [image];

    gm(image.image_path)
    .thumb(100, 100, 'uploads/' + fileName + '_thumb.jpg', function (err) {
      if (err) console.error(err);
      else console.log('done - thumb');
    });

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
    file.path = __dirname + '/../uploads/' + fileName +'.jpg';
  });
  form.on('progress', (bytesReceived, bytesExpected) => {
    console.log(bytesReceived + '/' + bytesExpected);
  });
}

guId = () => {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

const setImageData = (image, fields, files, req) => {
  let newImageValue = Object.values(files)[0];
  console.log('session: ', req.session.passport.user._id);

  image.image_title = fields.image_title;
  image.image_path = newImageValue.path;
  image.image_desc = fields.image_desc;
  image.author = req.session.passport.user._id;
  return image;
}
