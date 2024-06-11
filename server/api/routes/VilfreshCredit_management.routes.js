module.exports = function (app){
    
    var Controller = require('../controllers/VilfreshCredit_management.controller');
    
    app.post('/API/VilfreshCredit_management/Add_VilfreshCredit', Controller.Add_VilfreshCredit);
    app.post('/API/VilfreshCredit_management/VilfreshCredit_TransferHistory', Controller.VilfreshCredit_TransferHistory);    

    
 };
 