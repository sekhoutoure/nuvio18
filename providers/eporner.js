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

// src/providers/eporner.js
var cheerio = require("cheerio-without-node-native");
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var BASE_URL = "https://www.eporner.com";
function getTMDBDetails(tmdbId, mediaType) {
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
function base36(hash) {
  if (hash.length >= 32) {
    const part1 = parseInt(hash.substring(0, 8), 16).toString(36);
    const part2 = parseInt(hash.substring(8, 16), 16).toString(36);
    const part3 = parseInt(hash.substring(16, 24), 16).toString(36);
    const part4 = parseInt(hash.substring(24, 32), 16).toString(36);
    return part1 + part2 + part3 + part4;
  }
  throw new Error("Hash length is invalid");
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return getTMDBDetails(tmdbId, mediaType).then((mediaInfo) => {
    const query = mediaInfo.title.replace(/\s+/g, "-");
    const searchUrl = `${BASE_URL}/search/${encodeURIComponent(query)}/1/`;
    console.log("Searching Eporner URL:", searchUrl);
    return fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    }).then((res) => {
      if (!res.ok)
        throw new Error(`Eporner search HTTP ${res.status}`);
      return res.text();
    }).then((html) => {
      const $ = cheerio.load(html);
      const results = [];
      $("div.mb").each((i, el) => {
        const titleElement = $(el).find("div.mbunder p.mbtit a");
        const title = titleElement.text() || "No Title";
        const href = $(el).find("div.mbcontent a").attr("href");
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
      console.log(`[Eporner] Matched search result: ${matched.title} -> ${matched.url}`);
      return fetch(matched.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": BASE_URL
        }
      }).then((res) => {
        if (!res.ok)
          throw new Error(`Eporner page HTTP ${res.status}`);
        return res.text();
      }).then((pageHtml) => {
        const vidMatch = pageHtml.match(/EP\.video\.player\.vid\s*=\s*'([^']+)'/);
        const hashMatch = pageHtml.match(/EP\.video\.player\.hash\s*=\s*'([^']+)'/);
        if (!vidMatch || !hashMatch) {
          return [];
        }
        const vid = vidMatch[1];
        const hash = hashMatch[1];
        const apiUrl = `${BASE_URL}/xhr/video/${vid}?hash=${base36(hash)}`;
        return fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": matched.url,
            "X-Requested-With": "XMLHttpRequest"
          }
        }).then((res) => res.json()).then((json) => {
          const streams = [];
          if (json && json.sources && json.sources.mp4) {
            const mp4Sources = json.sources.mp4;
            for (const quality in mp4Sources) {
              const sourceObj = mp4Sources[quality];
              if (sourceObj && sourceObj.src) {
                streams.push({
                  name: `Eporner (${sourceObj.labelShort || quality})`,
                  title: matched.title,
                  url: sourceObj.src,
                  quality: sourceObj.labelShort || "Unknown",
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": matched.url
                  }
                });
              }
            }
          }
          return streams;
        });
      });
    });
  }).catch((err) => {
    console.error("[Eporner Scraper Error]", err.message);
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
