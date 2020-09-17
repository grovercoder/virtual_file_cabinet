const fs = require('fs')
const path = require('path')
const Cabinet = require('./cabinet_files.js')
const textract = require('textract')
const { NlpManager } = require('node-nlp')
const extractDates = require('extract-date').default

// include our configuration details
const Config = require('./config.js')

// set up the Natural Language Processing manager
const manager = new NlpManager({ languages: ['en'], nlu: { log: false } })

// extract text from the specified file, if possible
function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(file, (err, text) => {
      if (err) return reject(err)

      resolve(text)
    })
  })
}

// Rename a file that could not be classified
// NOTE: this will rename the file in the _INBOX folder to 'unclassified_XXXXXXXXXXXXX'
// where the XXXXXs represent a unix timestamp with milliseconds
// NOTE2: this may have problems if there are multiple unclassified files on the same day
function saveUnclassified(file, text) {
  const dates = extractDates(text)
  console.log({ text, dates })
  const dt = dates.length ? new Date(dates[0].date) : new Date()
  const ts = dt.getTime()
  const newFilename = `${path.dirname(file)}/unclassified_${ts}${path.extname(
    file
  )}`

  console.log(`File Renamed: ${path.basename(file)} => ${newFilename}`)
  fs.renameSync(file, newFilename, (err) => {
    if (err) throw err
  })
}

// Move a file from the INBOX directory to the folder defined as the classification
// the file will be renamed during the move to a format of 'dirname_XXXXXXXXXXXXX'
// where "dirname" is the name of the directory the file is being placed in, and
// the XXXXXs represent a unix timestamp with milliseconds.
// NOTE: this may have problems if multiple files are classified into the same folder on the same day
function saveClassified(file, classification, text) {
  const dates = extractDates(text)
  console.log({ dates, text })
  const base = path.basename(classification)
  const ext = path.extname(file)
  const dt = dates.length ? new Date(dates[0].date) : new Date()
  const ts = dt.getTime()
  const newFilename = `${classification}/${base}_${ts}${ext}`

  console.log(`File Moved: ${path.basename(file)} => ${newFilename}`)
  fs.renameSync(file, newFilename, (err) => {
    if (err) throw err
  })
}

// Train the NLP manager with the contents of the file cabinet directory.
// We use the text of the file as the "utterances", and the directory the file
// is located in as the classification.
function train(directory, exclude) {
  const docLoader = new Promise(async (resolve, reject) => {
    const files = Cabinet.forTraining(Config.cabinet_dir, Config.inbox_dir)
    for (const file of files) {
      const text = await extractTextFromFile(file.absolute)
      if (text) {
        manager.addDocument('en', text, file.class)
      }
    }

    resolve()
  })

  return docLoader.then(async () => {
    await manager.train()
    manager.save()
  })
}

// Classify all the files in the INBOX directory (if possible).
// The classification object will have an "intent" of "None" if
// the a recommendation could not be found for where to put the file.
// Otherwise, the classification object with have an "intent" that represents the directory
// the file should be stored in.
// The classification will have a "score" property for files that have a recommended directory.
// The score ranges from 0 to 1 (think percentages).  We use a "confidence" value to determine
// a minimal score.  Any files that score less than the confidence threshold are treated as an
// unclassified value.
async function classify() {
  // train the NLP Manager with all the files in our cabinet,
  // ignore the files in the inbox directory (if it is inside the cabinet directory)
  await train(Config.cabinet_dir, Config.inbox_dir)

  // get an array of the new/incoming files
  const incomingFiles = Cabinet.incoming(Config.inbox_dir)

  // try to classify each file
  for (const incoming of incomingFiles) {
    // skip the _README.md file
    if (path.basename(incoming) !== '_README.md') {
      // extract the text
      const text = await extractTextFromFile(incoming)
      if (text) {
        // we have text, try to determine a classification using NLP
        const classification = await manager.process('en', text)

        // if we have an intent that is not "None", and a high enough score,
        // we can classify the incoming file into a directory
        if (
          classification.intent &&
          classification.intent != 'None' &&
          classification.score > Config.confidence
        ) {
          // we have a (strong) classification
          saveClassified(incoming, classification.intent, text)
        } else {
          // could not classify the document (possibly due to a low confidence)
          // mark incoming as unclassified
          saveUnclassified(incoming, text)
        }
      }
    }
  }
}

module.exports = {
  classify,
  train,
}
