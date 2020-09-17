module.exports = {
  // where is the file cabinet directory (use an absolute path)
  cabinet_dir: '/path/to/file_cabinet',
  // The inbox_dir can be anywhere, but we normally place it under
  // the cabinet_dir with a name of '_inbox'
  inbox_dir: '/path/to/incoming/files/directory',

  // minimum score to indicate confidence in the classification found by the
  // natural language processing system.  A value between 0 and 1.
  confidence: 0.7,

  // [optional]
  // IMAP connection details.
  // if omitted or set to false, email will not be checked for attachements
  imap: {
    user: 'filing@somedomain.com',
    password: 'SuperSecret',
    host: 'my.mailserver.com',
    port: 143,
    tls: false,
    authTimeout: 3000,
  },
}
