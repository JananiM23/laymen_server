module.exports = function(app) {
  var Controller = require("../../api/controllers/support.controller");

  app.post("/API/Support_Management/User_Update_CustomerSupport", Controller.User_Update_For_CustomerSupport );
  app.post("/API/Support_Management/All_SupportManagement_List", Controller.All_SupportManagement_List );
  app.post("/API/Support_Management/Customer_Support_Closed", Controller.Customer_Support_Closed );
  app.post("/API/Support_Management/SupportTitle_Create", Controller.SupportTitle_Create);
  app.post("/API/Support_Management/SupportTitle_Update", Controller.SupportTitle_Update);
  app.post("/API/Support_Management/AllSupportTitle_List", Controller.AllSupportTitle_List);
  app.post("/API/Support_Management/SupportTitle_AsyncValidate", Controller.SupportTitle_AsyncValidate);
  app.post("/API/Support_Management/SupportTitle_List", Controller.SupportTitle_List);
  app.post("/API/Support_Management/SupportTitleActiveStatus", Controller.SupportTitleActiveStatus);
  app.post("/API/Support_Management/SupportTitleInActiveStatus", Controller.SupportTitleInActiveStatus);
  app.post("/API/Support_Management/SimpleSupportTitle_List", Controller.SimpleSupportTitle_List);
};
