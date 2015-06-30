//script to download taxi bill for a BBL, scrape the goodies, and output them as a JSON object

var Mustache = require('mustache'),
  http = require('http'),
  fs = require('fs'),
  path = require('path'),
  extract = require('pdf-text-extract');

//var testBBL = 3002480028;
//var testBBL = 3002430001; //exempt
var testBBL = 1018880059; //abate & exempt

var data = getTaxData(testBBL);

function getTaxData(bbl) {

  //first get the pdf
  //June 5th statement looks like this: 
  //http://nycprop.nyc.gov/nycproperty/StatementSearch?bbl=3002480028&stmtDate=20150605&stmtType=SOA

  var templateData = {
    bbl:bbl,
    date:'20150605' //statement date
  }


  var statementURL = Mustache.render('http://nycprop.nyc.gov/nycproperty/StatementSearch?bbl={{bbl}}&stmtDate={{date}}&stmtType=SOA',templateData);

  console.log(statementURL);

  console.log('fetching PDF statement for BBL ' + bbl + '...');
  var request = http.get(statementURL, function(response) {
      if (response.statusCode === 200) {
          console.log("got it!");
          var filePath = path.join(__dirname, "./temp/" + bbl + ".pdf")
          var file = fs.createWriteStream(filePath);
          var p = response.pipe(file);

          p.on('finish', function() {
            extract(filePath, function (err, pages) {
              if (err) {
                console.dir(err)
                return
              }
              var output = {};
              var page2 = pages[1].replace(/\s/g,'').replace(/\t/, '');
              console.log(page2);
          
              output.emv = parseInt(page2.split('Estimatedmarketvalue$')[1].split(/[a-zA-Z]/)[0].replace(/,/g,''));
          
              var bavtbea = page2.split('Taxbeforeexemptionsandabatements$')[1].split('**')[0];
          
              output.bav = parseInt(bavtbea.split('X')[0].replace(/,/g,''));
          
              output.tbea = parseInt(bavtbea.split('$')[1].replace(/,/g,''));
             
              output.apt = parseInt(page2.split('Annualpropertytax$')[1].split('**')[0].replace(/,/g,''));

              console.log(output);
            })
          });

      }
      // Add timeout.
      request.setTimeout(12000, function() {
          request.abort();
      });
  });

};