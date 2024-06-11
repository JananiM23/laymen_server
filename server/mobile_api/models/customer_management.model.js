var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var CustomerManagementSchema = mongoose.Schema({
   Mobile_Number: { type: String, unique: true },
   Password: { type: String },
   Customer_Name: { type: String },
   Email: { type: String },
   Gender: { type: String },
   Address: { type: String },
   Pincode: { type: String },
   City: { type: String },
   Latitude: { type: String },
   Longitude: { type: String },
   Special_Date: [{
      Name: { type: String },
      Special_Date: { type: Date }
   }],
   Family_Members: {
      Male_Count: { type: String },
      Female_Count: { type: String },
      Children_Count: { type: String },
      Infants_Count: { type: String },
      Senior_Citizen: { type: String }
   },
   What_You_Like: { type: String }, // Veg, Non-Veg
   Customer_Status: { type: String }, // Registration_completed, Sample_Pending, Sample_Rejected, Sample_OnHold, Sample_Approved, Sample_OnDelivery, Sample_Delivery_Canceled, Sample_Delivered, WaitingFor_Subscription, Subscription_Activated, Subscription_DeActivated.
   File_Name:{ type: String },
   Subscription_Activated: { type: Boolean},
   Evening_Subscription: { type: String },
   Morning_Subscription: { type: String },
   Morning: [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" }, // A1, A2
      Liter: { type: Number },       
      Price: { type: String }
   }],
   Evening: [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" }, // A1, A2
      Liter: { type: Number },     
      Price: { type: String }
   }],
   OdooId: { type: String },
   CompanyId: { type: String },
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   Delivery_Line: { type: Schema.Types.ObjectId, ref: 'Delivery' },
   Delivery_Line_Queue: { type: Number },
   Request_Sample_Order: { type: Boolean },
   Choose_The_Sample_Date: { type: Date },
   Choose_The_Session: { type: String },
   Register_From: { type: String },
   Mobile_Number_Verified: { type: Boolean },
   Mobile_OTP_Session: { type: Date },
   Mobile_OTP: { type: Number },   
   VilfreshMoney_Limit: { type: Number },
   VilfreshCredit_Limit: { type: Number },
   AvailableCredit_Limit: { type: Number },
   IfApprovedBy_User : { type : Boolean},
   IfSample_Order : { type : Boolean },
   ApprovedBy_User: { type: Schema.Types.ObjectId, ref: 'User' },
   CollectionApprovedBy_User: { type: Schema.Types.ObjectId, ref: 'User' },
   Firebase_Token: {type: String},
   Device_Type: {type: String}, // Android , IOS , TAB
   Device_Id: {type: String},
   Active_Status: { type: Boolean, required: true },
   If_Deleted: { type: Boolean, required: true },
   QA_Analytics: [{
      Question: { type: Schema.Types.ObjectId, ref: 'QA' },
      Answer: { type: Schema.Types.ObjectId, ref: 'QA' }
   }],
   Delivery_Person_QA: {type: Schema.Types.ObjectId, ref: 'DeliveryPerson'},
   Sample_From: { type: String }, // From_DeliveryBoy, From_Customer
   ReasonOfDeactivation: { type: String },
   SubscriptionPaused: { type: Boolean },
   PauseDataIn_Morning: [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" }, // A1, A2
      Liter: { type: Number },       
      Price: { type: String }
   }],
   PauseDataIn_Evening: [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" }, // A1, A2
      Liter: { type: Number },     
      Price: { type: String }
   }],
},
   { timestamps: true }
);
var varCustomerManagementSchema = mongoose.model('Customer_Management', CustomerManagementSchema, 'Customer_Managements');


var APPCustomer_LoginHistorySchema = mongoose.Schema({
   User: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   LastActive: { type: Date },
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean },
},
   { timestamps: true }
);
var varLoginHistorySchema = mongoose.model('APPCustomer_Login', APPCustomer_LoginHistorySchema, 'Customer_APP_login_History');


var Subscription_ManagementSchema = mongoose.Schema({
   Customer: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   Morning: [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" }, // A1, A2
      Liter: { type: Number },
      Status: {type: Boolean }
   }],
   Evening: [{
         ProductId: { type: Schema.Types.ObjectId, ref: "Products" }, // A1, A2
         Liter: { type: Number },
         Status: {type: Boolean}
   }],
   SubscriptionDate: { type: Date },
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean },
},
   { timestamps: true }
);
var varCustomerSubscription_Management = mongoose.model('CustomerSubscription_Management', Subscription_ManagementSchema, 'CustomerSubscription_Management');



// QA Management Schema
var QAManagementSchema = mongoose.Schema({
 
   Question: { type: String, required: true },
   Price: { type: String },
   File_Name:{type: String},
   Answer: [{
      Answer: { type: String }
   }],
   Added_By_User: { type: Schema.Types.ObjectId, ref: 'User' },
   Region: { type: Schema.Types.ObjectId, ref: 'Region'},
   Active_Status: { type: Boolean, required: true },
   If_Deleted: { type: Boolean, required: true },
},
   { timestamps: true }
);

var VarQAManagementSchemaSchema = mongoose.model('QA', QAManagementSchema, 'QA_Configuration');


module.exports = {
    CustomerManagementSchema: varCustomerManagementSchema,
    APPCustomer_LoginHistorySchema: varLoginHistorySchema,
    Subscription_ManagementSchema: varCustomerSubscription_Management,
    QAManagementSchema: VarQAManagementSchemaSchema
};