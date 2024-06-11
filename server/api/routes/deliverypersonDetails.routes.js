module.exports = function (app){

    var Controller = require('../../api/controllers/deliverypersonDetails.controller');
 
    app.post('/API/DeliveryPersonManagement/Register', Controller.DeliveryPerson_Create_From_Web);
    app.post('/API/DeliveryPersonManagement/DeliveryPerson_Details_Update', Controller.DeliveryPerson_Details_Update);
    app.post('/API/DeliveryPersonManagement/DeliveryPersonDetails_List', Controller.DeliveryPersonDetails_List);
    app.post('/API/DeliveryPersonManagement/DeliveryPersonDetails_Edit', Controller.DeliveryPersonDetails_Edit);
    app.post('/API/DeliveryPersonManagement/User_Update_DeliveryBoy_Approval', Controller.User_Update_DeliveryBoy_Approval);
    app.post('/API/DeliveryPersonManagement/User_Update_DeliveryBoy_Inactive', Controller.User_Update_DeliveryBoy_Inactive);
	 app.post('/API/DeliveryPersonManagement/DeliveryBoy_Delete', Controller.DeliveryBoy_Delete);
    app.post('/API/DeliveryPersonManagement/Deliveryboy_List', Controller.Deliveryboy_List);
    app.post('/API/DeliveryPersonManagement/DeliveryPerson_AssignedOrders', Controller.DeliveryPerson_AssignedOrders);
    app.post('/API/DeliveryPersonManagement/Available_DeliveryPersonList', Controller.Available_DeliveryPersonList);
    app.post('/API/DeliveryPersonManagement/LaterAttendance_DeliveryPersonList', Controller.LaterAttendance_DeliveryPersonList);    
    app.post('/API/DeliveryPersonManagement/DeliveryLines_List', Controller.DeliveryLines_List);
 };