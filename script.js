//script to download taxi bill for a BBL, scrape the goodies, and output them as a JSON object

var Mustache = require('mustache'),
  http = require('http'),
  fs = require('fs'),
  path = require('path'),
  extract = require('pdf-text-extract'),
  CartoDB = require('cartodb'),
  secret = require('./secret.js');;

//var testBBL = 3002480028;
//var testBBL = 3002430001; //exempt
//var testBBL = 1018880059; //abate & exempt

//var data = getTaxData(testBBL);

var client = new CartoDB({user: secret.USER,api_key: secret.API_KEY});

//connect to cartodb, get 10 rows that do not have data
client.on('connect', function() {
    console.log("connected");

    client.query("SELECT bbl FROM june15tax WHERE raw IS NULL ORDER BY bbl ASC LIMIT 1", function(err, data){
        processBBLs(data);
    });
});

//setInterval(function() {
  client.connect();
//},1000);

//get data for each bbl
function processBBLs(data) {
  var update = [];

  data.rows.forEach(function(row, i, array) {
    getTaxData(row.bbl,function(output){
      update.push(output);

      //check if this is the last iteration of forEach
      if (i === array.length - 1) {
        console.log(update);
        pushToCartoDB(update);
      }
    });
  });
};

function pushToCartoDB(update) {

  update.forEach(function(row) { 
    console.log(row);
    if(row.apt>-1) {
     var updateQuery = Mustache.render("UPDATE june15tax SET annualtax = '{{apt}}', billassessedvalue = '{{bav}}', estmarketvalue = '{{emv}}', raw = '{{raw}}', taxbeforeea = {{tbea}}  WHERE bbl = {{bbl}}", row); 
   } else {
    var updateQuery = Mustache.render("UPDATE june15tax SET raw = '{{raw}}' WHERE bbl = {{bbl}}", row); 
   }

    console.log(updateQuery);

    client.query(updateQuery,function(err,data) {
      console.log(data);
    });
  })
 
};

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

  console.log('fetching PDF statement for BBL ' + bbl + '...');
  var request = http.get(statementURL, function(response) {
    console.log(response.statusCode);
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
              console.log(pages.length);
              
                

                //add some logic to figure out which page has 'Estimated market value'
                var dataPage;
                pages.forEach(function(page,i) {
                  if(page.indexOf('Estimated market value') > 0) {
                    dataPage = i;
                  };
                });

                if(dataPage) {
                  var page2 = pages[dataPage].replace(/\s/g,'').replace(/\t/, '');
                  output.raw = page2;
              
                  output.emv = parseInt(page2.split('Estimatedmarketvalue$')[1].split(/[a-zA-Z]/)[0].replace(/,/g,''));
              
                  var bavtbea = page2.split('Taxbeforeexemptionsandabatements$')[1].split('**')[0];
              
                  output.bav = parseInt(bavtbea.split('X')[0].replace(/,/g,''));
              
                  output.tbea = parseInt(bavtbea.split('$')[1].replace(/,/g,''));
                 
                  output.apt = parseInt(page2.split('Annualpropertytax$')[1].split('**')[0].replace(/,/g,''));

                  cb(output);
                } else {
                  output.raw = 'noData';
                  cb(output);
                }
                            
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