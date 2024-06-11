module.exports = function (app){
    
    var Controller = require('../../controllers/odoo_server/Invoice_pdf.controller');
    
    app.post('/API/InvoiceManagement/Create', Controller.InVoicePDFCreate);
    app.post('/APP_API/InvoiceManagement/PDFDetails', Controller.CustomerInvoice_PDFDetails);
};