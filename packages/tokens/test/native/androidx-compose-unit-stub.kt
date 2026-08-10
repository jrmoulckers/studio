// Minimal stand-in for the `androidx.compose.ui.unit` API surface consumed by the
// generated Kotlin token source (`packages/tokens/dist/native/compose/JrmTokens.kt`).
//
// The generated source uses `Dp`, `TextUnit`, and the `dp`/`sp` extension properties.
// Receivers are declared for `Int`, `Double`, and `Float` because the emitter writes
// whole-number steps (`4.dp`) and fractional type-scale values (`12.8.sp`) side by side.
package androidx.compose.ui.unit

class Dp(val value: Float)

class TextUnit(val value: Float)

val Int.dp: Dp
    get() = Dp(this.toFloat())

val Double.dp: Dp
    get() = Dp(this.toFloat())

val Float.dp: Dp
    get() = Dp(this)

val Int.sp: TextUnit
    get() = TextUnit(this.toFloat())

val Double.sp: TextUnit
    get() = TextUnit(this.toFloat())

val Float.sp: TextUnit
    get() = TextUnit(this)
