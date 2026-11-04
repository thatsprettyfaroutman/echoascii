# Run with: npm run record
Output docs/recordings/marquee.gif

Set FontSize 18
Set Height 340
Set Framerate 20
Source docs/recordings/shared/style.tape

# Use this checkout's build
Hide
Type "alias echoascii='node dist/cli.js' && clear"
Enter
Show

Type `echoascii --marquee --rainbow --font Doom 'breaking news: echoascii can scroll'`
Sleep 500ms
Enter
Sleep 4s
Ctrl+C
Sleep 500ms
