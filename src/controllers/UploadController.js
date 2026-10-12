class UploadController {
  constructor({ uploadVideoUseCase }) {
    this.uploadVideoUseCase = uploadVideoUseCase;
  }

  start(payload, onProgress) {
    return this.uploadVideoUseCase.execute({ ...payload, onProgress });
  }

  cancel(id) {
    this.uploadVideoUseCase.cancel(id);
  }

  cancelAll() {
    this.uploadVideoUseCase.cancelAll();
  }
}

module.exports = { UploadController };
