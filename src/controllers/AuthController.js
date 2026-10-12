class AuthController {
  constructor({ checkAuthStatusUseCase, authenticateUseCase, logoutUseCase }) {
    this.checkAuthStatusUseCase = checkAuthStatusUseCase;
    this.authenticateUseCase = authenticateUseCase;
    this.logoutUseCase = logoutUseCase;
  }

  status() {
    return this.checkAuthStatusUseCase.execute();
  }

  login() {
    return this.authenticateUseCase.execute();
  }

  logout() {
    return this.logoutUseCase.execute();
  }
}

module.exports = { AuthController };
