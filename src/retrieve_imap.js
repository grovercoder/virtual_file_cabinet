const fs = require('fs')
const path = require('path')
const imaps = require('imap-simple')
const Config = require('../config.js')
const logger = require('./logging.js')

// ----------
// Functions
// ----------
function saveAttachment(fname, content) {
  const target = path.join(Config.inbox_dir, fname)
  fs.writeFile(target, content, (err) => {
    if (err) {
      logger.write(`ERROR: ${err.message}`)
      console.log(err)
    }
    logger.write(`IMAP Attachment: ${fname}`)
  })
}

async function connectToAccount() {
  return await imaps.connect(Config)
}

async function openMailbox(connection, mailbox) {
  return await connection.openBox(mailbox)
}

async function searchMailbox(connection, searchCriteria, fetchOptions) {
  return await connection.search(searchCriteria, fetchOptions)
}
// ----------

async function retrieve() {
  if (!Config.imap) {
    return
  }

  const searchCriteria = ['ALL']
  const fetchOptions = {
    bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
    struct: true,
  }

  const connection = await connectToAccount()
  await openMailbox(connection, 'INBOX')
  const messages = await searchMailbox(connection, searchCriteria, fetchOptions)
  for (const message of messages) {
    let attachments = []
    const parts = imaps.getParts(message.attributes.struct)
    parts.filter(
      (part) =>
        part.disposition && part.disposition.type.toUpperCase() === 'ATTACHMENT'
    )

    for (const part of parts) {
      if (part && part.type) {
        // just to ensure we have a valid part
        const partData = await connection.getPartData(message, part)
        saveAttachment(part.disposition.params.filename, partData)
      }
    }

    await connection.moveMessage(message.attributes.uid, 'Processed')
  }

  return await connection.closeBox()
}

module.exports = {
  retrieve,
}
