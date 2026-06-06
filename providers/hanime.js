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

// src/providers/hanime.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
function getTMDBDetails(tmdbId, mediaType) {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
  return fetch(url).then((res) => {
    if (!res.ok)
      throw new Error(`TMDB HTTP ${res.status}`);
    return res.json();
  }).then((data) => {
    var _a;
    return {
      title: mediaType === "tv" ? data.name : data.title,
      originalTitle: mediaType === "tv" ? data.original_name : data.original_title,
      year: ((_a = mediaType === "tv" ? data.first_air_date : data.release_date) == null ? void 0 : _a.split("-")[0]) || null
    };
  });
}
function cleanTitle(t) {
  if (!t)
    return "";
  return t.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}
function searchHanime(query) {
  const searchUrl = "https://search.htv-services.com/";
  const payload = {
    "search_text": query,
    "tags": [],
    "tags_mode": "AND",
    "brands": [],
    "blacklist": [],
    "order_by": "created_at_unix",
    "ordering": "desc",
    "page": 0
  };
  return fetch(searchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    },
    body: JSON.stringify(payload)
  }).then((res) => {
    if (!res.ok)
      throw new Error(`Search HTTP ${res.status}`);
    return res.json();
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return getTMDBDetails(tmdbId, mediaType).then((mediaInfo) => {
    const query = mediaInfo.title;
    return searchHanime(query).then((results) => {
      if (!results || results.length === 0) {
        if (mediaInfo.originalTitle && mediaInfo.originalTitle !== mediaInfo.title) {
          return searchHanime(mediaInfo.originalTitle);
        }
      }
      return results;
    }).then((results) => {
      if (!results || results.length === 0)
        return [];
      const cleanedTarget = cleanTitle(mediaInfo.title);
      const cleanedOriginalTarget = cleanTitle(mediaInfo.originalTitle);
      let matched = results.find((r) => cleanTitle(r.name) === cleanedTarget) || results.find((r) => cleanTitle(r.name) === cleanedOriginalTarget) || results.find((r) => cleanTitle(r.name).includes(cleanedTarget)) || results[0];
      if (!matched)
        return [];
      const videoApiUrl = `https://hanime.tv/api/v8/video?id=${matched.id}`;
      return fetch(videoApiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
      }).then((res) => {
        if (!res.ok)
          throw new Error(`Video API HTTP ${res.status}`);
        return res.json();
      }).then((videoData) => {
        let targetVideoId = matched.id;
        if (mediaType === "tv" && episode !== null) {
          const franchiseVideos = videoData.hentai_franchise_hentai_videos;
          if (franchiseVideos && franchiseVideos.length > 0) {
            const sortedFranchise = [...franchiseVideos].sort((a, b) => a.released_at_unix - b.released_at_unix);
            const targetEpIndex = episode - 1;
            if (targetEpIndex >= 0 && targetEpIndex < sortedFranchise.length) {
              targetVideoId = sortedFranchise[targetEpIndex].id;
            }
          }
        }
        if (targetVideoId !== matched.id) {
          const epApiUrl = `https://hanime.tv/api/v8/video?id=${targetVideoId}`;
          return fetch(epApiUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          }).then((res) => res.json());
        }
        return videoData;
      }).then((finalVideoData) => {
        var _a;
        const streams = [];
        const servers = (_a = finalVideoData.videos_manifest) == null ? void 0 : _a.servers;
        if (!servers)
          return [];
        servers.forEach((server) => {
          if (server.streams) {
            server.streams.forEach((stream) => {
              var _a2;
              if (stream.url) {
                streams.push({
                  name: `Hanime ${server.name}`,
                  title: `${((_a2 = finalVideoData.hentai_video) == null ? void 0 : _a2.name) || mediaInfo.title} - ${stream.height}p`,
                  url: stream.url,
                  quality: `${stream.height}p`,
                  headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Referer": "https://hanime.tv/"
                  }
                });
              }
            });
          }
        });
        return streams;
      });
    });
  }).catch((err) => {
    console.error("[Hanime Scraper Error]", err.message);
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
