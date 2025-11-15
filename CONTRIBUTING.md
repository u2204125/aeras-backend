# Contributing to AERAS Backend

Thank you for your interest in contributing to the AERAS Backend! We welcome contributions from the community.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Guidelines](#coding-guidelines)
- [API Development](#api-development)
- [Database Changes](#database-changes)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/iotrix.git`
3. Add upstream remote: `git remote add upstream https://github.com/ORIGINAL_OWNER/iotrix.git`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

1. Install dependencies:
   ```bash
   cd backend
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your local database and MQTT broker credentials

3. Set up PostgreSQL database:
   ```bash
   # Create database
   createdb iotrix_db
   ```

4. Run database migrations/seed:
   ```bash
   pnpm run seed
   ```

5. Start the development server:
   ```bash
   pnpm run start:dev
   ```

## How to Contribute

### Types of Contributions

- **Bug fixes**: Fix issues and improve stability
- **New features**: Add new API endpoints or functionality
- **Documentation**: Improve or add documentation
- **Performance**: Optimize queries and improve performance
- **Security**: Enhance security measures
- **Tests**: Add or improve test coverage

### Contribution Workflow

1. **Find or create an issue**: Before starting work, check if an issue exists or create one
2. **Assign yourself**: Comment on the issue to let others know you're working on it
3. **Create a branch**: Use descriptive branch names (e.g., `fix/auth-bug`, `feature/analytics-api`)
4. **Make changes**: Follow coding guidelines and keep commits atomic
5. **Test thoroughly**: Ensure all tests pass and add new tests for new features
6. **Submit a PR**: Create a pull request with a clear description

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper DTOs and entities
- Use decorators for validation
- Avoid using `any` type
- Use meaningful variable and function names

### NestJS Best Practices

- Use dependency injection
- Follow module-based architecture
- Use guards for authentication/authorization
- Implement proper exception handling
- Use pipes for validation and transformation

### Code Style

- Follow the existing code style
- Use ESLint and fix all linting errors: `pnpm run lint`
- Format code before committing: `pnpm run format`
- Use meaningful commit messages

### Commit Messages

Follow the conventional commits specification:

```
feat: add analytics endpoints
fix: resolve JWT token expiration issue
docs: update API documentation
refactor: simplify ride service logic
test: add tests for puller endpoints
chore: update dependencies
```

### File Organization

- Controllers in `src/[module]/[module].controller.ts`
- Services in `src/[module]/[module].service.ts`
- DTOs in `src/[module]/dto/`
- Entities in `src/entities/`
- Guards in `src/auth/`

## API Development

### Adding New Endpoints

1. Create or update the module
2. Define DTOs with validation decorators
3. Implement service logic
4. Add controller methods with Swagger decorators
5. Update API documentation
6. Add tests

### Example:

```typescript
@ApiTags('example')
@Controller('api/v1/example')
export class ExampleController {
  @Get()
  @ApiOperation({ summary: 'Get all examples' })
  @ApiResponse({ status: 200, description: 'Success' })
  async findAll(): Promise<Example[]> {
    return this.exampleService.findAll();
  }
}
```

## Database Changes

### Adding Entities

1. Create entity in `src/entities/`
2. Add entity to module imports
3. Update seed data if needed
4. Document the schema changes

### Migrations

- Test migrations thoroughly
- Provide rollback strategy
- Document breaking changes

## Pull Request Process

1. **Update documentation**: If you've added features, update the README and API docs
2. **Test your changes**: Ensure everything works correctly
3. **Update the changelog**: Add your changes to CHANGELOG.md
4. **Create the PR**: 
   - Use a clear, descriptive title
   - Reference related issues
   - Describe what changed and why
   - Add examples of API usage if applicable

5. **Code review**: 
   - Address review comments promptly
   - Keep discussions constructive
   - Make requested changes

6. **Merge**: Once approved, a maintainer will merge your PR

## Testing

### Running Tests

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

### Writing Tests

- Write unit tests for services
- Write E2E tests for controllers
- Mock external dependencies
- Aim for >80% code coverage

## Documentation

- Update API_REFERENCE.md for new endpoints
- Update WEBSOCKET_REFERENCE.md for WebSocket events
- Update MQTT_REFERENCE.md for MQTT topics
- Add JSDoc comments to complex functions

## Security

- Never commit sensitive data
- Use environment variables for secrets
- Validate all user inputs
- Use prepared statements for queries
- Follow OWASP best practices

## Questions?

If you have questions:

- Check the [README](README.md) and documentation
- Search existing issues
- Create a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to AERAS Backend! 🚀
