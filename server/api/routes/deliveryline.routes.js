module.exports = function (app){

    var Controller = require('../controllers/deliveryline.controller');
 
    app.post('/API/Delivery_line/VilfreshDelivery_lines_Create', Controller.VilfreshDeliverylines_Create);
    app.post('/API/Delivery_line/VilfreshDeliveryLines_List', Controller.VilfreshDeliveryLines_List);
    app.post('/API/Delivery_line/VilfreshDeliveryLines_Edit', Controller.VilfreshDeliveryLines_Edit);
    app.post('/API/Delivery_line/VilfreshDeliveryLines_Delete', Controller.VilfreshDeliveryLines_Delete);
    app.post('/API/Delivery_line/VilfreshDelivery_lines_Update', Controller.VilfreshDeliverylines_Update);
    app.post('/API/Delivery_line/AllVilfreshDeliveryLines_List', Controller.AllVilfreshDeliveryLines_List);
    app.post('/API/Delivery_line/SessionBased_DeliveryLines', Controller.SessionBased_DeliveryLines);
    app.post('/API/Delivery_line/DeliveryBoy_AsyncValidate', Controller.DeliveryBoy_AsyncValidate);
 };