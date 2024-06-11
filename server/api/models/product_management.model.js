var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Product Management Schema
var ProductManagementSchema = mongoose.Schema({
    Category: {
        type: String,
        required: true,
        enum: ['Farm_To_Home', 'Factory_To_Home', 'Home_To_Home', 'Vilfresh_Basket', 'Others']
    },
    Sub_Category: {
        Name:{type: String},
        Parent_Name: {type: String}
    },
    Product_Name: { type: String, required: true },
    Price: { type: Number },
    File_Name:{type: String},
    BasicUnitQuantity: { type: Number },
    Unit: { type: String },    
    Schedule: {
        Sunday: {type: Boolean},
        Monday: {type: Boolean},
        Tuesday: {type: Boolean},
        Wednesday: {type: Boolean},
        Thursday : {type: Boolean},
        Friday: {type: Boolean},
        Saturday: {type: Boolean}
    },
    Stackable: {type : Boolean},
    Milk_YesOrNo: {type: Boolean },
    Type: {type: String},
    Product_Status: {type: String},   
    Stock_availability : {type : Boolean},
    Current_Stock: {type: Number},
    Total_Stock : {type: Number},
    Description: {type: String},
    OdooId: {type: String},
    CompanyId: {type: String},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);

var VarProductManagementSchemaSchema = mongoose.model('Products', ProductManagementSchema, 'Products_Management');


// Stock History Management ---------------------------

var StockHistoryManagementSchema = mongoose.Schema({
    ProductId: {type: Schema.Types.ObjectId, ref: 'Products' },
    OdooId: {type: String},
    Total_Stock: {type: Number},
    Previous_Stock:{type: Number},
    Current_Stock: {type: Number},    
    ChangeType: {type: String}, // Created_By_odoo, Add_By_odoo, Reduce_By_Odoo, Reduce_By_Order
    Quantity: {type: Number},
    If_orderedId: {type: Schema.Types.ObjectId, ref: 'Order'},
    Active_Status: { type: Boolean, required: true },
    If_Deleted: { type: Boolean, required: true },
},
    { timestamps: true }
);

var VarStockHistoryManagementSchema = mongoose.model('StockHistory', StockHistoryManagementSchema, 'StockHistory_Management');

module.exports = {
    ProductManagementSchema: VarProductManagementSchemaSchema,
    StockHistoryManagementSchema:VarStockHistoryManagementSchema
};
