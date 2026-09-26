# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is a monorepo managed using [Yarn workspaces](https://yarnpkg.com/features/workspaces). It contains the following packages:

- The library package in the root directory.
- An example app in the `example/` directory.

### Project layout

- `src/` — the JavaScript API: codegen specs (`NativeFoldKit.ts`, `FoldAwareViewNativeComponent.ts`), normalization of native payloads, hooks, `splitByFolds` and the Jest mock (`mock.tsx`, published as `react-native-fold-kit/jest`).
- `ios/Core/` — the iOS implementation in Swift, independent of React Native. All iOS 27.1 fold APIs are used only in `PlatformFoldAPI.swift`.
- `ios/*.mm` — thin Objective-C++ entry points required by codegen; they only forward to the Swift core.
- `android/src/main/java/com/foldkit/core/` — pure Kotlin mapping (no `android.*` imports), unit-tested on the JVM.
- `android/src/main/java/com/foldkit/` — the Android module, view and the shared `WindowFoldSource` (Jetpack WindowManager, cutouts, hinge sensor).
- `ios-tests/` and `Package.swift` — a Swift package used only to run the Swift core tests.
- `example/` — the example app.

Native payloads are plain dictionaries/maps whose keys are a contract with `src/NativeFoldKit.ts` and `src/FoldAwareViewNativeComponent.ts`. Both native test suites check these keys; update them together.

### Requirements for native work

- **iOS:** Xcode with the **iOS 27.1 SDK** and the **iPhone Duo** simulator (iOS 27.1 runtime). With an older SDK the project still builds, but all fold APIs are compiled out. If the 27.1 Xcode is not your default one, point the tools at it per command instead of switching globally:

  ```sh
  export DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer
  ```

- **Android:** an emulator with a foldable device profile, e.g. *Pixel 9 Pro Fold* or *Pixel Fold* created in Android Studio's Device Manager.

To get started with the project, make sure you have the correct version of [Node.js](https://nodejs.org/) installed. See the [`.nvmrc`](./.nvmrc) file for the version used in this project.

Run `yarn` in the root directory to install the required dependencies for each package:

```sh
yarn
```

> Since the project relies on Yarn workspaces, you cannot use [`npm`](https://github.com/npm/cli) for development without manually migrating.

The [example app](/example/) demonstrates usage of the library. You need to run it to test any changes you make.

It is configured to use the local version of the library, so any changes you make to the library's source code will be reflected in the example app. Changes to the library's JavaScript code will be reflected in the example app without a rebuild, but native code changes will require a rebuild of the example app.

If you want to use Android Studio or Xcode to edit the native code, you can open the `example/android` or `example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `example/ios/FoldKitExample.xcworkspace` in Xcode and find the source files at `Pods > Development Pods > FoldKit`.

To edit the Java or Kotlin files, open `example/android` in Android studio and find the source files at `react-native-fold-kit` under `Android`.

You can use various commands from the root directory to work with the project.

To start the packager:

```sh
yarn example start
```

To run the example app on Android:

```sh
yarn example android
```

To run the example app on iOS:

```sh
yarn example ios
```

On iOS, choose the iPhone Duo simulator (`yarn example ios --simulator "iPhone Duo"`). The hinge can only be moved from the Simulator app's menu; there is no `simctl` command for it.

#### Driving a foldable Android emulator from the command line

The emulator's posture and hinge angle can be scripted, which is handy for checking changes without touching the UI:

```sh
adb shell cmd device_state state 2           # 0 CLOSED, 1 HALF_OPENED, 2 OPENED
adb emu sensor set hinge-angle0 90           # hinge angle in degrees
adb shell dumpsys SurfaceFlinger --display-id  # list displays (inner and outer)
adb exec-out screencap -d <display-id> -p > screen.png
```

Set the state and the hinge angle together (e.g. `HALF_OPENED` with 90°), otherwise the posture derived from the angle and the one from `FoldingFeature` disagree.

To confirm that the app is running with the new architecture, you can check the Metro logs for a message like this:

```sh
Running "FoldKitExample" with {"fabric":true,"initialProps":{"concurrentRoot":true},"rootTag":1}
```

Note the `"fabric":true` and `"concurrentRoot":true` properties.

Make sure your code passes TypeScript:

```sh
yarn typecheck
```

To check for linting errors, run the following:

```sh
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. Run the unit tests by:

```sh
yarn test
```

Swift core tests (Swift Testing, see `scripts/test-ios.sh`). They run on `$IOS_TEST_DEVICE` (a simulator name or UDID) if set, otherwise on the iPhone Duo simulator, otherwise on any available iPhone — the newest iOS runtime first. Set `DEVELOPER_DIR` to use a non-default Xcode. The test that checks our hinge status values against `UIHinge.Status` is only compiled with the iOS 27.1 SDK:

```sh
yarn test:ios
IOS_TEST_DEVICE="iPhone 17 Pro" yarn test:ios
```

Kotlin core tests (JUnit):

```sh
yarn test:android
```

CI runs both, plus the JavaScript tests, on every pull request.

Changes to fold handling should also be checked on the iPhone Duo simulator and a foldable Android emulator using the example app: its State, Scroll and Panes tabs cover window-level state, `FoldAwareView` in scroll views and `splitByFolds`.


### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module.
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.


### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
yarn release
```


### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn`: setup project by installing dependencies.
- `yarn typecheck`: type-check files with TypeScript.
- `yarn lint`: lint files with [ESLint](https://eslint.org/).
- `yarn test`: run unit tests with [Jest](https://jestjs.io/).
- `yarn test:ios`: run the Swift core tests on an iOS simulator.
- `yarn test:android`: run the Kotlin core tests on the JVM.
- `yarn prepare`: build the package with [react-native-builder-bob](https://github.com/callstack/react-native-builder-bob).
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.
