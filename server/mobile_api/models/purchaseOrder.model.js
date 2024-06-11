var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PurchaseSchema = mongoose.Schema({
   Region: {type: Schema.Types.ObjectId, ref: 'Region'},
   Config_Date: { type: Date },
   Purchase_Details : [{
      ProductId: { type: Schema.Types.ObjectId, ref: "Products" },
      Quantity: { type: Number },
      UnitPrice : { type: Number },
      TotalAmount : { type: Number },
   }],
   Active_Status: { type: Boolean },
   If_Deleted: { type: Boolean }
},
   { timestamps: true }
);


var varPurchaseSchema = mongoose.model('PurchaseOrder', PurchaseSchema, 'PurchaseManagement');

module.exports = {
   PurchaseSchema: varPurchaseSchema,
};