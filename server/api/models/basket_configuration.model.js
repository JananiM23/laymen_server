var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Product Management Schema
var BasketManagementSchema = mongoose.Schema({
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
    Unit: {
        type: String,
        enum: ['L', 'ML', 'MG', 'KG', 'U']
    },    
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

var VarBasketManagementSchemaSchema = mongoose.model('Basket', BasketManagementSchema, 'Basket_Configuration');


module.exports = {
    BasketManagementSchema: VarBasketManagementSchemaSchema,
};
