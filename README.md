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
$ npx echoascii --font='ANSI Shadow' hi there

██╗  ██╗██╗    ████████╗██╗  ██╗███████╗██████╗ ███████╗
██║  ██║██║    ╚══██╔══╝██║  ██║██╔════╝██╔══██╗██╔════╝
███████║██║       ██║   ███████║█████╗  ██████╔╝█████╗
██╔══██║██║       ██║   ██╔══██║██╔══╝  ██╔══██╗██╔══╝
██║  ██║██║       ██║   ██║  ██║███████╗██║  ██║███████╗
╚═╝  ╚═╝╚═╝       ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝
```

```
$ npx echoascii --font=Small --rows 'first row' 'second row'

  __ _        _
 / _(_)_ _ __| |_   _ _ _____ __ __
|  _| | '_(_-<  _| | '_/ _ \ V  V /
|_| |_|_| /__/\__| |_| \___/\_/\_/
 ___ ___ __ ___ _ _  __| |  _ _ _____ __ __
(_-</ -_) _/ _ \ ' \/ _` | | '_/ _ \ V  V /
/__/\___\__\___/_||_\__,_| |_| \___/\_/\_/
```

## Options

| Option | Description |
| --- | --- |
| `--font=<name>` | Font to use. Defaults to `Larry 3D`. Font names are case sensitive. |
| `--rows` | Put each argument on its own row |

## Install

```
npm i -g echoascii
```

or add it to a project with `npm i echoascii` / `yarn add echoascii`.

Requires Node.js 17 or newer.

## Config

Set a default font with a `.echoasciirc` file in the directory you run it from:

```json
{
  "font": "Small"
}
```

`.echoasciirc.json`, `.echoasciirc.yml` and an `"echoascii"` key in `package.json` work too.

## Fonts

All 330+ fonts ship with the package, so it works offline. Browse and preview them at [patorjk.com/software/taag](https://patorjk.com/software/taag).
