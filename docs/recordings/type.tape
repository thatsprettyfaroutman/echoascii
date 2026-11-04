# Run with: npm run record
Output docs/recordings/type.gif

Require node

Set Shell "bash"
Set FontSize 18
Set Width 1080
Set Height 330
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms
Env COLORTERM "truecolor"

# Use this checkout's build
Hide
Type "alias echoascii='node dist/cli.js' && clear"
Enter
Show

Type `echoascii --type --gradient cyan,magenta 'hello there'`
Sleep 500ms
Enter
Sleep 3s
