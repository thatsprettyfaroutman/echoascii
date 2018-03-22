#!/usr/bin/env node
if (process.argv.length <= 2) process.exit(-1)

const figlet = require('figlet')
const rcfile = require('rcfile')
const config = rcfile('echoascii')

const str = process.argv[2]
const result = figlet.textSync(`\n ${str} \n`, {
  font: config.font || 'Larry 3D',
  horizontalLayout: 'default',
  verticalLayout: 'default',
})

console.log(result)
