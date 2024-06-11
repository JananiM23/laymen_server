module.exports = function (app){
    
    var Controller = require('../../mobile_api/controllers/order_management.controller');
    
    // Wallet reduce API
    app.post('/APP_API/Order_Management/Order_Create', Controller.OrderManagement_Create);

    // Online payment order API
    app.post('/APP_API/Order_Management/OnlinePayment_Order', Controller.OnlinePayment_Order);

    // Credit Limit Order API
    app.post('/APP_API/Order_Management/CreditPayment_Order', Controller.CreditLimit_Order);

    // PartialOrder_Wallet_And_Credit_Reduce
    app.post('/APP_API/Order_Management/PartialWalletAndCredit_Order', Controller.PartialOrder_Wallet_And_Credit_Reduce);

    //PartialOrder_Wallet_And_Credit_Reduce
    app.post('/APP_API/Order_Management/PartialWalletAndOnline_Order', Controller.PartialOrder_Wallet_And_Online_Reduce);


    app.post('/APP_API/Order_Management/OrderDetails_List', Controller.OrderManagement_Details);
    app.post('/APP_API/Order_Management/DeliveryDelay_Notify', Controller.DeliveryDelay_Notify);
    
    app.post('/APP_API/Order_Management/OrdersHistory', Controller.OrdersHistory);

    app.post('/APP_API/Order_Management/Monthly_Invoices', Controller.Monthly_Invoices);
    app.post('/APP_API/Order_Management/MonthInvoice_Report', Controller.MonthInvoice_Report);
    app.post('/APP_API/Order_Management/Invoice_PDF', Controller.Invoice_PDF);

};