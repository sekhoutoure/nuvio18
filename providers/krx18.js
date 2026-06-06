var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/providers/krx18.js
var cheerio = require("cheerio");
function search(query) {
  return __async(this, null, function* () {
    return [];
  });
}
function getMediaInfo(url) {
  return __async(this, null, function* () {
    return {
      id: url,
      title: "Unknown",
      episodes: []
    };
  });
}
function getStreams(url) {
  return __async(this, null, function* () {
    return [];
  });
}
module.exports = {
  search,
  getMediaInfo,
  getStreams
};
