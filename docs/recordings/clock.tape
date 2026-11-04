# Run with: npm run record
Output docs/recordings/clock.gif

Require node

Set Shell "bash"
Set FontSize 18
Set Width 1080
Set Height 290
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms
Env COLORTERM "truecolor"

# Use this checkout's build
Hide
Type "alias echoascii='node dist/cli.js' && clear"
Enter
Show

Type `echoascii --clock --center --font 'ANSI Shadow' --gradient cyan,magenta`
Sleep 500ms
Enter
Sleep 5s
Ctrl+C
Sleep 500ms
