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

// src/providers/chatrubate.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var BASE_URL = "https://chaturbate.com";
function getTMDBDetails(tmdbId, mediaType) {
  if (tmdbId.startsWith("cxxx:")) {
    return Promise.resolve({ title: decodeURIComponent(tmdbId.substring(5)) });
  }
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  return fetch(url).then((res) => {
    if (!res.ok)
      throw new Error(`TMDB HTTP ${res.status}`);
    return res.json();
  }).then((data) => {
    return {
      title: mediaType === "tv" ? data.name : data.title
    };
  });
}
function unescapeUnicode(str) {
  return str.replace(/\\u([0-9A-Fa-f]{4})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return getTMDBDetails(tmdbId, mediaType).then((mediaInfo) => {
    const query = mediaInfo.title.replace(/\s+/g, "");
    const searchUrl = `${BASE_URL}/api/ts/roomlist/room-list/?hashtags=${encodeURIComponent(query)}&limit=90&offset=0`;
    return fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }).then((res) => {
      if (!res.ok)
        throw new Error(`Chatrubate search HTTP ${res.status}`);
      return res.json();
    }).then((data) => {
      const results = [];
      if (data && data.rooms) {
        for (const room of data.rooms) {
          results.push({
            title: room.username,
            url: `${BASE_URL}/${room.username}`
          });
        }
      }
      return results;
    }).then((results) => {
      if (results.length === 0)
        return [];
      const matched = results[0];
      console.log(`[Chatrubate] Matched search result: ${matched.title} -> ${matched.url}`);
      return fetch(matched.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": BASE_URL
        }
      }).then((res) => {
        if (!res.ok)
          throw new Error(`Chatrubate page HTTP ${res.status}`);
        return res.text();
      }).then((pageHtml) => {
        const scriptRegex = /window\.initialRoomDossier\s*=\s*"([^"]+)"/;
        const match = pageHtml.match(scriptRegex);
        if (!match)
          return [];
        const jsonStr = unescapeUnicode(match[1]);
        const m3u8Regex = /\\?"hls_source\\?"\s*:\s*\\?"([^"\\]+\.m3u8)\\?"/;
        const m3u8Match = jsonStr.match(m3u8Regex) || pageHtml.match(/hls_source['":\s]+([^'"]+\.m3u8)/);
        if (m3u8Match && m3u8Match[1]) {
          return [{
            name: "Chatrubate (Live HLS)",
            title: matched.title,
            url: unescapeUnicode(m3u8Match[1]),
            quality: "Live",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": matched.url
            }
          }];
        }
        return [];
      });
    });
  }).catch((err) => {
    console.error("[Chatrubate Scraper Error]", err.message);
    return [];
  });
}
function search(query) {
  return __async(this, null, function* () {
    return [];
  });
}
function getMediaInfo(url) {
  return __async(this, null, function* () {
    return {};
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { search, getMediaInfo, getStreams };
} else {
  global.getStreams = getStreams;
}
