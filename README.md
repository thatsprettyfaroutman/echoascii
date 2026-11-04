![echoascii, spinning through fonts and landing on a flowing rainbow](docs/recordings/title.gif)

Turn any text into big ASCII art banners in your terminal, with 330+ bundled FIGlet fonts 😱

![echoascii --type --gradient cyan,magenta 'hello there'](docs/recordings/type.gif)

![echoascii --clock --center --font 'ANSI Shadow' --gradient cyan,magenta](docs/recordings/clock.gif)

![echoascii --countdown 5 --border --gradient yellow,red "Time's up!"](docs/recordings/countdown.gif)

## Try it

```
$ npx echoascii hello

 __              ___    ___
/\ \            /\_ \  /\_ \
\ \ \___      __\//\ \ \//\ \     ___
 \ \  _ `\  /'__`\\ \ \  \ \ \   / __`\
  \ \ \ \ \/\  __/ \_\ \_ \_\ \_/\ \L\ \
   \ \_\ \_\ \____\/\____\/\____\ \____/
    \/_/\/_/\/____/\/____/\/____/\/___/
```

```
$ npx echoascii --font 'ANSI Shadow' hi there

██╗  ██╗██╗    ████████╗██╗  ██╗███████╗██████╗ ███████╗
██║  ██║██║    ╚══██╔══╝██║  ██║██╔════╝██╔══██╗██╔════╝
███████║██║       ██║   ███████║█████╗  ██████╔╝█████╗
██╔══██║██║       ██║   ██╔══██║██╔══╝  ██╔══██╗██╔══╝
██║  ██║██║       ██║   ██║  ██║███████╗██║  ██║███████╗
╚═╝  ╚═╝╚═╝       ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝
```

```
$ npx echoascii --font Small --border --rows hello world

┌─────────────────────────┐
│  _        _ _           │
│ | |_  ___| | |___       │
│ | ' \/ -_) | / _ \      │
│ |_||_\___|_|_\___/   _  │
│ __ __ _____ _ _| |__| | │
│ \ V  V / _ \ '_| / _` | │
│  \_/\_/\___/_| |_\__,_| │
└─────────────────────────┘
```

More things to try:

```
npx echoascii --gradient red,blue hello        # smooth color gradient
npx echoascii --rainbow --center hello         # rainbow, centered in the terminal
npx echoascii --type "hello there"             # typewriter animation
npx echoascii --flow --font 'ANSI Shadow' hi   # flowing rainbow, ctrl+c to stop
npx echoascii --clock                          # big live clock, ctrl+c to stop
npx echoascii --countdown 5m "Time's up!"      # countdown, then a message
npx echoascii --markdown hello                 # a code block to paste into a README
npx echoascii --random hello                   # surprise font
npx echoascii --list-fonts hello | less        # your text in every font
git branch --show-current | npx echoascii      # pipe text in
```

## Options

| Option | Description |
| --- | --- |
| `-f, --font <name>` | Font to use. Defaults to `Larry 3D`. Case, spaces and dashes don't matter, and typos get suggestions. |
| `--rows` | Put each argument on its own row |
| `-w, --width <cols>` | Wrap at this many columns. Defaults to the terminal width. |
| `--center` | Center in the terminal |
| `--border` | Draw a box around the banner |
| `--trim` | Remove the blank space around the banner, handy for commit messages |
| `--markdown` | Wrap in a markdown code block, for READMEs. Implies `--trim` and skips colors. |
| `-c, --color <color>` | `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`, or a hex color like `ff8800` |
| `-g, --gradient <colors>` | Two or more colors, like `red,blue` or `ff8800,8800ff` |
| `--rainbow` | Rainbow colors |
| `--type` | Type the text out like a typewriter |
| `--flow` | Make the rainbow or gradient flow, until ctrl+c. Uses the rainbow unless there's a gradient. |
| `--clock` | Show a live clock |
| `--countdown <time>` | Count down from `90`, `90s`, `5m`, `1h30m` or `10:00`, then show the text |
| `--random` | Use a random font. Its name is printed to stderr. |
| `-l, --list-fonts` | List all fonts, or preview your text in every font |
| `-h, --help` | Show help |
| `-v, --version` | Show the version |

Gradients and hex colors use 24-bit color when `$COLORTERM` says the terminal supports it, and the closest of 256 colors otherwise. The animations only play in a terminal: piped elsewhere, `--type` and `--flow` print the banner, `--clock` prints the time once and `--countdown` prints each second.

## Install

```
npm i -g echoascii
```

or add it to a project with `npm i echoascii`. Requires Node.js 18.3 or newer.

## Use it from JavaScript or TypeScript

```ts
import echoascii from 'echoascii'

console.log(echoascii('hello'))
console.log(echoascii('hello', { font: 'ANSI Shadow', border: true, gradient: 'red,blue' }))
```

It works with `require` too:

```js
const echoascii = require('echoascii')

console.log(echoascii('hello', { font: 'Small', trim: true }))
```

The options are the same as the command line ones: `font`, `width`, `center`, `border`, `trim`, `markdown`, `color`, `gradient` and `rainbow`, plus `truecolor` to force 24-bit colors on or off. Rows are split on newlines.

Types are included:

```ts
import echoascii, { fonts, type Options } from 'echoascii'

const options: Options = { font: 'Doom', center: true, width: 60 }
const banner: string = echoascii('hi', options)

fonts() // every font name
```

Bad input, like an unknown font or color, throws an `EchoasciiError` with a message that's safe to show to users and a `code` (`UNKNOWN_FONT` or `INVALID_OPTION`).

## Config

Set defaults in a `.echoasciirc` JSON file, using the same names as the long options:

```json
{
  "font": "Small",
  "gradient": "cyan,magenta",
  "border": true
}
```

echoascii reads `~/.echoasciirc`, then an `"echoascii"` key in `package.json`, then `.echoasciirc` in the current directory. Later ones win, and options on the command line beat them all. `.echoasciirc.json` works too.

## Fonts

All fonts ship with the package and are read from disk. echoascii never downloads anything. Browse and preview them at [patorjk.com/software/taag](https://patorjk.com/software/taag).

## Upgrading from 1.x

- Node.js 18.3 or newer is required.
- Config files must be JSON. YAML and `.echoasciirc.js` files are no longer read.
- Unknown options like `--foo` are now an error instead of being printed. To print text that starts with a dash, put it after `--`: `echoascii -- --foo`.
