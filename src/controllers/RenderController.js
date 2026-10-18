class RenderController {
  constructor({ renderVideoUseCase }) {
    this.renderVideoUseCase = renderVideoUseCase;
  }

  start(payload, onProgress) {
    return this.renderVideoUseCase.execute({ ...payload, onProgress });
  }

  cancel(id) {
    this.renderVideoUseCase.cancel(id);
  }

  cancelAll() {
    this.renderVideoUseCase.cancelAll();
  }
}

module.exports = { RenderController };
