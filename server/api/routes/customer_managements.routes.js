module.exports = function (app){
    
    var Controller = require('../controllers/customer_managements.controller');
    
    app.post('/API/Customer_Management/CustomerSample_Approve', Controller.CustomerSample_Approve);

    app.post('/API/Customer_Management/Customer_From_Web', Controller.Customer_From_Web);
    app.post('/API/Customer_Management/All_Customers_List', Controller.All_Customers_List);
    app.post('/API/Customer_Management/All_Transaction_History', Controller.All_Customers_Transaction_History);
    app.post('/API/Customer_Management/SimpleCustomer_List', Controller.SimpleCustomer_List);
    app.post('/API/Customer_Management/CustomerDetails_Edit', Controller.CustomerDetails_Edit);
    app.post('/API/Customer_Management/CustomerDetails_Update', Controller.CustomerDetails_Update);
    app.post('/API/Customer_Management/CustomerSample_Reject', Controller.CustomerSample_Reject);
    app.post('/API/Customer_Management/FilteredCustomer_List', Controller.FilteredCustomer_List);
    app.post('/API/Customer_Management/Customer_view', Controller.Customer_view);
    app.post('/API/Customer_Management/MilkProduct_Subscription', Controller.MilkProduct_Subscription);
    app.post('/API/Customer_Management/Analytics_Create', Controller.Analytic_Register);
    app.post('/API/Customer_Management/All_QA_List', Controller.All_QA_List);
    app.post('/API/Customer_Management/QA_Delete', Controller.QA_Delete);
    app.post('/API/Customer_Management/All_Collection_List', Controller.DailyCollection_List); 
    app.post('/API/Customer_Management/CollectionApprove', Controller.CollectionApprove); 
    app.post('/API/Customer_Management/Collection_OnHold', Controller.Collection_OnHold);
    app.post('/API/Customer_Management/Customer_Approve_WithLine', Controller.Customer_Approve_WithLine);
    app.post('/API/Customer_Management/Customer_DeActivate', Controller.Customer_DeActivate);
    app.post('/API/Customer_Management/Customer_ReActivate', Controller.Customer_ReActivate);

    app.post('/API/Customer_Management/All_Customers_Export', Controller.All_Customers_Export);

    app.post('/API/Customer_Management/AllAdminCustomersToOdooLeads', Controller.AllAdminCustomersToOdooLeads);
   app.post('/API/Customer_Management/AllAdminLeadsToOdooCustomers', Controller.AllAdminLeadsToOdooCustomers);



};