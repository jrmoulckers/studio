# Native compile stubs

These Kotlin sources exist only so CI can hand the generated native token output to a real
compiler. They are not shipped, not synced, and not part of the `@jrm/tokens`
distribution — `packages/tokens/dist/` is the distribution; this directory is test scaffolding.

## Why

`packages/tokens/dist/native/` contains generated Kotlin and Swift. Before issue #58,
every gate over those files was a string or structural assertion — no compiler had ever
read them. The concrete failure that motivated this: the backbone sync engine prefixed
every vendored `.kt`/`.swift` with an HTML comment provenance header, producing files that
do not compile, while reporting them healthy. Studio owns codegen correctness; the
backbone owns transport and explicitly is not a safety net for our output.

## What the two CI jobs do

| Job             | Runner          | Approach                                                                         |
| --------------- | --------------- | -------------------------------------------------------------------------------- |
| `native-kotlin` | `ubuntu-latest` | Pinned `kotlinc` compiles `JrmTokens.kt` **against the stubs in this directory** |
| `native-swift`  | `macos-latest`  | `swiftc -typecheck` on `JRMTokens.swift` against **real SwiftUI**                |

The asymmetry is deliberate. `swiftc` and the SDK ship on the macOS runner, so the Swift
job gets a genuine type-check for free. Compose has no equivalent — a real check would
mean the Android SDK and a Gradle build, which is a large, slow, network-heavy dependency
for a file whose entire API surface is four types.

## What the Kotlin stubs prove, and what they do not

**They prove** the generated file is valid Kotlin: it parses, every identifier is legal
(no digit-led names, no reserved words), every one of the ~145 `Color(...)` literals is a
well-typed argument, all five color schemes satisfy the `JrmColorScheme` contract, every
`object` member type-checks, and no foreign syntax (such as an injected HTML comment) has
been introduced anywhere in the file.

**They do not prove** the file works against real Jetpack Compose. If upstream changes
`Color`'s signature or removes an extension property, these stubs will keep passing. That
risk is accepted: the consumed surface is four types that have been stable for years, and
the failure mode this job exists to catch is malformed emission, not upstream API drift.

Keep the stubs minimal. If the emitter starts using a new Compose API, add the narrowest
declaration that makes it compile — a stub that grows toward a reimplementation of Compose
stops being a check and becomes a second thing to maintain.
