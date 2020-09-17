# Checkout File Action

This action checks out individual files from a repo.

## Inputs

### `file-path`

**Required** The file(s) to checkout.

### `github-token`

The GitHub token to use. Only necessary if retrieving files from a different private repository.

### `repo`

The GitHub repository to retrieve the file from. Defaults to the current repository.

### `branch`

The branch to pull the file from. Defaults to the current branch if checking out a file from the current repository, otherwise defaults to the main branch of the repository being checked out.

## Example usage

```yaml
uses: justAnotherDev/checkout-file-action@v3
with:
  file-path: |
    action.yml
    tests/hello-world.txt
```

More examples [here](https://github.com/justAnotherDev/checkout-file-action/blob/master/.github/workflows/test.yml).