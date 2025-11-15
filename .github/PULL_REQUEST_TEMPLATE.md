## Description

<!-- Provide a brief description of your changes -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] API change (adds, modifies, or removes API endpoints)
- [ ] Database change (schema or migration changes)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Dependency update

## Related Issue

<!-- Link to the issue this PR addresses -->
Closes #(issue number)

## Changes Made

<!-- List the specific changes you made -->

- Change 1
- Change 2
- Change 3

## API Changes (if applicable)

### New Endpoints
```
POST /api/v1/example - Description
```

### Modified Endpoints
```
GET /api/v1/example - What changed
```

## Database Changes (if applicable)

- [ ] New entity added
- [ ] Schema modified
- [ ] Migration included
- [ ] Seed data updated

## Testing

<!-- Describe the tests you ran to verify your changes -->

- [ ] I have tested this locally
- [ ] I have added/updated unit tests
- [ ] I have added/updated E2E tests
- [ ] All tests pass

### Manual Test Steps

1. Step 1
2. Step 2
3. Step 3

### Test Coverage

```bash
pnpm test:cov
```

## Checklist

<!-- Mark completed items with an 'x' -->

- [ ] My code follows the NestJS style guide
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] I have updated the API documentation (Swagger decorators)
- [ ] My changes generate no new warnings or errors
- [ ] I have updated the CHANGELOG.md file
- [ ] I have checked for and resolved any merge conflicts
- [ ] I have run `pnpm lint` and fixed all issues
- [ ] I have run `pnpm format` to format the code

## Environment Tested

- [ ] Local development
- [ ] Docker
- [ ] Staging/Production-like environment

## Additional Notes

<!-- Add any additional notes for reviewers -->
