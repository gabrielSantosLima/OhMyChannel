class TemplateController {
  constructor({ listTemplatesUseCase, saveTemplatesUseCase }) {
    this.listTemplatesUseCase = listTemplatesUseCase;
    this.saveTemplatesUseCase = saveTemplatesUseCase;
  }

  list() {
    return this.listTemplatesUseCase.execute();
  }

  save(templates) {
    return this.saveTemplatesUseCase.execute(templates);
  }
}

module.exports = { TemplateController };
