# Run with: npm run record
Output docs/recordings/pick.gif

Set FontSize 18
Set Height 478
Set Framerate 20
Source docs/recordings/shared/style.tape

# Only the animation is recorded: the command runs on a cleared screen
# while hidden, and the prompt stays hidden after it
Hide
Type `clear; printf '\e[?25l'; sleep 0.3; node dist/cli.js --pick --gradient cyan,magenta hello; printf '\e[?25l'; sleep 60`
Enter
Sleep 200ms
Show

Sleep 1.2s
Down
Sleep 700ms
Down
Sleep 700ms
Down
Sleep 900ms
Type "shadow"
Sleep 1.2s
Down
Sleep 1s
Enter
Sleep 2.5s
