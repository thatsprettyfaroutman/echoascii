#!/usr/bin/env node
if (process.argv.length <= 2) {
  console.log('usage: echoascii some words here')
  process.exit(-1)
}

const figlet = require('figlet')
const rcfile = require('rcfile')
const config = rcfile('echoascii')

// Args
const args = process.argv.slice(2)
console.log(args)

// Default config
if (!config.font) config.font = 'Larry 3D'

// Option functions
const options = [
  [
    '--font',
    arg => {
      const font = arg.replace('--font=', '').trim()
      config.font = font
    }
  ],
  [
    '--rows',
    () => {
      config.rows = true
    }
  ]
]

// Run options
args.forEach(arg =>
  options.forEach(([flag, modifier]) => {
    console.log(arg, flag, arg.indexOf(flag))
    if (arg.indexOf(flag) === 0) {
      modifier(arg)
    }
  })
)

// Words
const words = args
  .filter(arg => !options.find(option => arg.includes(option[0])))
  .join(config.rows ? '\n ' : ' ')

// Convert to ascii
const result = figlet.textSync(`\n ${words} \n`, {
  font: config.font,
  horizontalLayout: 'default',
  verticalLayout: 'default'
})

// Render
console.log(result)

// Exit
process.exit(0)
