const fs = require('fs')
const path = require('path')

const logfile = path.resolve(__dirname, '../filing.log')

function write(msg) {
  // const data = {
  //   when: Date.now(),
  //   message: msg,
  // }
  const data = `${Date.now()}: ${msg}\n`
  fs.appendFile(logfile, data, { encoding: 'utf8' }, (err) => {
    if (err) {
      throw err
    }
    console.log(data)
  })
}

module.exports = {
  write,
}
