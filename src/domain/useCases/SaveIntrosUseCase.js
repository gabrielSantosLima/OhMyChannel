const { IntroVideo } = require("../entities/IntroVideo");

class SaveIntrosUseCase {
  constructor({ introStore }) {
    this.introStore = introStore;
  }

  async execute(intros) {
    const validated = (intros || []).map((intro) => IntroVideo.create(intro));
    this.introStore.save(validated);
    return validated;
  }
}

module.exports = { SaveIntrosUseCase };
