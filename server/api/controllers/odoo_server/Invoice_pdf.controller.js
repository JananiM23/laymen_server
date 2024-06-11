var CustomerManagement = require('../../../mobile_api/models/customer_management.model');
var InvoicePDF = require('../../models/Invoice_pdf.models');
var mongoose = require('mongoose');
var fs = require('fs');
var moment = require('moment');

// Customer Invoice Create
exports.InVoicePDFCreate = function (req, res) {

	var ReceivingData = req.body;

	if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
		 res.status(400).send({ Status: false, Message: "Products Details is required" });
	} else if (!ReceivingData.ImagePDF || ReceivingData.ImagePDF === '') {
		 res.status(400).send({ Status: false, Message: "Customer Invoice PDF details is required" });
	} else if (!ReceivingData.InvoiceDate || ReceivingData.InvoiceDate === '') {
		 res.status(400).send({ Status: false, Message: "Invoice Date details is required" });
	} else {
		 Promise.all([
			  CustomerManagement.CustomerManagementSchema.findOne({ OdooId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
			  InvoicePDF.InvoicePDFSchema.findOne({ Active_Status: true, If_Deleted: false }, {}, { sort: { Invoice_Unique: -1 } }).exec(),
		 ]).then(Response => {
			  var CustomerDetails = Response[0];
			  var LastInvoice = Response[1];
			  if (CustomerDetails !== null) {
					var LastInvoice_Reference = LastInvoice !== null ? (LastInvoice.Invoice_Unique + 1) : 1;
					var newInvoice_Reference = 'Invoice-' + LastInvoice_Reference.toString().padStart(9, '0');
					ReceivingData.ImagePDF = ReceivingData.ImagePDF.replace('application/pdf,', "").trim();
					ReceivingData.InvoiceDate = new Date(new Date(new Date(ReceivingData.InvoiceDate).setDate(0)).setHours(23, 59, 59, 999));
					fs.writeFile(`./Uploads/Customer_Invoices/${newInvoice_Reference}.txt`, ReceivingData.ImagePDF, function (err) {
					  if (!err) {
						  var InVoiceCreate = new InvoicePDF.InvoicePDFSchema({
							  CustomerId: mongoose.Types.ObjectId(CustomerDetails._id),
							  Invoice_Reference: newInvoice_Reference,
							  Invoice_Unique: LastInvoice_Reference,
							  MonthlyDate: ReceivingData.InvoiceDate,
							  File_PDF: `${newInvoice_Reference}.txt`,
							  Region: CustomerDetails.Region,
							  Active_Status: true,
							  If_Deleted: false
						  });

						  InVoiceCreate.save(function (err_1, result_1) {
							  if (err_1) {
								  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Invoice Management!.", Error: err_1 });
							  } else {
								  res.status(200).send({ Status: true, Message: 'Customer Invoice details successfully Created' });
							  }
						  });
					  } else {
						  res.status(417).send({ Status: false, Message: "Some error occurred while Creating the Invoice txt!.", Error: err });
					  }
				  });
			  } else {
				  res.status(400).send({ Status: false, Message: "Invalid Customer Details!." });
			  }
		 }).catch(errorRes => {
			  res.status(400).send({ Status: false, Message: "Some Occurred Error!." });
		 });
	}
};


// Customer Invoice PDF Details
exports.CustomerInvoice_PDFDetails = function (req, res) {

    var ReceivingData = req.body;
    if (!ReceivingData.CustomerId || ReceivingData.CustomerId === '') {
        res.status(400).send({ Http_Code: 400, Status: false, Message: "Products Details is required" });
    } else {
        ReceivingData.CustomerId = mongoose.Types.ObjectId(ReceivingData.CustomerId);

        Promise.all([
            CustomerManagement.CustomerManagementSchema.findOne({ _id: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, {}).exec(),
            InvoicePDF.InvoicePDFSchema.find({ CustomerId: ReceivingData.CustomerId, Active_Status: true, If_Deleted: false }, {}, { sort: { Invoice_Unique: -1 } }).exec(),
        ]).then(Response => {
            var CustomerDetails = Response[0];
            var InvoiceDetails = JSON.parse(JSON.stringify(Response[1]));

            if (CustomerDetails !== null && InvoiceDetails.length !== 0) {
                var InvoiceArr = [];

                InvoiceDetails.map(Obj => {
                    InvoiceArr.push({
                        "CustomerId": Obj.CustomerId,
                        "MonthlyDate": (new Date(Obj.MonthlyDate)).format("DD-MM-YYYY hh: mm"),
                        "Invoice_Unique": Obj.Invoice_Unique,
                        "File_Name": Obj.File_Name
                    });
                });
                res.status(200).send({ Http_Code: 200, Status: true, Message: "Customer Invoice Details!.", Response: InvoiceArr });
            } else {
                res.status(400).send({ Http_Code: 417, Status: false, Message: "Some Occurred Error!." });
            }
        }).catch(errorRes => {
            res.status(400).send({ Http_Code: 417, Status: false, Message: "Some Occurred Error!." });
        });
    }
};