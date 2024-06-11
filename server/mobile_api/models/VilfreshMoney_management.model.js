var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// VilfreshMoney History Management Schema
var VilfreshMoneyHistorySchema = mongoose.Schema({
   Customer: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   Amount: { type: Number },
   Date: { type: Date },
   Previous_Limit: { type: Number },
   Available_Limit: { type: Number },
   Added_or_Reduced: { type: String }, // Added, Reduced
   Added_Type: { type: String }, // Online, Net_Banking, Cash, Delivery_Person_Cash, Order_UnDeliver, Temp_Credit
   Added_Reference_Id: { type: String },
   Added_By_User: { type: Schema.Types.ObjectId, ref: 'User' },
   CashFrom_DeliveryPerson: { type: Schema.Types.ObjectId, ref: 'DeliveryPerson' },
   Added_Approved_Status: { type: Boolean},
   DateOf_Approved: { type: Date },
   Added_Approved_By: { type: Schema.Types.ObjectId, ref: 'User' },
   PurposeOf_Reduce: { type: String }, // By_Order, By_BasketOrder
   Order_Id: { type: Schema.Types.ObjectId, ref: 'Order' },
   Order_By: { type: String }, // Customer, User
   Order_By_Person: { type: String },
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   Active_Status: { type : Boolean },
   If_Deleted: { type : Boolean },
   },
   { timestamps: true }
);
var VarVilfreshMoneyHistory= mongoose.model('Vilfresh_Money_History', VilfreshMoneyHistorySchema, 'Vilfresh_Money_History');


module.exports = {
   VilfreshMoneyHistorySchema : VarVilfreshMoneyHistory
};