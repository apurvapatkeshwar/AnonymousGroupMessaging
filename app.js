/**
 * Author: Ruojun Hong
 * @type {*|createApplication}
 */
const express = require('express');
const app = express();
app.use(express.urlencoded({extended: false}));
app.set('view engine', 'hbs');

/***
 * Database - sqlite3
 */
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db/chatapp.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

//listen on port 3000
app.listen(3000);
console.log('Listening to port 3000.');

/***
 * Index page
 */
app.get('/', (req, res) => {
    res.render('index', {user: 'Ruojun'});
});

/**
 * Users page
 */
app.get('/users', (req, res) => {
    const sql = 'SELECT * FROM USER ORDER BY USERNAME';
    const users = [];

    function render() {
        res.render('users', {allUsers: users});
    }

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error(err.message);
        }
        rows.forEach((row) => {
            users.push({username: row.USERNAME, password: row.PASSWORD});
        });
        // render after all user data has been loaded.
        render();
    });
});

app.post('/users', (req, res) => {
    const sqlSelect = 'SELECT * FROM USER WHERE USERNAME = ?';
    const sqlUpdate = 'UPDATE USER SET USERNAME = ?, PASSWORD = ? WHERE USERNAME = ?';
    const sqlInsert = 'INSERT INTO USER(USERNAME, PASSWORD) VALUES(?, ?)';

    function redirect() {
        res.redirect('/users');
    }

    db.get(sqlSelect, [req.body.username], (err, row) => {
        if (err) {
            console.error(err.message);
        }
        else if (row) {
            db.run(sqlUpdate, [req.body.username, req.body.password, row.USERNAME], (err) => {
                if (err) {
                    console.error(err.message);
                }
                else {
                    console.log('Updated user ' + row.USERNAME);
                }
            });
        }
        else {
            db.run(sqlInsert, [req.body.username, req.body.password], err => {
                if (err) {
                    console.error(err.message);
                }
                else {
                    console.log('Inserted row ' + req.body.username);
                }
            });
        }
        redirect();
    });
});

/**
 * Messages page
 */
app.get('/messages', (req, res) => {
    let sql = 'SELECT MESSAGE.BODY, MESSAGE.MESSAGEID, SENDER.USERNAME AS SENDERNAME, RECEIVER.USERNAME AS RECEIVERNAME FROM MESSAGE ' +
        'INNER JOIN USER AS SENDER ON SENDER.USERID = MESSAGE.SENDERID AND (SENDER.USERNAME = ? OR SENDER.USERNAME = ?)' +
        'INNER JOIN USER AS RECEIVER ON RECEIVER.USERID = MESSAGE.RECEIVERID AND (RECEIVER.USERNAME = ? OR RECEIVER.USERNAME = ?)' +
        'ORDER BY MESSAGE.MESSAGEID';
    const messages = [];

    function render() {
        res.render('messages', {allMessages: messages});
    }

    // type check is necessary. Otherwise bad input would cause server to crash.
    if (req.query.numPg == parseInt(req.query.numPg, 10)
        && req.query.numMsgPerPg == parseInt(req.query.numMsgPerPg, 10)) {
        sql = sql + ' LIMIT ' + req.query.numMsgPerPg + ' OFFSET ' + req.query.numPg * req.query.numMsgPerPg;
    }

    db.all(sql, [req.query.userA, req.query.userB, req.query.userA, req.query.userB], (err, rows) => {
        if (err) {
            console.error(err.message);
        }
        rows.forEach((row) => {
            messages.push({
                messageId: row.MESSAGEID,
                sender: row.SENDERNAME,
                receiver: row.RECEIVERNAME,
                body: row.BODY
            });
        });
        render();
    });
});

app.post('/messages', (req, res) => {
    const sqlSelectUser = 'SELECT * FROM USER WHERE USERNAME = ?';
    const sqlInsertMessage = 'INSERT INTO MESSAGE(SENDERID, RECEIVERID, BODY, TYPE) VALUES(?, ?, ?, ?)';
    // Get last inserted row id - per connection
    const sqlSelectId = 'SELECT LAST_INSERT_ROWID()';
    const sqlInsertImgMetadata = 'INSERT INTO IMAGELINK(MESSAGEID, WIDTH, HEIGHT) VALUES(?, ?, ?)';
    const sqlInsertVideoMetadata = 'INSERT INTO VIDEOLINK(MESSAGEID, VIDEOLENGTH, SOURCE) VALUES(?, ?, ?)';
    const params = {};

    function redirect() {
        res.redirect('/messages?userA=' + req.body.sender + '&userB=' + req.body.receiver);
    }

    function insertMetadata(messageId, messageType) {
        if (messageType === 2) {
            // TODO: Change hard-coded params.
            db.run(sqlInsertImgMetadata, [messageId, 0, 0], err => {
                if (err) {
                    console.error(err.message);
                }
                else {
                    console.log('Inserted image metadata.');
                }
            });
        }
        else if (messageType === 3) {
            // TODO: Change hard-coded params.
            db.run(sqlInsertVideoMetadata, [messageId, 0, 'Youtube'], err => {
                if (err) {
                    console.error(err.message);
                }
                else {
                    console.log('Inserted video metadata.');
                }
            });
        }
    }

    function insertMessage() {
        if ('sender' in params && 'receiver' in params) {
            let messageType = 1;
            if (req.body.messageType === 'imageLink') {
                messageType = 2;
            }
            else if (req.body.messageType === 'videoLink') {
                messageType = 3;
            }
            db.run(sqlInsertMessage, [params['sender'], params['receiver'], req.body.messageBody, messageType], err => {
                if (err) {
                    console.error(err.message);
                }
                else {
                    console.log('Added message between ' + params['sender'] + ' ' + params['receiver']);

                    // handle metadata
                    // get the message id
                    db.get(sqlSelectId, [], (err, row) => {
                        if (err) {
                            console.error(err.message);
                        }
                        else if (row['LAST_INSERT_ROWID()'] && row['LAST_INSERT_ROWID()'] !== 0) {
                            insertMetadata(row['LAST_INSERT_ROWID()'], messageType);
                        }
                    });
                }
                redirect();
            });
        }
    }

    db.get(sqlSelectUser, [req.body.sender], (err, sender) => {
        if (err) {
            console.error(err.message);
        }
        else if (sender) {
            params['sender'] = sender.USERID;
            insertMessage();
        }
        else {
            console.error('No such sender.');
        }
    });

    db.get(sqlSelectUser, [req.body.receiver], (err, receiver) => {
        if (err) {
            console.error(err.message);
        }
        else if (receiver) {
            params['receiver'] = receiver.USERID;
            insertMessage();
        }
        else {
            console.error('No such receiver.');
        }
    });
});