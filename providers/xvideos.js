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

// src/providers/xvideos.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var MAIN_URL = "https://www.xvideos.com";
function getTMDBDetails(tmdbId, mediaType) {
  if (tmdbId && typeof tmdbId === "string" && tmdbId.startsWith("cxxx:")) {
    try {
      return Promise.resolve({ title: decodeURIComponent(tmdbId.substring(5)) });
    } catch (e) {
      return Promise.resolve({ title: tmdbId.substring(5) });
    }
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
    const query = mediaInfo.title;
    const searchUrl = `${MAIN_URL}/?k=${encodeURIComponent(query)}`;
    return fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }).then((res) => {
      if (!res.ok)
        throw new Error(`XVideos search HTTP ${res.status}`);
      return res.text();
    }).then((html) => {
      const $ = cheerio.load(html);
      const results = [];
      $("div.mozaique div.thumb-block").each((i, el) => {
        const titleElement = $(el).find("p.title a");
        const title = titleElement.attr("title") || titleElement.text();
        const href = titleElement.attr("href");
        if (title && href) {
          const fullUrl = href.startsWith("http") ? href : `${MAIN_URL}${href}`;
          results.push({ title, url: fullUrl });
        }
      });
      return results;
    }).then((results) => {
      if (results.length === 0)
        return [];
      const matched = results[0];
      console.log(`[XVideos] Matched search result: ${matched.title} -> ${matched.url}`);
      return fetch(matched.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": MAIN_URL
        }
      }).then((res) => {
        if (!res.ok)
          throw new Error(`XVideos page HTTP ${res.status}`);
        return res.text();
      }).then((pageHtml) => {
        const videoRegex = /(https?:\/\/[^\s'"]+\.(?:mp4|mkv|m3u8)[^\s'"]*)/g;
        const matches = pageHtml.match(videoRegex) || [];
        const streams = [];
        const uniqueUrls = /* @__PURE__ */ new Set();
        matches.forEach((rawUrl) => {
          const url = rawUrl.replace(/\\/g, "");
          if (uniqueUrls.has(url))
            return;
          uniqueUrls.add(url);
          let label = "Stream";
          let quality = "720p";
          if (url.includes("hls") || url.includes("m3u8")) {
            label = "HLS Stream";
            quality = "1080p";
          } else if (url.includes("high") || url.includes("1080")) {
            label = "High Quality";
            quality = "1080p";
          } else if (url.includes("low") || url.includes("360")) {
            label = "Low Quality";
            quality = "360p";
          }
          streams.push({
            name: `XVideos (${label})`,
            title: matched.title,
            url,
            quality,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
              "Referer": matched.url
            }
          });
        });
        return streams;
      });
    });
  }).catch((err) => {
    console.error("[XVideos Scraper Error]", err.message);
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
