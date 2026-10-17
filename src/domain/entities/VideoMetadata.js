const CATEGORY_ID = "20";
const PRIVACY_STATUS = "private";
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 5000;

class VideoMetadata {
  constructor({
    title,
    description = "",
    categoryId = CATEGORY_ID,
    privacyStatus = PRIVACY_STATUS,
    selfDeclaredMadeForKids = false,
    publishAt = null,
  }) {
    this.title = title;
    this.description = description;
    this.categoryId = categoryId;
    this.privacyStatus = privacyStatus;
    this.selfDeclaredMadeForKids = selfDeclaredMadeForKids;
    this.publishAt = publishAt;
  }

  static fromInput({ title, description, publishAt }) {
    return new VideoMetadata({
      title: String(title || "").slice(0, MAX_TITLE_LENGTH),
      description: String(description || "").slice(0, MAX_DESCRIPTION_LENGTH),
      publishAt: VideoMetadata.normalizePublishAt(publishAt),
    });
  }

  static normalizePublishAt(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid publish date.");
    }
    if (date.getTime() <= Date.now()) {
      throw new Error("Publish date must be in the future.");
    }
    return date.toISOString();
  }

  toSnippet() {
    return {
      title: this.title,
      description: this.description,
      categoryId: this.categoryId,
    };
  }

  toStatus() {
    const status = {
      privacyStatus: this.publishAt ? PRIVACY_STATUS : this.privacyStatus,
      selfDeclaredMadeForKids: this.selfDeclaredMadeForKids,
    };
    if (this.publishAt) status.publishAt = this.publishAt;
    return status;
  }
}

VideoMetadata.MAX_TITLE_LENGTH = MAX_TITLE_LENGTH;
VideoMetadata.MAX_DESCRIPTION_LENGTH = MAX_DESCRIPTION_LENGTH;

module.exports = { VideoMetadata };
