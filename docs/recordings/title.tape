# Run with: npm run record
Output docs/recordings/title.gif

Set FontSize 16
Set Width 900
Set Height 210
# Framerate 15 keeps the flowing rainbow under 1 MB
Set Framerate 15
Source docs/recordings/shared/style.tape

# Just the banner, without the command: clear the screen and hide the cursor,
# then start recording while it waits a moment
Hide
Type `clear; printf '\e[?25l'; sleep 0.5; node dist/cli.js --type --flow --center --font 'ANSI Shadow' echoascii`
Enter
Sleep 250ms
Show

Sleep 4s
