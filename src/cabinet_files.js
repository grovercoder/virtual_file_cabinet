const path = require('path')
const fs = require('fs')
const globby = require('globby')

// Retrieve a list of the files in our _inbox directory
// Return an absolute path for each of the target files
function incoming(rootDir) {
  return globby.sync([`${rootDir}/*`])
}

function recursiveFileList(rootDir, inbox) {
  return globby.sync([`${rootDir}/**/*`, `!${inbox}`])
}

function forTraining(rootDir, inbox) {
  const fileList = recursiveFileList(rootDir, inbox)

  return fileList.sort().map((file) => {
    return {
      class: path.dirname(file),
      filename: path.basename(file),
      absolute: file,
    }
  })
}

module.exports = {
  recursiveFileList,
  incoming,
  forTraining,
}
