# Run with: npm run record
Output docs/recordings/snow.gif

Set FontSize 18
Set Height 348
Set Framerate 20
Source docs/recordings/shared/style.tape

# Only the animation is recorded: the command runs on a cleared screen
# while hidden, and the prompt stays hidden after it
Hide
Type `clear; printf '\e[?25l'; sleep 0.3; node dist/cli.js --snow --center --font 'ANSI Shadow' --color white 'let it snow'; printf '\e[?25l'; sleep 60`
Enter
Sleep 200ms
Show

Sleep 4.5s
Hide
Ctrl+C
