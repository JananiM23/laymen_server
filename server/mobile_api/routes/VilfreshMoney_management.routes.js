module.exports = function (app){
    
   var Controller = require('../controllers/VilfreshMoney_management.controller');
   
   app.post('/APP_API/VilfreshMoney_management/Add_VilfreshMoney', Controller.Add_VilfreshMoney);
   app.post('/APP_API/VilfreshMoney_management/VilfreshMoney_TransferHistory', Controller.VilfreshMoney_TransferHistory);

};
