import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generateFacultyPDF = (facultyData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const filePath = path.join("uploads", `Faculty_${facultyData.employeeID}.pdf`);
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      doc.fontSize(20).text("Faculty Account Credentials", { underline: true });
      doc.moveDown();

      doc.fontSize(14).text(`Name: ${facultyData.facultyName}`);
      doc.text(`Department: ${facultyData.department}`);
      doc.text(`Designation: ${facultyData.designation}`);
      doc.text(`Employee ID: ${facultyData.employeeID}`);
      doc.text(`Joining Date: ${facultyData.joiningDate}`);
      doc.moveDown();

      doc.fontSize(16).text("Login Credentials", { underline: true });
      doc.moveDown();
      doc.text(`Username: ${facultyData.userName}`);
      doc.text(`Password: ${facultyData.password}`);

      doc.end();

      stream.on("finish", () => resolve(filePath));
    } catch (error) {
      reject(error);
    }
  });
};
