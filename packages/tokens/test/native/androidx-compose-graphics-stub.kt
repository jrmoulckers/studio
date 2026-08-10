// Minimal stand-in for the `androidx.compose.ui.graphics` API surface consumed by the
// generated Kotlin token source (`packages/tokens/dist/native/compose/JrmTokens.kt`).
//
// Compiling the generated file against these stubs type-checks it without pulling the
// Android SDK or the Compose artifacts into CI. See ../../README or issue #58 for what
// this does and does not prove.
//
// The generated source uses exactly one member of this package: `Color(<hex literal>)`.
// Literals with a `0xFF` alpha prefix exceed `Int.MAX_VALUE` and are typed `Long` by
// Kotlin; literals with a low alpha byte stay `Int`. Both are accepted so a future
// translucent token does not fail here for the wrong reason.
package androidx.compose.ui.graphics

class Color(val value: Long) {
    constructor(value: Int) : this(value.toLong())
}
