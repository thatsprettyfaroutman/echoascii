# The README title: "echoascii" spins through fonts like a slot machine,
# lands on ANSI Shadow and the rainbow starts flowing. Every frame is real
# echoascii output. title.tape sources this file and runs `title`.

fonts=('Larry 3D' Slant 'Big Money-ne' Graffiti 3D-ASCII 'Star Wars' Colossal
  Doom 'DOS Rebel' Modular 'Henry 3D' Epic)
gradients=(cyan,magenta yellow,red green,cyan magenta,yellow blue,cyan red,magenta)
# Fast at first, then slowing down like a slot machine
holds=(0.08 0.08 0.08 0.08 0.08 0.09 0.1 0.12 0.15 0.2 0.27 0.36)

# Render every frame up front so the spin doesn't wait for node. Output to a
# pipe isn't a terminal, so pass the terminal width along for --center.
cols=$(tput cols)
frames=()
for i in "${!fonts[@]}"; do
  frames+=("$(node dist/cli.js --center --width "$cols" --font "${fonts[$i]}" \
    --gradient "${gradients[$((i % ${#gradients[@]}))]}" echoascii)")
done
# The last frame matches the first frame of --flow, so the hand-off is seamless
frames+=("$(node dist/cli.js --center --width "$cols" --font 'ANSI Shadow' \
  --rainbow echoascii)")

title() {
  printf '\033[?25l\033[H\033[2J'
  sleep 0.5
  for i in "${!frames[@]}"; do
    printf '\033[H\033[J\n%s' "${frames[$i]}"
    sleep "${holds[$i]:-0}"
  done
  # Back to the top without clearing; --flow redraws over the last frame
  printf '\033[H'
  node dist/cli.js --center --font 'ANSI Shadow' --flow echoascii
}
