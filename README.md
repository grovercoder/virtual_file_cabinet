# Virtual File Cabinet

This project contains code that goes along with the (#)[Virtual File Cabinet] article.

This code attempts to automate routine filing tasks.

## Setup

1. Create a new directory to store your virtual file cabinet. For instance `mkdir file_cabinet`.
1. Create a directory where scanned documents will be placed. We refer to this as the "inbox" Directory. For instance `mkdir file_cabinet/_inbox`.
1. Optionally, set up a mailbox where scanned documents or pictures can be sent to. Configure this mailbox with the usual "INBOX", and a "Processed" folder (located at the same level as Inbox).
1. Clone this repository.
1. Copy the `src/config.example.js` file to `src/config.js`. Edit the `src/config.js` file with the directories and IMAP details defined above. Note that if the "imap" property is not set or equates to false the system will not check the mailbox.

## Running the code.

1. Change into the project directory.
1. Run `npm run filing`.

You may wish to create a CRON job to do this automatically at set periods.

## Usage

The system does the following tasks

- Checks the email system (if configured) to download any attachments to the inbox Directory. Any email found that has attachments are moved into the `Processed` folder in the mailbox.
- Scans the virtual file cabinet directory for any files (ommitting the inbox directory) and attempts to extract text from those files. The text and directory information is used to train the Natural Language Processing (NLP) system.
- Scans the inbox directory for any files.
- Each file in the inbox directory has text extracted from it. That text is then used with the NLP system to try to guess what directory the file should be placed in.
  - If the file does not match any of the current directories for any reason, it is renamed to "unclassified_XXXXXXXXXXXX.ext". The XXXXs are a unix timestamp - either from the first date found in the file, or from the date the process was run.
  - When a directory is suggested for the file, a "score" is checked to determine how confident the NLP system is for the recommendation. If the score is strong enough, the file is moved into that directory. The file is also renamed. The name of the target directory is used, as well as a millisecond timestamp.

### First Run

If your first run has an impty file cabinet directory (other than the inbox directory) no files are moved. Any files in the inbox directory will be tagges as "unclassified". Afterall there is nothing for it to begin choosing directories from.

If you pointed the file cabinet directory to an existing directory with files in it already, then the files in the inbox directory _may_ get moved into an appropriate directory.

You should periodically review the inbox directory and manually take care of any file marked as unclassified. This means creating any appropriate directories in the file cabinet directory, and then moving that file into the new directory. You probably want to rename the file to something more meaningful.

As the file cabinet directory becomes more populated the incoming files will become more reliably moved into an appropriate directory. For instance, if you always buy fuel from an Esso gas station, the first receipt will not go into the "Esso" directory automatically, but subsequent receipts should.

You can always manually place files into the file cabinet or inbox directories.
