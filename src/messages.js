const MESSAGES = {
  en: {
    "dialog.chooseVideos": "Choose the videos",
    "dialog.chooseThumbnail": "Choose the thumbnail",
    "dialog.chooseIntro": "Choose the intro video",
    "dialog.exportThumbnail": "Export thumbnail",
    "notify.uploadComplete.title": "Upload complete",
    "notify.uploadComplete.body":
      "Click to open YouTube Studio and finish the video details.",
    "notify.uploadFailed.title": "Upload failed",
    "notify.renderComplete.title": "Render complete",
    "notify.renderComplete.body": "Click Upload to submit the video.",
    "tray.open": "Open OhMyChannel",
    "tray.uploading": "Uploading {count} video(s): {percent}%",
    "tray.noUpload": "No upload in progress",
    "tray.cancelAll": "Cancel all ({count})",
    "tray.quit": "Quit",
  },
  "pt-BR": {
    "dialog.chooseVideos": "Escolha os vídeos",
    "dialog.chooseThumbnail": "Escolha a thumbnail",
    "dialog.chooseIntro": "Escolha o vídeo de intro",
    "dialog.exportThumbnail": "Exportar thumbnail",
    "notify.uploadComplete.title": "Envio concluído",
    "notify.uploadComplete.body":
      "Clique para abrir o YouTube Studio e finalizar os detalhes do vídeo.",
    "notify.uploadFailed.title": "Falha no envio",
    "notify.renderComplete.title": "Render concluído",
    "notify.renderComplete.body": "Clique em Enviar para submeter o vídeo.",
    "tray.open": "Abrir OhMyChannel",
    "tray.uploading": "Enviando {count} vídeo(s): {percent}%",
    "tray.noUpload": "Nenhum envio em andamento",
    "tray.cancelAll": "Cancelar tudo ({count})",
    "tray.quit": "Sair",
  },
};

function translate(language, key, params) {
  const dict = MESSAGES[language] || MESSAGES.en;
  let value = dict[key] != null ? dict[key] : MESSAGES.en[key] != null ? MESSAGES.en[key] : key;
  if (params) {
    Object.keys(params).forEach((name) => {
      value = value.split("{" + name + "}").join(String(params[name]));
    });
  }
  return value;
}

module.exports = { translate, MESSAGES };
