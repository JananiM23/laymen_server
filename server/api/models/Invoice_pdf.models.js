var mongoose = require('mongoose');
var Schema = mongoose.Schema;


// Invoice PDF Schema
var InvoicePDFSchema = mongoose.Schema({
    CustomerId: {type: mongoose.Types.ObjectId, ref: "Customer_Management"},
    Invoice_Reference: { type: String }, // E.g: Invoice-00000001
    Invoice_Unique: { type: Number }, // e.g: 1
    MonthlyDate: {type: Date},
    File_PDF: {type: String},    
   //  File_Name: {type: String},    
    Region: {type: Schema.Types.ObjectId, ref: "Region"},
    Active_Status: {type: Boolean, required: true},
    If_Deleted: {type: Boolean, required: true}
}, {
     timestamps: true 
});

var VarInvoicePDFSchema = mongoose.model('InvoicePDF', InvoicePDFSchema, 'InvoicePDF');

module.exports = {
    InvoicePDFSchema : VarInvoicePDFSchema
};
