const fs = require('fs')
const path = require('path')
const Cabinet = require('./cabinet_files.js')
const textract = require('textract')
const { NlpManager } = require('node-nlp')
const sha1File = require('sha1-file')
const logger = require('./logging.js')

// include our configuration details
const Config = require('../config.js')

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
// NOTE: this will rename the file in the _INBOX folder to 'unclassified_XXXXXXXX'
// where the XXXXXs represent the last 8 characters of the SHA1 hash for the file.
// Using the SHA1 value helps prevent accidently overwriting files and dealing with duplicate files.
function saveUnclassified(file, text) {
  const sha1 = sha1File.sync(file).slice(-8)
  const newFilename = `${path.dirname(file)}/unclassified_${sha1}${path.extname(
    file
  )}`

  if (file !== newFilename) {
    fs.renameSync(file, newFilename)
    logger.write(`unclassified: ${file} => ${newFilename}`)
  }
}

// Move a file from the INBOX directory to the folder defined as the classification
// the file will be renamed during the move to a format of 'dirname_XXXXXXXX'
// where "dirname" is the name of the directory the file is being placed in, and
// the XXXXXs the last 8 characters of the SHA1 hash for the file.
// NOTE: this may have problems if multiple files are classified into the same folder on the same day
function saveClassified(file, classification, text) {
  const sha1 = sha1File.sync(file).slice(-8)
  const newFilename = `${classification}/${base}_${sha1}${ext}`

  fs.renameSync(file, newFilename)
  logger.write(`classified: ${file} => ${newFilename}`)
}

// Train the NLP manager with the contents of the file cabinet directory.
// We use the text of the file as the "utterances", and the directory the file
// is located in as the classification.
async function train() {
  // Load the previously trained data.  Filename defaults to './model.nlp'.
  // NOTE: We are not using saved training data at this time.  When we do,
  // we will need to implement some smarts to ensure we are not using stale data
  // manager.load()

  // add each of our file cabinet documents for training the NLP process
  await addTrainingItems()

  // now execute the training process
  await manager.train()

  // We would save the trained data at this point.
  // The .save() method optionally takes a filename.  Defaults to './model.nlp'.
  // manager.save()
}

async function addTrainingItems() {
  const files = Cabinet.forTraining(Config.cabinet_dir, Config.inbox_dir)
  // add each cabinet file to the training system
  for (const file of files) {
    const text = await extractTextFromFile(file.absolute)
    if (text) {
      manager.addDocument('en', text, file.class)
    }
  }
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
