```
             __
            /\ \                                       __  __
   __    ___\ \ \___     ___      __      ____    ___ /\_\/\_\
 /'__`\ /'___\ \  _ `\  / __`\  /'__`\   /',__\  /'___\/\ \/\ \
/\  __//\ \__/\ \ \ \ \/\ \L\ \/\ \L\.\_/\__, `\/\ \__/\ \ \ \ \
\ \____\ \____\\ \_\ \_\ \____/\ \__/.\_\/\____/\ \____\\ \_\ \_\
 \/____/\/____/ \/_/\/_/\/___/  \/__/\/_/\/___/  \/____/ \/_/\/_/
```

Turn any text into big ASCII art banners in your terminal, with 330+ bundled FIGlet fonts 😱

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
$ npx echoascii --font Small --rows 'first row' 'second row'

  __ _        _
 / _(_)_ _ __| |_   _ _ _____ __ __
|  _| | '_(_-<  _| | '_/ _ \ V  V /
|_| |_|_| /__/\__| |_| \___/\_/\_/
 ___ ___ __ ___ _ _  __| |  _ _ _____ __ __
(_-</ -_) _/ _ \ ' \/ _` | | '_/ _ \ V  V /
/__/\___\__\___/_||_\__,_| |_| \___/\_/\_/
```

More things to try:

```
npx echoascii --rainbow hello                  # colors!
npx echoascii --random hello                   # surprise font
npx echoascii --list-fonts                     # all font names
npx echoascii --list-fonts hello | less        # your text in every font
git branch --show-current | npx echoascii      # pipe text in
```

## Options

| Option | Description |
| --- | --- |
| `-f, --font <name>` | Font to use. Defaults to `Larry 3D`. Case, spaces and dashes don't matter, and typos get suggestions. |
| `--rows` | Put each argument on its own row |
| `-w, --width <cols>` | Wrap at this many columns. Defaults to the terminal width. |
| `-c, --color <name>` | `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white` or `gray` |
| `--rainbow` | Rainbow colors |
| `--random` | Use a random font. Its name is printed to stderr. |
| `-l, --list-fonts` | List all fonts, or preview your text in every font |
| `-h, --help` | Show help |
| `-v, --version` | Show the version |

## Install

```
npm i -g echoascii
```

or add it to a project with `npm i echoascii` / `yarn add echoascii`.

Requires Node.js 18.3 or newer.

## Config

Set defaults in a `.echoasciirc` JSON file, using the same names as the long options:

```json
{
  "font": "Small",
  "color": "cyan"
}
```

echoascii reads `~/.echoasciirc`, then an `"echoascii"` key in `package.json`, then `.echoasciirc` in the current directory. Later ones win, and options on the command line beat them all. `.echoasciirc.json` works too.

## Fonts

All fonts ship with the package and are read from disk. echoascii never downloads anything. Browse and preview them at [patorjk.com/software/taag](https://patorjk.com/software/taag).

## Upgrading from 1.x

- Node.js 18.3 or newer is required.
- Config files must be JSON. YAML and `.echoasciirc.js` files are no longer read.
- Unknown options like `--foo` are now an error instead of being printed. To print text that starts with a dash, put it after `--`: `echoascii -- --foo`.
