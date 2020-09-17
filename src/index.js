const Imap = require('./retrieve_imap.js')
const Filing = require('./filing')

Imap.retrieve().then(() => {
  Filing.classify().then(() => {
    process.exit(0)
  })
})
