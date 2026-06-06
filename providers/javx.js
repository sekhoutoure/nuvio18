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

// src/providers/javx.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var BASE_URL = "https://javx.org";
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
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return getTMDBDetails(tmdbId, mediaType).then((mediaInfo) => {
    const query = mediaInfo.title.replace(/\s+/g, "-");
    const searchUrl = `${mainUrl}/search/${query}`;
    return fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    }).then((res) => res.text()).then((html) => {
      const $ = cheerio.load(html);
      const results = [];
      $("article").each((i, el) => {
        const href = $(el).find("a").attr("href");
        const title = $(el).find("a").text() || "No Title";
        if (href) {
          const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
          results.push({ title: title.trim(), url: fullUrl });
        }
      });
      return results;
    }).then((results) => {
      if (results.length === 0)
        return [];
      const matched = results[0];
      return fetch(matched.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Referer": BASE_URL }
      }).then((res) => res.text()).then((pageHtml) => {
        const videoRegex = /(https?:\/\/[^\s'"]+\.(?:mp4|m3u8)[^\s'"]*)/;
        const match = pageHtml.match(videoRegex);
        if (match && match[1]) {
          return [{
            name: "Javx (Auto)",
            title: matched.title,
            url: match[1],
            quality: "Unknown",
            headers: { "User-Agent": "Mozilla/5.0", "Referer": matched.url }
          }];
        }
        return [];
      });
    });
  }).catch((err) => {
    console.error("[Javx Scraper Error]", err.message);
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
