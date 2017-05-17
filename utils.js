module.exports.guid = () => {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}

module.exports.logFileInfo = (fields, files) => {
  console.log('fields: ');
  console.log(fields);
  console.log('files: ');
  console.log(files);
}

module.exports.setImageData = (image, fields, files) => {
  let newImageValue = Object.values(files)[0];
  console.log('newImageValue: ' + newImageValue.path);

  image.image_title = fields.image_title;
  image.image_path = newImageValue.path;
  image.image_desc = fields.image_desc;
  image.author = fields.author;
  console.log('name: ' + image.image_name + ' path: ' + image.image_path);
  return image;
}
