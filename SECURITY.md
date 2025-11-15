# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of AERAS Backend seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- Open a public GitHub issue
- Discuss the vulnerability in public forums or social media
- Exploit the vulnerability beyond verification

### Please DO:

1. **Email us directly** at security@aeras.example.com (or create a private security advisory on GitHub)
2. **Provide detailed information** including:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Affected versions
   - Suggested fix (if any)
3. **Allow time for us to respond** - We aim to respond within 48 hours

### What to Expect:

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide an estimated timeline for a fix
- We will keep you informed of the progress
- We will notify you when the vulnerability is fixed
- We will publicly acknowledge your responsible disclosure (unless you prefer to remain anonymous)

## Security Best Practices

When deploying this application:

### Environment Variables
- Never commit `.env` files to version control
- Use strong, unique values for `JWT_SECRET`
- Rotate secrets regularly
- Use different credentials for each environment

### Database Security
- Use strong database passwords
- Limit database user permissions
- Enable SSL/TLS for database connections in production
- Regular backup your database
- Keep PostgreSQL updated

### API Security
- Always use HTTPS in production
- Implement rate limiting
- Configure CORS properly for your domains
- Validate all user inputs
- Use helmet middleware for security headers
- Keep dependencies updated

### Authentication
- Use strong JWT secrets (minimum 256 bits)
- Set appropriate token expiration times
- Implement refresh token rotation
- Use bcrypt with appropriate cost factor (10-12)

### MQTT Security
- Use authentication for MQTT broker
- Enable TLS for MQTT connections
- Restrict topic access by client
- Validate all MQTT messages

### Docker & Deployment
- Don't run containers as root
- Use official base images
- Scan images for vulnerabilities
- Keep Docker updated
- Use secrets management (Docker secrets, Kubernetes secrets, etc.)

## Known Security Considerations

### Database
- TypeORM's `synchronize` option should be `false` in production
- Use migrations for schema changes
- Implement proper input sanitization to prevent SQL injection

### WebSocket
- Implement proper authentication for WebSocket connections
- Validate all incoming messages
- Rate limit WebSocket connections

### File Uploads
- Validate file types and sizes
- Scan uploaded files for malware
- Store files outside the web root

## Security Updates

Security updates will be released as patch versions (e.g., 1.0.1, 1.0.2) and documented in the [CHANGELOG](CHANGELOG.md).

## Vulnerability Disclosure Process

1. **Report received** - We acknowledge your report
2. **Investigation** - We investigate and validate the issue
3. **Fix development** - We develop and test a fix
4. **Security advisory** - We create a security advisory (if applicable)
5. **Release** - We release a patch version
6. **Public disclosure** - We publish details after users have had time to update

## Security Checklist for Deployment

- [ ] Environment variables properly configured
- [ ] JWT_SECRET is strong and unique
- [ ] Database uses SSL/TLS connection
- [ ] CORS configured for specific domains
- [ ] Rate limiting enabled
- [ ] Helmet middleware configured
- [ ] TypeORM synchronize is false
- [ ] MQTT broker uses authentication
- [ ] HTTPS enabled with valid certificates
- [ ] Error messages don't leak sensitive information
- [ ] Logging configured (without sensitive data)
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured

## Compliance

This application should be deployed in compliance with:
- GDPR (if handling EU user data)
- Local data protection regulations
- Industry-specific security standards

## Security Tools

Recommended tools for security testing:
- **npm audit** - Check for known vulnerabilities in dependencies
- **Snyk** - Continuous security monitoring
- **OWASP ZAP** - Web application security scanner
- **SonarQube** - Code quality and security analysis

## Contact

For security-related questions or concerns:
- Email: security@aeras.example.com
- Security Advisory: [GitHub Security Advisories](https://github.com/u2204125/iotrix/security/advisories)

Thank you for helping keep AERAS Backend and its users safe!
