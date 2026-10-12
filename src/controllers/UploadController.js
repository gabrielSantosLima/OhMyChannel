class UploadController {
  constructor({ uploadVideoUseCase }) {
    this.uploadVideoUseCase = uploadVideoUseCase;
  }

  start(payload, onProgress) {
    return this.uploadVideoUseCase.execute({ ...payload, onProgress });
  }

  cancel() {
    this.uploadVideoUseCase.cancel();
  }
}

module.exports = { UploadController };
