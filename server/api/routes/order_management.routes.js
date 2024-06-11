module.exports = function (app){
    var Controller = require('../../api/controllers/order-management/order_managements.controller');
   
    app.post('/API/Order_Management/Order_List', Controller.Order_List);
    app.post('/API/Order_Management/Today_Orders', Controller.Today_Orders);
    app.post('/API/Order_Management/Confirm_TodayOrders', Controller.Confirm_TodayOrders);
    app.post('/API/Order_Management/Confirm_TodayOrders_WithAssign', Controller.Confirm_TodayOrders_WithAssign);
    app.post('/API/Order_Management/DeliveryPerson_Tracking', Controller.OrderUnDelivered_DeliveryPerson_Tracking);
    app.post('/API/Order_Management/OrderedProduct_List', Controller.OrderedProduct_List);
    app.post('/API/Order_Management/AllOrderedProduct_List', Controller.AllOrderedProduct_List);
    app.post('/API/Order_Management/AllCustomersOrder_List', Controller.AllCustomersOrder_List);
    app.post('/API/Order_Management/Subscription_Orders', Controller.Subscription_Orders);
    app.post('/API/Order_Management/DeliveryPerson_TodayOrders', Controller.DeliveryPerson_TodayOrders);
};
