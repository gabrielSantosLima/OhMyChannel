(function () {
  const VARIABLES = [
    { name: "title", labelKey: "variables.title", descriptionKey: "variables.titleDesc" },
    { name: "file_name", labelKey: "variables.fileName", descriptionKey: "variables.fileNameDesc" },
    { name: "playlist_name", labelKey: "variables.playlistName", descriptionKey: "variables.playlistNameDesc" },
    { name: "playlist_link", labelKey: "variables.playlistLink", descriptionKey: "variables.playlistLinkDesc" },
    { name: "publish_date", labelKey: "variables.publishDate", descriptionKey: "variables.publishDateDesc" },
    { name: "intro_name", labelKey: "variables.introName", descriptionKey: "variables.introNameDesc" },
    { name: "thumbnail_name", labelKey: "variables.thumbnailName", descriptionKey: "variables.thumbnailNameDesc" },
    { name: "channel_name", labelKey: "variables.channelName", descriptionKey: "variables.channelNameDesc" },
    { name: "channel_link", labelKey: "variables.channelLink", descriptionKey: "variables.channelLinkDesc" },
  ];

  const AI_VARIABLES = [
    { name: "description", labelKey: "variables.description", descriptionKey: "variables.descriptionDesc" },
    { name: "hashtags", labelKey: "variables.hashtags", descriptionKey: "variables.hashtagsDesc" },
  ];

  const ALL = [...VARIABLES, ...AI_VARIABLES];
  const BY_NAME = new Map(ALL.map((item) => [item.name, item]));

  function text(value) {
    return value === undefined || value === null ? "" : String(value);
  }

  function list(role) {
    return role === "template" ? [...AI_VARIABLES, ...VARIABLES] : [...VARIABLES];
  }

  function isKnown(name) {
    return BY_NAME.has(name);
  }

  function resolve(name, context) {
    const ctx = context || {};
    const call = (fn) => (typeof ctx[fn] === "function" ? ctx[fn]() : null);

    switch (name) {
      case "title":
        return text(call("getTitle"));
      case "file_name":
        return text(call("getFileName"));
      case "playlist_name": {
        const playlist = call("getPlaylist");
        return playlist ? text(playlist.title) : "";
      }
      case "playlist_link": {
        const playlist = call("getPlaylist");
        return playlist ? text(playlist.url || (playlist.id ? `https://www.youtube.com/playlist?list=${playlist.id}` : "")) : "";
      }
      case "publish_date":
        return text(call("getPublishDate"));
      case "intro_name": {
        const intro = call("getIntro");
        return intro ? text(intro.name) : "";
      }
      case "thumbnail_name": {
        const thumbnail = call("getThumbnail");
        return thumbnail ? text(thumbnail.name) : "";
      }
      case "channel_name": {
        const channel = call("getChannel");
        return channel ? text(channel.name) : "";
      }
      case "channel_link": {
        const channel = call("getChannel");
        return channel ? text(channel.url) : "";
      }
      default:
        return "";
    }
  }

  window.AppVariables = {
    list,
    isKnown,
    resolve,
  };
})();
