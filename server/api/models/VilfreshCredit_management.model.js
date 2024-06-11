var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Vilfresh Credit Limit History Management Schema
var VilfreshCreditHistorySchema = mongoose.Schema({
   Customer: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },   
   Date: { type: Date },
   Credit_Limit: { type: Number },
   Previous_AvailableLimit: {type: Number},
   Available_Limit: { type: Number },
   Added_or_Reduced: { type: String }, // Added, Reduced   
   Added_Type: {type : String},
   Added_By_User: { type: Schema.Types.ObjectId, ref: 'User' },   
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
var VarVilfreshCreditHistorySchema = mongoose.model('Vilfresh_Credit_History', VilfreshCreditHistorySchema, 'Vilfresh_Credit_History');


module.exports = {
    VilfreshCreditHistorySchema : VarVilfreshCreditHistorySchema
};