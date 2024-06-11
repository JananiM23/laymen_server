var log4js = require('log4js');
var parser = require('ua-parser-js');

var ErrorHandling = {
	ErrorLogCreation: function(req, Name, Address, ErrorMessage) {
      var fileName = new Date().toLocaleDateString().toString().split('/').join('-');
      log4js.configure({  appenders: { Error: { type: 'file', filename: 'Logs/Err_Logs/' + fileName + '.log'  } },
                           categories: { default: { appenders: ['Error'], level: 'error' } } });
      var logger = log4js.getLogger('Error');

      var HeapUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)  + ' MB';

      const used = process.memoryUsage();
      const memoryUsage = {};
      for (let key in used) {
         memoryUsage[key] = (Math.round(used[key] / 1024 / 1024 * 100) / 100) + ' MB';
      }
      
      if(req !== ''){
         var Ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
         var DeviceInfo = parser(req.headers['user-agent']);
         logger.error(JSON.stringify({
            Error_Name : Name,
            Error_Address: Address,
            Date: new Date(),
            Ip: Ip,
            Request_From_Origin: req.headers.origin,
            Request_From: req.headers.referer,
            Request_Url: req.url,
            Request_Body: req.body,
            If_Get : req.params,
            Device_Info: DeviceInfo,
            Error_Message: ErrorMessage,
            memoryUsage: memoryUsage
         }));
      }else{
         logger.error(JSON.stringify({
            Error_Name : Name,
            Error_Address: Address,
            Error_Message : ErrorMessage,
            memoryUsage: memoryUsage
         }));
      }
	}
};
exports.ErrorHandling = ErrorHandling;