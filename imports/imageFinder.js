const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
const responseMessage = require('./responseMessage');

module.exports.findAll = (req, res, Image) => {
  Image.find({}, { image_path: 0 }, (err, members) => {
    if (err) return res.status(500).json(responseMessage.responseMessage.DB_ERROR);
    console.log(members);
    res.status(200).json(members);
  });
}
