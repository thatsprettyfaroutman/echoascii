# Run with: npm run record
Output docs/recordings/title.gif

Require node

Set Shell "bash"
Set FontSize 16
Set Width 900
Set Height 232
Set Padding 24
Set Framerate 15
Set Theme "Catppuccin Mocha"
Env COLORTERM "truecolor"

# Render the frames, then start recording once the screen is clear
Hide
Type "source docs/recordings/title.sh"
Enter
Sleep 5s
Type "title"
Enter
Sleep 300ms
Show

Sleep 4.6s
