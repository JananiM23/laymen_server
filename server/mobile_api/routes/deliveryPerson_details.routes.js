module.exports = function (app){
    
    var Controller = require('../../mobile_api/controllers/deliveryPerson_details.controller');
    
    app.post('/APP_API/DeliveryPersonManagement/Register', Controller.DeliveryPerson_Create_From_APP);
    app.post('/APP_API/DeliveryPersonManagement/Set_Password', Controller.DeliveryPerson_Set_Confirm_Password);
    app.post('/APP_API/DeliveryPersonManagement/DeliveryPerson_Login', Controller.DeliveryPerson_Login);
    app.post('/APP_API/DeliveryPersonManagement/DeliveryPerson_MobileNo_Verify', Controller.DeliveryPerson_MobileNo_Verify);
    app.post('/APP_API/DeliveryPersonManagement/DeliveryPerson_AssignedOrders', Controller.DeliveryPerson_AssignedOrders);
    app.post('/APP_API/DeliveryPersonManagement/OrderDeliveredAndUnDelivered', Controller.OrderDeliveredAndUnDelivered);
    app.post('/APP_API/DeliveryPersonManagement/DeliveryPersonTrackingYesOrNo', Controller.DeliveryPersonTrackingYesOrNo);
    app.post('/APP_API/DeliveryPersonManagement/DeliveryPersonGPSUpdate', Controller.DeliveryPersonGPSUpdate);
    app.post('/APP_API/DeliveryPersonManagement/OrderDeliveryDetails', Controller.DeliveryPerson_OrderDeliveryDetails);
    app.post('/APP_API/DeliveryPersonManagement/Collection_Amount', Controller.Collection_Amount);    
    app.post('/APP_API/DeliveryPersonManagement/CurrentMonthAttendance_Details', Controller.DeliveryPerson_CurrentMonthAttendance_Details);    
    app.post('/APP_API/DeliveryPersonManagement/DeliveryPerson_status_verify', Controller.DeliveryPerson_status_verify);    
 }; 