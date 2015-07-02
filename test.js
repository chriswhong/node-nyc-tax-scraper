var Mustache = require('mustache'),
  http = require('http'),
  fs = require('fs'),
  path = require('path'),
  extract = require('pdf-text-extract');


//var bbl = 1011860037;
var bbl = 1018880059;

getTaxData(bbl,function(output){
  console.log(output);
})

function getTaxData(bbl, cb) {

  //first get the pdf
  //June 5th statement looks like this: 
  //http://nycprop.nyc.gov/nycproperty/StatementSearch?bbl=3002480028&stmtDate=20150605&stmtType=SOA

  var templateData = {
    bbl:bbl,
    date:'20150605' //statement date
  }

  var output = {
    bbl: bbl
  };

  var statementURL = Mustache.render('http://nycprop.nyc.gov/nycproperty/StatementSearch?bbl={{bbl}}&stmtDate={{date}}&stmtType=SOA',templateData);

  console.log(statementURL);

  console.log('fetching tax bill for BBL ' + bbl + '...');
  var request = http.get(statementURL, function(response) {
    console.log(response.statusCode);
      if (response.statusCode === 200) {
          console.log("got it!");
          var filePath = path.join(__dirname, "./temp/" + bbl + ".pdf")
          var file = fs.createWriteStream(filePath);
          var p = response.pipe(file);

          //once the pdf is saved to disk, extract text from it
          p.on('finish', function() {
            extract(filePath, function (err, pages) {
              if (err) {
                console.dir(err)
                return
              }

              //concatenate pages into one string
              var text;
              pages.forEach(function(page) {
                text += page;
              });
              //console.log(text);
                
              //regex template to grab a whole chunk of the page including line breaks
              //thanks to John Krauss for this example: https://github.com/talos/nyc-stabilization-unit-counts/blob/master/parse.py#L46
              var details = /(Estimated market value[\s\S]*?Annual property tax.*)/;
              var arr = text.match(details);
      
              //split into lines
              var lines = arr[0].split('\n');

              //for each line, clean white space
              lines.forEach(function(line,i) {
                var lineParts = String(line).split(/\s{2,}/);
                console.log(lineParts);
                (i==0) ? output.tbea = parseAmount(lineParts[lineParts.length-1]) : null;
                //TODO set up ifs for different types of lines to pull out the data

              });

              console.log(output); 
                            
            })
          });

      } else {
        output.raw = 'noData';
        cb(output);
      }
      // Add timeout.
      request.setTimeout(12000, function() {
          request.abort();
      });
  });

};

function parseAmount(string) {
  return parseInt(string.replace(',', '').replace('$', '').replace('*', ''));
};


