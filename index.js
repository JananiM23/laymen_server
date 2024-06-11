var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var cors = require('cors');
var mime = require('mime-types');
const fs = require('fs');
const http = require('http');
const https = require('https');
var app = express();
var ErrorManagement = require('./server/handling/ErrorHandling.js');
var LogManagement = require('./server/handling/LogHandling.js'); 


// Certificate
// const privateKey = fs.readFileSync('../../../etc/letsencrypt/live/admin.vilfresh.in/privkey.pem', 'utf8');
// const certificate = fs.readFileSync('../../../etc/letsencrypt/live/admin.vilfresh.in/cert.pem', 'utf8');
// const ca = fs.readFileSync('../../../etc/letsencrypt/live/admin.vilfresh.in/chain.pem', 'utf8');

// const credentials = {
// 	key: privateKey,
// 	cert: certificate,
// 	ca: ca
// };
const httpServer = http.createServer(app);
// const httpsServer = https.createServer(credentials, app);

http.createServer(function (req, res) {
   res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
   res.end();
}).listen(80);


// Process On Every Error
process.setMaxListeners(0);
process.on('unhandledRejection', (reason, promise) => {
   console.log(reason);
   ErrorManagement.ErrorHandling.ErrorLogCreation('', 'Un Handled Rejection', '', reason);
});
process.on('uncaughtException', function (err) {
   console.log(err);
   ErrorManagement.ErrorHandling.ErrorLogCreation('', 'Un Caught Exception: ' + err.message, '', JSON.stringify(err.stack));
});

// Customer Sale Orders
// var ScheduleOne = require('./server/saleOrders').CustomerWeeklySaleGenerating;
// var ScheduleTwo = require('./server/saleOrders').CustomerMonthEndSaleGenerating;
var ScheduleTwo = require('./server/saleOrders').CustomerLastMonthSaleGenerating;
var LowBalance_AlertSystem = require('./server/Lowbalance_AlertSystem').LowBalance_AlertSystem;
var weeklyCronJob = require('./server/Archive_handler').weeklyCronJob;


// DB Connection
const uri = "mongodb://localhost:27017/vilfreshDB";
// const uri = "mongodb://10.10.30.156:27017/vilfresh-stage-new";

mongoose.connect(uri, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
mongoose.connection.on('error', function (err) {
   ErrorManagement.ErrorHandling.ErrorLogCreation('', 'Mongodb Connection Error', '', err);
});
mongoose.connection.once('open', function () {
    console.log('DB Connectivity, Success!');
});

app.use(cors());
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true, parameterLimit: 50000 }));
app.use(bodyParser.json({ limit: '10mb' }));

app.use('*', (request, response, next) => {
   LogManagement.LogHandling.LogCreation('', request);
   next();
});

// Image URL Path
app.use('/APP_API/Banner_File', express.static('Uploads/Banner/'));
app.use('/APP_API/Product_Image', express.static('Uploads/Products/'));
app.use('/APP_API/Customer_Image', express.static('Uploads/Customer_File/'));
app.use('/API/Customer_Audio', express.static('Uploads/Feedback/'));
app.use('/APP_API/Logo', express.static('./Uploads/logo.jpg'));

  

// Web API
require('./server/api/routes/user_management.routes')(app);
require('./server/api/routes/customer_managements.routes')(app);
require('./server/api/routes/deliveryline.routes')(app);
require('./server/api/routes/deliverypersonDetails.routes')(app);
require('./server/api/routes/odoo_server/region_management.routes')(app);
require('./server/api/routes/odoo_server/product_management.routes')(app);
require('./server/api/routes/support.routes')(app);
require('./server/api/routes/order_management.routes')(app);
require('./server/api/routes/odoo_server/Invoice_pdf.routes')(app);
require('./server/api/routes/VilfreshMoney_management.routes')(app);
require('./server/api/routes/Vilfresh_Basket_Management.routes')(app);
require('./server/api/routes/VilfreshCredit_management.routes')(app);
require('./server/api/routes/attendance_management.routes')(app);
require('./server/api/routes/customer_referral.routes')(app);


// Android API
require('./server/mobile_api/routes/deliveryPerson_details.routes')(app);
require('./server/mobile_api/routes/customer_management.routes')(app);
require('./server/mobile_api/routes/banner_management.routes')(app);
require('./server/mobile_api/routes/Customer_Feedback.routes')(app);
require('./server/mobile_api/routes/support.routes')(app);
require('./server/mobile_api/routes/product_management.routes')(app);
require('./server/mobile_api/routes/order_management.routes')(app);
require('./server/mobile_api/routes/purchaseOrder.routes')(app);
require('./server/mobile_api/routes/app_version.routes')(app);
require('./server/mobile_api/routes/VilfreshMoney_management.routes')(app);
require('./server/mobile_api/routes/Vilfresh_Basket_Management.routes')(app);
require('./server/mobile_api/routes/notification_management.routes')(app);
require('./server/mobile_api/routes/ReferralManagement.routes')(app);
require('./server/mobile_api/routes/temp_customers.routes')(app);

app.use('/*.html|/*.js|/*.css|/*.png|/*.jpg|/*.svg|/*.ico|/*.ttf|/*.woff|/*.txt|/*.eot|/*.json', function (req, res, next) {
   if (req.headers['accept-encoding']) {
      const cond = req.headers['accept-encoding'].includes('gzip');
      if (cond) {
         const contentType = mime.lookup(req.originalUrl);
         req.url = req.url + '.gz';
         res.set('Content-Encoding', 'gzip');
         res.set('Content-Type', contentType);
      }
   }
   next();
});
app.use(express.static(__dirname + '/client/dist/client/'));

app.use(function(req, res) {
   res.sendFile(path.join(__dirname, '/client/dist/client', 'index.html'));
});



// Connect Http
app.get('*', function (req, res) {
  res.send('This is Server Side Page');
});


// httpServer.listen(80, () => {
// 	console.log('HTTP Server running on port 80');
// });

httpServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});

