// export const updateClass = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updatedClass = await Class.findByIdAndUpdate(id, req.body, {
//       new: true,
//     });
//     res.status(200).json({
//       success: true,
//       message: "Class updated",
//       data: updatedClass,
//     });
//   } catch (error) {
//     console.log("Server Error for update class", error);
//     res.status(500).json({
//       success: false,
//       message: "Server Error for update the Class" || error.message,
//     });
//   }
// };
// export const deleteClass = async (req, res) => {
//   try {
//     const { id } = req.params;
//     console.log("ID = ", id);
//     await Class.findByIdAndUpdate(id, { isActive: false });
//     res.status(200).json({
//       success: true,
//       message: "Class Delete Successfully",
//     });
//   } catch (error) {
//     console.log("Server Error Delete the class", error);
//     res.status(500).json({
//       success: false,
//       message: "Server Error" || error.message,
//     });
//   }
// };
