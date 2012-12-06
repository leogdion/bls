var ftp = require('ftp-get'),
  mysql = require('mysql'),
  os = require('os'),
  path = require('path'),
  fs = require('fs');

function makeid()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

/*
select concat('drop table if exists ', table_name, ';') from meta group by table_name
union
select concat('create table ', table_name, '(', group_concat(concat_ws(' ',column_name, column_type, IF(nullable,'DEFAULT NULL','NOT NULL'))), ');') from meta group by table_name
union
select concat('load data local infile \'', @basedirectory, '/ftp.bls.gov/pub/time.series/', file_name,'\' into table ', table_name,  ' ignore 1 lines;') from import;
*/

function beginDownload() {
  fs.readFile(path.resolve(__dirname, 'init_db.sql'), 'UTF-8', function (error, data) {
    connection.query(data, function (error, results) {
      connection.query("select concat('create table ', table_name, '(', group_concat(concat_ws(' ',column_name, column_type, IF(nullable,'DEFAULT NULL','NOT NULL'))), ');') as value from meta group by table_name", function (error, results) {

        connection.query(results.map(function (current) {return current.value;}).join(''), function (error, results) {
          connection.query('SELECT * from import', function (error, results) {
            var directories = {};
            results.map(function (value) {
              var paths = value['file_name'].split('/');
              return { dir : paths[0], file : paths[1], tmpFile : path.join(tmpDir, value['file_name']), table :  value['table_name']};
            }).forEach(function (value) {
              if (!directories[value.dir]) {
                directories[value.dir] = [];
              }
              directories[value.dir].push(value);
            });
            for(var dirName in directories) {
              var copyDir = path.join(tmpDir, dirName);
              fs.mkdir(copyDir, function (error) {
                for (var index = 0; index < directories[dirName].length; index++) {
                  var fullFileName = path.join(copyDir, directories[dirName][index].file);
                  console.log('filename:');
                  console.log(directories[dirName][0].file);
                  console.log(index);
                  console.log(fullFileName);
                  var tableName = directories[dirName][index].table;
                  var tmpFile = directories[dirName][index].tmpFile;
                  console.log(tmpFile);
                  ftp.get('ftp://ftp.bls.gov/pub/time.series/' + dirName + '/' + directories[dirName][index].file, directories[dirName][index].tmpFile, function (error, result) {
                    connection.query('load data local infile \'' + tmpFile + '\' into table ' + tableName + ' ignore 1 lines;', function (error, results) {
                      console.log(results);
                      console.log(error);
                    });
                  });
                  /*
                  client.get(directories[dirName][index].file, function (error, stream) {
                    console.log(error);
                    console.log(dirName);
                    stream.on('success', function () {
                      console.log(fullFileName);
                    });
                    stream.pipe(fs.createWriteStream(fullFileName));
                    connection.end();
                  });
                  */
                }
              });
            }
          });
        });
      });
    });
  });
}
var ftpBaseDir = '/pub/time.series/';
var tmpDir = path.join(os.tmpDir(), makeid());
var dbName = 'bls';
//var client = new ftp ({host : 'ftp.bls.gov', debug : function (value) {console.log(value);}}),
var connection = mysql.createConnection({user : 'root', password : process.argv[process.argv.length - 1], database : 'bls', multipleStatements: true});
/*
client.on('connect', function () {
  client.auth(function (e) {
    if (e) {
    throw e;
   } else {
      client.cwd('pub', function (error){
        console.log(error);
        client.cwd('time.series', function (error) {
          connection.query('SELECT * from import', function (error, results) {
            var directories = {};
            results.map(function (value) {
              var paths = value['file_name'].split('/');
              return { dir : paths[0], file : paths[1], table :  value['table_name']};
            }).forEach(function (value) {
              if (!directories[value.dir]) {
                directories[value.dir] = [];
              }
              directories[value.dir].push(value);
            });
            for(var dirName in directories) {
              var copyDir = path.join(tmpDir, dirName);
              fs.mkdir(copyDir, function (error) {
                client.cwd(dirName, function (error) {
                  for (var index = 0; index < directories[dirName].length; index++) {
                    var fullFileName = path.join(copyDir, directories[dirName][index].file);
                    console.log('filename:');
                    console.log(directories[dirName][0].file);
                    console.log(index);
                    console.log(fullFileName);
                    client.get(directories[dirName][index].file, function (error, stream) {
                      console.log(error);
                      console.log(dirName);
                      stream.on('success', function () {
                        console.log(fullFileName);
                      });
                      stream.pipe(fs.createWriteStream(fullFileName));
                      connection.end();
                    });
                  }
                });
              });
            }
          });
      });
    });
   }
  });
});
*/

fs.mkdir(tmpDir, function (error) {

if (process.argv[1] == '-f') {
  connection.query('DROP SCHEMA ' + dbName + '; CREATE SCHEMA ' + dbName + ';', function (error, results) {
    beginDownload();
  });
} else {
  beginDownload();
}
});
