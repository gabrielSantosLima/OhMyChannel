class IntroController {
  constructor({ listIntrosUseCase, saveIntrosUseCase }) {
    this.listIntrosUseCase = listIntrosUseCase;
    this.saveIntrosUseCase = saveIntrosUseCase;
  }

  list() {
    return this.listIntrosUseCase.execute();
  }

  save(intros) {
    return this.saveIntrosUseCase.execute(intros);
  }
}

module.exports = { IntroController };
