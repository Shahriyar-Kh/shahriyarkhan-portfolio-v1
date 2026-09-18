# Security Policy

## Reporting a vulnerability

Please do not open a public issue for a suspected security vulnerability or exposed credential.

Report security concerns privately to the repository owner through the contact information on the public portfolio:

- https://shahriyarkhan.com

Include the affected area, reproduction steps, and potential impact. Avoid including real credentials, access tokens, personal data, or production secrets in screenshots or examples.

## Credential handling

- Runtime secrets belong in deployment environment variables.
- Real `.env` files must not be committed.
- Example configuration files must contain placeholders only.
- Credentials that were ever committed should be treated as compromised and rotated.
- Public documentation must not contain passwords, API secrets, private keys, OAuth client secrets, or database credentials.

## Supported code

Security fixes are applied to the current default branch and active production code paths. Historical snapshots may not receive security updates.
