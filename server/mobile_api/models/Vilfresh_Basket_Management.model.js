var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Vilfresh Basket Management Schema
var VilfreshBasketSchema = mongoose.Schema({
   Customer: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   FromDate: { type: Date },
   ToDate: { type: Date },
   Products: [{
      Product: { type: Schema.Types.ObjectId, ref: 'Products' },
      Quantity: { type: Number },
      Status: { type: Boolean }
   }],
   SkipDates: [{
      Date: { type: Date },
      Status: { type: Boolean }
   }],
   Purchase_Generated: { type: Boolean },
   Generated_Request: [{
      Product: { type: Schema.Types.ObjectId, ref: 'Products' },
      Quantity: { type: Number },
      Assigned_Date: { type: Date },
      UnitPrice: { type: Number },
      TotalAmount : { type: Number }
   }],
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   Active_Status: { type : Boolean },
   If_Deleted: { type : Boolean },
   },
   { timestamps: true }
);
var VarVilfreshBasket = mongoose.model('Vilfresh_Basket', VilfreshBasketSchema, 'Vilfresh_Basket');


//  Basket Configuration Management Schema 
var BasketProductConfigSchema = mongoose.Schema({
   Config_Date: { type: Date},
   Products: [{
      Product: { type: Schema.Types.ObjectId, ref: 'Products' },
      Price_From: { type: Number },
      Price_To: { type: Number },
      Confirmed_Quantity: { type: Number },
      Fixed_Price: { type: Number },
   }],
   Confirmed_Date: { type: Date },
   PO_Requested: { type: Boolean },
   Added_By_User: { type: Schema.Types.ObjectId, ref: 'User' },
   Confirmed_By_User: { type: Schema.Types.ObjectId, ref: 'User' },   
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   Active_Status: { type : Boolean },
   If_Deleted: { type : Boolean },
   },
   { timestamps: true }
);
var VarBasket_ProductConfig = mongoose.model('VilfreshBasket_ProductConfig', BasketProductConfigSchema, 'VilfreshBasket_ProductConfig');



// Vilfresh Basket Management Schema
var BasketCustomerRequestsSchema = mongoose.Schema({
   Customer: { type: Schema.Types.ObjectId, ref: 'Customer_Management' },
   Config_Date: { type: Date },
   Products: [{
      Product: { type: Schema.Types.ObjectId, ref: 'Products' },
      Quantity: { type: Number },
      UnitPrice: { type: Number },
      TotalAmount : { type: Number }
   }],
   PO_Status: { type : String }, // Pending, Approved, Canceled
   Purchase_Generated: { type: Boolean },
   Delivered: { type: Boolean },
   Region: { type: Schema.Types.ObjectId, ref: 'Region' },
   Active_Status: { type : Boolean },
   If_Deleted: { type : Boolean },
   },
   { timestamps: true }
);
var VarVilfreshBasket_CustomerRequests = mongoose.model('VilfreshBasket_CustomerRequests', BasketCustomerRequestsSchema, 'VilfreshBasket_CustomerRequests');


module.exports = {
   VilfreshBasketSchema : VarVilfreshBasket,
   BasketProductConfigSchema: VarBasket_ProductConfig,
   BasketCustomerRequestsSchema: VarVilfreshBasket_CustomerRequests,
};