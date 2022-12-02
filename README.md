# GitHub Action: Run Clippy with reviewdog

This action runs [Clippy](https://github.com/rust-lang/rust-clippy) with
[reviewdog](https://github.com/reviewdog/reviewdog) on pull requests to improve code review experience.

<img width="943" alt="スクリーンショット 2022-11-08 8 57 47" src="https://user-images.githubusercontent.com/17407489/200965354-b79c2b86-958f-42ca-bdf1-46bf5511aa5e.png">

## Example usage

```yml
name: clippy-action
on: [pull_request]
jobs:
  clippy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: clippy
    - uses: giraffate/clippy-action@v1
      with:
        reporter: 'github-pr-review'
        github_token: ${{ secrets.GITHUB_TOKEN }}
```


## Inputs

### `github_token`

**Required**. Default is `${{ github.token }}`.

### `clippy_flags`

Optional. clippy flags. (cargo clippy --color never -q --message-format json `<clippy_flags>`)
For example, `clippy_flags: -- -Dwarnings`.

### `tool_name`

Optional. Tool name to use for reviewdog reporter. Useful when running multiple actions with different config.

### `level`

Optional. Report level for reviewdog [info,warning,error].
It's same as `-level` flag of reviewdog.

### `workdir`

Optional. Working directory relative to the root directory.

### `reporter`

Optional. Reporter of reviewdog command [github-pr-check,github-pr-review].
It's same as `-reporter` flag of reviewdog.

#### github-pr-review
|`cargo clippy`|`cargo clippy -- -Dwarnings`|
|---|---|
|<img width="913" alt="github-pr-review_warning" src="https://user-images.githubusercontent.com/17407489/205067105-4511a31e-9e95-407c-ae44-c8699e46d780.png">|<img width="911" alt="github-pr-review_error" src="https://user-images.githubusercontent.com/17407489/205067361-f22254a8-7211-457e-82a1-006a4cfc3c22.png">|

#### github-pr-check
|`cargo clippy`|`cargo clippy -- -Dwarnings`|
|---|---|
|<img width="855" alt="github-pr-check_warning" src="https://user-images.githubusercontent.com/17407489/205067697-029aceba-a143-4183-85de-a4ff22c2ed27.png">|<img width="867" alt="github-pr-check_error" src="https://user-images.githubusercontent.com/17407489/205067734-fc7decb6-21df-49b0-9cd6-83bc40cd26ec.png">|


### `filter_mode`

Optional. Filtering mode for the reviewdog command [added,diff_context,file,nofilter].
Default is added.

### `fail_on_error`

Optional. Exit code for reviewdog when errors are found [`true`, `false`]
Default is `false`.

### `reviewdog_flags`

Optional. Additional reviewdog flags

### `reviewdog_version`

Optional. Install a specific version of reviewdog.
By default, the latest version of reviewdog is installed.
