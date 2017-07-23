const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

module.exports.findAll = (req, res, Image) => {
  Image.find({}, { image_path: 0 }, (err, members) => {
    if (err) return res.status(500).send({
        error: 'database failure'
    });
    console.log(members);
    res.status(200).json(members);
  });
}
