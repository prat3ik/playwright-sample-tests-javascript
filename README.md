# Ecommerce-demo-test-playwright

Automated end-to-end tests for Ecommerce Demo store using [Playwright](https://playwright.dev/).

---

## Project Structure

- `pages/` — Page Object Models
- `tests/` — Test specifications
- `playwright.config.js` — Playwright configuration
- `playwright-report/` — HTML test reports
- `.github/workflows/test.yml` — CI/CD pipeline

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [npm](https://www.npmjs.com/)

---

## Installation

```sh
npm install
```

---

## Local Test Execution

Run all tests:
```sh
npx playwright test
```

View the HTML report:
```sh
npx playwright show-report
```

---

## Testdino Integration

[Testdino](https://testdino.com/) enables cloud-based Playwright reporting.

### Local Execution

After your tests complete and the report is generated in `playwright-report`, upload it to Testdino:



Replace the token above with your own Testdino API key.

See all available commands:
```sh
npx tdpw --help
```

---

## CI/CD Pipeline Integration

### GitHub Actions

Add the following step to your workflow after tests and report generation:



Ensure your API key is correctly placed in the command.

---

## Continuous Integration

Automated test runs and report merging are configured in `.github/workflows/test.yml`.

---

## Contributing

Pull requests and issues are welcome!

---

## License


## Run tests for a pull request in an E2B sandbox

Comment on any pull request and the requested tests run for the PR head in an [E2B](https://e2b.dev) sandbox. The results are posted back on the PR.

```
/e2e                          # run everything
/e2e --grep "Sign Up"         # tests matching a title
/e2e tests/login.spec.js      # one file
/e2e --project chromium --grep @smoke
```

Everything after `/e2e` is passed to `npx playwright test`. See `.github/workflows/e2e-sandbox.yml`.
