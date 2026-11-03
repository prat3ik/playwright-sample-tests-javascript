# E2E sandbox playground

Scratch pull request for trying the `/e2e` comment workflow. Comment on the PR:

```
/e2e
/e2e --grep "Sign Up"
/e2e tests/login.spec.js
/e2e tests/cart_checkout.spec.js --grep "Order"
/e2e --project chromium
```

Push any test change to this branch, then comment again to run it in the E2B sandbox.
