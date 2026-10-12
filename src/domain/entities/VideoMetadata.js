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
  }) {
    this.title = title;
    this.description = description;
    this.categoryId = categoryId;
    this.privacyStatus = privacyStatus;
    this.selfDeclaredMadeForKids = selfDeclaredMadeForKids;
  }

  static fromInput({ title, description }) {
    return new VideoMetadata({
      title: String(title || "").slice(0, MAX_TITLE_LENGTH),
      description: String(description || "").slice(0, MAX_DESCRIPTION_LENGTH),
    });
  }

  toSnippet() {
    return {
      title: this.title,
      description: this.description,
      categoryId: this.categoryId,
    };
  }

  toStatus() {
    return {
      privacyStatus: this.privacyStatus,
      selfDeclaredMadeForKids: this.selfDeclaredMadeForKids,
    };
  }
}

VideoMetadata.MAX_TITLE_LENGTH = MAX_TITLE_LENGTH;
VideoMetadata.MAX_DESCRIPTION_LENGTH = MAX_DESCRIPTION_LENGTH;

module.exports = { VideoMetadata };
