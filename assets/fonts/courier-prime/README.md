# Courier Prime

Unmodified regular, bold, italic and bold italic TTFs of Courier Prime by
Quote-Unquote Apps (regular version 1.203, the others 1.202), the typeface
made for screenplays. Project page: https://quoteunquoteapps.com/courierprime/

SHA-256:

- `CourierPrime-Regular.ttf`:
  `6cc9525b1334047445cba53f323e810331acfdf59f18f4008397d13137737b91`
- `CourierPrime-Bold.ttf`:
  `aa5a0a31d25dac006fe2d71fc6ff0feff250bc6de3b3c81b7e9d3a58e1329b52`
- `CourierPrime-Italic.ttf`:
  `e1c9bde2ef55f90a5619cff5dac0d5674700045d666a7d2cddee1879bb83d552`
- `CourierPrime-BoldItalic.ttf`:
  `cfc77df22c0516962b6ba841e63c59ad8c2f95aff4d7a44f6328eeaaeff7e7d8`

The copyright and SIL Open Font License 1.1 (with Reserved Font Name
"Courier Prime"), taken from the fonts' own license records, are in `LICENSE`.
The plugin build embeds the font bytes and the full license in `main.js`;
PDF exports subset the glyphs used. No font download happens at runtime.

The font covers Latin-alphabet languages, not Chinese, Japanese, Korean or
emoji. PDF export checks each character against the font and stops, with a
message, on any it can't draw.
