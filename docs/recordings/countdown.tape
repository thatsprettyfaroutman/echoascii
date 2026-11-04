# Run with: npm run record
Output docs/recordings/countdown.gif

Require node

Set Shell "bash"
Set FontSize 18
Set Width 960
Set Height 380
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 45ms
Env COLORTERM "truecolor"

# Use this checkout's build
Hide
Type "alias echoascii='node dist/cli.js' && clear"
Enter
Show

Type `echoascii --countdown 5 --border --gradient yellow,red "Time's up!"`
Sleep 500ms
Enter
Sleep 7s
